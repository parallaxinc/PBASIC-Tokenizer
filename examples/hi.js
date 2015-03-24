'use strict';

var pbasic = require('../');

console.log(pbasic.version());

var program = "'{$STAMP BS2}\n" +
'DEBUG "HI", CR\n' +
'STOP';

var TModuleRec = pbasic.compile(program, false);
console.log(TModuleRec);
