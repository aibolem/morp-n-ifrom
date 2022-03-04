import * as international from "./international.js";
import * as american from "./american.js";
import * as cyrillic from "./cyrillic.js";

export var dictionaries = {};

dictionaries.international = international.dictionary;
dictionaries.american = american.dictionary;
dictionaries.cyrillic = cyrillic.dictionary;
