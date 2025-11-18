import type { AudioEffect, Project, Track, AudioClip } from '../types';

// This service uses the Web Audio API for a complete DAW experience, including
// multi-track recording, synchronized playback, effects processing, and exporting.

interface BuiltEffects {
    connectionChain: AudioNode[];
    updatableNodes: {
        [effectId: string]: {
            name: AudioEffect['name'];
            nodes: AudioNode[];
        };
    };
}

interface TrackNodes {
    gain: GainNode;
    pan: StereoPannerNode;
    effects: AudioNode[];
    sourceNodes: Set<AudioBufferSourceNode>;
    updatableNodes: BuiltEffects['updatableNodes'];
}


class MasterAudioEngine {
    private audioContext: AudioContext;
    private mediaRecorder: MediaRecorder | null = null;
    private recordingChunks: Blob[] = [];
    private trackNodes: Map<number, TrackNodes> = new Map();
    private audioBuffers: Map<string, AudioBuffer> = new Map();
    private isPlaying = false;
    private startTime = 0;
    private startOffset = 0;
    private _isInitialized = false;

    // --- New properties for real-time recording processing ---
    private inputStream: MediaStream | null = null;
    private inputSourceNode: MediaStreamAudioSourceNode | null = null;
    private inputGainNode: GainNode | null = null; // For manual gain control
    private noiseGateNode: GainNode | null = null;
    private autoGainNode: GainNode | null = null;
    private limiterNode: DynamicsCompressorNode | null = null;
    private analyserNode: AnalyserNode | null = null;
    private scriptProcessorNode: ScriptProcessorNode | null = null;
    private mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;

    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    private async initialize() {
        if (this._isInitialized) return;
        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
        } catch (e) {
            console.warn("Could not resume AudioContext:", e);
        }
        this._isInitialized = true;
    }

    public getContext(): AudioContext {
        return this.audioContext;
    }

    public async loadProject(project: Project) {
        await this.initialize();
        for (const track of project.tracks) {
            for (const clip of track.clips) {
                if (!this.audioBuffers.has(clip.url)) {
                    try {
                        const response = await fetch(clip.url);
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const arrayBuffer = await response.arrayBuffer();
                        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                        this.audioBuffers.set(clip.url, audioBuffer);
                    } catch (e) {
                        console.error(`Failed to load or decode audio for clip ${clip.name}:`, e);
                        const fallbackBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate, this.audioContext.sampleRate);
                        this.audioBuffers.set(clip.url, fallbackBuffer);
                    }
                }
            }
        }
    }
    
    public play(project: Project, currentTime: number) {
        if (this.isPlaying) return;
        this.initialize();
        this.startOffset = currentTime;
        this.startTime = this.audioContext.currentTime;
        this.isPlaying = true;

        const soloedTracks = project.tracks.filter(t => t.isSolo);
        const tracksToPlay = soloedTracks.length > 0 ? soloedTracks : project.tracks.filter(t => !t.isMuted);

        for (const track of tracksToPlay) {
            this.createTrackNodes(track);
            const trackNode = this.trackNodes.get(track.id);
            if (!trackNode) continue;

            for (const clip of track.clips) {
                const playTime = clip.startTime;
                const duration = clip.duration;

                if (currentTime < playTime + duration) {
                    const source = this.audioContext.createBufferSource();
                    const audioBuffer = this.audioBuffers.get(clip.url);
                    if (!audioBuffer) continue;
                    
                    source.buffer = audioBuffer;
                    
                    const clipGainNode = this.audioContext.createGain();
                    clipGainNode.gain.value = clip.gain ?? 1;
                    source.connect(clipGainNode);

                    let lastNode: AudioNode = clipGainNode;
                    trackNode.effects.forEach(effectNode => {
                        lastNode.connect(effectNode);
                        lastNode = effectNode;
                    });
                    lastNode.connect(trackNode.gain);

                    const offset = Math.max(0, currentTime - playTime);
                    const when = this.audioContext.currentTime + Math.max(0, playTime - currentTime);
                    const playDuration = duration - offset;
                    
                    if (playDuration > 0) {
                        source.start(when, offset, playDuration);
                        trackNode.sourceNodes.add(source);
                        source.onended = () => {
                            trackNode.sourceNodes.delete(source);
                        };
                    }
                }
            }
        }
    }

    public stop(project: Project) {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        
        for (const track of project.tracks) {
            const trackNode = this.trackNodes.get(track.id);
            if (trackNode) {
                trackNode.sourceNodes.forEach(source => {
                    try { source.stop(); } catch(e) {}
                });
                trackNode.sourceNodes.clear();
            }
        }
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.stopRecording(project);
        }
    }
    
    public getCurrentTime(): number {
        if (!this.isPlaying) {
            return this.startOffset;
        }
        return this.startOffset + (this.audioContext.currentTime - this.startTime);
    }
    
    public getIsPlaying(): boolean {
        return this.isPlaying;
    }

    public isRecording(): boolean {
        return !!this.mediaRecorder && this.mediaRecorder.state === 'recording';
    }
    
    public async startRecording(deviceId: string): Promise<boolean> {
        try {
            await this.initialize();

            const constraints = {
                audio: {
                    deviceId: deviceId ? { exact: deviceId } : undefined,
                    echoCancellation: false, noiseSuppression: false, autoGainControl: false,
                }
            };

            this.inputStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.mediaStreamDestination = this.audioContext.createMediaStreamDestination();
            
            // --- Create audio processing chain ---
            this.inputSourceNode = this.audioContext.createMediaStreamSource(this.inputStream);
            this.inputGainNode = this.audioContext.createGain(); // For manual gain
            this.noiseGateNode = this.audioContext.createGain();
            this.autoGainNode = this.audioContext.createGain();
            this.limiterNode = this.audioContext.createDynamicsCompressor();
            this.analyserNode = this.audioContext.createAnalyser();
            // Using createScriptProcessor for wider browser compatibility over AudioWorklet
            this.scriptProcessorNode = this.audioContext.createScriptProcessor(2048, 1, 1);

            // Configure Limiter for safety, preventing any signal from clipping.
            this.limiterNode.threshold.setValueAtTime(-0.3, this.audioContext.currentTime); // Set to -0.3dB as requested
            this.limiterNode.knee.setValueAtTime(0, this.audioContext.currentTime);
            this.limiterNode.ratio.setValueAtTime(20.0, this.audioContext.currentTime); // Brickwall ratio
            this.limiterNode.attack.setValueAtTime(0.001, this.audioContext.currentTime); // Fast attack
            this.limiterNode.release.setValueAtTime(0.05, this.audioContext.currentTime);
            
            // --- Connect Audio Path for Recording ---
            this.inputSourceNode.connect(this.inputGainNode);
            this.inputGainNode.connect(this.noiseGateNode);
            this.noiseGateNode.connect(this.autoGainNode);
            this.autoGainNode.connect(this.limiterNode);
            this.limiterNode.connect(this.mediaStreamDestination);

            // --- Connect Analysis Path for Control ---
            // We analyze the signal *before* the limiter to react to the raw dynamics
            this.autoGainNode.connect(this.analyserNode);
            this.analyserNode.connect(this.scriptProcessorNode);
            // Connect processor to destination to keep it running, but with its output muted
            this.scriptProcessorNode.connect(this.audioContext.destination);


            // --- Set up real-time analysis ---
            this.scriptProcessorNode.onaudioprocess = (event) => {
                const inputData = event.inputBuffer.getChannelData(0);
                let sum = 0.0;
                for (let i = 0; i < inputData.length; i++) {
                    sum += inputData[i] * inputData[i];
                }
                const rms = Math.sqrt(sum / inputData.length);
                const db = 20 * Math.log10(rms);

                if (db === -Infinity || !this.noiseGateNode || !this.autoGainNode) return; // Silence or node not ready

                // --- 1. Noise Reduction (as a gentle noise gate) ---
                // Reduces background noise when the signal is very quiet (-45dB) to ensure a cleaner recording.
                const GATE_THRESHOLD_DB = -45;
                // A -20dB reduction (gain of 0.1) is applied with a fast attack to cut out noise between words.
                this.noiseGateNode.gain.setTargetAtTime(db < GATE_THRESHOLD_DB ? 0.1 : 1, this.audioContext.currentTime, 0.05);

                // --- 2. Auto Gain (as a slow compressor/leveler) ---
                // Aims to keep the signal within a target dynamic range of -18dB to -6dB.
                const LOW_THRESHOLD_DB = -18;
                const HIGH_THRESHOLD_DB = -6;
                
                let currentGain = this.autoGainNode.gain.value;
                let newGain = currentGain;
                
                // Refined logic: Adjust gain more significantly for larger volume deviations.
                if (db < LOW_THRESHOLD_DB) {
                    // How far below the threshold are we?
                    const diff = LOW_THRESHOLD_DB - db;
                    // The further away, the faster we increase gain, up to a max rate.
                    const increaseRate = 1.0 + Math.min(0.05, diff * 0.0015);
                    newGain = currentGain * increaseRate;
                } else if (db > HIGH_THRESHOLD_DB) {
                    // Reduce gain if the signal is too loud.
                    const diff = db - HIGH_THRESHOLD_DB;
                    const decreaseRate = 1.0 - Math.min(0.05, diff * 0.002);
                    newGain = currentGain * decreaseRate;
                }
                
                // Clamp the gain to prevent extreme values (max 20dB boost) and ensure stability.
                newGain = Math.max(1.0, Math.min(newGain, 10.0));
                this.autoGainNode.gain.setTargetAtTime(newGain, this.audioContext.currentTime, 0.1);

                // Mute the output of the script processor to prevent it from going to the main output (speakers)
                const outputData = event.outputBuffer.getChannelData(0);
                 for (let i = 0; i < outputData.length; i++) {
                    outputData[i] = 0;
                }
            };
            
            // --- Start Recorder ---
            this.mediaRecorder = new MediaRecorder(this.mediaStreamDestination.stream);
            this.recordingChunks = [];
            this.mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) this.recordingChunks.push(event.data);
            };
            this.mediaRecorder.start();
            return true;
        } catch (error) {
            console.error("Error starting recording:", error);
            this.cleanupRecordingNodes();
            return false;
        }
    }
    
    private cleanupRecordingNodes() {
        this.scriptProcessorNode?.disconnect();
        this.analyserNode?.disconnect();
        this.limiterNode?.disconnect();
        this.autoGainNode?.disconnect();
        this.noiseGateNode?.disconnect();
        this.inputGainNode?.disconnect();
        this.inputSourceNode?.disconnect();
        this.inputStream?.getTracks().forEach(track => track.stop());

        this.scriptProcessorNode = null;
        this.analyserNode = null;
        this.limiterNode = null;
        this.autoGainNode = null;
        this.noiseGateNode = null;
        this.inputGainNode = null;
        this.inputSourceNode = null;
        this.inputStream = null;
        this.mediaStreamDestination = null;
        this.mediaRecorder = null;
    }

    public stopRecording(project: Project): Promise<Blob | null> {
        return new Promise(resolve => {
            if (!this.mediaRecorder) {
                resolve(null);
                return;
            }
            this.mediaRecorder.onstop = async () => {
                if (this.recordingChunks.length === 0) {
                    resolve(null);
                    return;
                }
                const mimeType = this.mediaRecorder?.mimeType || this.recordingChunks[0]?.type || 'audio/webm';
                const rawAudioBlob = new Blob(this.recordingChunks, { type: mimeType });
                this.recordingChunks = [];
                
                this.cleanupRecordingNodes();
                
                // --- 3. Post-Normalization ---
                const normalizedBlob = await this.normalizeAudioBlob(rawAudioBlob);
                resolve(normalizedBlob);
            };
            if(this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
            }
        });
    }

    private async normalizeAudioBlob(blob: Blob): Promise<Blob> {
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            let peak = 0;
            for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
                const data = audioBuffer.getChannelData(i);
                for (let j = 0; j < data.length; j++) {
                    peak = Math.max(peak, Math.abs(data[j]));
                }
            }
            
            if (peak === 0) return blob; // It's silence, no need to process
            
            // Target a peak of -3dBFS for a professional, non-clipped final volume.
            const NORMALIZATION_TARGET_PEAK = 0.7079; // ~ -3 dBFS
            const gain = NORMALIZATION_TARGET_PEAK / peak;
            
            // Only boost volume, don't reduce. The real-time limiter should prevent clipping.
            if (gain > 1) {
                 const offlineContext = new OfflineAudioContext(
                    audioBuffer.numberOfChannels,
                    audioBuffer.length,
                    audioBuffer.sampleRate
                );

                const source = offlineContext.createBufferSource();
                source.buffer = audioBuffer;

                const gainNode = offlineContext.createGain();
                gainNode.gain.value = gain;

                source.connect(gainNode);
                gainNode.connect(offlineContext.destination);
                source.start(0);
                
                const renderedBuffer = await offlineContext.startRendering();
                return this.audioBufferToWavBlob(renderedBuffer);
            }
            return blob; // Return original if it's already loud enough
        } catch (e) {
            console.error("Failed to normalize audio, returning original blob.", e);
            return blob;
        }
    }
    
    public setInputGain(gainValue: number) {
        if (this.inputGainNode) {
            this.inputGainNode.gain.setTargetAtTime(gainValue, this.audioContext.currentTime, 0.01);
        }
    }

    private createTrackNodes(track: Track) {
        if (this.trackNodes.has(track.id)) {
            const oldNode = this.trackNodes.get(track.id);
            oldNode?.gain.disconnect();
            oldNode?.pan.disconnect();
            oldNode?.effects.forEach(n => n.disconnect());
        }

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = track.volume / 100;

        const panNode = this.audioContext.createStereoPanner();
        panNode.pan.value = track.pan / 100;
        
        const { connectionChain, updatableNodes } = this.buildEffects(track.effects);

        gainNode.connect(panNode);
        panNode.connect(this.audioContext.destination);

        this.trackNodes.set(track.id, { gain: gainNode, pan: panNode, effects: connectionChain, updatableNodes, sourceNodes: new Set() });
    }

    private buildEffects(effects: AudioEffect[]): BuiltEffects {
        const context = this.audioContext;
        const connectionChain: AudioNode[] = [];
        const updatableNodes: BuiltEffects['updatableNodes'] = {};
        
        effects.filter(e => e.isEnabled).forEach(effect => {
             switch (effect.name) {
                case 'Reverb': {
                     const convolver = context.createConvolver();
                     const sampleRate = context.sampleRate;
                     const length = sampleRate * 1.5;
                     const impulse = context.createBuffer(2, length, sampleRate);
                     for(let i=0; i < impulse.numberOfChannels; i++) {
                         const channel = impulse.getChannelData(i);
                         for(let j=0; j < length; j++) {
                             channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 2);
                         }
                     }
                     convolver.buffer = impulse;
                     const gain = context.createGain();
                     gain.gain.value = (effect.params.mix || 50) / 100;
                     connectionChain.push(convolver, gain);
                     updatableNodes[effect.id] = { name: 'Reverb', nodes: [gain] };
                     break;
                }
                case 'Delay': {
                     const delay = context.createDelay(2.0);
                     delay.delayTime.value = effect.params.time || 0.5;
                     const feedback = context.createGain();
                     feedback.gain.value = effect.params.feedback || 0.4;
                     delay.connect(feedback);
                     feedback.connect(delay);
                     connectionChain.push(delay);
                     updatableNodes[effect.id] = { name: 'Delay', nodes: [delay, feedback] };
                     break;
                }
                case 'EQ': {
                    const bass = context.createBiquadFilter();
                    bass.type = "lowshelf";
                    bass.frequency.value = 250;
                    bass.gain.value = effect.params.bass || 0;
                    
                    const mid = context.createBiquadFilter();
                    mid.type = "peaking";
                    mid.frequency.value = 1000;
                    mid.Q.value = 1;
                    mid.gain.value = effect.params.mid || 0;

                    const treble = context.createBiquadFilter();
                    treble.type = "highshelf";
                    treble.frequency.value = 4000;
                    treble.gain.value = effect.params.treble || 0;

                    connectionChain.push(bass, mid, treble);
                    updatableNodes[effect.id] = { name: 'EQ', nodes: [bass, mid, treble] };
                    break;
                }
                case 'Compressor': {
                    const compressor = context.createDynamicsCompressor();
                    compressor.threshold.value = effect.params.threshold || -24;
                    compressor.ratio.value = effect.params.ratio || 4;
                    compressor.attack.value = effect.params.attack || 0.01;
                    compressor.release.value = effect.params.release || 0.2;
                    connectionChain.push(compressor);
                    updatableNodes[effect.id] = { name: 'Compressor', nodes: [compressor] };
                    break;
                }
            }
        });
        
        return { connectionChain, updatableNodes };
    }
    
    public updateTrackVolume(trackId: number, volume: number) {
        const node = this.trackNodes.get(trackId);
        if (node) {
            node.gain.gain.setTargetAtTime(volume / 100, this.audioContext.currentTime, 0.01);
        }
    }

    public updateTrackPan(trackId: number, pan: number) {
        const node = this.trackNodes.get(trackId);
        if (node) {
            node.pan.pan.setTargetAtTime(pan / 100, this.audioContext.currentTime, 0.01);
        }
    }

    public updateTrackEffectParam(trackId: number, effectId: string, param: string, value: number) {
        const trackNode = this.trackNodes.get(trackId);
        if (!trackNode || !trackNode.updatableNodes[effectId]) return;

        const { name, nodes } = trackNode.updatableNodes[effectId];

        switch (name) {
            case 'Reverb': {
                if (param === 'mix') {
                    const gainNode = nodes[0] as GainNode;
                    gainNode.gain.setTargetAtTime(value / 100, this.audioContext.currentTime, 0.01);
                }
                break;
            }
            case 'Delay': {
                if (param === 'time') {
                    const delayNode = nodes[0] as DelayNode;
                    delayNode.delayTime.setTargetAtTime(value, this.audioContext.currentTime, 0.01);
                } else if (param === 'feedback') {
                    const feedbackGainNode = nodes[1] as GainNode;
                    feedbackGainNode.gain.setTargetAtTime(value, this.audioContext.currentTime, 0.01);
                }
                break;
            }
            case 'EQ': {
                if (param === 'bass') {
                    const bassNode = nodes[0] as BiquadFilterNode;
                    bassNode.gain.setTargetAtTime(value, this.audioContext.currentTime, 0.01);
                } else if (param === 'mid') {
                    const midNode = nodes[1] as BiquadFilterNode;
                    midNode.gain.setTargetAtTime(value, this.audioContext.currentTime, 0.01);
                } else if (param === 'treble') {
                    const trebleNode = nodes[2] as BiquadFilterNode;
                    trebleNode.gain.setTargetAtTime(value, this.audioContext.currentTime, 0.01);
                }
                break;
            }
            case 'Compressor': {
                const compressorNode = nodes[0] as DynamicsCompressorNode;
                if (param === 'threshold') {
                    compressorNode.threshold.setTargetAtTime(value, this.audioContext.currentTime, 0.01);
                } else if (param === 'ratio') {
                    compressorNode.ratio.setTargetAtTime(value, this.audioContext.currentTime, 0.01);
                } else if (param === 'attack') {
                    compressorNode.attack.setTargetAtTime(value, this.audioContext.currentTime, 0.01);
                } else if (param === 'release') {
                    compressorNode.release.setTargetAtTime(value, this.audioContext.currentTime, 0.01);
                }
                break;
            }
        }
    }
    
    public async exportProject(project: Project): Promise<Blob | null> {
        await this.loadProject(project);
        const maxDuration = project.tracks.reduce((max, track) => {
            const trackMax = track.clips.reduce((clipMax, clip) => Math.max(clipMax, clip.startTime + clip.duration), 0);
            return Math.max(max, trackMax);
        }, 0);

        if (maxDuration === 0) return null;

        const offlineContext = new OfflineAudioContext(2, this.audioContext.sampleRate * maxDuration, this.audioContext.sampleRate);

        const soloedTracks = project.tracks.filter(t => t.isSolo);
        const tracksToRender = soloedTracks.length > 0 ? soloedTracks : project.tracks.filter(t => !t.isMuted);

        for (const track of tracksToRender) {
            const trackGainNode = offlineContext.createGain();
            trackGainNode.gain.value = track.volume / 100;

            const panNode = offlineContext.createStereoPanner();
            panNode.pan.value = track.pan / 100;
            
            trackGainNode.connect(panNode);
            panNode.connect(offlineContext.destination);

            for (const clip of track.clips) {
                const buffer = this.audioBuffers.get(clip.url);
                if (buffer) {
                    const source = offlineContext.createBufferSource();
                    source.buffer = buffer;
                    
                    const clipGainNode = offlineContext.createGain();
                    clipGainNode.gain.value = clip.gain ?? 1;
                    
                    source.connect(clipGainNode);
                    clipGainNode.connect(trackGainNode);
                    source.start(clip.startTime, 0, clip.duration);
                }
            }
        }

        const renderedBuffer = await offlineContext.startRendering();
        return this.audioBufferToWavBlob(renderedBuffer);
    }
    
    private audioBufferToWavBlob(buffer: AudioBuffer): Blob {
        const numOfChan = buffer.numberOfChannels;
        const length = buffer.length * numOfChan * 2 + 44;
        const bufferArr = new ArrayBuffer(length);
        const view = new DataView(bufferArr);
        const channels = [];
        let pos = 0;

        const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
        const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

        setUint32(0x46464952); // "RIFF"
        setUint32(length - 8);
        setUint32(0x45564157); // "WAVE"
        setUint32(0x20746d66); // "fmt "
        setUint32(16);
        setUint16(1);
        setUint16(numOfChan);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * 2 * numOfChan);
        setUint16(numOfChan * 2);
        setUint16(16);
        setUint32(0x61746164); // "data"
        setUint32(length - pos - 4);

        for (let i = 0; i < buffer.numberOfChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }

        let offset = 0;
        while (pos < length) {
            for (let i = 0; i < numOfChan; i++) {
                let sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }

        return new Blob([view], { type: 'audio/wav' });
    }
}

export const masterAudioEngine = new MasterAudioEngine();

// The rest of the file remains for virtual instrument logic if needed, but is unused by the main DAW playback.

// Note frequencies for a standard piano keyboard (C4 to B5)
const noteFrequencies: { [key:string]: number } = {
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
};

// Sound characteristics for different instruments
const instrumentConfigs: { [key: string]: { wave: OscillatorType, adsr: { attack: number, decay: number, sustain: number, release: number } } } = {
    'Grand Piano':         { wave: 'sine',   adsr: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.2 } },
    '80s Synth Lead':      { wave: 'sawtooth', adsr: { attack: 0.05, decay: 0.2, sustain: 0.8, release: 0.3 } },
    'Celestial Pad':       { wave: 'triangle', adsr: { attack: 0.5, decay: 0.5, sustain: 0.7, release: 1.0 } },
    'Stardust Lead':       { wave: 'square',   adsr: { attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.4 } },
    'Electric Bass':       { wave: 'sine',   adsr: { attack: 0.02, decay: 0.15, sustain: 0.7, release: 0.1 } },
    'Funk Bass':           { wave: 'square',   adsr: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 } },
    'default':             { wave: 'sine',   adsr: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.2 } },
};
