// Chat Module
const GLOBAL_CHAT_ID = 'global_chat';
let currentChat = null;
let chats = new Map();
let messages = new Map();
let users = new Map();

// DOM Elements
const chatsList = document.getElementById('chatsList');
const chatArea = document.getElementById('chatArea');
const emptyState = document.getElementById('emptyState');
const chatHeader = document.getElementById('chatHeader');
const chatName = document.getElementById('chatName');
const chatStatus = document.getElementById('chatStatus');
const chatAvatar = document.getElementById('chatAvatar');
const messagesContainer = document.getElementById('messagesContainer');
const messageInputContainer = document.getElementById('messageInputContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const newChatBtn = document.getElementById('newChatBtn');
const newChatModal = document.getElementById('newChatModal');
const newChatUsername = document.getElementById('newChatUsername');
const startNewChatBtn = document.getElementById('startNewChatBtn');
const closeNewChatModal = document.getElementById('closeNewChatModal');

// Initialize Chat
function initChat() {
    if (!window.currentUser()) return;

    loadChats();
    loadCurrentUserInfo();
    setupEventListeners();
}

// Load User Chats
function loadChats() {
    const userId = window.currentUser().uid;
    const userChatsRef = window.dbRef(window.database, `userChats/${userId}`);

    window.onValue(userChatsRef, (snapshot) => {
        const userChats = snapshot.val() || {};
        chats.clear();

        // Always include global chat
        if (!userChats[GLOBAL_CHAT_ID]) {
            // Add global chat to user's chat list if not present
            window.set(window.dbRef(window.database, `userChats/${userId}/${GLOBAL_CHAT_ID}`), true);
        }

        // Load chat details for each chat
        Object.keys(userChats).forEach(chatId => {
            loadChatDetails(chatId);
        });

        renderChatsList();
    });
}

// Load Chat Details
function loadChatDetails(chatId) {
    const chatRef = window.dbRef(window.database, `chats/${chatId}`);

    window.onValue(chatRef, (snapshot) => {
        const chatData = snapshot.val();
        if (chatData) {
            chats.set(chatId, chatData);
            loadLastMessage(chatId);
            renderChatsList();
        } else if (chatId === GLOBAL_CHAT_ID) {
            // Create global chat if it doesn't exist
            const globalChatData = {
                type: 'global',
                participants: [],
                createdAt: Date.now(),
                createdBy: 'system'
            };
            window.set(chatRef, globalChatData);
        }
    });
}

// Load Last Message for Chat
function loadLastMessage(chatId) {
    const messagesRef = window.dbRef(window.database, `messages/${chatId}`);
    const lastMessageQuery = window.query(messagesRef, window.orderByChild('timestamp'), window.limitToLast(1));

    window.onValue(lastMessageQuery, (snapshot) => {
        const messages = snapshot.val();
        if (messages) {
            const messageId = Object.keys(messages)[0];
            const messageData = messages[messageId];
            const chat = chats.get(chatId);
            if (chat) {
                chat.lastMessage = messageData;
                renderChatsList();
            }
        }
    });
}

// Render Chats List
function renderChatsList() {
    chatsList.innerHTML = '';

    if (chats.size === 0) {
        chatsList.innerHTML = '<div class="no-chats">У вас пока нет чатов</div>';
        return;
    }

    // Sort chats by last message timestamp
    const sortedChats = Array.from(chats.entries()).sort((a, b) => {
        const aTime = a[1].lastMessage?.timestamp || 0;
        const bTime = b[1].lastMessage?.timestamp || 0;
        return bTime - aTime;
    });

    sortedChats.forEach(([chatId, chatData]) => {
        const chatItem = createChatItem(chatId, chatData);
        chatsList.appendChild(chatItem);
    });
}

// Create Chat Item Element
function createChatItem(chatId, chatData) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.dataset.chatId = chatId;

    if (currentChat && currentChat.id === chatId) {
        chatItem.classList.add('active');
    }

    let chatName, chatAvatarSrc, showDeleteBtn;

    if (chatId === GLOBAL_CHAT_ID) {
        // Global chat
        chatName = 'Общий чат';
        chatAvatarSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNDI4NWY0Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMzAiPkDwn5iKPC90ZXh0Pgo8L3N2Zz4=';
        showDeleteBtn = false;
    } else {
        // Private chat
        const otherParticipantId = chatData.participants.find(id => id !== window.currentUser().uid);
        const otherParticipant = users.get(otherParticipantId);

        // Listen for avatar changes
        if (otherParticipantId && !users.has(otherParticipantId)) {
            loadUserInfo(otherParticipantId);
        }

        const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiPkDwn5iKPC90ZXh0Pgo8L3N2Zz4=';
        chatName = otherParticipant?.displayName || otherParticipant?.username || 'Неизвестный';
        chatAvatarSrc = otherParticipant?.avatar || defaultAvatar;
        showDeleteBtn = true;
    }

    chatItem.innerHTML = `
        <div class="chat-avatar">
            <img src="${chatAvatarSrc}" alt="Avatar">
        </div>
        <div class="chat-content">
            <div class="chat-header-info">
                <div class="chat-name">${chatName}</div>
                <div class="chat-time">${chatData.lastMessage ? formatTime(chatData.lastMessage.timestamp) : ''}</div>
            </div>
            <div class="chat-last-message">
                ${chatData.lastMessage ? formatLastMessage(chatData.lastMessage) : 'Нет сообщений'}
            </div>
        </div>
        ${showDeleteBtn ? `<button class="delete-chat-btn" data-chat-id="${chatId}" title="Удалить чат">🗑️</button>` : ''}
    `;

    chatItem.addEventListener('click', (e) => {
        // Don't open chat if delete button was clicked
        if (e.target.classList.contains('delete-chat-btn')) {
            return;
        }
        openChat(chatId);
    });

    // Add delete button event listener only for private chats
    if (showDeleteBtn) {
        const deleteBtn = chatItem.querySelector('.delete-chat-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chatId);
        });
    }

    return chatItem;
}

