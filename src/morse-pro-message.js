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

import * as Morse from './morse-pro';

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
 *     // to understand the detail of where the error is, look at morseMessage.errors
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
        // this.player = morsePlayer;
        this.rawInput = undefined;
        this.inputWasMorse = undefined;
        this.text = undefined;
        this.textTokens = undefined;
        this.morse = undefined;
        this.morseTokens = undefined;
        this.errors = undefined;
        this.hasError = undefined;
        // this.volumes = undefined;
        // this.frequencies = undefined;
    }

    /**
     * @param {string} input - alphanumeric text or morse code to translate
     * @param {boolean} isMorse - whether the input is Morse code or not (if not set then the looksLikeMorse method will be used)
     */
    translate(input, isMorse) {
        this.rawInput = input;
        if (typeof isMorse === "undefined") {
            // make a guess: could be wrong if someone wants to translate "." into Morse for instance
            isMorse = this.morseCWWave.looksLikeMorse(input);
        }
        let d;
        if (isMorse) {
            this.inputWasMorse = true;
            d = this.morseCWWave.morse2text(input);
        } else {
            this.inputWasMorse = false;
            d = this.morseCWWave.text2morse(input);
        }

        // console.log(d);
        this.morseTokens = d.morse;
        this.textTokens = d.text;
        this.errors = d.error;
        this.hasError = d.hasError; 

        this.text = this.morseCWWave.displayText(this.textTokens);
        // console.log(this.text);
        this.morse = this.morseCWWave.displayMorse(this.morseTokens);
        // console.log(this.morse);
        if (this.hasError) {
            throw new Error("Error in input");
        }

        if (this.inputWasMorse) {
            return this.text;
        } else {
            return this.morse;
        }
    }

    get timings() {
        return this.morseCWWave.morseTokens2timing(this.morseTokens);
    }

    get wave() {
        return this.morseCWWave.getSample(this.timings);
    }

    // /**
    //  * Load in some Morse without attempting to translate it.
    //  * @param {String} morse - Morse code string to load in
    //  */
    // loadMorse(morse) {
    //     if (!Morse.looksLikeMorse(morse)) {
    //         throw new Error("Error in input");
    //     }
    //     this.input = morse;
    //     this.inputWasMorse = true;
    //     this.morse = Morse.tidyMorse(morse);
    // }
    // /**
    //  * Clear all the errors from the morse and message. Useful if you want to play the sound even though it didn't translate.
    //  */
    // clearError() {
    //     if (this.inputWasMorse) {
    //         this.morse = this.morse.replace(/#/g, "");  // leave in the bad Morse
    //     } else {
    //         this.message = this.message.replace(/#[^#]*?#/g, "");
    //         this.morse = this.morse.replace(/#/g, "");
    //     }
    //     this.hasError = false;
    // }
}
