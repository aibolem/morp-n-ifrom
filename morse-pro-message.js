// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

/*
    Class for conveniently translating to and from Morse code.
    Deals with error handling.
    Works out if the input is Morse code or not.

    Usage:

    var morseMessage = new MorseMessage();
    morseMessage.useProsigns = true;
    var input;
    var output;
    try {
        output = morseMessage.translate("abc");
    catch (ex) {
        // input will have errors surrounded by paired '#' signs
        // output will be best attempt at translation, with untranslatables replaced with '#'
        morseMessage.clearError();  // remove all the '#'
    }
    if (morseMessage.inputWasMorse) {
        // do something
    }

*/

import * as Morse from 'morse-pro';

export default class MorseMessage {
    constructor() {
        this.input = "";
        this.output = "";
        this.morse = "";
        this.message = "";
        this.useProsigns = true;
        this.inputWasMorse = undefined;
        this.hasError = undefined;
    }

    translate(input, isMorse) {
        var translation;

        if (typeof isMorse === "undefined") {
            // make a guess: could be wrong if someone wants to translate "." into Morse for instance
            isMorse = Morse.looksLikeMorse(input);
        }
        if (isMorse) {
            this.inputWasMorse = true;
            translation = Morse.morse2text(input, this.useProsigns);
        } else {
            this.inputWasMorse = false;
            translation = Morse.text2morse(input, this.useProsigns);
        }

        this.morse = translation.morse;
        this.message = translation.message;

        if (this.inputWasMorse) {
            this.input = this.morse;
            this.output = this.message;
        } else {
            this.input = this.message;
            this.output = this.morse;
        }

        this.hasError = translation.hasError;
        if (this.hasError) {
            throw new Error("Error in input");
        }
        return this.output;
    }

    // Clear all the errors from the morse and message
    clearError() {
        if (this.inputWasMorse) {
            this.morse = this.morse.replace(/#/g, "");  // leave in the bad Morse
        } else {
            this.message = this.message.replace(/#[^#]*?#/g, "");
            this.morse = this.morse.replace(/#/g, "");
        }
        this.hasError = false;
    }
}
