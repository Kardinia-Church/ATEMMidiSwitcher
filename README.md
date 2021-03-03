# ATEM MIDI Switcher
A nodejs project to use a Behringer xTouch Mini as a switcher for a BlackMagic Switcher

# Features
* Switching prog/prev of a ME (Coming)
* Using the fader to fade between preview and program (Coming)

# Installation
* Install [nodejs](https://nodejs.org/en/)
* ```git clone http://github.com/Kardinia-Church/ATEMMidiSwitcher```
* ```cd ATEMMidiSwitcher```
* ```npm install```
* Run ```node index.js``` for the first time. This will create a config file
* Edit the ```config.json``` file with your desired setings

# Running
* ```node app.js```

# Prerequisites
The following prerequisites are required for building the midi package see [the midi package](https://nrkno.github.io/tv-automation-atem-connection/) for more
## Windows
* [Micosoft Visual C++](https://visualstudio.microsoft.com/vs/express/) including Desktop Development for C++
* [Python](https://www.python.org/)

## Linux
* [A C++ Compiler]()
* [ALSA]()
* [libasound2-dev package]()
* [Python]()

# Dependencies
This project uses the following dependencies
* [atem-connection](https://www.npmjs.com/package/atem-connection) see [documentation](https://nrkno.github.io/tv-automation-atem-connection/) for more info
* [midi](https://nrkno.github.io/tv-automation-atem-connection/)
