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

    /**
     * Get an AudioContext. The state of the AudioContext may be "suspended".
     * On Safari and Chrome you will only get a running context upon user interaction.
     */
    getAudioContext() {
        // console.log("Getting AC");
        if (this.audioContext !== undefined) {
            if (this.audioContext.state === "running") {
                // console.log("AC is running");
                // return this.audioContext;
            } else {
                // console.log("AC is suspended");
                this.audioContext.resume().then(() => {this.useRunningAudioContext()});
            }
        } else {
            // console.log("Creating AudioContext");
            this.audioContext = new this.AudioContext();
            this.audioContext.createGain();  // Can help on Safari. Probably not needed but can't hurt
            this.audioContext.resume().then(() => {this.useRunningAudioContext()});  // Will only work if using Firefox (and will take a short while) or where this method is called the first time with a user interaction, otherwise will be ignored
        }
        return this.audioContext;
    }

    /**
     * Called when we get a running AudioContext
     */
    useRunningAudioContext() {
        // console.log("Flushing decoding queue: " + this.decodeQueue.length);
        // while (this.decodeQueue.length !== 0) {
        //     this.decodeSample(this.decodeQueue.pop());
        // }
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
        console.log(`Loading audio file (${key})`);
        let request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onload = () => {
            // Load the data and keep a reference to it
            console.log("File loaded");
            this.sounds[key] = request.response;
            this.decodeSample(key);
        };
        request.send();
    }

    decodeSample(key) {
        // Decoding seems to work even when AudioContext is suspended
        let ac = this.getAudioContext();
        console.log(`Decoding audio file (${key})`);
        // Promise-based syntax does not work for Safari desktop, need to use callback variant
        // https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
        ac.decodeAudioData(this.sounds[key], (buffer) => {
            this.sounds[key] = buffer;
        }, (e) => {
            console.log("Error decoding audio data: " + e);
        });
    }

    getSounds() {
        return this.sounds;
    }

    init() {
        function startAudio() {
            console.log("Starting audio via user interaction");
            document.removeEventListener("mousedown", startAudio);
            document.removeEventListener("touchend", startAudio);
            morseAudioContext.getAudioContext();
        }
        document.addEventListener("mousedown", startAudio);
        document.addEventListener("touchend", startAudio);
    }
}

const morseAudioContext = new MorseAudioContext();

export default morseAudioContext;