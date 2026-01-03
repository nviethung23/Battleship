// WebRTC functionality for voice/video call in Battle Screen

let localStream = null;
let remoteStream = null;
let peerConnection = null;
let isCallActive = false;
let isVideoEnabled = true;
let isAudioEnabled = true;
let currentCallId = null;
let pendingOffer = null; // Store offer until user accepts
let isWaitingForAnswer = false; // Track if we're waiting for answer
let pendingIceCandidates = []; // Queue ICE candidates until remote description is set
let hasAcceptedCall = false; // Track if user has accepted but waiting for offer

// Helper to get socket instance
function getSocket() {
    return window.socket || (typeof SocketShared !== 'undefined' ? SocketShared.getSocket() : null);
}

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        {
            urls: [
                'turn:turn.your-domain.com:3478?transport=udp',
                'turn:turn.your-domain.com:3478?transport=tcp',
                'turns:turn.your-domain.com:5349?transport=tcp'
            ],
            username: 'TURN_USERNAME',
            credential: 'TURN_PASSWORD'
        }
    ]
};

async function requestMediaStream() {
    const preferredConstraints = {
        video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
        },
        audio: true
    };

    try {
        return await navigator.mediaDevices.getUserMedia(preferredConstraints);
    } catch (error) {
        console.warn('[WebRTC] Preferred constraints failed, retrying with default video:', error);
        return navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }
}

async function attachStreamToVideo(videoEl, stream, options = {}) {
    if (!videoEl || !stream) return;

    videoEl.srcObject = stream;
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.muted = Boolean(options.muted);

    try {
        await videoEl.play();
    } catch (error) {
        console.warn('[WebRTC] Video play blocked:', error);
    }
}

function getRemoteStreamFromTrackEvent(event) {
    if (event && Array.isArray(event.streams) && event.streams[0]) {
        return event.streams[0];
    }

    if (!remoteStream) {
        remoteStream = new MediaStream();
    }

    if (event && event.track) {
        remoteStream.addTrack(event.track);
    }

    return remoteStream;
}

document.addEventListener('DOMContentLoaded', () => {
    initWebRTCUI();
    initWebRTCSocketListeners();
});

function initWebRTCUI() {
    // Battle screen call buttons
    const startCallBtn = document.getElementById('battleStartCallBtn');
    const endCallBtn = document.getElementById('battleEndCallBtn');
    const toggleVideoBtn = document.getElementById('battleToggleVideoBtn');
    const toggleAudioBtn = document.getElementById('battleToggleAudioBtn');

    if (startCallBtn) {
        startCallBtn.addEventListener('click', () => {
            startCall();
        });
    }

    if (endCallBtn) {
        endCallBtn.addEventListener('click', () => {
            endCall();
        });
    }

    if (toggleVideoBtn) {
        toggleVideoBtn.addEventListener('click', () => {
            toggleVideo();
        });
    }

    if (toggleAudioBtn) {
        toggleAudioBtn.addEventListener('click', () => {
            toggleAudio();
        });
    }

    // Legacy buttons (if exists)
    const legacyStartBtn = document.getElementById('startCallBtn');
    const legacyEndBtn = document.getElementById('endCallBtn');
    const legacyVideoBtn = document.getElementById('toggleVideoBtn');
    const legacyAudioBtn = document.getElementById('toggleAudioBtn');

    if (legacyStartBtn) {
        legacyStartBtn.addEventListener('click', () => startCall());
    }
    if (legacyEndBtn) {
        legacyEndBtn.addEventListener('click', () => endCall());
    }
    if (legacyVideoBtn) {
        legacyVideoBtn.addEventListener('click', () => toggleVideo());
    }
    if (legacyAudioBtn) {
        legacyAudioBtn.addEventListener('click', () => toggleAudio());
    }
}

function initWebRTCSocketListeners() {
    // Socket listeners are now handled by game.js which calls window.handleXXX functions
    // This prevents duplicate event handlers
    console.log('[WebRTC] Socket listeners will be handled by game.js');
}

// Legacy function - kept for compatibility but not used
function setupWebRTCSocketEvents() {
    // Do nothing - game.js handles all socket events
    console.log('[WebRTC] setupWebRTCSocketEvents called but game.js handles events');
}

