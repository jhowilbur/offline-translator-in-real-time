const statusEl = document.getElementById("status")
const buttonEl = document.getElementById("connect-btn")
const audioEl = document.getElementById("audio-el")
const conversationEl = document.getElementById("conversation")

let connected = false
let peerConnection = null
let audioStream = null

const waitForIceGatheringComplete = async (pc, timeoutMs = 2000) => {
    if (pc.iceGatheringState === 'complete') return;
    console.log("Waiting for ICE gathering to complete. Current state:", pc.iceGatheringState);
    return new Promise((resolve) => {
        let timeoutId;
        const checkState = () => {
            console.log("icegatheringstatechange:", pc.iceGatheringState);
            if (pc.iceGatheringState === 'complete') {
                cleanup();
                resolve();
            }
        };
        const onTimeout = () => {
            console.warn(`ICE gathering timed out after ${timeoutMs} ms.`);
            cleanup();
            resolve();
        };
        const cleanup = () => {
            pc.removeEventListener('icegatheringstatechange', checkState);
            clearTimeout(timeoutId);
        };
        pc.addEventListener('icegatheringstatechange', checkState);
        timeoutId = setTimeout(onTimeout, timeoutMs);
        // Checking the state again to avoid any eventual race condition
        checkState();
    });
};


const createSmallWebRTCConnection = async (audioTrack) => {
    const config = {
      iceServers: [],
    };
    const pc = new RTCPeerConnection(config)
    addPeerConnectionEventListeners(pc)
    pc.ontrack = e => audioEl.srcObject = e.streams[0]
    // SmallWebRTCTransport expects to receive both transceivers
    pc.addTransceiver(audioTrack, { direction: 'sendrecv' })
    pc.addTransceiver('video', { direction: 'sendrecv' })
    await pc.setLocalDescription(await pc.createOffer())
    await waitForIceGatheringComplete(pc)
    const offer = pc.localDescription
    const response = await fetch('/api/offer', {
        body: JSON.stringify({ sdp: offer.sdp, type: offer.type}),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });
    const answer = await response.json()
    await pc.setRemoteDescription(answer)
    return pc
}

const connect = async () => {
    try {
        _onConnecting()
        audioStream = await navigator.mediaDevices.getUserMedia({audio: true})
        peerConnection = await createSmallWebRTCConnection(audioStream.getAudioTracks()[0])
    } catch (error) {
        console.error('Failed to access microphone:', error)
        conversation.addAIMessage('Failed to access microphone. Please check permissions and try again.')
        _onDisconnected()
    }
}

const addPeerConnectionEventListeners = (pc) => {
    pc.oniceconnectionstatechange = () => {
        console.log("oniceconnectionstatechange", pc?.iceConnectionState)
    }
    pc.onconnectionstatechange = () => {
        console.log("onconnectionstatechange", pc?.connectionState)
        let connectionState = pc?.connectionState
        if (connectionState === 'connected') {
            _onConnected()
        } else if (connectionState === 'disconnected') {
            _onDisconnected()
        }
    }
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            console.log("New ICE candidate:", event.candidate);
        } else {
            console.log("All ICE candidates have been sent.");
        }
    };
}

// Message management
const clearWelcomeMessage = () => {
    const welcome = conversationEl.querySelector('.welcome-message')
    if (welcome) welcome.remove()
}

const addMessage = (content, type = 'ai', label = null) => {
    clearWelcomeMessage()
    
    const messageEl = document.createElement('div')
    messageEl.className = `message ${type}`
    
    const labelEl = label ? `<div class="message-label">${label}</div>` : ''
    const contentEl = `<div class="message-content">${content}</div>`
    
    messageEl.innerHTML = type === 'user' ? contentEl + labelEl : labelEl + contentEl
    conversationEl.appendChild(messageEl)
    messageEl.scrollIntoView({ behavior: 'smooth' })
}

