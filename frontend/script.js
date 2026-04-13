/**
 * VedaAI - Local AI Assistant
 * Frontend JavaScript Application
 * 
 * Features:
 * - Multiple chat sessions stored in localStorage
 * - Real-time messaging with AI backend
 * - Chat history management (create, rename, delete)
 * - Error handling and reconnection attempts
 * - Modern UI with smooth animations
 */

// ========================================
// Configuration
// ========================================
const API_ENDPOINT = "/chat";
const STORAGE_KEY = "vedaai_chats";
const ACTIVE_CHAT_KEY = "vedaai_active_chat";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// ========================================
// State Management
// ========================================
let chats = {};
let activeChat = null;
let isLoading = false;

// ========================================
// DOM Elements
// ========================================
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const chatList = document.getElementById('chatList');
const errorBanner = document.getElementById('errorBanner');
const errorMessage = document.getElementById('errorMessage');
const contextMenu = document.getElementById('contextMenu');

// ========================================
// Initialization
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

/**
 * Initialize the application by loading stored chats
 */
function initializeApp() {
    // Load chats from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            chats = JSON.parse(stored);
        } catch (e) {
            console.error("Error loading chats from storage:", e);
            chats = {};
        }
    }

    // Load last active chat
    const lastChat = localStorage.getItem(ACTIVE_CHAT_KEY);
    if (lastChat && chats[lastChat]) {
        activeChat = lastChat;
    }

    renderChatList();
    if (activeChat) {
        loadChat(activeChat);
    }
}

/**
 * Setup event listeners for buttons and inputs
 */
function setupEventListeners() {
    // New Chat button
    newChatBtn.addEventListener('click', createNewChat);

    // Clear All button
    clearAllBtn.addEventListener('click', clearAllChats);

    // Send message
    sendBtn.addEventListener('click', handleSendMessage);

    // User input
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Auto-resize textarea
    userInput.addEventListener('input', autoResizeTextarea);

    // Close modals on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu') && !e.target.closest('.chat-item')) {
            contextMenu.classList.add('hidden');
        }
    });
}

// ========================================
// Chat Management
// ========================================

/**
 * Create a new chat session
 */
function createNewChat() {
    const chatCount = Object.keys(chats).length + 1;
    const chatName = `Chat ${chatCount}`;
    
    chats[chatName] = [];
    activeChat = chatName;
    saveChats();
    localStorage.setItem(ACTIVE_CHAT_KEY, activeChat);
    
    renderChatList();
    loadChat(activeChat);
}

/**
 * Load a specific chat into the view
 */
function loadChat(chatName) {
    activeChat = chatName;
    localStorage.setItem(ACTIVE_CHAT_KEY, activeChat);
    
    // Clear messages display
    chatMessages.innerHTML = '';
    
    // Render all messages from this chat
    const messages = chats[activeChat] || [];
    if (messages.length === 0) {
        showWelcomeSection();
    } else {
        messages.forEach((msg) => {
            addMessageToDOM(msg.text, msg.sender);
        });
        scrollToBottom();
    }

    // Update active state in sidebar
    renderChatList();
    userInput.focus();
}

/**
 * Delete a chat session
 */
function deleteChat(chatName) {
    if (Object.keys(chats).length <= 1) {
        showError("Cannot delete the last chat");
        return;
    }

    delete chats[chatName];
    saveChats();

    // If deleted chat was active, switch to another chat
    if (activeChat === chatName) {
        activeChat = Object.keys(chats)[0];
        localStorage.setItem(ACTIVE_CHAT_KEY, activeChat);
    }

    renderChatList();
    loadChat(activeChat);
}

/**
 * Rename a chat session
 */
function renameChat(oldName, newName) {
    if (!newName.trim()) {
        showError("Chat name cannot be empty");
        return;
    }

    if (newName === oldName) {
        return;
    }

    if (chats[newName]) {
        showError("Chat name already exists");
        return;
    }

    chats[newName] = chats[oldName];
    delete chats[oldName];

    if (activeChat === oldName) {
        activeChat = newName;
        localStorage.setItem(ACTIVE_CHAT_KEY, activeChat);
    }

    saveChats();
    renderChatList();
    loadChat(activeChat);
}

/**
 * Clear all chats with confirmation
 */
function clearAllChats() {
    if (Object.keys(chats).length === 0) {
        showError("No chats to clear");
        return;
    }

    if (confirm("Are you sure you want to delete all chats? This cannot be undone.")) {
        chats = {};
        activeChat = null;
        saveChats();
        localStorage.removeItem(ACTIVE_CHAT_KEY);
        chatMessages.innerHTML = '';
        showWelcomeSection();
        renderChatList();
    }
}

// ========================================
// Messaging
// ========================================

/**
 * Handle sending a message
 */
async function handleSendMessage() {
    const message = userInput.value.trim();
    
    if (!message || isLoading) return;

    // Create new chat if none exists
    if (!activeChat) {
        createNewChat();
    }

    // Add user message to DOM and storage
    addMessageToDOM(message, 'user');
    chats[activeChat].push({ text: message, sender: 'user' });
    saveChats();

    // Clear input
    userInput.value = '';
    autoResizeTextarea();
    sendBtn.disabled = true;
    isLoading = true;

    // Show typing indicator
    const typingId = showTypingIndicator();

    // Send to API
    try {
        const response = await sendMessageToAPI(message);
        
        // Remove typing indicator
        removeTypingIndicator(typingId);

        // Add AI response
        addMessageToDOM(response, 'ai');
        chats[activeChat].push({ text: response, sender: 'ai' });
        saveChats();

        scrollToBottom();
        hideError();
    } catch (error) {
        removeTypingIndicator(typingId);
        showError(`Error: ${error.message}`);
        console.error("API Error:", error);
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

/**
 * Send message to AI backend API
 */
async function sendMessageToAPI(message, retries = 0) {
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: message }),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.reply) {
            throw new Error("No response from AI");
        }

        return data.reply;
    } catch (error) {
        // Retry logic for connection errors
        if (retries < MAX_RETRIES && error.message.includes('fetch')) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return sendMessageToAPI(message, retries + 1);
        }
        throw error;
    }
}

