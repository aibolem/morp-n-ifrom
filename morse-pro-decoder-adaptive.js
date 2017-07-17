// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

import * as WPM from 'morse-pro-wpm';
import MorseDecoder from 'morse-pro-decoder';

/*
    Class to convert from timings to Morse code. Adapts to changing speed.

    Arguments:
        wpm             See MorseDecoder
        fwpm            See MorseDecoder
        bufferSize      Size of the buffer to average over (defaults to 30)

    Usage:

    var messageCallback = function(data) {
        console.log(data);
    };
    var decoder = new MorseAdaptiveDecoder(10);
    decoder.messageCallback = messageCallback;
    var t;
    while (decoder_is_operating) {
        // get some timing "t" from a sensor, make it +ve for noise and -ve for silence
        decoder.addTiming(t);
    }
    decoder.flush();  // make sure all the data is pushed through the decoder

*/
export default class MorseAdaptiveDecoder extends MorseDecoder {
    constructor(wpm, fwpm, bufferSize = 30, messageCallback = undefined, speedCallback = undefined) {
        super(wpm, fwpm, messageCallback, speedCallback);
        this.bufferSize = bufferSize;
        this.speedCallbackRateLimiter = 10;  // set this to only call speedCallback every n decodes
        this._speedCallbackCount = 0;
        this.ditLengths = [];
        this.fditLengths = [];
        this.lockSpeed = false;
    }

    addDecode(duration, character) {
        super.addDecode(duration, character);

        // adapt!
        var dit;
        var fdit;

        switch (character) {
            case '.':
                dit = duration;
                break;
            case '-':
                dit = duration / 3;
                break;
            case '':
                dit = duration;
                break;
            case ' ':
                fdit = duration / 3;
                break;
            // enable this if the decoder can be made to ignore extra long pauses
            // case '/':
            //     fdit = duration / 7;
            //     break;
        }
        this.ditLengths.push(dit);
        this.fditLengths.push(fdit);
        this.ditLengths = this.ditLengths.slice(-this.bufferSize);
        this.fditLengths = this.fditLengths.slice(-this.bufferSize);

        if (this.lockSpeed) { return; }

        var sum = 0;
        var denom = 0;
        var fSum = 0;
        var fDenom = 0;
        var weight;

        for (var i = 0; i < this.bufferSize; i++) {
            // weight = Math.exp(-this.bufferSize + 1 + i);  // exponential weighting
            weight = i + 1;  // linear weighting
            // weight = 1;  // constant weighting
            if (this.ditLengths[i] !== undefined) {
                sum += this.ditLengths[i] * weight;
                denom += weight;
            }
            if (this.fditLengths[i] !== undefined) {
                fSum += this.fditLengths[i] * weight;
                fDenom += weight;
            }
        }

        if (fDenom) {
            this.fditLen = fSum / fDenom;
        }
        if (denom) {
            this.ditLen = sum / denom;
        }

        // TODO: do we need rate limiter here?
        if (this.speedCallback !== undefined && ++this._speedCallbackCount === this.speedCallbackRateLimiter) {
            this.speedCallback({wpm: this.wpm, fwpm: this.fwpm});
            this._speedCallbackCount = 0;
        }
    }
}
