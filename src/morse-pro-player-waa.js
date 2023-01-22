/*!
This code is © Copyright Stephen C. Phillips, 2018-2023.
Email: steve@morsecode.world
*/
/*
Licensed under the EUPL, Version 1.2 or – as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at: https://joinup.ec.europa.eu/community/eupl/
Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the Licence for the specific language governing permissions and limitations under the Licence.
*/

import morseAudioContext from './morse-pro-audiocontext';

/**
 * Web browser sound player using Web Audio API.
 *
 * @example
 * import MorseCW from 'morse-pro-cw';
 * import MorsePlayerWAA from 'morse-pro-player-waa';
 * var morseCW = new MorseCW();
 * var tokens = morseCW.loadTtext("abc");
 * var sequence = morseCW.morseTokens2timing(tokens);
 * var morsePlayerWAA = new MorsePlayerWAA();
 * morsePlayerWAA.play({ ...sequence });
 */
export default class MorsePlayerWAA {
    /**
     * @param {Object} params - lots of optional parameters.
     * @param {number} [params.defaultFrequency=550] - fallback frequency (Hz) to use if the loaded sequence does not define any.
     * @param {number} [params.startPadding=0] - number of ms to wait before playing first note after play is pressed
     * @param {number} [params.endPadding=0] - number of ms to wait at the end of a sequence before playing the next one (or looping).
     * @param {number} [params.volume=1] - volume of Morse. Takes range [0,1].
     * @param {function()} [params.sequenceStartCallback] - function to call each time a sequence starts.
     * @param {function()} [params.sequenceSoundStartCallback] - function to call at the time of the first beep of a sequence (if there is a beep).
     * @param {function()} [params.sequenceEndingCallback] - function to call when a sequence is nearing the end.
     * @param {function()} [params.sequenceSoundEndCallback] - function to call when the last beep of a sequence has ended (if there is a beep).
     * @param {function()} [params.sequenceEndCallback] - function to call when a sequence has ended (including any silence/end padding).
     * @param {function()} [params.allStoppedCallback] - function to call when the whole playback stops (naturally or when stopped).
     * @param {string} [params.onSample] - URL of the sound file to play at the start of a note for when playMode is "sample".
     * @param {string} [params.offSample] - URL of the sound file to play at the end of a note for when playMode is "sample".
     * @param {string} [params.playMode="sine"] - play mode, either "sine" or "sample".
     */
    constructor({defaultFrequency=550, startPadding=0, endPadding=0, volume=1, sequenceStartCallback, sequenceSoundStartCallback, sequenceEndingCallback, sequenceSoundEndCallback, sequenceEndCallback, allStoppedCallback, onSample, offSample, playMode='sine'} = {}) {
        this.setCallbacks({sequenceStartCallback, sequenceSoundStartCallback, sequenceEndingCallback, sequenceSoundEndCallback, sequenceEndCallback, allStoppedCallback});

        this.playMode = playMode;
        this._noAudio = false;

        if (onSample !== undefined) {
            morseAudioContext.loadSample(onSample, "onSample");
            morseAudioContext.loadSample(offSample, "offSample");
        }

        this.loop = false;  // if true then the final (or only) sequence will loop
        this.fallbackFrequency = defaultFrequency;
        this.startPadding = startPadding;
        this._initialStartPadding = 200;  // ms
        this.endPadding = endPadding;
        this.volume = volume;

        this._cTimings = [];
        this._isPlaying = false;
        this._isPaused = false;
        this._lookAheadTime = 0.1;  // how far to look ahead when scheduling notes (seconds)
        this._timerInterval = 0.05;  // how often to schedule notes (seconds)
        this._timer = undefined;  // timer for scheduling notes, repeats at _timerInterval
        this._sequenceStartTimer = undefined;  // timer to send sequenceStartCallback
        this._sequenceSoundEndTimer = undefined;  // timer to send sequenceSoundEndCallback
        this._sequenceEndTimer = undefined;  // timer to send sequenceEndCallback
        this._stopTimer = undefined;  // timer to send allStoppedCallback
        this._queue = [];
        this._scheduling = false;  // flag to indicate whether the player is checking the queue (similar to isPlaying but more precise)

        this._initialiseAudio();
    }

