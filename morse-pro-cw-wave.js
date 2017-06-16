// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/*jshint esversion: 6 */

/*
    Class to create sine-wave samples of standard CW Morse.

    Usage:

    var morseCWWave = new MorseCWWave();

    morseCWWave.wpm = 25;  // set the speed to 25 wpm
    morseCWWave.fwpm = 10;  // set the Farnsworth speed to 10 wpm

    morseCWWave.sampleRate = 8000;  // per second
    morseCWWave.frequency = 600;  // frequency in Hz

    morseCWWave.translate("abc");
    var sample = morseCWWave.getSample();
*/

import MorseCW from 'morse-pro-cw';

export default class MorseCWWave extends MorseCW {
    constructor() {
        super();
        this.sampleRate = 8000;  // sample rate for the waveform in Hz
        this.frequency = 550;  // frequency of wave in Hz
    }

    getSample() {
        // returns an array of floating point numbers representing the wave-form
        // data is suitable for XAudioJS
        // range is [-1, 1] (floating point)
        var sample = [];
        var timings = this.getTimings();
        if (timings.length === 0) {
            return [];
        }
        var counterIncrementAmount = Math.PI * 2 * this.frequency / this.sampleRate;
        var on = timings[0] > 0 ? 1 : 0;
        for (var t = 0; t < timings.length; t += 1) {
            var duration = this.sampleRate * Math.abs(timings[t]) / 1000;
            for (var i = 0; i < duration; i += 1) {
                sample.push(on * Math.sin(i * counterIncrementAmount));
            }
            on = 1 - on;
        }
        console.log("Sample length: " + sample.length);
        return sample;
    }

    getPCMSample() {
        // convert sample to 8-bit unsigned PCM format
        // returns array of integers (bytes) in range [128, -127]
        var pcmSample = [];
        var sample = this.getSample();
        for (var i = 0; i < sample.length; i += 1) {
            pcmSample.push(128 + Math.round(127 * sample[i]));
        }
        return pcmSample;
    }
}
