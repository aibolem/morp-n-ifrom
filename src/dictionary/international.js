export var dictionary = {
    id: 'international',

    letter: {
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
        'charSpace': -3,
        'wordSpace': -7
    },

    baseElement: '.',

    frequency: {
        '.': 550,
        '-': 550,
        ' ': 0,
        'charSpace': 0,
        'wordSpace': 0
    },

    display: {
        morse: {
            '\\.': '.',
            '\\-': '-',
            ' ': ''
        },
        join: {
            charSpace: ' ',
            wordSpace: ' / '
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

    morseMatch: new RegExp('^\\s*[\\.\\-_]+[\\.\\-_ \\/\\|]*$'),

    displayName: {
        keys: ['.', '-', 'charSpace', 'wordSpace'],
        values: ['dit', 'dah', 'intra-character space', 'inter-character space', 'word space']
    },

    // TODO: add accented characters as an option
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
                '<KN>': '- . - - .',
                '<SK>': '. . . - . -', // also <VA>
                '<VA>': '. . . - . -',
                '<SN>': '. . . - .', // also <VE>
                '<VE>': '. . . - .',
                '<SOS>': '. . . - - - . . .'    
            },
            letterMatch: /^<...?>|./
        }
    }
}
