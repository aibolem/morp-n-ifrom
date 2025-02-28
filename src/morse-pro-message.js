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

/**
 * Class for conveniently translating to and from Morse code.
 * Deals with error handling.
 * Works out if the input is Morse code or not.
 *
 * @example
 * import MorseMessage from 'morse-pro-message';
 * import MorseCWWave from 'morse-pro-cw-wave';
 * let morseCWWave = new MorseCWWave();
 * let morseMessage = new MorseMessage(morseCWWave);
 * let output;
 * try {
 *     output = morseMessage.translate("abc");
 * catch (ex) {
 *     // output will be best attempt at translation
 *     // to understand the detail of where the error is, look at morseMessage.errors or display getErrorString()
 * }
 * if (morseMessage.inputWasMorse) {
 *     // do something
 * }
 * // get the Morse code waveform
 * let wave = morseMessage.wave;
 */
export default class MorseMessage {
    constructor(morseCWWave) {
        this.morseCWWave = morseCWWave;
        this._rawInput = undefined;      // not used externally
        this.inputWasMorse = undefined;
        this.text = undefined;
        this.morse = undefined;
        this.tokens = undefined;
    }

    get hasError() {
        return this.tokens === null || this.tokens.error;
    }

    /**
     * Translate to or from Morse.
     * @param {string} input - alphanumeric text or morse code to translate
     * @param {boolean} isMorse - whether the input is Morse code or not (if not set then the looksLikeMorse method will be used)
     * @throws Error if there was something untranslatable
     */
    translate(input, isMorse) {
        if (typeof isMorse === "undefined") {
            // make a guess: could be wrong if someone wants to translate "." into Morse for instance
            isMorse = this.morseCWWave.looksLikeMorse(input);
        }

        let ret;
        if (isMorse) {
            ret = this.loadMorse(input);
        } else {
            ret = this.loadText(input);
        }

        if (this.hasError) {
            throw new Error("Error in input: " + '[' + input + ']');
        }

        return ret;
    }

    _completeFields(d) {
        this.tokens = d;
        this.text = this.morseCWWave.displayText(this.tokens);
        this.morse = this.morseCWWave.displayMorse(this.tokens);
    }

    loadMorse(input) {
        this._rawInput = input;
        this.inputWasMorse = true;
        this._completeFields(this.morseCWWave.loadMorse(input));
        return this.text;
    }

    loadText(input, clean = false) {
        this._rawInput = input;
        this.inputWasMorse = false;
        if (clean) {
            this._completeFields(this.morseCWWave.loadTextClean(input));
        } else {
            this._completeFields(this.morseCWWave.loadText(input));
        }
        return this.morse;
    }

    cleanText() {
        this._completeFields(this.morseCWWave.cleanText(this.tokens));
        return this.text;
    }

    /**
     * Get the message timings and frequencies.
     * @returns {Object[]} an array of Objects. Each item has keys "d" and "f" for duration in ms and frequency in Hz.
     */
    get notes() {
        return this.getNotes();
    }

    /**
     * Get the message timings and frequencies.
     * @returns {Object[]} an array of Objects. Each item has keys "d" and "f" for duration in ms and frequency in Hz.
     */
    getNotes(perfect=true) {
        return this.morseCWWave.getNotes(this.tokens, perfect);
    }
    
    /**
     * Get the message timings and frequencies.
     * @returns {Object} an object with keys "timings" and "frequencies" (array of millisecond note duration timings, and an array of note frequencies in Hz).
     */
    get sequence() {
        return this.getSequence();
    }

    /**
     * Get the message timings and frequencies.
     * @returns {Object} an object with keys "timings" and "frequencies" (array of millisecond note duration timings, and an array of note frequencies in Hz).
     */
    getSequence(perfect=true) {
        return this.morseCWWave.getSequence(this.tokens, perfect);
    }
    
    /**
     * Get the message timings.
     * @returns {number[]} an array of millisecond note duration timings, -ve numbers indicating silence.
     */
    get timings() {
        return this.sequence.timings;
    }

    /**
     * Get the message timings.
     * @returns {number[]} an array of millisecond note duration timings, -ve numbers indicating silence.
     */
    getTimings(perfect=true) {
        return this.getSequence(perfect).timings;
    }

    /**
     * Get the message as a sound waveform.
     * @returns {number[]} an array of floats in range [-1, 1] representing the waveform.
     */
    get wave() {
        return this.morseCWWave.getSample(this.sequence);
    }

    /**
     * Get the message as a sound waveform.
     * @returns {number[]} an array of floats in range [-1, 1] representing the waveform.
     */
    getWave(perfect=true) {
        return this.morseCWWave.getSample(this.getSequence(perfect));
    }

    /**
     * Get the message as a sound waveform.
     * @param {number} [startPadding] - the number of milliseconds silence to add to the start
     * @param {number} [endPadding] - the minimum number of milliseconds silence to have at the end
     * @returns {number[]} an array of floats in range [-1, 1] representing the waveform.
     */
    getSample(startPadding, endPadding, perfect=true) {
        return this.morseCWWave.getSample(this.getSequence(perfect), startPadding, endPadding);
    }

    /**
     * 
     * @param {String} prefix - this is placed before each input token that had an error
     * @param {String} suffix - this is placed after each input token that had an error
     * @param {Map} escapeMap - any token matching a key in this map is replaced by the value (e.g. {'>': '&gt;', '<': '&lt;'})
     */
    getInputErrorString(prefix, suffix, escapeMap={}) {
        if (this.inputWasMorse) {
            return this.getMorseErrorString(prefix, suffix);
        } else {
            return this.getTextErrorString(prefix, suffix, escapeMap);
        }
    }

    getOutputErrorString(prefix, suffix, escapeMap={}) {
        if (!this.inputWasMorse) {
            return this.getMorseErrorString(prefix, suffix);
        } else {
            return this.getTextErrorString(prefix, suffix, escapeMap);
        }
    }

    getTextErrorString(prefix, suffix, escapeMap={}) {
        return this.morseCWWave.displayTextErrors(this.tokens, escapeMap, prefix, suffix);
    }

    getMorseErrorString(prefix, suffix) {
        return this.morseCWWave.displayMorseErrors(this.tokens, prefix, suffix);
    }
}
