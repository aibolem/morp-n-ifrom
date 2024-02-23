import Morse from "../src/morse-pro.js";
import { CHAR_SPACE, WORD_SPACE } from '../src/constants.js'

describe("Morse() with text", function () {
    let m = new Morse();
    it("tidies text", function () {
        expect(m.processTextSpaces("   aaa")).toBe(`a${CHAR_SPACE}a${CHAR_SPACE}a`);
    });
    it("inserts character spaces in simple text", function () {
        expect(m.processTextSpaces(" foo bar  baz")).toBe(`f${CHAR_SPACE}o${CHAR_SPACE}o${WORD_SPACE}b${CHAR_SPACE}a${CHAR_SPACE}r${WORD_SPACE}b${CHAR_SPACE}a${CHAR_SPACE}z`);
    });
    it("tokenises text", function () {
        expect(m.tokeniseText("one two")).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['o', CHAR_SPACE, 'n', CHAR_SPACE, 'e', WORD_SPACE, 't', CHAR_SPACE, 'w', CHAR_SPACE, 'o'] }
                ]
            }
        );
    });
    it("can include whitespace in simple text", function () {
        let message = "bar\tbob\r\nfoo";
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['b', CHAR_SPACE, 'a', CHAR_SPACE, 'r', WORD_SPACE, 'b', CHAR_SPACE, 'o', CHAR_SPACE, 'b', WORD_SPACE, 'f', CHAR_SPACE, 'o', CHAR_SPACE, 'o'] }
                ]
            }
        );
    });
    it("converts from text to message object", function () {
        expect(m.loadText("ab cd")).toEqual(
            {
                type: 'text',
                children: [
                    {
                        type: 'textWords',
                        children: ['a', CHAR_SPACE, 'b', WORD_SPACE, 'c', CHAR_SPACE, 'd'],
                        translation: ['. -', CHAR_SPACE, '- .t.t.', WORD_SPACE, '- . - .', CHAR_SPACE, '- .t.']
                    }
                ],
                error: false
            }
        );
    });
    it("flags errors when converting from text to message object", function () {
        expect(m.loadText("ab #d")).toEqual(
            {
                type: 'text',
                children: [
                    {
                        type: 'textWords',
                        children: ['a', CHAR_SPACE, 'b', WORD_SPACE, '#', CHAR_SPACE, 'd'],
                        translation: ['. -', CHAR_SPACE, '- .t.t.', WORD_SPACE, undefined, CHAR_SPACE, '- .t.'],
                        error: true
                    }
                ],
                error: true
            }
        );
    });
    it("flags errors including prosign characters", function () {
        expect(m.loadText("a<bt>a")).toEqual(
            {
                type: 'text',
                children: [
                    {
                        type: 'textWords',
                        children: ['a', CHAR_SPACE, '<', 'b', CHAR_SPACE, 't', '>', CHAR_SPACE, 'a'],
                        translation: ['. -', CHAR_SPACE, undefined, '- .t.t.', CHAR_SPACE, '-', undefined, CHAR_SPACE, '. -'],
                        error: true
                    }
                ],
                error: true
            }
        );
    });
    it("flags errors including tag characters", function () {
        expect(m.loadText("a[v100]a")).toEqual(
            {
                type: 'text',
                children: [
                    {
                        type: 'textWords',
                        children: ['a', '[', 'v', CHAR_SPACE, '1', CHAR_SPACE, '0', CHAR_SPACE, '0', ']', 'a'],
                        translation: ['. -', undefined, '.t.t. -', CHAR_SPACE, '. -h-h-h-', CHAR_SPACE, '-h-h-h-h-', CHAR_SPACE, '-h-h-h-h-', undefined, '. -'],
                        error: true
                    }
                ],
                error: true
            }
        );
    });
    it("can remove errors in text input", function () {
        expect(m.loadTextClean("abc#q")).toEqual(
            {
                type: 'text',
                children: [
                    {
                        type: 'textWords',
                        children: ['a', CHAR_SPACE, 'b', CHAR_SPACE, 'c', CHAR_SPACE, 'q'],
                        translation: ['. -', CHAR_SPACE, '- .t.t.', CHAR_SPACE, '- . - .', CHAR_SPACE, '-h- . -'],
                        error: false
                    }
                ],
                error: false
            }
        );
    });
});
describe("Morse({ dictionaryOptions: ['tags']}) with text", function () {
    let m = new Morse({ dictionaryOptions: ['tags'] });
    it("tidies text containing tags", function () {
        expect(m.processTextSpaces(" aaa  [v100] b [v]c[f550] d[t]e ")).toBe(`a${CHAR_SPACE}a${CHAR_SPACE}a[v100]${WORD_SPACE}b[v]${WORD_SPACE}c[f550]${WORD_SPACE}d[t]${CHAR_SPACE}e`);
    });
    it("inserts character spaces in text containing tags", function () {
        expect(m.processTextSpaces("foo [v110] bar")).toBe(`f${CHAR_SPACE}o${CHAR_SPACE}o[v110]${WORD_SPACE}b${CHAR_SPACE}a${CHAR_SPACE}r`);
        expect(m.processTextSpaces("foo[v110]bar")).toBe(`f${CHAR_SPACE}o${CHAR_SPACE}o[v110]${CHAR_SPACE}b${CHAR_SPACE}a${CHAR_SPACE}r`);
        expect(m.processTextSpaces("foo[v110]bar[v100]")).toBe(`f${CHAR_SPACE}o${CHAR_SPACE}o[v110]${CHAR_SPACE}b${CHAR_SPACE}a${CHAR_SPACE}r[v100]`);
        expect(m.processTextSpaces("foo[v110]b[v100]ar")).toBe(`f${CHAR_SPACE}o${CHAR_SPACE}o[v110]${CHAR_SPACE}b[v100]${CHAR_SPACE}a${CHAR_SPACE}r`);
    })
    it("protects pause spaces", function () {
        expect(m.processTextSpaces("[  ]")).toBe("[  ]");
    });
    it("leaves 1 other space around a pause space", function () {
        expect(m.processTextSpaces("s [  ]s")).toBe(`s[  ]${WORD_SPACE}s`);
        expect(m.processTextSpaces("s [  ] s")).toBe(`s[  ]${WORD_SPACE}s`);
    });
    it("can parse text with volume tags in", function () {
        let message = "abc [v] def[v100] [v200]ghi[v300]xyz";
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['a', CHAR_SPACE, 'b', CHAR_SPACE, 'c'] },
                    { type: 'tag-volume-volumeReset', tag: '[v]' },
                    { type: 'textWords', children: [WORD_SPACE, 'd', CHAR_SPACE, 'e', CHAR_SPACE, 'f'] },
                    { type: 'tag-volume-volumeValue', children: ['100'], tag: '[v100]' },
                    { type: 'tag-volume-volumeValue', children: ['200'], tag: '[v200]' },
                    { type: 'textWords', children: [WORD_SPACE, 'g', CHAR_SPACE, 'h', CHAR_SPACE, 'i'] },
                    { type: 'tag-volume-volumeValue', children: ['300'], tag: '[v300]' },
                    { type: 'textWords', children: [CHAR_SPACE, 'x', CHAR_SPACE, 'y', CHAR_SPACE, 'z'] }
                ]
            }
        )
    });
    it("can parse text with pitch tags in", function () {
        let message = "abc [p] def[p100] [f200]ghi[f300]xyz";
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['a', CHAR_SPACE, 'b', CHAR_SPACE, 'c'] },
                    { type: 'tag-pitch-pitchReset', tag: '[p]' },
                    { type: 'textWords', children: [WORD_SPACE, 'd', CHAR_SPACE, 'e', CHAR_SPACE, 'f'] },
                    { type: 'tag-pitch-pitchValue', children: ['100'], tag: '[p100]' },
                    { type: 'tag-pitch-pitchValue', children: ['200'], tag: '[f200]' },
                    { type: 'textWords', children: [WORD_SPACE, 'g', CHAR_SPACE, 'h', CHAR_SPACE, 'i'] },
                    { type: 'tag-pitch-pitchValue', children: ['300'], tag: '[f300]' },
                    { type: 'textWords', children: [CHAR_SPACE, 'x', CHAR_SPACE, 'y', CHAR_SPACE, 'z'] }
                ]
            }
        )
    });
    it("can parse text with timing tags in", function () {
        let message = "[t10/10]";
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'tag-timing-timingValue', children: ['10', '10'], tag: '[t10/10]' }
                ]
            }
        );
        message = "[t]sos";
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'tag-timing-timingReset', tag: '[t]' },
                    { type: 'textWords', children: ['s', CHAR_SPACE, 'o', CHAR_SPACE, 's'] }
                ]
            }
        );
        message = "[t][t=][t30][t30.5][t20/10][t200%][t200%/300%][t+3][t+0][t+2/-1][t-20%][t20%/-30%]";
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'tag-timing-timingReset', tag: '[t]' },
                    { type: 'tag-timing-timingEqual', tag: '[t=]' },
                    { type: 'tag-timing-timingValue', tag: '[t30]', children: ['30'] },
                    { type: 'tag-timing-timingValue', tag: '[t30.5]', children: ['30.5'] },
                    { type: 'tag-timing-timingValue', tag: '[t20/10]', children: ['20', '10'] },
                    { type: 'tag-timing-timingValue', tag: '[t200%]', children: ['200%'] },
                    { type: 'tag-timing-timingValue', tag: '[t200%/300%]', children: ['200%', '300%'] },
                    { type: 'tag-timing-timingValue', tag: '[t+3]', children: ['+3'] },
                    { type: 'tag-timing-timingValue', tag: '[t+0]', children: ['+0'] },
                    { type: 'tag-timing-timingValue', tag: '[t+2/-1]', children: ['+2', '-1'] },
                    { type: 'tag-timing-timingValue', tag: '[t-20%]', children: ['-20%'] },
                    { type: 'tag-timing-timingValue', tag: '[t20%/-30%]', children: ['20%', '-30%'] }
                ]
            }
        );
    });
    it("can parse text with pause tags in", function () {
        let message = "e [  ] e"
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['e'] },
                    { type: 'tag-pause-pauseSpace', children: [' ', ' '], tag: '[  ]' },
                    { type: 'textWords', children: [WORD_SPACE, 'e'] }
                ]
            }
        );
        message = "e [99] e"
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['e'] },
                    { type: 'tag-pause-pauseValue', children: ['99'], tag: '[99]' },
                    { type: 'textWords', children: [WORD_SPACE, 'e'] }
                ]
            }
        );
        message = "e[  ]e"
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['e'] },
                    { type: 'tag-pause-pauseSpace', children: [' ', ' '], tag: '[  ]' },
                    { type: 'textWords', children: ['e'] }
                ]
            }
        )
        message = "e[99]e"
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['e'] },
                    { type: 'tag-pause-pauseValue', children: ['99'], tag: '[99]' },
                    { type: 'textWords', children: ['e'] }
                ]
            }
        );
        message = "e[99ms]e"
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['e'] },
                    { type: 'tag-pause-pauseValue', children: ['99'], tag: '[99ms]' },
                    { type: 'textWords', children: ['e'] }
                ]
            }
        );
    });
    it("can deal with badly formed tags", function () {
        let message = "georgia [t";
        expect(m.tokeniseText(message)).toBe(
            null
        );
        message = "[t1234*]";
        expect(m.tokeniseText(message)).toBe(
            null
        );
        message = "abc [z1234]";
        expect(m.tokeniseText(message)).toBe(
            null
        );
    });
    it("tokenises text with tags", function () {
        expect(m.tokeniseText("   one [f550]   \ntwo  \t")).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['o', CHAR_SPACE, 'n', CHAR_SPACE, 'e'] },
                    { type: 'tag-pitch-pitchValue', children: ['550'], tag: '[f550]' },
                    { type: 'textWords', children: [WORD_SPACE, 't', CHAR_SPACE, 'w', CHAR_SPACE, 'o'] }
                ]
            }
        );
    });
    it("can remove errors in text input that includes tags", function () {
        expect(m.loadTextClean("ab[v]c#q")).toEqual(
            {
                type: 'text',
                children: [
                    {
                        type: 'textWords',
                        children: ['a', CHAR_SPACE, 'b'],
                        translation: ['. -', CHAR_SPACE, '- .t.t.']
                    },
                    {
                        type: 'tag-volume-volumeReset', tag: '[v]'
                    },
                    {
                        type: 'textWords',
                        children: [CHAR_SPACE, 'c', CHAR_SPACE, 'q'],
                        translation: [CHAR_SPACE, '- . - .', CHAR_SPACE, '-h- . -'],
                        error: false
                    }
                ],
                error: false
            }
        );
    });
    it("keeps the tags in the displayed text", function () {
        let msg = m.loadText("ab[v] [f100] cd");
        expect(m.displayText(msg)).toBe("ab[v][f100] cd");

    });
    it("keeps [  ] tags in the displayed text", function () {
        let msg = m.loadText("a[  ]b");
        expect(m.displayText(msg)).toBe("a[  ]b");
    });
});

