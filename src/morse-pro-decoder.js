/*
This code is © Copyright Stephen C. Phillips, 2018-2024.
Email: steve@morsecode.world

Licensed under the EUPL, Version 1.2 or – as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at: https://joinup.ec.europa.eu/community/eupl/
Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the Licence for the specific language governing permissions and limitations under the Licence.
*/

import MorseCW from './morse-pro-cw.js';
import { CHAR_SPACE, WORD_SPACE } from './constants.js'

/**
 * Class to convert from timings to Morse code. Uses "international" dictionary.
 *
 * @example
 * // The messageCallback is called when a character or more is decoded
 * // It receives a dictionary of the timings, morse, and the message
 * let messageCallback = function(data) {
 *     console.log("Decoded: {\n  timings: " + data.timings + "\n  morse: " + data.morse + "\n  message: " + data.message + "\n}");
 * }
 * let wpm = 10;
 * let decoder = new MorseDecoder({wpm, messageCallback});
 * let t;
 * while (decoder_is_operating) {
 *     // get some ms timing "t" from a sensor, make it +ve for noise and -ve for silence
 *     decoder.addTiming(t);
 * }
 * decoder.flush();  // make sure all the data is pushed through the decoder
 */

// TODO: consider having this class just use a MorseCW instance rather than extending it.

export default class MorseDecoder extends MorseCW {
    /**
     * Constructor
     * @param {Object} params - dictionary of parameters.
     * @param {string} [params.dictionary='international'] - dictionary to use. Must have same timing as 'international'.
     * @param {string[]} [params.dictionaryOptions] - additional dictionaries such as 'prosigns'.
     * @param {number} [params.wpm] - speed in words per minute using "PARIS " as the standard word.
     * @param {number} [params.fwpm] - farnsworth speed.
     * @param {function()} [params.messageCallback] - Callback executed with {message: string, timings: number[], morse: string} when decoder buffer is flushed (every character).
     * @param {function()} [params.speedCallback] - Callback executed with {wpm: number, fwpm: number} if the wpm or fwpm speed changes. The speed in this class doesn't change by itself, but e.g. the fwpm can change if wpm is changed. Returned dictionary has keys 'fwpm' and 'wpm'.
    */
    constructor({dictionary='international', dictionaryOptions, wpm, fwpm, messageCallback, speedCallback} = {}) {
        super({dictionary, dictionaryOptions, wpm, fwpm});
        if (messageCallback !== undefined) this.messageCallback = messageCallback;
        if (speedCallback !== undefined) this.speedCallback = speedCallback;  // function receives dictionary with wpm and fwpm set when the speed changes
        this.timings = [];  // all the ms timings received, all +ve
        this.characters = [];  // all the decoded characters ('.', '-', etc)
        this.unusedTimes = [];
        this.processedTimings = [];
        this.noiseThreshold = this.ditLen / 4;  // a duration <= noiseThreshold is assumed to be an error
        this.morse = "";  // string of morse
        this.message = "";  // string of decoded message
        this._fditLen = this.wordSpace / 7;
    }

    /**
     * @access private
     */
    _clearThresholds() {
        this._ditDahThreshold = undefined;
        this._ditDahSpaceThreshold = undefined;
        this._dahWordSpaceThreshold = undefined;
    }

    get ditDahThreshold() {
        this._ditDahThreshold = this._ditDahThreshold || (this.lengths['.'] + this.lengths['-']) / 2;
        return this._ditDahThreshold;
    }

    /* The following two functions are used to calculate the thresholds for the 3 space characters.
     * The thresholds are used to determine if a duration is a dit, letter-space (dah) or word-space, calculated as the 
     * average of the actual space durations, and are cached.
     * When wpm != fwpm ths ditDahSpaceThreshold is not the same as the ditDahThreshold.
     */
    get ditDahSpaceThreshold() {
        this._ditDahSpaceThreshold = this._ditDahSpaceThreshold || (this.lengths['.'] - this.lengths[CHAR_SPACE]) / 2;
        return this._ditDahSpaceThreshold;
    }

    get dahWordSpaceThreshold() {
        this._dahWordSpaceThreshold = this._dahWordSpaceThreshold || -(this.lengths[CHAR_SPACE] + this.lengths[WORD_SPACE]) / 2;
        return this._dahWordSpaceThreshold;
    }

    /**
     * Should be set to the WPM speed of the input sound.
     * The speedCallback is executed.
     * @param {number} wpm - Speed in words per minute.
     */
    setWPM(wpm) {
        super.setWPM(wpm);
        this._clearThresholds();
        this.speedCallback({wpm: this.wpm, fwpm: this.fwpm});
    }

    /**
     * Should be set to the Farnsworth WPM speed of the input sound.
     * The speedCallback is executed.
     * @param {number} fwpm - Speed in words per minute.
     */
    setFWPM(fwpm) {
        super.setFWPM(fwpm);
        this._clearThresholds();
        this.speedCallback({wpm: this.wpm, fwpm: this.fwpm});
    }

    /**
     * Set the length of a dit the decoder will look for.
     * Updates wpm and fwpm.
     * @param {number} dit - Length of a dit in ms.
     */
    set ditLen(dit) {
        this._fditLen = Math.max(dit, this._fditLen || 1);
        this.setWPMfromDitLen(dit);
        this.setFWPMfromRatio(this._fditLen / dit);
        this._clearThresholds();
    }

    get ditLen() {
        return this.lengths['.'];
    }

