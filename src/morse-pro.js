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

import { dictionaries } from "./dictionary/index.js";

export default class Morse {
    /**
     * 
     * @param {Object} params - dictionary of optional parameters.
     * @param {String} [params.dictionary='international'] - which dictionary to use, e.g. 'international' or 'american'.
     * @param {String[]} [params.dictionaryOptions=[]] - optional additional dictionaries such as 'prosigns'.
     */
    constructor({dictionary='international', dictionaryOptions=[]} = {}) {
        if (dictionary in dictionaries) {
            this.dictionary = dictionaries[dictionary];
        } else {
            throw "No dictionary called '" + dictionary + "'";
        }

        //TODO: need to keep an ordered list of dicts so we can rebuild when one is removed and they can override each other
        this.text2morseD = {};
        this.morse2textD = {};
        this.addDict({letter:{'':''}});
        this.addDict(this.dictionary);
        this.letterMatch = this.dictionary.letterMatch;
        for (let i = 0; i < dictionaryOptions.length; i++) {
            this.addOption(dictionaryOptions[i]);
        }
    }

    /**
     * Add an additional dictionary to the one being used for translation.
     * Dictionary needs 'letter' and (optional) 'letterMatch' keys.
     * @param {Object} dict 
     */
    addDict(dict) {
        let letters = dict.letter
        for (let letter in letters) {
            this.text2morseD[letter] = letters[letter];
            this.morse2textD[letters[letter]] = letter;
        }
        if (dict.letterMatch) {
            // TODO: here we switch to a special letter match regexp if it exists. This is not really going to work if there is more than one option
            this.letterMatch = dict.letterMatch;
        }
    }

    addOption(optName) {
        if (this.dictionary.options[optName] !== undefined) {
            this.addDict(this.dictionary.options[optName])
        } else {
            throw "No option '" + optName + "' in '" + this.dictionary.id + "'";
        }
        
    }

    //TODO: sort this out. removeDict doesn't work the same as addDict and cannot remove the base dict

    /**
     * Remove an additional dictionary to the one being used for translation.
     * Either takes a named dictionary to be found as a key in this.dictionary.options or an actual dictionary with letter and letterMatch keys.
     * @param {String or Map} dict 
     */
    removeDict(dict) {
        if (typeof dict === 'string') {
            dict = this.dictionary.options[dict];
        }
        let letters = dict.letter;
        for (let letter in letters) {
            delete this.text2morseD[letter];
            delete this.morse2textD[letters[letter]];
        }
        this.letterMatch = this.dictionary.letterMatch;  // revert to base letterMatch regexp
    }

    removeOption(optName) {
        this.removeDict(this.dictionary.options[optName])
    }

    /**
     * General method for converting a set of tokens to a displayable string
     * @param {Array} tokens - list of lists of tokens to form into String
     * @param {String} charSpace - String to use to separate characters
     * @param {String} wordSpace - String to use to separate words
     * @param {Map} map - Map to replace tokens with alternatives, e.g. for display escaping {'>', '&gt;'}
     * @param {Array} errors - list if lists of Booleans indicating if there is an error in the tokens parameter
     * @param {String} errorPrefix - used to prefix any token that is an error
     * @param {String} errorSuffix - used to suffix any token that is an error
     * @returns a String of the tokens
     */
    display(tokens, charSpace, wordSpace, map={}, errors=undefined, errorPrefix='', errorSuffix='') {
        for (let k in map) {
            tokens = tokens.map(word => word.map(char => char.replace(new RegExp(k, 'g'), map[k])));
        }
        if (errors !== undefined) {
            for (let i = 0; i < tokens.length; i++) {
                for (let j = 0; j < tokens[i].length; j++) {
                    if (errors[i][j]) {
                        tokens[i][j] = errorPrefix + tokens[i][j] + errorSuffix;
                    }
                }
            }    
        }
        let words = tokens.map(word => word.join(charSpace));
        let sentence = words.join(wordSpace);
        return sentence;
    }

