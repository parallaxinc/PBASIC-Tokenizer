# PBASIC-Tokenizer
BASIC Stamp PBASIC Tokenizer

Install
---
`npm i pbasic-tokenizer` then in your code include the library:

```js
var pbasic = require('pbasic-tokenizer');
```

API
---
Using the PBASIC Tokenizer Library v1.2.pdf is required reading to understand the output:


`pbasic.compile(source, directivesOnly, targetModule)`
* Returns TModuleRec object.
* Source is a String with your source code to tokenize.
* DirectivesOnly is a Boolean which provides an option of only tokenizing the “compiler directives” from the source code, rather than the entire source. This option is helpful when the calling program needs to determine only the target module, serial port or project files that may be specified by the PBASIC source code.
* TargetModule is OPTIONAL integer which skips any Stamp directive from the source code. Valid options are 2=BS2, 3=BS2e, 4=BS2sx, 5=BS2p, 6=BS2pe.


`pbasic.version()`
* Return an int in the format: XYY ;where X is the major version number and Y is the minor. For example, if the Version function returned 116, that indicates the version of the tokenizer is 1.16. If Version returned 123, that would indicate the tokenizer is version 1.23.


`pbasic.testRecAlignment()`
* only used in testing


Build
-----
NOTE: This is only needed if for some reason you need to make changes to the tokenizer source code and regenerate the build files:

* Download and install [emscripten](https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html)
* Follow the directions to source the environment variables --ie from this directory `source ~/Downloads/emsdk_portable/emsdk_env.sh`
* `npm i` to install dependencies and kickoff a fresh build
