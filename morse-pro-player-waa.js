// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/*
    Web browser sound player using Web Audio API.
    Pass in an instance of MorseCWWave and window.AudioContext.

    Usage:

    var morsePro = new MorsePro();
    var morseMessage = new MorseMessage(morsePro);
    var morseCW = new MorseCW(morseMessage);
    var morseCWWave = new MorseCWWave(morseCW);
    var audioCtxClass = window.AudioContext || window.webkitAudioContext;
    var morsePlayerWAA = new MorsePlayerWAA(morseCWWave, audioCtxClass);

    morseCW.setWPM(25);  // set the speed to 25 wpm
    morseCW.setFWPM(10);  // set the Farnsworth speed to 10 wpm
    morseCWWave.sampleRate = 8000;  // per second
    morseCWWave.frequency = 600;  // frequency in Hz

    morseMessage.translate("abc");
    morsePlayerWAA.play();
*/
var MorsePlayerWAA = function(morseCWWave, audioContextClass) {
    console.log("Trying Web Audio API (Oscillators)");
    this.morseCWWave = morseCWWave;
    this.audioContextClass = audioContextClass;
    this.isPlayingB = false;
    this.volume = 1;  // not currently settable
    this.noAudio = true;
    this.audioCtx = this.getAudioContext();
};

MorsePlayerWAA.prototype = {

    constructor: MorsePlayerWAA,

    getAudioContext: function() {
        this.noAudio = true;
        var ctx;
        if (this.audioContextClass === undefined) {
            throw (new Error("No AudioContext class defined"));
        } else {
            ctx = new this.audioContextClass();
            this.noAudio = false;
        }
        return ctx;
    },

    stop: function() {
        this.isPlayingB = false;
        this.audioCtx.close();
        this.audioCtx = this.getAudioContext();
    },

    play: function() {
        if (this.noAudio) {
            return;
        }

        this.stop();

        var timings = this.morseCWWave.morseCW.getTimings();
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
                oscillator.frequency.value = this.morseCWWave.frequency;
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
