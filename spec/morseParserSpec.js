import { getAST } from "../src/morse-pro-parser.js";

describe("Morse Parser", function () {
    it("can parse simple text", function () {
        let message = "georgia";
        expect(getAST(message)).toEqual(
            {
                type: 'message-text',
                children: [
                    { type: 'textWords', children: ['g', 'e', 'o', 'r', 'g', 'i', 'a'] }
                ]
            }
        );
    });
    it("can include whitespace in simple text", function () {
        let message = "georgia\tbob\r\nfoo";
        expect(getAST(message)).toEqual(
            {
                type: 'message-text',
                children: [
                    { type: 'textWords', children: ['g', 'e', 'o', 'r', 'g', 'i', 'a', '\t', 'b', 'o', 'b', '\r', '\n', 'f', 'o', 'o'] }
                ]
            }
        );
    });
    it("can parse text with volume directives in", function () {
        let message = "abc [v] def[V100] [v200]ghi[v300]xyz";
        expect(getAST(message)).toEqual(
            {
                type: 'message-text',
                children: [
                    { type: 'textWords', children: ['a', 'b', 'c', ' '] },
                    { type: 'directive-volume-volumeReset' },
                    { type: 'textWords', children: [' ', 'd', 'e', 'f'] },
                    { type: 'directive-volume-volumeValue', children: ['100'] },
                    { type: 'textWords', children: [' '] },
                    { type: 'directive-volume-volumeValue', children: ['200'] },
                    { type: 'textWords', children: ['g', 'h', 'i'] },
                    { type: 'directive-volume-volumeValue', children: ['300'] },
                    { type: 'textWords', children: ['x', 'y', 'z'] }
                ]
            }
        )
    });
    it("can parse text with pitch directives in", function () {
        let message = "abc [p] def[P100] [f200]ghi[F300]xyz";
        expect(getAST(message)).toEqual(
            {
                type: 'message-text', children: [
                    { type: 'textWords', children: ['a', 'b', 'c', ' '] },
                    { type: 'directive-pitch-pitchReset' },
                    { type: 'textWords', children: [' ', 'd', 'e', 'f'] },
                    { type: 'directive-pitch-pitchValue', children: ['100'] },
                    { type: 'textWords', children: [' '] },
                    { type: 'directive-pitch-pitchValue', children: ['200'] },
                    { type: 'textWords', children: ['g', 'h', 'i'] },
                    { type: 'directive-pitch-pitchValue', children: ['300'] },
                    { type: 'textWords', children: ['x', 'y', 'z'] }
                ]
            }
        )
    });
    it("can parse text with timing directives in (1)", function () {
        let message = "[t10/10]";
        expect(getAST(message)).toEqual(
            {
                type: 'message-morse',
                children: [
                    { type: 'directive-timing-timingValue', children: ['10', '10'] }
                ]
            }
        )
    });
    it("can parse text with timing directives in (2)", function () {
        let message = "[t]sos";
        expect(getAST(message)).toEqual(
        )
    });
    it("can parse text with timing directives in (3)", function () {
        let message = "abc[t] [T20/10] [t1,2,3,4,5]x[t1,2,3,4,5,6]yz";
        expect(getAST(message)).toEqual(
            {
                type: 'message-text', children: [
                    { type: 'textWords', children: ['a', 'b', 'c'] },
                    { type: 'directive-timing-timingReset' },
                    { type: 'textWords', children: [' '] },
                    { type: 'directive-timing-timingValue', children: ['20', '10'] },
                    { type: 'textWords', children: [' '] },
                    { type: 'directive-timing-timingValueLong', children: ['1', '2', '3', '4', '5'] },
                    { type: 'textWords', children: ['x'] },
                    { type: 'directive-timing-timingValueLong', children: ['1', '2', '3', '4', '5', '6'] },
                    { type: 'textWords', children: ['y', 'z'] }
                ]
            }
        )
    });
    it("can parse text with pause directives in", function () {
        let message = "abc [   ] [1000][500ms] xyz"
        expect(getAST(message)).toEqual(
            {
                type: 'message-text', children: [
                    { type: 'textWords', children: ['a', 'b', 'c', ' '] },
                    { type: 'directive-pause-pauseSpace' },
                    { type: 'textWords', children: [' '] },
                    { type: 'directive-pause-pauseValue', children: ['1000'] },
                    { type: 'directive-pause-pauseValue', children: ['500'] },
                    { type: 'textWords', children: [' ', 'x', 'y', 'z'] }
                ]
            }
        )
    });
    it("can deal with badly formed directives", function () {
        let message = "georgia [t";
        expect(getAST(message)).toBe(
            null
        );
        message = "[t1234*]";
        expect(getAST(message)).toBe(
            null
        );
        message = "abc [z1234]";
        expect(getAST(message)).toBe(
            null
        );
    });
    it("can parse simple morse", function () {
        let message = ". .•- -•. - . - .•";
        expect(getAST(message)).toEqual(
            {
                type: 'message-morse',
                children: [
                    { type: 'morseWords', children: ['. .', '•', '- -', '•', '. - . - .', '•'] }
                ]
            }
        );
    });
    it("can parse morse with odd characters in", function () {
        let message = ". .•- -•. - .•■\t.\r\n•_ _";
        expect(getAST(message)).toEqual(
            {
                type: 'message-morse',
                children: [
                    { type: 'morseWords', children: ['. .', '•', '- -', '•', '. - .', '•', '■', '\t', '.', '\r', '\n', '•', '_ _'] }
                ]
            }
        );
    });
    it("can parse morse containing directives", function () {
        let message = ". .•- -[v100]•. - . - .•";
        expect(getAST(message)).toEqual(
            {
                type: 'message-morse', children: [
                    { type: 'morseWords', children: ['. .', '•', '- -'] },
                    { type: 'directive-volume-volumeValue', children: ['100'] },
                    { type: 'morseWords', children: ['•', '. - . - .', '•'] }
                ]
            }
        );
    });
});
