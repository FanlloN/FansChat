// Chat Module - Ultra Secure Implementation
let currentChat = null;
let chats = new Map();
let messages = new Map();
let users = new Map();
let replyToMessageId = null;
let currentGroupChat = null; // For group chat management

// Basic initialization without security overhead
(function() {
    'use strict';
    console.log('Chat by Fan - Basic initialization');
})();

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

    // Start storage cleanup scheduler
    if (typeof startStorageCleanupScheduler === 'function') {
        startStorageCleanupScheduler();
    }

    // Start image compression scheduler
    if (typeof startImageCompressionScheduler === 'function') {
        startImageCompressionScheduler();
    }

    // Initialize security monitoring (light version)
    if (typeof initSecurityMonitoring === 'function') {
        initSecurityMonitoring();
    }

    console.log('Chat initialized successfully');
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
            // Update group chat info if needed
            updateChatItemForGroup(chatId, chatData);
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
        // Update for group chats
        updateChatItemForGroup(chatId, chatData);
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

    const imagesHtml = messageGroup.map(([messageId, messageData]) => {
        const isCompressed = messageData.compressed;
        const imageClass = isCompressed ? 'group-image compressed' : 'group-image';
        const compressionIndicator = isCompressed ? '<div class="compression-indicator" title="Изображение сжато для экономии места">📦</div>' : '';

        return `<div class="group-image-container">
            <img src="${messageData.image}" alt="${messageData.imageName || 'Изображение'}" class="${imageClass}" onclick="openImageModal('${messageData.image}', '${messageData.imageName || 'image'}')">
            ${compressionIndicator}
            <button class="image-download-btn-small" onclick="downloadImage('${messageData.image}', '${messageData.imageName || 'image'}')" title="Скачать изображение">💾</button>
        </div>`;
    }).join('');

    groupDiv.innerHTML = `
        ${!isOwn ? `<div class="message-avatar"><img src="${avatarSrc}" alt="Avatar"></div>` : ''}
        <div class="message-content">
            ${!isOwn ? `<div class="message-sender">${senderName}</div>` : ''}
            <div class="message-bubble" data-message-id="${messageGroup[0][0]}">
                <div class="image-group-container ${gridClass}">
                    ${imagesHtml}
                </div>
                <div class="message-actions">
                    <button class="reply-btn" onclick="replyToMessage('${messageGroup[0][0]}')" title="Ответить">↩️</button>
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

            // Handle different reply types
            let replyText = '';
            if (replyMessage.type === 'image') {
                // Check if it's part of an image group
                const isImageGroup = isMessagePartOfImageGroup(replyMessage);
                replyText = isImageGroup ? 'Группа изображений' : 'Изображение';
            } else {
                replyText = replyMessage.text.substring(0, 50) + (replyMessage.text.length > 50 ? '...' : '');
            }

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
        const isCompressed = messageData.compressed;
        const imageClass = isCompressed ? 'message-image compressed' : 'message-image';
        const compressionIndicator = isCompressed ? '<div class="compression-indicator" title="Изображение сжато для экономии места">📦</div>' : '';

        messageContent = `
            <div class="message-image-container">
                <img src="${messageData.image}" alt="${messageData.imageName || 'Изображение'}" class="${imageClass}" onclick="openImageModal('${messageData.image}', '${messageData.imageName || 'image'}')">
                ${compressionIndicator}
                <button class="image-download-btn-small" onclick="downloadImage('${messageData.image}', '${messageData.imageName || 'image'}')" title="Скачать изображение">💾</button>
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

// Check if a message is part of an image group
function isMessagePartOfImageGroup(message) {
    if (!currentChat || message.type !== 'image') return false;

    const chatMessages = messages.get(currentChat.id) || {};
    const messageEntries = Object.entries(chatMessages).sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Find the group this message belongs to
    for (let i = 0; i < messageEntries.length; i++) {
        const [msgId, msgData] = messageEntries[i];
        if (msgId === message.timestamp.toString() || msgId === message.timestamp) {
            // Check if there are consecutive images around this message
            let groupSize = 1;

            // Check previous messages
            for (let j = i - 1; j >= 0; j--) {
                const prevMsg = messageEntries[j][1];
                if (prevMsg.sender === message.sender &&
                    prevMsg.type === 'image' &&
                    (message.timestamp - prevMsg.timestamp) <= 500) {
                    groupSize++;
                } else {
                    break;
                }
            }

            // Check next messages
            for (let j = i + 1; j < messageEntries.length; j++) {
                const nextMsg = messageEntries[j][1];
                if (nextMsg.sender === message.sender &&
                    nextMsg.type === 'image' &&
                    (nextMsg.timestamp - message.timestamp) <= 500) {
                    groupSize++;
                } else {
                    break;
                }
            }

            return groupSize > 1;
        }
    }

    return false;
}

