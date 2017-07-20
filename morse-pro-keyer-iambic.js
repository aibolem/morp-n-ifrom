// This code is © Copyright Stephen C. Phillips, 2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

import * as WPM from 'morse-pro-wpm';
import MorseDecoder from 'morse-pro-decoder';
import MorseKeyer from 'morse-pro-keyer';
import MorsePlayerWAA from 'morse-pro-player-waa';

/*
    The Morse iambic keyer tests for input on a timer, plays the appropriate tone and passes the data to a decoder.
    If both keys are detected at once then this class alternates between dit and dah.
    Set 'ditGoesFirst' to define whether to play dit or dah first.
    Arguments: see MorseKeyer
*/
export default class MorseIambicKeyer extends MorseKeyer {
    constructor(keyCallback, wpm, frequency, messageCallback) {
        super(keyCallback, wpm, frequency, messageCallback);
        this.ditGoesFirst = true;  // if the initial signal is 3 then alternate but play a dit first
    }

    check() {
        var input = super.check();
        if (input === 0) {
            this.lastWasDit = undefined;
        }
    }

    ditOrDah(input) {
        var dit;
        if (input === 1) {
            dit = true;
        } else if (input === 2) {
            dit = false;
        } else if (input === 3) {
            if (this.lastWasDit === true) {
                dit = false;
            } else if (this.lastWasDit === false) {
                dit = true;
            } else {
                dit = this.ditGoesFirst;
            }
        }
        this.lastWasDit = dit;
        return dit;
    }

    /*
        Call this method when a key-press (or equivalent) is detected
    */
    start() {
        if (!this.playing) {
            this.lastWasDit = undefined;
        }
        super.start();
    }
}