    /**
     * Tidies text (upper case, trim, squash multiple spaces)
     * @param {String} text - the text to tidy
     * @returns the tidied text
     */
    tidyText(text) {
        text = text.toUpperCase();
        text = text.trim();
        text = text.replace(/\s+/g, ' ');
        return text;
    }

    /**
     * Splits text into words and letters
     * @param {String} text - the text to tokenise
     * @returns a list of lists, e.g. [['o', 'n', 'e'], ['t', 'w', 'o']]
     */
    tokeniseRawText(text) {
        let tokens = []
        let words = text.split(' ');
        for (let word of words) {
            let letters = [];
            while (word.length) {
                let letter = word.match(this.letterMatch)[0];
                word = word.substr(letter.length);
                letters.push(letter);
            }
            tokens.push(letters);
        }
        return tokens;
    }

    /**
     * Tidies and then tokenises text
     * @param {String} text - the text to tokenise
     * @returns - the tidied, tokenised text
     */
    tokeniseText(text) {
        return this.tokeniseRawText(this.tidyText(text));
    }

    /**
     * Convert from text tokens to displayable String
     * @param {Array} textTokens - list of lists representing the words and characters
     * @param {Map} escapeMap - Map to replace tokens with alternatives, e.g. for display escaping {'>', '&gt;'}
     * @returns a String, joining the characters together, separating the words with a space
     */
    displayText(textTokens, escapeMap) {
        return this.display(textTokens, '', ' ', escapeMap)
    }

    displayTextErrors(textTokens, escapeMap, errorTokens, prefix, suffix) {
        return this.display(textTokens, '', ' ', escapeMap, errorTokens, prefix, suffix);
    }

    /**
     * 
     * @param {Array} textTokens - list of lists of text tokens
     * @returns Map - text: text tokens, morse: morse tokens, error: error tokens, hasError Boolean
     */
    textTokens2morse(textTokens) {
        let translation = this._input2output(textTokens, this.text2morseD);
        return {
            text: textTokens,
            morse: translation.output,
            error: translation.error,
            hasError: translation.hasError
        }
    }

    text2morse(text) {
        let textTokens = this.tokeniseText(text);
        return this.textTokens2morse(textTokens);
    }

    tokeniseMorse(morse) {
        return this.dictionary.tokeniseMorse(morse);
    }

    displayMorse(morseTokens) {
        return this.display(morseTokens, 
            this.dictionary.display.join.charSpace, this.dictionary.display.join.wordSpace, this.dictionary.display.morse);
    }

    displayMorseErrors(morseTokens, errorTokens, prefix, suffix) {
        return this.display(morseTokens, 
            this.dictionary.display.join.charSpace, this.dictionary.display.join.wordSpace, this.dictionary.display.morse, 
            errorTokens, prefix, suffix);
    }

    morseTokens2text(morseTokens) {
        let translation = this._input2output(morseTokens, this.morse2textD);
        return {
            morse: morseTokens,
            text: translation.output,
            error: translation.error,
            hasError: translation.hasError
        }
    }

    morse2text(morse) {
        let morseTokens = this.tokeniseMorse(morse);
        return this.morseTokens2text(morseTokens);
    }

    looksLikeMorse(input) {
        return input.match(this.dictionary.morseMatch) !== null;
    }

    _input2output(tokens, dict) {
        let ret = {
            output: [],
            error: [],
            hasError: false
        }
        for (let letters of tokens) {
            let chars = [];
            let errors = [];
            for (let letter of letters) {
                let char = '';
                let error = true;
                if (letter in dict) {
                    char = dict[letter];
                    error = false;
                }
                chars.push(char);
                errors.push(error);
                ret.hasError = ret.hasError || error;
            }
            ret.output.push(chars);
            ret.error.push(errors);
        }
        return ret;
    }
}

