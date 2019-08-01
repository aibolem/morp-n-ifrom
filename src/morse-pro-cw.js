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
 * Class to create the on/off timings needed by e.g. sound generators. Timings are in milliseconds; "off" timings are negative.
 *
 * @example
//  * import MorseCW from 'morse-pro-cw';
//  * var morseCW = new MorseCW();
//  * morseCW.translate("abc");
//  * var timings = morseCW.getTimings();
//  */

import Morse from './morse-pro';

const MS_IN_MINUTE = 60000;  /** number of milliseconds in 1 minute */

export default class MorseCW extends Morse {
    // /**
    //  * @param {boolean} [prosigns=true] - whether or not to include prosigns in the translations
    //  * @param {number} [wpm=20] - the speed in words per minute using PARIS as the standard word
    //  * @param {number} [fwpm=wpm] - the Farnsworth speed in words per minute (defaults to wpm)
    //  */
    /**
     * 
     * @param {Map} namedParameters
     */
    constructor({dictionary='international', options=[], wpm=20, fwpm=wpm} = {}) {
        super({dictionary, options});
        /** Morse tokens representing 'PARIS' */
        this._parisMorseTokens = this.textTokens2morse(this.tokeniseRawText('PARIS')).morse;
        /** The element of the dictionary that the ratios are based off */
        this._baseElement = this.dictionary.baseElement;
        /** In initialise the ratios based on the dictionary but enable them to be changed thereafter */
        this.ratios = this.dictionary.ratio;
        this._farnsworthRatio = undefined;
        /** @type {number} */
        this.setWPM(wpm);
        /** @type {number} */
        this.setFWPM(fwpm);
    }

    /** 
     * Set the WPM speed. Ensures that Farnsworth WPM is no faster than WPM.
     * @type {number} */
    setWPM(wpm) {
        this._setWPM(wpm);
    }

    _setWPM(wpm) {
        wpm = Math.max(1, wpm || 1);
        this._wpm = wpm;
        this._fwpm = Math.min(this._wpm, this._fwpm);
        this._farnsworthRatio = undefined;
    }

    /** @type {number} */
    get wpm() {
        return this._wpm;
    }

    /**
     * Set the Farnsworth WPM speed. Ensures that WPM is no slower than Farnsworth WPM.
     *  @type {number} */
    setFWPM(fwpm) {
        this._setFWPM(fwpm);
    }

    _setFWPM(fwpm) {
        fwpm = Math.max(1, fwpm || 1);
        this._fwpm = fwpm;
        this._wpm = Math.max(this._wpm, this._fwpm);
        this._farnsworthRatio = undefined;
    }

    /** @type {number} */
    get fwpm() {
        return this._fwpm;
    }

    /** @type {number[]} */
    get ratios() {
        return this._ratios;
    }

    /**
     * Set the ratio of each element to the base element and recalcculate the PARIS parameters
     * @param {Map} r - a Map from element to ratio (as defined in the 'ratio' element of a dictionary)
     */
    set ratios(r) {
        this._ratios = {};
        Object.assign(this._ratios, r);
        for (let element in this._ratios) {
            this._ratios[element] /= this._ratios[this._baseElement];
        }
        this._initPARIS();
    }

    /**
     * Calculate the number of dits in PARIS and the number of spaces in PARIS (both in terms of the base element).
     * This changes with the ratios.
     */
    _initPARIS() {
        this._ditsInParis = this.getDuration(
            this.morseTokens2timing(this._parisMorseTokens, this._ratios)
        ) + Math.abs(this._ratios.wordSpace);
        this._spacesInParis = Math.abs((4 * this._ratios.charSpace) + this._ratios.wordSpace);
        this._farnsworthRatio = undefined;
    }

    /**
     * Return an array of millisecond timings.
     * With the Farnsworth method, the morse characters are played at one
     * speed and the spaces between characters at a slower speed.
     * @param {Array} morseTokens - array of morse tokens corresponding to the ratio element of the dictionary used, e.g. [['..', '.-'], ['--', '...']]
     * @param {Dict} [lengths=this.lengths] - dictionary mapping element to duration with negative duration for spaces
     * @return {number[]}
     */
    morseTokens2timing(morseTokens, lengths = this.lengths) {
        let timings = [];
        for (let word of morseTokens) {
            for (let char of word) {
                timings = timings.concat(char.split('').map(symbol => lengths[symbol]));
                timings = timings.concat(lengths.charSpace);
            }
            timings.pop()
            timings = timings.concat(lengths.wordSpace);
        }
        timings.pop();
        return timings;
    }

    /**
     * Add up all the millisecond timings in a list
     * @param {Array} timings - list of millisecond timings (-ve for spaces)
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
        // "PARIS " is 31 units for the characters and 19 units for the inter-character spaces and inter-word space
        // One unit takes 1 * 60 / (50 * wpm)
        // The 31 units should take 31 * 60 / (50 * wpm) seconds at wpm
        // "PARIS " should take 50 * 60 / (50 * fwpm) to transmit at fwpm, or 60 / fwpm  seconds at fwpm
        // Keeping the time for the characters constant,
        // The spaces need to take: (60 / fwpm) - [31 * 60 / (50 * wpm)] seconds in total
        // The spaces are 4 inter-character spaces of 3 units and 1 inter-word space of 7 units. Their ratio must be maintained.
        // A space unit is: [(60 / fwpm) - [31 * 60 / (50 * wpm)]] / 19 seconds
        // Comparing that to 60 / (50 * wpm) gives a ratio of (50.wpm - 31.fwpm) / 19.fwpm
        this._farnsworthRatio = this._farnsworthRatio || (this._ditsInParis * this._wpm - (this._ditsInParis - this._spacesInParis) * this._fwpm) / (this._spacesInParis * this._fwpm);
        return this._farnsworthRatio;
    }

    /**
     * Set the WPM given dit length in ms
     * @param {number} ditLen
     */
    setWPMfromDitLen(ditLen) {
        this.setWPM((MS_IN_MINUTE / this._ditsInParis) / ditLen);
    }

    /** 
     * Set the Farnsworth WPM given ratio of dit length / Farnsworth dit length
     * @param {number} ratio
     */
    setFWPMfromRatio(ratio) {
        ratio = Math.max(ratio, 1);
        this.setFWPM(this._ditsInParis * this.wpm / (this._spacesInParis * ratio + (this._ditsInParis - this._spacesInParis)));
    }

    /**
     * Get the length of the base element (i.e. a dit) in milliseconds
     * @return {number}
     */
    get baseLength() {
        return (MS_IN_MINUTE / this._ditsInParis) / this._wpm;
    }

    /**
     * Calculate and return the millisecond duration of each element, using negative durations for spaces.
     * @returns Map
     */
    get lengths() {
        let ditLen = this.baseLength;
        let fRatio = this.farnsworthRatio;
        let lengths = {};
        for (let element in this._ratios) {
            lengths[element] = this._ratios[element] * ditLen;
        }
        lengths.charSpace *= fRatio;
        lengths.wordSpace *= fRatio;
        return lengths;
    }

    // /**
    //  * Calculate and return the millisecond duration of a single element (negative for a space).
    //  * @param {String} element 
    //  * @returns Number
    //  */
    // getLength(element) {
    //     return this.lengths[element];
    // }

    /** 
     * Get the absolute duration of the space between words in ms.
     * @type {number}
     */
    get wordSpace() {
        return Math.abs(this.lengths.wordSpace);
    }
}
