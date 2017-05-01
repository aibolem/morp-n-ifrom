// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

var dataURIMod = require('./morse-pro-util-datauri.js');
var riffWaveMod = require('./morse-pro-util-riffwave.js');

// pass in a Morse.CW instance (or something with a getTimings() method)
MorseCWWave = function(cw) {
    this.cw = cw;
    this.sampleRate = 8000;
    this.frequency = 550;
};

// Set the sample rate for the waveform in Hz
MorseCWWave.prototype = {

    constructor: MorseCWWave,

    getSample: function() {
        // sample data suitable for XAudioJS
        // range is [-1, 1] (floating point)
        var sample = [];
        var timings = this.cw.getTimings();
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
    },

    getPCMSample: function() {
        // convert sample to 8-bit unsigned PCM format
        var pcmSample = [];
        var sample = this.getSample();
        for (var i = 0; i < sample.length; i += 1) {
            pcmSample.push(128 + Math.round(127 * sample[i]));
        }
        return pcmSample;
    },

    getWAV: function() {
        var wav = new riffWaveMod.RIFFWAVE();
        wav.header.sampleRate = this.sampleRate;
        return wav.getWAV(this.getPCMSample());
    },

    getDataURI: function() {
        return dataURIMod.getDataURI(this.getWAV(), "audio/wav");
    }
};

module.exports = {
  MorseCWWave: MorseCWWave
};
