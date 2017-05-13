/*
* RIFFWAVE adapted from RIFFWAVE.js v0.03 - Audio encoder for HTML5 <audio> elements.
* Copyleft 2011 by Pedro Ladaria <pedro.ladaria at Gmail dot com>
* Public Domain
*/

/*jshint esversion: 6 */

/*
    Class to create RIFF WAVE file data.
    Pass in a MorseCWWave instance.

    Usage:

    var morseMessage = new MorseMessage();
    var morseCW = new MorseCW(morseMessage);
    var morseCWWave = new MorseCWWave(morseCW);
    var riffWave = new RIFFWAVE(morseCWWave);

    morseCW.wpm = 25;  // set the speed to 25 wpm
    morseCW.fwpm = 10;  // set the Farnsworth speed to 10 wpm
    morseCWWave.sampleRate = 8000;  // per second
    morseCWWave.frequency = 600;  // frequency in Hz

    morseMessage.translate("abc");
    var wav = riffWave.getWAV();  // returns byte array of WAV file
*/

export default class RiffWave {
    constructor(morseCWWave) {
        this.morseCWWave = morseCWWave;
        this.header = {                           // OFFS SIZE NOTES
            chunkId      : [0x52,0x49,0x46,0x46], // 0    4    "RIFF" = 0x52494646
            chunkSize    : 0,                     // 4    4    36+SubChunk2Size = 4+(8+SubChunk1Size)+(8+SubChunk2Size)
            format       : [0x57,0x41,0x56,0x45], // 8    4    "WAVE" = 0x57415645
            subChunk1Id  : [0x66,0x6d,0x74,0x20], // 12   4    "fmt " = 0x666d7420
            subChunk1Size: 16,                    // 16   4    16 for PCM
            audioFormat  : 1,                     // 20   2    PCM = 1
            numChannels  : 1,                     // 22   2    Mono = 1, Stereo = 2...
            sampleRate   : 8000,                  // 24   4    8000, 44100...
            byteRate     : 0,                     // 28   4    SampleRate*NumChannels*BitsPerSample/8
            blockAlign   : 0,                     // 32   2    NumChannels*BitsPerSample/8
            bitsPerSample: 8,                     // 34   2    8 bits = 8, 16 bits = 16
            subChunk2Id  : [0x64,0x61,0x74,0x61], // 36   4    "data" = 0x64617461
            subChunk2Size: 0                      // 40   4    data size = NumSamples*NumChannels*BitsPerSample/8
        };
    }

    u32ToArray(i) {
        return [i&0xFF, (i>>8)&0xFF, (i>>16)&0xFF, (i>>24)&0xFF];
    }

    u16ToArray(i) {
        return [i&0xFF, (i>>8)&0xFF];
    }

    split16bitArray(data) {
        var r = [];
        var j = 0;
        var len = data.length;
        for (var i=0; i<len; i++) {
            r[j++] = data[i] & 0xFF;
            r[j++] = (data[i]>>8) & 0xFF;
        }
        return r;
    }

    getWAV() {
        var data = this.morseCWWave.getPCMSample();
        this.header.sampleRate = morseCWWave.sampleRate;

        this.header.blockAlign = (this.header.numChannels * this.header.bitsPerSample) >> 3;
        this.header.byteRate = this.header.blockAlign * this.header.sampleRate;
        this.header.subChunk2Size = data.length * (this.header.bitsPerSample >> 3);
        this.header.chunkSize = 36 + this.header.subChunk2Size;

        return this.header.chunkId.concat(
            this.u32ToArray(this.header.chunkSize),
            this.header.format,
            this.header.subChunk1Id,
            this.u32ToArray(this.header.subChunk1Size),
            this.u16ToArray(this.header.audioFormat),
            this.u16ToArray(this.header.numChannels),
            this.u32ToArray(this.header.sampleRate),
            this.u32ToArray(this.header.byteRate),
            this.u16ToArray(this.header.blockAlign),
            this.u16ToArray(this.header.bitsPerSample),
            this.header.subChunk2Id,
            this.u32ToArray(this.header.subChunk2Size),
            (this.header.bitsPerSample == 16) ? split16bitArray(data) : data
        );
    }

    getMIMEType() {
        return "audio/wav";
    }
}
