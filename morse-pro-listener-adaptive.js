// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

import MorseListener from 'morse-pro-listener';

/*
    bufferDuration      How long in ms to look back to find the frequency with the maximum volume
*/
export default class MorseAdaptiveListener extends MorseListener {
    constructor(
            fftSize,
            volumeMin, volumeMax,
            frequencyMin, frequencyMax,
            volumeThreshold,
            decoder,
            bufferDuration = 500,
            spectrogramCallback,
            frequencyFilterCallback, volumeFilterCallback, volumeThresholdCallback,
            micSuccessCallback, micErrorCallback,
            fileLoadCallback, fileErrorCallback, EOFCallback
        )
    {
        super(fftSize, volumeMin, volumeMax, frequencyMin, frequencyMax, volumeThreshold, decoder,
            spectrogramCallback,
            frequencyFilterCallback, volumeFilterCallback, volumeThresholdCallback,
            micSuccessCallback, micErrorCallback,
            fileLoadCallback, fileErrorCallback, EOFCallback
        );
        this.bufferSize = Math.floor(bufferDuration / this.timeStep);
        this.bufferIndex = 0;
        this.buffer = [];
        for (var i = 0; i < this.bufferSize; i++) {
            this.buffer[i] = new Uint8Array(this.freqBins);
        }
        this.averageVolume = new Uint32Array(this.freqBins);
        this.lockFrequency = false;
    }

    processSound() {
        super.processSound();

        var sum = this.frequencyData.reduce(function(a, b) {
            return a + b;
        });
        sum -= this.frequencyData[0];  // remove DC component

        if (sum) {
            var max = 0;
            var maxIndex = 0;
            // loop over all frequencies, ignoring DC
            for (var i = 1; i < this.freqBins; i++) {
                this.averageVolume[i] = this.averageVolume[i] + this.frequencyData[i] - this.buffer[this.bufferIndex][i];
                this.buffer[this.bufferIndex][i] = this.frequencyData[i];
                if (this.averageVolume[i] > max) {
                    maxIndex = i;
                    max = this.averageVolume[i];
                }
            }
            this.bufferIndex = (this.bufferIndex + 1) % this.bufferSize;

            if (!this.lockFrequency) {
                this.frequencyFilter = maxIndex * this.freqStep;
            }
        }
    }
}
