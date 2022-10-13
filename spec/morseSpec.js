import Morse from "../src/morse-pro.js";
//TODO: use CHAR_SPACE and WORD_SPACE (defined in morse-pro) rather than the explicit chars

describe("Morse", function () {
    let m = new Morse();
    it("tidies text", function () {
        expect(m.processTextSpaces("   aaa")).toBe("a•a•a");
    });
    it("tidies text containing directives", function () {
        expect(m.processTextSpaces(" aaa  [v100] b [v]c[f550] d[t]e ")).toBe("a•a•a[v100]■b[v]■c[f550]■d[t]•e");
    });
    it("inserts character spaces in simple text", function () {
        expect(m.processTextSpaces(" foo bar  baz")).toBe("f•o•o■b•a•r■b•a•z");
    })
    it("inserts character spaces in text containing directives", function () {
        expect(m.processTextSpaces("foo [v110] bar")).toBe("f•o•o[v110]■b•a•r");
    })
    it("protects pause spaces", function () {
        expect(m.processTextSpaces("[  ]")).toBe("■■");
    })
    it("protects prosigns", function () {
        expect(m.processTextSpaces("<BT>")).toBe("<BT>");
        expect(m.processTextSpaces("<SOS>")).toBe("<SOS>");
    })
    it("removes character spaces around a pause space", function () {
        expect(m.processTextSpaces("s[  ]s")).toBe("s■■s");
    })
    it("leaves 1 other space around a pause space", function () {
        expect(m.processTextSpaces("s [  ]s")).toBe("s■■■s");
        expect(m.processTextSpaces("s [  ] s")).toBe("s■■■s");
    })
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
    it("can parse text with volume directives in", function () {
        let message = "abc [v] def[V100] [v200]ghi[v300]xyz";
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['a', '•', 'b', '•', 'c'] },
                    { type: 'directive-volume-volumeReset' },
                    { type: 'textWords', children: ['■', 'd', '•', 'e', '•', 'f'] },
                    { type: 'directive-volume-volumeValue', children: ['100'] },
                    { type: 'directive-volume-volumeValue', children: ['200'] },
                    { type: 'textWords', children: ['■', 'g', '•', 'h', '•', 'i'] },
                    { type: 'directive-volume-volumeValue', children: ['300'] },
                    { type: 'textWords', children: ['•', 'x', '•', 'y', '•', 'z'] }
                ]
            }
        )
    });
    it("can parse text with pitch directives in", function () {
        let message = "abc [p] def[P100] [f200]ghi[F300]xyz";
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['a', '•', 'b', '•', 'c'] },
                    { type: 'directive-pitch-pitchReset' },
                    { type: 'textWords', children: ['■', 'd', '•', 'e', '•', 'f'] },
                    { type: 'directive-pitch-pitchValue', children: ['100'] },
                    { type: 'directive-pitch-pitchValue', children: ['200'] },
                    { type: 'textWords', children: ['■', 'g', '•', 'h', '•', 'i'] },
                    { type: 'directive-pitch-pitchValue', children: ['300'] },
                    { type: 'textWords', children: ['•', 'x', '•', 'y', '•', 'z'] }
                ]
            }
        )
    });
    it("can parse text with timing directives in", function () {
        let message = "[t10/10]";
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'directive-timing-timingValue', children: ['10', '10'] }
                ]
            }
        );
        message = "[t]sos";
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'directive-timing-timingReset' },
                    { type: 'textWords', children: ['s', '•', 'o', '•', 's'] }
                ]
            }
        );
        message = "abc[t] [T20/10] [t1,2,3,4,5]x[t1,2,3,4,5,6]yz";
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['a', '•', 'b', '•', 'c'] },
                    { type: 'directive-timing-timingReset' },
                    { type: 'directive-timing-timingValue', children: ['20', '10'] },
                    { type: 'textWords', children: ['■'] },
                    { type: 'directive-timing-timingValueLong', children: ['1', '2', '3', '4', '5'] },
                    { type: 'textWords', children: ['■', 'x'] },
                    { type: 'directive-timing-timingValueLong', children: ['1', '2', '3', '4', '5', '6'] },
                    { type: 'textWords', children: ['•', 'y', '•', 'z'] }
                ]
            }
        );
    });
    it("can parse text with pause directives in", function () {
        let message = "e [  ] e"
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['e', '■', '■', '■', 'e'] }
                ]
            }
        );
        message = "e [99] e"
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['e'] },
                    { type: 'directive-pause-pauseValue', children: ['99'] },
                    { type: 'textWords', children: ['■', 'e'] }
                ]
            }
        );
        message = "e[  ]e"
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['e', '■', '■', 'e'] }
                ]
            }
        )
        message = "e[99]e"
        expect(m.tokeniseText(message)).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['e'] },
                    { type: 'directive-pause-pauseValue', children: ['99'] },
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
                    { type: 'directive-pause-pauseValue', children: ['99'] },
                    { type: 'textWords', children: ['e'] }
                ]
            }
        );
    });
    it("can deal with badly formed directives", function () {
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

    it("tokenises text with directives", function () {
        expect(m.tokeniseText("   one [f550]   \ntwo  \t")).toEqual(
            {
                type: 'text',
                children: [
                    { type: 'textWords', children: ['o', '•', 'n', '•', 'e'] },
                    { type: 'directive-pitch-pitchValue', children: ['550'] },
                    { type: 'textWords', children: ['■', 't', '•', 'w', '•', 'o'] }
                ]
            }
        );
    });
    it("tidies morse", function () {
        expect(m.tidyMorse("   ../  -|..   ")).toBe("../-/..");
    });

    //TODO
    // it("tidies morse containing directives", function () {
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
    it("converts from text to message object", function () {
        expect(m.text2morse("ab cd")).toEqual(
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
        expect(m.text2morse("ab #d")).toEqual(
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
    it("gets null when the text can't be parsed", function () {
        expect(m.text2morse(">aaa")).toBe(null);
    })
    it("can remove errors in text input", function () {
        expect(m.text2morseClean("abc#q")).toEqual(
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
    it("can remove errors in text input that includes directives", function () {
        expect(m.text2morseClean("ab[v]c#q")).toEqual(
            {
                type: 'text',
                children: [
                    {
                        type: 'textWords',
                        children: ['a', '•', 'b'],
                        translation: ['. -', '•', '- . . .']
                    },
                    {
                        type: 'directive-volume-volumeReset'
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
    it("can convert from morse to a message object", function () {
        expect(m.morse2text(".. .- / --")).toEqual(
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
        expect(m.morse2text("-- .-.-.-.-.-")).toEqual(
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
        expect(m.morse2text("aaa")).toBe(null);
    })

    it("can translate from text and display the text", function () {
        let msg = m.text2morse("ab  c ");
        expect(m.displayText(msg)).toBe("ab c");
    });
    it("can translate from text and display the morse", function () {
        let msg = m.text2morse("ab  c ");
        expect(m.displayMorse(msg)).toBe(".- -... / -.-.");
    });
    it("can translate from text with directives and display the text", function () {
        let msg = m.text2morse("a[v100]b[t20/10]  c ");
        expect(m.displayText(msg)).toBe("ab c");
    });
    it("can translate from text and display text with errors flagged", function () {
        let msg = m.text2morse("a#b");
        expect(m.displayTextErrors(msg, {}, "[", "]")).toBe("a[#]b");
    })
    it("can translate from morse and display the text", function () {
        let msg = m.morse2text("\t .-    _... /-.-.  ");
        expect(m.displayText(msg)).toBe("AB C");
    });
    it("can translate from morse and display the morse", function () {
        let msg = m.morse2text("\t .-    _... /-.-.  ");
        expect(m.displayMorse(msg)).toBe(".- -... / -.-.");
    });
    it("can translate from morse with directives and display the morse", function () {
        let msg = m.morse2text(".[v]-- [f].");
        expect(m.displayMorse(msg)).toBe(".-- .");
    });
    it("can translate from morse and display morse with errors flagged", function () {
        let msg = m.morse2text(". ------- .");
        expect(m.displayMorseErrors(msg, "{", "}")).toBe(". {-------} .");
    });
});
