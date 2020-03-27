class MorseAudioContext {
    constructor() {
        this.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (this.AudioContext === undefined) {
            this.noAudio = true;
            console.log("Web Audio API unavailable");
            throw (new Error("No AudioContext class defined"));
        }
        this.decodeQueue = [];
        this.sounds = {};
    }

    getAudioContext() {
        if (this.audioContext === undefined) {
            this.audioContext = new this.AudioContext();
            if (this.audioContext.state === "suspended") {
                this.audioContext.close();
                this.audioContext = undefined;
                throw new Error("AudioContext created before user interaction");
            }
            while (this.decodeQueue.length !== 0) {
                this.decodeSample(this.decodeQueue.pop());
            }
        }
        return this.audioContext;
    }

    closeAudioContext() {
        if (this.audioContext !== undefined) {
            this.audioContext.close();
            this.audioContext = undefined;
        }
    }

    isInitialised() {
        return this.audioContext !== undefined;
    }

    loadSample(url, key) {
        let request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onload = () => {
            // Load the data and keep a reference to it
            this.sounds[key] = request.response;
            this.decodeSample(key);
        };
        request.send();
    }

    decodeSample(key) {
        if (this.audioContext === undefined) {
            this.decodeQueue.push(key);
        } else {
            // Promise-based syntax does not work for Safari desktop, need to use callback variant
            // https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
            // TODO: find another way to load samples or raise a warning as neither method works on Safari mobile
            // https://caniuse.com/#search=audiocontext%20decodeaudiodata
            this.audioContext.decodeAudioData(this.sounds[key], (buffer) => {
                    this.sounds[key] = buffer;
                }, (e) => {
                    console.log("Error decoding audio data" + e.err);
                }
            );
        }
    }

    getSounds() {
        return this.sounds;
    }
}

const instance = new MorseAudioContext();
export default instance;