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

import Morse from './morse-pro.js';

const MS_IN_MINUTE = 60000;  /** number of milliseconds in 1 minute */

//TODO: define these once
const CHAR_SPACE = '•';  // \u2022
const WORD_SPACE = '■';  // \u25a0

/**
 * Class to create the on/off timings needed by e.g. sound generators. Timings are in milliseconds; "off" timings are negative.
 *
 * @example
 * import MorseCW from 'morse-pro-cw';
 * var morseCW = new MorseCW();
 * var tokens = morseCW.text2morse("abc").morse;
 * var timings = morseCW.morseTokens2timing(tokens);
 */
export default class MorseCW extends Morse {
    /**
     * @param {Object} params - dictionary of optional parameters.
     * @param {string} [params.dictionary='international'] - which dictionary to use, e.g. 'international' or 'american'.
     * @param {string[]} [params.dictionaryOptions=[]] - optional additional dictionaries such as 'prosigns'.
     * @param {number} [params.wpm=20] - speed in words per minute using "PARIS " as the standard word.
     * @param {number} [params.fwpm=wpm] - farnsworth speed.
     */
    constructor({dictionary, dictionaryOptions, wpm=20, fwpm=wpm} = {}) {
        super({dictionary, dictionaryOptions});
        /** The element of the dictionary that the ratios are based off */
        this._baseElement = this.dictionary.baseElement;
        /** Initialise the ratios based on the dictionary but enable them to be changed thereafter */
        this.ratios = {...this.dictionary.ratio};  // actually does a copy from the dict so we can reset if needed
        /** Compute ditsInParis and spacesInParis while we have original ratio */
        let parisTokens = this.text2morse('PARIS');
        this._baseLength = 1;
        this._ditsInParis = this.getDuration(this.getTimings(parisTokens)) + Math.abs(this.ratios[WORD_SPACE]);
        this._spacesInParis = Math.abs((4 * this.ratios[CHAR_SPACE]) + this.ratios[WORD_SPACE]);
        /** Initialise wpm and fwpm (this potentially changes the ratios) */
        this.setWPM(wpm);
        this.setFWPM(fwpm);
    }

    /** 
     * Set the WPM speed. Ensures that Farnsworth WPM is no faster than WPM.
     * @param {number} wpm
     */
    setWPM(wpm) {
        this._baseLength = undefined;
        this._ratios = undefined;
        this._lengths = undefined;

        wpm = Math.max(1, wpm || 1);
        this._wpm = wpm;
        this._fwpm = Math.min(this._wpm, this._fwpm);

        let tmp = this.ratios;
        tmp = this.baseLength;
        return wpm;
    }

    /** @type {number} */
    get wpm() {
        return this._wpm;
    }

    testWPMmatchesRatio() {
        return this.ratios['-'] == this.dictionary.ratio['-'] && this.ratios[' '] == this.dictionary.ratio[' '];
    }

    /**
     * Set the Farnsworth WPM speed. Ensures that WPM is no slower than Farnsworth WPM.
     * @param {number} fwpm
     */
    setFWPM(fwpm) {
        fwpm = Math.max(1, fwpm || 1);
        this._fwpm = fwpm;
        this.setWPM(Math.max(this._wpm, this._fwpm))
        
        return fwpm;
    }

    /** @type {number} */
    get fwpm() {
        return this._fwpm;
    }

    testFWPMmatchesRatio() {
        // need to test approximately here otherwise with the rounding errors introduced in the web page input it would never return true
        return Math.abs((this.ratios[WORD_SPACE] / this.dictionary.ratio[WORD_SPACE]) / (this.ratios[CHAR_SPACE] / this.dictionary.ratio[CHAR_SPACE]) - 1) < 0.001;
    }

    /** @type {number[]} */
    get ratios() {
        if (this._ratios === undefined) {
            this._ratios = {};
            Object.assign(this._ratios, this.dictionary.ratio);
            let farnsworthRatio = this.farnsworthRatio;
            this._ratios[CHAR_SPACE] *= farnsworthRatio;
            this._ratios[WORD_SPACE] *= farnsworthRatio;
        }
        return this._ratios;
    }

    /**
     * Set the ratio of each element and normalise to the base element/
     * For the space elements, the ratio is negative.
     * @param {Map} r - a Map from element to ratio (as defined in the 'ratio' element of a dictionary)
     */
    set ratios(r) {
        this._wpm = undefined;
        this._fwpm = undefined;
        this._lengths = undefined;

        this._ratios = {};
        Object.assign(this._ratios, r);
        for (let element in this._ratios) {
            this._ratios[element] /= this._ratios[this._baseElement];
        }
    }

    setRatio(element, ratio) {
        let tmp = this.ratios;
        this._ratios[element] = ratio;
        this._lengths = undefined;

        if (this.testWPMmatchesRatio()) {
            this._setWPMfromBaseLength();
            if (this.testFWPMmatchesRatio()) {
                this._setFWPMfromRatio();
            } else {
                this._fwpm = undefined;
            }    
        } else {
            this._wpm = undefined;
            this._fwpm = undefined;
        }
    }

    _saveSpeed() {
        this._savedSpeed = {
            ratios: {}
        };
        Object.assign(this._savedSpeed.ratios, this.ratios);
        this._savedSpeed.baseLength = this.baseLength;
    }

    _restoreSpeed() {
        this.ratios = this._savedSpeed.ratios;
        this._baseLength = this._savedSpeed.baseLength;
    }

