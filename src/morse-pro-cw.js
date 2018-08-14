/*
This code is © Copyright Stephen C. Phillips, 2017.
Email: steve@scphillips.com

Licensed under the EUPL, Version 1.2 or – as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at: https://joinup.ec.europa.eu/community/eupl/
Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the Licence for the specific language governing permissions and limitations under the Licence.
*/

import * as WPM from './morse-pro-wpm';
import MorseMessage from './morse-pro-message';

/**
 * Class to create the on/off timings needed by e.g. sound generators. Timings are in milliseconds; "off" timings are negative.
 *
 * @example
 * import MorseCW from 'morse-pro-cw';
 * var morseCW = new MorseCW();
 * morseCW.translate("abc");
 * var timings = morseCW.getTimings();
 */
export default class MorseCW extends MorseMessage {
    /**
     * @param {boolean} [prosigns=true] - whether or not to include prosigns in the translations
     * @param {number} wpm - the speed in words per minute using PARIS as the standard word
     * @param {number} fwpm - the Farnsworth speed in words per minute (defaults to wpm)
     */
    constructor(useProsigns = true, wpm = 20, fwpm = wpm) {
        super(useProsigns);
        /** @type {number} */
        this.wpm = wpm;
        /** @type {number} */
        this.fwpm = fwpm;
    }

    /** @type {number} */
    set wpm(wpm) {
        this._wpm = wpm;
        if (wpm < this._fwpm) {
            this._fwpm = wpm;
        }
    }

    /** @type {number} */
    get wpm() {
        return this._wpm;
    }

    /** @type {number} */
    set fwpm(fwpm) {
        this._fwpm = fwpm;
        if (fwpm > this._wpm) {
            this._wpm = fwpm;
        }
    }

    /** @type {number} */
    get fwpm() {
        return this._fwpm;
    }

    /** @type {number} */
    get wordSpace() {
        return WPM.wordSpace(this._wpm, this._fwpm);
    }

    /**
     * Return an array of millisecond timings.
     * With the Farnsworth method, the morse characters are played at one
     * speed and the spaces between characters at a slower speed.
     * @param {string} [padding=''] - space to add to the end (either ' ' or '/'), useful if you want the sound to be able to loop
     * @return {number[]}
     */
    getTimings() {
        var dit = WPM.ditLength(this._wpm);
        var fdit = WPM.fditLength(this._wpm, this._fwpm);
        return MorseCW.getTimingsGeneral(dit, 3 * dit, dit, 3 * fdit, 7 * fdit, this.morse);
    }

    /**
     * Return an array of millisecond timings.
     * Each sound and space has a duration. The durations of the spaces are distinguished by being negative.
     * @param {number} dit - the length of a dit in milliseconds
     * @param {number} dah - the length of a dah in milliseconds (normally 3 * dit)
     * @param {number} ditSpace - the length of an intra-character space in milliseconds (1 * dit)
     * @param {number} charSpace - the length of an inter-character space in milliseconds (normally 3 * dit)
     * @param {number} wordSpace - the length of an inter-word space in milliseconds (normally 7 * dit)
     * @param {string} morse - the (canonical) morse code string (matching [.-/ ]*)
     * @param {string} [padding=''] - space to add to the end (matching [ /]*), useful if you want the sound to be able to loop
     * @return {number[]}
     */
    static getTimingsGeneral(dit, dah, ditSpace, charSpace, wordSpace, morse) {
        //console.log("Morse: " + morse);

        if (this.hasError) {
            console.log("Error in message, cannot compute timings: " + this.morse);
            return [];  // TODO: or throw exception?
        }
        morse = morse.replace(/ \/ /g, '/');  // this means that a space is only used for inter-character
        morse = morse.replace(/([\.\-])(?=[\.\-])/g, "$1+");  // put a + in between all dits and dahs
        var times = [];
        var c;
        for (var i = 0; i < morse.length; i++) {
            switch (morse[i]) {
                case '.':
                    times.push(dit);
                    break;
                case '-':
                    times.push(dah);
                    break;
                case '+':
                    times.push(-ditSpace);
                    break;
                case " ":
                    times.push(-charSpace);
                    break;
                case "/":
                    times.push(-wordSpace);
                    break;
            }
        }

        // If the padding has introduced several spaces on the end then add them all up
        var lastSpace = 0;
        while (times[times.length - 1] < 0) {
            lastSpace += times.pop();
        }
        if (lastSpace < 0) {
            times.push(lastSpace);
        }

        //console.log("Timings: " + times);
        return times;
    }

    /**
     * Get the total duration of the message in ms
     8 @return {number}
     */
    getDuration() {
        var times = this.getTimings();
        var t = 0;
        for (var i = 0; i < times.length; i++) {
            t += Math.abs(times[i]);
        }
        return t;
    }
}
