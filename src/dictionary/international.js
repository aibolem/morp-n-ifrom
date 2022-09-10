const CHAR_SPACE = '•';  // \u2022
const WORD_SPACE = '■';  // \u25a0

export let dictionary = {
    id: 'international',

    letter: {
        '×': '- . . -',  // as this is the same as "X" it needs to go before "X" to get the expected translation from -..-

        'A': '. -',
        'B': '- . . .',
        'C': '- . - .',
        'D': '- . .',
        'E': '.',
        'F': '. . - .',
        'G': '- - .',
        'H': '. . . .',
        'I': '. .',
        'J': '. - - -',
        'K': '- . -',
        'L': '. - . .',
        'M': '- -',
        'N': '- .',
        'O': '- - -',
        'P': '. - - .',
        'Q': '- - . -',
        'R': '. - .',
        'S': '. . .',
        'T': '-',
        'U': '. . -',
        'V': '. . . -',
        'W': '. - -',
        'X': '- . . -',
        'Y': '- . - -',
        'Z': '- - . .',

        '1': '. - - - -',
        '2': '. . - - -',
        '3': '. . . - -',
        '4': '. . . . -',
        '5': '. . . . .',
        '6': '- . . . .',
        '7': '- - . . .',
        '8': '- - - . .',
        '9': '- - - - .',
        '0': '- - - - -',

        '.': '. - . - . -',
        ',': '- - . . - -',
        ':': '- - - . . .',
        '?': '. . - - . .',
        '\'': '. - - - - .',
        '-': '- . . . . -',
        '/': '- . . - .',
        '(': '- . - - .',
        ')': '- . - - . -',
        '“': '. - . . - .',  // U+201C
        '”': '. - . . - .',  // U+201D
        '‘': '. - . . - .',  // U+2018
        '’': '. - . . - .',  // U+2019
        '"': '. - . . - .',
        '@': '. - - . - .',
        '=': '- . . . -',
        '&': '. - . . .',
        '+': '. - . - .',
        '!': '- . - . - -',
    },

    letterMatch: /^./,

    /* 'charSpace' and 'wordSpace' are mandatory. The other symbols are dictionary dependent. */
    ratio: {
        '.': 1,
        '-': 3,
        ' ': -1,
        '•': -3,
        '■': -7
    },

    baseElement: '.',

    frequency: {
        '.': 550,
        '-': 550,
        ' ': 0,
        '•': 0,
        '■': 0
    },

    display: {
        morse: {
            '\\.': '.',
            '\\-': '-',
            ' ': ''
        },
        join: {
            '•': ' ',
            '■': ' / '
        }
    },

    tidyMorse: function(morse) {
        // Tidy the Morse => ".. .- / --"
        morse = morse.trim();
        morse = morse.replace(/_/g, '-')
        morse = morse.replace(/\|/g, '/');    //TODO: take out pipe?
        morse = morse.replace(/\s+/g, ' ');
        morse = morse.replace(/\s*\/[\s\/]*/g, '/');
        return morse;
    },

    //TODO: take out pipe?
    morseMatch: new RegExp('^\\s*[\\.\\-_]+[\\.\\-_\\s\\/\\|]*$'),

    displayName: {
        keys: ['.', '-', ' ', CHAR_SPACE, WORD_SPACE],
        values: ['Dit length', 'Dah length', 'Intra-character space', 'Inter-character space', 'Inter-word space']
    },

    options: {
        prosigns: {
            letter: {
                '<AA>': '. - . -',
                '<AR>': '. - . - .',
                '<AS>': '. - . . .',
                '<BK>': '- . . . - . -',
                '<BT>': '- . . . -', // also <TV>
                '<CL>': '- . - . . - . .',
                '<CT>': '- . - . -',
                '<DO>': '- . . - - -',
                '<KA>': '- . - . -',
                '<KN>': '- . - - .',
                '<SK>': '. . . - . -', // also <VA>
                '<SN>': '. . . - .', // also <VE>
                '<VA>': '. . . - . -',
                '<VE>': '. . . - .',
                '<SOS>': '. . . - - - . . .'
            },
            letterMatch: /^<...?>|./
        },
        accents: {
            letter: {
                'À': '. - - . -',
                'Å': '. - - . -',
                'Ä': '. - . -',
                'Ą': '. - . -',
                'Æ': '. - . -',
                'Ć': '- . - . .',
                'Ĉ': '- . - . .',
                'Ç': '- . - . .',
                'Đ': '. . - . .',
                'Ð': '. . - - .',
                'É': '. . - . .',
                'È': '. - . . -',
                'Ę': '. . - . .',
                'Ĝ': '- - . - .',
                'Ĥ': '- - - -',
                'Ĵ': '. - - - .',
                'Ł': '. - . . -',
                'Ń': '- - . - -',
                'Ñ': '- - . - -',
                'Ó': '- - - .',
                'Ö': '- - - .',
                'Ø': '- - - .',
                'Ś': '. . . - . . .',
                'Ŝ': '. . . - .',
                'Š': '- - - -',
                'Þ': '. - - . .',
                'Ü': '. . - -',
                'Ŭ': '. . - -',
                'Ź': '- - . . - .',
                'Ż': '- - . . -'
            }
        }
    },

    grammar: `morse ::= (morseWords | directive)+
morseWords ::= (morseCharacter | morseSpace+)+
morseCharacter ::= [\\.\\-_ ]+
morseSpace ::= [\/\r\n\t${CHAR_SPACE}${WORD_SPACE}]
`
}
