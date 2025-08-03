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

  private declare audioInput: HTMLSelectElement;
  private declare audioCodec: HTMLSelectElement;

  private declare audioElement: HTMLAudioElement;

  private debugLog: HTMLElement | null = null;
  private statusSpan: HTMLElement | null = null;
  private statusIndicator: HTMLElement | null = null;

  private declare smallWebRTCTransport: SmallWebRTCTransport;
  private declare pcClient: PipecatClient;

  constructor() {
    this.setupDOMElements();
    this.setupDOMEventListeners();
    this.initializePipecatClient();
    void this.populateDevices();
  }

  private initializePipecatClient(): void {
    const opts: PipecatClientOptions = {
      transport: new SmallWebRTCTransport({ connectionUrl: '/api/offer' }),
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
          this.log('User started speaking.');
        },
        onUserStoppedSpeaking: () => {
          this.log('User stopped speaking.');
        },
        onBotStartedSpeaking: () => {
          this.log('Bot started speaking.');
        },
        onBotStoppedSpeaking: () => {
          this.log('Bot stopped speaking.');
        },
        onUserTranscript: (transcript: TranscriptData) => {
          if (transcript.final) {
            this.log(`User transcript: ${transcript.text}`);
          }
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
    this.audioInput = document.getElementById('audio-input') as HTMLSelectElement;
    this.audioCodec = document.getElementById('audio-codec') as HTMLSelectElement;
    this.audioElement = document.getElementById('bot-audio') as HTMLAudioElement;
    this.debugLog = document.getElementById('debug-log');
    this.statusSpan = document.getElementById('connection-status');
    this.statusIndicator = document.querySelector('.status-indicator');
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
  }

  private log(message: string): void {
    if (!this.debugLog) return;
    const entry = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `${timestamp} - ${message}`;
    
    if (message.includes('User transcript:')) {
      entry.style.color = '#667eea';
      entry.style.fontWeight = '500';
    } else if (message.includes('AI transcript:')) {
      entry.style.color = '#2ed573';
      entry.style.fontWeight = '500';
    } else if (message.includes('started speaking')) {
      entry.style.color = '#ff9f43';
    } else if (message.includes('Status:')) {
      entry.style.color = '#333';
      entry.style.fontWeight = '600';
    }
    
    this.debugLog.appendChild(entry);
    this.debugLog.scrollTop = this.debugLog.scrollHeight;
  }

  private clearAllLogs() {
    this.debugLog!.innerText = '';
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
    this.clearAllLogs();

    this.connectBtn.disabled = true;
    this.updateStatus('Connecting');

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
