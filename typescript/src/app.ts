import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport';
import {
  BotLLMTextData,
  Participant,
  PipecatClient,
  PipecatClientOptions,
  TranscriptData,
  TransportState,
} from '@pipecat-ai/client-js';

class WebRTCApp {
  private declare connectBtn: HTMLButtonElement;
  private declare disconnectBtn: HTMLButtonElement;
  private declare muteBtn: HTMLButtonElement;

  private declare sourceLanguageSelect: HTMLSelectElement;
  private declare languageSelect: HTMLSelectElement;
  private declare audioInput: HTMLSelectElement;
  private declare audioCodec: HTMLSelectElement;

  private declare audioElement: HTMLAudioElement;

  private transcriptLog: HTMLElement | null = null;
  private debugLog: HTMLElement | null = null;
  private debugToggle: HTMLButtonElement | null = null;
  private statusSpan: HTMLElement | null = null;
  private statusIndicator: HTMLElement | null = null;
  private isDebugMode: boolean = false;
  private listeningIndicator: HTMLElement | null = null;

  private declare smallWebRTCTransport: SmallWebRTCTransport;
  private declare pcClient: PipecatClient;

  constructor() {
    this.setupDOMElements();
    this.setupDOMEventListeners();
    this.initializePipecatClient();
    void this.populateDevices();
  }

  private initializePipecatClient(): void {
    this.initializePipecatClientWithLanguage(undefined, undefined);
  }

  private initializePipecatClientWithLanguage(targetLanguage?: string, sourceLanguage?: string): void {
    let connectionUrl = '/api/offer';
    const params = new URLSearchParams();
    if (targetLanguage) params.append('language', targetLanguage);
    if (sourceLanguage) params.append('sourceLanguage', sourceLanguage);
    if (params.toString()) connectionUrl += `?${params.toString()}`;
    const opts: PipecatClientOptions = {
      transport: new SmallWebRTCTransport({ connectionUrl }),
      enableMic: true,
      enableCam: false,
      callbacks: {
        onTransportStateChanged: (state: TransportState) => {
          this.log(`Transport state: ${state}`);
        },
        onConnected: () => {
          this.onConnectedHandler();
        },
        onBotReady: () => {
          this.log('Bot is ready.');
        },
        onDisconnected: () => {
          this.onDisconnectedHandler();
        },
        onUserStartedSpeaking: () => {
          this.showListeningIndicator();
          this.log('User started speaking.');
        },
        onUserStoppedSpeaking: () => {
          this.hideListeningIndicator();
          this.log('User stopped speaking.');
        },
        onBotStartedSpeaking: () => {
          this.log('Bot started speaking.');
        },
        onBotStoppedSpeaking: () => {
          this.log('Bot stopped speaking.');
        },
        onUserTranscript: (transcript: TranscriptData) => {
          this.log(`User transcript: ${transcript.text}`);
        },
        onBotTranscript: (data: BotLLMTextData) => {
          this.log(`AI transcript: ${data.text}`);
        },
        onTrackStarted: (
          track: MediaStreamTrack,
          participant?: Participant
        ) => {
          if (participant?.local) {
            return;
          }
          this.onBotTrackStarted(track);
        },
        onServerMessage: (msg: unknown) => {
          this.log(`Server message: ${msg}`);
        },
      },
    };
    this.pcClient = new PipecatClient(opts);
    this.smallWebRTCTransport = this.pcClient.transport as SmallWebRTCTransport;
  }

  private setupDOMElements(): void {
    this.connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
    this.disconnectBtn = document.getElementById('disconnect-btn') as HTMLButtonElement;
    this.muteBtn = document.getElementById('mute-btn') as HTMLButtonElement;
    this.sourceLanguageSelect = document.getElementById('source-language-select') as HTMLSelectElement;
    this.languageSelect = document.getElementById('language-select') as HTMLSelectElement;
    this.audioInput = document.getElementById('audio-input') as HTMLSelectElement;
    this.audioCodec = document.getElementById('audio-codec') as HTMLSelectElement;
    this.audioElement = document.getElementById('bot-audio') as HTMLAudioElement;
    this.transcriptLog = document.getElementById('transcript-log');
    this.debugLog = document.getElementById('debug-log');
    this.debugToggle = document.getElementById('debug-toggle') as HTMLButtonElement;
    this.statusSpan = document.getElementById('connection-status');
    this.statusIndicator = document.querySelector('.status-indicator');
    this.listeningIndicator = document.getElementById('listening-indicator');
  }

  private setupDOMEventListeners(): void {
    this.connectBtn.addEventListener('click', () => this.start());
    this.disconnectBtn.addEventListener('click', () => this.stop());
    this.audioInput.addEventListener('change', (e) => {
      // @ts-ignore
      let audioDevice = e.target?.value;
      this.pcClient.updateMic(audioDevice);
    });
    this.muteBtn.addEventListener('click', () => {
      let isMicEnabled = this.pcClient.isMicEnabled;
      this.pcClient.enableMic(!isMicEnabled);
      this.muteBtn.textContent = isMicEnabled ? '🔇' : '🎤';
      this.muteBtn.classList.toggle('muted', isMicEnabled);
    });
    
    // Remove required styling when target language is selected
    this.languageSelect.addEventListener('change', () => {
      if (this.languageSelect.value) {
        this.languageSelect.classList.remove('required');
      } else {
        this.languageSelect.classList.add('required');
      }
    });
    
    this.debugToggle?.addEventListener('click', () => {
      this.toggleDebugMode();
    });
  }