    /**
     * Set up the audio graph. Should only be called once.
     * @access private
     */
    _initialiseAudio() {
        if (this.splitterNode) {
            // if we have already called this method then we must make sure to disconnect the old graph first
            this.splitterNode.disconnect();
        }
        let ac = morseAudioContext.getAudioContext();
        let now = ac.currentTime;

        this.oscillatorNode = ac.createOscillator();  // make an oscillator at the right frequency, always on
        this.oscillatorNode.type = "sine";
        this.oscillatorNode.start(now);

        this.onOffNode = ac.createGain();  // modulate the oscillator with an on/off gain node
        this.onOffNode.gain.setValueAtTime(0, now);

        this.bandpassNode = ac.createBiquadFilter();  // cleans up the waveform
        this.bandpassNode.type = "bandpass";
        this.bandpassNode.Q.setValueAtTime(1, now);

        this.splitterNode = ac.createGain();  // this node is here to attach other nodes to in subclass
        this.splitterNode.gain.setValueAtTime(1, now);

        this.volumeNode = ac.createGain();  // this node is actually used for volume
        
        this.muteAudioNode = ac.createGain();  // used to temporarily mute the sound (e.g. if just light is needed)

        this.oscillatorNode.connect(this.onOffNode);
        this.onOffNode.connect(this.bandpassNode);
        this.bandpassNode.connect(this.splitterNode);
        this.splitterNode.connect(this.volumeNode);
        this.volumeNode.connect(this.muteAudioNode);
        this.muteAudioNode.connect(ac.destination);

        this.setFrequency(this.fallbackFrequency);  // set up oscillator and bandpass nodes
        this.volume = this._volume;  // set up gain node
        this.muteAudio(false);
    }

    /**
     * Set the callbacks, with anything not defined set to an empty function. If callbacks are set this way, then previous ones can be restored using the restoreCallbacks() method.
     * @param {Object} callbacks
     * @param {function()} [callbacks.sequenceStartCallback] - function to call each time a sequence starts.
     * @param {function()} [callbacks.sequenceSoundStartCallback] - function to call at the time of the first beep of a sequence (if there is a beep).
     * @param {function()} [callbacks.sequenceEndingCallback] - function to call when a sequence is nearing the end.
     * @param {function()} [callbacks.sequenceSoundEndCallback] - function to call when the last beep of a sequence has ended (if there is a beep).
     * @param {function()} [callbacks.sequenceEndCallback] - function to call when a sequence has ended (including any silence/end padding).
     * @param {function()} [callbacks.allStoppedCallback] - function to call when the whole playback stops (naturally or when stopped).
     */
    setCallbacks({sequenceStartCallback, sequenceSoundStartCallback, sequenceEndingCallback, sequenceSoundEndCallback, sequenceEndCallback, allStoppedCallback} = {}) {
        this._savedCallbacks = {
            sequenceStartCallback: this.sequenceStartCallback,
            sequenceSoundStartCallback: this.sequenceSoundStartCallback,
            sequenceEndingCallback: this.sequenceEndingCallback,
            sequenceSoundEndCallback: this.sequenceSoundEndCallback,
            sequenceEndCallback: this.sequenceEndCallback,
            allStoppedCallback: this.allStoppedCallback
        };
        this.sequenceStartCallback = sequenceStartCallback !== undefined ? sequenceStartCallback : function () { };
        this.sequenceSoundStartCallback = sequenceSoundStartCallback !== undefined ? sequenceSoundStartCallback : function () { };
        this.sequenceEndingCallback = sequenceEndingCallback !== undefined ? sequenceEndingCallback : function () { };
        this.sequenceSoundEndCallback = sequenceSoundEndCallback !== undefined ? sequenceSoundEndCallback : function () { };
        this.sequenceEndCallback = sequenceEndCallback !== undefined ? sequenceEndCallback : function () { };
        this.allStoppedCallback = allStoppedCallback !== undefined ? allStoppedCallback : function () { };
    }

    restoreCallbacks() {
        this.sequenceStartCallback = this._savedCallbacks.sequenceStartCallback;
        this.sequenceSoundStartCallback = this._savedCallbacks.sequenceSoundStartCallback;
        this.sequenceEndingCallback = this._savedCallbacks.sequenceEndingCallback;
        this.sequenceSoundEndCallback = this._savedCallbacks.sequenceSoundEndCallback;
        this.sequenceEndCallback = this._savedCallbacks.sequenceEndCallback;
        this.allStoppedCallback = this._savedCallbacks.allStoppedCallback;
    }