async function startCall() {
    const roomId = getCurrentRoomId();
    const socket = getSocket();
    
    if (!socket || !roomId) {
        showNotification('Chưa trong phòng chơi', 'error');
        return;
    }

    // If already in a call, don't start another
    if (isCallActive || isWaitingForAnswer) {
        showNotification('Đang trong cuộc gọi', 'warning');
        return;
    }

    // Check if WebRTC is supported (requires HTTPS or localhost)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification('⚠️ Video call yêu cầu HTTPS. Vui lòng sử dụng localhost hoặc HTTPS để bật tính năng này.', 'error');
        console.error('[WebRTC] navigator.mediaDevices not available. HTTPS required for WebRTC.');
        return;
    }

    try {
        showNotification('Đang kết nối camera/mic...', 'info');

        // Get local media
        localStream = await requestMediaStream();

        // Display local video (preview)
        const localVideo = document.getElementById('battleLocalVideo') || document.getElementById('localVideo');
        await attachStreamToVideo(localVideo, localStream, { muted: true });

        // Send call request FIRST - wait for acceptance before creating offer
        socket.emit('call_request', {
            roomId: roomId,
            userId: getCurrentUserId(),
            username: getCurrentUsername(),
            callType: 'video'
        });

        isWaitingForAnswer = true;
        showNotification('Đang gọi... Chờ đối phương chấp nhận', 'info');
        updateCallButtons();

    } catch (error) {
        console.error('[WebRTC] Error starting call:', error);
        
        if (error.name === 'NotAllowedError') {
            showNotification('Vui lòng cho phép truy cập camera và microphone', 'error');
        } else if (error.name === 'NotFoundError') {
            showNotification('Không tìm thấy camera hoặc microphone', 'error');
        } else {
            showNotification('Không thể bắt đầu cuộc gọi', 'error');
        }
        cleanupCall();
    }
}

// Called when remote user accepts our call request
async function initiateWebRTCConnection() {
    const roomId = getCurrentRoomId();
    const socket = getSocket();
    
    if (!socket || !localStream) {
        console.error('[WebRTC] Cannot initiate - no socket or stream');
        return;
    }

    console.log('[WebRTC CALLER] Starting WebRTC connection...');
    console.log('[WebRTC CALLER] Local stream tracks:', localStream.getTracks().length);

    try {
        // Cleanup existing peer connection if any to avoid SDP conflicts
        if (peerConnection) {
            console.log('[WebRTC CALLER] Cleaning up existing peer connection before creating new one');
            peerConnection.close();
            peerConnection = null;
        }
        
        // Create peer connection
        peerConnection = new RTCPeerConnection(configuration);
        console.log('[WebRTC CALLER] PeerConnection created');

        // Add local stream to peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
            console.log('[WebRTC CALLER] Added track:', track.kind);
        });

        // Handle ICE candidates
        let iceCandidateCount = 0;
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                iceCandidateCount++;
                console.log('[WebRTC CALLER] onicecandidate fired #' + iceCandidateCount);
                const sock = getSocket();
                if (sock) {
                    sock.emit('webrtc_ice_candidate', {
                        roomId: roomId,
                        candidate: event.candidate
                    });
                }
            } else {
                console.log('[WebRTC CALLER] ICE gathering complete, total candidates:', iceCandidateCount);
            }
        };

        // Handle remote stream
        peerConnection.ontrack = async (event) => {
            console.log('[WebRTC CALLER] ontrack fired! Remote stream received');
            console.log('[WebRTC CALLER] Remote tracks:', event.streams[0]?.getTracks().length);
            remoteStream = getRemoteStreamFromTrackEvent(event);
            const remoteVideo = document.getElementById('battleRemoteVideo') || document.getElementById('remoteVideo');
            await attachStreamToVideo(remoteVideo, remoteStream);
            console.log('[WebRTC CALLER] Remote video element updated');
        };

        // Connection state changes
        peerConnection.onconnectionstatechange = () => {
            console.log('[WebRTC CALLER] connectionState:', peerConnection.connectionState);
            if (peerConnection.connectionState === 'failed') {
                showNotification('Kết nối thất bại', 'error');
                endCall();
            }
        };
        
        peerConnection.oniceconnectionstatechange = () => {
            console.log('[WebRTC CALLER] iceConnectionState:', peerConnection.iceConnectionState);
        };
        
        peerConnection.onsignalingstatechange = () => {
            console.log('[WebRTC CALLER] signalingState:', peerConnection.signalingState);
        };

        // Create offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log('[WebRTC CALLER] Local description set (offer)');
        console.log('[WebRTC CALLER] signalingState after setLocalDescription:', peerConnection.signalingState);

        // Send offer to peer
        socket.emit('webrtc_offer', {
            roomId: roomId,
            offer: offer
        });
        console.log('[WebRTC CALLER] Offer SENT to server');

        isCallActive = true;
        isWaitingForAnswer = false;
        updateCallButtons();

        console.log('[WebRTC CALLER] Waiting for answer...');

    } catch (error) {
        console.error('[WebRTC CALLER] Error creating offer:', error);
        showNotification('Lỗi kết nối', 'error');
        cleanupCall();
    }
}

