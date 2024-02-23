import { CHAR_SPACE, WORD_SPACE } from '../constants.js'

export var dictionary = {
    id: 'hebrew',

    letter: {
        'א': '. -',
        'ב': '- . . .',
        'ג': '- - .',
        'ד': '- . .',
        'ה': '- - -',
        'ו': '.',
        'ז': '- - . .',
        'ח': '. . . .',
        'ט': '. . -',
        'י': '. .',
        'כ': '- . -',
        'ל': '. - . .',
        'מ': '- -',
        'נ': '- .',
        'ס': '- . - .',
        'ע': '. - - -',
        'פ': '. - - .',
        'צ': '. - -',
        'ק': '- - . -',
        'ר': '. - .',
        'ש': '. . .',
        'ת': '-',

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

        // '.': '. - . - . -',
        // ',': '- - . . - -',
        // ':': '- - - . . .',
        // '?': '. . - - . .',
        // '\'': '. - - - - .',
        // '-': '- . . . . -',
        // '/': '- . . - .',
        // '(': '- . - - .',
        // ')': '- . - - . -',
        // '“': '. - . . - .',  // U+201C
        // '”': '. - . . - .',  // U+201D
        // '‘': '. - . . - .',  // U+2018
        // '’': '. - . . - .',  // U+2019
        // '"': '. - . . - .',
        // '@': '. - - . - .',
        // '=': '- . . . -',
        // '&': '. - . . .',
        // '+': '. - . - .',
        // '!': '- . - . - -',
    },

    letterMatch: /^./,

    /* 'charSpace' and 'wordSpace' are mandatory. The other symbols are dictionary dependent. */
    ratio: {
        '.': 1,
        '-': 3,
        ' ': -1,
        [CHAR_SPACE]: -3,
        [WORD_SPACE]: -7
    },

    baseElement: '.',

    frequency: {
        '.': 550,
        '-': 550,
        ' ': 0,
        [CHAR_SPACE]: 0,
        [WORD_SPACE]: 0
    },

    display: {
        morse: {
            '\\.': '.',
            '\\-': '-',
            ' ': ''
        },
        join: {
            [CHAR_SPACE]: ' ',
            [WORD_SPACE]: ' / '
        }
    },

    tokeniseMorse: function(morse) {
        morse = morse.trim();
        morse = morse.replace(/_/g, '-')
        morse = morse.replace(/\|/g, '/');
        morse = morse.replace(/\s+/g, ' ');
        morse = morse.replace(/\s*\/[\s\/]*/g, '/');
        let words = morse.split('/');
        let tokens = words.map(word => word.split(' '));
        tokens = tokens.map(letters => letters.map(letter => letter.replace(/(.)(?=.)/g, '$1 ')));
        return tokens;
    },

    morseMatch: new RegExp('^\\s*[\\.\\-_]+[\\.\\-_\\s\\/\\|]*$'),

    displayName: {
        keys: ['.', '-', ' ', CHAR_SPACE, WORD_SPACE],
        values: ['Dit length', 'Dah length', 'Intra-character space', 'Inter-character space', 'Inter-word space']
    },

    options: {
    }
}
