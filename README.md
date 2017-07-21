# Introduction

This Javascript (ES6) library is for manipulating Morse code text and sound. It is the library used in the tools on [Stephen C Phillips's Morse code website](https://morsecode.scphillips.com).

The library can:
* Translate to and from text and Morse code (in the form of '-- --- .-. ... . / -.-. --- -.. .').
* Understands Morse code prosigns.
* Generate downloadable RIFF WAVE ('.wav') files of Morse code at given frequency and speed.
* Make use of the "Farnsworth speed" concept of extending the gaps between characters and words.
* Generate in-browser sounds using the Web Audio API and falling back to other methods such as Flash for older browsers.
* Take Morse code input from a web-based keyer or iambic keyer.
* Decode to text given 'on' and 'off' timings and a fixed speed.
* Adaptively decode to text, adjusting to the most likely speed and Farnsworth speed.
* Decode from listening to the microphone or an audio file, adapting to the most prominent frequency.

It has been written using ES6 (ECMA Script 6) with no horrid module  boilerplate. If you need it to execute in a web page then use something like webpack and babel to transpile it to an earlier version of Javascript.

# Copyright and Licence

Copyright: Stephen C Phillips, 2013-2017; Licensed under the EUPL v1.2, with extension of article 5 (compatibility clause) to any licence for distributing derivative works that have been produced by the normal use of the Work as a library.

*Please note, this is different to the Expat (MIT) licence often found in Javascript projects and places restrictions and obligations on the user of the software.*

The full text of the licence can be found in the [LICENSE file](./LICENSE) in this folder.

My intention in using EUPL v1.2 is to ensure that any modifications to this library are made available to the community as source code. The EUPL v1.2 licence makes it clear that modifications must be made available even in the case of the library being used as part of a web service and not distributed to the user (in this case it is similar to the AGPL licence). My intention is also that this library can be used as a library by other pieces of software but that the EUPL v1.2 licence does not have to be applied to the software that links to it (this is similar to the LGPL licence). Of course, if you want to open source software that links to this libraary then you are free to do so.

More information on the EUPL v1.2:
* [EUPL information](https://joinup.ec.europa.eu/community/eupl/home)
* [EUPL and Proprietary / Commercial use](https://joinup.ec.europa.eu/community/eupl/news/eupl-and-proprietary/commercial-use)
* [Compatibility with other licences](https://joinup.ec.europa.eu/community/eupl/og_page/eupl-compatible-open-source-licences)
* [Summary of the similar EUPL v1.1 from TL;DR Legal](https://tldrlegal.com/license/european-union-public-licence)

# Documentation

Currently only found in the headers of the source code files - sorry!

# Tests

None yet! This library is used for the software on https://morsecode.scphillips.com and is tested there.

# Contact

Please email me at steve@scphillips.com with any questions or ideas.
