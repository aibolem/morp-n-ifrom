// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

import MorseDecoder from 'morse-pro-decoder';
import MorsePlayerWAA from 'morse-pro-player-waa';

const DITS_PER_WORD = 50;  // TODO: work out where to define this properly

/*
    The Morse keyer tests for input on a timer, plays the apprpriate tone and passes the data to a decorer.
    Arguments:
        - signalCallback: a function which should return {0, 1, 2, 3} from the vitual "paddle" depending if nothing, a dit, a dah or both is detected
                            This implementation just plays dits if both switches are detexted.
        - messageCallback: a function which receives a dictionary with keys 'message', 'timings' and 'morse' for each decoded part (see MorseDecoder)
        - audioContextClass: e.g. window.AudioContext
        - frequency: the frequency in Hz for the sidetone
        - wpm: speed of the keyer
*/
export default class MorseKeyer {
    constructor(signalCallback, messageCallback, audioContextClass, frequency, wpm) {
        this.signalCallback = signalCallback;
        this.messageCallback = messageCallback;
        this.frequency = frequency;
        this.wpm = wpm || 20;

        this.ditLen = (60000 / wpm) / DITS_PER_WORD;  // duration of dit in ms
        this.tick = 2 * this.ditLen;
        this.playing = false;

        this.player = new MorsePlayerWAA(audioContextClass);
        this.decoder = new MorseDecoder(1, this.wpm, messageCallback);
        this.decoder.noiseThreshold = 0;

        var that = this;
        this.check = function() {
            var input = that.signalCallback();
            if (input === 0) {
                that.lastTime = (new Date()).getTime();
                that.stop();
            } else {
                if (that.lastTime) {
                    that.decoder.addTiming(-( (new Date()).getTime() - that.lastTime ));
                }
                if (input & 1) {
                    that.playTone(true);
                    that.decoder.addTiming(1 * that.ditLen);
                    that.decoder.addTiming(-1 * that.ditLen);
                    that.timer = setTimeout(that.check, 2 * that.ditLen);
                } else if (input & 2) {
                    that.playTone(false);
                    that.decoder.addTiming(3 * that.ditLen);
                    that.decoder.addTiming(-1 * that.ditLen);
                    that.timer = setTimeout(that.check, 4 * that.ditLen);
                }
            }
        };
    }

    start() {
        if (this.playing) {
            return;
        } else {
            this.playing = true;
            this.check();
        }
    }

    stop() {
        this.playing = false;
        clearTimeout(this.timer);
    }

    playTone(isDit) {
        var duration = isDit ? this.ditLen : 3 * this.ditLen;
        this.player.load([duration], this.frequency);
        this.player.playFromStart();
    }
}