// Format Last Message Preview
function formatLastMessage(message) {
    if (message.sender === window.currentUser().uid) {
        return `Вы: ${message.text}`;
    }
    return message.text;
}

// Open Chat
function openChat(chatId) {
    currentChat = { id: chatId, data: chats.get(chatId) };
    loadMessages(chatId);
    updateChatUI();

    // Mark as active in sidebar
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-chat-id="${chatId}"]`).classList.add('active');
}

// Load Messages for Chat
function loadMessages(chatId) {
    const messagesRef = window.dbRef(window.database, `messages/${chatId}`);

    window.onValue(messagesRef, (snapshot) => {
        const messagesData = snapshot.val() || {};
        messages.set(chatId, messagesData);
        renderMessages(chatId);
        scrollToBottom();
    });
}

// Render Messages
function renderMessages(chatId) {
    const chatMessages = messages.get(chatId) || {};
    messagesContainer.innerHTML = '';

    Object.entries(chatMessages)
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .forEach(([messageId, messageData]) => {
            const messageElement = createMessageElement(messageId, messageData);
            messagesContainer.appendChild(messageElement);
        });
}

// Create Message Element
function createMessageElement(messageId, messageData) {
    const messageDiv = document.createElement('div');
    const isOwn = messageData.sender === window.currentUser().uid;
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;

    // Load sender info if not cached
    if (!users.has(messageData.sender)) {
        loadUserInfo(messageData.sender);
    }

    const sender = users.get(messageData.sender);
    const time = formatTime(messageData.timestamp);

    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI3MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+👤PC90ZXh0Pgo8L3N2Zz4=';

    const avatarSrc = isOwn ?
        (users.get(window.currentUser().uid)?.avatar || defaultAvatar) :
        (sender?.avatar || defaultAvatar);

    console.log('Avatar src for', isOwn ? 'own' : 'other', 'message:', avatarSrc);

    messageDiv.innerHTML = `
        ${!isOwn ? `<div class="message-avatar"><img src="${avatarSrc}" alt="Avatar"></div>` : ''}
        <div class="message-content">
            <div class="message-bubble">${messageData.text}</div>
            <div class="message-time">${time}</div>
        </div>
        ${isOwn ? `<div class="message-avatar"><img src="${avatarSrc}" alt="Avatar"></div>` : ''}
    `;

    return messageDiv;
}

// Send Message
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChat) return;

    const messageData = {
        text: text,
        sender: window.currentUser().uid,
        timestamp: Date.now(),
        status: 'sent'
    };

    try {
        const messagesRef = window.dbRef(window.database, `messages/${currentChat.id}`);
        const newMessageRef = window.push(messagesRef);
        await window.set(newMessageRef, messageData);

        // Update chat last message
        await window.update(window.dbRef(window.database, `chats/${currentChat.id}`), {
            lastMessage: messageData
        });

        messageInput.value = '';
        scrollToBottom();
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Ошибка отправки сообщения');
    }
}

// Start New Chat
async function startNewChat() {
    // For global chat system, just open the global chat
    openChat(GLOBAL_CHAT_ID);
    closeModal();
    newChatUsername.value = '';
}

// Find Existing Chat (now redundant but kept for compatibility)
function findExistingChat(targetUserId) {
    const participants = [window.currentUser().uid, targetUserId].sort();
    const chatId = participants.join('_');
    return chats.has(chatId) ? chatId : null;
}

// Load User Info
function loadUserInfo(userId) {
    const userRef = window.dbRef(window.database, `users/${userId}`);
    window.onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            users.set(userId, userData);
            // Trigger re-render of chats and messages when user data changes
            renderChatsList();
            if (currentChat) {
                renderMessages(currentChat.id);
                updateChatUI();
            }
        }
    });
}

// Load current user info
function loadCurrentUserInfo() {
    if (!window.currentUser()) return;

    const userId = window.currentUser().uid;
    const userRef = window.dbRef(window.database, `users/${userId}`);
    window.onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            users.set(userId, userData);
            // Update UI when current user avatar changes
            if (currentChat) {
                renderMessages(currentChat.id);
            }
        }
    });
}

// Update Chat UI
function updateChatUI() {
    if (!currentChat) {
        emptyState.style.display = 'flex';
        chatHeader.style.display = 'none';
        messageInputContainer.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    chatHeader.style.display = 'flex';
    messageInputContainer.style.display = 'flex';

    if (currentChat.id === GLOBAL_CHAT_ID) {
        // Global chat header
        const globalAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNDI4NWY0Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMzAiPkDwn5iKPC90ZXh0Pgo8L3N2Zz4=';
        chatName.textContent = 'Общий чат';
        chatStatus.textContent = 'Все пользователи';
        chatAvatar.src = globalAvatar;
    } else {
        // Private chat header
        const otherParticipantId = currentChat.data.participants.find(id => id !== window.currentUser().uid);
        const otherParticipant = users.get(otherParticipantId);

        const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiPkDwn5iKPC90ZXh0Pgo8L3N2Zz4=';

        chatName.textContent = otherParticipant?.displayName || otherParticipant?.username || 'Неизвестный';
        chatStatus.textContent = otherParticipant?.online ? 'онлайн' : 'был(а) недавно';
        chatAvatar.src = otherParticipant?.avatar || defaultAvatar;

        // Update chat header with real-time avatar changes
        if (otherParticipantId) {
            const userRef = window.dbRef(window.database, `users/${otherParticipantId}`);
            window.onValue(userRef, (snapshot) => {
                const userData = snapshot.val();
                if (userData) {
                    chatAvatar.src = userData.avatar || defaultAvatar;
                }
            });
        }
    }
}

// Setup Event Listeners
function setupEventListeners() {
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });


    newChatBtn.addEventListener('click', () => {
        newChatModal.style.display = 'flex';
    });

    closeNewChatModal.addEventListener('click', closeModal);
    startNewChatBtn.addEventListener('click', startNewChat);

    newChatUsername.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') startNewChat();
    });

    // Close modal when clicking outside
    newChatModal.addEventListener('click', (e) => {
        if (e.target === newChatModal) closeModal();
    });
}

// Toggle Emoji Picker
function toggleEmojiPicker() {
    emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
}

// Close Modal
function closeModal() {
    newChatModal.style.display = 'none';
    newChatUsername.value = '';
}

// Scroll to Bottom
function scrollToBottom() {
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
}

// Format Time
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) { // Less than 1 minute
        return 'только что';
    } else if (diff < 3600000) { // Less than 1 hour
        return `${Math.floor(diff / 60000)} мин`;
    } else if (diff < 86400000) { // Less than 1 day
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
}

// Delete Chat
async function deleteChat(chatId) {
    if (chatId === GLOBAL_CHAT_ID) {
        alert('Нельзя удалить общий чат');
        return;
    }

    if (!confirm('Вы уверены, что хотите удалить этот чат?')) {
        return;
    }

    try {
        const currentUserId = window.currentUser().uid;

        // Remove chat from user's chat list
        await window.remove(window.dbRef(window.database, `userChats/${currentUserId}/${chatId}`));

        // If this chat is currently open, close it
        if (currentChat && currentChat.id === chatId) {
            currentChat = null;
            updateChatUI();
        }

        // Remove from local chats map
        chats.delete(chatId);

        // Update UI
        renderChatsList();

        showNotification('Чат удален', 'success');
    } catch (error) {
        console.error('Error deleting chat:', error);
        showNotification('Ошибка удаления чата', 'error');
    }
}

// Export functions
window.initChat = initChat;