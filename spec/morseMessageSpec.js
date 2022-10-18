import MorseMessage from "../src/morse-pro-message.js";
import MorseCWWave from '../src/morse-pro-cw-wave.js';

describe("MorseMessage()", function () {
    let morseCWWave = new MorseCWWave();
    let m = new MorseMessage(morseCWWave);

    it("loads text", function () {
        expect(m.loadText("abc")).toBe(".- -... -.-.");
    });
    it("loads text with errors", function () {
        expect(m.loadText("ab#c")).toBe(".- -...  -.-.");  // bad token missed out, extra space present
    });
    it("loads morse", function () {
        expect(m.loadMorse(". .. --- / - -- ...")).toBe("EIO TMS");
    });
    it("translates text", function () {
        expect(m.translate("abc")).toBe(".- -... -.-.");
    });
    it("translates morse", function () {
        expect(m.translate(". .. --- / - -- ...")).toBe("EIO TMS");
    });
    it("translates text that looks like morse", function () {
        expect(m.translate("...", false)).toBe(".-.-.- .-.-.- .-.-.-");
    })
    it("gets text error string", function () {
        m.loadText("a#b");
        expect(m.getTextErrorString("{", "}")).toBe("a{#}b");
        expect(m.getTextErrorString("{", "}", {'#': 'XXX'})).toBe("a{XXX}b");
    });
    it("gets morse error string with prosign characters in", function () {
        expect(m.loadText("a<b")).toBe(".- -...");
        expect(m.getTextErrorString("{", "}")).toBe("a{<}b");
    });
    it("gets null when morse can't be parsed", function () {
        expect(m.loadMorse("aaa")).toBe("");
        expect(m.getMorseErrorString()).toBe("");
    });
    it("gets morse error string", function () {
        m.loadText("a#b");
        expect(m.getMorseErrorString("{", "}")).toBe(".- {} -...");
        expect(m.getMorseErrorString("#")).toBe(".- # -...");
    });
    it("gets timings", function () {
        m.loadText("so s");
        expect(m.timings).toEqual([ 60, -60, 60, -60, 60, -180, 180, -60, 180, -60, 180, -420, 60, -60, 60, -60, 60 ]);
    });
});

describe("MorseMessage using dictionaryOptions:['prosigns']", function () {
    let morseCWWave = new MorseCWWave({dictionaryOptions:['prosigns']});
    let m = new MorseMessage(morseCWWave);
    it("gets empty string when text can't be parsed", function () {
        expect(m.loadText("a<b")).toBe("");
        expect(m.hasError).toBe(true);
        expect(m.getTextErrorString()).toBe("");
    });
});
