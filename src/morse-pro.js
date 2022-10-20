/*!
This code is © Copyright Stephen C. Phillips, 2018-2022.
Email: steve@morsecode.world
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

const tags = {
    tag: 'volume | pitch | timing | pause',
    volume: 'volumeValue | volumeReset',
    volumeValue: '"[" [v] number "]"',
    volumeReset: '"[" [v] "]"',
    pitch: 'pitchValue | pitchReset',
    pitchValue: '"[" [pf] number "]"',
    pitchReset: '"[" [pf] "]"',
    timing: 'timingReset | timingValue | timingValueLong | timingEqual',
    timingReset: '"[" [t] "]"',
    timingValue: '"[" [t] number ("/" number)? "]"',
    timingValueLong: '"[" [t] number "," number "," number "," number "," number ("," number)? "]"',
    timingEqual: '"[" [t] "=]"',
    pause: 'pauseSpace | pauseValue',
    pauseSpace: '"[" space+ "]"',
    pauseValue: '"[" number "ms"? "]"',
    number: '[1-9] [0-9]*',
    space: '" "'  /* using this means pauseSpace has children which can then be counted */
};

//TODO: timingValueLong needs to be changed to explicitly specify timing for each element?
//TODO: need to add pitchValueLong to explicitly set pitch for each element (as you can in the dictionary)

const options = {
    tags: {
        morseGrammar: {
            morse: '(morseWords | tag)+',
            ...tags
        },
        textGrammar: {
            text: '(textWords | tag)+',
            ...tags
        },
        disallowed: "#x5b#x5d"  /* [ ] */
    }
};

const textGrammar = {
    text: 'textWords+',
    textWords: 'textCharacter+',
    textCharacter: `"${CHAR_SPACE}" | `  /* invalid characters added in grammar option processing */
};

export default class Morse {
    /**
     * The Morse class deals with translating and displaying strings and is configured with dictionaries and options.
     * It does not save any state of any messages.
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
        // Clear existing grammars:
        this.disallowed = "♥";  // need to disallow something!
        this.textGrammar = {...textGrammar};  // value defined at the top of this file
        this.morseGrammar = {};
        // Set up sensible default:
        this._addDictionary({
            letter: { '': '' },
        });
        // Load in all dictionaries:
        for (let d of this.dictionaries) {
            if (d in dictionaries) {
                let dict = dictionaries[d]  // switch to the imported dict
                this._addDictionary(dict);
                this.morseGrammar = { ...this.morseGrammar, ...dict.morseGrammar };
            } else {
                throw `No dictionary called '${d}'`;
            }
        }
        // Overlay any options:
        for (let optName of this.options) {
            let optDict;
            if (options[optName] !== undefined) {
                optDict = options[optName];
            } else if (this.dictionary.options[optName] !== undefined) {
                optDict = this.dictionary.options[optName];
            }
            if (optDict !== undefined) {
                this._addDictionary(optDict);
            } else {
                throw `No option '${optName}' in '${this.dictionary.id}'`;
            }
        }
        this.textGrammar.textCharacter += `[^${this.disallowed}]`;
        this.textParser = this._getParserFromDict(this.textGrammar);
        this.morseParser = this._getParserFromDict(this.morseGrammar);
    }

    /**
     * Create a grammar string from a dictionary.
     * Using W3C EBNF notation (https://www.w3.org/TR/REC-xml/#sec-notation)
     * @param {Object} dict - each key is a symbol in the grammar and the value is the symbol's expression
     * @returns {Parser}
     */
    _getParserFromDict(dict) {
        let grammar = "";
        for (let key in dict) {
            grammar += `${key} ::= ${dict[key]}\n`;
        }
        return new Grammars.W3C.Parser(grammar);
    }