async function handleWebRTCOffer(data) {
    console.log('[WebRTC] Received offer, storing for when call is accepted');
    
    // Store the offer
    pendingOffer = data;
    
    // If user has already accepted call, process immediately
    if (hasAcceptedCall) {
        console.log('[WebRTC] User already accepted, processing offer now');
        await processAcceptedCall();
    }
}

// Process the stored offer after user accepts call
async function processAcceptedCall() {
    if (!pendingOffer) {
        console.error('[WebRTC CALLEE] No pending offer to process');
        return;
    }
    
    console.log('[WebRTC CALLEE] Processing accepted call...');
    
    // Reset the accepted flag since we're processing now
    hasAcceptedCall = false;
    
    const roomId = getCurrentRoomId();
    const data = pendingOffer;
    pendingOffer = null;
    
    try {
        // Get local media if not already
        if (!localStream) {
            localStream = await requestMediaStream();
            console.log('[WebRTC CALLEE] Got local stream, tracks:', localStream.getTracks().length);

            const localVideo = document.getElementById('battleLocalVideo') || document.getElementById('localVideo');
            await attachStreamToVideo(localVideo, localStream, { muted: true });
        }

        // Create peer connection if not already
        if (!peerConnection) {
            peerConnection = new RTCPeerConnection(configuration);
            console.log('[WebRTC CALLEE] PeerConnection created');

            // Add local stream
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
                console.log('[WebRTC CALLEE] Added track:', track.kind);
            });

            // Handle ICE candidates
            let iceCandidateCount = 0;
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    iceCandidateCount++;
                    console.log('[WebRTC CALLEE] onicecandidate fired #' + iceCandidateCount);
                    const sock = getSocket();
                    if (sock) {
                        sock.emit('webrtc_ice_candidate', {
                            roomId: roomId,
                            candidate: event.candidate
                        });
                    }
                } else {
                    console.log('[WebRTC CALLEE] ICE gathering complete, total candidates:', iceCandidateCount);
                }
            };

            // Handle remote stream
            peerConnection.ontrack = async (event) => {
                console.log('[WebRTC CALLEE] ontrack fired! Remote stream received');
                console.log('[WebRTC CALLEE] Remote tracks:', event.streams[0]?.getTracks().length);
                remoteStream = getRemoteStreamFromTrackEvent(event);
                const remoteVideo = document.getElementById('battleRemoteVideo') || document.getElementById('remoteVideo');
                await attachStreamToVideo(remoteVideo, remoteStream);
                console.log('[WebRTC CALLEE] Remote video element updated');
            };
            
            // Connection state changes
            peerConnection.onconnectionstatechange = () => {
                console.log('[WebRTC CALLEE] connectionState:', peerConnection.connectionState);
                if (peerConnection.connectionState === 'failed') {
                    showNotification('Kết nối thất bại', 'error');
                    endCall();
                }
            };
            
            peerConnection.oniceconnectionstatechange = () => {
                console.log('[WebRTC CALLEE] iceConnectionState:', peerConnection.iceConnectionState);
            };
            
            peerConnection.onsignalingstatechange = () => {
                console.log('[WebRTC CALLEE] signalingState:', peerConnection.signalingState);
            };
        }

        // Set remote description (offer)
        console.log('[WebRTC CALLEE] Setting remote description (offer)...');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        console.log('[WebRTC CALLEE] Remote description SET');
        console.log('[WebRTC CALLEE] signalingState after setRemoteDescription:', peerConnection.signalingState);
        
        // Process any queued ICE candidates now that remote description is set
        console.log('[WebRTC CALLEE] Processing', pendingIceCandidates.length, 'queued ICE candidates');
        await processPendingIceCandidates();

        // Create answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        console.log('[WebRTC CALLEE] Local description set (answer)');
        console.log('[WebRTC CALLEE] signalingState after setLocalDescription:', peerConnection.signalingState);

        // Send answer
        const socket = getSocket();
        if (socket) {
            socket.emit('webrtc_answer', {
                roomId: roomId,
                answer: answer
            });
            console.log('[WebRTC CALLEE] Answer SENT to server');
        }

        isCallActive = true;
        updateCallButtons();
        hideIncomingCallUI();

        showNotification('Đã kết nối cuộc gọi', 'success');

    } catch (error) {
        console.error('[WebRTC CALLEE] Error processing accepted call:', error);
        showNotification('Lỗi khi kết nối cuộc gọi', 'error');
        cleanupCall();
    }
}

