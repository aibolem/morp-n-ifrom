// This code is © Copyright Stephen C. Phillips, 2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

import * as WPM from 'morse-pro-wpm';
import MorseDecoder from 'morse-pro-decoder';
import MorsePlayerWAA from 'morse-pro-player-waa';

/*
    The Morse keyer tests for input on a timer, plays the apprpriate tone and passes the data to a decorer.
    Arguments:
        - keyCallback: a function which should return {0, 1, 2, 3} from the vitual "paddle" depending if nothing, a dit, a dah or both is detected
                            This implementation will play dits if both keys are detected.
        - messageCallback: a function which receives a dictionary with keys 'message', 'timings' and 'morse' for each decoded part (see MorseDecoder)
                            Its use here will result in a single character being returned each time.
        - audioContextClass: e.g. window.AudioContext
        - frequency: the frequency in Hz for the sidetone
        - wpm: speed of the keyer (defaults to 20)
*/
export default class MorseKeyer {
    constructor(keyCallback, messageCallback, audioContextClass, frequency, wpm) {
        this.keyCallback = keyCallback;
        this.messageCallback = messageCallback;
        this.frequency = frequency;
        this.wpm = wpm || 20;

        this.ditLen = WPM.ditLength(wpm);  // duration of dit in ms
        this.playing = false;

        this.player = new MorsePlayerWAA(audioContextClass);
        this.decoder = new MorseDecoder(this.wpm, messageCallback);
        this.decoder.noiseThreshold = 0;

        var that = this;
        this.check = function() {
            var input = that.keyCallback();
            var dit;
            if (that.lastTime) {
                // record the amount of silence since the last time we were here
                that.decoder.addTiming(-( (new Date()).getTime() - that.lastTime ));
            }
            if (input === 0) {
                // If no keypress is detected then continue pushing chunks of silence to the decoder to complete the character and add a space
                that.playing = false;  // make the keyer interupterable so that the next character can start
                that.lastTime = (new Date()).getTime();  // time marking the end of the last data that was last pushed to decoder
                if (that.spaceCounter < 3) {
                    that.spaceCounter++;
                    that.timer = setTimeout(that.check, 2 * that.ditLen);  // keep pushing up to 3 dah-spaces to complete character or word
                } else {
                    that.stop();
                }
                return;
            } else if (input & 1) {
                dit = true;
            } else if (input === 2) {
                dit = false;
            }
            that.playTone(dit);
            if (dit) {
                that.decoder.addTiming(1 * that.ditLen);
                that.lastTime = (new Date()).getTime() + (1 * that.ditLen);
                that.timer = setTimeout(that.check, 2 * that.ditLen);  // check key state again after the dit and after a dit-space
            } else {
                that.decoder.addTiming(3 * that.ditLen);
                that.lastTime = (new Date()).getTime() + (3 * that.ditLen);
                that.timer = setTimeout(that.check, 4 * that.ditLen);
            }
        };
    }

    /*
        Call this method when a key-press (or equivalent) is detected
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

    /*
        This method can be called externally to stop the keyer but is also used internally when no key-press is detected.
    */
    stop() {
        this.playing = false;
        clearTimeout(this.timer);
    }

    /*
        Play a dit or dah sidetone.
    */
    playTone(isDit) {
        var duration = isDit ? this.ditLen : 3 * this.ditLen;
        this.player.load([duration], this.frequency);
        this.player.playFromStart();
    }
}
