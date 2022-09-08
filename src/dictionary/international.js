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
        morse = morse.replace(/\|/g, '/');
        morse = morse.replace(/\s+/g, ' ');
        morse = morse.replace(/\s*\/[\s\/]*/g, '/');
        return morse;
        // // Make list of the words => [".. .-", "--"]
        // let words = morse.split('/');
        // // Make list of list of characters => [["..", ".-"], ["--"]]
        // let tokens = words.map(word => word.split(' '));
        // // Space out each character => [['. .', '. -'], ['- -']]
        // tokens = tokens.map(word => word.map(letter => letter.replace(/(.)(?=.)/g, '$1 ')));
        // let alternateInsert = function(items, newElement) {
        //     let inserts = items.length - 1;
        //     for (let i = 0; i < inserts; i++) {
        //         items.splice(i*2+1, 0, newElement);
        //     }
        //     return items;
        // }
        // // Insert "charSpace" between characters => [['. .', 'charSpace', '. -'], ['- -']]
        // tokens = tokens.map(word => alternateInsert(word, "charSpace"));
        // // Insert "wordSpace" between words => [['. .', 'charSpace', '. -'], 'wordSpace', ['- -']]
        // tokens = alternateInsert(tokens, "wordSpace");
        // // Flatten list => [ '. .', 'charSpace', '. -', 'wordSpace', '- -' ]
        // return tokens.flat();
    },

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
    }
}
