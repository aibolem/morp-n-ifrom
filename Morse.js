// This code is © Copyright Stephen C. Phillips, 2013-2016.
// Email: steve@scphillips.com

if(typeof(String.prototype.trim) === "undefined") {
  String.prototype.trim = function() {
    return String(this).replace(/^\s+|\s+$/g, '');
  };
}
// function log(message) {
//   if(typeof console == "object"){
//     console.log(message);
//   }
// }

function Morse() {
  this.DITS_PER_WORD = 50;  // based on "PARIS "
  this.text2morseH = {
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
  this.morse2textH = {};
  this.prosign2morseH = {
    '<AA>': '.-.-',
    '<AR>': '.-.-.',
    '<AS>': '.-...',
    '<BK>': '-...-.-',
    '<BT>': '-...-',  // also <TV>
    '<CL>': '-.-..-..',
    '<CT>': '-.-.-',
    '<DO>': '-..---',
    '<KN>': '-.--.',
    '<SK>': '...-.-',  // also <VA>
    '<VA>': '...-.-',
    '<SN>': '...-.',  // also <VE>
    '<VE>': '...-.',
    '<SOS>': '...---...'
  };
  this.morsepro2textH = {};
  this.text2morseproH = {};
  for (var text in this.text2morseH) {
    this.text2morseproH[text] = this.text2morseH[text];
    this.morse2textH[this.text2morseH[text]] = text;
    this.morsepro2textH[this.text2morseH[text]] = text;
  }
  for (var sign in this.prosign2morseH) {
    this.text2morseproH[sign] = this.prosign2morseH[sign];
    this.morsepro2textH[this.prosign2morseH[sign]] = sign;
  }
}

Morse.prototype = {

  constructor: Morse,

  tidyText: function(text) {
    text = text.toUpperCase();
    text = text.trim();
    text = text.replace(/\s+/g, ' ');
    return text;
  },

  text2morse: function(text, useProsigns) {
    if (typeof useProsigns === "undefined") { useProsigns = true; }

    text = this.tidyText(text);
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
        prosign = text.match(/^<...?>/);  // array of matches
        if (prosign) {
          token_length = prosign[0].length;
        }
      }
      tokens.push(text.slice(0, token_length));
      text = text.slice(token_length, text.length);
    }
    var dict;
    if (useProsigns) {
      dict = this.text2morseproH;
    } else {
      dict = this.text2morseH;
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
  },

  text2ditdah: function(text, useProsigns) {
    var morse = this.text2morse(text, useProsigns).morse;
    var ditdah = morse.replace(/ \/ /g, '#').replace(/\./g, 'dit ').replace(/\-/g, 'dah ').replace(/ /g, ', ').replace(/#/g, '. ');
    return ditdah;
  },

  tidyMorse: function(morse) {
    morse = morse.trim();
    morse = morse.replace(/\|/g, "/");  // unify the word separator
    morse = morse.replace(/\//g, " / ");  // make sure word separators are spaced out
    morse = morse.replace(/\s+/g, " ");  // squash multiple spaces into single spaces
    morse = morse.replace(/(\/ )+\//g, "/");  // squash multiple word separators
    //morse = morse.replace(/^ \/ /, "");  // remove initial word separators
    //morse = morse.replace(/ \/ $/, "");  // remove trailing word separators
    morse = morse.replace(/^\s+/, "");
    morse = morse.replace(/\s+$/, "");
    morse = morse.replace(/_/g, "-");  // unify the dash character
    return morse;
  },

  morse2text: function(morse, useProsigns) {
    if (typeof useProsigns === "undefined") { useProsigns = true; }

    morse = this.tidyMorse(morse);
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
      dict = this.morsepro2textH;
    } else {
      dict = this.morse2textH;
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
  },

  isMorse: function(input) {
    // perhaps should be called "looksLikeMorse"?!
    input = this.tidyMorse(input);
    if (input.match(/^[ /.-]*$/)) {
      return true;
    } else {
      return false;
    }
  },
};

module.exports = new Morse();
