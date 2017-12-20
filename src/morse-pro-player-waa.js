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
        this.loopPause = '///';  // arbitrary Morse sequence appended to loaded sequence before looping
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
        this.splitterNode = this.audioContext.createGain();  // this node is here to attach other nodes to in subclass
        this.lowPassNode = this.audioContext.createBiquadFilter();
        this.lowPassNode.type = "lowpass";
        this.lowPassNode.frequency.value = this.frequency * 1.5;  // TODO: remove this magic number and make the filter configurable
        this.gainNode = this.audioContext.createGain();  // this node is actually used for volume
        this.splitterNode.connect(this.lowPassNode);
        this.lowPassNode.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        this.gainNode.gain.value = this._volume * 0.813;  // multiply by 0.813 to reduce gain added by lowpass filter and avoid clipping
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
     * Adds a silent element to the end of the sequence, as defined by loopPause variable.
     * @param {Object} cwWave - a MorseCWWave instance
     */
    loadCWWave(cwWave) {
        this.load(cwWave.getTimings(this.loopPause));
        this.frequency = cwWave.frequency;
    }

    load(timings) {
        // console.log('Timings: ' + timings);
        /*
            The ith element of the sequence starts at _cTimings[i] and ends at _cTimings[i+1] (in fractional seconds)
            It is a note (i.e. not silence) if isNote[i] === True
        */
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

    /**
     * Plays the loaded timing sequence from the start, regardless of whether playback is ongoing or paused.
     */
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

    /**
     * Starts or resumes playback of the loaded timing sequence.
     */
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
        this._tZero = this.audioContext.currentTime - this._cTimings[this._nextNote];
        // schedule the first note ASAP (directly) and then if there is more to schedule, set up an interval timer
        if (this._scheduleNotes()) {
            this._timer = setInterval(function () {
                this._scheduleNotes();
            }.bind(this), 1000 * this._timerInterval);  // regularly check to see if there are more notes to schedule
        }
    }

    /**
     * Pause playback (resume with play())
     */
    pause() {
        if (!this._isPlaying) {
            // if we're not actually playing then ignore this
            return;
        }
        this._isPaused = true;
        clearInterval(this._timer);

        // ensure that the next note that is scheduled is a beep, not a pause (to help sync with vibration patterns)
        // TODO: needs to use the same code as in _scheduleNotes to deal with upNext
        if (!this.isNote[this._nextNote]) {
            this._nextNote++;
            if (this.loop) {
                this._nextNote %= this.sequenceLength;
            }
        }
    }

    /**
     * Stop playback (calling play() afterwards will start from the beginning)
     */
    stop() {
        if (this._isPlaying) {
            this._isPlaying = false;
            this._isPaused = false;
            clearInterval(this._timer);
            clearInterval(this._stopTimer);
            clearInterval(this._startTimer);
            this.audioContext.close();
            this.soundStoppedCallback();
        }
    }

    /**
     * Schedule notes that start before now + lookAheadTime.
     * @returns: boolean, true is there is more to schedule, false if sequence is complete
     * @access: private
     */
    _scheduleNotes() {
        // console.log('Scheduling:');
        var now = this.audioContext.currentTime;
        while (this._nextNote < this.sequenceLength && (this._cTimings[this._nextNote] < now - this._tZero + this._lookAheadTime)) {
            // console.log('T: ' + Math.round(1000 * now)/1000 + ' (+' + Math.round(1000 * (now - this._tZero))/1000 + ')');
            // console.log(this._nextNote + ': ' + 
            //     (this.isNote[this._nextNote] ? 'Note  ' : 'Pause ') + 
            //     Math.round(1000 * this._cTimings[this._nextNote])/1000 + ' - ' + Math.round(1000 * this._cTimings[this._nextNote + 1])/1000 + 
            //     ' (' + Math.round(1000 * (this._cTimings[this._nextNote + 1] - this._cTimings[this._nextNote]))/1000 + ')');
            if (this._nextNote === 0 && !this.sequenceStartCallbackFired) {
                // when scheduling the first note, schedule a callback as well
                this._startTimer = setTimeout(function() {
                    this.sequenceStartCallback();
                }.bind(this), 1000 * (this._tZero + this._cTimings[this._nextNote] - now));
                this.sequenceStartCallbackFired = true;
            }
            if (this.isNote[this._nextNote]) {
                var oscillator = this.audioContext.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.value = this.frequency;
                oscillator.connect(this.splitterNode);
                oscillator.start(this._tZero + this._cTimings[this._nextNote]);
                this._soundEndTime = this._tZero + this._cTimings[this._nextNote + 1];  // we need to store this for the stop() callback
                oscillator.stop(this._soundEndTime);
            }

            this._nextNote++;

            if (this._nextNote === this.sequenceLength) {
                if (this.loop || this.upNext !== undefined) {
                    this._tZero += this._cTimings[this._nextNote];  // reset time base
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
            // schedule stop() for after when the scheduled sequence ends
            this._stopTimer = setTimeout(function() {
                this.stop();
            }.bind(this), 1000 * (this._soundEndTime - now + this._lookAheadTime));  // adding on lookAheadTime for safety, shouldn't be needed
            return false;  // indicate that sequence is complete
        } else if (now - this._tZero + this._timerInterval + this._lookAheadTime > this._cTimings[this.sequenceLength - 1] && this.sequenceStartCallbackFired) {
            // then we are going to schedule the last note in the sequence next time
            this.sequenceEndingCallback();
            this.sequenceStartCallbackFired = false;
        }
        return true;
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
