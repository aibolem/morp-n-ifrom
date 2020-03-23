/*!
This code is © Copyright Stephen C. Phillips, 2018.
Email: steve@scphillips.com
*/
/*
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
 * import MorseCW from 'morse-pro-cw';
 * import MorsePlayerWAA from 'morse-pro-player-waa';
 * var morseCW = new MorseCW();
 * var tokens = morseCW.text2morse("abc");
 * var timings = morseCW.morseTokens2timing(tokens);
 * var morsePlayerWAA = new MorsePlayerWAA();
 * morsePlayerWAA.load({timings});
 * morsePlayerWAA.playFromStart();
 */
export default class MorsePlayerWAA {
    /**
     * @param {Object} params - lots of optional parameters.
     * @param {number} [params.defaultFrequency=550] - fallback frequency (Hz) to use if the loaded sequence does not define any.
     * @param {number} [params.startPadding=0] - number of ms to wait before playing first note of initial sequence.
     * @param {number} [params.endPadding=0] - number of ms to wait at the end of a sequence before playing the next one (or looping).
     * @param {function()} params.sequenceStartCallback - function to call each time the sequence starts.
     * @param {function()} params.sequenceEndingCallback - function to call when the sequence is nearing the end.
     * @param {function()} params.sequenceEndCallback - function to call when the sequence has ended.
     * @param {function()} params.soundStoppedCallback - function to call when the sequence stops.
     * @param {string} params.onSample - URL of the sound file to play at the start of a note.
     * @param {string} params.offSample - URL of the sound file to play at the end of a note.
     * @param {string} [params.playMode="sine"] - play mode, either "sine" or "sample".
     */
    constructor({defaultFrequency=550, startPadding=0, endPadding=0, sequenceStartCallback, sequenceEndingCallback, sequenceEndCallback, soundStoppedCallback, onSample, offSample, playMode='sine'} = {}) {
        if (sequenceStartCallback !== undefined) this.sequenceStartCallback = sequenceStartCallback;
        if (sequenceEndingCallback !== undefined) this.sequenceEndingCallback = sequenceEndingCallback;
        if (sequenceEndCallback !== undefined) this.sequenceEndCallback = sequenceEndCallback;
        if (soundStoppedCallback !== undefined) this.soundStoppedCallback = soundStoppedCallback;

        this.playMode = playMode;
        this._noAudio = false;
        this._audioContextClass = window.AudioContext || window.webkitAudioContext;
        if (this._audioContextClass === undefined) {
            this._noAudio = true;
            console.log("Web Audio API unavailable");
            throw (new Error("No AudioContext class defined"));
        }
        this._createAudioContextSingleton();

        this._samples = []
        if (onSample !== undefined) {
            this._loadSound(onSample, this._samples, 0);
            this._loadSound(offSample, this._samples, 1);
        }

        this.loop = false;
        this.fallbackFrequency = defaultFrequency;
        this._frequency = undefined;
        this.startPadding = startPadding;
        this.endPadding = endPadding;

        this._cTimings = [];
        this._isPlaying = false;
        this._isPaused = false;
        this._volume = 1;
        this._lookAheadTime = 0.1;  // how far to look ahead when scheduling notes (seconds)
        this._timerInterval = 0.05;  // how often to schedule notes (seconds)
        this._timer = undefined;
        this._stopTimer = undefined;
        this._notPlayedANote = true;
        this._queue = [];

        this._initialiseAudioNodes();
    }

    /**
     * Close any existing AudioContext and make a new one (has the side effect of stopping all sounds)
     */
    _createAudioContextSingleton() {
        if (this._audioContext) {
            this._audioContext.close();
        }
        this._audioContext = new this._audioContextClass();
    }

    /**
     * Set up the audio graph
     * @access private
     */
    _initialiseAudioNodes() {
        if (this.gainNode) {
            // if we have already called this method then we must make sure to disconnect the old graph first
            this.gainNode.disconnect();
        }
        // cannot work until this._frequency is defined
        this.splitterNode = this._audioContext.createGain();  // this node is here to attach other nodes to in subclass
        this.lowPassNode = this._audioContext.createBiquadFilter();
        this.lowPassNode.type = "lowpass";
        this.frequency = this._frequency;  // set up filter node
        this.gainNode = this._audioContext.createGain();  // this node is actually used for volume
        this.volume = this._volume;  // set up gain node
        this.splitterNode.connect(this.lowPassNode);
        this.lowPassNode.connect(this.gainNode);
        this.gainNode.connect(this._audioContext.destination);
        this._notPlayedANote = true;
    }