async function handleWebRTCAnswer(data) {
    console.log('[WebRTC CALLER] Received answer from server');
    try {
        // Only set remote description if we're in the right state
        if (peerConnection && peerConnection.signalingState === 'have-local-offer') {
            console.log('[WebRTC CALLER] Setting remote description (answer)...');
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            console.log('[WebRTC CALLER] Remote description SET');
            console.log('[WebRTC CALLER] signalingState after setRemoteDescription:', peerConnection.signalingState);
            // Process any queued ICE candidates now that remote description is set
            console.log('[WebRTC CALLER] Processing', pendingIceCandidates.length, 'queued ICE candidates');
            await processPendingIceCandidates();
            showNotification('Cuộc gọi đã được kết nối', 'success');
        } else {
            console.warn('[WebRTC CALLER] Ignoring answer - wrong state:', peerConnection?.signalingState);
        }
    } catch (error) {
        console.error('[WebRTC CALLER] Error handling answer:', error);
    }
}

async function handleWebRTCIceCandidate(data) {
    try {
        if (!data.candidate) return;
        
        // Check if peerConnection exists and has remote description
        if (peerConnection && peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
            console.log('[WebRTC] Adding ICE candidate directly');
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
            // Queue the ICE candidate for later
            console.log('[WebRTC] Queuing ICE candidate - remote description not set yet (queue size:', pendingIceCandidates.length + 1, ')');
            pendingIceCandidates.push(data.candidate);
        }
    } catch (error) {
        console.error('[WebRTC] Error adding ICE candidate:', error);
    }
}

// Process queued ICE candidates after remote description is set
async function processPendingIceCandidates() {
    if (!peerConnection || pendingIceCandidates.length === 0) return;
    
    console.log(`[WebRTC] Processing ${pendingIceCandidates.length} queued ICE candidates`);
    
    for (const candidate of pendingIceCandidates) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('[WebRTC] Error adding queued ICE candidate:', error);
        }
    }
    
    pendingIceCandidates = [];
}

function handleCallRequest(data) {
    currentCallId = data.callId;
    
    // Show incoming call UI with accept/reject buttons
    showIncomingCallUI(data.from || data.username);
}

function handleCallAccepted(data) {
    console.log('[WebRTC] Call accepted by peer, initiating WebRTC connection');
    
    // Prevent multiple initiations
    if (isCallActive) {
        console.log('[WebRTC] Already in active call, skipping initiation');
        return;
    }
    
    showNotification('Đối phương đã chấp nhận cuộc gọi', 'success');
    
    // Now create and send the WebRTC offer
    initiateWebRTCConnection();
}

function handleCallRejected(data) {
    showNotification('Cuộc gọi bị từ chối', 'error');
    cleanupCall();
}

function handleCallEnded(data) {
    showNotification('Cuộc gọi đã kết thúc', 'info');
    endCall(false); // Don't emit end_call
}

