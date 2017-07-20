// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

/*
    Web browser sound player using Web Audio API.

    Usage:

    import MorseCWWave from 'morse-pro-cw-wave';
    import MorsePlayerWAA from 'morse-pro-player-waa';

    var morseCWWave = new MorseCWWave();
    morseCWWave.translate("abc");

    var morsePlayerWAA = new MorsePlayerWAA();
    morsePlayerWAA.loadCWWave(morseCWWave);
    morsePlayerWAA.playFromStart();
*/
export default class MorsePlayerWAA {
    constructor(audioContextClass = undefined) {
        console.log("Trying Web Audio API (Oscillators)");
        this.audioContextClass = audioContextClass || window.AudioContext || window.webkitAudioContext;
        this.isPlayingB = false;
        this.noAudio = true;
        this.audioCtx = this.getAudioContext();
        this.volume = 1;
        this.timings = undefined;
        this.frequency = undefined;
    }

    getAudioContext() {
        this.noAudio = true;
        var ctx;
        if (this.audioContextClass === undefined) {
            throw (new Error("No AudioContext class defined"));
        } else {
            ctx = new this.audioContextClass();
            this.splitterNode = ctx.createGain();  // this is here to attach other nodes to in subclass
            this.gainNode = ctx.createGain();  // this is actually used for volume
            this.splitterNode.connect(this.gainNode);
            this.gainNode.connect(ctx.destination);
            this.noAudio = false;
        }
        return ctx;
    }

    set volume(v) {
        this.gainNode.gain.value = v;
    }

    get volume() {
        return this.gainNode.gain.value;
    }

    stop() {
        this.isPlayingB = false;
        this.audioCtx.close();
        this.audioCtx = this.getAudioContext();
    }

    loadCWWave(cwWave) {
        this.load(cwWave.getTimings(), cwWave.frequency);
    }

    load(timings, frequency) {
        this.timings = timings;
        this.frequency = frequency;
    }

    playFromStart() {
        if (this.noAudio) {
            return;
        }

        this.stop();

        if (this.timings.length === 0) {
            return [];
        }

        this.isPlayingB = true;

        var cumT = this.audioCtx.currentTime;
        for (var t = 0; t < this.timings.length; t += 1) {
            var duration = this.timings[t] / 1000;
            if (duration > 0) {
                var oscillator = this.audioCtx.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.value = this.frequency;
                oscillator.connect(this.splitterNode);
                oscillator.start(cumT);
                oscillator.stop(cumT + duration);
                cumT += duration;
            } else {
                cumT += -duration;
            }
        }
    }

    hasError() {
        return this.noAudio;
    }

    isPlaying() {
        return this.isPlayingB;
    }

    getAudioType() {
        return 4;
        // 4: Web Audio API using oscillators
        // 3: Audio element using media stream worker (using PCM audio data)
        // 2: Flash (using PCM audio data)
        // 1: Web Audio API with webkit and native support (using PCM audio data)
        // 0: Audio element using Mozilla Audio Data API (https://wiki.mozilla.org/Audio_Data_API) (using PCM audio data)
        // -1: no audio support
    }
}