// Send Message
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChat) return;

    // Basic validation
    if (text.length > 2000) {
        showNotification('Сообщение слишком длинное (максимум 2000 символов)', 'error');
        return;
    }

    // Show typing indicator on mobile
    if (window.innerWidth <= 768) {
        messageInput.style.opacity = '0.7';
        sendBtn.disabled = true;
        sendBtn.innerHTML = '⏳';
    }

    const messageData = {
        text: text,
        sender: window.currentUser().uid,
        timestamp: Date.now(),
        status: 'sent'
    };

    // Add reply information if replying
    if (replyToMessageId) {
        messageData.replyTo = replyToMessageId;
        cancelReply();
    }

    // Check for duplicate messages within 0.5 seconds
    const isDuplicate = await checkForDuplicateMessage(messageData);
    if (isDuplicate) {
        showNotification('Сообщение уже отправлено', 'info');
        messageInput.value = '';
        // Reset mobile UI
        if (window.innerWidth <= 768) {
            messageInput.style.opacity = '';
            sendBtn.disabled = false;
            sendBtn.innerHTML = '📤';
        }
        return;
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

        // Reset mobile UI
        if (window.innerWidth <= 768) {
            messageInput.style.opacity = '';
            sendBtn.disabled = false;
            sendBtn.innerHTML = '📤';
        }

        // Haptic feedback on mobile
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }

    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Ошибка отправки сообщения', 'error');

        // Reset mobile UI on error
        if (window.innerWidth <= 768) {
            messageInput.style.opacity = '';
            sendBtn.disabled = false;
            sendBtn.innerHTML = '📤';
        }
    }
}

