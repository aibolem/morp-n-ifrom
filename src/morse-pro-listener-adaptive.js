/*!
This code is © Copyright Stephen C. Phillips, 2018-2024.
Email: steve@morsecode.world
*/
/*
Licensed under the EUPL, Version 1.2 or – as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at: https://joinup.ec.europa.eu/community/eupl/
Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the Licence for the specific language governing permissions and limitations under the Licence.
*/

import MorseListener from './morse-pro-listener.js';

/**
 * Extension of the MorseListener class which automatically adapts to the dominant frequency.
 */
export default class MorseAdaptiveListener extends MorseListener {
    /**
     * Parameters are all the same as the MorseListener class with the addition of the bufferDuration.
     * @param {number} [param.bufferDuration=500] - How long in ms to look back to find the frequency with the maximum volume.
     */
    constructor({
        fftSize,
        volumeFilterMin, volumeFilterMax,
        frequencyFilterMin, frequencyFilterMax,
        volumeThreshold,
        decoder,
        bufferDuration = 500,
        frequencyFilterCallback, volumeFilterCallback, volumeThresholdCallback,
        micSuccessCallback, micErrorCallback,
        fileLoadCallback, fileErrorCallback, EOFCallback
    } = {}) {
        super({
            fftSize, volumeFilterMin, volumeFilterMax, frequencyFilterMin, frequencyFilterMax, volumeThreshold, decoder,
            frequencyFilterCallback, volumeFilterCallback, volumeThresholdCallback,
            micSuccessCallback, micErrorCallback,
            fileLoadCallback, fileErrorCallback, EOFCallback
        });
        this.bufferSize = Math.floor(bufferDuration / this.timeStep);
        this.bufferIndex = 0;
        this.buffer = [];
        for (let i = 0; i < this.bufferSize; i++) {
            this.buffer[i] = new Uint8Array(this.freqBins);
        }
        this.averageVolume = new Uint32Array(this.freqBins);
        this.lockFrequency = false;
    }

    /**
     * @extends MorseListener.processSound
     * @access private
     */
    processSound() {
        if (!super.processSound()) return;

        let sum = this.frequencyData.reduce(function (a, b) {
            return a + b;
        });
        sum -= this.frequencyData[0];  // remove DC component

        if (sum) {
            var max = 0;
            var maxIndex = 0;
            // loop over all frequencies, ignoring DC
            for (let i = 1; i < this.freqBins; i++) {
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
