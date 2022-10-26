import Morse from "../src/morse-pro.js";

describe("Morse({ dictionaryOptions: ['tags', 'prosigns']}) with text", function () {
    let m = new Morse({ dictionaryOptions: ['tags', 'prosigns'] });
    it("has a grammar", function () {
        let grammar = "";
        for (let key in m.textGrammar) {
            grammar += `${key} ::= ${m.textGrammar[key]}\n`;
        }
        expect(grammar).toBe(`text ::= (textWords | tag)+
textWords ::= (prosign | textCharacter)+
textCharacter ::= "•" | [^♥#x5b#x5d#x3c#x3e]
tag ::= volume | pitch | timing | pause
volume ::= volumeValue | volumeReset
volumeValue ::= "[" [v] number "]"
volumeReset ::= "[" [v] "]"
pitch ::= pitchValue | pitchReset
pitchValue ::= "[" [pf] number "]"
pitchReset ::= "[" [pf] "]"
timing ::= timingReset | timingValue | timingEqual
timingReset ::= "[" [t] "]"
timingValue ::= "[" [t] numberOrPercentage ("/" numberOrPercentage)? "]"
timingEqual ::= "[" [t] "=]"
pause ::= pauseSpace | pauseValue
pauseSpace ::= "[" space+ "]"
pauseValue ::= "[" number "ms"? "]"
numberOrPercentage ::= percentage | number
number ::= [+-]? [0-9]+ ("." [0-9]+)?
percentage ::= number "%"
space ::= " "
prosign ::= "<" textCharacter textCharacter textCharacter? ">"
`);
    });
});
