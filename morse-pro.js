// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

if (typeof(String.prototype.trim) === "undefined") {
    String.prototype.trim = function() {
        return String(this).replace(/^\s+|\s+$/g, '');
    };
}

var text2morseH = {
    'A': ".-",
    'B': "-...",
    'C': "-.-.",
    'D': "-..",
    'E': ".",
    'F': "..-.",
    'G': "--.",
    'H': "....",
    'I': "..",
    'J': ".---",
    'K': "-.-",
    'L': ".-..",
    'M': "--",
    'N': "-.",
    'O': "---",
    'P': ".--.",
    'Q': "--.-",
    'R': ".-.",
    'S': "...",
    'T': "-",
    'U': "..-",
    'V': "...-",
    'W': ".--",
    'X': "-..-",
    'Y': "-.--",
    'Z': "--..",
    '1': ".----",
    '2': "..---",
    '3': "...--",
    '4': "....-",
    '5': ".....",
    '6': "-....",
    '7': "--...",
    '8': "---..",
    '9': "----.",
    '0': "-----",
    '.': ".-.-.-",
    ',': "--..--",
    ':': "---...",
    '?': "..--..",
    '\'': ".----.",
    '-': "-....-",
    '/': "-..-.",
    '(': "-.--.-",
    ')': "-.--.-",
    '"': ".-..-.",
    '@': ".--.-.",
    '=': "-...-",
    ' ': "/" //Not morse but helps translation
};
var morse2textH = {};
var prosign2morseH = {
    '<AA>': '.-.-',
    '<AR>': '.-.-.',
    '<AS>': '.-...',
    '<BK>': '-...-.-',
    '<BT>': '-...-', // also <TV>
    '<CL>': '-.-..-..',
    '<CT>': '-.-.-',
    '<DO>': '-..---',
    '<KN>': '-.--.',
    '<SK>': '...-.-', // also <VA>
    '<VA>': '...-.-',
    '<SN>': '...-.', // also <VE>
    '<VE>': '...-.',
    '<SOS>': '...---...'
};
var morsepro2textH = {};
var text2morseproH = {};
for (var text in text2morseH) {
    text2morseproH[text] = text2morseH[text];
    morse2textH[text2morseH[text]] = text;
    morsepro2textH[text2morseH[text]] = text;
}
for (var sign in prosign2morseH) {
    text2morseproH[sign] = prosign2morseH[sign];
    morsepro2textH[prosign2morseH[sign]] = sign;
}

var tidyText = function(text) {
    text = text.toUpperCase();
    text = text.trim();
    text = text.replace(/\s+/g, ' ');
    return text;
};

export function text2morse(text, useProsigns) {
    if (typeof useProsigns === "undefined") {
        useProsigns = true;
    }

    text = tidyText(text);
    var ret = {
        morse: "",
        message: "",
        hasError: false
    };
    if (text === "") {
        return ret;
    }

    var tokens = [];
    var prosign;
    var token_length;
    while (text.length > 0) {
        token_length = 1;
        if (useProsigns) {
            prosign = text.match(/^<...?>/); // array of matches
            if (prosign) {
                token_length = prosign[0].length;
            }
        }
        tokens.push(text.slice(0, token_length));
        text = text.slice(token_length, text.length);
    }
    var dict;
    if (useProsigns) {
        dict = text2morseproH;
    } else {
        dict = text2morseH;
    }
    var i, c, t;
    for (i = 0; i < tokens.length; i++) {
        t = tokens[i];
        c = dict[t];
        if (c === undefined) {
            ret.message += "#" + t + "#";
            ret.morse += "# ";
            ret.hasError = true;
        } else {
            ret.message += t;
            ret.morse += c + " ";
        }
    }
    ret.morse = ret.morse.slice(0, ret.morse.length - 1);
    return ret;
}

export function text2ditdah(text, useProsigns) {
    var ditdah = text2morse(text, useProsigns).morse; // get the dots and dashes
    ditdah = ditdah.replace(/ \/ /g, '#').replace(/ /g, '~'); // put in placeholders
    ditdah = ditdah.replace(/\./g, 'dit ').replace(/\-/g, 'dah '); // do the basic job
    ditdah = ditdah.replace(/ #/g, '. ').replace(/ ~/g, ', ').replace(/ $/, '.'); // do punctuation
    ditdah = ditdah.replace(/^d/, 'D').replace(/\. d/, '. D'); // do capitalisation
    return ditdah;
}

var tidyMorse = function(morse) {
    morse = morse.trim();
    morse = morse.replace(/\|/g, "/"); // unify the word separator
    morse = morse.replace(/\//g, " / "); // make sure word separators are spaced out
    morse = morse.replace(/\s+/g, " "); // squash multiple spaces into single spaces
    morse = morse.replace(/(\/ )+\//g, "/"); // squash multiple word separators
    //morse = morse.replace(/^ \/ /, "");  // remove initial word separators
    //morse = morse.replace(/ \/ $/, "");  // remove trailing word separators
    morse = morse.replace(/^\s+/, "");
    morse = morse.replace(/\s+$/, "");
    morse = morse.replace(/_/g, "-"); // unify the dash character
    return morse;
};

export function morse2text(morse, useProsigns) {
    if (typeof useProsigns === "undefined") {
        useProsigns = true;
    }

    morse = tidyMorse(morse);
    var ret = {
        morse: "",
        message: "",
        hasError: false
    };
    if (morse === "") {
        return ret;
    }

    var tokens = morse.split(" ");
    var dict;
    if (useProsigns) {
        dict = morsepro2textH;
    } else {
        dict = morse2textH;
    }
    var c, t;
    for (var i = 0; i < tokens.length; i++) {
        t = tokens[i];
        c = dict[t];
        if (c === undefined) {
            ret.morse += "#" + t + "# ";
            ret.message += "#";
            ret.hasError = true;
        } else {
            ret.morse += t + " ";
            ret.message += c;
        }
    }
    ret.morse = ret.morse.slice(0, ret.morse.length - 1);
    return ret;
}

export function looksLikeMorse(input) {
    input = tidyMorse(input);
    if (input.match(/^[ /.-]*$/)) {
        return true;
    } else {
        return false;
    }
}
