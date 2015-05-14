/*global Module: false */

//The value returned is in the format: XYY ;where X is the major version number and Y is the minor. For example, if the Version function returned 116, that indicates the version of the tokenizer is 1.16. If Version returned 123, that would indicate the tokenizer is version 1.23
function version(){
  return Module.ccall('Version', 'number');
}

function get32(buffer, starting){
  return buffer[starting] + (buffer[starting + 1] << 8) + (buffer[starting + 2] << 16) + (buffer[starting + 3] << 24);
}

function set32(buffer, starting, value){
  buffer[starting + 3] = (value & 0xFF000000) >> 24;
  buffer[starting + 2] = (value & 0x00FF0000) >> 16;
  buffer[starting + 1] = (value & 0x0000FF00) >> 8;
  buffer[starting] =     (value & 0x000000FF);
}

function parse(resultBuffer){

  var TModuleRec = {
    Succeeded: resultBuffer[0] === 1 ? true : false,
    //3 padding bytes
    Error: Module.Pointer_stringify(get32(resultBuffer, 4)),
    DebugFlag: resultBuffer[8] === 1 ? true : false,
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

//program String, Source code
//directivesOnly Boolean, provides an option of only tokenizing the “compiler directives” from the source code, rather than the entire source. This option is helpful when the calling program needs to determine only the target module, serial port or project files that may be specified by the PBASIC source code.
//targetModule Boolean, provides an option of parsing the Stamp directive from the source code, rather than accepting a value in the TargetModule field of the TModuleRec structure. OPTIONAL. If not provided a valid directive must be found in the Source string.
function compile(program, directivesOnly, targetModule){

  var parseStampDirective = targetModule ? false : true;

  // Allocate space for string and extra '0' at the end
  var buffer = Module._malloc(program.length + 1);

  // Write the string to memory
  Module.writeStringToMemory(program, buffer);

  //sizeof struct in c was 6508
  var data = new Uint8Array(6508);

  data[9] = targetModule | 0;
  set32(data, 88, program.length);

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
