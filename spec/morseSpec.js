import Morse from "../src/morse-pro.js";
//TODO: use CHAR_SPACE and WORD_SPACE (defined in morse-pro) rather than the explicit chars

describe("Morse() with text", function () {
    let m = new Morse();
    it("tidies text", function () {
        expect(m.processTextSpaces("   aaa")).toBe("a•a•a");
    });
    it("inserts character spaces in simple text", function () {
        expect(m.processTextSpaces(" foo bar  baz")).toBe("f•o•o■b•a•r■b•a•z");
    });
    it("tokenises text", function () {
        expect(m.tokeniseText("one two")).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['o', '•', 'n', '•', 'e', '■', 't', '•', 'w', '•', 'o'] }
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
                    { type: 'textWords', children: ['b', '•', 'a', '•', 'r', '■', 'b', '•', 'o', '•', 'b', '■', 'f', '•', 'o', '•', 'o'] }
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
                        children: ['a', '•', 'b', '■', 'c', '•', 'd'],
                        translation: ['. -', '•', '- . . .', '■', '- . - .', '•', '- . .']
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
                        children: ['a', '•', 'b', '■', '#', '•', 'd'],
                        translation: ['. -', '•', '- . . .', '■', undefined, '•', '- . .'],
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
                        children: ['a', '•', '<', 'b', '•', 't', '>', '•', 'a'],
                        translation: ['. -', '•', undefined, '- . . .', '•', '-', undefined, '•', '. -'],
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
                        children: ['a', '[', 'v', '•', '1', '•', '0', '•', '0', ']', 'a'],
                        translation: ['. -', undefined, '. . . -', '•', '. - - - -', '•', '- - - - -', '•', '- - - - -', undefined, '. -'],
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
                        children: ['a', '•', 'b', '•', 'c', '•', 'q'],
                        translation: ['. -', '•', '- . . .', '•', '- . - .', '•', '- - . -'],
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
        expect(m.processTextSpaces(" aaa  [v100] b [v]c[f550] d[t]e ")).toBe("a•a•a[v100]■b[v]■c[f550]■d[t]•e");
    });
    it("inserts character spaces in text containing tags", function () {
        expect(m.processTextSpaces("foo [v110] bar")).toBe("f•o•o[v110]■b•a•r");
    })
    it("protects pause spaces", function () {
        expect(m.processTextSpaces("[  ]")).toBe("[  ]");
    });
    it("leaves 1 other space around a pause space", function () {
        expect(m.processTextSpaces("s [  ]s")).toBe("s[  ]■s");
        expect(m.processTextSpaces("s [  ] s")).toBe("s[  ]■s");
    });
    it("can parse text with volume tags in", function () {
        let message = "abc [v] def[v100] [v200]ghi[v300]xyz";
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['a', '•', 'b', '•', 'c'] },
                    { type: 'tag-volume-volumeReset', tag: '[v]' },
                    { type: 'textWords', children: ['■', 'd', '•', 'e', '•', 'f'] },
                    { type: 'tag-volume-volumeValue', children: ['100'], tag: '[v100]' },
                    { type: 'tag-volume-volumeValue', children: ['200'], tag: '[v200]' },
                    { type: 'textWords', children: ['■', 'g', '•', 'h', '•', 'i'] },
                    { type: 'tag-volume-volumeValue', children: ['300'], tag: '[v300]' },
                    { type: 'textWords', children: ['•', 'x', '•', 'y', '•', 'z'] }
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
                    { type: 'textWords', children: ['a', '•', 'b', '•', 'c'] },
                    { type: 'tag-pitch-pitchReset', tag: '[p]' },
                    { type: 'textWords', children: ['■', 'd', '•', 'e', '•', 'f'] },
                    { type: 'tag-pitch-pitchValue', children: ['100'], tag: '[p100]' },
                    { type: 'tag-pitch-pitchValue', children: ['200'], tag: '[f200]' },
                    { type: 'textWords', children: ['■', 'g', '•', 'h', '•', 'i'] },
                    { type: 'tag-pitch-pitchValue', children: ['300'], tag: '[f300]' },
                    { type: 'textWords', children: ['•', 'x', '•', 'y', '•', 'z'] }
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
                    { type: 'textWords', children: ['s', '•', 'o', '•', 's'] }
                ]
            }
        );
        message = "abc[t] [t30] [t20/10] [t=] [t200%] [t200%/300%]";
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['a', '•', 'b', '•', 'c'] },
                    { type: 'tag-timing-timingReset', tag: '[t]' },
                    { type: 'tag-timing-timingValue', tag: '[t30]', children: ['30'] },
                    { type: 'textWords', children: ['■'] },
                    { type: 'tag-timing-timingValue', tag: '[t20/10]', children: ['20', '10'] },
                    { type: 'textWords', children: ['■'] },
                    { type: 'tag-timing-timingEqual', tag: '[t=]' },
                    { type: 'textWords', children: ['■'] },
                    { type: 'tag-timing-timingValuePercentage', tag: '[t200%]', children: ['200'] },
                    { type: 'textWords', children: ['■'] },
                    { type: 'tag-timing-timingValuePercentage', tag: '[t200%/300%]', children: ['200', '300'] },
                    { type: 'textWords', children: ['■'] }
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
                    { type: 'textWords', children: ['■', 'e'] }
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
                    { type: 'textWords', children: ['■', 'e'] }
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
                    { type: 'textWords', children: ['o', '•', 'n', '•', 'e'] },
                    { type: 'tag-pitch-pitchValue', children: ['550'], tag: '[f550]' },
                    { type: 'textWords', children: ['■', 't', '•', 'w', '•', 'o'] }
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
                        children: ['a', '•', 'b'],
                        translation: ['. -', '•', '- . . .']
                    },
                    {
                        type: 'tag-volume-volumeReset', tag: '[v]'
                    },
                    {
                        type: 'textWords',
                        children: ['•', 'c', '•', 'q'],
                        translation: ['•', '- . - .', '•', '- - . -'],
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
                    { type: 'textWords', children: ['a', '■', '<BT>', '■', 'b'] }
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
                    { type: 'morseWords', children: ['. .', '•', '. -', '■', '- -'] }
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
                        children: ['. .', '•', '. -', '■', '- -'],
                        translation: ['I', '•', 'A', '■', 'M']
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
                        children: ['- -', '•', '. - . - . - . - . -'],
                        translation: ['M', '•', undefined],
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
        expect(msg.error).toBe(false);
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
        expect(m.processMorseSpaces(m.tidyMorse("\u2e3a\u2e3b.- .   .. / -_"))).toBe("\u2e3a \u2e3b . -s.•. .■- -");
    });
    it("tokenises Morse", function () {
        expect(m.tokeniseMorse("\u2e3a\u2e3b.- .   .. / -")).toEqual(
            {
                type: 'morse',
                children: [
                    {
                        type: 'morseWords',
                        children: ['⸺ ⸻ . -s.', '•', '. .', '■', '-']
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
                        children: ['. .s.', '•', '⸺', '•', '⸻', '■', '. -', '•', '- . . .'],
                        translation: ['C', '•', 'L', '•', '0', '■', 'A', '•', 'B']
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
                        children: ['C', '•', 'L', '•', '0', '■', 'A', '•', 'B'],
                        translation: ['. .s.', '•', '⸺', '•', '⸻', '■', '. -', '•', '- . . .']
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
