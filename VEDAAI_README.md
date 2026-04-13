# VedaAI - Local AI Assistant

A modern web application for interacting with your local AI backend, featuring a ChatGPT-like interface with multiple chat sessions, localStorage persistence, and a beautiful dark theme.

## 🌟 Features

### Frontend
- **Modern ChatGPT-like UI** - Clean, responsive design with dark theme
- **Multiple Chat Sessions** - Create, rename, and delete chat sessions
- **Chat History** - All conversations stored in browser localStorage
- **Real-time Messaging** - Instant message sending and AI responses
- **Typing Indicator** - Visual feedback when AI is processing
- **Message Actions** - Copy button on AI messages
- **Auto-resize Input** - Textarea grows as you type
- **Error Handling** - Clear error messages on connection failures
- **Keyboard Shortcuts** - Enter to send, Shift+Enter for new line, Ctrl+N for new chat
- **Smooth Animations** - Professional transitions and effects
- **Responsive Layout** - Works on desktop and mobile

### Backend
- **FastAPI** - Modern, fast Python web framework
- **CORS Enabled** - Allows frontend to communicate with API
- **/chat Endpoint** - POST endpoint for sending messages
- **/api/health** - Health check endpoint
- **Static File Serving** - Serves HTML/CSS/JS frontend
- **Error Handling** - Graceful error responses

## 📁 Project Structure

```
local-ai-agent/
├── main.py                 # FastAPI backend with static file serving
├── frontend/
│   ├── index.html         # Web UI HTML structure
│   ├── style.css          # Modern dark theme styling
│   ├── script.js          # Frontend logic (chat, storage, API calls)
├── app/
│   ├── graph.py           # AI logic (existing)
│   ├── agent/             # Agent implementation
│   └── tools/             # AI tools
├── requirements.txt       # Python dependencies
└── venv/                  # Virtual environment
```

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- pip or conda package manager
- GROQ_API_KEY environment variable set

### 1. Install Dependencies

```bash
# Activate virtual environment (if not already active)
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate  # On Windows

# Install required packages
pip install -r requirements.txt
```

### 2. Set Up API Keys

```bash
# Create a .env file in the project root
echo "GROQ_API_KEY=your_api_key_here" > .env

# OR set environment variable
export GROQ_API_KEY="your_api_key_here"  # macOS/Linux
set GROQ_API_KEY=your_api_key_here       # Windows CMD
```

### 3. Start the Server

```bash
# Run the FastAPI server
python main.py
```

You should see:
```
Starting FastAPI server at http://127.0.0.1:8000
VedaAI - Local AI Assistant
Open browser: http://127.0.0.1:8000
```

### 4. Open in Browser

Navigate to: **http://127.0.0.1:8000**

## 💻 Usage

### Basic Chat
1. Click "New Chat" to start a new conversation
2. Type your message in the input field
3. Press **Enter** or click the Send button
4. Wait for AI response (typing indicator shows AI is working)

### Keyboard Shortcuts
- **Enter** - Send message
- **Shift + Enter** - New line in message
- **Ctrl + N** / **Cmd + N** - Create new chat

### Chat Management
- **Click chat in sidebar** - Open previous conversation
- **Right-click chat** - Open context menu with options:
  - **Rename** - Give chat a custom name
  - **Delete** - Remove chat from history
- **Clear All button** - Delete all chats (with confirmation)

### Message Actions
- **Hover over AI messages** - Copy button appears
- **Click copy** - Message copied to clipboard

## 🔧 API Endpoints

### POST /chat
Send a message to the AI backend.

**Request:**
```json
{
  "text": "Your message here"
}
```

**Response:**
```json
{
  "reply": "AI response text"
}
```

**Example:**
```bash
curl -X POST "http://127.0.0.1:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello, how are you?"}'
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "VedaAI - Local AI Assistant"
}
```

## 🎨 UI Color Scheme

The application uses a professional dark theme:
- **Primary Color**: #10a37f (Teal/green)
- **Background**: #0d0d0d (Dark)
- **Secondary**: #1a1a1a (Darker)
- **Text**: #ececec (Light)
- **Borders**: #4a4a4a (Gray)
- **Danger**: #ff6b6b (Red for delete actions)

