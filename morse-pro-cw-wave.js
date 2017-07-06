// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

/*
    Class to create sine-wave samples of standard CW Morse.

    Usage:

    import MorseCWWave from 'morse-pro-cw-wave';

    var morseCWWave = new MorseCWWave();
    morseCWWave.translate("abc");
    var sample = morseCWWave.getSample();
*/

import MorseCW from 'morse-pro-cw';

export default class MorseCWWave extends MorseCW {
    constructor(useProsigns, wpm, fwpm, frequency = 550, sampleRate = 8000) {
        super(useProsigns, wpm, fwpm);
        this.frequency = frequency;  // frequency of wave in Hz
        this.sampleRate = sampleRate;  // sample rate for the waveform in Hz
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