const showTyping = () => {
    const typingEl = document.createElement('div')
    typingEl.className = 'message ai typing-message'
    typingEl.innerHTML = `
        <div class="message-label">AI</div>
        <div class="message-content typing">
            Translating
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `
    conversationEl.appendChild(typingEl)
    typingEl.scrollIntoView({ behavior: 'smooth' })
    return typingEl
}

const hideTyping = () => {
    const typingEl = conversationEl.querySelector('.typing-message')
    if (typingEl) typingEl.remove()
}

// Easy-to-use conversation API
const conversation = {
    addUserMessage: (text) => addMessage(text, 'user', 'You'),
    addAIMessage: (text) => addMessage(text, 'ai', 'AI'),
    showProcessing: () => showTyping(),
    hideProcessing: () => hideTyping(),
    clear: () => {
        conversationEl.innerHTML = '<div class="welcome-message">Start speaking to begin translation...</div>'
    }
}

// Speech detection indicators
let isListening = false
let listeningIndicator = null

const showListening = () => {
    if (isListening) return
    isListening = true
    
    listeningIndicator = document.createElement('div')
    listeningIndicator.className = 'message user listening-message'
    listeningIndicator.innerHTML = `
        <div class="message-content typing">
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            Listening...
        </div>
        <div class="message-label">You</div>
    `
    conversationEl.appendChild(listeningIndicator)
    listeningIndicator.scrollIntoView({ behavior: 'smooth' })
}

const hideListening = () => {
    if (!isListening) return
    isListening = false
    
    if (listeningIndicator) {
        listeningIndicator.remove()
        listeningIndicator = null
    }
}

// INTEGRATION GUIDE:
// ==================
// To integrate with your voice processing system:
//
// 1. When speech detection starts:
//    showListening()
//
// 2. When user finishes speaking:
//    hideListening()
//    conversation.addUserMessage(transcribedText)
//
// 3. When AI starts processing:
//    conversation.showProcessing()
//
// 4. When AI response is ready:
//    conversation.hideProcessing()
//    conversation.addAIMessage(responseText)
//
// 5. Clear conversation:
//    conversation.clear()

// Export for easy integration
window.conversation = conversation
window.showListening = showListening
window.hideListening = hideListening

// Connection status handlers
const _onConnecting = () => {
    statusEl.textContent = "Connecting"
    statusEl.className = "connecting"
    buttonEl.textContent = "Disconnect"
    connected = true
}

const _onConnected = () => {
    statusEl.textContent = "Connected"
    statusEl.className = "connected"
    buttonEl.textContent = "Disconnect"
    connected = true
    
    // Demo: Show how the conversation system works
    setTimeout(() => {
        conversation.addAIMessage("Hello! I'm ready to help translate and interpret idioms.")
    }, 500)
    
    // Demo: Simulate a conversation flow (remove this in production)
    setTimeout(() => {
        showListening()
        setTimeout(() => {
            hideListening()
            conversation.addUserMessage("What does 'break a leg' mean?")
            conversation.showProcessing()
            setTimeout(() => {
                conversation.hideProcessing()
                conversation.addAIMessage("'Break a leg' is an idiom that means 'good luck!' It's commonly used to wish someone success, especially before a performance or important event.")
            }, 2000)
        }, 3000)
    }, 2000)
}

const _onDisconnected = () => {
    statusEl.textContent = "Disconnected"
    statusEl.className = ""
    buttonEl.textContent = "Connect"
    connected = false
    
    // Clear any processing indicators
    hideListening()
    conversation.hideProcessing()
    
    // Clear demo conversation (optional - remove if you want to keep conversation history)
    setTimeout(() => {
        conversation.clear()
    }, 1000)
}

const disconnect = () => {
    // Stop microphone access
    if (audioStream) {
        audioStream.getTracks().forEach(track => {
            track.stop()
            console.log('Microphone track stopped')
        })
        audioStream = null
    }
    
    // Stop any listening indicators
    hideListening()
    
    // Close peer connection
    if (peerConnection) {
        peerConnection.close()
        peerConnection = null
    }
    
    _onDisconnected()
}

buttonEl.addEventListener("click", async () => {
    if (!connected) {
        await connect()
    } else {
        disconnect()
    }
});
