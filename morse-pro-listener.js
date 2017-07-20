// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

export default class MorseListener {
    constructor(
            fftSize,
            volumeFilterMin, volumeFilterMax,
            frequencyFilterMin, frequencyFilterMax,
            volumeThreshold,
            decoder,
            spectrogramCallback,
            frequencyFilterCallback, volumeFilterCallback, volumeThresholdCallback,
            micSuccessCallback, micErrorCallback,
            fileLoadCallback, fileErrorCallback, EOFCallback
        )
    {
        // audio input and output
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        this.audioContext = new window.AudioContext() || new window.webkitAudioContext();

        if (spectrogramCallback !== undefined) this.spectrogramCallback = spectrogramCallback;
        if (frequencyFilterCallback !== undefined) this.frequencyFilterCallback = frequencyFilterCallback;
        if (volumeFilterCallback !== undefined) this.volumeFilterCallback = volumeFilterCallback;
        if (volumeThresholdCallback !== undefined) this.volumeThresholdCallback = volumeThresholdCallback;
        if (micSuccessCallback !== undefined) this.micSuccessCallback = micSuccessCallback;
        if (micErrorCallback !== undefined) this.micErrorCallback = micErrorCallback;
        if (fileLoadCallback !== undefined) this.fileLoadCallback = fileLoadCallback;
        if (fileErrorCallback !== undefined) this.fileErrorCallback = fileErrorCallback;
        if (EOFCallback !== undefined) this.EOFCallback = EOFCallback;

        this.fftSize = fftSize;
        // basic parameters from the sample rate
        this.sampleRate = this.audioContext.sampleRate;  // in Hz, 48000 on Chrome
        this.maxFreq = this.sampleRate / 2;  // in Hz; Nyquist theorem
        this.freqBins = this.fftSize / 2;
        this.timeStep = 1000 / (this.sampleRate / this.fftSize);  // in ms
        this.freqStep = this.maxFreq / this.freqBins;

        this.initialiseAudioNodes();

        this.defaults = {
            fftSize: 256,
            volumeFilterMin: -60,
            volumeFilterMax: -30,
            frequencyFilterMin: 550,
            frequencyFilterMax: 550,
            volumeThreshold: 200
        };
        this.volumeFilterMin = volumeFilterMin;  // in dB
        this.volumeFilterMax = volumeFilterMax;
        this.frequencyFilterMin = frequencyFilterMin;  // in Hz
        this.frequencyFilterMax = frequencyFilterMax;
        this.volumeThreshold = volumeThreshold;  // in range [0-255]
        this.decoder = decoder;

        this.notStarted = true;
        this.flushTime = 500;  // how long to wait before pushing data to the decoder if e.g. you have a very long pause

        this.input = undefined;  // current state: undefined, "mic", "file"
    }

    set volumeFilterMin(v) {
        if (isNaN(v)) v = this.defaults.volumeFilterMin;
        // v is in dB and therefore -ve
        v = Math.min(0, v);
        this.analyserNode.minDecibels = v;
        this.analyserNode.maxDecibels = Math.max(this.analyserNode.maxDecibels, v);
        this.volumeFilterCallback({min: this.analyserNode.minDecibels, max: this.analyserNode.maxDecibels});
    }

    get volumeFilterMin() {
        return this.analyserNode.minDecibels;
    }

    set volumeFilterMax(v) {
        if (isNaN(v)) v = this.defaults.volumeFilterMax;
        // v is in dB and therefore -ve
        v = Math.min(0, v);
        this.analyserNode.maxDecibels = v;
        this.analyserNode.minDecibels = Math.min(this.analyserNode.minDecibels, v);
        this.volumeFilterCallback({min: this.analyserNode.minDecibels, max: this.analyserNode.maxDecibels});
    }

    get volumeFilterMax() {
        return this.analyserNode.maxDecibels;
    }

    set frequencyFilterMin(f) {
        if (isNaN(f)) f = this.defaults.frequencyFilterMin;
        f = Math.min(Math.max(f, 0), this.maxFreq);
        this._filterBinLow = Math.min(Math.max(Math.round(f / this.freqStep), 1), this.freqBins);  // at least 1 to avoid DC component
        this._filterBinHigh = Math.max(this._filterBinLow, this._filterBinHigh);  // high must be at least low
        this.frequencyFilterCallback({min: this.frequencyFilterMin, max: this.frequencyFilterMax});
    }

    get frequencyFilterMin() {
        return Math.max(this._filterBinLow * this.freqStep, 0);
    }

    set frequencyFilterMax(f) {
        if (isNaN(f)) f = this.defaults.frequencyFilterMin;
        f = Math.min(Math.max(f, 0), this.maxFreq);
        this._filterBinHigh = Math.min(Math.max(Math.round(f / this.freqStep), 1), this.freqBins);  // at least 1 to avoid DC component
        this._filterBinLow = Math.min(this._filterBinHigh, this._filterBinLow);  // low must be at most high
        this.frequencyFilterCallback({min: this.frequencyFilterMin, max: this.frequencyFilterMax});
    }

    get frequencyFilterMax() {
        return Math.min(this._filterBinHigh * this.freqStep, this.maxFreq);
    }

    set frequencyFilter(f) {
        // use to target a specific frequency
        this.frequencyFilterMin = f;
        this.frequencyFilterMax = f;
    }

    set volumeThreshold(v) {
        // threshold used to determine if an anlysed region has sufficient sound to be "on"
        if (isNaN(v)) v = this.defaults.volumeThreshold;
        this._volumeThreshold = Math.min(Math.max(Math.round(v), 0), 255);
        this.volumeThresholdCallback(this._volumeThreshold);
    }

