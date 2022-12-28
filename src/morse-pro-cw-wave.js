/*!
This code is © Copyright Stephen C. Phillips, 2018-2022
Email: steve@morsecode.world
*/
/*
Licensed under the EUPL, Version 1.2 or – as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at: https://joinup.ec.europa.eu/community/eupl/
Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the Licence for the specific language governing permissions and limitations under the Licence.
*/

import MorseCW from './morse-pro-cw.js';

const MIN_END_PADDING = 5;  // minimum amount of silence to put on the end of a sample (milliseconds)

/**
 * Class to create sine-wave samples of standard CW Morse.
 *
 * @example
 * import MorseCWWave from 'morse-pro-cw-wave';
 * let morseCWWave = new MorseCWWave();
 * let tokens = morseCWWave.loadText("abc");
 * let sequence = morseCWWave.getSequence(tokens);
 * let sample = morseCWWave.getSample(sequence);
 */
export default class MorseCWWave extends MorseCW {
    /**
     * @param {Object} params - dictionary of optional parameters.
     * @param {string} params.dictionary - which dictionary to use, e.g. 'international' or 'american'.
     * @param {string[]} params.dictionaryOptions - optional additional dictionaries such as 'prosigns'.
     * @param {number} params.wpm - speed in words per minute using "PARIS " as the standard word.
     * @param {number} params.fwpm - farnsworth speed.
     * @param {number} params.frequency - frequency of wave in Hz
     * @param {number} [params.sampleRate=8000] - sample rate for the waveform in Hz
     */
    constructor({dictionary, dictionaryOptions, wpm, fwpm, frequency, sampleRate=8000} = {}) {
        super({dictionary, dictionaryOptions, wpm, fwpm, frequency});
        /** @type {number} */
        this.sampleRate = sampleRate;  // sample rate for the waveform in Hz
    }

    /**
     * Get a sample waveform, not using Web Audio API (synchronous).
     * @param {Object} sequence - the sequence to play.
     * @param {number[]} sequence.timings - list of millisecond timings; +ve numbers are beeps, -ve numbers are silence.
     * @param {number} [sequence.frequency] - optional frequency to be used for all beeps (used if sequence.frequencies field is not set). If neither sequence.frequencies nor sequence.frequency is set, the class fallback frequency is used.
     * @param {number[]} [sequence.frequencies] - optional list of frequencies to be used the beeps.
     * @param {number} [endPadding] - optional number of milliseconds silence to add at the end of the sequence.
     * @param {number} [startPadding] - optional number of milliseconds silence to add at the start of the sequence.
     * @return {number[]} an array of floats in range [-1, 1] representing the wave-form.
     */
    getSample(sequence, startPadding, endPadding) {
        if (sequence.timings.length === 0) {
            return [];
        }

        let timings = sequence.timings.slice();
        let frequencies;
        if (sequence.frequencies === undefined) {
            frequencies = timings.map(item => sequence.frequency || this.frequency);
        } else {
            frequencies = sequence.frequencies.slice();
        }

        // add optional silence to the start
        if (startPadding !== undefined) {
            timings.unshift(-Math.abs(startPadding));
            frequencies.unshift(0);  // value is not used, just needed for array alignment
        }

        // add minimum of 5ms silence to the end to ensure the filtered signal can finish cleanly
        let last = timings.length - 1;
        endPadding = Math.abs(endPadding) || 0;
        if (timings[last] > 0) {
            timings.push(-Math.max(MIN_END_PADDING, endPadding));
            frequencies.push(0);  // value is not used, just needed for array alignment
        } else {
            timings[last] = -Math.max(MIN_END_PADDING, endPadding, -timings[last]);
        }

        /*
            Compute lowpass biquad filter coefficients using method from Chromium
        */

        // set lowpass frequency cutoff to 1.5 x wave frequency
        const maxFreq = Math.max(...frequencies);
        const lowpassFreq = (maxFreq * 1.5) / this.sampleRate;
        const q = Math.SQRT1_2;
      
        const sin = Math.sin(2 * Math.PI * lowpassFreq);
        const cos = Math.cos(2 * Math.PI * lowpassFreq);
        const alpha = sin / (2 * Math.pow(10, q / 20));
      
        const a0 =  1 + alpha;

        const b0 = ((1 - cos) * 0.5) / a0;
        const b1 = (1 - cos) / a0;
        const b2 = ((1 - cos) * 0.5) / a0;
        const a1 = (-2 * cos) / a0;
        const a2 = (1 - alpha) / a0;

        /*
            Compute filtered signal
        */
        let sample = [];
        let on, duration, step;
        let x0, x1 = 0, x2 = 0;
        let y0, y1 = 0, y2 = 0;
        const gain = 0.813;  // empirically, the lowpass filter outputs waveform of magnitude 1.23, so need to scale it down to avoid clipping
        for (let j = 0; j < timings.length; j++) {
            duration = this.sampleRate * Math.abs(timings[j]) / 1000;
            on = timings[j] > 0 ? 1 : 0;
            for (let i = 0; i < duration; i += 1) {
                step = Math.PI * 2 * frequencies[j] / this.sampleRate;
                x0 = on * Math.sin(i * step);  // the input signal
                y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
                sample.push(y0 * gain);
                x2 = x1;
                x1 = x0;
                y2 = y1;
                y1 = y0;
            }
        }
        return sample;
    }

