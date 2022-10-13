/*!
This code is © Copyright Stephen C. Phillips, 2018.
Email: steve@scphillips.com
*/
/*
Licensed under the EUPL, Version 1.2 or – as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at: https://joinup.ec.europa.eu/community/eupl/
Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the Licence for the specific language governing permissions and limitations under the Licence.
*/

/**
 * Basic methods to translate Morse code.
 */

import { Grammars } from 'ebnf';
import { dictionaries } from "./dictionary/index.js";

//TODO: define these once
const CHAR_SPACE = '•';  // \u2022
const WORD_SPACE = '■';  // \u25a0

const directiveGrammar = `
    directive ::= volume | pitch | timing | pause
    volume ::= volumeValue | volumeReset
    volumeValue ::= "[" [vV] number "]"
    volumeReset ::= "[" [vV] "]"
    pitch ::= pitchValue | pitchReset
    pitchValue ::= "[" [pPfF] number "]"
    pitchReset ::= "[" [pPfF] "]"
    timing ::= timingReset | timingValue | timingValueLong | timingEqual
    timingReset ::= "[" [tT] "]"
    timingValue ::= "[" [tT] number "/" number "]"
    timingValueLong ::= "[" [tT] number "," number "," number "," number "," number ("," number)? "]"
    timingEqual ::= "[" [tT] "=]"
    pause ::= pauseSpace | pauseValue
    pauseSpace ::= "[" " "+ "]"
    pauseValue ::= "[" number "ms"? "]"
    number ::= [1-9] [0-9]*
`;

//TODO: timingValueLong needs to be changed to explicitly specify timing for each element?
//TODO: need to add pitchValueLong to explicitly set pitch for each element (as you can in the dictionary)

const textGrammar = `
    text ::= (textWords | directive)+
    textWords ::= (prosign | textCharacter)+ 
    textCharacter ::= [^#x5b#x5d#x7c#x3c#x3e] | "${CHAR_SPACE}" /* anything other than [|] (other invalid characters to be found later) */
    prosign ::= "<" textCharacter textCharacter textCharacter? ">"
` + directiveGrammar;

const textParser = new Grammars.W3C.Parser(textGrammar);

export default class Morse {
    /**
     *
     * @param {Object} params - dictionary of optional parameters.
     * @param {String} [params.dictionary='international'] - which dictionary to use, e.g. 'international' or 'american'. Can optionally take a list of dictionary strings.
     * @param {String[]} [params.dictionaryOptions=[]] - optional additional dictionaries such as 'prosigns'. Will look these up in the merged dictionary formed of the list of dictionaries.
     */
    constructor({ dictionary = 'international', dictionaryOptions = [] } = {}) {
        if (typeof dictionary === 'string') {
            dictionary = [dictionary];
        }
        this.setDictionariesAndOptions(dictionary, dictionaryOptions);
    }

    setDictionariesAndOptions(dictList, optionList) {
        this.dictionaries = dictList;
        this.options = optionList;
        this._loadDictionaries();
    }

    /**
     * Set the list of dictionaries to use.
     * @param {List} dictList - list of dictionary names
     */
    setDictionaries(dictList) {
        this.dictionaries = dictList;
        this._loadDictionaries();
    }

    /**
     * Set the list of dictionary options to use.
     * @param {List} optionList - list of dictionary option names. Looked up in merged dictionary
     */
    setOptions(optionList) {
        this.options = optionList;
        this._loadDictionaries()
    }

    _loadDictionaries() {
        // Clear any existing mappings:
        this.text2morseD = {};
        this.morse2textD = {};
        // Set up sensible default:
        this._addDictionary({
            letter: { '': '' },
            letterMatch: /^./
        });
        // Load in all dictionaries:
        for (let d of this.dictionaries) {
            if (d in dictionaries) {
                let dict = dictionaries[d]  // switch to the imported dict
                this._addDictionary(dict);
            } else {
                throw `No dictionary called '${d}'`;
            }
        }
        // Overlay any options:
        for (let optName of this.options) {
            if (this.dictionary.options[optName] !== undefined) {
                this._addDictionary(this.dictionary.options[optName])
            } else {
                throw `No option '${optName}' in '${this.dictionary.id}'`;
            }
        }
    }

    /**
     * Load in a dictionary.
     * Dictionary needs 'letter' and (optional) 'letterMatch' keys.
     * @param {Object} dict
     */
    _addDictionary(dict) {
        this.dictionary = { ...this.dictionary, ...dict };  // overwrite any existing keys with the new dict

        let letters = dict.letter;
        for (let letter in letters) {
            // overwrite any existing letter keys
            this.text2morseD[letter] = letters[letter];
            this.morse2textD[letters[letter]] = letter;
        }

        let morseGrammar = (this.dictionary.grammar !== undefined ? this.dictionary.grammar : "") + directiveGrammar;
        this.morseParser = new Grammars.W3C.Parser(morseGrammar);
    }

