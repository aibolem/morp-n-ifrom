// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

// Web browser sound player using XAudioJS by Grant Galitz (https://github.com/taisel/XAudioJS)
// XAudioJS is not in npm so you need to sort out the dependency manually.

// Pass in an instance of MorseCWWave (or something with a getSample method)
var MorsePlayerXAS = function(morseCWWave, xaudioServerClass) {
    this.morseCWWave = morseCWWave;
    this.xaudioServerClass = xaudioServerClass;
    this.isPlayingB = false;
    this.sample = [];
    this.volume = 1;  // not currently settable
    this.samplePos = undefined;
    this.noAudio = false;
    this.audioServer = undefined;
    this.sampleRate = morseCWWave.sampleRate || 8000;  // Player's samplerate will not update with the wave ref

    for (var i = 0; i < this.sampleRate; i += 1) {
        this.silence.push(0.0);
    }

    var that = this;  // needed so that the 3 closures defined here keep a reference to this object

    // XAudioJS callback to get more samples for buffer
    function audioGenerator(samplesToGenerate) {
        if (samplesToGenerate === 0) {
            return [];
        }
        var ret;
        samplesToGenerate = Math.min(samplesToGenerate, that.sample.length - that.samplePos);
        if (samplesToGenerate > 0) {
            ret = that.sample.slice(that.samplePos, that.samplePos + samplesToGenerate);
            that.samplePos += samplesToGenerate;
            return ret;
        } else {
            that.isPlayingB = false;
            return [];
        }
    }

    // XAudioJS failure callback
    function failureCallback() {
        that.noAudio = true;
    }

    console.log("Trying XAudioServer");

    this.audioServer = new this.xaudioServerClass(
        1,                      // number of channels
        this.sampleRate,        // sample rate
        this.sampleRate >> 2,   // buffer low point for underrun callback triggering
        this.sampleRate << 1,   // internal ring buffer size
        audioGenerator,         // audio refill callback triggered when samples remaining < buffer low point
        this.volume,            // volume
        failureCallback         // callback triggered when the browser is found to not support any audio API
    );

    setInterval(
        function () {
            // Runs the check to see if we need to give more audio data to the lib
            if (that.isPlayingB) {
                that.audioServer.executeCallback();
            }
        }, 20
    );
};

MorsePlayerXAS.prototype = {

    constructor: MorsePlayerXAS,

    silence: [],

    stop: function() {
        this.isPlayingB = false;
        this.audioServer.changeVolume(0);
        this.sample = [];
    },

    play: function(message) {
        this.stop();
        this.sample = this.morseCWWave.getSample().concat(this.silence);  // add on a second of silence to the end to keep IE quiet
        this.isPlayingB = true;
        this.samplePos = 0;
        this.audioServer.changeVolume(this.volume);
    },

    hasError: function() {
        return this.noAudio;
    },

    isPlaying: function() {
        return this.isPlayingB;
    },

    getAudioType: function() {
        return this.audioServer.audioType;
        // 3: Audio element using media stream worker
        // 2: Flash
        // 1: Web Audio API with webkit and native support
        // 0: Audio element using Mozilla Audio Data API (https://wiki.mozilla.org/Audio_Data_API)
        // -1: no audio support
    }
};