    /**
     * Set the sound frequency (pitch) in Hz.
     * @param {number} freq - frequency in Hz
     * @param {number} [time] - time to change to the frequency
     */
    setFrequency(freq, time) {
        if (time === undefined) {
            time = morseAudioContext.getAudioContext().currentTime;
        }
        try {
            this.oscillatorNode.frequency.setValueAtTime(freq, time);
            this.bandpassNode.frequency.setValueAtTime(freq, time);
        } catch (e) {
            // getting here means _initialiseAudio() has not yet been called: that's okay
        }
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
        this.setFrequency(this.fallbackFrequency);
    }

    get playMode() {
        return this._playMode;
    }

    /**
     * Set the volume for the player. Sets the gain as a side effect.
     * @param {number} v - the volume, should be in range [0,1]
     */
    set volume(v) {
        let oldGain = this._gain;
        this._volume = Math.min(Math.max(v, 0), 1);  // clamp into range [0,1]
        if (this._volume === 0) {
            this._gain = 0;  // make sure 0 volume is actually silent
        } else {
            // see https://teropa.info/blog/2016/08/30/amplitude-and-loudness.html
            let dbfs = -60 + this._volume * 60;  // changes [0,1] to [-60,0]
            this._gain = Math.pow(10, dbfs / 20);  // change from decibels to amplitude
        }
        try {
            let now = morseAudioContext.getAudioContext().currentTime;
            // change volume linearly over 30ms to avoid discontinuities and resultant popping
            this.volumeNode.gain.setValueAtTime(oldGain, now);
            this.volumeNode.gain.linearRampToValueAtTime(this._gain, now + 0.03);
        } catch (e) {
            // getting here means _initialiseAudio() has not yet been called: that's okay
        }
    }

    /**
     * @returns {number} the current volume [0,1]
     */
    get volume() {
        return this._volume;
    }

    /**
     * @returns {number} the current gain [0,1]
     */
    get gain() {
        return this._gain;
    }

    /**
     * @returns {Boolean} whether the queue will be checked again or not (similar to isPlaying but more precise for this usage)
     */
    get isScheduling() {
        return this._scheduling;
    }

    /**
     * Mute or unmute the audio (leaving the volume setting alone).
     * @param {Boolean} mute - true to mute, false to unmute
     */
    muteAudio(mute) {
        let now = morseAudioContext.getAudioContext().currentTime;
        this.muteAudioNode.gain.linearRampToValueAtTime(mute ? 0 : 1, now + 0.03);
    }

    /**
     * Load timing sequence, replacing any existing sequence and clearing the queue.
     * If this.endPadding is non-zero then an appropriate pause is added to the end.
     * @param {Object} sequence - the sequence to play.
     * @param {number[]} sequence.timings - list of millisecond timings; +ve numbers are beeps, -ve numbers are silence.
     * @param {number} sequence.frequency - optional frequency to be used for all beeps (used if sequence.frequencies field is not set). If neither sequence.frequencies nor sequence.frequency is set, the class fallback frequency is used.
     * @param {number} sequence.frequencies - optional list of frequencies to be used the beeps.
     * @param {number} sequence.endPadding - optional number of milliseconds silence to add at the end of the sequence. If not set, the class endPadding attribute is used.
     */
    load(sequence) {
        // make a deep copy of the object to avoid it changing
        let seqCopy = {
            timings: sequence.timings.slice(),
            frequency: sequence.frequency,
            frequencies: sequence.frequencies !== undefined ? sequence.frequencies.slice() : undefined,
            endPadding: sequence.endPadding
        };
        this._queue = [];
        this._load(seqCopy);
    }

    /**
     * Internal version of load(). Does not clear the queue.
     * @access private
     */
    _load(sequence) {
        this._cTimings = [0];
        let timings = sequence.timings;

        // TODO: undefined behaviour if this is called in the middle of a sequence

        if (sequence.endPadding !== undefined) {
            timings.push(-Math.abs(sequence.endPadding));
        } else {
            if (this.endPadding > 0) {
                timings.push(-Math.abs(this.endPadding));
            }
        }

        this.isNote = [];
        for (let i = 0; i < timings.length; i++) {
            this._cTimings[i + 1] = this._cTimings[i] + Math.abs(timings[i]) / 1000;  // AudioContext runs in seconds not ms
            this.isNote[i] = timings[i] > 0;
        }
        this.sequenceLength = this.isNote.length;

        if (sequence.frequencies !== undefined) {
            this._frequencies = sequence.frequencies;  // will be 1 item shorter than _cTimings as the endPadding isn't included
        } else {
            this._frequencies = this.isNote.map(item => sequence.frequency || this.fallbackFrequency);
        }

        // TODO: add volume array
        // let volumes = sequence.volumes;
    }

