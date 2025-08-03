// Simple browser-compatible wrapper for Pipecat SDK
// This creates a minimal implementation that works with your server

class SimplePipecatClient {
    constructor(options) {
        this.transport = options.transport;
        this.callbacks = options.callbacks || {};
        this.enableMic = options.enableMic || false;
        this.enableCam = options.enableCam || false;
        this.connected = false;
        
        console.log('SimplePipecatClient initialized:', options);
    }
    
    async connect() {
        try {
            console.log('Connecting with transport...');
            
            if (this.callbacks.onTransportStateChanged) {
                this.callbacks.onTransportStateChanged('connecting');
            }
            
            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: this.enableMic,
                video: this.enableCam 
            });
            
            // Create WebRTC connection
            const pc = new RTCPeerConnection({ iceServers: [] });
            this.peerConnection = pc;
            
            // Handle incoming tracks
            pc.ontrack = (event) => {
                if (this.callbacks.onTrackStarted) {
                    this.callbacks.onTrackStarted(event.track, { local: false });
                }
            };
            
            // Handle connection state changes  
            pc.onconnectionstatechange = () => {
                console.log('Connection state:', pc.connectionState);
                if (pc.connectionState === 'connected') {
                    this.connected = true;
                    if (this.callbacks.onConnected) {
                        this.callbacks.onConnected();
                    }
                    if (this.callbacks.onBotReady) {
                        this.callbacks.onBotReady();
                    }
                } else if (pc.connectionState === 'disconnected') {
                    this.connected = false;
                    if (this.callbacks.onDisconnected) {
                        this.callbacks.onDisconnected();
                    }
                }
            };
            
            // Handle data channel for events
            pc.ondatachannel = (event) => {
                const channel = event.channel;
                console.log('Data channel received:', channel.label);
                
                channel.onmessage = (msgEvent) => {
                    try {
                        const data = JSON.parse(msgEvent.data);
                        this.handleServerMessage(data);
                    } catch (e) {
                        console.log('Non-JSON message:', msgEvent.data);
                    }
                };
            };
            
            // Add local tracks
            if (stream.getAudioTracks().length > 0) {
                pc.addTransceiver(stream.getAudioTracks()[0], { direction: 'sendrecv' });
            }
            pc.addTransceiver('video', { direction: 'sendrecv' });
            
            // Create offer and send to server
            await pc.setLocalDescription(await pc.createOffer());
            await this.waitForIceComplete(pc);
            
            const response = await fetch('/api/offer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sdp: pc.localDescription.sdp,
                    type: pc.localDescription.type
                })
            });
            
            const answer = await response.json();
            await pc.setRemoteDescription(answer);
            
            console.log('Connected successfully');
            
        } catch (error) {
            console.error('Connection failed:', error);
            if (this.callbacks.onDisconnected) {
                this.callbacks.onDisconnected();
            }
            throw error;
        }
    }
    
    disconnect() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.connected = false;
        
        if (this.callbacks.onDisconnected) {
            this.callbacks.onDisconnected();
        }
    }
    
    handleServerMessage(data) {
        const eventType = data.type || data.event_type;
        
        switch (eventType) {
            case 'user-started-speaking':
                if (this.callbacks.onUserStartedSpeaking) {
                    this.callbacks.onUserStartedSpeaking();
                }
                break;
                
            case 'user-stopped-speaking':
                if (this.callbacks.onUserStoppedSpeaking) {
                    this.callbacks.onUserStoppedSpeaking();
                }
                break;
                
            case 'user-transcription':
                if (data.text && data.final && this.callbacks.onUserTranscript) {
                    this.callbacks.onUserTranscript({ text: data.text, final: true });
                }
                break;
                
            case 'bot-llm-text':
                if (this.callbacks.onBotTranscript) {
                    this.callbacks.onBotTranscript({ text: data.text });
                }
                break;
                
            case 'bot-started-speaking':
                if (this.callbacks.onBotStartedSpeaking) {
                    this.callbacks.onBotStartedSpeaking();
                }
                break;
                
            case 'bot-stopped-speaking':
                if (this.callbacks.onBotStoppedSpeaking) {
                    this.callbacks.onBotStoppedSpeaking();
                }
                break;
        }
        
        if (this.callbacks.onServerMessage) {
            this.callbacks.onServerMessage(data);
        }
    }
    
    waitForIceComplete(pc) {
        if (pc.iceGatheringState === 'complete') return Promise.resolve();
        
        return new Promise((resolve) => {
            const checkState = () => {
                if (pc.iceGatheringState === 'complete') {
                    pc.removeEventListener('icegatheringstatechange', checkState);
                    resolve();
                }
            };
            pc.addEventListener('icegatheringstatechange', checkState);
            setTimeout(() => {
                pc.removeEventListener('icegatheringstatechange', checkState);
                resolve();
            }, 2000);
        });
    }
}

class SimpleWebRTCTransport {
    constructor(options) {
        this.connectionUrl = options.connectionUrl;
        console.log('SimpleWebRTCTransport created:', options);
    }
}

// Expose as globals for browser compatibility
window.PipecatClient = SimplePipecatClient;
window.SmallWebRTCTransport = SimpleWebRTCTransport;

console.log('Pipecat browser compatibility layer loaded');