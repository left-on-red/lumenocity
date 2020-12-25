# lumenocity

***what is this?***

in short, *lumenocity* is a game engine that's being written practically from the ground up in JavaScript using Node.js and Electron.

for the most part, I'm writing this by myself, but I will be documenting my progress at (http://sylvir.net)[http://sylvir.net/blog]. testing of *lumenocity* will be split into many distinct parts that are mostly independent of each other. all of these tests will be kept and contained within the `src/tests` directory. however, that may be moved to just `/tests` to keep the core engine seperate from the module tests.

### development

this repository is licensed under the MIT license, and thus, permits modification, reuse, and distribution of open and closed sourced versions. this project obviously uses the Node.js/npm ecosystem, so most of the prerequisites can be downloaded and installed using `npm install` while in the root directory of the project. in addition to this, some npm modules use `node-gyp`, which has some dependencies on its own. the `node-gyp` GitHub repository can be found (here)[https://github.com/nodejs/node-gyp]

after all dependencies have been successfully installed, any one of the tests can be ran with `npm test <test name>`. a list of all available tests can be retrieved by just running `npm test` without the `<test name>` parameter.

since Electron is the environment in which nearly all this code is running, there's an npm script that gets ran after an npm module is installed that compiles it for running on electron. with that said, some modules may not work in a plain Node.js environment because they were recompiled for Electron. please keep that in mind during development.

#### footnote

this project is very clearly in early early development and it's mostly just a collection of my ideas and my experiments of testing what works and what doesn't. however, I believe that the material that I have developed thus far includes a lot of really good ideas and concepts that I'm fairly proud of.
