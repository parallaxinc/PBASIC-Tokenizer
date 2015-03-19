
function version(cb){
  cb(null, Module.ccall('Version', 'number'));
}

function compile(myString, cb){
   
  // Allocate space for string and extra '0' at the end
  var buffer = Module._malloc(myString.length+1);
   
  // Write the string to memory
  Module.writeStringToMemory(myString, buffer);
   
  //sizeof struct in c was 6508
  var data = new Uint8Array(6508);
  
  data[88]=myString.length;
   
  // Get data byte size, allocate memory on Emscripten heap, and get pointer
  var nDataBytes = data.length * data.BYTES_PER_ELEMENT;
  var dataPtr = Module._malloc(nDataBytes);
   
  // Copy data to Emscripten heap (directly accessed from Module.HEAPU8)
  var dataHeap = new Uint8Array(Module.HEAPU8.buffer, dataPtr, nDataBytes);
  dataHeap.set(new Uint8Array(data.buffer));
   
  var status = Module.ccall('Compile', 'number', ['number', 'number', 'number', 'number', 'number'], [dataHeap.byteOffset, buffer, 0, 1, null]);
   
  var result = new Uint8Array(dataHeap.buffer, dataHeap.byteOffset, data.length);
  
  var resultBuffer = new Buffer(result);
  var hex = resultBuffer.slice(4201,6250);

  // Free memory
  Module._free(dataHeap.byteOffset);

  //todo, incorrect compile gives error?
  return cb(null, hex);
}

module.exports = {
  version: version,
  compile: compile
};
