import { Grammars } from 'ebnf';

const CHAR_SPACE = '•';  // \u2022
const WORD_SPACE = '■';  // \u25a0

let grammar = `
message ::= text | morse
text ::= (textWords | directive)+
morse ::= (morseWords | directive)+
morseWords ::= (morseCharacter | morseSpace+)+
textWords ::= textCharacter+
directive ::= volume | pitch | timing | pause
volume ::= volumeValue | volumeReset
volumeValue ::= "[" [vV] number "]"
volumeReset ::= "[" [vV] "]"
pitch ::= pitchValue | pitchReset
pitchValue ::= "[" [pPfF] number "]"
pitchReset ::= "[" [pPfF] "]"
timing ::= timingReset | timingValue | timingValueLong
timingReset ::= "[" [tT] "]"
timingValue ::= "[" [tT] number "/" number "]"
timingValueLong ::= "[" [tT] number "," number "," number "," number "," number ("," number)? "]"
pause ::= pauseSpace | pauseValue
pauseSpace ::= "[" " "+ "]"
pauseValue ::= "[" number "ms"? "]"
morseCharacter ::= [\\.\\-_ ]+
textCharacter ::= [^#x5b#x5d#x7c#x2022] | "${CHAR_SPACE}" /* anything other than [|] (other invalid characters to be found later) */
number ::= [1-9] [0-9]*
morseSpace ::= [\/\r\n\t${CHAR_SPACE}${WORD_SPACE}]
`;

//TODO: timingValueLong needs to be changed to explicitly specify timing for each element
//TODO: need to add pitchValueLong to explicitly set pitch for each element (as you can in the dictionary)

const morseParser = new Grammars.W3C.Parser(grammar);

function summariseAST(ast) {
    if (ast === null) {
        return null;
    } else {
        let tree = {
            type: ast.type,
            // text: ast.text,
        };
        if (ast.errors.length > 0) {
            // console.log(ast.errors);
            return null;  // we don't care what the error is, just need to flag that there is one
        }
        // for these elements, just concatenate the single child to simplify
        while (ast.children.length == 1 && (ast.type == "message" || ast.type == "directive" || ast.type == "volume" || ast.type == "pitch" || ast.type == "timing" || ast.type == "pause")) {
            ast = ast.children[0];
            tree.type += "-" + ast.type;
        }
        // for these elements, make a list of the text of all the children (the values we are actually interested in)
        if (ast.type == "textWords" || ast.type == "morseWords" || ast.type.match("Value")) {
            tree.children = [];
            for (let child of ast.children) {
                tree.children.push(child.text);
            }
        // otherwise just recurse down the tree
        } else if (ast.children.length >= 1) {
            tree.children = [];
            for (let child of ast.children) {
                tree.children.push(summariseAST(child));
            }
        }
        return tree;
    }
}

function getAST(input) {
    let ast = morseParser.getAST(input);
    let summary = summariseAST(ast);
    return summary;
}

export {getAST, CHAR_SPACE, WORD_SPACE};

// let g2 = `
// message ::= (text | morse)
// text ::= ("B" | "Z")+
// morse ::= ("A" | "Z")+
// `
// const g2parser = new Grammars.W3C.Parser(g2);
// console.log(g2parser.getAST("AZ"));
// console.log(g2parser.getAST("BZ"));
// console.log(g2parser.getAST("ZA"));
// console.log(g2parser.getAST("ZB"));