## 📊 Data Storage

All chat data is stored in browser localStorage:
- **Storage Key**: `vedaai_chats`
- **Active Chat Key**: `vedaai_active_chat`
- **Format**: JSON with chat names and message arrays

**Example Storage Structure:**
```javascript
{
  "vedaai_chats": {
    "Chat 1": [
      { "text": "Hello", "sender": "user" },
      { "text": "Hi there!", "sender": "ai" }
    ],
    "Chat 2": [...]
  },
  "vedaai_active_chat": "Chat 1"
}
```

## 🔄 How It Works

1. **User sends message** → Frontend captures input
2. **Message saved to localStorage** → Persists in browser
3. **API request to /chat** → Sends JSON to backend
4. **AI processes request** → Backend AI logic generates response
5. **Response returned** → JSON with `reply` field
6. **Display message** → Frontend renders both messages
7. **Auto-scroll** → Chat area scrolls to latest message

## ⚙️ Configuration

### Modify API Endpoint
Edit `frontend/script.js`, line ~13:
```javascript
const API_ENDPOINT = "http://127.0.0.1:8000/chat";
```

### Modify Server Host/Port
Edit `main.py`, last section:
```python
uvicorn.run(app_api, host="0.0.0.0", port=8000)  # 0.0.0.0 for external access
```

### Adjust API Request Timeout
Edit `frontend/script.js`, modify fetch options:
```javascript
const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
    // Add timeout in fetch
});
```

## 🐛 Troubleshooting

### "Connection failed" Error
- Ensure backend server is running: `python main.py`
- Verify API endpoint in frontend/script.js matches your server
- Check GROQ_API_KEY is set correctly
- Look for errors in terminal running the server

### Messages not saving to localStorage
- Check browser's localStorage is enabled
- Try clearing browser cache and reloading
- Check browser console for JavaScript errors (F12)

### Frontend not loading
- Verify frontend directory exists: `frontend/`
- Check required files: `index.html`, `style.css`, `script.js`
- Check browser console for 404 errors

### CORS errors
- CORS is enabled by default in `main.py`
- If issues persist, verify `CORSMiddleware` is added before routes

## 📱 Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## 🔐 Security Notes

⚠️ **Important**: This application is designed for local use only.

- CORS is set to allow all origins (`allow_origins=["*"]`)
- No authentication implemented
- API key is stored in environment variables
- localStorage stores data unencrypted in browser

For production deployment:
- Restrict CORS origins
- Implement authentication
- Use HTTPS only
- Secure API keys with proper key management
- Consider rate limiting

## 📝 Code Comments

All code includes detailed comments explaining:
- Function purposes and behavior
- Configuration options
- API integration
- State management
- DOM manipulation

## 🚀 Running in Production

```bash
# Using Uvicorn with multiple workers
uvicorn main:app_api --host 0.0.0.0 --port 8000 --workers 4

# Using Gunicorn (Linux/macOS only)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app_api
```

## 📚 Technologies Used

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with flexbox/grid
- **Vanilla JavaScript** - No frameworks
- **Fetch API** - API communication

### Backend
- **Python 3.9+** - Backend language
- **FastAPI** - Web framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **LangChain** - AI integration (existing)

## 📄 License

This project is part of the Local AI Agent ecosystem.

## 💡 Tips & Best Practices

1. **Organize Chats** - Give meaningful names to important conversations
2. **Regular Exports** - Backup important conversations
3. **Clear Cache** - Periodically clear old chats to improve performance
4. **Monitor Logs** - Check server console for errors and performance
5. **Update Backend** - Keep AI models and dependencies updated

## 🤝 Contributing

To contribute improvements:
1. Fork the repository
2. Create a feature branch
3. Make improvements
4. Test thoroughly
5. Submit pull request

## 📧 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console (F12) for errors
3. Check server terminal for API errors
4. Verify all files are in correct locations

---

**Enjoy using VedaAI - Your Local AI Assistant!** 🚀🤖
