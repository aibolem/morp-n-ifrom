# morse-pro Changelog

All notable changes to this project will be documented in this file.

## [3.0.0] - 2022-08-02

This release contains many breaking changes and bug fixes, mostly documented below. It has not reached a particular milestone, but a release is needed. Many classes now take their constructor parameters as a dictionary (object) with defaults, but this refactoring is not quite complete. Notable additions are the generalisation of the translation to support variants of Morse code other than International, and the addition of the playback of American (railroad) Morse via sound samples. Also, a single class to reliably obtain the AudioContext class required to use the Web Audio API has been added.

### Added

- dictionary files to translate between text and dots/dashes for international (moved from morse-pro), American (railroad), Arabic, Cyrillic, Cyrillic-Ukraine, and Hebrew
  - international
    - accented characters added
    - sexed quotes added
    - new lines treated the same as other whitespace
- `morse-pro`
  - methods to load and unload dictionaries
- `morse-pro-audiocontext`
  - new singleton class to obtain AudioContext object reliably and load samples, supporting multiple browser implementations
- `morse-pro-compat`
  - new compatibility class to support v2 library code
- `morse-pro-cw-compat`
  - new compatibility class to support v2 library code
- `morse-pro-message`
  - `loadMorse()`, `loadText()`, `cleanText()`, `getInputErrorString()`, `getOutputErrorString()`, `getTextErrorString()`, `getMorseErrorString()` methods
- `morse-pro-player-waa`
  - better volume control, using internal gain value
  - support for American (railroad) Morse via sound-on and sound-off audio samples
  - `queue()` method to queue up the next sequence
  - `muteAudio()` method to mute the audio but still continue playing (e.g. via vibration or light)
- `morse-pro-player-light`
  - `muteLight()` method
- `morse-pro-player-xas`
  - volume and gain control
  - `load()` method now takes a list of timings

### Changed

- `morse-pro`
  - text to morse dictionary removed from here and put into separate dictionary file
  - input is now not converted to upper case
- `morse-pro-cw`
  - class constructor takes all parameters via a dictionary with defaults
  - now extends `Morse` class instead of `MorseMessage`
  - pretty much the whole class has changed in order to use dictionaries
- `morse-pro-cw-wave`
  - class constructor takes all parameters via a dictionary with defaults
- `morse-pro-decoder`
  - class constructor takes all parameters via a dictionary with defaults
  - `wpm` and `fwpm` properties are now `setWPM()` and `setFWPM()` methods
- `morse-pro-decoder-adaptive`
  - class constructor takes all parameters via a dictionary with defaults
- `morse-pro-keyer`
  - class constructor takes all parameters via a dictionary: now uses a configured decoder and player object
- `morse-pro-keyer-iambic`
  - class constructor takes all parameters via a dictionary with defaults
- `morse-pro-player-waa`
  - class constructor takes all parameters via a dictionary with defaults
  - audio graph has improved bandpass filter
  - volume changes happen over a few milliseconds to remove audio artifacts
  - stopping the sound happens over a few milliseconds to remove audio artifacts
- `morse-pro-player-waa-light`
  - class constructor takes all parameters via a dictionary with defaults

### Deprecated

- `morse-pro-wpm`
  - calculations of sound durations are now handled via dictionary files

### Removed

- `morse-pro-message`
  - `clearError()` method
- `morse-pro-player-waa`
  - `loadCWWave()` method
  - `loadNextCWWave()` method
- `morse-pro-player-xas`
  - `loadCWWave()` method
- tests
  - all tests removed as they were primarily testing only legacy code and getting them to run was difficult
- `Vagrantfile`

### Fixed

- `morse-pro-decoder`
  - noise threshold increased (had been set too small)
- `morse-pro-message`
  - 50ms of nothing is added to the end of a sound file to avoid the end being clipped on playback
- `morse-pro-player-waa`
  - `sequenceEndingCallback` is called more reliably
  - 200ms start-up delay (minimum) is applied the very first time and then the user's confugured delay is used
- `morse-pro-player-waa-light`
  - `SMALL_AMPLITUDE` constant added to ignore some noise

## [2.0.0] - 2019-01-02

No particular reason to make a release now except that it's been too long coming and will never really be ready. Best to release it now in case it is useful to someone. It's version 2.0.0 because of breaking changes, not for any other reason. More breaking changes are likely as I am not happy with the architecture, but who knows when?!

### Added

- more in-line documentation in many files
- some more tests of main classes
- morse-pro
  - a few more punctuation characters
- morse-pro-wpm
  - `dahLength`, `ditSpace`, `charSpace` and `wordSpace` methods
- morse-pro-cw
  - `wordSpace` property
  - `endPadding` parameter (default 0) in `getSample` and `getWAASample` methods to allow a configurable pause at the end of the waveform
- morse-pro-cw-wave
  - a lowpass bi-quad filter to the waveform generated by `getSample`
  - `getWAASample` asynchronous method to return sample generated using Web Audio API
- morse-pro-keyer
  - optional `fwpm` 3rd argument in constructor
- morse-pro-keyer-iambic
  - optional `fwpm` 3rd argument in constructor
  - optional `iambicA` 5th argument in constructor to switch between iambic A and B modes
- morse-pro-player-waa
  - callback functions in constructor for sequenceStart, sequenceEnding and soundStopped (the last one was previously just in `morse-pro-player-waa-light`)
  - low-pass filter on waveform to remove clicks
  - `loadTimings` method
  - `loadNext` method to provide a single item queue of timings
  - `pause` method
  - `isPaused` read-only property
  - `nextNote` read-only property
  - `startPadding` field to insert a pause before playback begins (suggest 5ms to avoid sound artefacts in some browsers)
  - `endPadding` field to insert a pause after playback of a timing sequence completes
- morse-pro-player-waa-light
  - additional callback functions in constructor to match `morse-pro-player-waa`
- morse-pro-player-xas
  - volume now settable

### Changed

- updates node and npm to latest versions
- updates all npm dependencies to latest versions (apart from babel which is latest v6, not v7)
- Babel uses 'env' preset instead of 'es2015'
- morse-pro
  - `tidyMorse` now trims whitespace
  - `looksLikeMorse` now returns false when the input string is just whitespace
- morse-pro-wpm
  - millisecond timings are now rounded to the nearest integer
- morse-pro-util-riffwave
  - `getData` arguments changed to take waveform data (so use `morseCWWave.getSample()` not `morseCWWave` instance directly), sampleRate and bitsPerSample
- morse-pro-cw
  - makes `useProsigns` argument in constructor have `true` as the default
  - `getTimingsGeneral` is now a static method
- morse-pro-keyer
  - refactoring to mark many functions and fields as private
  - `_ditOrDah` function is now the method required in class extensions
- morse-pro-keyer-iambic
  - refactored from `check` to `_ditOrDah` function
- morse-pro-player-xas
  - refactors `isPlaying` field into `isPlaying` read-only property
- morse-pro-player-waa-light
  - return value of `audioType` property changed from 4 to 5

## [1.0.2] - 2017-08-11

### Added

- Some tests
- Integration with travis and coveralls

### Changed

- Imports now use relative paths
- npm library now transpiled from ES6 and located in lib directory

## [1.0.1] - 2017-07-28

### Added

- ESDoc inline documentation

### Changed

- Source Javascript moved into src directory

## [1.0.0] - 2017-07-23

- initial release
