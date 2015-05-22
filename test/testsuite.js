'use strict';

var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var expect = require('expect');
var iconv = require('iconv-lite');

var tokenizer = require('../');

// This regex parses the individual validation arguments at the head.
// Ex:
// 'TARGETMODULE: 4
// 'LANGUAGE: 200
var argRegex = /\n\'(\w+):\s*([^\r\n]+)/g;

// This regex parses the PASS/FAIL header, the FAIL header can have a specific error message that must be present.
// 'FAIL / 144-Expression is too complex / 146/1
var passFailRegex = /\'(PASS|FAIL)\s*\/?([^\n]*)/g;

// This regex parses fields that are referenced by offset.
// 'EEPROM: @2039 $00 $9B $A7 $8E $8D $9C $2F $07 $C0
var valueAtRegex = /@(\d+)\s+([^\n]+)/;

// This regex parses values in an EEPROM/PACKETBUFFER test.
//'PACKETBUFFER: @0 $FF $00 $00 $00 $00 $00 $00 $00 $00 $9B $A7 $8E $8D $9C $2F $07
var hexRegex = /\$([A-Fa-f0-9]+)/g;

/** EXAMPLE TEST CASE:

!'PASS
'DEBUG: No
'TARGETMODULE: 4
'LANGUAGE: 200
'VARIABLES: 8 / 0,0,1,0 / 56,14,7,3
'EEPROM: @2039 $00 $9B $A7 $8E $8D $9C $2F $07 $C0
'PACKETCOUNT: 1
'PACKETBUFFER: @0 $FF $00 $00 $00 $00 $00 $00 $00 $00 $9B $A7 $8E $8D $9C $2F $07
'PACKETBUFFER: @16 $C0 $12

'{$STAMP BS2sx}

Temp  VAR BYTE

PUT 60, Temp+10

**/

function loadTestList(filename){
  console.log('Reading tests from tests.txt...');
  var testFile = path.resolve(__dirname, filename);

  var testData = iconv.decode(fs.readFileSync(testFile), 'ISO-8859-1');

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
      var hex = hexRegex.exec(row);
      while(hex){
        values.push(_.parseInt(hex[1], 16));
        hex = hexRegex.exec(row);
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

    var testName = test.purpose || _.get(test, 'expect[0]') || (test.pass ? 'Should Pass' : 'Should Fail');

    if(test.skip === 'Yes'){
      it.skip('#' + (testNum + 1) + ' - ' + testName, function(){
        var result = tokenizer.compile(test.source);
        validateResult(test, result);
      });
    }else{
      it('#' + (testNum + 1) + ' - ' + testName, function(){
        var result = tokenizer.compile(test.source);
        validateResult(test, result);
      });
    }
  });

});
