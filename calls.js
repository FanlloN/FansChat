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
    loadAvailableDevices();
}

// Setup event listeners for call controls
function setupCallEventListeners() {
    // Call button in chat header
    const callBtn = document.getElementById('callBtn');
    if (callBtn) {
        callBtn.addEventListener('click', startCall);
    }

    // Call modal controls
    if (cameraBtn) cameraBtn.addEventListener('click', toggleCamera);
    if (micBtn) micBtn.addEventListener('click', toggleMicrophone);
    if (screenShareBtn) screenShareBtn.addEventListener('click', toggleScreenShare);
    if (hangupBtn) hangupBtn.addEventListener('click', endCall);
    if (closeCallBtn) closeCallBtn.addEventListener('click', endCall);

    // Device selection
    if (cameraSelect) cameraSelect.addEventListener('change', switchCamera);
    if (micSelect) micSelect.addEventListener('change', switchMicrophone);

    // Close modal on outside click
    if (callModal) {
        callModal.addEventListener('click', (e) => {
            if (e.target === callModal) endCall();
        });
    }
}

// Load available camera and microphone devices
async function loadAvailableDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();

        // Clear existing options
        if (cameraSelect) cameraSelect.innerHTML = '<option value="">Выберите камеру</option>';
        if (micSelect) micSelect.innerHTML = '<option value="">Выберите микрофон</option>';

        // Populate camera options
        devices.filter(device => device.kind === 'videoinput').forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Камера ${device.deviceId.slice(0, 8)}`;
            if (cameraSelect) cameraSelect.appendChild(option);
        });

        // Populate microphone options
        devices.filter(device => device.kind === 'audioinput').forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Микрофон ${device.deviceId.slice(0, 8)}`;
            if (micSelect) micSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading devices:', error);
    }
}

