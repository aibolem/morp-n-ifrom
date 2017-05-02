// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

// Web browser sound player using Web Audio API.

//TODO: sort out how to get and where to store an AudioContext
Morse.AudioContext = window.AudioContext || window.webkitAudioContext;

// Pass in an instance of MorseCWWave (or something with a getSample method)
MorsePlayerWAA = function(wave) {
    this.wave = wave;
    this.isPlayingB = false;
    this.volume = 1;  // not currently settable
    this.noAudio = false;

    // create web audio api context
    console.log("Trying Web Audio API");
    if (Morse.AudioContext === undefined) {
        this.noAudio = true;
    } else {
        this.audioCtx = new Morse.AudioContext();
    }
};

MorsePlayerWAA.prototype = {

    constructor: MorsePlayerWAA,

    stop: function() {
        this.isPlayingB = false;
        this.audioCtx.close();
        this.audioCtx = new Morse.AudioContext();
    },

    play: function(message) {
        if (this.noAudio) {
            return;
        }

        this.stop();

        var timings = this.wave.cw.getTimings();
        if (timings.length === 0) {
            return [];
        }

        this.isPlayingB = true;

        var cumT = this.audioCtx.currentTime;
        for (var t = 0; t < timings.length; t += 1) {
            var duration = timings[t] / 1000;
            if (duration > 0) {
                var oscillator = this.audioCtx.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.value = this.wave.frequency;
                oscillator.connect(this.audioCtx.destination);
                oscillator.start(cumT);
                oscillator.stop(cumT + duration);
                cumT += duration;
            } else {
                cumT += -duration;
            }
        }
    },

    hasError: function() {
        return this.noAudio;
    },

    isPlaying: function() {
        return this.isPlayingB;
    },

    getAudioType: function() {
        return 4;
        // 4: Web Audio API using oscillators
        // 3: Audio element using media stream worker (using PCM audio data)
        // 2: Flash (using PCM audio data)
        // 1: Web Audio API with webkit and native support (using PCM audio data)
        // 0: Audio element using Mozilla Audio Data API (https://wiki.mozilla.org/Audio_Data_API) (using PCM audio data)
        // -1: no audio support
    }
};

module.exports = {
    MorsePlayerWAA: MorsePlayerWAA
};
