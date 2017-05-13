// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/*
    Class to convert create the on/off timings needed by e.g. sound generators.
    Timings are in milliseconds; "off" timings are negative.
    Pass in a MorseMessage instance.

    Usage:

    var morsePro = new MorsePro();
    var morseMessage = new MorseMessage(morsePro);
    var morseCW = new MorseCW(morseMessage);
    morseMessage.translate("abc");
    morseCW.setWPM(25);  // set the speed to 25 wpm
    morseCW.setFWPM(10);  // set the Farnsworth speed to 10 wpm
    var timings = morseCW.getTimings();
*/
var MorseCW = function(morseMessage) {
    this.morseMessage = morseMessage;
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
        // "PARIS " is 31 units for the characters and 19 units for the inter-character spaces and inter-word space
        // One unit takes 1 * 60 / (50 * wpm)
        // The 31 units should take 31 * 60 / (50 * wpm)  seconds at wpm
        // PARIS should take 50 * 60 / (50 * fpm) to transmit at fpm, or 60 / fwpm  seconds at fwpm
        // Keeping the time for the characters constant,
        // The spaces need to take: (60 / fwpm) - [31 * 60 / (50 * wpm)] seconds in total
        // The spaces are 4 inter-character spaces of 3 units and 1 inter-word space of 7 units. Their ratio must be maintained.
        // A space unit is: [(60 / fwpm) - [31 * 60 / (50 * wpm)]] / 19 seconds
        // Comparing that to  60 / (50 * wpm)  gives a ratio of (50.wpm - 31.fwpm) / 19.fwpm
        var SPACES_IN_PARIS = 19;
        // slow down the spaces by this ratio
        var r = (this.DITS_PER_WORD * this.wpm - (this.DITS_PER_WORD - SPACES_IN_PARIS) * this.fwpm) / (SPACES_IN_PARIS * this.fwpm);
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
        console.log("Morse: " + this.morseMessage.morse);

        if (this.morseMessage.hasError) {
            console.log("Error in message: cannot compute timings");
            return [];  // TODO: or throw exception?
        }
        var morse = this.morseMessage.morse.replace(/ \/ /g, '/');  // this means that a space is only used for inter-character
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
        console.log("Timings: " + times);
        return times;
    },

    getDuration: function() {
        var times = this.getTimings();
        var t = 0;
        for (var i = 0; i < times.length; i++) {
            t += Math.abs(times[i]);
        }
        return t;
    }
};
