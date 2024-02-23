import { CHAR_SPACE, WORD_SPACE } from '../constants.js'

const LONG_DASH = '\u2e3a'
const VERY_LONG_DASH = '\u2e3b'

export let dictionary = {
    id: 'american',

    letter: {
        'A': '. -',
        'B': '- . . .',
        'C': '. .s.',
        'D': '- . .',
        'E': '.',
        'F': '. - .',
        'G': '- - .',
        'H': '. . . .',
        'I': '. .',
        'J': '- . - .',
        'K': '- . -',
        'L': '\u2e3a',
        'M': '- -',
        'N': '- .',
        'O': '.s.',
        'P': '. . . . .',
        'Q': '. . - .',
        'R': '.s. .',
        'S': '. . .',
        'T': '-',
        'U': '. . -',
        'V': '. . . -',
        'W': '. - -',
        'X': '. - . .',
        'Y': '. .s. .',
        'Z': '. . .s.',
        '1': '. - - .',
        '2': '. . - . .',
        '3': '. . . - .',
        '4': '. . . . -',
        '5': '- - -',
        '6': '. . . . . .',
        '7': '- - . .',
        '8': '- . . . .',
        '9': '- . . -',
        '0': '\u2e3b',
        '.': '. . - - . .',
        ',': '. - . -',
        ':': '- . -s.s.',
        '?': '- . . - .',
        '\'': '. . - .s. - . .',
        '-': '. . .s. - . .',
        '/': '. . -s-',
        '(': '. . . . .s- .',
        ')': '. . . . .s. .s. .',
        '"': '. . - .s- .', // fall back to using open quotes for straight
        '\u201c': '. . - .s- .', // open quotes
        '\u201d': '. . - .s- . - .', // close quotes
        '&': '.s. . .',
        '!': '- - - .',
        ';': '. . .s. .',
    },

    ratio: {
        '.': 1,
        '-': 2,
        '\u2e3a': 4,
        '\u2e3b': 5,
        ' ': -1,
        's': -1.5,
        [CHAR_SPACE]: -2,
        [WORD_SPACE]: -3
    },

    baseElement: '.',

    frequency: {
        '.': 550,
        '-': 550,
        '\u2e3a': 550,
        '\u2e3b': 550,
        ' ': 0,
        's': 0,
        [CHAR_SPACE]: 0,
        [WORD_SPACE]: 0
    },

    display: {
        morse: {
            '.': '.',
            '-': '-', // just a normal hyphen
            '\u2e3a': LONG_DASH, // two-em dash
            '\u2e3b': VERY_LONG_DASH, // three-em dash
            ' ': '',
            's': ' '
        },
        join: {
            [CHAR_SPACE]: '   ',
            [WORD_SPACE]: ' / '
        }
    },

    tidyMorse: function(morse) {
        morse = morse.trim();
        morse = morse.replace(/_/g, '-')
        morse = morse.replace(/[\r\n\t]+/g, '/');
        morse = morse.replace(/   +/g, '   ');
        morse = morse.replace(/([\.\-\u2e3a\u2e3b]  )([^ ])/g, '$1 $2');
        morse = morse.replace(/ *\/[ \/]*/g, '/');
        return morse;
    },

    processMorseSpaces: function(morse) {
        // replace "/" with WORD_SPACE
        morse = morse.replace(/\//g, WORD_SPACE);
        // replace "   " with CHAR_SPACE
        morse = morse.replace(/   /g, CHAR_SPACE);
        // insert " " between character elements using zero-width lookahead assertion
        let insertSpaces = new RegExp(`([^${CHAR_SPACE}${WORD_SPACE}])(?=[^${CHAR_SPACE}${WORD_SPACE}])`, "g");
        morse = morse.replace(insertSpaces, "$1 ");
        // a space that's part of a char will now be "   ". Replace "   " with "s"
        morse = morse.replace(/   /g, "s");
        // remove " " from inside tags (added above)
        // TODO: really this should only happen if tags are enabled
        let removeCharSpaces = /(.*\[[^\]]*) ([^\]]*\])/;
        while (morse.match(removeCharSpaces)) {
            morse = morse.replace(removeCharSpaces, "$1");
        }
        return morse;
    },

    // morseMatch: new RegExp('^\\s*[\\.\\-_\u2e3a\u2e3b]+[\\.\\-_\u2e3a\u2e3b\\s\\/\\|]*$'),
    //TODO: used LONG_DASH etc
    morseMatch: /^\s*[\.\-_\u2e3a\u2e3b]+[\.\-_\u2e3a\u2e3b\s\/]*$/,

    displayName: {
        keys: ['.', '-', '\u2e3a', '\u2e3b', ' ', 's', CHAR_SPACE, WORD_SPACE],
        values: ['dit','dah','long dash','very long dash','short space','long space','inter-character space','word space']
    },

    options: {
    },

    morseGrammar: {
        morse: 'morseWords+',
        morseWords: '(morseCharacter | morseSpace+)+',
        morseCharacter: `[s\\.\\-${LONG_DASH}${VERY_LONG_DASH} ]+`,  /* the space here is the intra-character space */
        morseSpace: `[\/\r\n\t${CHAR_SPACE}${WORD_SPACE}]`
    }
}
