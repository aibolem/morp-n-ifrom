import MorseCW from "../src/morse-pro-cw.js";

describe("MorseCW", function () {
    let mcw = new MorseCW();

    it("calculates times", function() {
        mcw.setWPM(20);
        mcw.setFWPM(20);
        expect(mcw.getTimings(mcw.morse2text(".. .- / --"))).toEqual(
            [ 60, -60, 60, -180, 60, -60, 180, -420, 180, -60, 180 ]
        );
    });
    it("calculates times using simple timing directives", function() {
        mcw.setWPM(20);
        mcw.setFWPM(20);
        expect(mcw.lengths).toEqual(
            { '.': 60, '-': 180, ' ':-60, '•': -180, '■': -420 }
        );
        expect(mcw.getTimings(mcw.text2morse("SO[t10/10]S"))).toEqual(
            [ 60, -60, 60, -60, 60, -180, 180, -60, 180, -60, 180, -360, 120, -120, 120, -120, 120 ]
        );
        expect(mcw.lengths).toEqual(
            { '.': 60, '-': 180, ' ':-60, '•': -180, '■': -420 }
        );
    });
    it("calculates times including timing reset directives", function() {
        mcw.setWPM(20);
        mcw.setFWPM(20);
        expect(mcw.lengths).toEqual(
            { '.': 60, '-': 180, ' ':-60, '•': -180, '■': -420 }
        );
        expect(mcw.getTimings(mcw.text2morse("[t10/10]S[t]OS"))).toEqual(

        );
        expect(mcw.lengths).toEqual(
            { '.': 60, '-': 180, ' ':-60, '•': -180, '■': -420 }
        );
    });
});
