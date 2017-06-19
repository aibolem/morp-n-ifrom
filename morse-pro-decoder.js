// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

import * as Morse from 'morse-pro';

/*
    Class to convert from timings to Morse code.
    If you need to xhange the wpm pr timestep then make a new MorseDecoder.
*/
export default class MorseDecoder {
    constructor(timeStep, wpm) {
        this.timeStep = timeStep;  // granularity of expected measurements in ms (tick size)
        this._wpm = undefined;
        this.DITS_PER_WORD = 50;  // TODO: better if this was inherited from a more basic class... or made a const
        this.timings = [];
        this.unusedTimes = [];
        this.ditDahThreshold = undefined;  // boundary in ticks between a measurements being judged a dit or dah (float)
        this.dahSpaceThreshold = undefined;  // boundary in ticks between a measurements being judged a space between characters or a word space (float)
        this.noiseThreshold = 1;  // a duration <= noiseThreshold is assumed to be an error
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

    /*
    Add a timing in milleseconds to the list of recorded timings.
    The duration should be positive for a dit or dah and negative for a space.
    If the duration is 1 or -1 it is assumed to be noise and is added to the previous duration.
    If a duration is the same sign as the previous one then they are combined.
    */
    addTiming(duration) {
        //console.log("Received: " + duration);)
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
