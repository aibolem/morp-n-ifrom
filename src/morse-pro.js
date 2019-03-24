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
    constructor({dictionary='international', useProsigns=true} = {}) {
        if (dictionary in dictionaries) {
            this.dictionary = dictionaries[dictionary];
        } else {
            throw "No dictionary called '" + dictionary + "'";
        }

        //TODO: need to keep an ordered list of dicts so we can rebuild when one is removed and they can override each other
        this.text2morseD = {};
        this.morse2textD = {};
        this.addDict({'':''});
        this.addDict(this.dictionary.letter);
        this.useProsigns = useProsigns;
    }

    addDict(dict) {
        for (let letter in dict) {
            this.text2morseD[letter] = dict[letter];
            this.morse2textD[dict[letter]] = letter;
        }
    }

    removeDict(dict) {
        for (let letter in dict) {
            delete this.text2morseD[letter];
            delete this.morse2textD[dict[letter]];
        }
    }

    get useProsigns() {
        return this._useProsigns;
    }

    set useProsigns(useProsigns) {
        this._useProsigns = useProsigns;
        if (useProsigns) {
            this.addDict(this.dictionary.options.prosigns);
            this.tokenMatch = new RegExp("^" + this.dictionary.prosign.start + "...?" + this.dictionary.prosign.end + "|.");
        } else {
            this.removeDict(this.dictionary.options.prosigns);
            this.tokenMatch = new RegExp("^.");
        }
    }

    tidyText(text) {
        text = text.toUpperCase();
        text = text.trim();
        text = text.replace(/\s+/g, ' ');
        return text;
    }

    tokeniseRawText(text) {
        let tokens = []
        let words = text.split(' ');
        for(let word of words) {
            let letters = [];
            while (word.length) {
                let letter = word.match(this.tokenMatch)[0];
                word = word.substr(letter.length);
                letters.push(letter);
            }
            tokens.push(letters);
        }
        return tokens;
    }

    tokeniseText(text) {
        return this.tokeniseRawText(this.tidyText(text));
    }

    displayText(textTokens) {
        let words = textTokens.map(word => word.join());
        return words.join(' ');
    }

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
        let words = [];
        for (let word of morseTokens) {
            let chars = []
            for (let char of word) {
                for (let k in this.dictionary.display.morse) {
                    char = char.replace(new RegExp(k, 'g'), this.dictionary.display.morse[k]);
                }
                chars.push(char);
            }
            words.push(chars.join(this.dictionary.display.join.charSpace));
        }
        return words.join(this.dictionary.display.join.wordSpace);
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
        return morseTokens2text(morseTokens);
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