// Check for duplicate messages within 0.5 seconds
async function checkForDuplicateMessage(newMessageData) {
    if (!currentChat) return false;

    try {
        const messagesRef = window.dbRef(window.database, `messages/${currentChat.id}`);
        const snapshot = await window.get(messagesRef);
        const chatMessages = snapshot.val() || {};

        const currentTime = Date.now();
        const timeWindow = 500; // 0.5 seconds

        // Find messages from the same sender within the time window
        const recentMessages = Object.values(chatMessages).filter(msg =>
            msg.sender === newMessageData.sender &&
            msg.text === newMessageData.text &&
            (currentTime - msg.timestamp) <= timeWindow
        );

        if (recentMessages.length > 0) {
            // Remove duplicate messages (keep only the most recent one)
            const messagesToDelete = recentMessages.slice(0, -1); // Keep the last one

            for (const msg of messagesToDelete) {
                // Find the message key
                const messageKey = Object.keys(chatMessages).find(key => chatMessages[key] === msg);
                if (messageKey) {
                    await window.remove(window.dbRef(window.database, `messages/${currentChat.id}/${messageKey}`));
                }
            }

            return true; // This is a duplicate
        }

        return false; // Not a duplicate
    } catch (error) {
        console.error('Error checking for duplicates:', error);
        return false;
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
        // Find user by username (case-insensitive)
        const targetUserId = await findUserByUsername(username);

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

    const chatData = currentChat.data;

    if (chatData.type === 'group') {
        // Group chat header
        chatHeader.classList.add('group-chat-header');

        const groupName = chatData.name || 'Групповой чат';
        const membersCount = chatData.participants?.length || 0;

        chatName.textContent = groupName;
        chatStatus.innerHTML = `
            <div class="group-members-count">${membersCount} участников</div>
            <button onclick="openGroupSettings()" style="background: none; border: none; color: var(--primary); cursor: pointer; font-size: 14px;">⚙️ Настройки</button>
        `;
        chatAvatar.src = chatData.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI3MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+👥PC90ZXh0Pgo8L3N2Zz4=';
    } else {
        // Private chat header
        chatHeader.classList.remove('group-chat-header');

        const otherParticipantId = chatData.participants.find(id => id !== window.currentUser().uid);
        const otherParticipant = users.get(otherParticipantId);

        const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiPkDwn5iKPC90ZXh0Pgo8L3N2Zz4=';

        chatName.textContent = otherParticipant?.displayName ?
            `${otherParticipant.displayName} (${otherParticipant.username})` :
            (otherParticipant?.username || 'Неизвестный');
        chatStatus.textContent = otherParticipant?.online ? 'онлайн' : 'был(а) недавно';
        chatStatus.classList.toggle('online', otherParticipant?.online || false);
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
        switchToPrivateChat(); // Default to private chat
    });

    closeNewChatModal.addEventListener('click', closeModal);
    startNewChatBtn.addEventListener('click', startNewChat);

    newChatUsername.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') startNewChat();
    });

    // Group chat event listeners
    document.getElementById('createPrivateChatBtn').addEventListener('click', switchToPrivateChat);
    document.getElementById('createGroupChatBtn').addEventListener('click', switchToGroupChat);
    document.getElementById('addMemberBtn').addEventListener('click', addMemberToGroup);
    document.getElementById('createGroupBtn').addEventListener('click', createGroupChat);

    // Group settings event listeners
    document.getElementById('closeGroupSettingsModal').addEventListener('click', closeGroupSettingsModal);
    document.getElementById('changeGroupAvatarBtn').addEventListener('click', changeGroupAvatar);
    document.getElementById('saveGroupNameBtn').addEventListener('click', saveGroupName);
    document.getElementById('addNewMemberBtn').addEventListener('click', addNewMemberToGroup);
    document.getElementById('leaveGroupBtn').addEventListener('click', leaveGroup);
    document.getElementById('deleteGroupBtn').addEventListener('click', deleteGroup);

    // Close modal when clicking outside
    newChatModal.addEventListener('click', (e) => {
        if (e.target === newChatModal) closeModal();
    });

    document.getElementById('groupSettingsModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('groupSettingsModal')) closeGroupSettingsModal();
    });

    // Mobile-specific touch events
    if ('ontouchstart' in window) {
        // Add touch feedback for buttons
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('touchstart', () => {
                btn.style.transform = 'scale(0.95)';
            }, { passive: true });

            btn.addEventListener('touchend', () => {
                setTimeout(() => {
                    btn.style.transform = '';
                }, 150);
            }, { passive: true });
        });

        // Swipe to go back in chat (from right edge)
        let startX = 0;
        let startY = 0;

        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!currentChat) return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const deltaX = startX - endX;
            const deltaY = startY - endY;

            // Swipe from right edge to go back
            if (startX > window.innerWidth - 50 && deltaX > 100 && Math.abs(deltaY) < 50) {
                // Close current chat and go back to chat list
                currentChat = null;
                updateChatUI();
                document.querySelectorAll('.chat-item').forEach(item => {
                    item.classList.remove('active');
                });
            }
        }, { passive: true });
    }

    // Handle viewport changes on mobile
    if ('visualViewport' in window) {
        window.visualViewport.addEventListener('resize', () => {
            // Adjust layout when keyboard appears
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer) {
                setTimeout(() => {
                    scrollToBottom();
                }, 300);
            }
        });
    }
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
    if (!messagesContainer) return;

    // Use requestAnimationFrame for smoother scrolling on mobile
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Additional scroll for mobile keyboards
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 300);
        }
    });
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

    // Basic file validation
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showNotification('Файл слишком большой (максимум 5MB)', 'error');
        return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('Неподдерживаемый формат файла', 'error');
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

// Compress image to maximum 1KB
function compressImageTo1KB(base64Image) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Start with very small dimensions and increase until we get close to 1KB
            let width = 32;
            let height = (img.height / img.width) * width;

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Try different quality levels and sizes to get under 1KB
            let quality = 0.9;
            let compressedBase64 = canvas.toDataURL('image/jpeg', quality);

            // Reduce size until under 1KB
            while (compressedBase64.length > 1333 && width > 16) { // 1333 is roughly 1KB in base64
                width = Math.max(16, width - 4);
                height = (img.height / img.width) * width;
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                compressedBase64 = canvas.toDataURL('image/jpeg', quality);

                // Also reduce quality if size is still too big
                if (compressedBase64.length > 1333 && quality > 0.1) {
                    quality -= 0.1;
                    compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                }
            }

            resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = base64Image;
    });
}

