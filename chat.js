// Chat Module
let currentChat = null;
let chats = new Map();
let messages = new Map();
let users = new Map();
let replyToMessageId = null;

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

        // Load chat details for each chat, excluding global chat
        Object.keys(userChats).forEach(chatId => {
            if (chatId !== 'global_chat') {
                loadChatDetails(chatId);
            }
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

    // Private chat
    const otherParticipantId = chatData.participants.find(id => id !== window.currentUser().uid);
    const otherParticipant = users.get(otherParticipantId);

    // Listen for avatar changes
    if (otherParticipantId && !users.has(otherParticipantId)) {
        loadUserInfo(otherParticipantId);
    }

    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiPkDwn5iKPC90ZXh0Pgo8L3N2Zz4=';
    const chatName = otherParticipant?.displayName ?
        `${otherParticipant.displayName} (${otherParticipant.username})` :
        (otherParticipant?.username || 'Неизвестный');
    const chatAvatarSrc = otherParticipant?.avatar || defaultAvatar;
    const showDeleteBtn = true;

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

        // Check for clear chat requests
        Object.values(messagesData).forEach(message => {
            if (message.type === 'clear_chat_request' && message.requester !== window.currentUser().uid) {
                handleClearChatRequest(message);
            }
        });

        renderMessages(chatId);
        scrollToBottom();
    });
}

// Render Messages
function renderMessages(chatId) {
    const chatMessages = messages.get(chatId) || {};
    messagesContainer.innerHTML = '';

    // Group consecutive images from same sender within 0.5 seconds
    const groupedMessages = groupMessages(Object.entries(chatMessages)
        .sort((a, b) => a[1].timestamp - b[1].timestamp));

    groupedMessages.forEach(group => {
        if (group.length === 1) {
            // Single message
            const messageElement = createMessageElement(group[0][0], group[0][1]);
            messagesContainer.appendChild(messageElement);
        } else {
            // Group of images
            const groupElement = createImageGroupElement(group);
            messagesContainer.appendChild(groupElement);
        }
    });
}

// Group consecutive images
function groupMessages(messages) {
    const groups = [];
    let currentGroup = [];

    for (let i = 0; i < messages.length; i++) {
        const [messageId, messageData] = messages[i];

        if (messageData.type === 'image') {
            currentGroup.push([messageId, messageData]);

            // Check if next message exists and is from same sender within 0.5 seconds
            if (i + 1 < messages.length) {
                const nextMessage = messages[i + 1][1];
                const timeDiff = nextMessage.timestamp - messageData.timestamp;

                if (nextMessage.sender === messageData.sender &&
                    nextMessage.type === 'image' &&
                    timeDiff <= 500) { // 0.5 seconds
                    continue; // Continue grouping
                }
            }

            // End of group
            groups.push([...currentGroup]);
            currentGroup = [];
        } else {
            // Non-image message, add current group if exists
            if (currentGroup.length > 0) {
                groups.push([...currentGroup]);
                currentGroup = [];
            }
            groups.push([[messageId, messageData]]);
        }
    }

    // Add remaining group
    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }

    return groups;
}

