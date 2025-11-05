// Call Module - WebRTC Video Calls
let currentCall = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let callTimeout = null;

// WebRTC Configuration
const rtcConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// DOM Elements
const callModal = document.getElementById('callModal');
const callName = document.getElementById('callName');
const callStatus = document.getElementById('callStatus');
const callAvatar = document.getElementById('callAvatar');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callPlaceholder = document.getElementById('callPlaceholder');

// Control buttons
const cameraBtn = document.getElementById('cameraBtn');
const micBtn = document.getElementById('micBtn');
const screenShareBtn = document.getElementById('screenShareBtn');
const hangupBtn = document.getElementById('hangupBtn');
const closeCallBtn = document.getElementById('closeCallBtn');

// Device selects
const cameraSelect = document.getElementById('cameraSelect');
const micSelect = document.getElementById('micSelect');

// Initialize call functionality
function initCalls() {
    setupCallEventListeners();
    // loadAvailableDevices(); // Disabled to prevent hangs
}

// Setup event listeners for call controls
function setupCallEventListeners() {
    // Call button in chat header
    const callBtn = document.getElementById('callBtn');
    if (callBtn) {
        callBtn.addEventListener('click', startCall);
    }

    // Call modal controls (simplified)
    if (micBtn) micBtn.addEventListener('click', toggleMicrophone);
    if (hangupBtn) hangupBtn.addEventListener('click', endCall);
    if (closeCallBtn) closeCallBtn.addEventListener('click', endCall);

    // Close modal on outside click
    if (callModal) {
        callModal.addEventListener('click', (e) => {
            if (e.target === callModal) endCall();
        });
    }

    // Handle page unload to end calls
    window.addEventListener('beforeunload', () => {
        if (currentCall) {
            endCall();
        }
    });

    // Handle visibility change (when user switches tabs or minimizes)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && currentCall) {
            // Optional: could show notification or auto-end call
        }
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
        if (currentCall) {
            showNotification('Соединение восстановлено', 'success');
        }
    });

    window.addEventListener('offline', () => {
        if (currentCall) {
            endCall();
            showNotification('Звонок завершен из-за потери соединения', 'error');
        }
    });
}

// Load available devices (simplified for now)
async function loadAvailableDevices() {
    // Device loading disabled for now to prevent hangs
    return;
}

// Start a call
async function startCall() {
    if (!currentChat) {
        showNotification('Выберите чат для звонка', 'error');
        return;
    }

    if (currentCall) {
        showNotification('У вас уже есть активный звонок', 'warning');
        return;
    }

    try {
        // Get user info for the call
        const otherParticipantId = currentChat.data.participants.find(id => id !== window.currentUser().uid);
        const otherParticipant = users.get(otherParticipantId);

        if (!otherParticipant) {
            showNotification('Не удалось найти информацию о пользователе', 'error');
            return;
        }

        // Check if user is online (optional)
        if (!otherParticipant.online) {
            showNotification('Пользователь не в сети', 'warning');
            return;
        }

        // Update call UI
        callName.textContent = otherParticipant.displayName ?
            `${otherParticipant.displayName} (${otherParticipant.username})` :
            otherParticipant.username;
        callStatus.textContent = 'Звонок...';
        callAvatar.src = otherParticipant.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiPkDwn5iKPC90ZXh0Pgo8L3N2Zz4=';

        // Show call modal
        callModal.style.display = 'flex';

        // Initialize WebRTC
        await initializeCall();

        // Set call timeout (30 seconds)
        callTimeout = setTimeout(() => {
            if (currentCall && currentCall.status === 'calling') {
                endCall();
                showNotification('Звонок не был принят', 'info');
            }
        }, 30000);

    } catch (error) {
        console.error('Error starting call:', error);
        showNotification('Ошибка при начале звонка', 'error');
        endCall();
    }
}

// Initialize WebRTC call
async function initializeCall() {
    try {
        // Get user media (audio only for now)
        localStream = await navigator.mediaDevices.getUserMedia({
            video: false, // Disabled for now
            audio: true
        });

        // Set local video (placeholder for now)
        callPlaceholder.style.display = 'flex';
        localVideo.style.display = 'none';

        // Initialize controls state (simplified)
        cameraBtn.style.display = 'none'; // Hide camera controls
        micBtn.classList.remove('muted');
        micBtn.innerHTML = '<span class="control-icon">🎤</span>';
        micSelect.style.display = 'none'; // Hide mic selector for now
        screenShareBtn.style.display = 'none'; // Hide screen share

        // Create peer connection
        peerConnection = new RTCPeerConnection(rtcConfiguration);

        // Add local stream to peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                remoteStream = event.streams[0];
                remoteVideo.srcObject = remoteStream;
                remoteVideo.style.display = 'block';
                callPlaceholder.style.display = 'none';
            }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                // Send ICE candidate to remote peer via Firebase
                sendCallSignal('ice-candidate', {
                    candidate: event.candidate,
                    chatId: currentChat.id
                });
            }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', peerConnection.connectionState);
            updateCallStatus(peerConnection.connectionState);

            // Auto-end call if connection fails
            if (peerConnection.connectionState === 'failed' ||
                peerConnection.connectionState === 'disconnected' ||
                peerConnection.connectionState === 'closed') {
                setTimeout(() => {
                    if (currentCall) {
                        endCall();
                        showNotification('Звонок завершен из-за проблем с соединением', 'info');
                    }
                }, 2000); // Give 2 seconds for potential recovery
            }
        };

        // Create offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Send offer to remote peer
        sendCallSignal('offer', {
            offer: offer,
            chatId: currentChat.id
        });

        currentCall = {
            status: 'calling',
            startTime: Date.now(),
            chatId: currentChat.id
        };

    } catch (error) {
        console.error('Error initializing call:', error);
        throw error;
    }
}

