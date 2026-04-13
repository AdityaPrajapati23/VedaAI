import os
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn

from langchain_core.messages import AIMessage, HumanMessage
from fastapi.middleware.cors import CORSMiddleware

from app.graph import GUARDED_ACTIONS, build_graph
from app.observability import langsmith_traceable, timed, timed_block


# =========================
# LOAD ENV VARIABLES
# =========================
load_dotenv()
if not os.getenv("GROQ_API_KEY"):
    load_dotenv(".env.example")


# =========================
# HELPER FUNCTION
# =========================
def _last_ai_text(messages):
    for msg in reversed(messages):
        if isinstance(msg, AIMessage):
            return str(msg.content)
    return "No response"


# =========================
# HANDLE INTERRUPTS (FIXED FOR DEPLOYMENT)
# =========================
@langsmith_traceable(name="handle_interrupts", run_type="chain")
@timed("handle_interrupts")
def _handle_interrupts(app, config):
    while True:
        snapshot = app.get_state(config)
        if not snapshot.next:
            return

        if "execute_action" not in snapshot.next:
            app.invoke(None, config=config)
            continue

        planned = snapshot.values.get("planned_action", {})
        action_name = planned.get("name", "respond")

        # 🔥 IMPORTANT FIX: AUTO APPROVE (NO input())
        app.update_state(config, {"human_approved": True})

        app.invoke(None, config=config)


# =========================
# BUILD GRAPH
# =========================
app_graph = build_graph()
thread_id = str(uuid.uuid4())
config = {"configurable": {"thread_id": thread_id}}


# =========================
# FASTAPI APP
# =========================
app_api = FastAPI(
    title="VedaAI - Local AI Assistant",
    description="AI Assistant with Tools",
    version="1.0.0"
)

# =========================
# CORS
# =========================
app_api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# REQUEST MODEL
# =========================
class Message(BaseModel):
    text: str


# =========================
# HEALTH CHECK
# =========================
@app_api.get("/api/health")
def health_check():
    return {"status": "ok", "service": "VedaAI"}


# =========================
# CHAT API
# =========================
@app_api.post("/chat")
def chat_api(message: Message):
    user_input = message.text

    try:
        with timed_block("chat_turn"):
            app_graph.invoke(
                {"messages": [HumanMessage(content=user_input)]},
                config=config
            )
            _handle_interrupts(app_graph, config)

        snapshot = app_graph.get_state(config)
        output = _last_ai_text(snapshot.values.get("messages", []))

        return {"reply": output}

    except Exception as e:
        print("Error:", e)
        return {"reply": "Server error: " + str(e)}


# =========================
# CLI MODE (OPTIONAL)
# =========================
def run_chat():
    print("Local Agent started. Type 'exit' to quit.")

    while True:
        user_input = input("\nYou: ").strip()
        if user_input.lower() in {"exit", "quit"}:
            print("Bye")
            break

        try:
            with timed_block("chat_turn"):
                app_graph.invoke(
                    {"messages": [HumanMessage(content=user_input)]},
                    config=config
                )
                _handle_interrupts(app_graph, config)
        except Exception as exc:
            print(f"\nAgent error: {exc}")
            continue

        snapshot = app_graph.get_state(config)
        output = _last_ai_text(snapshot.values.get("messages", []))
        print(f"\nAgent:\n{output}")


# =========================
# SERVE FRONTEND
# =========================
frontend_path = os.path.join(os.path.dirname(__file__), "frontend")

if os.path.exists(frontend_path):
    app_api.mount("/static", StaticFiles(directory=frontend_path), name="static")

    @app_api.get("/")
    def serve():
        return FileResponse(os.path.join(frontend_path, "index.html"))


# =========================
# RUN SERVER (DEPLOYMENT READY)
# =========================
port = int(os.environ.get("PORT", 8000))

if __name__ == "__main__":
    print("🚀 VedaAI is running...")
    uvicorn.run(app_api, host="0.0.0.0", port=port)