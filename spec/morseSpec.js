import Morse from "../src/morse-pro.js";
//TODO: use CHAR_SPACE (defined in parser) rather than the explicit char

describe("Morse", function () {
    let m = new Morse();
    it("tidies text", function () {
        expect(m.tidyText("   aaa")).toBe("aaa");
    });
    it("tidies text containing directives", function () {
        expect(m.tidyText(" aaa  [v100] b [v]c[f550] d[t]e ")).toBe("aaa[v100] b[v] c[f550] d[t]e");
    });
    it("inserts character spaces in simple text", function () {
        expect(m.processTextSpaces(" foo bar  baz")).toBe(
            "■f•o•o■b•a•r■■b•a•z"
        );
    })
    it("inserts character spaces in text containing directives", function () {
        expect(m.processTextSpaces("foo [v110] bar")).toBe(
            "f•o•o■[v110]■b•a•r"
        );
    })
    it("tokenises text", function () {
        expect(m.tokeniseText("one two")).toEqual(
            {
                type: 'message-text',
                children: [
                    { type: 'textWords', children: ['o', '•', 'n', '•', 'e', '■', 't', '•', 'w', '•', 'o'] }
                ]
            }
        );
    });
    it("tokenises text with directives", function () {
        expect(m.tokeniseText("   one [f550]   \ntwo  \t")).toEqual(
            {
                type: 'message-text',
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
                type: 'message-morse',
                children: [
                    { type: 'morseWords', children: ['. .', '•', '. -', '■', '- -'] }
                ]
            }
        );
    });
    it("converts from text to message object", function () {
        expect(m.text2morse("ab cd")).toEqual(
            {
                type: 'message-text',
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
                type: 'message-text',
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
    it("can remove errors in text input", function () {
        expect(m.text2morseClean("abc#q")).toEqual(
            {
                type: 'message-text',
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
    it("can convert from morse to a message object", function () {
        expect(m.morse2text(".. .- / --")).toEqual(
            {
                type: 'message-morse',
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
                type: 'message-morse',
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

    it("can translate from text and display the text", function () {
        let msg = m.text2morse("ab  c ");
        expect(m.displayText(msg)).toBe("ab c");
    });
    it("can translate from text and display the morse", function () {
        let msg = m.text2morse("ab  c ");
        expect(m.displayMorse(msg)).toBe(".- -... / -.-.");
    });
    it("can translate from morse and display the text", function () {
        let msg = m.morse2text("\t .-    _... /-.-.  ");
        expect(m.displayText(msg)).toBe("AB C");
    });
    it("can translate from morse and display the morse", function () {
        let msg = m.morse2text("\t .-    _... /-.-.  ");
        expect(m.displayMorse(msg)).toBe(".- -... / -.-.");
    });

    it("can translate from text with directives and display the text", function () {
        let msg = m.text2morse("a[v100]b[t20/10]  c ");
        expect(m.displayText(msg)).toBe("ab c");
    });
});
