const {Atem} = require("atem-connection");
var midi = require("midi");
var midiInput = {
    "port": new midi.Input(),
    "name": "",
    "connection": false
};
var midiOutput = {
    "port": new midi.Output(),
    "name": "",
    "connection": false
};

var nconf = require("nconf");
var atemIP = undefined;
var ME = 0;
var inputs = [1, 2, 4, 5, 6, 7, 8];
const atem = new Atem();
var keyFlasher = [undefined, false];
var faderLastDirection = false;
var exitOnError = false;

//xTouch mini buttons
var progButtons = [89, 90, 40, 41, 42, 43, 44, 45]; //Comes in with 144 command type
var prevButtons = [87, 88, 91, 92, 86, 93, 94, 95];
var knobs = [16, 17, 18, 19, 20, 21, 22, 23];
var knobLeds = [48, 49, 50, 51, 52, 53, 54, 55];
var fader = 0; //Comes in with a 232 command type
var cutButton = 84;
var autoButton = 85;

//Attempt to load in the configuration
function loadConfig(callback) {
    nconf.use("file", {file: "./config.json"});
    nconf.load();

    var error = false;
    if(nconf.get("atemIP") === undefined) {nconf.set("atemIP", "127.0.0.1"); error = true;}
    if(nconf.get("ME") === undefined) {nconf.set("ME", "0"); error = true;}
    if(nconf.get("inputs") === undefined) {nconf.set("inputs", "1,2,3,4,5,6,7,8"); error = true;}
    if(nconf.get("exitOnError") === undefined || nconf.get("exitOnError") == "") {nconf.set("exitOnError", "no"); error = true;}
    if(nconf.get("midiInputDevice") === undefined || nconf.get("midiInputDevice") == "") {nconf.set("midiInputDevice", ""); error = true;}
    if(nconf.get("midiOutputDevice") === undefined || nconf.get("midiInputDevice") == "") {nconf.set("midiOutputDevice", ""); error = true;}

    if(error) {
        //Error
        console.log("There is an issue with the configuration file. Please check the configuration file config.json");
        console.log("\nMidi input devices:");
        for(var i = 0; i < midiInput.port.getPortCount(); i++) {
            console.log(midiInput.port.getPortName(i));
        }

        console.log("Midi output devices:");
        for(var i = 0; i < midiOutput.port.getPortCount(); i++) {
            console.log(midiOutput.port.getPortName(i));
        }
        
        nconf.save(function (error) {
            if(error){console.log("An error occurred saving the config file: " + error.message);}
            callback(false);
        });
    }
    else {
        //Load in the settings
        atemIP = nconf.get("atemIP");
        ME = parseInt(nconf.get("ME"));
        inputs = nconf.get("inputs").split(',');
        exitOnError = nconf.get("exitOnError").toLowerCase() == "yes";

        //Find the midi ios and set them
        var error = true;
        midiInput.name = nconf.get("midiInputDevice");
        for(var i = 0; i < midiInput.port.getPortCount(); i++){if(midiInput.port.getPortName(i) == nconf.get("midiInputDevice")){midiInput.port.openPort(i); error = false; break;}}
        if(error){console.log("Failed to find the midi input " + nconf.get("midiInputDevice")); callback(false);} error = true;
        midiOutput.name = nconf.get("midiOutputDevice");
        for(var i = 0; i < midiOutput.port.getPortCount(); i++){if(midiOutput.port.getPortName(i) == nconf.get("midiOutputDevice")){midiOutput.port.openPort(i); error = false; break;}}
        if(error){console.log("Failed to find the midi output " + nconf.get("midiInputDevice")); callback(false);} error = true;

        callback(true);
    }
}

//Set the ring around a knob to a position 0-12
function setRingLight(knob, position) {
    midiOutput.port.sendMessage([176, knobLeds[knob], position]);
}

//Set a key light on or off bank="prog/prev", key=1-8, state=true/false
function setKeyLight(bank, key, state) {
    if(bank == "prog") {
        midiOutput.port.sendMessage([144, progButtons[key], state ? 127 : 0]);
    }
    else if(bank == "prev") {
        midiOutput.port.sendMessage([144, prevButtons[key], state ? 127 : 0]);
    }
    else if(bank == "cut") {
        midiOutput.port.sendMessage([144, cutButton, state ? 127 : 0]);
    }
    else if(bank == "auto") {
        midiOutput.port.sendMessage([144, autoButton, state ? 127 : 0]);
    }
    else {
        console.log("Invalid bank, this should be either prog or prev");
    }
}

//Start flashing the keys to show connection issues
function flashKeys() {
    keyFlasher[0] = setInterval(function() {
        for(var i = 0; i < progButtons.length; i++) {
            setKeyLight("prog", i, !keyFlasher[1]);
            setKeyLight("prev", i, !keyFlasher[1]);
        }
        keyFlasher[1] = !keyFlasher[1];
    }, 500);
}

//Stop flashing the keys
function stopFlashKeys() {
    clearInterval(keyFlasher[0]);
    keyFlasher[1] = false;
    updateKeys();
}

//Update the keys based on the current read data
function updateKeys() {
    for(var i = 0; i < progButtons.length; i++) {
        setKeyLight("prog", i, inputs[i] == atem.state.video.mixEffects[ME].programInput);
    }
    for(var i = 0; i < progButtons.length; i++) {
        setKeyLight("prev", i, inputs[i] == atem.state.video.mixEffects[ME].previewInput);
    }
}

