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
import MorseDecoder from './morse-pro-decoder';
import MorsePlayerWAA from './morse-pro-player-waa';

/**
 * The Morse keyer tests for input on a timer, plays the appropriate tone and passes the data to a decoder.
 *
 * @example
 * var ditKey = 90;  // Z
 * var dahKey = 88;  // X
 * window.onkeyup = function(e) {
 *     if (e.keyCode === ditKey) { dit = false; }
 *     if (e.keyCode === dahKey) { dah = false; }
 * };
 * window.onkeydown = function(e) {
 *     var wasMiddle = !dit & !dah;
 *     if (e.keyCode === ditKey) { dit = true; }
 *     if (e.keyCode === dahKey) { dah = true; }
 *     if (wasMiddle & (dit | dah)) { keyer.start(); }
 * };
 * var keyCallback = function() {
 *     return ((dit === true) * 1) + ((dah === true) * 2);
 * };
 * var messageCallback = function(d) {
 *     console.log(d.message);
 * };
 * keyer = new MorseKeyer(keyCallback, 20, 550, messageCallback);
 */
export default class MorseKeyer {
    /**
     * @param {function(): number} keyCallback - A function which should return 0, 1, 2, or 3 from the vitual "paddle" depending if nothing, a dit, a dah or both is detected. This implementation will play dits if both keys are detected.
     * @param {number} [wpm=20] - Speed of the keyer.
     * @param {number} [fwpm=wpm] - Farnsworth speed of the keyer.
     * @param {number} [frequency=550] - The frequency in Hz for the sidetone.
     * @param {function(dict: {message: string, timings: number[], morse: string})} messageCallback - A function which receives a dictionary with keys 'message', 'timings' and 'morse' for each decoded part (see MorseDecoder). Its use here will result in a single character being returned each time.
     */
    constructor(keyCallback, wpm = 20, fwpm = wpm, frequency = 550, messageCallback = undefined) {
        this.keyCallback = keyCallback;
        this.wpm = wpm;
        this.fwpm = fwpm;

        this.player = new MorsePlayerWAA();
        this.player.frequency = frequency;
        this.decoder = new MorseDecoder(this.wpm, this.fwpm);
        this.decoder.messageCallback = messageCallback;
        this.decoder.noiseThreshold = 0;

        this.ditLen = WPM.ditLength(wpm);  // duration of dit in ms
        this.fditLen = WPM.fditLength(wpm, fwpm);  // TODO: finish fwpm bit
        this.playing = false;
    }

    /**
     * @access: private
     */
    check() {
        var key = this.keyCallback();
        var ditOrDah = this._ditOrDah(key);

        if (this.lastTime) {
            // record the amount of silence since the last time we were here
            this.decoder.addTiming(-( (new Date()).getTime() - this.lastTime ));
        }
        if (ditOrDah === undefined) {
            // If no keypress is detected then continue pushing chunks of silence to the decoder to complete the character and add a space
            this.playing = false;  // make the keyer interuptable so this the next character can start
            this.lastTime = (new Date()).getTime();  // time marking the end of the last data that was last pushed to decoder
            if (this.spaceCounter < 3) {
                this.spaceCounter++;
                this.timer = setTimeout(this.check.bind(this), 2 * this.fditLen);  // keep pushing up to 6 dit-spaces to complete character or word
            } else {
                this.stop();
            }
        } else {
            var duration = (ditOrDah ? 1 : 3) * this.ditLen;
            this._playTone(duration);
            this.decoder.addTiming(duration);
            this.lastTime = (new Date()).getTime() + duration;
            this.timer = setTimeout(this.check.bind(this), duration + this.fditLen);  // check key state again after the dit or dah and after a dit-space
        }
    }

    /**
     * Translate key input into whether to play nothing, dit, or dah
     * @returns undefined, true or false for nothing, dit or dah
     * @access: private
     */
    _ditOrDah(input) {
        if (input & 1) {
            return true;
        } else if (input === 2) {
            return false;
        } else {
            return undefined;
        }
    }

    /**
     * Call this method when an initial key-press (or equivalent) is detected.
     */
    start() {
        if (this.playing) {
            // If the keyer is already playing then ignore a new start.
            return;
        } else {
            this.playing = true;
            this.spaceCounter = 0;
            this.lastTime = 0;  // removes extended pauses
            clearTimeout(this.timer);
            this.check();
        }
    }

    /**
     * This method can be called externally to stop the keyer but is also used internally when no key-press is detected.
     */
    stop() {
        this.playing = false;
        clearTimeout(this.timer);
    }

    /**
     * Play a dit or dah sidetone.
     * @param {number} duration - number of milliseconds to play
     * @access: private
     */
    _playTone(duration) {
        this.player.load([duration]);
        this.player.playFromStart();
    }
}
