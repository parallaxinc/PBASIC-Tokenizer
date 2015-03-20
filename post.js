/*global Module: false */

function version(){
  return Module.ccall('Version', 'number');
}

function get32(buffer, starting){
  return buffer[starting] + (buffer[starting + 1] << 8) + (buffer[starting + 2] << 16) + (buffer[starting + 3] << 24);
}

function parse(resultBuffer){

  var TModuleRec = {
    Succeeded: resultBuffer[0],
    //3 padding bytes
    Error: Module.Pointer_stringify(get32(resultBuffer, 4)),
    DebugFlag: resultBuffer[8],
    TargetModule: resultBuffer[9],
    //2 padding bytes
    TargetStart: get32(resultBuffer, 12),
    ProjectFiles: [
      Module.Pointer_stringify(get32(resultBuffer, 16)),
      Module.Pointer_stringify(get32(resultBuffer, 20)),
      Module.Pointer_stringify(get32(resultBuffer, 24)),
      Module.Pointer_stringify(get32(resultBuffer, 28)),
      Module.Pointer_stringify(get32(resultBuffer, 32)),
      Module.Pointer_stringify(get32(resultBuffer, 36)),
      Module.Pointer_stringify(get32(resultBuffer, 40))
    ],
    ProjectFilesStart: [
      get32(resultBuffer, 44),
      get32(resultBuffer, 48),
      get32(resultBuffer, 52),
      get32(resultBuffer, 56),
      get32(resultBuffer, 60),
      get32(resultBuffer, 64),
      get32(resultBuffer, 68)
    ],
    Port: Module.Pointer_stringify(get32(resultBuffer, 72)),
    PortStart: get32(resultBuffer, 76),
    LanguageVersion: get32(resultBuffer, 80),
    LanguageStart: get32(resultBuffer, 84),
    SourceSize: get32(resultBuffer, 88),
    ErrorStart: get32(resultBuffer, 92),
    ErrorLength: get32(resultBuffer, 96),
    EEPROM: resultBuffer.slice(100, 2148),
    EEPROMFlags: resultBuffer.slice(2148, 4196),
    VarCounts: {
      bits: resultBuffer[4196],
      nibbles: resultBuffer[4197],
      bytes: resultBuffer[4198],
      words: resultBuffer[4199]
    },
    PacketCount: resultBuffer[4200],
    PacketBuffer: resultBuffer.slice(4201, 4201 + 2304)
    //3 padding bytes
  };

  return TModuleRec;
}

function compile(program, directivesOnly, parseStampDirective){

  // Allocate space for string and extra '0' at the end
  var buffer = Module._malloc(program.length + 1);

  // Write the string to memory
  Module.writeStringToMemory(program, buffer);

  //sizeof struct in c was 6508
  var data = new Uint8Array(6508);

  data[88] = program.length;

  // Get data byte size, allocate memory on Emscripten heap, and get pointer
  var nDataBytes = data.length * data.BYTES_PER_ELEMENT;
  var dataPtr = Module._malloc(nDataBytes);

  // Copy data to Emscripten heap (directly accessed from Module.HEAPU8)
  var dataHeap = new Uint8Array(Module.HEAPU8.buffer, dataPtr, nDataBytes);
  dataHeap.set(new Uint8Array(data.buffer));

  Module.ccall('Compile', 'number', ['number', 'number', 'number', 'number', 'number'], [dataHeap.byteOffset, buffer, directivesOnly, parseStampDirective, null]);

  var result = new Uint8Array(dataHeap.buffer, dataHeap.byteOffset, data.length);

  var resultBuffer = new Buffer(result);

  var TModuleRec = parse(resultBuffer);

  // Free memory
  Module._free(dataHeap.byteOffset);

  return TModuleRec;
}

function testRecAlignment(){

  //sizeof struct in c was 6508
  var data = new Uint8Array(6508);

  // Get data byte size, allocate memory on Emscripten heap, and get pointer
  var nDataBytes = data.length * data.BYTES_PER_ELEMENT;
  var dataPtr = Module._malloc(nDataBytes);

  // Copy data to Emscripten heap (directly accessed from Module.HEAPU8)
  var dataHeap = new Uint8Array(Module.HEAPU8.buffer, dataPtr, nDataBytes);
  dataHeap.set(new Uint8Array(data.buffer));

  Module.ccall('TestRecAlignment', 'number', ['number'], [dataHeap.byteOffset]);

  var result = new Uint8Array(dataHeap.buffer, dataHeap.byteOffset, data.length);

  var resultBuffer = new Buffer(result);

  var TModuleRec = parse(resultBuffer);

  // Free memory
  Module._free(dataHeap.byteOffset);

  return TModuleRec;
}


module.exports = {
  version: version,
  compile: compile,
  testRecAlignment: testRecAlignment
};
