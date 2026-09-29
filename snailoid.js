// Snail IDE Pitch Detection Extension
class PitchExtension {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.buffer = null;
        this.pitchHz = 0;
        this.noteNumber = 0;
        this.initialized = false;
    }

    async initMic() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.microphone.connect(this.analyser);
            this.analyser.fftSize = 2048;
            this.buffer = new Float32Array(this.analyser.fftSize);
            this.initialized = true;
        } catch (err) {
            console.error("Microphone access error:", err);
        }
    }

    detectPitch() {
        if (!this.initialized) return 0;
        this.analyser.getFloatTimeDomainData(this.buffer);
        let pitch = this.autoCorrelate(this.buffer, this.audioContext.sampleRate);
        if (pitch > 0) {
            this.pitchHz = pitch;
            this.noteNumber = Math.round(12 * Math.log2(pitch / 440) + 69); // MIDI note
        }
        return this.noteNumber;
    }

    autoCorrelate(buffer, sampleRate) {
        let SIZE = buffer.length;
        let sum = 0;
        let offset = 0;
        let maxSamples = Math.floor(SIZE / 2);
        let bestOffset = -1;
        let bestCorrelation = 0;
        let rms = 0;

        for (let i = 0; i < SIZE; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / SIZE);
        if (rms < 0.01) return -1;

        for (offset = 0; offset < maxSamples; offset++) {
            let correlation = 0;
            for (let i = 0; i < maxSamples; i++) {
                correlation += buffer[i] * buffer[i + offset];
            }
            correlation = correlation / maxSamples;
            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestOffset = offset;
            }
        }
        if (bestCorrelation > 0.9) {
            return sampleRate / bestOffset;
        }
        return -1;
    }
}

class PitchBlocks {
    constructor() {
        this.pitchExt = new PitchExtension();
    }

    getInfo() {
        return {
            id: 'pitchBlocks',
            name: 'Voice Pitch',
            blocks: [
                {
                    opcode: 'initMic',
                    blockType: Scratch.BlockType.COMMAND,
                    text: 'start microphone pitch detection'
                },
                {
                    opcode: 'getPitchNote',
                    blockType: Scratch.BlockType.REPORTER,
                    text: 'get pitch note'
                }
            ]
        };
    }

    async initMic() {
        await this.pitchExt.initMic();
    }

    getPitchNote() {
        return this.pitchExt.detectPitch();
    }
}

Scratch.extensions.register(new PitchBlocks());