// Create Image Group Element
function createImageGroupElement(messageGroup) {
    const groupDiv = document.createElement('div');
    const firstMessage = messageGroup[0][1];
    const isOwn = firstMessage.sender === window.currentUser().uid;

    groupDiv.className = `message image-group ${isOwn ? 'own' : 'other'}`;

    // Load sender info
    if (!users.has(firstMessage.sender)) {
        loadUserInfo(firstMessage.sender);
    }

    const sender = users.get(firstMessage.sender);
    const time = formatTime(firstMessage.timestamp);

    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI3MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+👤PC90ZXh0Pgo8L3N2Zz4=';

    const avatarSrc = isOwn ?
        (users.get(window.currentUser().uid)?.avatar || defaultAvatar) :
        (sender?.avatar || defaultAvatar);

    const senderName = isOwn ?
        (users.get(window.currentUser().uid)?.displayName || users.get(window.currentUser().uid)?.username || 'Вы') :
        (sender?.displayName ? `${sender.displayName} (${sender.username})` : (sender?.username || 'Неизвестный'));

    // Create image grid based on number of images
    let gridClass = 'image-grid-1';
    if (messageGroup.length === 2) gridClass = 'image-grid-2';
    else if (messageGroup.length === 3) gridClass = 'image-grid-3';
    else if (messageGroup.length >= 4) gridClass = 'image-grid-4';

    const imagesHtml = messageGroup.map(([messageId, messageData]) =>
        `<img src="${messageData.image}" alt="${messageData.imageName || 'Изображение'}" class="group-image" onclick="openImageModal('${messageData.image}')">`
    ).join('');

    groupDiv.innerHTML = `
        ${!isOwn ? `<div class="message-avatar"><img src="${avatarSrc}" alt="Avatar"></div>` : ''}
        <div class="message-content">
            ${!isOwn ? `<div class="message-sender">${senderName}</div>` : ''}
            <div class="message-bubble">
                <div class="image-group-container ${gridClass}">
                    ${imagesHtml}
                </div>
            </div>
            <div class="message-time">${time}</div>
        </div>
        ${isOwn ? `<div class="message-avatar"><img src="${avatarSrc}" alt="Avatar"></div>` : ''}
    `;

    return groupDiv;
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

    const senderName = isOwn ?
        (users.get(window.currentUser().uid)?.displayName || users.get(window.currentUser().uid)?.username || 'Вы') :
        (sender?.displayName ? `${sender.displayName} (${sender.username})` : (sender?.username || 'Неизвестный'));

    // Handle replies
    let replyHtml = '';
    if (messageData.replyTo) {
        const replyMessage = findMessageById(messageData.replyTo);
        if (replyMessage) {
            const replySender = users.get(replyMessage.sender);
            const replySenderName = replySender?.displayName ? `${replySender.displayName} (${replySender.username})` : (replySender?.username || 'Неизвестный');
            const replyText = replyMessage.type === 'image' ? 'Изображение' : replyMessage.text.substring(0, 50) + (replyMessage.text.length > 50 ? '...' : '');
            replyHtml = `
                <div class="message-reply">
                    <div class="reply-line"></div>
                    <div class="reply-content">
                        <div class="reply-sender">${replySenderName}</div>
                        <div class="reply-text">${replyText}</div>
                    </div>
                </div>
            `;
        }
    }

    // Handle different message types
    let messageContent = '';
    if (messageData.type === 'image' && messageData.image) {
        messageContent = `
            <div class="message-image-container">
                <img src="${messageData.image}" alt="${messageData.imageName || 'Изображение'}" class="message-image" onclick="openImageModal('${messageData.image}')">
            </div>
        `;
    } else if (messageData.type === 'clear_chat_request') {
        messageContent = `<div class="message-text system-message">${messageData.text}</div>`;
    } else {
        messageContent = `<div class="message-text">${messageData.text}</div>`;
    }

    messageDiv.innerHTML = `
        ${!isOwn ? `<div class="message-avatar"><img src="${avatarSrc}" alt="Avatar"></div>` : ''}
        <div class="message-content">
            ${!isOwn ? `<div class="message-sender">${senderName}</div>` : ''}
            <div class="message-bubble" data-message-id="${messageId}">
                ${replyHtml}
                ${messageContent}
                <div class="message-actions">
                    <button class="reply-btn" onclick="replyToMessage('${messageId}')" title="Ответить">↩️</button>
                </div>
            </div>
            <div class="message-time">${time}</div>
        </div>
        ${isOwn ? `<div class="message-avatar"><img src="${avatarSrc}" alt="Avatar"></div>` : ''}
    `;

    return messageDiv;
}

// Find message by ID across all chats
function findMessageById(messageId) {
    for (const [chatId, chatMessages] of messages) {
        if (chatMessages[messageId]) {
            return chatMessages[messageId];
        }
    }
    return null;
}