describe("Morse({ dictionaryOptions: ['prosigns']}) with text", function () {
    let m = new Morse({ dictionaryOptions: ['prosigns'] });
    it("protects prosigns", function () {
        expect(m.processTextSpaces("<BT>")).toBe("<BT>");
        expect(m.processTextSpaces("<SOS>")).toBe("<SOS>");
    });
    it("tokenises text containing prosigns", function () {
        expect(m.tokeniseText("a <BT> b")).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['a', WORD_SPACE, '<BT>', WORD_SPACE, 'b'] }
                ]
            }
        );
    });
    it("gets null when a prosign is badly formed", function () {
        expect(m.loadText(">aaa")).toBe(null);
    })
});

describe("Morse() with International Morse", function () {
    let m = new Morse();
    it("can translate from text and display the text", function () {
        let msg = m.loadText("ab  c ");
        expect(m.displayText(msg)).toBe("ab c");
    });
    it("tidies morse", function () {
        expect(m.tidyMorse("   ../  -/..   ")).toBe("../-/..");
    });

    //TODO
    // it("tidies morse containing tags", function () {
    //     expect(m.tidyMorse("   ../ [f600] -|..   ")).toBe("../-/..");
    // });

    it("tokenises Morse", function () {
        expect(m.tokeniseMorse(".. .- / --")).toEqual(
            {
                type: 'morse',
                children: [
                    { type: 'morseWords', children: ['.t.', CHAR_SPACE, '. -', WORD_SPACE, '-h-'] }
                ]
            }
        );
    });

    it("can convert from morse to a message object", function () {
        expect(m.loadMorse(".. .- / --")).toEqual(
            {
                type: 'morse',
                children: [
                    {
                        type: 'morseWords',
                        children: ['.t.', CHAR_SPACE, '. -', WORD_SPACE, '-h-'],
                        translation: ['I', CHAR_SPACE, 'A', WORD_SPACE, 'M']
                    }
                ],
                error: false
            }
        );
    });
    it("can deal with errors when converting from morse to a message object", function () {
        expect(m.loadMorse("-- .-.-.-.-.-")).toEqual(
            {
                type: 'morse',
                children: [
                    {
                        type: 'morseWords',
                        children: ['-h-', CHAR_SPACE, '. - . - . - . - . -'],
                        translation: ['M', CHAR_SPACE, undefined],
                        error: true
                    }
                ],
                error: true
            }
        );
    });
    it("gets null when the morse can't be parsed", function () {
        expect(m.loadMorse("aaa")).toBe(null);
    })
    it("can translate from text and display the morse", function () {
        let msg = m.loadText("ab  c ");
        expect(m.displayMorse(msg)).toBe(".- -... / -.-.");
    });
    it("can translate from text with tags and display the text", function () {
        let msg = m.loadText("a[v100]b[t20/10]  c ");
        expect(msg.error).toBe(true);
        expect(m.displayText(msg)).toBe("a[v100]b[t20/10] c");
        expect(m.displayTextErrors(msg, {}, '{', '}')).toBe("a{[}v100{]}b{[}t20/10{]} c");
    });
    it("can translate from text and display text with errors flagged", function () {
        let msg = m.loadText("a#b");
        expect(msg.error).toBe(true);
        expect(m.displayText(msg)).toBe("a#b");
        expect(m.displayTextErrors(msg, {}, "[", "]")).toBe("a[#]b");
    })
    it("can translate from morse and display the text", function () {
        let msg = m.loadMorse("\t .-    _... /-.-.  ");
        expect(m.displayText(msg)).toBe("AB C");
    });
    it("can translate from morse and display the morse", function () {
        let msg = m.loadMorse("\t .-    _... /-.-.  ");
        expect(m.displayMorse(msg)).toBe(".- -... / -.-.");
    });
    // it("can translate from morse with tags and display the morse", function () {
    //     let msg = m.morse2text(".[v]-- [f].");
    //     expect(m.displayMorse(msg)).toBe(".-- .");
    // });
    it("can translate from morse and display morse with errors flagged", function () {
        let msg = m.loadMorse(". ------- .");
        expect(m.displayMorseErrors(msg, "{", "}")).toBe(". {-------} .");
    });
});

