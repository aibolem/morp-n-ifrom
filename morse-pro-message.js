// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

var morseMod = require('./morse-pro.js');
var Morse = new morseMod.Morse();

MorseMessage = function() {
    this.input = "";
    this.output = "";
    this.morse = "";
    this.message = "";
    this.useProsigns = true;
    this.inputWasMorse = undefined;
    this.hasError = undefined;
};

MorseMessage.prototype = {

    constructor: MorseMessage,
    
    translate: function(input, isMorse) {
        var translation;
        this.input = input;

        if (typeof isMorse === "undefined") {
            // make a guess: could be wrong if someone wants to translate "." into Morse for instance
            isMorse = Morse.isMorse(input);
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
    },

    // Clear all the errors from the morse and message
    clearError: function() {
        if (this.inputWasMorse) {
            this.morse = this.morse.replace(/#/g, "");  // leave in the bad Morse
        } else {
            this.message = this.message.replace(/#[^#]*?#/g, "");
            this.morse = this.morse.replace(/#/g, "");
        }
        this.hasError = false;
    }
};

module.exports = {
    MorseMessage: MorseMessage
};
