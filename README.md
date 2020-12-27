# lumenocity

## what is this?

in short, *lumenocity* is a game engine that's being written practically from the ground up in JavaScript using Node.js and Electron.

for the most part, I'm writing this by myself, but I will be documenting my progress at [http://sylvir.net](http://sylvir.net/blog). testing of *lumenocity* will be split into many distinct parts that are mostly independent of each other. all of these tests will be kept and contained within the `src/tests` directory. however, that may be moved to just `/tests` to keep the core engine seperate from the module tests.

## development

this repository is licensed under the MIT license, and thus, permits modification, reuse, and distribution of open and closed sourced versions. this project obviously uses the Node.js/npm ecosystem, so most of the prerequisites can be downloaded and installed using `npm install` while in the root directory of the project. in addition to this, some npm modules use `node-gyp`, which has some dependencies on its own. the `node-gyp` GitHub repository can be found [here](https://github.com/nodejs/node-gyp)

after all dependencies have been successfully installed, any one of the tests can be ran with `npm test <test name>`. a list of all available tests can be retrieved by just running `npm test` without the `<test name>` parameter.

since Electron is the environment in which nearly all this code is running, there's an npm script that gets ran after an npm module is installed that compiles it for running on electron. with that said, some modules may not work in a plain Node.js environment because they were recompiled for Electron. please keep that in mind during development.

## what this includes so far

### Controller/ControllerManager module

*this module is responsible for managing Game Controller input. inside the `src/core/controllers` directory exists several classes that extend the master Controller class.*

the main idea here is that each type of controller would be managed at the lowest level and then mapped to the common interfaces that are present in the Controller class. as of right now, the only controllers that have classes written for them is DirectInput (Xbox Controllers) and Nintendo Switch Pro Controllers.

an example of the flexibility of this module is imagine in the context of a game, you want to address maybe some player indicator LEDs (the bottom green lights on the Switch Pro Controler), a generic Controller Input npm module most-likely wouldn't be able to address those LEDs because it's typically not a common Controller feature. but since the Switch Pro Controller would be intercepting and interpreting the raw HID streams, any of those very specific Controller features can be addressed fairly easily.

### Archive module

*this module is responsible for managing game assets that would potentially need to be loaded during the course of the run-time of a game.*

an Archive has 2 modes:

- "uncompiled mode" - an Archive is specified to be an uncompiled directory that contains the contents of the Archive
- "compiled mode" - an Archive is specified to be a compiled file that contains the contents of the Archive

regardless of which mode a given Archive is in, retrieving assets is externally done the same. the internal logic is different, but it is very flexible. so you can run any debug builds of a game with an uncompiled Archive and then switch it to a compiled Archive in a release build and none of the internal code would have to change.

***some things to note about archives:***

- the terms "uncompiled" and "compiled" were chosen deliberately. Archives **do not** get compressed. they simply just get the raw binary data of each and every file shoved into one single file. with that said, loading and even uncompiling assets is incredibly fast and efficient because there's no decompression logic that would be taking place

- in the Archive module test, I specify the default name for a compressed file as `<dir_name>$` without any extension. this was done pretty much on a whim. but I guess one reason I decided on that was because I wanted an Archive to be thought of not as a file, but as a directory that's just being represented by a file. but realistically, an Archive can be named whatever you want. because the only thing that's actually being read is the internal data. *(some of the internal function names reference compressing and decompressing but this will probably be changed in the future)*

- *only ascii characters are supported in file names at this time.* right now, the compiler assumes that each character in a file name is exactly 1 byte long. which is 100% fine if its an ascii character, but if it's not 1 byte long, you'd run into problems. eventually I might implement a solution to this. but for now, just stick to ascii characters.

## footnote

this project is very clearly in early early development and it's mostly just a collection of my ideas and my experiments of testing what works and what doesn't. however, I believe that the material that I have developed thus far includes a lot of really good ideas and concepts that I'm fairly proud of.
