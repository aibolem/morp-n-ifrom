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
     * Get a running AudioContext. If a running context cannot be returned then an Error is thrown.
     * On Safari and Chrome you will only get a running context upon user interaction.
     * With Firefox you need to call this method twice, the second time must be upon a user interaction.
     */
    getAudioContext() {
        if (this.suspendedAudioContext !== undefined) {
            // Then we've previously made one but it's suspended
            // Firefox can use it, Chrome and Safari do not
            this.suspendedAudioContext.resume();  // Probably unnecessary but can't hurt
            if (this.suspendedAudioContext.state === "running") {
                // Firefox gets here upon user interaction (assuming we have a suspended AudioContext)
                console.log("Successfully resumed saved AudioContext");
                this.audioContext = this.suspendedAudioContext;
                this.suspendedAudioContext = undefined;
                this.useRunningAudioContext();
                return this.audioContext;
            } else {
                // Most browsers do not succeed to resume a context created without a user interaction and get here
                console.log("Failed to resume saved AudioContext");
                this.suspendedAudioContext.close();
                this.suspendedAudioContext = undefined;
            }
        }
        if (this.audioContext === undefined) {
            this.audioContext = new this.AudioContext();
            this.audioContext.resume();  // Probably needed by Firefox but does not happen quickly enough for the following test
            this.audioContext.createGain();  // Needed on safari to kick it out of suspended state before we test it
            // see https://stackoverflow.com/questions/56768576/safari-audiocontext-suspended-even-with-onclick-creation
            // also see https://artandlogic.com/2019/07/unlocking-the-web-audio-api/ for other ideas
            if (this.audioContext.state === "suspended") {
                // Firefox will get here even upon user interaction as the AudioContext does not resume quickly enough
                console.log("Created suspended AudioContext");
                this.suspendedAudioContext = this.audioContext;
                this.audioContext = undefined;
                throw new Error("AudioContext created before user interaction");
            } else {
                console.log("Created running AudioContext");
                this.useRunningAudioContext();
                return this.audioContext;
            }
        } else {
            return this.audioContext;
        }
    }

    /**
     * Called when we get a running AudioContext
     */
    useRunningAudioContext() {
        while (this.decodeQueue.length !== 0) {
            this.decodeSample(this.decodeQueue.pop());
        }
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
        // If audioContext exists then it will also be running
        if (this.audioContext === undefined) {
            this.decodeQueue.push(key);
        } else {
            console.log(`Decoding audio file (${key})`);
            // Promise-based syntax does not work for Safari desktop, need to use callback variant
            // https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
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