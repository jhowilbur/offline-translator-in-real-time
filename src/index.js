const statusEl = document.getElementById("status")
const buttonEl = document.getElementById("connect-btn")
const audioEl = document.getElementById("audio-el")
const conversationEl = document.getElementById("conversation")

let connected = false
let pcClient = null

// Initialize Pipecat Client - now much simpler with local files
const initializePipecatClient = () => {
    console.log('Initializing Pipecat client...')
    
    try {
        const opts = {
            transport: new window.SmallWebRTCTransport({ 
                connectionUrl: '/api/offer' 
            }),
            enableMic: true,
            enableCam: false,
            callbacks: {
                onTransportStateChanged: (state) => {
                    console.log(`Transport state: ${state}`)
                },
                onConnected: () => {
                    console.log('Pipecat client connected')
                    _onConnected()
                },
                onBotReady: () => {
                    console.log('Bot is ready')
                },
                onDisconnected: () => {
                    console.log('Pipecat client disconnected')
                    _onDisconnected()
                },
                onUserStartedSpeaking: () => {
                    console.log('User started speaking')
                    showListening()
                },
                onUserStoppedSpeaking: () => {
                    console.log('User stopped speaking')
                    hideListening()
                },
                onBotStartedSpeaking: () => {
                    console.log('Bot started speaking')
                    conversation.hideProcessing()
                },
                onBotStoppedSpeaking: () => {
                    console.log('Bot stopped speaking')
                },
                onUserTranscript: (transcript) => {
                    if (transcript.final) {
                        console.log(`User transcript: ${transcript.text}`)
                        conversation.addUserMessage(transcript.text)
                    }
                },
                onBotTranscript: (data) => {
                    console.log(`Bot transcript: ${data.text}`)
                    conversation.hideProcessing()
                    conversation.addAIMessage(data.text)
                },
                onTrackStarted: (track, participant) => {
                    if (participant?.local) {
                        return
                    }
                    if (track.kind === 'audio') {
                        console.log('Bot audio track started')
                        audioEl.srcObject = new MediaStream([track])
                    }
                },
                onServerMessage: (msg) => {
                    console.log(`Server message:`, msg)
                }
            }
        }
        
        pcClient = new window.PipecatClient(opts)
        console.log('PipecatClient initialized successfully')
    } catch (error) {
        console.error('Failed to initialize PipecatClient:', error)
    }
}

const connect = async () => {
    try {
        _onConnecting()
        conversation.showProcessing()
        
        console.log('Connecting to Pipecat server...')
        await pcClient.connect()
        
    } catch (error) {
        console.error('Failed to connect:', error)
        conversation.addAIMessage(`Failed to connect: ${error.message}`)
        _onDisconnected()
    }
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
    conversation.hideProcessing()
}

const _onDisconnected = () => {
    statusEl.textContent = "Disconnected"
    statusEl.className = ""
    buttonEl.textContent = "Connect"
    connected = false
    hideListening()
    conversation.hideProcessing()
    setTimeout(() => conversation.clear(), 1000)
}

const disconnect = () => {
    if (pcClient) {
        console.log('Disconnecting from Pipecat server...')
        pcClient.disconnect()
    }
    hideListening()
    conversation.hideProcessing()
}

buttonEl.addEventListener("click", async () => {
    if (!connected) {
        await connect()
    } else {
        disconnect()
    }
})

// Initialize client when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Pipecat...')
    initializePipecatClient()
})
