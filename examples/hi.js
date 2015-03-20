var bs2tokenize = require('../');

bs2tokenize.version(function(err, version){
  console.log(version);
});

var myString = "\'{$STAMP BS2}\n" +
'DEBUG "HI", CR\n' +
'STOP';

bs2tokenize.compile(myString, function(err, TModuleRec){
  console.log(TModuleRec);
});
