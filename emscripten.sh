#!/bin/bash
./emsdk_portable/emsdk update
./emsdk_portable/emsdk install latest
./emsdk_portable/emsdk activate latest
source ./emsdk_portable/emsdk_env.sh
emcc -o tokenizer.js -DLINUX Source/tokenizer.cpp -w -s EXPORTED_FUNCTIONS="['_TestRecAlignment', '_Version', '_Compile']" --post-js post.js
