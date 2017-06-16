// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

import * as Morse from 'morse-pro';

/*
    Class to convert from timings to Morse code.
*/
export default class MorseDecoder {
    constructor(timeStep, wpm) {
        this.timeStep = timeStep;
        this._wpm = undefined;
        this.DITS_PER_WORD = 50;  // TODO: better if this was inherited from a more basic class... or made a const
        this.timings = [];
        this.unusedTimes = [];
        this.ditDahThreshold = undefined;
        this.dahSpaceThreshold = undefined;
        this.morse = "";
        this.message = "";
        this.dits = [];
        this.dahs = [];
        this.ditSpaces = [];
        this.dahSpaces = [];
        this.spaces = [];
        if (typeof wpm !== "undefined") {
            this.wpm = wpm;
        }
    }

    set wpm(wpm) {
        this._wpm = wpm;
        this.ditDahThreshold = 2 * (60000 / this.DITS_PER_WORD) / (wpm * this.timeStep);
        this.dahSpaceThreshold = 5 * (60000 / this.DITS_PER_WORD) / (wpm * this.timeStep);
        console.log("Decoder WPM: " + wpm);
        console.log("Decoder ditDahThreshold (ticks): " + this.ditDahThreshold);
        console.log("Decoder dahSpaceThreshold (ticks): " + this.dahSpaceThreshold);
    }

    get wpm() {
        return this._wpm;
    }

    addTiming(duration) {
        //console.log("Received: " + duration);
        if (Math.abs(duration) == 1) {
            // if the duration is very short, assume it is a mistake and add it to the previous one (if there is one)
            if (this.unusedTimes.length > 0) {
                var last = this.unusedTimes.pop();
                duration = last - duration;  // take care of the sign change
            }
        }
        this.unusedTimes.push(duration);
        if (-duration > this.ditDahThreshold) {
            // if we have just received a character space or longer
            this.flush();
        }
    }

    // Override this with your own function
    messageCallback(data) {
        console.log("Decoded: {\n  timings: " + data.timings + "\n  morse: " + data.morse + "\n  message: " + data.message + "\n}");
    }

    flush() {
        if (this.unusedTimes.length > 0) {
            // Then we've reached the end of a character or word or a flush has been forced
            var u = this.unusedTimes;
            var m = this.timings2morse(this.unusedTimes);
            var t = Morse.morse2text(m).message;  // will be '#' if there's an error
            this.timings = this.timings.concat(this.unusedTimes);
            this.morse += m;
            this.message += t;
            this.unusedTimes = [];
            this.messageCallback({
                timings: u,
                morse: m,
                message: t
            });
        }
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
                    this.dits.push(d);
                } else {
                    c = "-";
                    this.dahs.push(d);
                }
            } else {
                d = -d;
                if (d < this.ditDahThreshold) {
                    c = "";
                    this.ditSpaces.push(d);
                } else if (d < this.dahSpaceThreshold) {
                    c = " ";
                    this.dahSpaces.push(d);
                } else {
                    c = "/";
                    this.spaces.push(d);
                }
            }
            ditdah = ditdah + c;
        }
        return ditdah;
    }
}