  private showListeningIndicator(): void {
    if (this.listeningIndicator) {
      this.listeningIndicator.classList.remove('hidden');
    }
    if (this.muteBtn) {
      this.muteBtn.classList.add('listening');
    }
  }

  private hideListeningIndicator(): void {
    if (this.listeningIndicator) {
      this.listeningIndicator.classList.add('hidden');
    }
    if (this.muteBtn) {
      this.muteBtn.classList.remove('listening');
    }
  }

  private toggleDebugMode(): void {
    this.isDebugMode = !this.isDebugMode;
    
    if (this.debugLog) {
      this.debugLog.classList.toggle('hidden', !this.isDebugMode);
    }
    
    if (this.debugToggle) {
      this.debugToggle.classList.toggle('active', this.isDebugMode);
      this.debugToggle.textContent = this.isDebugMode ? 'Hide Debug' : 'Debug';
    }
  }

  private logTranscript(message: string, isUser: boolean): void {
    if (!this.transcriptLog) return;
    
    const entry = document.createElement('div');
    
    if (isUser) {
      entry.innerHTML = `<strong style="color: #667eea;">You:</strong> ${message}`;
    } else {
      entry.innerHTML = `<strong style="color: #2ed573;">Translation:</strong> ${message}`;
    }
    
    this.transcriptLog.appendChild(entry);
    this.transcriptLog.scrollTop = this.transcriptLog.scrollHeight;
  }

  private logDebug(message: string): void {
    if (!this.debugLog) return;
    
    const entry = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `${timestamp} - ${message}`;
    
    if (message.includes('started speaking')) {
      entry.style.color = '#ff9f43';
    } else if (message.includes('Status:')) {
      entry.style.color = '#333';
      entry.style.fontWeight = '600';
    }
    
    this.debugLog.appendChild(entry);
    this.debugLog.scrollTop = this.debugLog.scrollHeight;
  }

  private log(message: string): void {
    // ALWAYS log to debug (everything goes there)
    this.logDebug(message);
    
    // ALSO log transcripts to clean view
    if (message.includes('User transcript:')) {
      const text = message.replace('User transcript: ', '');
      this.logTranscript(text, true);
    }
    
    if (message.includes('AI transcript:')) {
      const text = message.replace('AI transcript: ', '');
      this.logTranscript(text, false);
    }
  }

  private clearAllLogs() {
    if (this.transcriptLog) this.transcriptLog.innerText = '';
    if (this.debugLog) this.debugLog.innerText = '';
  }

  private updateStatus(status: string): void {
    if (this.statusSpan) {
      this.statusSpan.textContent = status;
    }
    if (this.statusIndicator) {
      this.statusIndicator.classList.toggle('connected', status === 'Connected');
    }
    this.log(`Status: ${status}`);
  }

  private onConnectedHandler() {
    this.updateStatus('Connected');
    if (this.connectBtn) this.connectBtn.disabled = true;
    if (this.disconnectBtn) this.disconnectBtn.disabled = false;
  }

  private onDisconnectedHandler() {
    this.updateStatus('Disconnected');
    this.hideListeningIndicator(); // Hide listening indicator on disconnect
    if (this.connectBtn) this.connectBtn.disabled = false;
    if (this.disconnectBtn) this.disconnectBtn.disabled = true;
  }

  private onBotTrackStarted(track: MediaStreamTrack) {
    if (track.kind === 'audio') {
      this.audioElement.srcObject = new MediaStream([track]);
    }
  }

  private async populateDevices(): Promise<void> {
    const populateSelect = (
      select: HTMLSelectElement,
      devices: MediaDeviceInfo[]
    ): void => {
      let counter = 1;
      devices.forEach((device) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.text = device.label || 'Device #' + counter;
        select.appendChild(option);
        counter += 1;
      });
    };

    try {
      const audioDevices = await this.pcClient.getAllMics();
      populateSelect(this.audioInput, audioDevices);
    } catch (e) {
      alert(e);
    }
  }

  private async start(): Promise<void> {
    const selectedTargetLanguage = this.languageSelect.value;
    const selectedSourceLanguage = this.sourceLanguageSelect.value;
    
    if (!selectedTargetLanguage) {
      alert('Please select a target language before connecting.');
      this.connectBtn.disabled = false;
      return;
    }

    this.clearAllLogs();
    this.connectBtn.disabled = true;
    this.updateStatus('Connecting');

    // Reinitialize client with language parameters
    this.initializePipecatClientWithLanguage(selectedTargetLanguage, selectedSourceLanguage);
    this.smallWebRTCTransport.setAudioCodec(this.audioCodec.value);
    
    try {
      await this.pcClient.connect();
    } catch (e) {
      console.log(`Failed to connect ${e}`);
      this.stop();
    }
  }

  private stop(): void {
    void this.pcClient.disconnect();
  }
}

// Create the WebRTCConnection instance
const webRTCConnection = new WebRTCApp();
