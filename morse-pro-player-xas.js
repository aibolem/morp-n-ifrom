// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

/*
    Web browser sound player for older browsers, using XAudioJS by Grant Galitz (https://github.com/taisel/XAudioJS)
    Pass in an instance of MorseCWWave and the XAudioServer class.

    Usage:

    var morseCWWave = new MorseCWWave();
    morseCWWave.wpm = 25;  // set the speed to 25 wpm
    morseCWWave.fwpm = 10;  // set the Farnsworth speed to 10 wpm
    morseCWWave.sampleRate = 8000;  // per second
    morseCWWave.frequency = 600;  // frequency in Hz
    morseCWWave.translate("abc");

    var morsePlayerXAS = new MorsePlayerXAS(XAudioServer);
    morsePlayerXAS.load(morseCWWave);
    morsePlayerXAS.playFromStart();
*/
export default class MorsePlayerXAS {
    constructor(xaudioServerClass) {
        this.xaudioServerClass = xaudioServerClass;
        this.isPlayingB = false;
        this.sample = [];
        this.silence = [];  // TODO should be const and not per instance
        this.volume = 1;  // not currently settable
        this.samplePos = undefined;
        this.noAudio = false;
        this.audioServer = undefined;
        this.sampleRate = undefined;
        this.sample = undefined;

        for (var i = 0; i < this.sampleRate; i += 1) {
            this.silence.push(0.0);
        }

        var that = this;  // needed so that the 3 closures defined here keep a reference to this object

        // XAudioJS callback to get more samples for buffer
        this.audioGenerator = function(samplesToGenerate) {
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
        };

        // XAudioJS failure callback
        this.failureCallback = function() {
            that.noAudio = true;
        };

        setInterval(
            function () {
                // Runs the check to see if we need to give more audio data to the lib
                if (that.isPlayingB) {
                    that.audioServer.executeCallback();
                }
            }, 20
        );

        this._load();  // create an xAudioServer so that we know if it works at all and what type it is
    }

    stop() {
        this.isPlayingB = false;
        this.audioServer.changeVolume(0);
    }

    load(morseCWWave) {
        this._load(morseCWWave.getSample(), morseCW.sampleRate);
    }

    _load(sample, sampleRate) {
        this.sample = (sample || []).concat(this.silence);  // add on a second of silence to the end to keep IE quiet
        this.sampleRate = sampleRate || 8000;

        console.log("Trying XAudioServer");

        this.audioServer = new this.xaudioServerClass(
            1,                      // number of channels
            this.sampleRate,        // sample rate
            this.sampleRate >> 2,   // buffer low point for underrun callback triggering
            this.sampleRate << 1,   // internal ring buffer size
            this.audioGenerator,    // audio refill callback triggered when samples remaining < buffer low point
            0,                      // volume
            this.failureCallback    // callback triggered when the browser is found to not support any audio API
        );
    }

    playFromStart() {
        this.stop();
        this.isPlayingB = true;
        this.samplePos = 0;
        this.audioServer.changeVolume(this.volume);
    }

    hasError() {
        return this.noAudio;
    }

    isPlaying() {
        return this.isPlayingB;
    }

    getAudioType() {
        return this.audioServer.audioType;
        // 3: Audio element using media stream worker
        // 2: Flash
        // 1: Web Audio API with webkit and native support
        // 0: Audio element using Mozilla Audio Data API (https://wiki.mozilla.org/Audio_Data_API)
        // -1: no audio support
    }
}
