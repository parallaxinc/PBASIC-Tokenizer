'use strict';

var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var expect = require('expect');

var tokenizer = require('../');

var argRegex = /\n\'(\w+):\s*([^\n]+)/g;
var passFailRegex = /\'(PASS|FAIL)\s*\/?([^\n]*)/g;

function parseTestCase(test){
  var args = {};
  var arg = argRegex.exec(test);
  while(arg !== null && arg.length > 2 && arg[1] && arg[1].length > 0){
    var name = arg[1].toLowerCase();
    var existing = args[name];
    var value = arg[2];
    if(_.isArray(existing)){
        existing.push(value);
    }else if(existing){
        args[name] = [existing, value];
    }else{
        args[name] = value;
    }
    arg = argRegex.exec(test);
  }

  var passFail = passFailRegex.exec(test);
  if(passFail !== null){
    var type = passFail[1].toLowerCase();
    args[type] = true;
    if(type === 'fail'){
      var failureExpectations = _.map(passFail[2].split('/'), _.trim);
      if(failureExpectations.length > 0 && failureExpectations[0].length > 0){
        args.expect = failureExpectations;
      }
    }
  }

  args.source = test;

  return args;
}


describe.only('Tokenizer Test Suite', function(){

  console.log('Reading tests from tests.txt...');
  var testFile = path.resolve(__dirname, 'tests.txt');

  var tests = fs.readFileSync(testFile, {
    encoding: 'utf8'
  });

  var testSuite = tests.split('\n!');
  console.log('Found ' + testSuite.length + ' Tests!');

  _.forEach(testSuite, function(testCase, testNum){
    var test = parseTestCase(testCase);

    if(test.skip === 'Yes'){
      return;
    }

    var testName = test.purpose || _.get(test, 'expect[0]') || (test.pass ? 'Should Pass' : 'Should Fail');

      it('#' + testNum + ' - ' + testName, function(){
        var result = tokenizer.compile(test.source);
        if(test.pass){
          expect(result.Succeeded).toBe(true);
        }
        if(test.fail){
          expect(result.Succeeded).toBe(false);
          var expectedError = _.get(test, 'expect[0]');
          if(expectedError && expectedError.length > 0){
            expect(result.Error).toInclude(expectedError);
          }
        }
      });
  });

});