describe("Morse({dictionaryOptions: ['tags']}) with International Morse", function () {
    let m = new Morse({ dictionaryOptions: ['tags'] });
    it("can translate from text with tags and display the text", function () {
        let msg = m.loadText("a[v100]b[t20/10]  c ");
        expect(msg.error).toBe(false);
        expect(m.displayText(msg)).toBe("a[v100]b[t20/10] c");
        expect(m.displayTextErrors(msg, {}, '{', '}')).toBe("a[v100]b[t20/10] c");
    });
    it("can translate from morse with tags and display the morse", function () {
        let msg = m.loadMorse(".[v]-- [f].");
        expect(msg.error).toBe(true);
        // TODO: decide how this should behave
        // expect(msg).toEqual();
        // expect(m.displayMorse(msg)).toBe(".-- .");
    });
});

describe("Morse() with American Morse", function () {
    let m = new Morse({ dictionary: "american" });
    it("tidies morse", function () {
        expect(m.tidyMorse(" \u2e3a\u2e3b.- .      .. / -_  .")).toBe("\u2e3a\u2e3b.- .   ../--   .");
        //TODO: add a few more
    });
    it("processes morse spaces", function () {
        expect(m.processMorseSpaces(m.tidyMorse("\u2e3a\u2e3b.- .   .. / -_"))).toBe(`\u2e3a \u2e3b . -s.${CHAR_SPACE}. .${WORD_SPACE}- -`);
    });
    it("tokenises Morse", function () {
        expect(m.tokeniseMorse("\u2e3a\u2e3b.- .   .. / -")).toEqual(
            {
                type: 'morse',
                children: [
                    {
                        type: 'morseWords',
                        children: ['⸺ ⸻ . -s.', CHAR_SPACE, '. .', WORD_SPACE, '-']
                    }
                ]
            }
        );
    });
    it("translates Morse to text", function () {
        expect(m.loadMorse(".. .   \u2e3a   \u2e3b / .-   -...")).toEqual(
            {
                type: 'morse',
                children: [
                    {
                        type: 'morseWords',
                        children: ['. .s.', CHAR_SPACE, '⸺', CHAR_SPACE, '⸻', WORD_SPACE, '. -', CHAR_SPACE, '- . . .'],
                        translation: ['C', CHAR_SPACE, 'L', CHAR_SPACE, '0', WORD_SPACE, 'A', CHAR_SPACE, 'B']
                    }
                ],
                error: false
            }
        )
    });
    it("translates text to Morse", function () {
        expect(m.loadText("CL0 AB")).toEqual(
            {
                type: 'text',
                children: [
                    {
                        type: 'textWords',
                        children: ['C', CHAR_SPACE, 'L', CHAR_SPACE, '0', WORD_SPACE, 'A', CHAR_SPACE, 'B'],
                        translation: ['. .s.', CHAR_SPACE, '⸺', CHAR_SPACE, '⸻', WORD_SPACE, '. -', CHAR_SPACE, '- . . .']
                    }
                ],
                error: false
            }
        )
    });
    it("can translate from text and display the morse", function () {
        let msg = m.loadText("CL0 AB");
        expect(m.displayMorse(msg)).toBe(".. .   ⸺   ⸻ / .-   -...");
    });
});
