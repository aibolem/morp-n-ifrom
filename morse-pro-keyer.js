// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

import MorseDecoder from 'morse-pro-decoder';
import MorsePlayerWAA from 'morse-pro-player-waa';

const DITS_PER_WORD = 50;  // TODO: work out where to define this properly

export default class MorseKeyer {
    constructor(signalCallback, audioContextClass, frequency, wpm, fwpm) {
        this.signalCallback = signalCallback;
        this.frequency = frequency;  // tone frequency in Hz
        this.wpm = wpm || 20;
        this.fwpm = fwpm || 20;  // TODO: not used yet

        this.ditLen = (60000 / wpm) / DITS_PER_WORD;  // duration of dir in ms
        this.tick = 2 * this.ditLen;

        this.player = new MorsePlayerWAA(audioContextClass);
        this.decoder = new MorseDecoder(this.ditLen, this.wpm);

        var that = this;
        this.check = function() {
            if (that.skipNext) {
                that.skipNext = false;
                return;
            }
            var input = that.signalCallback();
            if (input === 1) {
                that.playTone(true);
                that.decoder.addTiming(that.ditLen);
                that.decoder.addTiming(-that.ditLen);
            } else if (input === 0) {
                that.decoder.addTiming(-2 * that.ditLen);
            } else if (input === -1) {
                that.playTone(false);
                that.decoder.addTiming(3 * that.ditLen);
                that.decoder.addTiming(-that.ditLen);
                that.skipNext = true;
            }
        };
    }

    start() {
        this.timer = setInterval(this.check, this.tick);
    }

    stop() {
        clearInterval(this.timer);
    }

    playTone(isDit) {
        var duration = isDit ? this.ditLen : 3 * this.ditLen;
        this.player.load([duration], this.frequency);
        this.player.playFromStart();
    }
}
