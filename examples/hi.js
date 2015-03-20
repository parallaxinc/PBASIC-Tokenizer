'use strict';

var bs2tokenize = require('../');

console.log(bs2tokenize.version());

var program = "'{$STAMP BS2}\n" +
'DEBUG "HI", CR\n' +
'STOP';

var TModuleRec = bs2tokenize.compile(program, false, true);
console.log(TModuleRec);
