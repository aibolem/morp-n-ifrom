// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

/*
    Web browser sound player using Web Audio API.
    Extends MorsePlayerWAA to provide callbacks when the sound goes on or off.
    Can be used to turn a light on or off in time with the Morse sound.
    The callbacks have an error of +/- 2.6ms

    Usage:

    import MorseCWWave from 'morse-pro-cw-wave';
    import MorsePlayerWAALight from 'morse-pro-player-waa-light';

    var morseCWWave = new MorseCWWave();
    morseCWWave.translate("abc");

    var morsePlayerWAALight = new MorsePlayerWAALight();
    morsePlayerWAALight.soundOnCallback = lightOn;
    morsePlayerWAALight.soundOffCallback = lightOff;
    morsePlayerWAALight.volume = 0;
    morsePlayerWAALight.loadCWWave(morseCWWave);
    morsePlayerWAA.playFromStart();
*/

import MorsePlayerWAA from 'morse-pro-player-waa';

export default class MorsePlayerWAALight extends MorsePlayerWAA {
    constructor(audioContextClass = undefined) {
        super(audioContextClass);
        this.wasOn = false;
    }

    getAudioContext() {
        var ctx = super.getAudioContext();
        this.jsNode = ctx.createScriptProcessor(256, 1, 1);
        this.jsNode.connect(ctx.destination);  // otherwise Chrome ignores it
        this.jsNode.onaudioprocess = this.processSound.bind(this);
        this.splitterNode.connect(this.jsNode);
        return ctx;
    }

    processSound(event) {
        var input = event.inputBuffer.getChannelData(0);
        var sum = 0;
        for (var i = 0; i < input.length; i++) {
            sum += Math.abs(input[i]) > 0;
        }
        var on = (sum > 128);  // is more than half the buffer non-zero?
        if (on && !this.wasOn) {
            this.soundOnCallback();
        } else if (!on && this.wasOn) {
            this.soundOffCallback();
        }
        this.wasOn = on;
    }

    soundOnCallback() { }
    soundOffCallback() { }
}
