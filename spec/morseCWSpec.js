import MorseCW from "../src/morse-pro-cw.js";

describe("MorseCW()", function () {
    let mcw = new MorseCW();

    it("calculates times", function () {
        mcw.setWPM(20);
        mcw.setFWPM(20);
        expect(mcw.getTimings(mcw.loadMorse(".. .- / --"))).toEqual(
            [60, -60, 60, -180, 60, -60, 180, -420, 180, -60, 180]
        );
    });
    it("doesn't work when there are tags", function () {
        // TODO: the test for an exception does not work for some reason
        // expect(mcw.getNotes(mcw.loadText("a[v]"))).toThrow();
    });
});

describe("MorseCW({dictionaryOptions:['tags']})", function () {
    let mcw = new MorseCW({dictionaryOptions:['tags']});
    it("calculates times using simple timing directives", function () {
        mcw.setWPM(20);
        mcw.setFWPM(20);
        expect(mcw.lengths).toEqual(
            { '.': 60, '-': 180, ' ': -60, '•': -180, '■': -420 }
        );
        expect(mcw.getTimings(mcw.loadText("SO[t10/10]S"))).toEqual(
            [60, -60, 60, -60, 60, -180,
                180, -60, 180, -60, 180, -360,
                120, -120, 120, -120, 120]
        );
        expect(mcw.lengths).toEqual(
            { '.': 60, '-': 180, ' ': -60, '•': -180, '■': -420 }
        );
    });
    it("calculates times including timing reset directives", function () {
        mcw.setWPM(20);
        mcw.setFWPM(20);
        expect(mcw.lengths).toEqual(
            { '.': 60, '-': 180, ' ': -60, '•': -180, '■': -420 }
        );
        expect(mcw.getTimings(mcw.loadText("[t10/10]S[t]OS"))).toEqual(
            [120, -120, 120, -120, 120,
                -180, 180, -60, 180, -60, 180, -180,
                60, -60, 60, -60, 60]
        );
        expect(mcw.lengths).toEqual(
            { '.': 60, '-': 180, ' ': -60, '•': -180, '■': -420 }
        );
    });
    it("calculates time when there are pause spaces", function () {
        mcw.setWPM(20);
        mcw.setFWPM(20);
        expect(mcw.getTimings(mcw.loadText("s s[  ]s"))).toEqual(
            [
                60, -60, 60, -60, 60, -420,
                60, -60, 60, -60, 60, -840,
                60, -60, 60, -60, 60
            ]
        )
    });
    it("calculates times including pause values", function () {
        mcw.setWPM(20);
        mcw.setFWPM(20);
        expect(mcw.getTimings(mcw.loadText("e[99]e"))).toEqual(
            [60, -99, 60]
        );
        expect(mcw.getTimings(mcw.loadText("e[99ms]e"))).toEqual(
            [60, -99, 60]
        )
    })
    it("calculates times with the timing equality directive", function () {
        mcw.setWPM(20);
        mcw.setFWPM(10);
        expect(mcw.getTimings(mcw.loadText("ee e")).map(x => Math.floor(x))).toEqual(
            [ 60, -654, 60, -1526, 60 ]
        )
        expect(mcw.getTimings(mcw.loadText("ee e [t=]ee e")).map(x => Math.floor(x))).toEqual(
            [ 60, -654, 60, -1526, 60, -420, 60, -180, 60, -420, 60 ]
        )
    })
});
