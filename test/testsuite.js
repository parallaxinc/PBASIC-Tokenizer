'use strict';

var util = require('util');
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var expect = require('expect');
var iconv = require('iconv-lite');

var tokenizer = require('../');

var argRegex = /\n\'(\w+):\s*([^\n]+)/g;
var passFailRegex = /\'(PASS|FAIL)\s*\/?([^\n]*)/g;
var valueAtRegex = /@(\d+)\s+([^\n]+)/;
var hexRegex = /\$([A-Fa-f0-9]+)/g;

function loadTestList(filename){
  console.log('Reading tests from tests.txt...');
  var testFile = path.resolve(__dirname, filename);

  var testData = iconv.decode(fs.readFileSync(testFile), 'ascii');

  var tests = testData.split('\n!');
  console.log('Found ' + tests.length + ' Tests!');
  return tests;
}

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

function testResultNumber(test, result, resultField, testField){
  if(test[testField]){
    var testValue = _.parseInt(test[testField]);
    var resultValue = result[resultField];
    var potentialError = 'Invalid ' + resultField + ': ' + resultValue + ' Expected: ' + testValue;
    expect(resultValue).toEqual(testValue, potentialError);
  }
}

function checkProjectFile(test, result, filename){
  var file = valueAtRegex.exec(filename);
  if(file){
    expect(result.ProjectFiles[_.parseInt(file[1]) - 1]).toEqual(file[2]);
  }
}

function validateBuffer(test, result, testField, resultField){
  var tests;
  if(_.isString(test[testField])){
    tests = [test[testField]];
  }else{
    tests = test[testField];
  }
  _.forEach(tests, function(fieldSet){
    var fields = valueAtRegex.exec(fieldSet);
    if(fields){
      var startPos = _.parseInt(fields[1]);
      var row = fields[2];
      var values = [];
      var nibble = hexRegex.exec(row);
      while(nibble){
        values.push(_.parseInt(nibble[1], 16));
        nibble = hexRegex.exec(row);
      }
      _.forEach(values, function(value, position){
        var resultValue = result[resultField].readUInt8(startPos + position);
        var potentialError = 'Error validating ' + resultField + '[' + (startPos + position) + '], value: ' + resultValue.toString(16) + ' expected: ' + value.toString(16);
        expect(resultValue).toEqual(value, potentialError);
      });
    }
  });
}

function validateResult(test, result){
  if(test.pass){
    expect(result.Error).toNotExist();
    expect(result.Succeeded).toBe(true);
  }
  if(test.fail){
    expect(result.Succeeded).toBe(false);
    var expectedError = _.get(test, 'expect[0]');
    if(expectedError && expectedError.length > 0){
      expect(result.Error).toInclude(expectedError);
    }
  }
  testResultNumber(test, result, 'LanguageVersion', 'language');
  testResultNumber(test, result, 'PacketCount', 'packetcount');
  testResultNumber(test, result, 'TargetModule', 'targetmodule');
  if(_.isArray(test.projectfile)){
    _.forEach(test.projectfile, function(filename){
      checkProjectFile(test, result, filename);
    });
  }else if(_.isString(test.projectfile)){
    checkProjectFile(test, result, test.projectfile);
  }
  validateBuffer(test, result, 'eeprom', 'EEPROM');
  validateBuffer(test, result, 'packetbuffer', 'PacketBuffer');
  if(test.debug){
    expect(result.DebugFlag).toEqual(test.debug === 'Yes');
  }
}


describe('Tokenizer Test Suite', function(){
  var testSuite = loadTestList('tests.txt');

  _.forEach(testSuite, function(testCase, testNum){
    var test = parseTestCase(testCase);

    if(test.skip === 'Yes'){
      return;
    }

    var testName = test.purpose || _.get(test, 'expect[0]') || (test.pass ? 'Should Pass' : 'Should Fail');

      it('#' + testNum + ' - ' + testName, function(){
        var result = tokenizer.compile(test.source);
        validateResult(test, result);
      });
  });

});
