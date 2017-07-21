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
    constructor() {
        console.log("Trying Web Audio API (Oscillators)");
        this.audioContextClass = window.AudioContext || window.webkitAudioContext;
        if (this.audioContextClass === undefined) {
            this.noAudio = true;
            throw (new Error("No AudioContext class defined"));
        }
        this.isPlayingB = false;
        this.noAudio = false;
        this._volume = 1;
        this.timings = undefined;
        this.frequency = undefined;
    }

    initialiseAudioNodes() {
        this.audioContext = new this.audioContextClass();
        this.splitterNode = this.audioContext.createGain();  // this is here to attach other nodes to in subclass
        this.gainNode = this.audioContext.createGain();  // this is actually used for volume
        this.splitterNode.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        this.gainNode.gain.value = this._volume;
    }

    set volume(v) {
        this._volume = v;
        this.gainNode.gain.value = v;
    }

    get volume() {
        return this._volume;
    }

    stop() {
        if (this.isPlayingB) {
            this.isPlayingB = false;
            this.audioContext.close();
        }
    }

    // Convenience method to help playing directly from a MorseCWWave instance.
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

        this.initialiseAudioNodes();
        this.isPlayingB = true;

        var cumT = this.audioContext.currentTime;
        for (var t = 0; t < this.timings.length; t += 1) {
            var duration = this.timings[t] / 1000;
            if (duration > 0) {
                var oscillator = this.audioContext.createOscillator();
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