    /**
     * Set the length of a Farnsworth dit the decoder will look for.
     * Updates ditLen (ensuring ditLen is not longer).
     * @param {number} dit - Length of a Farnsworth dit in ms.
     */
    set fditLen(fdit) {
        this._fditLen = fdit;
        this.ditLen = Math.min(this.lengths['.'], fdit);
    }

    get fditLen() {
        return this._fditLen;
    }

    /**
     * Add a timing in ms to the list of recorded timings.
     * The duration should be positive for a dit or dah and negative for a space.
     * If the duration is <= noiseThreshold it is assumed to be noise and is added to the previous duration.
     * If a duration is the same sign as the previous one then they are combined.
     * @param {number} duration - millisecond duration to add, positive for a dit or dah, negative for a space
     */
    addTiming(duration) {
        if (isNaN(duration) || duration === 0) {
            return;
        }
        if (this.unusedTimes.length > 0) {
            let last = this.unusedTimes[this.unusedTimes.length - 1];
            if (duration * last > 0) {
                // if the sign of the duration is the same as the previous one then add it on
                this.unusedTimes.pop();
                duration = last + duration;
            } else if (Math.abs(duration) <= this.noiseThreshold) {
                // if the duration is very short, assume it is a mistake and add it to the previous one
                this.unusedTimes.pop();
                duration = last - duration;  // take care of the sign change (if we're here then we know the sign has changed)
            }
        }

        this.unusedTimes.push(duration);

        // If we have just received a character space or longer then flush the timings
        if (-duration >= this.ditDahSpaceThreshold) {
            this.flush();
        }
    }

    addTimings(timings) {
        for (const t of timings) {
            this.addTiming(t);
        }
    }

    /**
     * Process the buffer of unused timings, converting them into Morse and converting the generated Morse into a message.
     * Should be called only when a character space has been reached (or the message is at an end).
     * Will call the messageCallback with the latest timings, morse (dots and dashes) and message.
     */
    flush() {
        // Then we've reached the end of a character or word or a flush has been forced

        // If the last character decoded was a space then just ignore additional quiet
        if (this.message[this.message.length - 1] === ' ') {
            if (this.unusedTimes[0] < 0) {
                this.unusedTimes.shift();
            }
        }

        // Make sure there is (still) something to decode
        if (this.unusedTimes.length === 0) {
            return;
        }

        // If last element is quiet but it is not enough for a space character then pop it off and replace afterwards
        let last = this.unusedTimes[this.unusedTimes.length - 1];
        if ((last < 0) && (-last < this.dahWordSpaceThreshold)) {
            this.unusedTimes.pop();
        } else {
            last = undefined;
        }

        let u = this.unusedTimes;
        let m = this._timings2morse(this.unusedTimes);
        let t = this.displayText(this.loadMorse(m), {});  // will be '#' if there's an error
        this.morse += m;
        this.message += t;
        this.processedTimings = this.processedTimings.concat(u);

        if (last !== undefined) {
            this.unusedTimes = [last];  // put the space back on the end in case there is more quiet to come
        } else {
            this.unusedTimes = [];
        }
        this.messageCallback({
            timings: u,
            morse: m,
            message: t
        });
    }

    /**
     * Convert from millisecond timings to dots and dashes.
     * @param {number[]} times - array of millisecond timings, +ve numbers representing a signal, -ve representing a space.
     * @return {string} - the dots and dashes as a string.
     * @access private
     */
    _timings2morse(times) {
        let ditdah = "";
        let c;
        let d;

        for (const element of times) {
            d = element;
            if (d > 0) {
                if (d < this.ditDahThreshold) {
                    c = ".";
                } else {
                    c = "-";
                }
            } else {
                d = -d;
                if (d < this.ditDahSpaceThreshold) {
                    c = "";
                } else if (d < this.dahWordSpaceThreshold) {
                    c = " ";
                } else {
                    c = "/";
                }
            }
            this._addDecode(d, c);
            ditdah = ditdah + c;
        }
        return ditdah;
    }

    /**
     * Store the timing and the corresponding decoded character element.
     * @param {number} duration - the millisecond duration (always +ve).
     * @param {string} character - the corresponding character element [.-/ ].
     * @access private
     */
    _addDecode(duration, character) {
        this.timings.push(duration);
        this.characters.push(character);
    }

    /**
     * Get a list of all the timings that were interpreted to be a particular character
     * @return {number[]}
     * @access private
     */
    _getTimings(character) {
        let ret = [];
        for (let i = 0; i < this.timings.length; i++) {
            if (this.characters[i] === character) {
                ret.push(this.timings[i]);
            }
        }
        return ret;
    }

    /**
     * Get the millisecond timings of all durations determined to be dits
     * @return {number[]}
     */
    get dits() {
        return this._getTimings('.');
    }

    /**
     * Get the millisecond timings of all durations determined to be dahs
     * @return {number[]}
     */
    get dahs() {
        return this._getTimings('-');
    }

    /**
     * Get the millisecond timings of all durations determined to be dit-spaces
     * @return {number[]}
     */
    get ditSpaces() {
        return this._getTimings('');
    }

    /**
     * Get the millisecond timings of all durations determined to be dah-spaces
     * @return {number[]}
     */
    get dahSpaces() {
        return this._getTimings(' ');
    }

    /**
     * Get the millisecond timings of all durations determined to be spaces
     * @return {number[]}
     */
    get spaces() {
        return this._getTimings('/');
    }

    // default callbacks that do nothing
    messageCallback(jsonData) { }
    speedCallback(jsonData) { }
}
