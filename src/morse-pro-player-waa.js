/*
This code is © Copyright Stephen C. Phillips, 2017.
Email: steve@scphillips.com

Licensed under the EUPL, Version 1.2 or – as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at: https://joinup.ec.europa.eu/community/eupl/
Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the Licence for the specific language governing permissions and limitations under the Licence.
*/

/**
 * Web browser sound player using Web Audio API.
 *
 * @example
 * import MorseCWWave from 'morse-pro-cw-wave';
 * import MorsePlayerWAA from 'morse-pro-player-waa';
 * var morseCWWave = new MorseCWWave();
 * morseCWWave.translate("abc");
 * var morsePlayerWAA = new MorsePlayerWAA();
 * morsePlayerWAA.loadCWWave(morseCWWave);
 * morsePlayerWAA.playFromStart();
 */
export default class MorsePlayerWAA {
    constructor(soundStoppedCallback) {
        if (soundStoppedCallback !== undefined) this.soundStoppedCallback = soundStoppedCallback;
        this._noAudio = false;
        console.log("Trying Web Audio API (Oscillators)");
        this.audioContextClass = window.AudioContext || window.webkitAudioContext;
        if (this.audioContextClass === undefined) {
            this._noAudio = true;
            throw (new Error("No AudioContext class defined"));
        }

        this.loop = false;
        this.frequency = undefined;

        this._cTimings = [];
        this._isPlaying = false;
        this._isPaused = false;
        this._volume = 1;
        this._lookAheadTime = 0.1;  // seconds
        this._timerInterval = 50;  // milliseconds
        this._timer = undefined;
    }

    /**
     * @access: private
     */
    _initialiseAudioNodes() {
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

    /**
     * Convenience method to help playing directly from a MorseCWWave instance.
     * @param {Object} cwWave - a MorseCWWave instance
     */
    loadCWWave(cwWave) {
        this.load(cwWave.getTimings('/'), cwWave.frequency);
    }

    load(timings, frequency) {
        // console.log('Timings: ' + timings);
        this._cTimings = [0];
        this.isNote = [];
        for (var i = 0; i < timings.length; i++) {
            this._cTimings[i + 1] = this._cTimings[i] + Math.abs(timings[i]) / 1000;  // AudioContext runs in seconds not ms
            this.isNote[i] = timings[i] > 0;
        }
        this.sequenceLength = this.isNote.length;
        this.frequency = frequency;
    }

    playFromStart() {
        if (this._noAudio || this._cTimings.length === 0) {
            return;
        }

        this.stop();

        this._initialiseAudioNodes();
        this.nextNote = 0;
        this._isPlaying = true;
        this._isPaused = true;  // to make play() work
        this.play();
    }

    play() {
        if (!this._isPlaying) {
            // if we're not actually playing then play from start
            this.playFromStart();
        }
        if (!this._isPaused) {
            //  if we're not actually paused then ignore this
            return;
        }
        this._isPaused = false;
        this.timeBase = this.audioContext.currentTime - this._cTimings[this.nextNote] + 0.2;  // add a bit on to make sure we get the first note
        clearInterval(this._timer);
        this._timer = setInterval(function () {
            this._scheduleNotes();
        }.bind(this), this._timerInterval);
    }

    pause() {
        if (!this._isPlaying) {
            // if we're not actually playing then ignore this
            return;
        }
        this._isPaused = true;
        clearInterval(this._timer);
    }

    stop() {
        if (this._isPlaying) {
            this._isPlaying = false;
            this._isPaused = false;
            clearInterval(this._timer);
            this.audioContext.close();
            this.soundStoppedCallback();
        }
    }
    /**
     * Schedule the next few notes up to now + lookAheadTime.
     * @access: private
     */
    _scheduleNotes() {
        var now = this.audioContext.currentTime;
        //console.log('Scheduling:');
        while (this.nextNote < this.sequenceLength && (this._cTimings[this.nextNote] < now - this.timeBase + this._lookAheadTime)) {
            //console.log(this.nextNote + ' at ' + this._cTimings[this.nextNote] + ' for ' + (this._cTimings[this.nextNote + 1] - this._cTimings[this.nextNote]) + ' ' +  this.isNote[this.nextNote]);
            if (this.isNote[this.nextNote]) {
                var oscillator = this.audioContext.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.value = this.frequency;
                oscillator.connect(this.splitterNode);
                oscillator.start(this.timeBase + this._cTimings[this.nextNote]);
                oscillator.stop(this.timeBase + this._cTimings[this.nextNote + 1]);
            }
            this.nextNote++;
            if (this.loop && this.nextNote === this.sequenceLength) {
                this.timeBase += this._cTimings[this.nextNote];
                this.nextNote = 0;
            }
        }
        if (this.nextNote === this.sequenceLength) {
            // then all notes have been scheduled and we are not looping
            clearInterval(this._timer);
            // stop() at now + lookAheadTime + length of last note (milliseconds)
            setTimeout(function() {
                this.stop();
            }.bind(this), 1000 * (this._lookAheadTime + this._cTimings[this.sequenceLength] - this._cTimings[this.sequenceLength - 1]));
        }
    }

    hasError() {
        return this._noAudio;
    }

    get isPlaying() {
        return this._isPlaying;
    }

    get isPaused() {
        return this._isPaused;
    }

    get audioType() {
        return 4;
        // 4: Web Audio API using oscillators
        // 3: Audio element using media stream worker (using PCM audio data)
        // 2: Flash (using PCM audio data)
        // 1: Web Audio API with webkit and native support (using PCM audio data)
        // 0: Audio element using Mozilla Audio Data API (https://wiki.mozilla.org/Audio_Data_API) (using PCM audio data)
        // -1: no audio support
    }

    // empty callbacks in case user does not define any
    soundStoppedCallback() { }
}
