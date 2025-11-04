// Chat Module
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
    setupEventListeners();
}

// Load User Chats
function loadChats() {
    const userId = window.currentUser().uid;
    const userChatsRef = window.dbRef(window.database, `userChats/${userId}`);

    window.onValue(userChatsRef, (snapshot) => {
        const userChats = snapshot.val() || {};
        chats.clear();

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

    // Get other participant
    const otherParticipantId = chatData.participants.find(id => id !== window.currentUser().uid);
    const otherParticipant = users.get(otherParticipantId);

    chatItem.innerHTML = `
        <div class="chat-avatar">
            <img src="${otherParticipant?.avatar || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23666666"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="40">👤</text></svg>'}" alt="Avatar">
        </div>
        <div class="chat-content">
            <div class="chat-header-info">
                <div class="chat-name">${otherParticipant?.displayName || otherParticipant?.username || 'Неизвестный'}</div>
                <div class="chat-time">${chatData.lastMessage ? formatTime(chatData.lastMessage.timestamp) : ''}</div>
            </div>
            <div class="chat-last-message">
                ${chatData.lastMessage ? formatLastMessage(chatData.lastMessage) : 'Нет сообщений'}
            </div>
        </div>
    `;

    chatItem.addEventListener('click', () => openChat(chatId));
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

    messageDiv.innerHTML = `
        ${!isOwn ? `<div class="message-avatar"><img src="${sender?.avatar || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23666666"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="40">👤</text></svg>'}" alt="Avatar"></div>` : ''}
        <div class="message-content">
            <div class="message-bubble">${messageData.text}</div>
            <div class="message-time">${time}</div>
        </div>
        ${isOwn ? `<div class="message-avatar"><img src="${window.currentUser().photoURL || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23666666"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="40">👤</text></svg>'}" alt="Avatar"></div>` : ''}
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
    const username = newChatUsername.value.trim();
    if (!username) {
        alert('Введите имя пользователя');
        return;
    }

    try {
        // Find user by username
        const usersRef = window.dbRef(window.database, 'users');
        const snapshot = await window.get(usersRef);
        const usersData = snapshot.val();

        let targetUserId = null;
        for (const [uid, userData] of Object.entries(usersData)) {
            if (userData.username === username) {
                targetUserId = uid;
                break;
            }
        }

        if (!targetUserId) {
            alert('Пользователь не найден');
            return;
        }

        if (targetUserId === window.currentUser().uid) {
            alert('Нельзя начать чат с самим собой');
            return;
        }

        // Check if chat already exists
        const existingChatId = findExistingChat(targetUserId);
        if (existingChatId) {
            openChat(existingChatId);
            closeModal();
            return;
        }

        // Create new chat
        const chatData = {
            type: 'private',
            participants: [window.currentUser().uid, targetUserId],
            createdAt: Date.now(),
            createdBy: window.currentUser().uid
        };

        const newChatRef = window.push(window.dbRef(window.database, 'chats'));
        await window.set(newChatRef, chatData);

        // Add chat to both users
        const chatId = newChatRef.key;
        await window.set(window.dbRef(window.database, `userChats/${window.currentUser().uid}/${chatId}`), true);
        await window.set(window.dbRef(window.database, `userChats/${targetUserId}/${chatId}`), true);

        openChat(chatId);
        closeModal();
        newChatUsername.value = '';

    } catch (error) {
        console.error('Error starting new chat:', error);
        alert('Ошибка создания чата');
    }
}

// Find Existing Chat
function findExistingChat(targetUserId) {
    for (const [chatId, chatData] of chats) {
        if (chatData.type === 'private' &&
            chatData.participants.includes(window.currentUser().uid) &&
            chatData.participants.includes(targetUserId)) {
            return chatId;
        }
    }
    return null;
}

// Load User Info
function loadUserInfo(userId) {
    const userRef = window.dbRef(window.database, `users/${userId}`);
    window.onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            users.set(userId, userData);
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

    // Update header info
    const otherParticipantId = currentChat.data.participants.find(id => id !== window.currentUser().uid);
    const otherParticipant = users.get(otherParticipantId);

    chatName.textContent = otherParticipant?.displayName || otherParticipant?.username || 'Неизвестный';
    chatStatus.textContent = otherParticipant?.online ? 'онлайн' : 'был(а) недавно';
    chatAvatar.src = otherParticipant?.avatar || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23666666"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="40">👤</text></svg>';
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

    emojiBtn.addEventListener('click', toggleEmojiPicker);
    emojiPicker.addEventListener('click', (e) => {
        if (e.target.tagName === 'SPAN') {
            messageInput.value += e.target.textContent;
            emojiPicker.style.display = 'none';
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

// Export functions
window.initChat = initChat;