    /**
     * General method for converting a list of tokens to a displayable string.
     * @param {Array} tokens - list of tokens to form into String
     * @param {Boolean} morse - whether to display the Morse (displays text if false)
     * @param {String} charSpace - String to use to separate characters
     * @param {String} wordSpace - String to use to separate words
     * @param {Map} map - Map to replace tokens with alternatives, e.g. for display escaping {'>', '&gt;'}
     * @param {String} errorPrefix - used to prefix any token that is an error
     * @param {String} errorSuffix - used to suffix any token that is an error
     * @returns a String of the tokens
     */
    display(tokens, morse, charSpace, wordSpace, map = {}, errorPrefix = '', errorSuffix = '') {
        if (tokens === null) return null;
        let display = [];
        let inputKey, displayKey, errorKey;
        if (tokens.type === "morse") {
            inputKey = "morseWords";
            if (morse) {
                displayKey = "children";
                errorKey = "translation";
            } else {
                displayKey = "translation";
                errorKey = "translation";
            }
        } else {
            inputKey = "textWords";
            if (morse) {
                displayKey = "translation";
                errorKey = "translation";
            } else {
                displayKey = "children";
                errorKey = "translation";
            }
        }
        map[CHAR_SPACE] = charSpace;
        map[WORD_SPACE] = wordSpace;
        for (let child of tokens.children) {
            // we just pull out the morseWords or textWords, ignoring any directives
            if (child.type === inputKey) {
                display.push(child[displayKey].map((c, i) => {
                    if (c === undefined) c = "";
                    for (let k in map) {
                        let mapRegExp = new RegExp(k, 'g');
                        c = c.replace(mapRegExp, map[k]);
                    }
                    return child[errorKey][i] !== undefined ? c : errorPrefix + c + errorSuffix
                }));
            }
        }
        display = display.flat();
        return display.join("");
    }