    get volumeThreshold() {
        return this._volumeThreshold;
    }

    initialiseAudioNodes() {
        // set up a javascript node (BUFFER_SIZE, NUM_INPUTS, NUM_OUTPUTS)
        this.jsNode = this.audioContext.createScriptProcessor(this.fftSize, 1, 1); // buffer size can be 256, 512, 1024, 2048, 4096, 8192 or 16384
        // set the event handler for when the buffer is full
        this.jsNode.onaudioprocess = this.processSound.bind(this);
        // set up an analyserNode
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.smoothingTimeConstant = 0; // no mixing with the previous frame
        this.analyserNode.fftSize = this.fftSize; // can be 32 to 2048 in webkit
        this.frequencyData = new Uint8Array(this.freqBins); // create an arrray of the right size for the frequency data
    }

    startListening() {
        this.stop();
        // TODO: replace this with navigator.mediaDevices.getUserMedia() instead and shim for legacy browsers (https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
        navigator.getUserMedia(
            {
                audio: true,
                video: false
            },
            function(stream) {
                // create an audio node from the stream
                this.sourceNode = this.audioContext.createMediaStreamSource(stream);
                this.input = "mic";
                // connect nodes but don't connect mic to audio output to avoid feedback
                this.sourceNode.connect(this.analyserNode);
                this.jsNode.connect(this.audioContext.destination);
                this.micSuccessCallback();
            }.bind(this),
            function(error) {
                this.input = undefined;
                this.micErrorCallback(error);
            }.bind(this)
        );
    }

    loadArrayBuffer(arrayBuffer) {
        // by separating loading (decoding) and playing, the playing can be done multiple times
        this.audioContext.decodeAudioData(
            arrayBuffer,
            function(audioBuffer) {
                this.fileAudioBuffer = audioBuffer;
                this.fileLoadCallback(audioBuffer);
            }.bind(this),
            function(error) {
                this.fileAudioBuffer = undefined;
                this.fileErrorCallback(error);
            }.bind(this)
        );
    }

    playArrayBuffer() {
        this.stop();
        // make BufferSource node
        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.fileAudioBuffer;
        this.sourceNode.onended = function() {
            this.stop();
            this.EOFCallback();
        }.bind(this);
        // connect nodes
        this.jsNode.connect(this.audioContext.destination);
        this.sourceNode.connect(this.analyserNode);
        this.sourceNode.connect(this.audioContext.destination);
        this.input = "file";
        // play
        this.sourceNode.start();
    }

    stop() {
        if (this.input === undefined) {
            return;
        }
        if (this.input === "file") {
            this.sourceNode.stop();
            this.sourceNode.disconnect(this.audioContext.destination);
        }
        this.sourceNode.disconnect(this.analyserNode);
        this.jsNode.disconnect(this.audioContext.destination);
        this.flush();
        this.decoder.flush();
        this.input = undefined;
    }

    // This ScriptProcessorNode is called when it is full, we then actually look at the data in the
    // analyserNode node to measure the volume in the frequency band of interest.
    // We don't actually use the input or output of the ScriptProcesorNode.
    processSound() {
        // get the data from the analyserNode node and put into frequencyData
        this.analyserNode.getByteFrequencyData(this.frequencyData);

        // find the average volume in the filter region
        var filterRegionVolume = 0;
        for (var i = this._filterBinLow; i <= this._filterBinHigh; i++) {
            filterRegionVolume += this.frequencyData[i];
        }
        filterRegionVolume /= 1.0 * (this._filterBinHigh - this._filterBinLow + 1);

        // record the data
        var isOn = filterRegionVolume >= this._volumeThreshold;
        this.recordOnOrOff(isOn);

        this.spectrogramCallback({
            frequencyData: this.frequencyData,
            frequencyStep: this.freqStep,
            timeStep: this.timeStep,
            filterBinLow: this._filterBinLow,
            filterBinHigh: this._filterBinHigh,
            filterRegionVolume: filterRegionVolume,
            isOn: isOn
        });
    }

    // Called each tick with whether the sound is judged to be on or off.
    // If a change from on to off or off to on is detected then the number of ticks of the segment is passed to the decoder.
    recordOnOrOff(soundIsOn) {
        if (this.notStarted) {
            if (!soundIsOn) {
                // wait until we hear something
                return;
            } else {
                this.notStarted = false;
                this.lastSoundWasOn = true;
                this.ticks = 0;
            }
        }
        if (this.lastSoundWasOn === soundIsOn) {
            // accumulating an on or an off
            this.ticks++;
            if (this.ticks * this.timeStep > this.flushTime) {
                // then it's e.g. a very long pause, so flush it through to decoder and keep counting
                this.flush(soundIsOn);
                this.ticks = 0;
            }
        } else {
            // we've just changed from on to off or vice versa
            this.flush(!soundIsOn);  // flush the previous segment
            this.lastSoundWasOn = soundIsOn;
            this.ticks = 1;  // at this moment we just saw the first tick of the new segment
        }
    }

    // Flush the current ticks to the decoder.
    // Parameter is whether the ticks represent sound (on) or not
    flush(on = this.lastSoundWasOn) {
        this.decoder.addTiming((on ? 1 : -1) * this.ticks * this.timeStep);
    }

    // empty callbacks to avoid errors
    spectrogramCallback() { }
    frequencyFilterCallback() { }
    volumeFilterCallback() { }
    volumeThresholdCallback() { }
    micSuccessCallback() { }
    micErrorCallback() { }
    fileLoadCallback() { }
    fileErrorCallback() { }
    EOFCallback() { }
}
