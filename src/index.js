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

// Real-time Pipecat Integration with RTVI Events
let dataChannel = null

const setupRTVIDataChannel = () => {
    if (!peerConnection) return
    
    // Try to listen for Pipecat's data channel (optional)
    peerConnection.addEventListener('datachannel', (event) => {
        dataChannel = event.channel
        console.log('Pipecat data channel received:', dataChannel.label)
        
        dataChannel.addEventListener('message', handleRTVIMessage)
        dataChannel.addEventListener('open', () => {
            console.log('Pipecat data channel ready')
        })
        dataChannel.addEventListener('close', () => {
            console.log('Pipecat data channel closed')
            dataChannel = null
        })
    })
    
    // Primary: Audio-based event detection
    setupAudioEventFallback()
}

const handleRTVIMessage = (event) => {
    try {
        const data = JSON.parse(event.data)
        console.log('RTVI Event:', data)
        
        // Handle different RTVI event formats
        const eventType = data.type || data.event_type || data.action
        const eventData = data.data || data.payload || data
        
        switch (eventType) {
            case 'user-started-speaking':
            case 'user_started_speaking':
            case 'speech-started':
                showListening()
                break
                
            case 'user-stopped-speaking':
            case 'user_stopped_speaking':
            case 'speech-stopped':
                hideListening()
                break
                
            case 'user-transcription':
            case 'user_transcription':
            case 'transcription':
                if (eventData && eventData.text && (eventData.final || eventData.is_final)) {
                    conversation.addUserMessage(eventData.text)
                }
                break
                
            case 'bot-llm-started':
            case 'bot_llm_started':
            case 'llm-started':
            case 'ai-thinking':
                conversation.showProcessing()
                break
                
            case 'bot-llm-stopped':
            case 'bot_llm_stopped':
            case 'llm-stopped':
                conversation.hideProcessing()
                break
                
            case 'bot-llm-text':
            case 'bot_llm_text':
            case 'llm-text':
            case 'ai-response':
                if (eventData && eventData.text) {
                    conversation.hideProcessing()
                    conversation.addAIMessage(eventData.text)
                }
                break
                
            case 'bot-tts-started':
            case 'bot_tts_started':
            case 'tts-started':
                // Bot is speaking
                break
                
            case 'bot-tts-stopped':
            case 'bot_tts_stopped':
            case 'tts-stopped':
                // Bot finished speaking
                break
                
            default:
                console.log('Unhandled RTVI event:', eventType, data)
        }
    } catch (error) {
        // Try to handle non-JSON messages
        console.log('Received non-JSON message:', event.data)
    }
}

// Audio-based event detection fallback
let isCurrentlyListening = false
let audioAnalyzer = null
let audioTimeout = null

const setupAudioEventFallback = () => {
    // Monitor user audio input for speech detection
    if (audioStream && audioStream.getAudioTracks().length > 0) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()
            const source = audioContext.createMediaStreamSource(audioStream)
            audioAnalyzer = audioContext.createAnalyser()
            audioAnalyzer.fftSize = 256
            source.connect(audioAnalyzer)
            
            monitorAudioActivity()
        } catch (error) {
            console.log('Could not setup audio analyzer:', error)
        }
    }
    
    // Monitor bot audio output
    const monitorBotAudio = () => {
        if (!audioEl.srcObject) {
            setTimeout(monitorBotAudio, 100)
            return
        }
        
        audioEl.addEventListener('playing', () => {
            console.log('Bot started speaking')
        })
        
        audioEl.addEventListener('ended', () => {
            console.log('Bot finished speaking')
        })
        
        audioEl.addEventListener('pause', () => {
            console.log('Bot audio paused')
        })
    }
    
    monitorBotAudio()
}

const monitorAudioActivity = () => {
    if (!audioAnalyzer) return
    
    const bufferLength = audioAnalyzer.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    const checkAudio = () => {
        audioAnalyzer.getByteFrequencyData(dataArray)
        
        // Calculate average volume
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i]
        }
        const average = sum / bufferLength
        
        // Detect speech activity (threshold can be adjusted)
        const isActive = average > 10
        
        if (isActive && !isCurrentlyListening) {
            isCurrentlyListening = true
            showListening()
            console.log('Audio activity detected - user started speaking')
        } else if (!isActive && isCurrentlyListening) {
            // Add delay before stopping listening indicator
            clearTimeout(audioTimeout)
            audioTimeout = setTimeout(() => {
                isCurrentlyListening = false
                hideListening()
                console.log('Audio activity stopped - user stopped speaking')
            }, 1000) // 1 second delay
        }
        
        // Continue monitoring
        requestAnimationFrame(checkAudio)
    }
    
    checkAudio()
}

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
    
    // Setup RTVI data channel for conversation events
    setupRTVIDataChannel()
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
    
    // Clean up audio monitoring
    if (audioTimeout) {
        clearTimeout(audioTimeout)
        audioTimeout = null
    }
    isCurrentlyListening = false
    audioAnalyzer = null
    
    // Close data channel
    if (dataChannel) {
        dataChannel.close()
        dataChannel = null
    }
    
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