// ========================================
// DOM Manipulation
// ========================================

/**
 * Add message to DOM
 */
function addMessageToDOM(text, sender) {
    // Hide welcome section if visible
    const welcomeSection = chatMessages.querySelector('.welcome-section');
    if (welcomeSection) {
        welcomeSection.remove();
    }

    const messageEl = document.createElement('div');
    messageEl.className = `message ${sender}`;

    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    
    // Render markdown-like formatting
    contentEl.innerHTML = escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');

    messageEl.appendChild(contentEl);

    // Add copy button for AI messages
    if (sender === 'ai') {
        const actionsEl = document.createElement('div');
        actionsEl.className = 'message-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'message-btn';
        copyBtn.title = 'Copy message';
        copyBtn.innerHTML = `
            <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
        `;
        copyBtn.addEventListener('click', () => copyToClipboard(text, copyBtn));

        actionsEl.appendChild(copyBtn);
        messageEl.appendChild(actionsEl);
    }

    chatMessages.appendChild(messageEl);
    scrollToBottom();
}

/**
 * Show typing indicator while AI is responding
 */
function showTypingIndicator() {
    const messageEl = document.createElement('div');
    messageEl.className = 'message ai';
    messageEl.id = 'typing-indicator';

    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.innerHTML = `
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;

    messageEl.appendChild(contentEl);
    chatMessages.appendChild(messageEl);
    scrollToBottom();

    return 'typing-indicator';
}

/**
 * Remove typing indicator
 */
function removeTypingIndicator(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

/**
 * Show welcome section
 */
function showWelcomeSection() {
    chatMessages.innerHTML = `
        <div class="welcome-section">
            <div class="welcome-icon">🤖</div>
            <h1>VedaAI</h1>
            <p>Local AI Assistant</p>
            <div class="welcome-subtext">Start a conversation to interact with your local AI</div>
        </div>
    `;
}

/**
 * Auto-resize textarea based on content
 */
function autoResizeTextarea() {
    userInput.style.height = 'auto';
    const newHeight = Math.min(userInput.scrollHeight, 200);
    userInput.style.height = newHeight + 'px';
}

/**
 * Scroll chat to bottom
 */
function scrollToBottom() {
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 0);
}

// ========================================
// Sidebar Management
// ========================================

/**
 * Render chat list in sidebar
 */
function renderChatList() {
    chatList.innerHTML = '';

    const chatNames = Object.keys(chats);
    
    if (chatNames.length === 0) {
        return;
    }

    chatNames.forEach((chatName) => {
        const chatItemEl = document.createElement('button');
        chatItemEl.className = `chat-item ${activeChat === chatName ? 'active' : ''}`;
        chatItemEl.textContent = chatName;

        // Left click - open chat
        chatItemEl.addEventListener('click', () => loadChat(chatName));

        // Right click - context menu
        chatItemEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, chatName);
        });

        chatList.appendChild(chatItemEl);
    });
}

/**
 * Show context menu for chat actions
 */
function showContextMenu(e, chatName) {
    e.preventDefault();

    contextMenu.style.top = e.clientY + 'px';
    contextMenu.style.left = e.clientX + 'px';
    contextMenu.classList.remove('hidden');

    // Store current chat name for context menu actions
    contextMenu.currentChat = chatName;

    // Update menu items
    document.getElementById('renameOption').onclick = () => {
        showRenameModal(chatName);
        contextMenu.classList.add('hidden');
    };

    document.getElementById('deleteOption').onclick = () => {
        if (confirm(`Delete chat "${chatName}"?`)) {
            deleteChat(chatName);
        }
        contextMenu.classList.add('hidden');
    };
}

// ========================================
// Modal Functions
// ========================================

/**
 * Show rename modal
 */
function showRenameModal(chatName) {
    const modal = document.getElementById('renameModal');
    const input = document.getElementById('renameInput');
    input.value = chatName;
    input.select();
    modal.classList.remove('hidden');
    modal.currentChat = chatName;
    input.focus();
}

/**
 * Close rename modal
 */
function closeRenameModal() {
    document.getElementById('renameModal').classList.add('hidden');
}

/**
 * Confirm rename action
 */
function confirmRename() {
    const modal = document.getElementById('renameModal');
    const input = document.getElementById('renameInput');
    const oldName = modal.currentChat;
    const newName = input.value.trim();

    if (newName) {
        renameChat(oldName, newName);
    }
    closeRenameModal();
}

// ========================================
// Utility Functions
// ========================================

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text, button) {
    try {
        await navigator.clipboard.writeText(text);
        const originalHTML = button.innerHTML;
        button.innerHTML = `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
        setTimeout(() => {
            button.innerHTML = originalHTML;
        }, 2000);
    } catch (err) {
        console.error("Failed to copy:", err);
        showError("Failed to copy message");
    }
}

/**
 * Show error message
 */
function showError(message) {
    errorMessage.textContent = message;
    errorBanner.classList.remove('hidden');
    setTimeout(() => {
        hideError();
    }, 5000);
}

/**
 * Hide error message
 */
function hideError() {
    errorBanner.classList.add('hidden');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Save chats to localStorage
 */
function saveChats() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

// ========================================
// Keyboard Shortcuts
// ========================================
document.addEventListener('keydown', (e) => {
    // Ctrl+N / Cmd+N - New Chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewChat();
    }
});