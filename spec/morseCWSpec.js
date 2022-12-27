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
    let mcw = new MorseCW({ dictionaryOptions: ['tags'] });
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
            [60, -654, 60, -1526, 60]
        )
        expect(mcw.getTimings(mcw.loadText("ee e [t=]ee e")).map(x => Math.floor(x))).toEqual(
            [60, -654, 60, -1526, 60, -420, 60, -180, 60, -420, 60]
        )
    });
    it("calculates times with the one-number absolute timing directive", function () {
        mcw.setWPM(12);
        mcw.setFWPM(15);
        expect(mcw.getTimings(mcw.loadText("[t20]et s")).map(x => Math.floor(x))).toEqual(
            [60, -180, 180, -420, 60, -60, 60, -60, 60]
        );
    });
    it("calculates times with the two-number absolute timing directive", function () {
        mcw.setWPM(12);
        mcw.setFWPM(15);
        expect(mcw.getTimings(mcw.loadText("[t20/20]et s")).map(x => Math.floor(x))).toEqual(
            [60, -180, 180, -420, 60, -60, 60, -60, 60]
        );
    });
    it("calculates times with the one-number relative timing directive", function () {
        mcw.setWPM(12);
        mcw.setFWPM(12);
        expect(mcw.getTimings(mcw.loadText("[t+8]et s")).map(x => Math.floor(x))).toEqual(
            [60, -180, 180, -420, 60, -60, 60, -60, 60]
        );
    });
    it("calculates times with the floating point one-number relative timing directive", function () {
        mcw.setWPM(12.5);
        mcw.setFWPM(12.5);
        expect(mcw.getTimings(mcw.loadText("[t+7.5]et s")).map(x => Math.floor(x))).toEqual(
            [60, -180, 180, -420, 60, -60, 60, -60, 60]
        );
    });
    it("calculates times with the two-number relative timing directive", function () {
        mcw.setWPM(15);
        mcw.setFWPM(12);
        expect(mcw.getTimings(mcw.loadText("[t+5/+8]et s")).map(x => Math.floor(x))).toEqual(
            [60, -180, 180, -420, 60, -60, 60, -60, 60]
        );
    });
    it("calculates times with the two-number relative timing directive, one of them zero", function () {
        mcw.setWPM(20);
        mcw.setFWPM(12);
        expect(mcw.getTimings(mcw.loadText("[t+0/+8]et s")).map(x => Math.floor(x))).toEqual(
            [60, -180, 180, -420, 60, -60, 60, -60, 60]
        );
    });
    it("calculates times with the one-number absolute percentage timing directive", function () {
        mcw.setWPM(10);
        mcw.setFWPM(10);
        expect(mcw.getTimings(mcw.loadText("[t200%]et s")).map(x => Math.floor(x))).toEqual(
            [60, -180, 180, -420, 60, -60, 60, -60, 60]
        );
    });
    it("calculates times with the two-number absolute percentage timing directive", function () {
        mcw.setWPM(10);
        mcw.setFWPM(5);
        expect(mcw.getTimings(mcw.loadText("[t200%/400%]et s")).map(x => Math.floor(x))).toEqual(
            [60, -180, 180, -420, 60, -60, 60, -60, 60]
        );
    });
    it("calculates times with the one-number relative percentage timing directive", function () {
        mcw.setWPM(10);
        mcw.setFWPM(10);
        expect(mcw.getTimings(mcw.loadText("[t+100%]et s")).map(x => Math.floor(x))).toEqual(
            [60, -180, 180, -420, 60, -60, 60, -60, 60]
        );
    });
    it("calculates times with the two-number relative percentage timing directive", function () {
        mcw.setWPM(22);
        mcw.setFWPM(10);
        expect(mcw.getTimings(mcw.loadText("[t-10%/+100%]et s")).map(x => Math.floor(x))).toEqual(
            [60, -180, 180, -420, 60, -60, 60, -60, 60]
        );
    });
    it("calculates times with the two-number mixed timing directive", function () {
        mcw.setWPM(22);
        mcw.setFWPM(10);
        expect(mcw.getTimings(mcw.loadText("[t-10%/+10]et s")).map(x => Math.floor(x))).toEqual(
            [60, -180, 180, -420, 60, -60, 60, -60, 60]
        );
        expect(mcw.getTimings(mcw.loadText("[t-10%/20]et s")).map(x => Math.floor(x))).toEqual(
            [60, -180, 180, -420, 60, -60, 60, -60, 60]
        );
    });
    it("calculates times correctly where changing wpm changes fwpm", function () {
        mcw.setWPM(30);
        mcw.setFWPM(30);
        expect(mcw.getTimings(mcw.loadText("[t-10/-10]et s")).map(x => Math.floor(x))).toEqual(
            [60, -180, 180, -420, 60, -60, 60, -60, 60]
        );
    });
    it("calculates times restoring initial state after changing timing values inside a message", function () {
        mcw.setWPM(10);
        mcw.setFWPM(10);
        expect(mcw.getTimings(mcw.loadText("[t+100%]et s")).map(x => Math.floor(x))).toEqual(
            [60, -180, 180, -420, 60, -60, 60, -60, 60]
        );
        expect(mcw.getTimings(mcw.loadText("[t+100%]et s")).map(x => Math.floor(x))).toEqual(
            [60, -180, 180, -420, 60, -60, 60, -60, 60]
        );
        expect(mcw.wpm).toBe(10);
        expect(mcw.fwpm).toBe(10);
    });
    it("calculates times ensuring relative timing tags work on the original values", function () {
        mcw.setWPM(10);
        mcw.setFWPM(10);
        expect(mcw.getTimings(mcw.loadText("[t200%]et s[t200%]e")).map(x => Math.floor(x))).toEqual(
            [60, -180, 180, -420, 60, -60, 60, -60, 60, -180, 60]
        );
    });
    it("gets notes with frequencies in", function () {
        mcw.setWPM(20);
        mcw.setFWPM(20);
        mcw.setFrequency(400);
        expect(mcw.getNotes(mcw.loadText("ET"))).toEqual(
            [ { d: 60, f: 400 }, { d: -180, f: 400 }, { d: 180, f: 400 } ]
        );
    });
    it("can change absolute frequency", function () {
        mcw.setWPM(20);
        mcw.setFWPM(20);
        mcw.setFrequency(400);
        expect(mcw.getNotes(mcw.loadText("E [f500]E"))).toEqual(
            [ { d: 60, f: 400 }, { d: -420, f: 500 }, { d: 60, f: 500 } ]
        );
        expect(mcw.getNotes(mcw.loadText("E [p500]E"))).toEqual(
            [ { d: 60, f: 400 }, { d: -420, f: 500 }, { d: 60, f: 500 } ]
        );
    });
    it("can change relative frequency", function () {
        mcw.setWPM(20);
        mcw.setFWPM(20);
        mcw.setFrequency(400);
        expect(mcw.getNotes(mcw.loadText("E [f+50]E [f-10]E"))).toEqual(
            [ { d: 60, f: 400 }, { d: -420, f: 450 }, { d: 60, f: 450 }, { d: -420, f: 390 }, { d: 60, f: 390 } ]
        );
        expect(mcw.getNotes(mcw.loadText("E [p+50]E [p-10]E"))).toEqual(
            [ { d: 60, f: 400 }, { d: -420, f: 450 }, { d: 60, f: 450 }, { d: -420, f: 390 }, { d: 60, f: 390 } ]
        );
    });
    it("can change absolute percentage frequency", function () {
        mcw.setWPM(20);
        mcw.setFWPM(20);
        mcw.setFrequency(400);
        expect(mcw.getNotes(mcw.loadText("E [f150%]E [f90%]E"))).toEqual(
            [ { d: 60, f: 400 }, { d: -420, f: 600 }, { d: 60, f: 600 }, { d: -420, f: 360 }, { d: 60, f: 360 } ]
        );
        expect(mcw.getNotes(mcw.loadText("E [p150%]E [p90%]E"))).toEqual(
            [ { d: 60, f: 400 }, { d: -420, f: 600 }, { d: 60, f: 600 }, { d: -420, f: 360 }, { d: 60, f: 360 } ]
        );
    });
    it("can change relative percentage frequency", function () {
        mcw.setWPM(20);
        mcw.setFWPM(20);
        mcw.setFrequency(400);
        expect(mcw.getNotes(mcw.loadText("E [f+50%]E [f-10%]E"))).toEqual(
            [ { d: 60, f: 400 }, { d: -420, f: 600 }, { d: 60, f: 600 }, { d: -420, f: 360 }, { d: 60, f: 360 } ]
        );
        expect(mcw.getNotes(mcw.loadText("E [p+50%]E [p-10%]E"))).toEqual(
            [ { d: 60, f: 400 }, { d: -420, f: 600 }, { d: 60, f: 600 }, { d: -420, f: 360 }, { d: 60, f: 360 } ]
        );
    });
    it("can reset frequency", function () {
        mcw.setWPM(20);
        mcw.setFWPM(20);
        mcw.setFrequency(400);
        expect(mcw.getNotes(mcw.loadText("E [f500]E [f]E"))).toEqual(
            [ { d: 60, f: 400 }, { d: -420, f: 500 }, { d: 60, f: 500 }, { d: -420, f: 400 }, { d: 60, f: 400 } ]
        );
        expect(mcw.getNotes(mcw.loadText("E [p500]E [p]E"))).toEqual(
            [ { d: 60, f: 400 }, { d: -420, f: 500 }, { d: 60, f: 500 }, { d: -420, f: 400 }, { d: 60, f: 400 } ]
        );
    });
});
