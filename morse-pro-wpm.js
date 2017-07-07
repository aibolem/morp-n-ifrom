// This code is © Copyright Stephen C. Phillips, 2013-2017.
// Email: steve@scphillips.com

/* jshint esversion: 6 */

const DITS_PER_WORD = 50;  // dits in "PARIS "
const SPACES_IN_PARIS = 19;  // 5x 3-dit inter-character spaces + 1x 7-dit space
const MS_IN_MINUTE = 60000;  // number of milliseconds in 1 minute

export function ditLength(wpm) {
    return (MS_IN_MINUTE / DITS_PER_WORD) / wpm;
}

export function wpm(ditLen) {
    return (MS_IN_MINUTE / DITS_PER_WORD) / ditLen;
}

export function fditLength(wpm, fwpm) {
    return ditLength(wpm) * ratio(wpm, fwpm);
}

// "PARIS " is 31 units for the characters and 19 units for the inter-character spaces and inter-word space
// One unit takes 1 * 60 / (50 * wpm)
// The 31 units should take 31 * 60 / (50 * wpm)  seconds at wpm
// PARIS should take 50 * 60 / (50 * fpm) to transmit at fpm, or 60 / fwpm  seconds at fwpm
// Keeping the time for the characters constant,
// The spaces need to take: (60 / fwpm) - [31 * 60 / (50 * wpm)] seconds in total
// The spaces are 4 inter-character spaces of 3 units and 1 inter-word space of 7 units. Their ratio must be maintained.
// A space unit is: [(60 / fwpm) - [31 * 60 / (50 * wpm)]] / 19 seconds
// Comparing that to  60 / (50 * wpm)  gives a ratio of (50.wpm - 31.fwpm) / 19.fwpm
export function ratio(wpm, fwpm) {
    return (DITS_PER_WORD * wpm - (DITS_PER_WORD - SPACES_IN_PARIS) * fwpm) / (SPACES_IN_PARIS * fwpm);
}

export function fwpm(wpm, r) {
    return DITS_PER_WORD * wpm / (SPACES_IN_PARIS * r + (DITS_PER_WORD - SPACES_IN_PARIS));
}
