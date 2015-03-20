var bs2tokenize = require('../');

console.log(bs2tokenize.version());

var myString = "\'{$STAMP BS2}\n" +
'DEBUG "HI", CR\n' +
'STOP';

var TModuleRec = bs2tokenize.compile(myString);
console.log(TModuleRec);