    getNotes(tokens) {
        this._saveSpeed();
        let notes = [];
        for (let child of tokens.children) {
            if (child.type.substring(0, 9) === "directive") {
                switch (child.type) {
                    case "directive-timing-timingValue":
                        this.setWPM(child.children[0]);
                        this.setFWPM(child.children[1]);
                        break;
                    case "directive-timing-timingReset":
                        this._restoreSpeed();
                        break;
                    case "directive-timing-timingEqual":
                        this.setFWPM(this.wpm);
                        break;
                    case "directive-pause-pauseValue":
                        notes.push({d: -child.children[0]});
                        break;
                }
            } else {
                let chars;
                if (child.type === "morseWords") {
                    chars = child.children;
                } else {
                    chars = child.translation;
                }
                for (let char of chars) {
                    for (let element of char.split("")) {
                        let note = {};
                        note.d = this.lengths[element];
                        notes.push(note);
                    }
                }
            }
        }
        this._restoreSpeed();
        return notes;
    }

    /**
     * Return an array of millisecond timings. Pauses are indicated by negative durations.
     * @param {Object} tokens
     * @return {number[]}
     */
     getTimings(tokens) {
        let notes = this.getNotes(tokens);
        let timings = [];
        for (let note of notes) {
            timings.push(note.d);
        }
        return timings;
    }

    /**
     * Add up all the millisecond timings in a list.
     * @param {number[]} timings - list of millisecond timings (-ve for spaces)
     * @return {number}
     */
    getDuration(timings) {
        return timings.reduce(
            (accumulator, currentValue) => accumulator + Math.abs(currentValue),
            0
        );
    }

    /**
     * Get the Farnsworth dit length to dit length ratio
     * @return {number}
     */
    get farnsworthRatio() {
        // Compute fditlen / ditlen
        // This should be >1 and it is what you need to multiply the standard charSpace and wordSpace ratios by to get the adjusted farnsworth ratios
        // "PARIS " is 31 units for the characters and 19 units for the inter-character spaces and inter-word space
        // One unit takes 1 * 60 / (50 * wpm)
        // The 31 units should take 31 * 60 / (50 * wpm) seconds at wpm
        // "PARIS " should take 50 * 60 / (50 * fwpm) to transmit at fwpm, or 60 / fwpm  seconds at fwpm
        // Keeping the time for the characters constant,
        // The spaces need to take: (60 / fwpm) - [31 * 60 / (50 * wpm)] seconds in total
        // The spaces are 4 inter-character spaces of 3 units and 1 inter-word space of 7 units. Their ratio must be maintained.
        // A space unit is: [(60 / fwpm) - [31 * 60 / (50 * wpm)]] / 19 seconds
        // Comparing that to 60 / (50 * wpm) gives a ratio of (50.wpm - 31.fwpm) / 19.fwpm
        return (this._ditsInParis * this._wpm - (this._ditsInParis - this._spacesInParis) * this._fwpm) / (this._spacesInParis * this._fwpm);
    }

    /**
     * Force the WPM to match the base length without changing anything else
     */
    _setWPMfromBaseLength() {
        this._wpm = (MS_IN_MINUTE / this._ditsInParis) / this._baseLength;
    }

    /**
     * Set the WPM given dit length in ms
     * @param {number} ditLen
     */
    setWPMfromDitLen(ditLen) {
        this.setWPM((MS_IN_MINUTE / this._ditsInParis) / ditLen);
    }

    /** 
     * Force the FWPM to match the fditlen/ditlen ratio without changing anything else
     */
    _setFWPMfromRatio() {
        let ratio = Math.abs((this.lengths[CHAR_SPACE] / 3) / this.lengths['.']);
        this._fwpm = this._ditsInParis * this._wpm / (this._spacesInParis * ratio + (this._ditsInParis - this._spacesInParis));
    }

    /** 
     * Set the Farnsworth WPM given ratio of fditlength / ditlength
     * @param {number} ratio
     */
     setFWPMfromRatio(ratio) {
        ratio = Math.max(Math.abs(ratio), 1);  // take abs just in case someone passes in something -ve
        this.setFWPM(this._ditsInParis * this._wpm / (this._spacesInParis * ratio + (this._ditsInParis - this._spacesInParis)));
    }

    /**
     * Get the length of the base element (i.e. a dit) in milliseconds
     * @return {number}
     */
    get baseLength() {
        this._baseLength = this._baseLength || (MS_IN_MINUTE / this._ditsInParis) / this._wpm;
        return this._baseLength;
    }

    /**
     * Calculate and return the millisecond duration of each element, using negative durations for spaces.
     * @returns Map
     */
    get lengths() {
        if (this._lengths === undefined) {
            this._lengths = {};
            this._maxLength = 0;
            Object.assign(this._lengths, this.ratios);
            for (let element in this._lengths) {
                this._lengths[element] *= this._baseLength;
                this._maxLength = Math.max(this._maxLength, this._lengths[element]);
            }
        }
        return this._lengths;  // this is just a cache for speed, the ratios define the lengths
    }

    /**
     * Return the length of the longest beep in milliseconds.
     * @returns {number}
     */
    get maxLength() {
        if (this._lengths === undefined) {
            let tmp = this.lengths;
        }
        return this._maxLength;
    }

    setLength(element, length) {
        if (element == this._baseElement) {
            this._lengths = undefined;
            this._wpm = undefined;
            this._fwpm = undefined;

            this._baseLength = length;
        }
        this.setRatio(element, length / this._baseLength);
    }

    /** 
     * Get the absolute duration of the space between words in ms.
     * @type {number}
     */
    get wordSpace() {
        return Math.abs(this.lengths[WORD_SPACE]);
    }
}
