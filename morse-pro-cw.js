// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

MorseCW = function(message) {
    this.message = message;
    this.wpm = 20;
    this.fwpm = 20;
    this.DITS_PER_WORD = 50;  // based on "PARIS "
};

MorseCW.prototype = {

    constructor: MorseCW,

    setWPM: function(wpm) {
        this.wpm = wpm;
        if (wpm < this.fwpm) {
            this.fwpm = wpm;
        }
        return this.fwpm;
    },

    setFWPM: function(fwpm) {
        this.fwpm = fwpm;
        if (fwpm > this.wpm) {
            this.wpm = fwpm;
        }
        return this.wpm;
    },

    /**
     * Convert a morse string into an array of millisecond timings.
     * With the Farnsworth method, the morse characters are played at one
     * speed and the spaces between characters at a slower speed.
     *
     * morse - the morse code string
     * wpm - the speed in words per minute ("PARIS " as one word)
     * farnsworth - the Farnsworth speed in words per minute (optional, defaults to wpm)
     */
    getTimings: function() {
        var dit = 60000 / (this.DITS_PER_WORD * this.wpm);  // 60000 is 1 minute in milliseconds
        var r = this.wpm / this.fwpm;  // slow down the spaces by this ratio
        return this.getTimingsGeneral(dit, 3 * dit, dit, 3 * dit * r, 7 * dit * r);
    },

    /**
     * Convert a morse string into an array of millisecond timings.
     * morse - the morse code string
     * dit - the length of a dit in milliseconds
     * dah - the length of a dah in milliseconds (normally 3 * dit)
     * ditSpace - the length of an intra-character space in milliseconds (1 * dit)
     * charSpace - the length of an inter-character space in milliseconds (normally 3 * dit)
     * wordSpace - the length of an inter-word space in milliseconds (normally 7 * dit)
     */
    getTimingsGeneral: function(dit, dah, ditSpace, charSpace, wordSpace) {
        log("Morse: " + this.message.morse);
        //log("Morse speeds/ms: " + dit + ", " + dah + ", " + ditSpace + ", " + charSpace + ", " + wordSpace);
        //morse = Morse.tidyMorse(morse);

        if (this.message.hasError) {
            log("Error in message: cannot compute timings");
            return [];  // TODO: or throw exception?
        }
        var morse = this.message.morse.replace(/ \/ /g, '/');  // this means that a space is only used for inter-character
        var times = [];
        var c;
        for (var i = 0; i < morse.length; i++) {
            c = morse[i];
            if (c == "." || c == '-') {
                if (c == '.') {
                    times.push(dit);
                } else  {
                    times.push(dah);
                }
                times.push(-ditSpace);
            } else if (c == " ") {
                times.pop();
                times.push(-charSpace);
            } else if (c == "/") {
                times.pop();
                times.push(-wordSpace);
            }
        }
        if (times[times.length - 1] == -ditSpace) {
            times.pop();  // take off the last ditSpace
        }
        log("Timings: " + times);
        return times;
    }
};

module.exports = {
  MorseCW: MorseCW
};
