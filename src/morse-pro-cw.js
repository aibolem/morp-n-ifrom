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
// const PARIS_MORSE_TOKENS = [['. - - .', '. -', '. -.', '. .', '. . .']];

export default class MorseCW extends Morse {
    // /**
    //  * @param {boolean} [prosigns=true] - whether or not to include prosigns in the translations
    //  * @param {number} [wpm=20] - the speed in words per minute using PARIS as the standard word
    //  * @param {number} [fwpm=wpm] - the Farnsworth speed in words per minute (defaults to wpm)
    //  */
    constructor({dictionary='international', useProsigns=true, wpm=20, fwpm=wpm} = {}) {
        super({dictionary, useProsigns});
        /** @type {number} */
        this.wpm = wpm;
        /** @type {number} */
        this.fwpm = fwpm;

        this._parisMorseTokens = this.textTokens2morse(this.tokeniseRawText('PARIS')).morse;
        this._baseElement = this.dictionary.baseElement;
        this.baseRatio = this.dictionary.ratio;
    }

    /** 
     * Set the WPM speed. Ensures that Farnsworth WPM is no faster than WPM.
     * @type {number} */
    set wpm(wpm) {
        this._wpm = wpm;
        this._fwpm = Math.min(this._wpm, this._fwpm);
    }

    /** @type {number} */
    get wpm() {
        return this._wpm;
    }

    /**
     * Set the Farnsworth WPM speed. Ensures that WPM is no slower than Farnsworth WPM.
     *  @type {number} */
    set fwpm(fwpm) {
        this._fwpm = fwpm;
        this._wpm = Math.max(this._wpm, this._fwpm);
    }

    /** @type {number} */
    get fwpm() {
        return this._fwpm;
    }

    get baseRatio() {
        return this._baseRatio;
    }

    set baseRatio(r) {
        this._baseRatio = {};
        Object.assign(this._baseRatio, r);
        for (let element in this._baseRatio) {
            this._baseRatio[element] /= this._baseRatio[this._baseElement];
        }
        this.initPARIS();
    }

    initPARIS() {
        this._ditsInParis = this.getDuration(
            this.morseTokens2timing(this._parisMorseTokens, this._baseRatio)
        ) + Math.abs(this._baseRatio.wordSpace);
        this._spacesInParis = Math.abs((4 * this._baseRatio.charSpace) + this._baseRatio.wordSpace);
    }

    /**
     * Return an array of millisecond timings.
     * With the Farnsworth method, the morse characters are played at one
     * speed and the spaces between characters at a slower speed.
     * @param {Array} morseTokens - array of morse tokens
     * @param {Dict} lengths - dictionary mapping element to millisecond length
     * @return {number[]}
     */
    morseTokens2timing(morseTokens, lengths = this.getLengths()) {
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
    getFarnsworthRatio() {
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
     * Get the length of the base element (i.e. a dit) in milliseconds
     * @return {number}
     */
    getBaseLength() {
        return (MS_IN_MINUTE / this._ditsInParis) / this._wpm;
    }

    getLengths() {
        let ditLen = this.getBaseLength();
        let fRatio = this.getFarnsworthRatio();
        let lengths = {};
        for (let element in this._baseRatio) {
            lengths[element] = this._baseRatio[element] * ditLen;
        }
        lengths.charSpace *= fRatio;
        lengths.wordSpace *= fRatio;
        return lengths;
    }

    getLength(element) {
        return this.getLengths()[element];
    }

    /** 
     * Get the length of the space between words in ms.
     * @type {number} */
    get wordSpace() {
        return Math.abs(this.getLength('wordSpace'));
    }
}