    /**
     * Queue up a timing sequence (add to the end of the queue).
     * @param {Object} sequence - see load() method for object description
     * @param {Boolean} [play=false] - whether to also start playing this sequence
     */
    queue(sequence, play = false) {
        // make a deep copy of the object to avoid it changing
        let seqCopy = {
            timings: sequence.timings.slice(),
            frequency: sequence.frequency,
            frequencies: sequence.frequencies !== undefined ? sequence.frequencies.slice() : undefined,
            endPadding: sequence.endPadding
        };

        this._queue.push(seqCopy);
        if (play) {
            if (!this._scheduling) {
                // force play() to load from the queue
                this._cTimings = [];
            }
            this.play();
        }
    }

    unqueue() {
        if (this._queue.length > 0) {
            return this._queue.pop();
        } else {
            return null;
        }
    }

    /**
     * Delete current timings and queue.
     */
    clearAllTimings() {
        if (!this._isPlaying) {
            this._cTimings = [];
            this._frequencies = [];
            this._queue = []
        }
    }

    /**
     * Start playback of the loaded timing sequence from the start. If there is no sequence loaded, then load the first item in the queue.
     * @param {Object} [sequence] - see load() method for object description.
     * @param {Object} [callbacks] - see setCallbacks() method for object description. If callbacks are set this way, the previous ones can be restored using the restoreCallbacks() method.
     */
    play(sequence, callbacks) {
        if (this._isPlaying && this._scheduling) {
            // also true if paused
            return;
        }
        if (this._noAudio) {
            return;
        }

        if (sequence !== undefined) {
            this._load(sequence);
        } else {
            // load first thing from queue if there's nothing loaded
            if (this._cTimings.length === 0) {
                if (this._queue.length > 0) {
                    this._load(this._queue.shift());
                } else {
                    return;
                }
            }
        }

        if (callbacks !== undefined) {
            this.setCallbacks(callbacks);
        }

        // clearInterval(this._stopTimer);  // if we were going to send a allStoppedCallback then don't
        // clearInterval(this._sequenceStartTimer);  // ditto
        // clearInterval(this._sequenceSoundEndTimer);
        // clearInterval(this._sequenceEndTimer);
        // clearInterval(this._timer);

        this._isPlaying = true;
        this._isPaused = false;
        this._nextNote = 0;
        this._sequenceSoundStartScheduled = false;

        // basically set the time base to now but
        //    - to avoid clipping the first note: add on startPadding
        this._tZero = morseAudioContext.getAudioContext().currentTime + 
            Math.max(this.startPadding, this._initialStartPadding) / 1000;
        this._initialStartPadding = 0;  // only use it once
        this._startScheduling();
    }

    /**
     * Pause playback, saving the position (resume with resume()).
     */
    pause() {
        if (!this._isPlaying || this._isPaused) {
            // if we're not actually playing or we're already paused then ignore this
            return;
        }
        this._isPaused = true;
        clearInterval(this._timer);
        this._scheduling = false;
    }

    /**
     * Resume playback from paused position.
     */
    resume() {
        if (!this._isPaused) {
            return;
        }
        // otherwise we are resuming playback after a pause

        // clearInterval(this._stopTimer);  // if we were going to send a allStoppedCallback then don't
        // clearInterval(this._sequenceStartTimer);  // ditto
        // clearInterval(this._sequenceSoundEndTimer);
        // clearInterval(this._sequenceEndTimer);
        // clearInterval(this._timer);

        this._isPaused = false;

        // basically set the time base to now but
        //    - to work after a pause: subtract the start time of the next note so that it will play immediately
        //    - to avoid clipping the first note: add on startPadding
        this._tZero = morseAudioContext.getAudioContext().currentTime - 
            this._cTimings[this._nextNote] + 
            this.startPadding / 1000;
        // schedule the first note ASAP (directly) and then if there is more to schedule, set up an interval timer
        this._startScheduling();
    }

