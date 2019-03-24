import MorseMessage from '../src/morse-pro-message';
import Morse from '../src/morse-pro-cw';

var assert = require('assert');

describe('morse-pro-message', function() {
    describe('translate()', function() {
        let tests = [
            {args: [''], expected: {morse: '', text: '', hasError: false}},
            {args: ['S'], expected: {morse: '...', text: 'S', hasError: false}},
            {args: ['s'], expected: {morse: '...', text: 'S', hasError: false}},
            {args: [' S'], expected: {morse: '...', text: 'S', hasError: false}},
            {args: ['S '], expected: {morse: '...', text: 'S', hasError: false}},
            {args: ['s s'], expected: {morse: '... / ...', text: 'S S', hasError: false}},
            {args: ['s  s'], expected: {morse: '... / ...', text: 'S S', hasError: false}},
            {args: ['... / ...'], expected: {morse: '... / ...', text: 'S S', hasError: false}},
            // {args: ['<AA>'], expected: {morse: '.-.-', message: '<AA>', hasError: false}},
            // {args: ['<AA>', true], expected: {morse: '.-.-', message: '<AA>', hasError: false}},
            // {args: ['<AA>', false], expected: {morse: '# .- .- #', message: '#<#AA#>#', hasError: true}},
            // {args: ['<AAA>', true], expected: {morse: '#', message: '#<AAA>#', hasError: true}},
        ];

        tests.forEach(function(test) {
            it('correctly translates "' + test.args + '" to "' + test.expected.morse + '"', function() {
                let morse = new Morse({dictionary: 'international', useProsigns: true});
                let message = new MorseMessage(morse);
                let res = message.translate(...test.args);
                for (let key in test.expected) {
                    assert.equal(message[key], test.expected[key]);
                }
            });
        });
    });
});