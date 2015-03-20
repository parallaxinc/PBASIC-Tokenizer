'use strict';

var expect = require('expect');

var bs2tokenize = require('../');


describe('tokenizer', function(){

  it('#returns version 130', function(done){

    var version = bs2tokenize.version();
    expect(version).toEqual(130);
    done();
  });

  it('#is properly aligned', function(done){

    var EEPROM = new Buffer(2048);
    EEPROM.fill(25);

    var EEPROMFlags = new Buffer(2048);
    EEPROMFlags.fill(26);

    var PacketBuffer = new Buffer(2286);
    PacketBuffer.fill(32);
    PacketBuffer = Buffer.concat([PacketBuffer, new Buffer([0x34, 0x00, 0x35, 0x00, 0x36, 0x00, 0x37, 0x00, 0x38, 0x00, 0x39, 0x00, 0x31, 0x30, 0x00, 0x31, 0x38, 0x00])]);

    var TModuleRec = bs2tokenize.testRecAlignment();
    expect(TModuleRec.Succeeded).toEqual(0);
    expect(TModuleRec.Error).toEqual('');
    expect(TModuleRec.DebugFlag).toEqual(1);
    expect(TModuleRec.TargetModule).toEqual(2);
    expect(TModuleRec.TargetStart).toEqual(3);
    expect(TModuleRec.ProjectFiles).toEqual(['4', '5', '6', '7', '8', '9', '10']);
    expect(TModuleRec.ProjectFilesStart).toEqual([11, 12, 13, 14, 15, 16, 17]);
    expect(TModuleRec.Port).toEqual('18');
    expect(TModuleRec.PortStart).toEqual(19);
    expect(TModuleRec.LanguageVersion).toEqual(20);
    expect(TModuleRec.LanguageStart).toEqual(21);
    expect(TModuleRec.SourceSize).toEqual(22);
    expect(TModuleRec.ErrorStart).toEqual(23);
    expect(TModuleRec.ErrorLength).toEqual(24);
    expect(TModuleRec.VarCounts).toEqual({bits: 27, nibbles: 28, bytes: 29, words: 30});
    expect(TModuleRec.EEPROM).toEqual(EEPROM);
    expect(TModuleRec.EEPROMFlags).toEqual(EEPROMFlags);
    expect(TModuleRec.PacketCount).toEqual(31);
    expect(TModuleRec.PacketBuffer).toEqual(PacketBuffer);

    done();
  });

  it('#successfuly compiles', function(done){

    var program = '\'{$STAMP BS2}\n' +
    'Counter VAR BYTE\n' +
    'FOR Counter = 1 to 20\n' +
    '  PULSOUT 0,50000\n' +
    '  PAUSE 250\n' +
    'NEXT\n' +
    'STOP';

    var empty = new Buffer(2000);
    empty.fill(0);

    var empty2 = new Buffer(2268);
    empty2.fill(0);

    var EEPROM = new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x14, 0x20, 0x8C, 0x0E, 0xD8, 0xC8, 0x0E, 0x60, 0x4A, 0xAE, 0xE8, 0x9F, 0x49, 0xC1, 0x50, 0xC3, 0x6F, 0x8D, 0xD1, 0x03, 0x07, 0xC0]);
    EEPROM = Buffer.concat([empty, EEPROM]);

    var EEPROMFlags = new Buffer([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83, 0x83]);
    EEPROMFlags = Buffer.concat([empty, EEPROMFlags]);

    var PacketBuffer = new Buffer([0xFE, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x14, 0x20, 0x8C, 0x0E, 0xD8, 0xC8, 0x7C, 0xFF, 0x0E, 0x60, 0x4A, 0xAE, 0xE8, 0x9F, 0x49, 0xC1, 0x50, 0xC3, 0x6F, 0x8D, 0xD1, 0x03, 0x07, 0xC0, 0x60]);
    PacketBuffer = Buffer.concat([PacketBuffer, empty2]);

    var TModuleRec = bs2tokenize.compile(program, false, true);

    expect(TModuleRec.Succeeded).toEqual(1);
    expect(TModuleRec.Error).toEqual('');
    expect(TModuleRec.DebugFlag).toEqual(0);
    expect(TModuleRec.TargetModule).toEqual(2);
    expect(TModuleRec.TargetStart).toEqual(9);
    expect(TModuleRec.LanguageVersion).toEqual(200);
    expect(TModuleRec.LanguageStart).toEqual(0);
    expect(TModuleRec.VarCounts).toEqual({bits: 0, nibbles: 0, bytes: 1, words: 0});
    expect(TModuleRec.EEPROM).toEqual(EEPROM);
    expect(TModuleRec.EEPROMFlags).toEqual(EEPROMFlags);
    expect(TModuleRec.PacketCount).toEqual(2);
    expect(TModuleRec.PacketBuffer).toEqual(PacketBuffer);

    done();
  });

it('#returns an error string', function(done){

  var program = '\'{$STAMP BS2}\n' +
  ' VAR BYTE\n' + //should be  'Counter VAR BYTE\n' +
  'FOR Counter = 1 to 20\n' +
  '  PULSOUT 0,50000\n' +
  '  PAUSE 250\n' +
  'NEXT\n' +
  'STOP';

  var TModuleRec = bs2tokenize.compile(program, false, true);

  expect(TModuleRec.Succeeded).toEqual(0);
  expect(TModuleRec.Error).toEqual('149-Expected a label, variable, or instruction');
  expect(TModuleRec.DebugFlag).toEqual(0);
  expect(TModuleRec.TargetModule).toEqual(2);
  expect(TModuleRec.TargetStart).toEqual(9);
  expect(TModuleRec.LanguageVersion).toEqual(200);
  expect(TModuleRec.LanguageStart).toEqual(0);
  done();
});

});