    /**
     * Process the whitespace in a text input
     * @param {String} text - the text
     * @returns the processed text
     */
    processTextSpaces(text) {
        // move spaces after directives, e.g. "a [v100]b" => "a[v100] b"
        text = text.replace(/(\s+)(\[[^\]]+\])/g, "$2$1");
        // remove whitespace from start and end
        text = text.trim();
        // make all space characters actual spaces
        text = text.replace(/\s/g, ' ');
        // insert CHAR_SPACE between two normal characters
        text = text.replace(/([^<\[\] ])(?=[^>\[\] ])/g, "$1" + CHAR_SPACE);
        // insert CHAR_SPACE between characters when there's a directive in the way, e.g. "a[v100]b" => "a[v100]•b"
        text = text.replace(/([^\[\] ])(\[[^\]]+\])([^\[\] ])/g, "$1$2" + CHAR_SPACE + "$3");
        // remove CHAR_SPACE from inside directives (added in previous step)
        let removeCharSpaces = new RegExp("(.*\\[[^\\]]*)" + CHAR_SPACE, "g");
        while (text.match(removeCharSpaces)) {
            text = text.replace(removeCharSpaces, "$1");
        }
        // remove CHAR_SPACE from inside prosigns (added above)
        let removeSpaceInProsign = new RegExp(`(<.)${CHAR_SPACE}(.>)`, "g");
        text = text.replace(removeSpaceInProsign, "$1$2");
        removeSpaceInProsign = new RegExp(`(<.)${CHAR_SPACE}(.)${CHAR_SPACE}(.>)`, "g");
        text = text.replace(removeSpaceInProsign, "$1$2$3");
        // remove character spaces after an explicit pause ("[  ]", "[99]" or "[99ms]")
        let removeSpacesAfterPause = new RegExp(` \\]${CHAR_SPACE}+`, "g");
        text = text.replace(removeSpacesAfterPause, " ]");
        removeSpacesAfterPause = new RegExp(`(\\[\\d+(ms)?\\])${CHAR_SPACE}+`, "g");
        text = text.replace(removeSpacesAfterPause, "$1");
        // replace spaces from a pause directive with explicit word spaces
        text = text.replace(/\[(\s+)\]/g, (match, group1) => group1.replace(/./g, WORD_SPACE));
        // replace consecutive ' ' with WORD_SPACE
        text = text.replace(/ +/g, WORD_SPACE);
        return text;
    }

    /**
     * Tidies and then tokenises text
     * @param {String} text - the text to tokenise
     * @returns - the tidied, tokenised text
     */
    tokeniseText(text) {
        return this.getAST(textParser, (this.processTextSpaces(text)));
    }

    /**
     * Convert from tokens to displayable String
     * @param {Array} tokens - list of lists representing the words and characters
     * @param {Map} escapeMap - Map to replace tokens with alternatives, e.g. for display escaping {'>', '&gt;'}
     * @returns a String, joining the characters together, separating the words with a space
     */
    displayText(tokens, escapeMap) {
        return this.display(tokens, false, '', ' ', escapeMap)
    }

    displayTextErrors(tokens, escapeMap, prefix, suffix) {
        return this.display(tokens, false, '', ' ', escapeMap, prefix, suffix);
    }

    /**
     * Convert from the extended text format to a message object.
     * @param {String} extendedText - text using the extended format (containing directives)
     * @returns {Object} - text: text tokens, morse: morse tokens, error: error tokens, hasError Boolean
     */
    text2morse(text) {
        let tokens = this.tokeniseText(text);
        if (tokens === null) return null;
        this._input2output(tokens);
        return tokens;
    }

    tidyMorse(morse) {
        return this.dictionary.tidyMorse(morse);
    }

    processMorseSpaces(morse) {
        // replace "/" with WORD_SPACE
        morse = morse.replace(/\//g, WORD_SPACE);
        // replace " " with CHAR_SPACE
        morse = morse.replace(/ /g, CHAR_SPACE);
        // insert " " between character elements using zero-width lookahead assertion
        let insertSpaces = new RegExp(`([^${CHAR_SPACE}${WORD_SPACE}])(?=[^${CHAR_SPACE}${WORD_SPACE}])`, "g");
        morse = morse.replace(insertSpaces, "$1 ");
        // remove " " from inside directives (added in previous step)
        let removeCharSpaces = /(.*\[[^\]]*) /;
        while (morse.match(removeCharSpaces)) {
            morse = morse.replace(removeCharSpaces, "$1");
        }
        return morse;
    }

    tokeniseMorse(morse) {
        return this.getAST(this.morseParser, this.processMorseSpaces(this.tidyMorse(morse)));
    }

    displayMorse(tokens) {
        return this.display(
            tokens, true,
            this.dictionary.display.join[CHAR_SPACE],
            this.dictionary.display.join[WORD_SPACE],
            this.dictionary.display.morse
        );
    }

    displayMorseErrors(tokens, prefix, suffix) {
        return this.display(
            tokens, true,
            this.dictionary.display.join[CHAR_SPACE],
            this.dictionary.display.join[WORD_SPACE],
            this.dictionary.display.morse,
            prefix, suffix
        );
    }

    morseTokens2text(tokens) {
        this._input2output(tokens);
        return tokens;
    }

    morse2text(morse) {
        let tokens = this.tokeniseMorse(morse);
        if (tokens === null) return null;
        this._input2output(tokens);
        return tokens;
    }

    looksLikeMorse(input) {
        return input.match(this.dictionary.morseMatch) !== null;
    }

    _input2output(tokens) {
        let toMorse = tokens.type == "text";
        let dict, inputWords;
        tokens.error = false;
        if (toMorse) {
            dict = this.text2morseD;
            inputWords = "textWords";
        } else {
            dict = this.morse2textD;
            inputWords = "morseWords";
        }
        for (let child of tokens.children) {
            if (child.type == inputWords) {
                child.translation = [];
                let letters = child.children;
                let output;
                for (let letter of letters) {
                    if (letter === CHAR_SPACE || letter === WORD_SPACE) {
                        output = letter;
                    } else {
                        if (letter in dict) {
                            output = dict[letter];
                        } else if (letter.toUpperCase() in dict) {
                            output = dict[letter.toUpperCase()];
                        } else {
                            output = undefined;
                            child.error = true;
                            tokens.error = true;
                        }
                    }
                    child.translation.push(output);
                }
            }
        }
        return !tokens.error;
    }

    /**
     * Convert from text to message object, silently removing any illegal characters
     * @param {String} text - text string to process
     * @returns {Object} - message tokens
     */
    text2morseClean(text) {
        let tokens = this.text2morse(text);
        tokens.error = false;
        for (let child of tokens.children) {
            if (child.error) {
                child.error = false;
                // remove the illegal characters in the input/translation based on the "undefined" in the translation
                child.children = child.children.filter((t, i) => child.translation[i] !== undefined);
                child.translation = child.translation.filter(t => t !== undefined);
                // remove consecutive CHAR_SPACE that may result from the previous step
                child.children = child.children.filter(
                    (t, i) => !(t === CHAR_SPACE && child.children[i - 1] === CHAR_SPACE)
                );
                child.translation = child.translation.filter(
                    (t, i) => !(t === CHAR_SPACE && child.translation[i - 1] === CHAR_SPACE)
                );
            }
        }
        return tokens;
    }

    summariseAST(ast) {
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
                    tree.children.push(this.summariseAST(child));
                }
            }
            return tree;
        }
    }
    
    getAST(parser, input) {
        let ast = parser.getAST(input);
        let summary = this.summariseAST(ast);
        return summary;
    }
}
