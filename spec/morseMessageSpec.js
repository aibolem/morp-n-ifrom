import MorseMessage from "../src/morse-pro-message.js";
import MorseCWWave from '../src/morse-pro-cw-wave.js';

describe("MorseMessage", function () {
    let morseCWWave = new MorseCWWave();
    let m = new MorseMessage(morseCWWave);

    it("loads text", function () {
        expect(m.loadText("abc")).toBe(".- -... -.-.");
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
        m.loadText("a#b<");
        expect(m.getTextErrorString("{", "}")).toBe("a{#}b{<}");
        expect(m.getTextErrorString("{", "}", {'<': '&lt;'})).toBe("a{#}b{&lt;}");
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
