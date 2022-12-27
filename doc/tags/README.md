# Morse-Pro Tag Format

The Morse-Pro library supports the use of various tags in the input to help control the output sound/light/vibration.

All the following tags operate relative to the values already set when the timings are computed. The tags do not change the values outside of the message in which they are contained. The changes do not accumulate within a message, so if within a message the speed is set to `+5` and then set again to `+5`, the speed will not change the second time.

There are complex rules to deal with spaces in the input on either side of a tag. Briefly, spaces before a tag are moved after the tag and then multiple spaces are replaced with a single space.

The complete grammar (not all implemented) is shown in this [railroad diagram](diagram.xhtml).

## Timing Tags

* timing value:
  * `[t20]` sets the character and effective (Farnsworth) speeds to 20 wpm
  * `[t20/10]` sets the character speed to 20 wpm and effective speed to 10 wpm
  * `[t+5]` adds 5 to the current character and effective speeds
  * `[t+5/-2]` adds 5 to the current character speed and subtracts 2 from the effective speed
  * `[t+20%]` adds 20% to the current character and effective speeds
  * `[t+20%/-10%]` adds 20% to the current character speed and subtracts 10% from the effective speed
  * `[t-10%/12.5]` subtracts 10% from the current character speed and sets the effective speed to 12.5
* timing equality:
  * `[t=]` sets the effective speed equal to the current character speed
* timing reset:
  * `[t]` resets the character and effective speeds to the initial values

## Spacing Tags

* Pause space:
  * `[   ]` forces 3 word-spaces (additional spaces in the input are normally replaced by a single space)
* Pause value:
  * `[2000]` inserts a 2000ms pause
  * `[2000ms]` inserts a 2000ms pause

## Volume tags

Coming soon.

## Pitch (or frequency) tags

* pitch value:
  * `[p550]` or `[f550]` sets the pitch to 550Hz
  * `[p+5]` or `[f+5]` adds 5 to the current pitch
  * `[p-5]` or `[f-5]` subtracts 5 from the current pitch
  * `[p+20%]` or `[f+20%]` adds 20% to the current pitch
  * `[p-20%]` or `[f-20%]` subtracts 20% from the current pitch
* pitch reset:
  * `[p]` or `[f]` resets the pitch to the initial value
