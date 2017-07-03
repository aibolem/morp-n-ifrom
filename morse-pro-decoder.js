// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

import * as Morse from 'morse-pro';

/*
    Class to convert from timings to Morse code.
    If you need to change the wpm then make a new MorseDecoder.

    Arguments:
        wpm                 The speed of the Morse in words per minute
        messageCallback     Function to call each time a character is decoded (optional, defaults to console logging)
                            The function receives a dictionary with keys "timings", "morse" and "message"

    Usage:

    var messageCallback = function(data) {
        console.log(data);
    };
    var decoder = new MorseDecoder(10, messageCallback);
    var t;
    while (decoder_is_operating) {
        // get some timing "t" from a sensor, make it +ve for noise and -ve for silence
        decoder.addTiming(t);
    }
    decoder.flush();  // make sure all the data is pushed through the decoder

*/
export default class MorseDecoder {
    constructor(wpm, messageCallback) {
        this._wpm = undefined;
        this._fwpm = undefined;  // farnsworth speed
        this.DITS_PER_WORD = 50;  // TODO: better if this was inherited from a more basic class... or made a const
        this.timings = [];
        this.characters = [];
        this.unusedTimes = [];
        this.ditLen = undefined;
        this.fDitLen = undefined;
        this.ditDahThreshold = undefined;
        this.dahSpaceThreshold = undefined;
        this.noiseThreshold = 1;  // a duration <= noiseThreshold is assumed to be an error
        this.morse = "";
        this.message = "";
        if (typeof wpm !== "undefined") {
            this.wpm = wpm;
        }
        if (typeof messageCallback !== "undefined") {
            this.messageCallback = messageCallback;
        } else {
            this.messageCallback = function(data) {
                console.log("Decoded: {\n  timings: " + data.timings + "\n  morse: " + data.morse + "\n  message: " + data.message + "\n}");
            };
        }
    }

    set wpm(wpm) {
        this._wpm = wpm;
        if (this._fwpm === undefined || this._fwpm > wpm) {
            this._fwpm = this._wpm;
        }

        var SPACES_IN_PARIS = 19;
        var r = (this.DITS_PER_WORD * this._wpm - (this.DITS_PER_WORD - SPACES_IN_PARIS) * this._fwpm) / (SPACES_IN_PARIS * this._fwpm);  // ratio for farnsworth

        this.ditLen = (60000 / this.DITS_PER_WORD) / wpm;
        this.fDitLen = r * this.ditLen;
        this.ditDahThreshold = ((1 * this.ditLen) + (3 * this.ditLen)) / 2;
        this.dahSpaceThreshold = ((3 * this.fDitLen) + (7 * this.fDitLen)) / 2;

        console.log("Decoder speed (WPM) / Farnsworth speed (WPM): " + wpm + " / " + this._fwpm);
        console.log("Dit length (ms) / Farnsworth dit length (ms): " + this.ditLen + " / " + this.fDitLen);
    }

    get wpm() {
        return this._wpm;
    }

    set fwpm(fwpm) {
        this._fwpm = fwpm;
        if (this._wpm === undefined || this._wpm < fwpm) {
            this.wpm = fwpm;
        }
    }

    get fwpm() {
        return this._fwpm;
    }

    /*
    Add a timing in ms to the list of recorded timings.
    The duration should be positive for a dit or dah and negative for a space.
    If the duration is <= noiseThreshold it is assumed to be noise and is added to the previous duration.
    If a duration is the same sign as the previous one then they are combined.
    */
    addTiming(duration) {
        //console.log("Received: " + duration);
        if (duration === 0) {
            return;
        }
        if (this.unusedTimes.length > 0) {
            var last = this.unusedTimes[this.unusedTimes.length - 1];
            if (duration * last > 0) {
                // if the sign of the duration is the same as the previous one then add it on
                this.unusedTimes.pop();
                duration = last + duration;
            } else if (Math.abs(duration) <= this.noiseThreshold) {
                // if the duration is very short, assume it is a mistake and add it to the previous one
                this.unusedTimes.pop();
                duration = last - duration;  // take care of the sign change
            }
        }

        this.unusedTimes.push(duration);

        if (-duration >= this.ditDahThreshold) {
            // if we have just received a character space or longer
            this.flush();
        }
    }

    flush() {
        // Then we've reached the end of a character or word or a flush has been forced

        // If the last character decoded was a space then just ignore additional quiet
        if (this.message[this.message.length - 1] === ' ') {
            if (this.unusedTimes[0] < 0) {
                this.unusedTimes.shift();
            }
        }

        // Make sure there is (still) something to decode
        if (this.unusedTimes.length === 0) {
            return;
        }

        // If last element is quiet but it is not enough for a space character then pop it off and replace afterwards
        var last = this.unusedTimes[this.unusedTimes.length - 1];
        if ((last < 0) && (-last < this.dahSpaceThreshold)) {
            this.unusedTimes.pop();
        }

        var u = this.unusedTimes;
        var m = this.timings2morse(this.unusedTimes);
        var t = Morse.morse2text(m).message;  // will be '#' if there's an error
        this.morse += m;
        this.message += t;
        if (last < 0) {
            this.unusedTimes = [last];  // put the space back on the end in case there is more quiet to come
        } else {
            this.unusedTimes = [];
        }
        this.messageCallback({
            timings: u,
            morse: m,
            message: t
        });
    }

    timings2morse(times) {
        var ditdah = "";
        var c;
        var d;

        for (var i = 0; i < times.length; i++) {
            d = times[i];
            if (d > 0) {
                if (d < this.ditDahThreshold) {
                    c = ".";
                } else {
                    c = "-";
                }
            } else {
                d = -d;
                if (d < this.ditDahThreshold) {
                    c = "";
                } else if (d < this.dahSpaceThreshold) {
                    c = " ";
                } else {
                    c = "/";
                }
            }
            this.addDecode(d, c);
            ditdah = ditdah + c;
        }
        return ditdah;
    }

    addDecode(duration, character) {
        this.timings.push(duration);
        this.characters.push(character);
    }

    getTimings(character) {
        var ret = [];
        for (var i = 0; i < this.timings.length; i++) {
            if (this.characters[i] === character) {
                ret.push(this.timings[i]);
            }
        }
        return ret;
    }

    get dits() {
        return this.getTimings('.');
    }

    get dahs() {
        return this.getTimings('-');
    }

    get ditSpaces() {
        return this.getTimings('');
    }

    get dahSpaces() {
        return this.getTimings(' ');
    }

    get spaces() {
        return this.getTimings('/');
    }

}