// Start a call
async function startCall() {
    if (!currentChat) {
        showNotification('Выберите чат для звонка', 'error');
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
        // Get user media
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        // Set local video
        localVideo.srcObject = localStream;
        callPlaceholder.style.display = 'none';
        localVideo.style.display = 'block';

        // Initialize controls state
        cameraBtn.classList.add('active');
        cameraBtn.innerHTML = '<span class="control-icon">📹</span>';
        cameraSelect.style.display = 'block';

        micBtn.classList.remove('muted');
        micBtn.innerHTML = '<span class="control-icon">🎤</span>';
        micSelect.style.display = 'block';

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
    window.push(signalsRef, signalData);
}

// Listen for call signals
function listenForCallSignals() {
    if (!currentChat) return;

    const signalsRef = window.dbRef(window.database, `callSignals/${currentChat.id}`);
    window.onValue(signalsRef, (snapshot) => {
        const signals = snapshot.val();
        if (!signals) return;

        Object.values(signals).forEach(signal => {
            if (signal.sender === window.currentUser().uid) return; // Ignore own signals

            handleCallSignal(signal);
        });
    });
}

// Handle incoming call signals
async function handleCallSignal(signal) {
    try {
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
        // Initialize local media
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        localVideo.srcObject = localStream;
        callPlaceholder.style.display = 'none';
        localVideo.style.display = 'block';

        // Initialize controls state
        cameraBtn.classList.add('active');
        cameraBtn.innerHTML = '<span class="control-icon">📹</span>';
        cameraSelect.style.display = 'block';

        micBtn.classList.remove('muted');
        micBtn.innerHTML = '<span class="control-icon">🎤</span>';
        micSelect.style.display = 'block';

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

// Toggle camera on/off
async function toggleCamera() {
    if (!localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        cameraBtn.classList.toggle('active', videoTrack.enabled);

        if (videoTrack.enabled) {
            cameraBtn.innerHTML = '<span class="control-icon">📹</span>';
            // Show device selector
            cameraSelect.style.display = 'block';
        } else {
            cameraBtn.innerHTML = '<span class="control-icon">📷</span>';
            // Hide device selector
            cameraSelect.style.display = 'none';
        }
    }
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
            // Show device selector
            micSelect.style.display = 'block';
        } else {
            micBtn.innerHTML = '<span class="control-icon">🔇</span>';
            // Hide device selector
            micSelect.style.display = 'none';
        }
    }
}

// Toggle screen sharing
async function toggleScreenShare() {
    try {
        if (!localStream) return;

        const screenTrack = localStream.getVideoTracks().find(track => track.label.includes('screen'));
        if (screenTrack) {
            // Stop screen sharing
            screenTrack.stop();
            // Switch back to camera
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const cameraTrack = cameraStream.getVideoTracks()[0];
            const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
            if (sender) {
                await sender.replaceTrack(cameraTrack);
            }
            localStream.removeTrack(screenTrack);
            localStream.addTrack(cameraTrack);
            localVideo.srcObject = localStream;
            screenShareBtn.classList.remove('active');
            screenShareBtn.innerHTML = '<span class="control-icon">🖥️</span>';
        } else {
            // Start screen sharing
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenVideoTrack = screenStream.getVideoTracks()[0];
            const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
            if (sender) {
                await sender.replaceTrack(screenVideoTrack);
            }
            localStream.getVideoTracks()[0].stop();
            localStream.removeTrack(localStream.getVideoTracks()[0]);
            localStream.addTrack(screenVideoTrack);
            localVideo.srcObject = localStream;
            screenShareBtn.classList.add('active');
            screenShareBtn.innerHTML = '<span class="control-icon">🖥️</span>';

            // Handle screen sharing stop
            screenVideoTrack.onended = () => {
                toggleScreenShare();
            };
        }
    } catch (error) {
        console.error('Error toggling screen share:', error);
        showNotification('Ошибка демонстрации экрана', 'error');
    }
}

// Switch camera device
async function switchCamera() {
    if (!cameraSelect.value || !localStream) return;

    try {
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: cameraSelect.value } },
            audio: false
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
        if (sender) {
            await sender.replaceTrack(newVideoTrack);
        }

        localStream.getVideoTracks()[0].stop();
        localStream.removeTrack(localStream.getVideoTracks()[0]);
        localStream.addTrack(newVideoTrack);
        localVideo.srcObject = localStream;

    } catch (error) {
        console.error('Error switching camera:', error);
        showNotification('Ошибка переключения камеры', 'error');
    }
}

// Switch microphone device
async function switchMicrophone() {
    if (!micSelect.value || !localStream) return;

    try {
        const newStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: { deviceId: { exact: micSelect.value } }
        });

        const newAudioTrack = newStream.getAudioTracks()[0];
        const sender = peerConnection.getSenders().find(s => s.track.kind === 'audio');
        if (sender) {
            await sender.replaceTrack(newAudioTrack);
        }

        localStream.getAudioTracks()[0].stop();
        localStream.removeTrack(localStream.getAudioTracks()[0]);
        localStream.addTrack(newAudioTrack);

    } catch (error) {
        console.error('Error switching microphone:', error);
        showNotification('Ошибка переключения микрофона', 'error');
    }
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
    if (cameraBtn) {
        cameraBtn.classList.remove('active');
        cameraBtn.innerHTML = '<span class="control-icon">📹</span>';
        cameraSelect.style.display = 'none';
    }
    if (micBtn) {
        micBtn.classList.remove('muted');
        micBtn.innerHTML = '<span class="control-icon">🎤</span>';
        micSelect.style.display = 'none';
    }
    if (screenShareBtn) {
        screenShareBtn.classList.remove('active');
        screenShareBtn.innerHTML = '<span class="control-icon">🖥️</span>';
    }

    currentCall = null;
}

// Export functions
window.initCalls = initCalls;
window.startCall = startCall;
window.endCall = endCall;
window.listenForCallSignals = listenForCallSignals;