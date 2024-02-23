import { CHAR_SPACE, WORD_SPACE } from '../constants.js'

export let dictionary = {
    id: 'international',

    letter: {
        '×': '- .t. -',  // as this is the same as "X" it needs to go before "X" to get the expected translation from -..-

        'A': '. -',
        'B': '- .t.t.',
        'C': '- . - .',
        'D': '- .t.',
        'E': '.',
        'F': '.t. - .',
        'G': '-h- .',
        'H': '.t.t.t.',
        'I': '.t.',
        'J': '. -h-h-',
        'K': '- . -',
        'L': '. - .t.',
        'M': '-h-',
        'N': '- .',
        'O': '-h-h-',
        'P': '. -h- .',
        'Q': '-h- . -',
        'R': '. - .',
        'S': '.t.t.',
        'T': '-',
        'U': '.t. -',
        'V': '.t.t. -',
        'W': '. -h-',
        'X': '- .t. -',
        'Y': '- . -h-',
        'Z': '-h- .t.',

        '1': '. -h-h-h-',
        '2': '.t. -h-h-',
        '3': '.t.t. -h-',
        '4': '.t.t.t. -',
        '5': '.t.t.t.t.',
        '6': '- .t.t.t.',
        '7': '-h- .t.t.',
        '8': '-h-h- .t.',
        '9': '-h-h-h- .',
        '0': '-h-h-h-h-',

        '.': '. - . - . -',
        ',': '-h- .t. -h-',
        ':': '-h-h- .t.t.',
        '?': '.t. -h- .t.',
        '\'': '. -h-h-h- .',
        '-': '- .t.t.t. -',
        '/': '- .t. - .',
        '(': '- . -h- .',
        ')': '- . -h- . -',
        '“': '. - .t. - .',  // U+201C
        '”': '. - .t. - .',  // U+201D
        '‘': '. - .t. - .',  // U+2018
        '’': '. - .t. - .',  // U+2019
        '"': '. - .t. - .',
        '@': '. -h- . - .',
        '=': '- .t.t. -',
        '&': '. - .t.t.',
        '+': '. - . - .',
        '!': '- . - . -h-',
    },

    /* '•' for a character space' and '■' for a word space are mandatory. The other symbols are dictionary dependent. */
    ratio: {
        '.': 1,
        '-': 3,
        ' ': -1,  // a space between dit and dah or dah and dit
        't': -1,  // a space between two dits
        'h': -1,  // a space between two dahs
        [CHAR_SPACE]: -3,
        [WORD_SPACE]: -7
    },

    baseElement: '.',

    frequency: {
        '.': 550,
        '-': 550,
        ' ': 0,
        't': 0,
        'h': 0,
        [CHAR_SPACE]: 0,
        [WORD_SPACE]: 0
    },

    display: {
        morse: {
            '.': '.',
            '-': '-',
            ' ': '',
            't': '',
            'h': ''
        },
        join: {
            [CHAR_SPACE]: ' ',
            [WORD_SPACE]: ' / '
        }
    },

    // Tidy the Morse input by the user to give e.g. ".. .-/--"
    tidyMorse: function(morse) {
        morse = morse.trim();
        morse = morse.replace(/_/g, '-')
        morse = morse.replace(/\s+/g, ' ');
        morse = morse.replace(/\s*\/[\s\/]*/g, '/');
        return morse;
    },

    // Put the spacial spaces into tidied Morse coming from the user
    processMorseSpaces: function(morse) {
        // replace "/" with WORD_SPACE
        morse = morse.replace(/\//g, WORD_SPACE);
        // replace " " with CHAR_SPACE
        morse = morse.replace(/ /g, CHAR_SPACE);
        // insert the 3 different intra-character spaces
        morse = morse.replace(/\.(?=\.)/g, ".t");
        morse = morse.replace(/\-(?=\-)/g, "-h");
        morse = morse.replace(/\.(?=\-)/g, ". ");
        morse = morse.replace(/\-(?=\.)/g, "- ");
        return morse;
    },

    morseMatch: /^\s*[\.\-_]+[\.\-_\s\/]*$/,

    displayName: {
        keys: ['.', '-', ' ', CHAR_SPACE, WORD_SPACE],
        values: ['Dit length', 'Dah length', 'Intra-character space', 'Inter-character space', 'Inter-word space']
    },

    options: {
        prosigns: {
            letter: {
                '<AA>': '. - . -',
                '<AR>': '. - . - .',
                '<AS>': '. - .t.t.',
                '<BK>': '- .t.t. - . -',
                '<BT>': '- .t.t. -', // also <TV>
                '<CL>': '- . - .t. - .t.',
                '<CT>': '- . - . -',
                '<DO>': '- .t. -h-h-',
                '<KA>': '- . - . -',
                '<KN>': '- . -h- .',
                '<SK>': '.t.t. - . -', // also <VA>
                '<SN>': '.t.t. - .', // also <VE>
                '<VA>': '.t.t. - . -',
                '<VE>': '.t.t. - .',
                '<SOS>': '.t.t. -h-h- .t.t.'
            },
            textGrammar: {
                textWords: '(prosign | textCharacter)+',
                prosign: '"<" textCharacter textCharacter textCharacter? ">"'
            },
            disallowed: "#x3c#x3e"  /* < and > are disallowed in normal text */
        },
        accents: {
            letter: {
                'À': '. -h- . -',
                'Å': '. -h- . -',
                'Ä': '. - . -',
                'Ą': '. - . -',
                'Æ': '. - . -',
                'Ć': '- . - .t.',
                'Ĉ': '- . - .t.',
                'Ç': '- . - .t.',
                'Đ': '.t. - .t.',
                'Ð': '.t. -h- .',
                'É': '.t. - .t.',
                'È': '. - .t. -',
                'Ę': '.t. - .t.',
                'Ĝ': '-h- . - .',
                'Ĥ': '-h-h-h-',
                'Ĵ': '. -h-h- .',
                'Ł': '. - .t. -',
                'Ń': '-h- . -h-',
                'Ñ': '-h- . -h-',
                'Ó': '-h-h- .',
                'Ö': '-h-h- .',
                'Ø': '-h-h- .',
                'Ś': '.t.t. - .t.t.',
                'Ŝ': '.t.t. - .',
                'Š': '-h-h-h-',
                'Þ': '. -h- .t.',
                'Ü': '.t. -h-',
                'Ŭ': '.t. -h-',
                'Ź': '-h- .t. - .',
                'Ż': '-h- .t. -'
            }
        }
    },

    morseGrammar: {
        morse: 'morseWords+',
        morseWords: '(morseCharacter | morseSpace+)+',
        morseCharacter: '[\\.\\-th ]+',  /* the space here is the intra-character space */
        morseSpace: `[\/\r\n\t${CHAR_SPACE}${WORD_SPACE}]`
    }
}