// ============ INCOMING CALL UI ============
function showIncomingCallUI(callerName) {
    // Remove existing overlay
    hideIncomingCallUI();
    
    const overlay = document.createElement('div');
    overlay.id = 'incomingCallOverlay';
    overlay.className = 'incoming-call-overlay';
    overlay.innerHTML = `
        <div class="incoming-call-content">
            <div class="incoming-call-icon">📞</div>
            <div class="incoming-call-title">Cuộc gọi đến</div>
            <div class="incoming-call-caller">${callerName}</div>
            <div class="incoming-call-message">đang gọi cho bạn...</div>
            <div class="incoming-call-buttons">
                <button class="incoming-call-accept" onclick="acceptIncomingCall()">
                    ✓ Chấp nhận
                </button>
                <button class="incoming-call-reject" onclick="rejectIncomingCall()">
                    ✕ Từ chối
                </button>
            </div>
        </div>
    `;
    
    // Add styles
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    const content = overlay.querySelector('.incoming-call-content');
    content.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 20px;
        padding: 40px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(74, 158, 255, 0.3);
    `;
    
    const icon = overlay.querySelector('.incoming-call-icon');
    icon.style.cssText = `
        font-size: 60px;
        margin-bottom: 20px;
        animation: pulse 1.5s infinite;
    `;
    
    const title = overlay.querySelector('.incoming-call-title');
    title.style.cssText = `
        font-size: 24px;
        font-weight: bold;
        color: #4a9eff;
        margin-bottom: 10px;
    `;
    
    const caller = overlay.querySelector('.incoming-call-caller');
    caller.style.cssText = `
        font-size: 28px;
        font-weight: bold;
        color: white;
        margin-bottom: 5px;
    `;
    
    const message = overlay.querySelector('.incoming-call-message');
    message.style.cssText = `
        font-size: 16px;
        color: #888;
        margin-bottom: 30px;
    `;
    
    const buttons = overlay.querySelector('.incoming-call-buttons');
    buttons.style.cssText = `
        display: flex;
        gap: 20px;
        justify-content: center;
    `;
    
    const acceptBtn = overlay.querySelector('.incoming-call-accept');
    acceptBtn.style.cssText = `
        padding: 15px 40px;
        font-size: 18px;
        font-weight: bold;
        border: none;
        border-radius: 30px;
        cursor: pointer;
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        color: white;
        transition: transform 0.2s, box-shadow 0.2s;
    `;
    
    const rejectBtn = overlay.querySelector('.incoming-call-reject');
    rejectBtn.style.cssText = `
        padding: 15px 40px;
        font-size: 18px;
        font-weight: bold;
        border: none;
        border-radius: 30px;
        cursor: pointer;
        background: linear-gradient(135deg, #dc3545 0%, #ff6b6b 100%);
        color: white;
        transition: transform 0.2s, box-shadow 0.2s;
    `;
    
    // Add keyframe animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(overlay);
    
    // Play ringtone sound (optional)
    playRingtone();
}

function hideIncomingCallUI() {
    const overlay = document.getElementById('incomingCallOverlay');
    if (overlay) {
        overlay.remove();
    }
    stopRingtone();
}

// Accept incoming call
window.acceptIncomingCall = async function() {
    console.log('[WebRTC] User accepted incoming call');
    hideIncomingCallUI();
    
    const socket = getSocket();
    const roomId = getCurrentRoomId();
    
    // Mark that user has accepted (for case when offer arrives later)
    hasAcceptedCall = true;
    
    // Notify caller that we accepted
    if (socket) {
        socket.emit('call_accepted', {
            roomId: roomId,
            callId: currentCallId
        });
    }
    
    // Process the pending offer if already received
    if (pendingOffer) {
        console.log('[WebRTC] Offer already received, processing now');
        await processAcceptedCall();
    } else {
        console.log('[WebRTC] Waiting for offer to arrive...');
        showNotification('Đang chờ kết nối...', 'info');
    }
};

// Reject incoming call
window.rejectIncomingCall = function() {
    console.log('[WebRTC] User rejected incoming call');
    hideIncomingCallUI();
    
    const socket = getSocket();
    const roomId = getCurrentRoomId();
    
    // Notify caller that we rejected
    if (socket) {
        socket.emit('call_rejected', {
            roomId: roomId,
            callId: currentCallId
        });
    }
    
    cleanupCall();
    showNotification('Đã từ chối cuộc gọi', 'info');
};

// Simple ringtone (using Web Audio API)
let ringtoneInterval = null;
let audioContext = null;

function playRingtone() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const playTone = () => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 440; // A4 note
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        };
        
        playTone();
        ringtoneInterval = setInterval(playTone, 1000);
        
    } catch (e) {
        console.log('[WebRTC] Could not play ringtone:', e);
    }
}

function stopRingtone() {
    if (ringtoneInterval) {
        clearInterval(ringtoneInterval);
        ringtoneInterval = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
}

// Cleanup helper
function cleanupCall() {
    pendingOffer = null;
    pendingIceCandidates = []; // Clear queued ICE candidates
    isWaitingForAnswer = false;
    hasAcceptedCall = false; // Reset accepted flag
    currentCallId = null;
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    const localVideo = document.getElementById('battleLocalVideo') || document.getElementById('localVideo');
    const remoteVideo = document.getElementById('battleRemoteVideo') || document.getElementById('remoteVideo');
    if (localVideo) localVideo.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;
    
    isCallActive = false;
    updateCallButtons();
    hideIncomingCallUI();
}

function endCall(emitEvent = true) {
    const roomId = getCurrentRoomId();
    const socket = getSocket();
    
    // Notify peer before cleanup
    if (emitEvent && socket && roomId && (isCallActive || isWaitingForAnswer)) {
        socket.emit('end_call', {
            roomId: roomId,
            callId: currentCallId
        });
    }

    // Use cleanup helper
    cleanupCall();
    
    isVideoEnabled = true;
    isAudioEnabled = true;
}

function toggleVideo() {
    if (!localStream) return;

    isVideoEnabled = !isVideoEnabled;
    localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoEnabled;
    });

    // Update button
    const btn = document.getElementById('battleToggleVideoBtn') || document.getElementById('toggleVideoBtn');
    if (btn) {
        btn.textContent = isVideoEnabled ? '📹' : '📹❌';
        btn.classList.toggle('disabled', !isVideoEnabled);
    }

    showNotification(isVideoEnabled ? 'Camera đã bật' : 'Camera đã tắt', 'info');
}

function toggleAudio() {
    if (!localStream) return;

    isAudioEnabled = !isAudioEnabled;
    localStream.getAudioTracks().forEach(track => {
        track.enabled = isAudioEnabled;
    });

    // Update button
    const btn = document.getElementById('battleToggleAudioBtn') || document.getElementById('toggleAudioBtn');
    if (btn) {
        btn.textContent = isAudioEnabled ? '🎤' : '🎤❌';
        btn.classList.toggle('disabled', !isAudioEnabled);
    }

    showNotification(isAudioEnabled ? 'Mic đã bật' : 'Mic đã tắt', 'info');
}

function updateCallButtons() {
    const startCallBtn = document.getElementById('battleStartCallBtn') || document.getElementById('startCallBtn');
    const endCallBtn = document.getElementById('battleEndCallBtn') || document.getElementById('endCallBtn');

    if (startCallBtn && endCallBtn) {
        if (isCallActive || isWaitingForAnswer) {
            startCallBtn.style.display = 'none';
            endCallBtn.style.display = 'inline-flex';
            
            // Update end button text if waiting
            if (isWaitingForAnswer) {
                endCallBtn.title = 'Hủy cuộc gọi';
            } else {
                endCallBtn.title = 'Kết thúc cuộc gọi';
            }
        } else {
            startCallBtn.style.display = 'inline-flex';
            endCallBtn.style.display = 'none';
        }
    }
}

async function resumeCallVideoPlayback() {
    const localVideo = document.getElementById('battleLocalVideo') || document.getElementById('localVideo');
    const remoteVideo = document.getElementById('battleRemoteVideo') || document.getElementById('remoteVideo');

    if (localVideo && localStream) {
        await attachStreamToVideo(localVideo, localStream, { muted: true });
    }

    if (remoteVideo && remoteStream) {
        await attachStreamToVideo(remoteVideo, remoteStream);
    }
}

// Helper functions
function getCurrentRoomId() {
    // First try actual roomId from server (for chat/webrtc to work properly)
    if (window.actualRoomId) {
        return window.actualRoomId;
    }
    // Fallback to BattleshipState
    if (typeof BattleshipState !== 'undefined' && BattleshipState.getRoomCode) {
        return BattleshipState.getRoomCode();
    }
    if (typeof currentRoomId !== 'undefined') {
        return currentRoomId;
    }
    return null;
}

function getCurrentUserId() {
    if (typeof BattleshipState !== 'undefined' && BattleshipState.getUserId) {
        return BattleshipState.getUserId();
    }
    return localStorage.getItem('userId');
}

function getCurrentUsername() {
    if (typeof BattleshipState !== 'undefined' && BattleshipState.getUsername) {
        return BattleshipState.getUsername();
    }
    return localStorage.getItem('username') || localStorage.getItem('guestDisplayName') || 'Player';
}

function showNotification(message, type) {
    if (typeof SocketShared !== 'undefined' && SocketShared.showNotification) {
        SocketShared.showNotification(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (isCallActive) {
        endCall();
    }
});

// Export functions to window for game.js to call
window.handleWebRTCOffer = handleWebRTCOffer;
window.handleWebRTCAnswer = handleWebRTCAnswer;
window.handleWebRTCIceCandidate = handleWebRTCIceCandidate;
window.handleCallRequest = handleCallRequest;
window.handleCallAccepted = handleCallAccepted;
window.handleCallRejected = handleCallRejected;
window.handleCallEnded = handleCallEnded;
window.resumeCallVideoPlayback = resumeCallVideoPlayback;