    static get HIGH_FREQ() {
        return 20000;
    }

    set frequency(freq) {
        this._frequency = freq;
        try {
            if (this._playMode !== 'sample') {
                // TODO: remove this magic number and make the filter configurable?
                this.lowPassNode.frequency.setValueAtTime(this._frequency * 1.1, this._audioContext.currentTime);
            } else {
                this.lowPassNode.frequency.setValueAtTime(MorsePlayerWAA.HIGH_FREQ, this._audioContext.currentTime);
            }
        } catch(ex) {
            // getting here means _initialiseAudioNodes() has not yet been called: that's okay
        }
    }

    get frequency() {
        return this._frequency;
    }

    /**
     * Set the play mode (one of 'sine' and 'sample'). Also corrects the volume and low-pass filter.
     * @param {String} mode - the play mode to use
     */
    set playMode(mode) {
        // TODO: check value is in ['sine', 'sample']
        this._playMode = mode;
        // force re-evaluation of volume and frequency in case the mode has been changed during playback
        this.volume = this._volume;
        this.frequency = this._frequency;
    }

    get playMode() {
        return this._playMode;
    }

    /**
     * Set the volume for the player
     * @param {number} v - the volume, clamped to [0,1]
     */
    set volume(v) {
        this._volume = Math.min(Math.max(v, 0), 1);
        try {
            if (this._playMode !== 'sample') {
                // multiply by 0.813 to reduce gain added by lowpass filter and avoid clipping
                this.gainNode.gain.setValueAtTime(0.813 * this._volume, this._audioContext.currentTime);
            } else {
                this.gainNode.gain.setValueAtTime(this._volume, this._audioContext.currentTime);
            }
        } catch (ex) {
            // getting here means _initialiseAudioNodes() has not yet been called: that's okay
        }
    }

    /**
     * @returns {number} the current volume [0,1]
     */
    get volume() {
        return this._volume;
    }

    // /**
    //  * Convenience method to help playing directly from a MorseCWWave instance. Uses the CWWave timings and frequency.
    //  * @param {Object} cwWave - a MorseCWWave instance
    //  */
    // loadCWWave(cwWave) {
    //     this.load(cwWave.getTimings());
    //     this.frequency = cwWave.frequency;
    // }

    /**
     * Load timing sequence, replacing any existing sequence.
     * If this.endPadding is non-zero then an appropriate pause is added to the end.
     * @param {Object} sequence - the sequence to play.
     * @param {number[]} sequence.timings - list of millisecond timings; +ve numbers are beeps, -ve numbers are silence.
     * @param {number} sequence.frequencies - a single frequency to be used for all beeps. If not set, the fallback frequency defined in the constructor is used.
     */
    load(sequence) {
        let timings = sequence.timings;
        let frequencies = sequence.frequencies || this.fallbackFrequency;
        // TODO: add volume array
        // let volumes = sequence.volumes;
        if (Array.isArray(frequencies)) {
            // TODO: add frequency arrays; set this.frequency to the highest value to make the low-pass filter work
            throw "Arrays of frequencies not yet supported"
        } else {
            this.frequency = frequencies;
        }

        // TODO: undefined behaviour if this is called in the middle of a sequence

        // console.log('Timings: ' + timings);
        /*
            The ith element of the sequence starts at _cTimings[i] and ends at _cTimings[i+1] (in fractional seconds)
            It is a note (i.e. not silence) if isNote[i] === True
        */

        if (this.endPadding > 0) {
            timings.push(-this.endPadding);
        }

        this._cTimings = [0];
        this.isNote = [];
        for (var i = 0; i < timings.length; i++) {
            this._cTimings[i + 1] = this._cTimings[i] + Math.abs(timings[i]) / 1000;  // AudioContext runs in seconds not ms
            this.isNote[i] = timings[i] > 0;
        }
        this.sequenceLength = this.isNote.length;
    }

    /**
     * Load timing sequence which will be played when the current sequence is completed (current queue is deleted).
     * @param {Object} sequence - see load() method for object description
     * @deprecated - use queue() instead
     */
    loadNext(sequence) {
        this._queue = [sequence];
    }

    /**
     * Queue up a timing sequence (add to the end of the queue)
     * @param {Object} sequence - see load() method for object description
     */
    queue(sequence) {
        this._queue.push(sequence);
    }

