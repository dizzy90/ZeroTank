# ZeroTank
Fork of the [ZeroBot](https://github.com/CoretechR/ZeroBot) project with some minor fixes and changes to fit my tank project.

## Install script
Installs all the dependencies for the script to be able to run on a Raspberry Pi Zero W.
Example: `$ sudo ./tank_install.sh`
*Note:* `tank_install.sh` assumes that the project directory is `/home/<NAME>/ZeroTank`. You may want to modify this if the project is not located there.

## Changelog:
* Changed name of touch.html to index.html for convenience
* Refactored index.html by splitting .css and .js "engine" to separate files
* Moved UI related files to src/
* Added a button, and made them smaller
* Cleaned up the indentations
* Temperature script triggers once instead of for each connected user
* Cam stream no longer triggers on invoking app.js
* User connect and disconnect now dicatates if temperature and stream are active
* Implemented active user counter so that the temps/stream are killed only when
  there are no users connected
* Added the script 'tank_install.sh' which installs all dependencies required
  for this to work on a Pi Zero W (run with sudo)