// Send call signaling data via Firebase
function sendCallSignal(type, data) {
    const signalData = {
        type: type,
        data: data,
        sender: window.currentUser().uid,
        timestamp: Date.now()
    };

    // Store in Firebase for the specific chat
    const signalsRef = window.dbRef(window.database, `callSignals/${currentChat.id}`);
    const newSignalRef = window.push(signalsRef);
    window.set(newSignalRef, signalData);
}

// Listen for call signals
function listenForCallSignals() {
    if (!currentChat) return;

    const signalsRef = window.dbRef(window.database, `callSignals/${currentChat.id}`);
    window.onValue(signalsRef, (snapshot) => {
        const signals = snapshot.val();
        if (!signals) return;

        // Process signals in chronological order
        const signalList = Object.values(signals).sort((a, b) => a.timestamp - b.timestamp);

        signalList.forEach(signal => {
            if (signal.sender === window.currentUser().uid) return; // Ignore own signals

            handleCallSignal(signal);
        });
    });
}

// Handle incoming call signals
async function handleCallSignal(signal) {
    try {
        // Prevent duplicate processing
        if (signal.processed) return;
        signal.processed = true;

        switch (signal.type) {
            case 'offer':
                await handleOffer(signal.data);
                break;
            case 'answer':
                await handleAnswer(signal.data);
                break;
            case 'ice-candidate':
                await handleIceCandidate(signal.data);
                break;
            case 'hangup':
                handleHangup(signal.data);
                break;
        }
    } catch (error) {
        console.error('Error handling call signal:', error);
    }
}

// Handle incoming offer
async function handleOffer(data) {
    if (currentCall) return; // Already in a call

    // Show incoming call UI
    showIncomingCall(data);
}

// Handle incoming answer
async function handleAnswer(data) {
    if (!peerConnection) return;

    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        currentCall.status = 'connected';
        callStatus.textContent = 'Звонок подключен';
        clearTimeout(callTimeout);
    } catch (error) {
        console.error('Error handling answer:', error);
    }
}

// Handle ICE candidate
async function handleIceCandidate(data) {
    if (!peerConnection) return;

    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
        console.error('Error handling ICE candidate:', error);
    }
}

// Handle hangup
function handleHangup(data) {
    endCall();
    showNotification('Звонок завершен', 'info');
}

// Show incoming call notification
function showIncomingCall(data) {
    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Входящий звонок', {
            body: 'Нажмите для ответа',
            icon: '/favicon.ico'
        });
    }

    // For now, auto-accept the call (can be enhanced with accept/decline buttons)
    acceptCall(data);
}

// Accept incoming call
async function acceptCall(data) {
    try {
        // Initialize local media (audio only for now)
        localStream = await navigator.mediaDevices.getUserMedia({
            video: false, // Disabled for now
            audio: true
        });

        // No video for now, just audio
        callPlaceholder.style.display = 'flex';
        localVideo.style.display = 'none';

        // Initialize controls state (simplified)
        cameraBtn.style.display = 'none'; // Hide camera controls
        micBtn.classList.remove('muted');
        micBtn.innerHTML = '<span class="control-icon">🎤</span>';
        micSelect.style.display = 'none'; // Hide mic selector for now
        screenShareBtn.style.display = 'none'; // Hide screen share

        // Create peer connection
        peerConnection = new RTCPeerConnection(rtcConfiguration);

        // Add local stream
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                remoteStream = event.streams[0];
                remoteVideo.srcObject = remoteStream;
                remoteVideo.style.display = 'block';
            }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                sendCallSignal('ice-candidate', {
                    candidate: event.candidate,
                    chatId: data.chatId
                });
            }
        };

        // Set remote description
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

        // Create answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Send answer
        sendCallSignal('answer', {
            answer: answer,
            chatId: data.chatId
        });

        // Show call UI
        const otherParticipantId = currentChat.data.participants.find(id => id !== window.currentUser().uid);
        const otherParticipant = users.get(otherParticipantId);

        callName.textContent = otherParticipant.displayName ?
            `${otherParticipant.displayName} (${otherParticipant.username})` :
            otherParticipant.username;
        callStatus.textContent = 'Звонок подключен';
        callAvatar.src = otherParticipant.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiPkDwn5iKPC90ZXh0Pgo8L3N2Zz4=';

        callModal.style.display = 'flex';

        currentCall = {
            status: 'connected',
            startTime: Date.now(),
            chatId: data.chatId
        };

    } catch (error) {
        console.error('Error accepting call:', error);
        endCall();
    }
}