    /**
     * Plays the loaded timing sequence from the start, regardless of whether playback is ongoing or paused.
     */
    playFromStart() {
        // TODO: why do we have this method at all? Better just to have play() and if user needs playFromStart, just call stop() first?
        if (this._noAudio || this._cTimings.length === 0) {
            return;
        }
        this.stop();
        // this._initialiseAudioNodes();
        this._nextNote = 0;
        this._isPlaying = true;
        this._isPaused = true;  // pretend we were paused so that play() "resumes" playback
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
        // otherwise we are resuming playback after a pause
        if (!this._isPaused) {
            // if we're not actually paused then do nothing
            return;
        }
        // otherwise we really are resuming playback (or pretending we are, and actually playing from start...)
        clearInterval(this._stopTimer);  // if we were going to send a soundStoppedCallback then don't
        clearInterval(this._startTimer);  // ditto
        clearInterval(this._endTimer);
        clearInterval(this._timer);
        this._isPaused = false;
        // basically set the time base to now but
        //    - to work after a pause: subtract the start time of the next note so that it will play immediately
        //    - to avoid clipping the very first note: add on startPadding if notPlayedANote
        this._tZero = this._audioContext.currentTime -
            this._cTimings[this._nextNote] +
            (this._notPlayedANote ? this.startPadding / 1000 : 0);
        // schedule the first note ASAP (directly) and then if there is more to schedule, set up an interval timer
        if (this._scheduleNotes()) {
            this._timer = setInterval(function() {
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
        if (!this.isNote[this._nextNote]) {

            this._nextNote++;

            // if we've got to the end of the sequence, then loop or load next sequence as appropriate
            if (this._nextNote === this.sequenceLength) {
                if (this.loop || this._queue.length > 0) {
                    this._nextNote = 0;
                    if (this._queue.length > 0) {
                        this.load(this._queue.shift());
                    }
                }
            }
        }
    }

    /**
     * Stop playback (calling play() afterwards will start from the beginning)
     */
    stop() {
        if (this._isPlaying) {
            // TODO: find a better way to immediately kill all the sounds, for instance bringing volume to zero and disconnecting all oscillators
            this._createAudioContextSingleton();
            this._initialiseAudioNodes();
            this._stop();
        }
    }

    /** 
     * Internal clean stop that doesn't destroy audiocontext
     * @access private
     */
    _stop() {
        this._isPlaying = false;
        this._isPaused = false;
        clearInterval(this._timer);
        clearInterval(this._stopTimer);
        clearInterval(this._startTimer);
        this.soundStoppedCallback();
    }

    /**
     * Schedule notes that start before now + lookAheadTime.
     * @return {boolean} true if there is more to schedule, false if sequence is complete
     * @access private
     */
    _scheduleNotes() {
        // console.log('Scheduling:');
        var oscillator, start, start2, stop, stop2, bsn;
        var nowAbsolute = this._audioContext.currentTime;

        while (this._nextNote < this.sequenceLength &&
                (this._cTimings[this._nextNote] < (nowAbsolute - this._tZero) + this._lookAheadTime)) {

            this._notPlayedANote = false;
            var nowRelative = nowAbsolute - this._tZero;

            // console.log('T: ' + Math.round(1000 * nowAbsolute)/1000 + ' (+' + Math.round(1000 * nowRelative)/1000 + ')');
            // console.log(this._nextNote + ': ' +
            //     (this.isNote[this._nextNote] ? 'Note  ' : 'Pause ') +
            //     Math.round(1000 * this._cTimings[this._nextNote])/1000 + ' - ' +
            //     Math.round(1000 * this._cTimings[this._nextNote + 1])/1000 + ' (' +
            //     Math.round(1000 * (this._cTimings[this._nextNote + 1] - this._cTimings[this._nextNote]))/1000 + ')');

            if (this._nextNote === 0) {
                // when scheduling the first note, schedule a callback as well
                this._startTimer = setTimeout(function() {
                    this.sequenceStartCallback();
                }.bind(this), 1000 * (this._cTimings[0] - nowRelative));
            }

            if (this.isNote[this._nextNote]) {
                // TODO: enable choice of waveform
                if (this._playMode === 'sine') {
                    start = this._tZero + this._cTimings[this._nextNote];
                    stop  = this._tZero + this._cTimings[this._nextNote + 1];
                    this._soundEndTime = stop;  // we need to store this for the stop() callback
                    oscillator = this._audioContext.createOscillator();
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(this._frequency, start);
                    oscillator.start(start);
                    oscillator.stop(stop);
                    oscillator.connect(this.splitterNode);
                } else {
                    // only other option for 'mode' is 'sample'
                    start  = this._tZero + this._cTimings[this._nextNote];
                    start2 = this._tZero + this._cTimings[this._nextNote + 1];
                    stop   = this._tZero + this._cTimings[this._nextNote + 2];  // will sometimes be undefined but that's okay
                    stop2  = this._tZero + this._cTimings[this._nextNote + 3];  // TODO: improve this so it handles looping better?
                    this._soundEndTime = start2;  // the start of the end click. We need to store this for the stop() callback

                    // start and stop the "on" sound
                    bsn = this._audioContext.createBufferSource();
                    bsn.buffer = this._samples[0];
                    bsn.start(start);
                    if (stop) { bsn.stop(stop); }  // if we don't schedule a stop then the sound file plays until it completes
                    bsn.connect(this.splitterNode);

                    // start and stop the "off" sound (which is assumed to follow)
                    bsn = this._audioContext.createBufferSource();
                    bsn.buffer = this._samples[1];
                    bsn.start(start2);
                    if (stop2) { bsn.stop(stop2); }  // we won't have the stop time for the final off sound, so just let it run
                    bsn.connect(this.splitterNode);
                }
            }
            this._nextNote++;

            if (this._nextNote === this.sequenceLength) {
                // we've just scheduled the last note of a sequence
                this.sequenceEndingCallback();
                this._endTimer = setTimeout(this.sequenceEndCallback, 1000 * (this._soundEndTime - nowAbsolute));
                if (this.loop || this._queue.length > 0) {
                    // there's more to play
                    // increment time base to be the absolute end time of the final element in the sequence
                    this._tZero += this._cTimings[this.sequenceLength];
                    this._nextNote = 0;
                    if (this._queue.length > 0) {
                        this.load(this._queue.shift());
                    }
                }
            }
        }

        if (this._nextNote === this.sequenceLength) {
            // then all notes have been scheduled and we are not looping/going to next in queue
            clearInterval(this._timer);
            // schedule stop() for after when the scheduled sequence ends
            // adding on 3 * lookAheadTime for safety but shouldn't be needed
            this._stopTimer = setTimeout(function() {
                this._stop();
            }.bind(this), 1000 * (this._soundEndTime - nowAbsolute + 3 * this._lookAheadTime));
            return false;  // indicate that sequence is complete
        }

        return true;  // indicate there are more notes to schedule
    }

    /**
     * @returns {boolean} whether there was an error in initialisation
     */
    hasError() {
        return this._noAudio;
    }

    /**
     * @returns {boolean} whether a sequence is being played or not (still true even when paused); becomes false when stop is used
     */
    get isPlaying() {
        return this._isPlaying;
    }

    /**
     * @returns {boolean} whether the playback is paused or not
     */
    get isPaused() {
        return this._isPaused;
    }

    /**
     * Return the index of the next note in the sequence to be scheduled.
     * Useful if the sequence has been paused.
     * @returns {number} note index
     */
    get nextNote() {
        return this._nextNote;
    }

    /**
     * @returns {number} representing this audio player type: 4
     */
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

    /**
     * Called to coincide with the start of the first note in a sequence.
     */
    sequenceStartCallback() { }

    /**
     * Called at the point of the last notes of a sequence being scheduled. Designed to provide the opportunity to schedule some more notes.
     */
    sequenceEndingCallback() { }

    /**
     * Called at the end of the last beep of a sequence. Does not wait for endPadding.
     */
    sequenceEndCallback() { }

    /**
     * Called when all sounds have definitely stopped.
     */
    soundStoppedCallback() { }

    /**
     * Load the specified sound from a URL
     * @param {*} url
     * @param {*} samples
     * @param {*} index
     */
    _loadSound(url, samples, index) {
        // takes a URL to get the sound from an array and an index to (asynchronously) put the AudioBuffer into
        let request = new XMLHttpRequest();  // TODO: change to promise style?
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        let that = this;
        request.onload = function() {
            // Decode the data and keep a reference to it
            // Promise-ased syntax does not work for Safari desktop, need to use callback variant
            // https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
            // TODO: find another way to load samples or raise a warning as neither method works on Safari mobile
            let audioData = request.response;
            that._audioContext.decodeAudioData(audioData, 
                function(buffer) {
                    samples[index] = buffer;
                },
                function(e) {
                    console.log("Error decoding audio data" + e.err);
                }
            );
        };
        request.send();
    }
}