function updateFadeTimeRing() {
    //Switch the transition style
    var rate = 0;
    console.log(atem.state.video.mixEffects[ME].transitionSettings);
    switch(atem.state.video.mixEffects[ME].transitionProperties.style) {
        case 0: {
            //mix max=250
            rate = atem.state.video.mixEffects[ME].transitionSettings["mix"].rate;
            break;
        }
        case 1: {
            //dip max=250
            rate = atem.state.video.mixEffects[ME].transitionSettings["dip"].rate;
            break;
        }
        case 2: {
            //wipe max=250
            rate = atem.state.video.mixEffects[ME].transitionSettings["wipe"].rate;
            break;
        }
        case 3: {
            //DVE max=250
            rate = atem.state.video.mixEffects[ME].transitionSettings["DVE"].rate;
            break;
        }
        case 4: {
            //stinger max=250
            rate = atem.state.video.mixEffects[ME].transitionSettings["stinger"].maxRate;
            break;
        }
    }
    rate =  parseInt(rate / 14);
    if(rate > 11){rate = 11;}
    else if(rate < 1){rate == 1;}
    setRingLight(7, rate);
}

//Connect to the ATEM
function connect() {
    //Set the handlers
    atem.on("info", function(message) {
        console.log("INFO: " + message);
    });
    atem.on("error", function(error) {
        console.log("ERROR: " + error);
    });

    atem.on("connected", () => {
        console.log("Successfully connected to the ATEM");
        stopFlashKeys();
        updateKeys();
    });
    atem.on("disconnected", function() {
        console.log("Disconnected from the ATEM");
        flashKeys();
    });
    atem.on('stateChanged', (state, pathToChange) => {
        updateKeys();
        setKeyLight("auto", 0, atem.state.video.mixEffects[ME].transitionPosition.inTransition);
        updateFadeTimeRing();
    });

    //Connect
    atem.connect(atemIP);
}

//Send a fader to a ME with level 0-127
function sendFader(level) {
    var position = level * 78.74015748031496;

    if(!faderLastDirection) {
        position = 10000 - position;
    }

    if(level == 0){faderLastDirection = true;}
    else if(level == 127){faderLastDirection = false;}

    atem.setTransitionPosition(position, ME);
}

//Main loop
console.log("ATEM MIDI Switcher by Kardinia Church 2021");
console.log("Attempting to load configuration");

loadConfig(function(success) {
    if(success == true) {
        //Add a process to check if midi is connected
        setInterval(function() {
            //Input
            var found = false;
            var portId = 0;

            //Find input
            for(var i = 0; i < midiInput.port.getPortCount(); i++) {
                if(midiInput.port.getPortName(i) == midiInput.name) {found = true; portId = i; break;}
            }
            if(found == false) {
                console.log("Lost connection to the midi input device " + midiInput.name);
                midiInput.connection = true;
                midiInput.port.closePort();
            }
            else if(midiInput.connection == true) {
                console.log("Regained the midi input device " + midiInput.name);
                midiInput.port.openPort(portId);
                midiInput.connection = false;
            }

            //Output
            found = false;
            portId = 0;
            for(var i = 0; i < midiOutput.port.getPortCount(); i++) {
                if(midiOutput.port.getPortName(i) == midiOutput.name) {found = true; portId = i; break;}
            }
            if(found == false) {
                console.log("Lost connection to the midi output device " + midiOutput.name);
                midiOutput.connection = true;
                midiOutput.port.closePort();
            }
            else if(midiOutput.connection == true) {
                console.log("Regained the midi output device " + midiOutput.name);
                midiOutput.port.openPort(portId);
                midiOutput.connection = false;
                updateKeys();
            }
        }, 1000);


        //Everything seems good lets begin!
        flashKeys();
        console.log("Success, attempting connection to the ATEM at " + atemIP);
        connect();

        //Add the callbacks for MIDI
        midiInput.port.on("message", function (deltaTime, message) {
            console.log(`m: ${message} d: ${deltaTime}`);
            //Switch the command type
            switch(message[0]) {
                case 232: {
                    //Fader
                    if(message[1] == fader) {
                        sendFader(message[2]);
                    }
                    break;
                }
                case 144: {
                    //Button press
                    if(message[2] == 127) {
                        //Program
                        for(var i = 0; i < progButtons.length; i++) {
                            if(message[1] == progButtons[i]) {
                                atem.changeProgramInput(inputs[i], ME);
                            }
                        }

                        //Preview
                        for(var i = 0; i < prevButtons.length; i++) {
                            if(message[1] == prevButtons[i]) {
                                atem.changePreviewInput(inputs[i], ME);
                            }
                        }

                        //Cut
                        if(message[1] == cutButton) {
                            atem.cut(ME);
                        }

                        //Auto
                        if(message[1] == autoButton) {
                            atem.autoTransition(ME);
                        }
                    }
                    break;
                }
                case 176: {
                    // //Knob
                    // if(data[1] > 65) {
                    //     atem.setMixTransitionSettings(atem.state.video.mixEffects[ME].transitionSettings["mix"].rate + 10, ME);
                    // }
                    // else if(data[1] > 0) {

                    // }


                    // break;
                }
            }
        });
    }
    else {
        if(exitOnError == true) {
            console.error("Initialization errors occurred, will retry in 15 seconds");
            setTimeout(function(){main();}, 15000);
        }
        else {
            console.error("Initialization errors occurred");
            process.exit(1);
        }
    }
});