// Toggle camera on/off (disabled for now)
async function toggleCamera() {
    // Camera functionality disabled
    return;
}

// Toggle microphone on/off
async function toggleMicrophone() {
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        micBtn.classList.toggle('muted', !audioTrack.enabled);

        if (audioTrack.enabled) {
            micBtn.innerHTML = '<span class="control-icon">🎤</span>';
        } else {
            micBtn.innerHTML = '<span class="control-icon">🔇</span>';
        }
    }
}

// Toggle screen sharing (disabled for now)
async function toggleScreenShare() {
    // Screen sharing functionality disabled
    return;
}

// Switch camera device (disabled for now)
async function switchCamera() {
    // Camera switching disabled
    return;
}

// Switch microphone device (disabled for now)
async function switchMicrophone() {
    // Microphone switching disabled
    return;
}

// Update call status display
function updateCallStatus(state) {
    switch (state) {
        case 'connected':
            callStatus.textContent = 'Звонок подключен';
            break;
        case 'connecting':
            callStatus.textContent = 'Подключение...';
            break;
        case 'disconnected':
            callStatus.textContent = 'Звонок завершен';
            break;
        case 'failed':
            callStatus.textContent = 'Ошибка подключения';
            break;
        default:
            callStatus.textContent = 'Звонок...';
    }
}

// End call
function endCall() {
    // Clear timeout
    if (callTimeout) {
        clearTimeout(callTimeout);
        callTimeout = null;
    }

    // Send hangup signal
    if (currentCall) {
        sendCallSignal('hangup', {
            chatId: currentCall.chatId
        });

        // Clean up call signals in Firebase after a delay
        setTimeout(() => {
            cleanupCallSignals(currentCall.chatId);
        }, 5000); // Clean up after 5 seconds
    }

    // Close peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    // Stop local stream
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    // Stop remote stream
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }

    // Hide call modal
    callModal.style.display = 'none';

    // Reset UI
    localVideo.style.display = 'none';
    remoteVideo.style.display = 'none';
    callPlaceholder.style.display = 'flex';

    // Reset control buttons
    if (micBtn) {
        micBtn.classList.remove('muted');
        micBtn.innerHTML = '<span class="control-icon">🎤</span>';
    }

    currentCall = null;
}

// Clean up old call signals from Firebase
function cleanupCallSignals(chatId) {
    try {
        const signalsRef = window.dbRef(window.database, `callSignals/${chatId}`);
        const cutoffTime = Date.now() - (10 * 60 * 1000); // 10 minutes ago

        // Get all signals and remove old ones
        window.get(signalsRef).then((snapshot) => {
            const signals = snapshot.val();
            if (signals) {
                const deletePromises = [];
                Object.entries(signals).forEach(([signalId, signalData]) => {
                    if (signalData.timestamp < cutoffTime) {
                        deletePromises.push(
                            window.remove(window.dbRef(window.database, `callSignals/${chatId}/${signalId}`))
                        );
                    }
                });

                if (deletePromises.length > 0) {
                    Promise.all(deletePromises).then(() => {
                        console.log(`Cleaned up ${deletePromises.length} old call signals`);
                    }).catch(error => {
                        console.error('Error cleaning up call signals:', error);
                    });
                }
            }
        }).catch(error => {
            console.error('Error getting call signals for cleanup:', error);
        });
    } catch (error) {
        console.error('Error in cleanupCallSignals:', error);
    }
}

// Manual cleanup function for Firebase (call this from console if needed)
function cleanupAllCallSignals() {
    console.log('Starting manual cleanup of all call signals...');

    try {
        // Get all chats
        const userId = window.currentUser().uid;
        const userChatsRef = window.dbRef(window.database, `userChats/${userId}`);

        window.get(userChatsRef).then((snapshot) => {
            const userChats = snapshot.val();
            if (userChats) {
                const chatIds = Object.keys(userChats).filter(id => id !== 'global_chat');

                chatIds.forEach(chatId => {
                    const signalsRef = window.dbRef(window.database, `callSignals/${chatId}`);
                    window.remove(signalsRef).then(() => {
                        console.log(`Cleaned up signals for chat: ${chatId}`);
                    }).catch(error => {
                        console.error(`Error cleaning up chat ${chatId}:`, error);
                    });
                });
            }
        }).catch(error => {
            console.error('Error getting user chats for cleanup:', error);
        });
    } catch (error) {
        console.error('Error in cleanupAllCallSignals:', error);
    }
}

// Make function available globally
window.cleanupAllCallSignals = cleanupAllCallSignals;

// Export functions
window.initCalls = initCalls;
window.startCall = startCall;
window.endCall = endCall;
window.listenForCallSignals = listenForCallSignals;