    /**
     * Stop playback.
     */
    stop() {
        if (this._isPlaying) {
            let now = morseAudioContext.getAudioContext().currentTime;
            this.onOffNode.gain.cancelScheduledValues(now);
            this.onOffNode.gain.linearRampToValueAtTime(0, now + 0.03);
            this._stop();
        }
    }

    /**
     * Restart playback from the beginning of the current sequence. Only works if the player is currently scheduling.
     */
    restart() {
        if (this._scheduling) {
            this._restartRequested = true;
        } else {

        }
    }

    /** 
     * Internal stop that doesn't bother ramping the gain down.
     * @access private
     */
    _stop() {
        this._isPlaying = false;
        this._isPaused = false;
        this._scheduling = false;
        clearInterval(this._timer);
        clearInterval(this._stopTimer);
        // clearInterval(this._sequenceStartTimer);
        this.allStoppedCallback();
    }

    /**
     * Schedule the first notes ASAP (directly) and then if there is more to schedule, set up an interval timer.
     * @access private
     */
    _startScheduling() {
        if (this._scheduling) return;

        // It's possible to be here after scheduling's stopped but before the stopTimer fires.
        // Therefore, need to remove the stopTimer so it doesn't go off and stop the new schedule.
        clearInterval(this._stopTimer);

        if (this._scheduleNotes()) {
            this._timer = setInterval(() => this._scheduleNotes(), 1000 * this._timerInterval);  // regularly check to see if there are more notes to schedule
        }
    }

