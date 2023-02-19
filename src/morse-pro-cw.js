/*!
This code is © Copyright Stephen C. Phillips, 2018-2022.
Email: steve@morsecode.world
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
     * @param {number} [params.frequency=550] - frequency of wave in Hz
     */
    constructor({ dictionary, dictionaryOptions, wpm = 20, fwpm = wpm, frequency = 550 } = {}) {
        super({ dictionary, dictionaryOptions });
        /** The element of the dictionary that the ratios are based off */
        this._baseElement = this.dictionary.baseElement;
        /** Initialise the ratios based on the dictionary but enable them to be changed thereafter */
        this.ratios = { ...this.dictionary.ratio };  // actually does a copy from the dict so we can reset if needed
        /** Initialise all element variation to be no variability */
        this.variation = {};
        for (let k in this.ratios) {
            this.setVariation(k, {
                sysOffset: 0,
                sysSlope: 1,
                rndRange: 0,
                rndSlope: 0,
                stdDev: 0
            });
        }
        /** Compute ditsInParis and spacesInParis while we have original ratio */
        let parisTokens = this.loadText('PARIS');
        this._baseLength = 1;
        this._ditsInParis = this.getDuration(this.getTimings(parisTokens)) + Math.abs(this.ratios[WORD_SPACE]);
        this._spacesInParis = Math.abs((4 * this.ratios[CHAR_SPACE]) + this.ratios[WORD_SPACE]);
        /** Initialise wpm and fwpm (this potentially changes the ratios) */
        this.setWPM(wpm);
        this.setFWPM(fwpm);
        this.setFrequency(frequency);  // frequency of wave in Hz
    }

    /** 
     * Set the WPM speed. Ensures that Farnsworth WPM is no faster than WPM.
     * @param {number} wpm
     */
    setWPM(wpm) {
        let fwpm = this.fwpm;  // recalculate fwpm first
        this._baseLength = undefined;
        this._ratios = undefined;
        this._lengths = undefined;

        wpm = Math.max(1, wpm || 1);
        this._wpm = wpm;
        if (fwpm === undefined) {
            this._fwpm = this._wpm;
        } else {
            this._fwpm = Math.min(this._wpm, fwpm);
        }

        let tmp = this.ratios;
        tmp = this.baseLength;
        return wpm;
    }

    /** @type {number} */
    get wpm() {
        if (this._wpm === undefined && this.testWPMmatchesRatio()) {
            this._setWPMfromBaseLength();
        }
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
        if (this.wpm === undefined) {
            this.setWPM(this._fwpm);
        } else {
            this.setWPM(Math.max(this._wpm, this._fwpm))
        }
        return fwpm;
    }

    /** @type {number} */
    get fwpm() {
        if (this._fwpm === undefined && this.testFWPMmatchesRatio()) {
            this._setFWPMfromRatio();
        }
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
            // make sure the sign of the ratio is correct
            this._ratios[element] = Math.abs(this._ratios[element]) * (this.dictionary.ratio[element] > 0 ? 1 : -1);
        }
    }

    /**
     * Get the equivalent WPM, given all the lengths.
     * i.e. Calculate the duration of "PARIS " and just use that.
     */
    get equivalentWPM() {
        let paris = 10 * this.lengths['.'] +
        4 * this.lengths['-'] +
        -9 * this.lengths[' '] +
        -4 * this.lengths[CHAR_SPACE] +
        -1 * this.lengths[WORD_SPACE];
        return 60 * 1000 / paris;
    }

    setRatio(element, ratio) {
        // make sure the sign of the ratio is correct
        ratio = Math.abs(ratio) * (this.dictionary.ratio[element] > 0 ? 1 : -1);
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
        return ratio;
    }

    setFrequency(f) {
        this._frequency = f;
    }

    getFrequency() {
        return this._frequency;
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

    _saveFrequency() {
        this._savedFrequency = this.getFrequency();
    }

    _restoreFrequency() {
        this.setFrequency(this._savedFrequency);
    }

    _saveParameters() {
        this._saveSpeed();
        this._saveFrequency();
    }

    _restoreParameters() {
        this._restoreSpeed();
        this._restoreFrequency();
    }

    /**
     * 
     * @param {*} tokens 
     * @returns {Array} notes - Array of Objects with keys "d" for millisecond duration and "f" for frequency.
     */
    getNotes(tokens, perfect=true) {
        let notes = [];
        if (tokens === null) return notes;
        this._saveParameters();
        // need to save original values so that relative changes are relative to original rather than cummulative
        let wpm = this.wpm;
        let fwpm = this.fwpm;  // need to save it otherwise it can be altered by changing wpm
        let frequency = this.getFrequency();
        for (let child of tokens.children) {
            if (child.type.substring(0, 3) === "tag") {
                let number;
                switch (child.type) {
                    case "tag-timing-timingValue":
                        if (child.children.length == 2) {
                            number = this.parseNumber(child.children[0]);
                            if (number.isPercentage) {
                                if (number.isRelative) {
                                    number.value += 100;
                                }
                                this.setWPM(wpm * number.value / 100);
                            } else {
                                if (number.isRelative) {
                                    number.value += wpm;
                                }
                                this.setWPM(number.value);
                            }
                            number = this.parseNumber(child.children[1]);
                            if (number.isPercentage) {
                                if (number.isRelative) {
                                    number.value += 100;
                                }
                                this.setFWPM(fwpm * number.value / 100);
                            } else {
                                if (number.isRelative) {
                                    number.value += fwpm;
                                }
                                this.setFWPM(number.value);
                            }
                        } else {
                            number = this.parseNumber(child.children[0]);
                            if (number.isPercentage) {
                                if (number.isRelative) {
                                    number.value += 100;
                                }
                                this.setWPM(wpm * number.value / 100);
                                this.setFWPM(fwpm * number.value / 100);
                            } else {
                                if (number.isRelative) {
                                    this.setWPM(wpm + number.value);
                                    this.setFWPM(fwpm + number.value);
                                } else {
                                    this.setWPM(number.value);
                                    this.setFWPM(number.value);
                                }
                            }
                        }
                        break;
                    case "tag-timing-timingReset":
                        this._restoreSpeed();
                        break;
                    case "tag-timing-timingEqual":
                        this.setFWPM(this.wpm);
                        break;
                    case "tag-pause-pauseValue":
                        notes.push({ d: -child.children[0] });
                        break;
                    case "tag-pause-pauseSpace":
                        notes.push({ d: this.lengths[WORD_SPACE] * child.children.length });
                        break;
                    case "tag-pitch-pitchValue":
                        number = this.parseNumber(child.children[0]);
                        if (number.isPercentage) {
                            if (number.isRelative) {
                                number.value += 100;
                            }
                            this.setFrequency(frequency * number.value / 100);
                        } else {
                            if (number.isRelative) {
                                number.value += frequency;
                            }
                            this.setFrequency(number.value);
                        }
                        break;
                    case "tag-pitch-pitchReset":
                        this._restoreFrequency();
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
                        let note = {
                            d: perfect ? this.lengths[element] : this.getAdjustedLength(element),
                            f: this.getFrequency()
                        }
                        notes.push(note);
                    }
                }
            }
        }
        this._restoreParameters();
        return notes;
    }

    getSequence(tokens, perfect=true) {
        let notes = this.getNotes(tokens, perfect);
        let timings = [];
        let frequencies = [];
        for (let note of notes) {
            timings.push(note.d);
            frequencies.push(note.f);
        }
        return { timings, frequencies };
    }

    /**
     * Return an array of millisecond timings. Pauses are indicated by negative durations.
     * @param {Object} tokens
     * @return {number[]}
     */
    getTimings(tokens, perfect=true) {
        return this.getSequence(tokens, perfect).timings;
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
        // make sure the sign of the length is correct
        length = Math.abs(length) * (this.dictionary.ratio[element] > 0 ? 1 : -1);
        if (element == this._baseElement) {
            this._lengths = undefined;
            this._wpm = undefined;
            this._fwpm = undefined;

            this._baseLength = length;
        }
        this.setRatio(element, length / this._baseLength);
        return length;
    }

    /** 
     * Get the absolute duration of the space between words in ms.
     * @type {number}
     */
    get wordSpace() {
        return Math.abs(this.lengths[WORD_SPACE]);
    }

    setVariation(element, {sysOffset, sysSlope, rndRange, rndSlope, stdDev} = {}) {
        this.variation[element] = {sysOffset, sysSlope, rndRange, rndSlope, stdDev};
    }

    getVariation(element) {
        return this.variation[element];
    }

    /**
     * Get the length of an element, taking into account the variation parameters, potentially adding an offset and randomness.
     * @param {String} element - the element to get the length for (e.g. '.', '-')
     * @returns {Number} - the duration in milliseconds, -ve number used for spaces
     */
    getAdjustedLength(element) {
        let mean = this._lengths[element];
        let {sysOffset, sysSlope, rndRange, rndSlope, stdDev} = this.getVariation(element);
        // add on a systematic error
        let sys = Math.abs(mean) * sysSlope + sysOffset;
        // get random number in range [-1, 1]
        let rnd = this.truncatedNormal(stdDev);
        // the range of the random part can vary with the mean
        let range2 = (Math.abs(mean) * rndSlope + rndRange) / 2
        // keep the random variable within the range
        rnd *= range2;
        // add the random part to the systematic part, making sure we return a number with the same sign as the input and >= 0
        // = sysSlope * mean + sysOffset + rnd() * (rndSlope * mean + rndRange) / 2
        return Math.max(sys + rnd, 0) * Math.sign(mean);

        // Comparison to Seiuchy's model (http://seiuchy.macache.com/)
        // This returns     sysSlope * mean + sysOffset + rnd() * (rndSlope * mean + rndRange) / 2
        // As the rnd() function here is [-1, 1] it is similar to [Math.random() * 2 - 1] (a different distribution though)
        // = sysSlope * mean + sysOffset + [(Math.random() * 2) - 1] * (rndSlope * mean + rndRange) / 2
        // = sysSlope * mean + sysOffset + (Math.random() - 0.5) * (rndSlope * mean + rndRange)
        // = mean * {Math.random() * rndSlope + [sysSlope - (rndSlope / 2)]} + (Math.random() * rndRange) + sysOffset - (rndRange / 2)
        // Seiuchy uses     mean * (Math.random() * s + c)
        // Therefore rndSlope = s
        //       and sysSlope = c + s/2
        //      also rndRange = 0
        //          sysOffset = 0
        //             stdDev = large to simulate a uniform distribution
    }

    /**
     * Get a random number in the range [-1, 1]. Uses a (truncated) normal distribution.
     * Use a large stdDev to simulate a uniform distribution.
     * @param {Number} stdDev - the standard deviation of the normal distribution
     * @returns {Number} - a random number
     */
    truncatedNormal(stdDev) {
        // get number with mean 0, variance 1 (using Box-Muller transform), pre-multiply by stdDev (might shortcut if stdDev == 0)
        let rnd = stdDev * Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
        // shift values outside [-1, 1] into the range [-1, 1]
        rnd -= Math.trunc(rnd)
        return rnd;
    }
}
