let chats = JSON.parse(localStorage.getItem("allChats")) || {};
let currentChat = null;

// Create new chat
function newChat() {
    currentChat = "Chat " + (Object.keys(chats).length + 1);
    chats[currentChat] = [];
    saveChats();
    loadChats();
    document.getElementById("chat-box").innerHTML = "";
}

// Save chats to localStorage
function saveChats() {
    localStorage.setItem("allChats", JSON.stringify(chats));
}

// Load chat list in sidebar
function loadChats() {
    let chatList = document.getElementById("chat-list");
    chatList.innerHTML = "";

    for (let chat in chats) {
        let div = document.createElement("div");
        div.className = "chat-item";
        div.innerText = chat;
        div.onclick = () => openChat(chat);
        chatList.appendChild(div);
    }
}

// Open old chat
function openChat(chatName) {
    currentChat = chatName;
    let chatBox = document.getElementById("chat-box");
    chatBox.innerHTML = "";

    chats[chatName].forEach(msg => {
        addMessage(msg.text, msg.sender, false);
    });
}

// Send message
async function sendMessage() {
    let input = document.getElementById("user-input");
    let message = input.value.trim();
    if (!message) return;

    if (!currentChat) newChat();

    addMessage(message, "user", true);
    input.value = "";

    let typing = addMessage("Typing...", "ai", false);

    try {
        let response = await fetch("http://127.0.0.1:8000/chat", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ text: message })
        });

        let data = await response.json();
        typing.remove();
        addMessage(data.reply, "ai", true);

    } catch {
        typing.remove();
        addMessage("Error connecting to AI", "ai", true);
    }
}

// Add message to UI + save
function addMessage(text, sender, save) {
    let chatBox = document.getElementById("chat-box");

    let msg = document.createElement("div");
    msg.className = "message " + sender;
    msg.innerText = text;
    chatBox.appendChild(msg);

    chatBox.scrollTop = chatBox.scrollHeight;

    if (save && currentChat) {
        chats[currentChat].push({text, sender});
        saveChats();
    }

    return msg;
}

// Enter key
function handleKey(e) {
    if (e.key === "Enter") sendMessage();
}

// Load chats on start
loadChats();