    /**
     * Schedule notes that start before now + lookAheadTime.
     * @returns {Boolean} true if there is more to schedule, false if not (and _stop() will be called)
     * @access private
     */
    _scheduleNotes() {
        let start, stop, stop2, stop3, bsn, paddingEndTime, sequenceEndTime;
        this._scheduling = true;
        let ac = morseAudioContext.getAudioContext();
        let nowAbsolute = ac.currentTime;

        while (this._nextNote < this.sequenceLength &&
                (this._cTimings[this._nextNote] < (nowAbsolute - this._tZero) + this._lookAheadTime)) {

            start = this._tZero + this._cTimings[this._nextNote];
            stop  = this._tZero + this._cTimings[this._nextNote + 1];

            // console.log('T: ' + Math.round(1000 * nowAbsolute)/1000 + ' (+' + Math.round(1000 * (nowAbsolute - this._tZero))/1000 + ')');
            // console.log(this._nextNote + ': ' +
            //     (this.isNote[this._nextNote] ? 'Note  ' : 'Pause ') +
            //     Math.round(1000 * this._cTimings[this._nextNote])/1000 + ' - ' +
            //     Math.round(1000 * this._cTimings[this._nextNote + 1])/1000 + ' (' +
            //     Math.round(1000 * (this._cTimings[this._nextNote + 1] - this._cTimings[this._nextNote]))/1000 + ')');

            if (this._nextNote === 0) {
                // when scheduling the first note, schedule a callback as well
                this._sequenceStartTimer = setTimeout(() => this.sequenceStartCallback(), 1000 * (start - nowAbsolute));
            }

            if (this.isNote[this._nextNote]) {
                // TODO: enable choice of waveform
                this._soundEndTime = stop;  // we need to store this on the class for the stop() callback which might be set up in a different function call instance

                if (!this._sequenceSoundStartScheduled) {
                    // Schedule a callback for the start of the first beep in a sequence
                    this._sequenceSoundStartScheduled = true;
                    // console.log(`Scheduling soundStartTimer:  ${Math.round(1000 * start)/1000} (+${Math.round(1000 * (start - nowAbsolute))/1000})`);
                    this._sequenceSoundStartTimer = setTimeout(() => this.sequenceSoundStartCallback(), 1000 * (start - nowAbsolute));
                }
                if (this._playMode === 'sine') {
                    this.onOffNode.gain.setTargetAtTime(1, start - 0.0015, 0.001);
                    this.onOffNode.gain.setTargetAtTime(0, stop - 0.0015, 0.001);
                    this.setFrequency(this._frequencies[this._nextNote], start);
                } else {
                    // The only other option for 'mode' is 'sample'.
                    // The first sample starts at the start of the beep. The second starts at the end of the beep.
                    // stop2 and stop3 provide times for the two samples to stop, allowing them to overlap.
                    stop2  = this._tZero + this._cTimings[this._nextNote + 2];  // will sometimes be undefined but that's okay
                    stop3  = this._tZero + this._cTimings[this._nextNote + 3];  // TODO: improve this so it handles looping better?

                    let sounds = morseAudioContext.getSounds();
                    // start and stop the "on" sound
                    bsn = ac.createBufferSource();
                    try {
                        bsn.buffer = sounds["onSample"];
                        bsn.start(start);
                        if (stop2) { bsn.stop(stop2); }  // if we don't schedule a stop then the sound file plays until it completes
                        bsn.connect(this.splitterNode);
                    } catch (ex) {
                        console.log("onSample not decoded yet");
                    }

                    // start and stop the "off" sound (which is assumed to follow)
                    bsn = ac.createBufferSource();
                    try {
                        bsn.buffer = sounds["offSample"];
                        bsn.start(stop);
                        if (stop3) { bsn.stop(stop3); }  // we won't have the stop time for the final off sound, so just let it run
                        bsn.connect(this.splitterNode);
                    } catch (ex) {
                        console.log("offSample not decoded yet");
                    }
                }
            } else {
                // Store the end time of any silence here so that the sequenceEndCallback fires correctly.
                paddingEndTime = this._tZero + this._cTimings[this._nextNote + 1];
            }
            this._nextNote++;

            if (this._restartRequested) {
                this._restartRequested = false;
                nowAbsolute = ac.currentTime;
                this._tZero = nowAbsolute + this.startPadding / 1000;
                this._nextNote = 0;
            }

            if (this._nextNote === this.sequenceLength) {
                // we've just scheduled the last note of a sequence
                this.sequenceEndingCallback();
                if (this._sequenceSoundStartScheduled) {
                    // Schedule a callback for the end of the last beep, but only if a beep was actually played in this sequence (indicated by _sequenceSoundStartScheduled).
                    // console.log(`Scheduling soundEndTimer:    ${Math.round(1000 * this._soundEndTime)/1000} (+${Math.round(1000 * (this._soundEndTime - nowAbsolute))/1000})`);
                    this._sequenceSoundEndTimer = setTimeout(() => this.sequenceSoundEndCallback(), 1000 * (this._soundEndTime - nowAbsolute));
                }
                sequenceEndTime = paddingEndTime > this._soundEndTime ? paddingEndTime : this._soundEndTime;  // paddingEndTime can be undefined
                // console.log(`Scheduling sequenceEndTimer: ${Math.round(1000 * sequenceEndTime)/1000} (+${Math.round(1000 * (sequenceEndTime - nowAbsolute))/1000})`);
                this._sequenceEndTimer = setTimeout(() => this.sequenceEndCallback(), 1000 * (sequenceEndTime - nowAbsolute));
                if (this.loop || this._queue.length > 0) {
                    // there's more to play
                    // increment time base to be the absolute end time of the final element in the sequence
                    this._tZero += this._cTimings[this.sequenceLength];
                    this._nextNote = 0;
                    this._sequenceSoundStartScheduled = false;
                    if (this._queue.length > 0) {
                        this._load(this._queue.shift());
                    }
                }
            }
        }

        if (this._nextNote === this.sequenceLength) {
            // then all notes have been scheduled and we are not looping/going to next in queue
            this._scheduling = false;
            clearInterval(this._timer);
            // schedule _stop() for after when the scheduled sequence ends
            // adding on 3 * lookAheadTime for safety but shouldn't be needed
            let stopTime = sequenceEndTime + (3 * this._lookAheadTime)
            // console.log(`Scheduling allStopped:   ${Math.round(1000 * stopTime)/1000} (+${Math.round(1000 * (stopTime - nowAbsolute))/1000})`);
            this._stopTimer = setTimeout(() => this._stop(), 1000 * (stopTime - nowAbsolute));
            return false;  // indicate that sequence is complete
        }

        return true;  // indicate there are more notes to schedule
    }

    /**
     * @returns {Boolean} whether there was an error in initialisation.
     */
    hasError() {
        return this._noAudio;
    }

    /**
     * @returns {Boolean} whether a sequence is being played or not (still true even when paused); becomes false when stop is used.
     */
    get isPlaying() {
        return this._isPlaying;
    }

    /**
     * @returns {Boolean} whether the playback is paused or not.
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
}