    /**
     * Load in a dictionary.
     * @param {Object} dict
     */
    _addDictionary(dict) {
        this.dictionary = { ...this.dictionary, ...dict };  // overwrite any existing keys with the new dict
        if (dict.letter !== undefined) {
            let letters = dict.letter;
            for (let letter in letters) {
                // overwrite any existing letter keys
                this.text2morseD[letter] = letters[letter];
                this.morse2textD[letters[letter]] = letter;
            }
        }
        if (dict.disallowed !== undefined) {
            this.disallowed += dict.disallowed;
        }
        if (dict.textGrammar !== undefined) {
            this.textGrammar = { ...this.textGrammar, ...dict.textGrammar };
        }
        if (dict.morseGrammar !== undefined) {
            this.morseGrammar = { ...this.morseGrammar, ...dict.morseGrammar };
        }
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
     * @returns a String of the tokens. Returns "" if tokens is null.
     */
    display(tokens, morse, charSpace, wordSpace, map = {}, errorPrefix = '', errorSuffix = '') {
        if (tokens === null) return "";
        let display = [];
        let inputKey, displayKey, errorKey;
        errorKey = "translation";
        if (tokens.type === "morse") {
            inputKey = "morseWords";
            if (morse) {
                displayKey = "children";
            } else {
                displayKey = "translation";
            }
        } else {
            inputKey = "textWords";
            if (morse) {
                displayKey = "translation";
            } else {
                displayKey = "children";
            }
        }
        map[CHAR_SPACE] = charSpace;
        map[WORD_SPACE] = wordSpace;
        for (let child of tokens.children) {
            // we just pull out the morseWords or textWords, ignoring any tags
            if (child.type === inputKey) {
                display.push(child[displayKey].map((c, i) => {
                    if (c === undefined) c = "";
                    for (let k in map) {
                        c = c.replaceAll(k, map[k]);
                    }
                    return child[errorKey][i] !== undefined ? c : errorPrefix + c + errorSuffix
                }));
            } else if (child.type.substring(0,3) == "tag") {
                display.push(child.tag);
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
        // make all space characters actual spaces
        text = text.replace(/\s/g, ' ');
        // remove whitespace from start and end
        text = text.trim();
        // insert CHAR_SPACE between two normal characters (normal meaning not "<[] " and not ">[] ")
        text = text.replace(/([^<\[\] ])(?=[^>\[\] ])/g, "$1" + CHAR_SPACE);

        // TODO: this really needs moving into dictionary instead of relying on an option being called "tags"
        if (this.options.includes("tags")) {
            // move spaces after tags, e.g. "a [v100]b" => "a[v100] b"
            text = text.replace(/( +)(\[[^\]]+\])/g, "$2$1");
            // insert CHAR_SPACE between characters when there's a tag in the way, e.g. "a[v100]b" => "a[v100]•b"
            text = text.replace(/([^\[\] ])(\[[^\]]+\])([^\[\] ])/g, "$1$2" + CHAR_SPACE + "$3");
            // remove CHAR_SPACE from inside tags (added above)
            let removeCharSpaces = new RegExp(`(.*\\[[^\\]]*)${CHAR_SPACE}([^\\]]*\\])`, "g");
            while (text.match(removeCharSpaces)) {
                text = text.replace(removeCharSpaces, "$1$2");
            }
            // remove character spaces after an explicit pause ("[  ]", "[99]" or "[99ms]")
            let removeSpacesAfterPause = new RegExp(` \\]${CHAR_SPACE}+`, "g");
            text = text.replace(removeSpacesAfterPause, " ]");
            removeSpacesAfterPause = new RegExp(`(\\[\\d+(ms)?\\])${CHAR_SPACE}+`, "g");
            text = text.replace(removeSpacesAfterPause, "$1");
            // replace spaces from a pause tag with explicit word spaces
            text = text.replace(/(\[ +\])/g, (match, group1) => group1.replace(/ /g, "▢"));
        }

        // TODO: this really needs moving into dictionary instead of relying on an option being called "prosigns"
        if (this.options.includes("prosigns")) {
            // remove CHAR_SPACE from inside prosigns (added above)
            let removeSpaceInProsign = new RegExp(`(<.)${CHAR_SPACE}(.>)`, "g");
            text = text.replace(removeSpaceInProsign, "$1$2");
            removeSpaceInProsign = new RegExp(`(<.)${CHAR_SPACE}(.)${CHAR_SPACE}(.>)`, "g");
            text = text.replace(removeSpaceInProsign, "$1$2$3");
        }

        // replace consecutive ' ' with WORD_SPACE
        text = text.replace(/ +/g, WORD_SPACE);
        text = text.replace(/▢/g, " ");
        return text;
    }

    /**
     * Tidies and then tokenises text
     * @param {String} text - the text to tokenise
     * @returns - the tidied, tokenised text (null if cannot be parsed)
     */
    tokeniseText(text) {
        return this.getAST(this.textParser, this.processTextSpaces(text));
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
     * @param {String} text - text using the extended format (containing tags)
     * @returns {Object} - tokens object
     */
    loadText(text) {
        let tokens = this.tokeniseText(text);
        if (tokens === null) return null;
        this._input2output(tokens);
        return tokens;
    }

    tidyMorse(morse) {
        return this.dictionary.tidyMorse(morse);
    }

    processMorseSpaces(morse) {
        return this.dictionary.processMorseSpaces(morse);
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

    loadMorse(morse) {
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
    loadTextClean(text) {
        let tokens = this.loadText(text);
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
            while (ast.children.length == 1 && (ast.type == "message" || ast.type == "tag" || ast.type == "volume" || ast.type == "pitch" || ast.type == "timing" || ast.type == "pause")) {
                ast = ast.children[0];
                tree.type += "-" + ast.type;
                tree.tag = ast.text;
            }
            // for these elements, make a list of the text of all the children (the values we are actually interested in)
            if (ast.type == "textWords" || ast.type == "morseWords" || ast.type.match("Value") || ast.type.match("Space")) {
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