// Send Message
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChat) return;

    // Validate message with security
    const validation = window.inputValidation.validateAndSanitize(text, 'message');
    if (!validation.valid) {
        showNotification(validation.error, 'error');
        return;
    }

    const messageData = {
        text: validation.sanitized,
        sender: window.currentUser().uid,
        timestamp: Date.now(),
        status: 'sent'
    };

    // Add reply information if replying
    if (replyToMessageId) {
        messageData.replyTo = replyToMessageId;
        cancelReply();
    }

    try {
        const messagesRef = window.dbRef(window.database, `messages/${currentChat.id}`);
        const newMessageRef = window.push(messagesRef);
        await window.set(newMessageRef, messageData);

        // Update chat last message
        await window.update(window.dbRef(window.database, `chats/${currentChat.id}`), {
            lastMessage: messageData
        });

        // Show notification for other participants
        const otherParticipantId = currentChat.data.participants.find(id => id !== window.currentUser().uid);
        if (otherParticipantId) {
            const userRef = window.dbRef(window.database, `users/${otherParticipantId}`);
            const snapshot = await window.get(userRef);
            const userData = snapshot.val();
            if (userData) {
                const senderName = users.get(window.currentUser().uid)?.displayName || users.get(window.currentUser().uid)?.username || 'Пользователь';
                window.showBrowserNotification('Новое сообщение', `${senderName}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
            }
        }

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
        showNotification('Введите имя пользователя', 'error');
        return;
    }

    try {
        // Find user by username
        const usersRef = window.dbRef(window.database, 'users');
        const snapshot = await window.get(usersRef);
        const usersData = snapshot.val();

        let targetUserId = null;
        for (const [userId, userData] of Object.entries(usersData || {})) {
            if (userData.username === username || userData.displayName === username) {
                targetUserId = userId;
                break;
            }
        }

        if (!targetUserId) {
            showNotification('Пользователь не найден', 'error');
            return;
        }

        if (targetUserId === window.currentUser().uid) {
            showNotification('Нельзя начать чат с самим собой', 'error');
            return;
        }

        // Check if chat already exists
        const existingChatId = findExistingChat(targetUserId);
        if (existingChatId) {
            openChat(existingChatId);
            closeModal();
            newChatUsername.value = '';
            return;
        }

        // Create new chat
        const participants = [window.currentUser().uid, targetUserId].sort();
        const chatId = participants.join('_');

        const chatData = {
            participants: participants,
            createdAt: Date.now(),
            createdBy: window.currentUser().uid
        };

        // Save chat data
        await window.set(window.dbRef(window.database, `chats/${chatId}`), chatData);

        // Add to both users' chat lists
        await window.set(window.dbRef(window.database, `userChats/${window.currentUser().uid}/${chatId}`), true);
        await window.set(window.dbRef(window.database, `userChats/${targetUserId}/${chatId}`), true);

        // Open the new chat
        openChat(chatId);
        closeModal();
        newChatUsername.value = '';

        showNotification('Чат создан!', 'success');
    } catch (error) {
        console.error('Error creating chat:', error);
        showNotification('Ошибка создания чата', 'error');
    }
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

    // Update reply input container
    updateReplyInput();

    // Private chat header
    const otherParticipantId = currentChat.data.participants.find(id => id !== window.currentUser().uid);
    const otherParticipant = users.get(otherParticipantId);

    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiPkDwn5iKPC90ZXh0Pgo8L3N2Zz4=';

    chatName.textContent = otherParticipant?.displayName ?
        `${otherParticipant.displayName} (${otherParticipant.username})` :
        (otherParticipant?.username || 'Неизвестный');
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

// Update Reply Input Container
function updateReplyInput() {
    const container = document.querySelector('.message-input-container');
    const existingReply = container.querySelector('.reply-input-container');

    if (replyToMessageId) {
        // Show reply input
        if (!existingReply) {
            const replyContainer = document.createElement('div');
            replyContainer.className = 'reply-input-container';

            const replyMessage = findMessageById(replyToMessageId);
            if (replyMessage) {
                const replySender = users.get(replyMessage.sender);
                const replySenderName = replySender?.displayName ? `${replySender.displayName} (${replySender.username})` : (replySender?.username || 'Неизвестный');
                const replyText = replyMessage.type === 'image' ? 'Изображение' : replyMessage.text.substring(0, 50) + (replyMessage.text.length > 50 ? '...' : '');

                replyContainer.innerHTML = `
                    <div class="reply-preview">
                        <div class="reply-preview-text">
                            <strong>${replySenderName}:</strong> ${replyText}
                        </div>
                        <button class="cancel-reply" onclick="cancelReply()">&times;</button>
                    </div>
                `;

                container.insertBefore(replyContainer, container.firstChild);
            }
        }
    } else {
        // Hide reply input
        if (existingReply) {
            existingReply.remove();
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

    // Image attachment functionality
    const attachBtn = document.getElementById('attachBtn');
    if (attachBtn) {
        attachBtn.addEventListener('click', showAttachmentOptions);
    }

    // Clipboard paste for images
    messageInput.addEventListener('paste', handlePaste);

    // Clear chat functionality
    const clearChatBtn = document.getElementById('clearChatBtn');
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', requestClearChat);
    }

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

// Request Clear Chat
async function requestClearChat() {
    if (!currentChat) return;

    const otherParticipantId = currentChat.data.participants.find(id => id !== window.currentUser().uid);
    if (!otherParticipantId) {
        showNotification('Невозможно очистить этот чат', 'error');
        return;
    }

    if (!confirm('Отправить запрос на очистку чата другому участнику?')) {
        return;
    }

    try {
        // Create clear chat request
        const requestId = Date.now().toString();
        const clearRequest = {
            id: requestId,
            requester: window.currentUser().uid,
            chatId: currentChat.id,
            timestamp: Date.now(),
            type: 'clear_chat_request'
        };

        // Send request to both participants
        await window.set(window.dbRef(window.database, `clearRequests/${currentChat.id}/${requestId}`), clearRequest);

        // Send notification message
        const notificationMessage = {
            text: '📝 Запрос на очистку чата отправлен',
            sender: window.currentUser().uid,
            timestamp: Date.now(),
            status: 'sent',
            type: 'system'
        };

        const messagesRef = window.dbRef(window.database, `messages/${currentChat.id}`);
        const newMessageRef = window.push(messagesRef);
        await window.set(newMessageRef, notificationMessage);

        showNotification('Запрос на очистку чата отправлен', 'info');

        // Listen for responses
        listenForClearResponses(currentChat.id);

    } catch (error) {
        console.error('Error requesting clear chat:', error);
        showNotification('Ошибка отправки запроса', 'error');
    }
}

// Listen for Clear Chat Responses
function listenForClearResponses(chatId) {
    const responsesRef = window.dbRef(window.database, `clearRequests/${chatId}`);
    window.onValue(responsesRef, (snapshot) => {
        const requests = snapshot.val() || {};

        Object.values(requests).forEach(request => {
            if (request.status === 'accepted' && request.acceptor !== window.currentUser().uid) {
                // Clear the chat
                clearChatMessages(chatId);
                showNotification('Чат очищен!', 'success');
            } else if (request.status === 'declined' && request.acceptor !== window.currentUser().uid) {
                showNotification('Запрос на очистку чата отклонен', 'info');
            }
        });
    });
}

// Clear Chat Messages
async function clearChatMessages(chatId) {
    try {
        const messagesRef = window.dbRef(window.database, `messages/${chatId}`);
        const snapshot = await window.get(messagesRef);
        const messages = snapshot.val() || {};

        // Remove all messages
        const deletePromises = Object.keys(messages).map(messageId =>
            window.remove(window.dbRef(window.database, `messages/${chatId}/${messageId}`))
        );

        await Promise.all(deletePromises);

        // Update chat last message to null
        await window.update(window.dbRef(window.database, `chats/${chatId}`), {
            lastMessage: null
        });

        // Clear local messages
        messages.delete(chatId);

        // Re-render if current chat
        if (currentChat && currentChat.id === chatId) {
            renderMessages(chatId);
        }

        // Update chat list
        renderChatsList();

    } catch (error) {
        console.error('Error clearing chat:', error);
        showNotification('Ошибка очистки чата', 'error');
    }
}

// Handle Clear Chat Request (called when user receives a request)
function handleClearChatRequest(request) {
    if (request.requester === window.currentUser().uid) return; // Don't handle own requests

    const accept = confirm(`Пользователь ${users.get(request.requester)?.displayName || users.get(request.requester)?.username || 'Неизвестный'} хочет очистить чат. Принять?`);

    // Update request status
    const updatedRequest = {
        ...request,
        status: accept ? 'accepted' : 'declined',
        acceptor: window.currentUser().uid,
        responseTime: Date.now()
    };

    window.update(window.dbRef(window.database, `clearRequests/${request.chatId}/${request.id}`), updatedRequest);
}

// Show Attachment Options
function showAttachmentOptions() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.display = 'none';

    input.onchange = async (event) => {
        const files = Array.from(event.target.files);
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                await sendImageMessage(file);
            }
        }
    };

    document.body.appendChild(input);
    setTimeout(() => {
        input.click();
        input.remove();
    }, 10);
}

// Handle Paste Event for Images
async function handlePaste(event) {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
                await sendImageMessage(file);
            }
        }
    }
}

// Send Image Message
async function sendImageMessage(file) {
    if (!currentChat || !file.type.startsWith('image/')) return;

    // Validate file with security module
    const fileValidation = window.inputValidation.validate(file, 'file');
    if (!fileValidation.valid) {
        showNotification(fileValidation.error, 'error');
        return;
    }

    try {
        showNotification('Отправка изображения...', 'info');

        // Convert image to base64
        const base64String = await fileToBase64(file);

        const messageData = {
            text: '',
            image: base64String,
            imageName: file.name,
            sender: window.currentUser().uid,
            timestamp: Date.now(),
            status: 'sent',
            type: 'image'
        };

        const messagesRef = window.dbRef(window.database, `messages/${currentChat.id}`);
        const newMessageRef = window.push(messagesRef);
        await window.set(newMessageRef, messageData);

        // Update chat last message
        await window.update(window.dbRef(window.database, `chats/${currentChat.id}`), {
            lastMessage: messageData
        });

        // Show notification for other participants
        const otherParticipantId = currentChat.data.participants.find(id => id !== window.currentUser().uid);
        if (otherParticipantId) {
            const userRef = window.dbRef(window.database, `users/${otherParticipantId}`);
            const snapshot = await window.get(userRef);
            const userData = snapshot.val();
            if (userData) {
                const senderName = users.get(window.currentUser().uid)?.displayName || users.get(window.currentUser().uid)?.username || 'Пользователь';
                window.showBrowserNotification('Новое изображение', `${senderName} отправил(а) изображение`);
            }
        }

        scrollToBottom();
        showNotification('Изображение отправлено!', 'success');
    } catch (error) {
        console.error('Error sending image:', error);
        showNotification('Ошибка отправки изображения', 'error');
    }
}

// Helper function to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Open Image Modal
function openImageModal(imageSrc) {
    const modal = document.getElementById('imageModal');
    const fullSizeImage = document.getElementById('fullSizeImage');
    const closeBtn = document.getElementById('closeImageModal');

    fullSizeImage.src = imageSrc;
    modal.style.display = 'flex';

    // Close modal functionality
    const closeModal = () => {
        modal.style.display = 'none';
    };

    closeBtn.onclick = closeModal;
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };

    // Close on escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Reply to Message
function replyToMessage(messageId) {
    replyToMessageId = messageId;
    updateReplyInput();
    messageInput.focus();
}

// Cancel Reply
function cancelReply() {
    replyToMessageId = null;
    updateReplyInput();
}

// Export functions
window.initChat = initChat;
window.openImageModal = openImageModal;
window.replyToMessage = replyToMessage;
window.cancelReply = cancelReply;