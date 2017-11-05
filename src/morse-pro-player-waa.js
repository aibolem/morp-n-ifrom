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
    constructor(sequenceStartCallback, sequenceEndingCallback, soundStoppedCallback) {
        if (sequenceStartCallback !== undefined) this.sequenceStartCallback = sequenceStartCallback;
        if (sequenceEndingCallback !== undefined) this.sequenceEndingCallback = sequenceEndingCallback;
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
        this._timerInterval = 0.05;  // seconds
        this._timer = undefined;
        this._stopTimer = undefined;
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
        this.load(cwWave.getTimings('///'));  // TODO: get the padding out of here and into the trainer
        this.frequency = cwWave.frequency;
    }

    load(timings) {
        // console.log('Timings: ' + timings);
        this._cTimings = [0];
        this.isNote = [];
        for (var i = 0; i < timings.length; i++) {
            this._cTimings[i + 1] = this._cTimings[i] + Math.abs(timings[i]) / 1000;  // AudioContext runs in seconds not ms
            this.isNote[i] = timings[i] > 0;
        }
        this.sequenceLength = this.isNote.length;
    }

    loadNext(timings) {
        this.upNext = timings;
    }

    playFromStart() {
        if (this._noAudio || this._cTimings.length === 0) {
            return;
        }

        this.stop();

        this._initialiseAudioNodes();
        this._nextNote = 0;
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
        clearInterval(this._stopTimer);  // if we were going to send a soundStoppedCallback then don't
        clearInterval(this._startTimer);  // ditto
        clearInterval(this._timer);
        this._isPaused = false;
        this.timeBase = this.audioContext.currentTime - this._cTimings[this._nextNote] + 0.2;  // add a bit on to make sure we get the first note
        this._timer = setInterval(function () {
            this._scheduleNotes();
        }.bind(this), 1000 * this._timerInterval);
    }

    pause() {
        if (!this._isPlaying) {
            // if we're not actually playing then ignore this
            return;
        }
        this._isPaused = true;
        clearInterval(this._timer);

        // ensure that the next note that is scheduled is a beep, not a pause (to help sync with vibration patterns)
        if (!this.isNote[this._nextNote]) {
            this._nextNote++;
            if (this.loop) {
                this._nextNote %= this.sequenceLength;
            }
        }
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
        while (this._nextNote < this.sequenceLength && (this._cTimings[this._nextNote] < now - this.timeBase + this._lookAheadTime)) {
            //console.log(this._nextNote + ' at ' + this._cTimings[this._nextNote] + ' for ' + (this._cTimings[this._nextNote + 1] - this._cTimings[this._nextNote]) + ' ' +  this.isNote[this._nextNote]);
            if (this._nextNote === 0 && !this.sequenceStartCallbackFired) {
                // when scheduling the first note, schedule a callback as well
                this._startTimer = setTimeout(function() {
                    this.sequenceStartCallback();
                }.bind(this), 1000 * (this.timeBase - now + this._cTimings[this._nextNote]));
                this.sequenceStartCallbackFired = true;
                this.sequenceEndingCallbackFired = false;
            }
            if (this.isNote[this._nextNote]) {
                var oscillator = this.audioContext.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.value = this.frequency;
                oscillator.connect(this.splitterNode);
                oscillator.start(this.timeBase + this._cTimings[this._nextNote]);
                oscillator.stop(this.timeBase + this._cTimings[this._nextNote + 1]);
            }
            this._nextNote++;
            if (this._nextNote === this.sequenceLength) {
                if (this.loop || this.upNext !== undefined) {
                    this.timeBase += this._cTimings[this._nextNote];
                    this._nextNote = 0;
                    if (this.upNext !== undefined) {
                        this.load(this.upNext);
                        this.upNext = undefined;
                    }
                }
            }
        }
        if (this._nextNote === this.sequenceLength) {
            // then all notes have been scheduled and we are not looping
            clearInterval(this._timer);
            // schedule stop() at now + lookAheadTime + length of last note (milliseconds)
            this._stopTimer = setTimeout(function() {
                this.stop();
            }.bind(this), 1000 * (this._lookAheadTime + this._cTimings[this.sequenceLength] - this._cTimings[this.sequenceLength - 1]));
        } else if (now - this.timeBase + this._timerInterval + this._lookAheadTime > this._cTimings[this.sequenceLength - 1] && !this.sequenceEndingCallbackFired) {
            // then we are going to schedule the last note in the sequence next time
            this.sequenceEndingCallback();
            this.sequenceStartCallbackFired = false;
            this.sequenceEndingCallbackFired = true;
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

    get nextNote() {
        return this._nextNote;
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
    sequenceStartCallback() { }
    sequenceEndingCallback() { }
    soundStoppedCallback() { }
}
