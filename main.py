import os
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

from langchain_core.messages import AIMessage, HumanMessage
from fastapi.middleware.cors import CORSMiddleware

from app.graph import GUARDED_ACTIONS, build_graph
from app.observability import langsmith_traceable, timed, timed_block

# Load API keys
load_dotenv()
if not os.getenv("GROQ_API_KEY"):
    load_dotenv(".env.example")


# -----------------------------
# Helper: Get last AI message
# -----------------------------
def _last_ai_text(messages) -> str:
    for msg in reversed(messages):
        if isinstance(msg, AIMessage):
            return str(msg.content)
    return ""


# -----------------------------
# Handle approval interrupts
# -----------------------------
@langsmith_traceable(name="handle_interrupts", run_type="chain")
@timed("handle_interrupts")
def _handle_interrupts(app, config) -> None:
    while True:
        snapshot = app.get_state(config)
        if not snapshot.next:
            return

        if "execute_action" not in snapshot.next:
            app.invoke(None, config=config)
            continue

        planned = snapshot.values.get("planned_action", {})
        action_name = planned.get("name", "respond")
        action_args = planned.get("args", {})

        if action_name in GUARDED_ACTIONS:
            print("\nApproval required before execution")
            print(f"Action: {action_name}")
            print(f"Args: {action_args}")
            answer = input("Approve? [y/N]: ").strip().lower()
            approved = answer in {"y", "yes"}
            app.update_state(config, {"human_approved": approved})
        else:
            app.update_state(config, {"human_approved": True})

        app.invoke(None, config=config)


# -----------------------------
# Build Agent Graph
# -----------------------------
app_graph = build_graph()
thread_id = str(uuid.uuid4())
config = {"configurable": {"thread_id": thread_id}}


# -----------------------------
# FastAPI Setup
# -----------------------------
app_api = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app_api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    text: str


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
        return {"reply": str(e)}





# -----------------------------
# CLI Chat (Terminal Chat)
# -----------------------------
def run_chat() -> None:
    if not os.getenv("GROQ_API_KEY"):
        print("Missing GROQ_API_KEY.")
        print("Set it in a .env file or export it in your shell, then run again.")
        print("Example: export GROQ_API_KEY='your_key_here'")
        return

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


# -----------------------------
# Main Entry
# -----------------------------
if __name__ == "__main__":
    print("Starting FastAPI server at http://127.0.0.1:8000")
    uvicorn.run(app_api, host="127.0.0.1", port=8000)