// Compress old images in a chat
async function compressOldImages(chatId) {
    try {
        const messagesRef = window.dbRef(window.database, `messages/${chatId}`);
        const snapshot = await window.get(messagesRef);
        const messages = snapshot.val() || {};

        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000); // 1 day in milliseconds
        const compressionPromises = [];

        for (const [messageId, messageData] of Object.entries(messages)) {
            if (messageData.type === 'image' &&
                messageData.timestamp < oneDayAgo &&
                messageData.image &&
                !messageData.compressed) { // Only compress if not already compressed

                const compressPromise = (async () => {
                    try {
                        const compressedImage = await compressImageTo1KB(messageData.image);
                        await window.update(window.dbRef(window.database, `messages/${chatId}/${messageId}`), {
                            image: compressedImage,
                            compressed: true,
                            originalSize: messageData.image.length,
                            compressedAt: Date.now()
                        });
                    } catch (error) {
                        console.error('Error compressing image:', error);
                    }
                })();

                compressionPromises.push(compressPromise);
            }
        }

        await Promise.all(compressionPromises);
        console.log(`Compressed ${compressionPromises.length} old images in chat ${chatId}`);
    } catch (error) {
        console.error('Error compressing old images:', error);
    }
}

// Open Image Modal
function openImageModal(imageSrc, imageName = 'image') {
    const modal = document.getElementById('imageModal');
    const fullSizeImage = document.getElementById('fullSizeImage');
    const closeBtn = document.getElementById('closeImageModal');

    fullSizeImage.src = imageSrc;
    modal.style.display = 'flex';

    // Add download button to modal
    let downloadBtn = modal.querySelector('.image-download-btn');
    if (!downloadBtn) {
        downloadBtn = document.createElement('button');
        downloadBtn.className = 'image-download-btn';
        downloadBtn.innerHTML = '💾 Скачать';
        downloadBtn.onclick = () => downloadImage(imageSrc, imageName);
        modal.querySelector('.modal-body').appendChild(downloadBtn);
    }

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

// Download Image Function
function downloadImage(imageSrc, imageName = 'image') {
    try {
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = imageSrc;
        link.download = imageName || 'downloaded_image';

        // If it's a data URL, we can download it directly
        if (imageSrc.startsWith('data:')) {
            // Extract file extension from data URL if possible
            const mimeType = imageSrc.split(';')[0].split(':')[1];
            const extension = mimeType.split('/')[1];
            link.download = `image.${extension}`;
        }

        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('Изображение скачано!', 'success');
    } catch (error) {
        console.error('Error downloading image:', error);
        showNotification('Ошибка скачивания изображения', 'error');
    }
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

// Initialize Security Monitoring
function initSecurityMonitoring() {
    // Disabled security monitoring to prevent CSP issues
    console.log('Security monitoring disabled for compatibility');
}

// Start Image Compression Scheduler
function startImageCompressionScheduler() {
    // Run compression check every hour
    setInterval(async () => {
        if (!window.currentUser()) return;

        try {
            const userId = window.currentUser().uid;
            const userChatsRef = window.dbRef(window.database, `userChats/${userId}`);
            const snapshot = await window.get(userChatsRef);
            const userChats = snapshot.val() || {};

            // Compress images in all user chats (excluding global chat)
            const compressionPromises = Object.keys(userChats)
                .filter(chatId => chatId !== 'global_chat')
                .map(chatId => compressOldImages(chatId));

            await Promise.all(compressionPromises);
        } catch (error) {
            console.error('Error in image compression scheduler:', error);
        }
    }, 60 * 60 * 1000); // Every hour

    // Also run immediately on startup
    setTimeout(async () => {
        if (!window.currentUser()) return;

        try {
            const userId = window.currentUser().uid;
            const userChatsRef = window.dbRef(window.database, `userChats/${userId}`);
            const snapshot = await window.get(userChatsRef);
            const userChats = snapshot.val() || {};

            const compressionPromises = Object.keys(userChats)
                .filter(chatId => chatId !== 'global_chat')
                .map(chatId => compressOldImages(chatId));

            await Promise.all(compressionPromises);
        } catch (error) {
            console.error('Error in initial image compression:', error);
        }
    }, 5000); // 5 seconds after startup
}

// Group Chat Functions
function switchToPrivateChat() {
    document.getElementById('createPrivateChatBtn').classList.add('active');
    document.getElementById('createGroupChatBtn').classList.remove('active');
    document.getElementById('privateChatForm').style.display = 'block';
    document.getElementById('groupChatForm').style.display = 'none';
}

function switchToGroupChat() {
    document.getElementById('createGroupChatBtn').classList.add('active');
    document.getElementById('createPrivateChatBtn').classList.remove('active');
    document.getElementById('privateChatForm').style.display = 'none';
    document.getElementById('groupChatForm').style.display = 'block';
    loadAvailableUsers();
}

async function loadAvailableUsers() {
    try {
        const usersRef = window.dbRef(window.database, 'users');
        const snapshot = await window.get(usersRef);
        const usersData = snapshot.val() || {};

        const groupMembersList = document.getElementById('groupMembersList');
        groupMembersList.innerHTML = '';

        // Add current user as first member
        const currentUser = window.currentUser();
        if (currentUser) {
            addMemberToGroupList(currentUser.uid, usersData[currentUser.uid], true);
        }

        // Load other available users
        Object.entries(usersData).forEach(([userId, userData]) => {
            if (userId !== currentUser?.uid) {
                addMemberToGroupList(userId, userData, false);
            }
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function addMemberToGroupList(userId, userData, isOwner = false) {
    const groupMembersList = document.getElementById('groupMembersList');
    const memberItem = document.createElement('div');
    memberItem.className = 'group-member-item';
    memberItem.dataset.userId = userId;

    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiPkDwn5iKPC90ZXh0Pgo8L3N2Zz4=';

    memberItem.innerHTML = `
        <div class="group-member-info">
            <div class="group-member-avatar">
                <img src="${userData?.avatar || defaultAvatar}" alt="Avatar">
            </div>
            <div class="group-member-name">${userData?.displayName || userData?.username || 'Неизвестный'}${isOwner ? ' (Вы)' : ''}</div>
        </div>
        <button class="remove-member-btn" onclick="removeMemberFromGroup('${userId}')" ${isOwner ? 'disabled' : ''}>&times;</button>
    `;

    groupMembersList.appendChild(memberItem);
}

function removeMemberFromGroup(userId) {
    const memberItem = document.querySelector(`[data-user-id="${userId}"]`);
    if (memberItem) {
        memberItem.remove();
    }
}

function addMemberToGroup() {
    const addMemberInput = document.getElementById('addMemberInput');
    const username = addMemberInput.value.trim();
    if (!username) return;

    // Check if user already exists in the list
    const existingMembers = document.querySelectorAll('.group-member-item');
    for (const member of existingMembers) {
        const memberName = member.querySelector('.group-member-name').textContent;
        if (memberName.includes(username) || memberName.includes(`(${username})`)) {
            showNotification('Пользователь уже добавлен', 'warning');
            return;
        }
    }

    // For now, just add as pending member (will be validated when creating group)
    const groupMembersList = document.getElementById('groupMembersList');
    const memberItem = document.createElement('div');
    memberItem.className = 'group-member-item pending-member';
    memberItem.dataset.username = username;

    memberItem.innerHTML = `
        <div class="group-member-info">
            <div class="group-member-avatar">
                <div style="width: 100%; height: 100%; background: var(--border); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px;">?</div>
            </div>
            <div class="group-member-name">${username} (ожидает)</div>
        </div>
        <button class="remove-member-btn" onclick="removePendingMember(this)">&times;</button>
    `;

    groupMembersList.appendChild(memberItem);
    addMemberInput.value = '';
}

function removePendingMember(button) {
    button.closest('.group-member-item').remove();
}

async function createGroupChat() {
    const groupName = document.getElementById('groupNameInput').value.trim();
    if (!groupName) {
        showNotification('Введите название группы', 'error');
        return;
    }

    const memberItems = document.querySelectorAll('.group-member-item');
    if (memberItems.length < 2) {
        showNotification('Группа должна иметь минимум 2 участников', 'error');
        return;
    }

    try {
        showNotification('Создание группы...', 'info');

        const currentUser = window.currentUser();
        let participants = [];
        const pendingMembers = [];

        // Collect participants
        const tempParticipants = [];
        memberItems.forEach(item => {
            if (item.classList.contains('pending-member')) {
                pendingMembers.push(item.dataset.username);
            } else {
                const userId = item.dataset.userId;
                if (userId && typeof userId === 'string' && userId.trim() !== '') {
                    tempParticipants.push(userId);
                }
            }
        });

        // Validate pending members exist
        for (const username of pendingMembers) {
            const userId = await findUserByUsername(username);
            if (userId && typeof userId === 'string') {
                tempParticipants.push(userId);
            } else {
                showNotification(`Пользователь ${username} не найден`, 'error');
                return;
            }
        }

        // Ensure participants array contains valid user IDs (strings) and remove duplicates
        const validParticipants = [...new Set(tempParticipants.filter(id => id && typeof id === 'string' && id.trim() !== ''))];

        // Create group chat
        const groupId = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const groupData = {
            id: groupId,
            name: groupName,
            participants: validParticipants,
            createdAt: Date.now(),
            createdBy: currentUser.uid,
            type: 'group',
            avatar: null
        };

        // Save group data
        await window.set(window.dbRef(window.database, `chats/${groupId}`), groupData);

        // Add to each participant's chat list
        for (const participantId of validParticipants) {
            await window.set(window.dbRef(window.database, `userChats/${participantId}/${groupId}`), true);
        }

        // Open the new group chat
        openChat(groupId);
        closeModal();

        // Reset form
        document.getElementById('groupNameInput').value = '';
        document.getElementById('groupMembersList').innerHTML = '';

        showNotification('Группа создана!', 'success');

    } catch (error) {
        console.error('Error creating group:', error);
        showNotification('Ошибка создания группы', 'error');
    }
}

async function findUserByUsername(username) {
    try {
        const usersRef = window.dbRef(window.database, 'users');
        const snapshot = await window.get(usersRef);
        const usersData = snapshot.val() || {};

        // Case-insensitive search
        const searchUsername = username.toLowerCase().trim();

        for (const [userId, userData] of Object.entries(usersData)) {
            const userUsername = (userData.username || '').toLowerCase();
            const userDisplayName = (userData.displayName || '').toLowerCase();

            if (userUsername === searchUsername || userDisplayName === searchUsername) {
                return userId;
            }
        }
        return null;
    } catch (error) {
        console.error('Error finding user:', error);
        return null;
    }
}

// Group Settings Functions
function openGroupSettings() {
    if (!currentChat || !currentChat.data || currentChat.data.type !== 'group') return;

    currentGroupChat = currentChat;
    loadGroupSettings();
    document.getElementById('groupSettingsModal').style.display = 'flex';
}

async function loadGroupSettings() {
    if (!currentGroupChat) return;

    const groupData = currentGroupChat.data;

    // Load group name
    document.getElementById('editGroupNameInput').value = groupData.name || '';

    // Load group avatar
    const avatarImg = document.getElementById('groupAvatarImg');
    const avatarPlaceholder = document.querySelector('.avatar-placeholder');

    if (groupData.avatar) {
        avatarImg.src = groupData.avatar;
        avatarImg.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
    } else {
        avatarImg.style.display = 'none';
        avatarPlaceholder.style.display = 'flex';
    }

    // Load members
    await loadGroupMembers();

    // Show delete button only for group owner
    const deleteBtn = document.getElementById('deleteGroupBtn');
    if (groupData.createdBy === window.currentUser().uid) {
        deleteBtn.style.display = 'block';
    } else {
        deleteBtn.style.display = 'none';
    }
}

async function loadGroupMembers() {
    if (!currentGroupChat) return;

    const membersList = document.getElementById('manageGroupMembersList');
    membersList.innerHTML = '';

    for (const participantId of currentGroupChat.data.participants) {
        try {
            const userRef = window.dbRef(window.database, `users/${participantId}`);
            const snapshot = await window.get(userRef);
            const userData = snapshot.val();

            if (userData) {
                const memberItem = document.createElement('div');
                memberItem.className = 'group-member-item';

                const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiPkDwn5iKPC90ZXh0Pgo8L3N2Zz4=';

                const isOwner = participantId === currentGroupChat.data.createdBy;
                const isCurrentUser = participantId === window.currentUser().uid;
                const canRemove = !isOwner && currentGroupChat.data.createdBy === window.currentUser().uid && !isCurrentUser;

                memberItem.innerHTML = `
                    <div class="group-member-info">
                        <div class="group-member-avatar">
                            <img src="${userData.avatar || defaultAvatar}" alt="Avatar">
                        </div>
                        <div class="group-member-name">${userData.displayName || userData.username || 'Неизвестный'}${isOwner ? ' 👑' : ''}${isCurrentUser ? ' (Вы)' : ''}</div>
                    </div>
                    ${canRemove ? `<button class="remove-member-btn" onclick="removeMemberFromGroupSettings('${participantId}')">&times;</button>` : ''}
                `;

                membersList.appendChild(memberItem);
            }
        } catch (error) {
            console.error('Error loading member:', error);
        }
    }
}

async function saveGroupName() {
    if (!currentGroupChat) return;

    const newName = document.getElementById('editGroupNameInput').value.trim();
    if (!newName) {
        showNotification('Введите название группы', 'error');
        return;
    }

    if (currentGroupChat.data.createdBy !== window.currentUser().uid) {
        showNotification('Только владелец группы может менять название', 'error');
        return;
    }

    try {
        await window.update(window.dbRef(window.database, `chats/${currentGroupChat.id}`), {
            name: newName
        });

        currentGroupChat.data.name = newName;
        updateChatUI();

        showNotification('Название группы сохранено', 'success');
    } catch (error) {
        console.error('Error saving group name:', error);
        showNotification('Ошибка сохранения названия', 'error');
    }
}

async function changeGroupAvatar() {
    if (!currentGroupChat) return;

    if (currentGroupChat.data.createdBy !== window.currentUser().uid) {
        showNotification('Только владелец группы может менять аватар', 'error');
        return;
    }

    const input = document.getElementById('groupAvatarInput');
    input.click();

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            showNotification('Загрузка аватара...', 'info');

            const base64String = await fileToBase64(file);

            await window.update(window.dbRef(window.database, `chats/${currentGroupChat.id}`), {
                avatar: base64String
            });

            currentGroupChat.data.avatar = base64String;
            updateChatUI();
            loadGroupSettings();

            showNotification('Аватар группы обновлен', 'success');
        } catch (error) {
            console.error('Error changing group avatar:', error);
            showNotification('Ошибка загрузки аватара', 'error');
        }
    };
}

async function addNewMemberToGroup() {
    if (!currentGroupChat) return;

    if (currentGroupChat.data.createdBy !== window.currentUser().uid) {
        showNotification('Только владелец группы может добавлять участников', 'error');
        return;
    }

    const addMemberInput = document.getElementById('addNewMemberInput');
    const username = addMemberInput.value.trim();
    if (!username) return;

    try {
        const userId = await findUserByUsername(username);
        if (!userId) {
            showNotification('Пользователь не найден', 'error');
            return;
        }

        if (currentGroupChat.data.participants.includes(userId)) {
            showNotification('Пользователь уже в группе', 'warning');
            return;
        }

        // Add to participants
        const newParticipants = [...currentGroupChat.data.participants, userId];
        await window.update(window.dbRef(window.database, `chats/${currentGroupChat.id}`), {
            participants: newParticipants
        });

        // Add to user's chat list
        await window.set(window.dbRef(window.database, `userChats/${userId}/${currentGroupChat.id}`), true);

        currentGroupChat.data.participants = newParticipants;
        loadGroupMembers();
        addMemberInput.value = '';

        showNotification('Участник добавлен', 'success');
    } catch (error) {
        console.error('Error adding member:', error);
        showNotification('Ошибка добавления участника', 'error');
    }
}

async function removeMemberFromGroupSettings(userId) {
    if (!currentGroupChat) return;

    if (currentGroupChat.data.createdBy !== window.currentUser().uid) {
        showNotification('Только владелец группы может удалять участников', 'error');
        return;
    }

    try {
        // Remove from participants
        const newParticipants = currentGroupChat.data.participants.filter(id => id !== userId);
        await window.update(window.dbRef(window.database, `chats/${currentGroupChat.id}`), {
            participants: newParticipants
        });

        // Remove from user's chat list
        await window.remove(window.dbRef(window.database, `userChats/${userId}/${currentGroupChat.id}`));

        currentGroupChat.data.participants = newParticipants;
        loadGroupMembers();

        showNotification('Участник удален', 'success');
    } catch (error) {
        console.error('Error removing member:', error);
        showNotification('Ошибка удаления участника', 'error');
    }
}

async function leaveGroup() {
    if (!currentGroupChat) return;

    const confirmLeave = confirm('Вы уверены, что хотите покинуть группу?');
    if (!confirmLeave) return;

    try {
        const currentUserId = window.currentUser().uid;

        // Remove from participants
        const newParticipants = currentGroupChat.data.participants.filter(id => id !== currentUserId);
        await window.update(window.dbRef(window.database, `chats/${currentGroupChat.id}`), {
            participants: newParticipants
        });

        // Remove from user's chat list
        await window.remove(window.dbRef(window.database, `userChats/${currentUserId}/${currentGroupChat.id}`));

        // Close group settings and chat
        closeGroupSettingsModal();
        currentChat = null;
        currentGroupChat = null;
        updateChatUI();

        showNotification('Вы покинули группу', 'success');
    } catch (error) {
        console.error('Error leaving group:', error);
        showNotification('Ошибка выхода из группы', 'error');
    }
}

async function deleteGroup() {
    if (!currentGroupChat) return;

    if (currentGroupChat.data.createdBy !== window.currentUser().uid) {
        showNotification('Только владелец группы может её удалить', 'error');
        return;
    }

    const confirmDelete = confirm('Вы уверены, что хотите удалить группу? Это действие нельзя отменить.');
    if (!confirmDelete) return;

    try {
        // Remove chat from all participants
        for (const participantId of currentGroupChat.data.participants) {
            await window.remove(window.dbRef(window.database, `userChats/${participantId}/${currentGroupChat.id}`));
        }

        // Delete chat data
        await window.remove(window.dbRef(window.database, `chats/${currentGroupChat.id}`));

        // Delete messages
        await window.remove(window.dbRef(window.database, `messages/${currentGroupChat.id}`));

        // Close modal and chat
        closeGroupSettingsModal();
        currentChat = null;
        currentGroupChat = null;
        updateChatUI();
        renderChatsList();

        showNotification('Группа удалена', 'success');
    } catch (error) {
        console.error('Error deleting group:', error);
        showNotification('Ошибка удаления группы', 'error');
    }
}

function closeGroupSettingsModal() {
    document.getElementById('groupSettingsModal').style.display = 'none';
    currentGroupChat = null;
}

// Update chat rendering for groups
function updateChatItemForGroup(chatId, chatData) {
    const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
    if (!chatItem) return;

    if (chatData.type === 'group') {
        chatItem.classList.add('group-chat-item');

        const chatName = chatData.name || 'Групповой чат';
        const membersCount = chatData.participants?.length || 0;

        chatItem.querySelector('.chat-name').textContent = chatName;
        chatItem.querySelector('.chat-last-message').innerHTML = `
            ${chatData.lastMessage ? formatLastMessage(chatData.lastMessage) : 'Нет сообщений'}
            <div class="group-members-count">${membersCount} участников</div>
        `;
    }
}

// Export functions
window.initChat = initChat;
window.openImageModal = openImageModal;
window.replyToMessage = replyToMessage;
window.cancelReply = cancelReply;
window.switchToPrivateChat = switchToPrivateChat;
window.switchToGroupChat = switchToGroupChat;
window.addMemberToGroup = addMemberToGroup;
window.removePendingMember = removePendingMember;
window.createGroupChat = createGroupChat;
window.openGroupSettings = openGroupSettings;
window.saveGroupName = saveGroupName;
window.changeGroupAvatar = changeGroupAvatar;
window.addNewMemberToGroup = addNewMemberToGroup;
window.removeMemberFromGroupSettings = removeMemberFromGroupSettings;
window.leaveGroup = leaveGroup;
window.deleteGroup = deleteGroup;
window.closeGroupSettingsModal = closeGroupSettingsModal;