    /**
     * Get a sample waveform using Web Audio API (asynchronous).
     * @param {Object} sequence - the sequence to play.
     * @param {number[]} sequence.timings - list of millisecond timings; +ve numbers are beeps, -ve numbers are silence.
     * @param {number} sequence.frequency - optional frequency to be used for all beeps (used if sequence.frequencies field is not set). If neither sequence.frequencies nor sequence.frequency is set, the class fallback frequency is used.
     * @param {number[]} sequence.frequencies - optional list of frequencies to be used the beeps.
     * @param {number} endPadding - optional number of milliseconds silence to add at the end of the sequence.
     * @param {number} startPadding - optional number of milliseconds silence to add at the start of the sequence.
     * @return {number[]} an array of floats in range [-1, 1] representing the wave-form.
     */
    // TODO: this has not been updated to match the better method used in MorsePlayerWAA
    getWAASample(sequence) {
        if (sequence.timings.length === 0) {
            return [];
        }

        let timings = sequence.timings.slice();
        let frequencies;
        if (sequence.frequencies === undefined) {
            frequencies = timings.map(item => sequence.frequency || this.frequency);
        } else {
            frequencies = sequence.frequencies.slice();
        }

        // add optional silence to the start
        if (startPadding !== undefined) {
            timings.unshift(-Math.abs(startPadding));
            frequencies.unshift(0);  // value is not used, just needed for array alignment
        }

        // add minimum of 5ms silence to the end to ensure the filtered signal can finish cleanly
        let last = timings.length - 1;
        endPadding = Math.abs(endPadding) || 0;
        if (timings[last] > 0) {
            timings.push(-Math.max(MIN_END_PADDING, endPadding));
            frequencies.push(0);  // value is not used, just needed for array alignment
        } else {
            timings[last] = -Math.max(MIN_END_PADDING, endPadding, -timings[last]);
        }

        const sampleDuration = timings.reduce((a,b) => a + Math.abs(b), 0);  // recompute it with new endpadding
        const maxFreq = Math.max(...frequencies);

        let offlineAudioContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (offlineAudioContextClass === undefined) {
            throw new Error("No OfflineAudioContext class defined");
        }
        // buffer length is the Morse duration + 5ms to let the lowpass filter end cleanly
        let offlineCtx = new offlineAudioContextClass(1, this.sampleRate * sampleDuration / 1000, this.sampleRate);
        let gainNode = offlineCtx.createGain();
        // empirically, the lowpass filter outputs waveform of magnitude 1.23, so need to scale it down to avoid clipping
        gainNode.gain.setValueAtTime(0.813, 0);
        let lowPassNode = offlineCtx.createBiquadFilter();
        lowPassNode.type = "lowpass";
        lowPassNode.frequency.setValueAtTime(maxFreq * 1.1, 0);  // TODO: remove this magic number and make the filter configurable?
        gainNode.connect(lowPassNode);
        lowPassNode.connect(offlineCtx.destination);
        let t = 0;
        let oscillator;
        let duration;
        for (let i = 0; i < timings.length; i++) {
            duration = Math.abs(timings[i]) / 1000;
            if (timings[i] > 0) {  // -ve timings are silence
                oscillator = offlineCtx.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(frequencies[i], t);
                oscillator.start(t);
                oscillator.stop(t + duration);
                oscillator.connect(gainNode);
            }
            t += duration;
        }
        return offlineCtx.startRendering().then(function(renderedBuffer) {
            return renderedBuffer.getChannelData(0);
        });
    }
}
