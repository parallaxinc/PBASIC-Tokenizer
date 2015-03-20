// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) { return Module['read'](filename, true) };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (process['argv'].length > 1) {
    Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
  } else {
    Module['thisProgram'] = 'unknown-program';
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  this['Module'] = Module;

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WEB) {
    window['Module'] = Module;
  } else {
    Module['load'] = importScripts;
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      assert(args.length == sig.length-1);
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      assert(sig.length == 1);
      assert(('dynCall_' + sig) in Module, 'bad function pointer type - no table for sig \'' + sig + '\'');
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  getAsmConst: function (code, numArgs) {
    // code is a constant string on the heap, so we can cache these
    if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
    var func = Runtime.asmConstCache[code];
    if (func) return func;
    var args = [];
    for (var i = 0; i < numArgs; i++) {
      args.push(String.fromCharCode(36) + i); // $0, $1 etc
    }
    var source = Pointer_stringify(code);
    if (source[0] === '"') {
      // tolerate EM_ASM("..code..") even though EM_ASM(..code..) is correct
      if (source.indexOf('"', 1) === source.length-1) {
        source = source.substr(1, source.length-2);
      } else {
        // something invalid happened, e.g. EM_ASM("..code($0)..", input)
        abort('invalid EM_ASM input |' + source + '|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)');
      }
    }
    try {
      // Module is the only 'upvar', which we provide directly. We also provide FS for legacy support.
      var evalled = eval('(function(Module, FS) { return function(' + args.join(',') + '){ ' + source + ' } })')(Module, typeof FS !== 'undefined' ? FS : null);
    } catch(e) {
      Module.printErr('error in executing inline EM_ASM code: ' + e + ' on: \n\n' + source + '\n\nwith args |' + args + '| (make sure to use the right one out of EM_ASM, EM_ASM_ARGS, etc.)');
      throw e;
    }
    return Runtime.asmConstCache[code] = evalled;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xFF;

      if (buffer.length == 0) {
        if ((code & 0x80) == 0x00) {        // 0xxxxxxx
          return String.fromCharCode(code);
        }
        buffer.push(code);
        if ((code & 0xE0) == 0xC0) {        // 110xxxxx
          needed = 1;
        } else if ((code & 0xF0) == 0xE0) { // 1110xxxx
          needed = 2;
        } else {                            // 11110xxx
          needed = 3;
        }
        return '';
      }

      if (needed) {
        buffer.push(code);
        needed--;
        if (needed > 0) return '';
      }

      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var c4 = buffer[3];
      var ret;
      if (buffer.length == 2) {
        ret = String.fromCharCode(((c1 & 0x1F) << 6)  | (c2 & 0x3F));
      } else if (buffer.length == 3) {
        ret = String.fromCharCode(((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6)  | (c3 & 0x3F));
      } else {
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var codePoint = ((c1 & 0x07) << 18) | ((c2 & 0x3F) << 12) |
                        ((c3 & 0x3F) << 6)  | (c4 & 0x3F);
        ret = String.fromCharCode(
          (((codePoint - 0x10000) / 0x400)|0) + 0xD800,
          (codePoint - 0x10000) % 0x400 + 0xDC00);
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function processJSString(string) {
      /* TODO: use TextEncoder when present,
        var encoder = new TextEncoder();
        encoder['encoding'] = "utf-8";
        var utf8Array = encoder['encode'](aMsg.data);
      */
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16);(assert((((STACKTOP|0) < (STACK_MAX|0))|0))|0); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + (assert(!staticSealed),size))|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + (assert(DYNAMICTOP > 0),size))|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}


Module['Runtime'] = Runtime;









//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try {
      func = eval('_' + ident); // explicit lookup
    } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    assert(returnType !== 'array', 'Return type should not be "array".');
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) Runtime.stackRestore(stack);
    return ret;
  }

  var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }
  var JSsource = {};
  for (var fun in JSfuncs) {
    if (JSfuncs.hasOwnProperty(fun)) {
      // Elements of toCsource are arrays of three items:
      // the code, and the return value
      JSsource[fun] = parseJSFunc(JSfuncs[fun]);
    }
  }

  
  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=' + convertCode.returnValue + ';';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    if (!numericArgs) {
      // If we had a stack, restore it
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["cwrap"] = cwrap;
Module["ccall"] = ccall;


function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    assert(type, 'Must know what type to store in allocate!');

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module['allocate'] = allocate;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }

  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    assert(ptr + i < TOTAL_MEMORY);
    t = HEAPU8[(((ptr)+(i))>>0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;


function stringToUTF16(str, outPtr) {
  for(var i = 0; i < str.length; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[(((outPtr)+(i*2))>>1)]=codeUnit;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[(((outPtr)+(str.length*2))>>1)]=0;
}
Module['stringToUTF16'] = stringToUTF16;


function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;


function stringToUTF32(str, outPtr) {
  var iChar = 0;
  for(var iCodeUnit = 0; iCodeUnit < str.length; ++iCodeUnit) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    var codeUnit = str.charCodeAt(iCodeUnit); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++iCodeUnit);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[(((outPtr)+(iChar*4))>>2)]=codeUnit;
    ++iChar;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[(((outPtr)+(iChar*4))>>2)]=0;
}
Module['stringToUTF32'] = stringToUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var parsed = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    parsed = parse();
  } catch(e) {
    parsed += '?';
  }
  if (parsed.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return parsed;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module['stackTrace'] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return (x+4095)&-4096;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk

function enlargeMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.');
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  Module.printErr('increasing TOTAL_MEMORY to ' + totalMemory + ' to be compliant with the asm.js spec');
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);

// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;

function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))>>0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; i++) {
    assert(str.charCodeAt(i) === str.charCodeAt(i)&0xff);
    HEAP8[(((buffer)+(i))>>0)]=str.charCodeAt(i);
  }
  if (!dontAddNull) HEAP8[(((buffer)+(str.length))>>0)]=0;
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}

// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
var runDependencyTracking = {};

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
    if (runDependencyWatcher === null && typeof setInterval !== 'undefined') {
      // Check for missing dependencies every few seconds
      runDependencyWatcher = setInterval(function() {
        if (ABORT) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
          return;
        }
        var shown = false;
        for (var dep in runDependencyTracking) {
          if (!shown) {
            shown = true;
            Module.printErr('still waiting on run dependencies:');
          }
          Module.printErr('dependency: ' + dep);
        }
        if (shown) {
          Module.printErr('(end of list)');
        }
      }, 10000);
    }
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


var memoryInitializer = null;

// === Body ===





STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 263648;
  /* global initializers */ __ATINIT__.push();
  

/* memory initializer */ allocate([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,48,48,45,83,117,99,99,101,115,115,0,0,0,0,0,49,48,49,45,69,120,112,101,99,116,101,100,32,99,104,97,114,97,99,116,101,114,40,115,41,0,0,0,0,0,0,0,49,48,50,45,69,120,112,101,99,116,101,100,32,116,101,114,109,105,110,97,116,105,110,103,32,34,0,0,0,0,0,0,49,48,51,45,85,110,114,101,99,111,103,110,105,122,101,100,32,99,104,97,114,97,99,116,101,114,0,0,0,0,0,0,49,48,52,45,69,120,112,101,99,116,101,100,32,104,101,120,32,100,105,103,105,116,0,0,49,48,53,45,69,120,112,101,99,116,101,100,32,98,105,110,97,114,121,32,100,105,103,105,116,0,0,0,0,0,0,0,49,48,54,45,83,121,109,98,111,108,32,101,120,99,101,101,100,115,32,51,50,32,99,104,97,114,97,99,116,101,114,115,0,0,0,0,0,0,0,0,49,48,55,45,84,111,111,32,109,97,110,121,32,101,108,101,109,101,110,116,115,0,0,0,49,48,56,45,67,111,110,115,116,97,110,116,32,101,120,99,101,101,100,115,32,49,54,32,100,105,103,105,116,115,0,0,49,48,57,45,67,111,110,115,116,97,110,116,32,101,120,99,101,101,100,115,32,49,54,32,98,105,116,115,0,0,0,0,49,49,48,45,85,110,100,101,102,105,110,101,100,32,115,121,109,98,111,108,0,0,0,0,49,49,49,45,85,110,100,101,102,105,110,101,100,32,108,97,98,101,108,0,0,0,0,0,49,49,50,45,69,120,112,101,99,116,101,100,32,97,32,99,111,110,115,116,97,110,116,0,49,49,51,45,67,97,110,110,111,116,32,100,105,118,105,100,101,32,98,121,32,48,0,0,49,49,52,45,76,111,99,97,116,105,111,110,32,105,115,32,111,117,116,32,111,102,32,114,97,110,103,101,0,0,0,0,49,49,53,45,76,111,99,97,116,105,111,110,32,97,108,114,101,97,100,121,32,99,111,110,116,97,105,110,115,32,100,97,116,97,0,0,0,0,0,0,49,49,54,45,69,120,112,101,99,116,101,100,32,39,63,39,0,0,0,0,0,0,0,0,49,49,55,45,76,97,98,101,108,32,105,115,32,97,108,114,101,97,100,121,32,100,101,102,105,110,101,100,0,0,0,0,49,49,56,45,69,120,112,101,99,116,101,100,32,39,92,39,0,0,0,0,0,0,0,0,49,49,57,45,69,120,112,101,99,116,101,100,32,39,40,39,0,0,0,0,0,0,0,0,49,50,48,45,69,120,112,101,99,116,101,100,32,39,41,39,0,0,0,0,0,0,0,0,49,50,49,45,69,120,112,101,99,116,101,100,32,39,91,39,0,0,0,0,0,0,0,0,49,50,50,45,69,120,112,101,99,116,101,100,32,39,93,39,0,0,0,0,0,0,0,0,50,48,49,45,69,120,112,101,99,116,101,100,32,39,125,39,0,0,0,0,0,0,0,0,50,48,51,45,69,120,112,101,99,116,101,100,32,39,125,39,46,32,32,67,97,110,32,110,111,116,32,115,112,101,99,105,102,121,32,109,111,114,101,32,116,104,97,110,32,55,32,97,100,100,105,116,105,111,110,97,108,32,112,114,111,106,101,99,116,32,102,105,108,101,115,46,0,0,0,0,0,0,0,0,49,50,51,45,83,121,109,98,111,108,32,105,115,32,97,108,114,101,97,100,121,32,100,101,102,105,110,101,100,0,0,0,49,50,52,45,68,97,116,97,32,111,99,99,117,112,105,101,115,32,115,97,109,101,32,108,111,99,97,116,105,111,110,32,97,115,32,112,114,111,103,114,97,109,0,0,0,0,0,0,49,50,53,45,65,114,114,97,121,32,115,105,122,101,32,99,97,110,110,111,116,32,98,101,32,48,0,0,0,0,0,0,49,50,54,45,79,117,116,32,111,102,32,118,97,114,105,97,98,108,101,32,115,112,97,99,101,0,0,0,0,0,0,0,49,50,55,45,69,69,80,82,79,77,32,102,117,108,108,0,49,50,56,45,83,121,109,98,111,108,32,116,97,98,108,101,32,102,117,108,108,0,0,0,49,50,57,45,69,120,112,101,99,116,101,100,32,39,58,39,32,111,114,32,101,110,100,45,111,102,45,108,105,110,101,0,49,51,48,45,69,120,112,101,99,116,101,100,32,39,44,39,44,32,101,110,100,45,111,102,45,108,105,110,101,44,32,111,114,32,39,58,39,0,0,0,49,51,49,45,69,120,112,101,99,116,101,100,32,39,83,84,69,80,39,44,32,101,110,100,45,111,102,45,108,105,110,101,44,32,111,114,32,39,58,39,0,0,0,0,0,0,0,0,49,51,50,45,39,78,69,88,84,39,32,109,117,115,116,32,98,101,32,112,114,101,99,101,100,101,100,32,98,121,32,39,70,79,82,39,0,0,0,0,49,51,51,45,69,120,112,101,99,116,101,100,32,39,44,39,0,0,0,0,0,0,0,0,49,51,52,45,69,120,112,101,99,116,101,100,32,39,44,39,32,111,114,32,39,93,39,0,49,51,53,45,69,120,112,101,99,116,101,100,32,97,32,118,97,114,105,97,98,108,101,0,49,51,54,45,69,120,112,101,99,116,101,100,32,97,32,98,121,116,101,32,118,97,114,105,97,98,108,101,0,0,0,0,49,51,55,45,69,120,112,101,99,116,101,100,32,97,32,118,97,114,105,97,98,108,101,32,109,111,100,105,102,105,101,114,0,0,0,0,0,0,0,0,49,51,56,45,86,97,114,105,97,98,108,101,32,105,115,32,97,108,114,101,97,100,121,32,98,105,116,45,115,105,122,101,0,0,0,0,0,0,0,0,49,51,57,45,69,120,112,101,99,116,101,100,32,97,32,115,109,97,108,108,101,114,45,115,105,122,101,32,118,97,114,105,97,98,108,101,32,109,111,100,105,102,105,101,114,0,0,0,49,52,48,45,86,97,114,105,97,98,108,101,32,109,111,100,105,102,105,101,114,32,105,115,32,111,117,116,45,111,102,45,114,97,110,103,101,0,0,0,49,52,49,45,69,120,112,101,99,116,101,100,32,97,32,99,111,110,115,116,97,110,116,44,32,118,97,114,105,97,98,108,101,44,32,117,110,97,114,121,32,111,112,101,114,97,116,111,114,44,32,111,114,32,39,40,39,0,0,0,0,0,0,0,49,52,50,45,69,120,112,101,99,116,101,100,32,97,32,98,105,110,97,114,121,32,111,112,101,114,97,116,111,114,32,111,114,32,39,41,39,0,0,0,49,52,51,45,69,120,112,101,99,116,101,100,32,97,32,99,111,109,112,97,114,105,115,111,110,32,111,112,101,114,97,116,111,114,32,111,114,32,39,91,39,0,0,0,0,0,0,0,49,52,52,45,69,120,112,114,101,115,115,105,111,110,32,105,115,32,116,111,111,32,99,111,109,112,108,101,120,0,0,0,49,52,53,45,76,105,109,105,116,32,111,102,32,50,53,53,32,71,79,83,85,66,115,32,101,120,99,101,101,100,101,100,0,0,0,0,0,0,0,0,49,52,54,45,76,105,109,105,116,32,111,102,32,49,54,32,110,101,115,116,101,100,32,70,79,82,45,78,69,88,84,32,108,111,111,112,115,32,101,120,99,101,101,100,101,100,0,0,49,52,55,45,76,105,109,105,116,32,111,102,32,54,32,118,97,108,117,101,115,32,101,120,99,101,101,100,101,100,0,0,49,52,56,45,69,120,112,101,99,116,101,100,32,97,32,108,97,98,101,108,0,0,0,0,49,52,57,45,69,120,112,101,99,116,101,100,32,97,32,108,97,98,101,108,44,32,118,97,114,105,97,98,108,101,44,32,111,114,32,105,110,115,116,114,117,99,116,105,111,110,0,0,49,53,48,45,69,120,112,101,99,116,101,100,32,39,61,39,0,0,0,0,0,0,0,0,49,53,49,45,69,120,112,101,99,116,101,100,32,39,84,72,69,78,39,0,0,0,0,0,49,53,50,45,69,120,112,101,99,116,101,100,32,39,84,79,39,0,0,0,0,0,0,0,50,48,52,45,69,120,112,101,99,116,101,100,32,97,32,116,97,114,103,101,116,32,109,111,100,117,108,101,58,32,66,83,50,44,32,66,83,50,69,44,32,66,83,50,83,88,44,32,66,83,50,80,44,32,111,114,32,66,83,50,80,69,0,0,49,53,51,45,69,120,112,101,99,116,101,100,32,97,32,102,105,108,101,110,97,109,101,0,49,53,52,45,69,120,112,101,99,116,101,100,32,97,32,100,105,114,101,99,116,105,118,101,0,0,0,0,0,0,0,0,49,53,53,45,68,117,112,108,105,99,97,116,101,32,100,105,114,101,99,116,105,118,101,0,50,48,56,45,69,120,112,101,99,116,101,100,32,67,79,77,32,80,111,114,116,32,110,97,109,101,58,32,67,79,77,49,44,32,67,79,77,50,44,32,101,116,99,0,0,0,0,0,49,53,54,45,85,110,107,110,111,119,110,32,116,97,114,103,101,116,32,109,111,100,117,108,101,46,32,32,36,83,84,65,77,80,32,100,105,114,101,99,116,105,118,101,32,110,111,116,32,102,111,117,110,100,0,0,49,53,55,45,78,111,116,104,105,110,103,32,116,111,32,116,111,107,101,110,105,122,101,0,49,53,56,45,76,105,109,105,116,32,111,102,32,49,54,32,110,101,115,116,101,100,32,73,70,45,84,72,69,78,32,115,116,97,116,101,109,101,110,116,115,32,101,120,99,101,101,100,101,100,0,0,0,0,0,0,49,53,57,45,39,69,76,83,69,39,32,109,117,115,116,32,98,101,32,112,114,101,99,101,100,101,100,32,98,121,32,39,73,70,39,32,111,114,32,39,67,65,83,69,39,0,0,0,49,54,48,45,39,69,78,68,73,70,39,32,109,117,115,116,32,98,101,32,112,114,101,99,101,100,101,100,32,98,121,32,39,73,70,39,0,0,0,0,49,54,49,45,69,120,112,101,99,116,101,100,32,97,32,108,97,98,101,108,44,32,118,97,114,105,97,98,108,101,44,32,105,110,115,116,114,117,99,116,105,111,110,44,32,111,114,32,39,69,78,68,73,70,39,0,49,54,50,45,69,120,112,101,99,116,101,100,32,97,32,108,97,98,101,108,44,32,118,97,114,105,97,98,108,101,44,32,105,110,115,116,114,117,99,116,105,111,110,44,32,111,114,32,101,110,100,45,111,102,45,108,105,110,101,0,0,0,0,0,49,54,51,45,76,105,109,105,116,32,111,102,32,49,54,32,110,101,115,116,101,100,32,68,79,45,76,79,79,80,32,115,116,97,116,101,109,101,110,116,115,32,101,120,99,101,101,100,101,100,0,0,0,0,0,0,49,54,52,45,39,76,79,79,80,39,32,109,117,115,116,32,98,101,32,112,114,101,99,101,100,101,100,32,98,121,32,39,68,79,39,0,0,0,0,0,49,54,53,45,39,87,72,73,76,69,39,32,111,114,32,39,85,78,84,73,76,39,32,99,111,110,100,105,116,105,111,110,115,32,99,97,110,110,111,116,32,97,112,112,101,97,114,32,97,102,116,101,114,32,98,111,116,104,32,39,68,79,39,32,97,110,100,32,39,76,79,79,80,39,0,0,0,0,0,0,49,54,54,45,69,120,112,101,99,116,101,100,32,39,87,72,73,76,69,39,44,32,39,85,78,84,73,76,39,44,32,101,110,100,45,111,102,45,108,105,110,101,44,32,111,114,32,39,58,39,0,0,0,0,0,0,49,54,55,45,39,69,88,73,84,39,32,111,110,108,121,32,97,108,108,111,119,101,100,32,119,105,116,104,105,110,32,70,79,82,45,78,69,88,84,32,97,110,100,32,68,79,45,76,79,79,80,32,115,116,114,117,99,116,117,114,101,115,0,0,49,54,56,45,39,73,70,39,32,119,105,116,104,111,117,116,32,39,69,78,68,73,70,39,0,0,0,0,0,0,0,0,49,54,57,45,39,70,79,82,39,32,119,105,116,104,111,117,116,32,39,78,69,88,84,39,0,0,0,0,0,0,0,0,49,55,48,45,39,68,79,39,32,119,105,116,104,111,117,116,32,39,76,79,79,80,39,0,49,55,49,45,76,105,109,105,116,32,111,102,32,49,54,32,69,88,73,84,32,115,116,97,116,101,109,101,110,116,115,32,119,105,116,104,105,110,32,108,111,111,112,32,115,116,114,117,99,116,117,114,101,32,101,120,99,101,101,100,101,100,0,0,49,55,50,45,69,120,112,101,99,116,101,100,32,118,97,114,105,97,98,108,101,32,111,114,32,39,87,79,82,68,39,0,49,55,51,45,69,120,112,101,99,116,101,100,32,97,32,119,111,114,100,32,118,97,114,105,97,98,108,101,0,0,0,0,49,55,52,45,76,97,98,101,108,32,105,115,32,109,105,115,115,105,110,103,32,39,58,39,0,0,0,0,0,0,0,0,49,55,53,45,80,105,110,32,110,117,109,98,101,114,32,109,117,115,116,32,98,101,32,48,32,116,111,32,49,53,0,0,49,55,54,45,69,120,112,101,99,116,101,100,32,97,32,108,97,98,101,108,44,32,118,97,114,105,97,98,108,101,44,32,105,110,115,116,114,117,99,116,105,111,110,44,32,111,114,32,39,78,69,88,84,39,0,0,49,55,55,45,69,120,112,101,99,116,101,100,32,97,32,108,97,98,101,108,44,32,118,97,114,105,97,98,108,101,44,32,105,110,115,116,114,117,99,116,105,111,110,44,32,111,114,32,39,76,79,79,80,39,0,0,49,55,56,45,76,105,109,105,116,32,111,102,32,49,54,32,110,101,115,116,101,100,32,83,69,76,69,67,84,32,115,116,97,116,101,109,101,110,116,115,32,101,120,99,101,101,100,101,100,0,0,0,0,0,0,0,49,55,57,45,69,120,112,101,99,116,101,100,32,39,67,65,83,69,39,0,0,0,0,0,49,56,48,45,39,67,65,83,69,39,32,109,117,115,116,32,98,101,32,112,114,101,99,101,100,101,100,32,98,121,32,39,83,69,76,69,67,84,39,0,49,56,49,45,76,105,109,105,116,32,111,102,32,49,54,32,67,65,83,69,32,115,116,97,116,101,109,101,110,116,115,32,119,105,116,104,105,110,32,83,69,76,69,67,84,32,115,116,114,117,99,116,117,114,101,32,101,120,99,101,101,100,101,100,0,0,0,0,0,0,0,0,49,56,50,45,69,120,112,101,99,116,101,100,32,97,32,108,97,98,101,108,44,32,118,97,114,105,97,98,108,101,44,32,105,110,115,116,114,117,99,116,105,111,110,44,32,111,114,32,39,69,78,68,83,69,76,69,67,84,39,0,0,0,0,0,49,56,51,45,39,69,78,68,83,69,76,69,67,84,39,32,109,117,115,116,32,98,101,32,112,114,101,99,101,100,101,100,32,98,121,32,39,83,69,76,69,67,84,39,0,0,0,0,49,56,52,45,39,83,69,76,69,67,84,39,32,119,105,116,104,111,117,116,32,39,69,78,68,83,69,76,69,67,84,39,0,0,0,0,0,0,0,0,49,56,53,45,69,120,112,101,99,116,101,100,32,39,71,79,84,79,39,32,111,114,32,39,71,79,83,85,66,39,0,0,49,56,54,45,67,111,110,115,116,97,110,116,32,99,97,110,110,111,116,32,98,101,32,108,101,115,115,32,116,104,97,110,32,49,0,0,0,0,0,0,49,56,55,45,73,110,118,97,108,105,100,32,80,66,65,83,73,67,32,118,101,114,115,105,111,110,32,110,117,109,98,101,114,46,32,32,77,117,115,116,32,98,101,32,50,46,48,32,111,114,32,50,46,53,0,0,49,56,56,45,69,120,112,101,99,116,101,100,32,110,117,109,98,101,114,44,32,101,100,105,116,111,114,32,100,105,114,101,99,116,105,118,101,44,32,35,68,69,70,73,78,69,39,100,32,115,121,109,98,111,108,44,32,111,114,32,39,45,39,0,49,56,57,45,73,108,108,101,103,97,108,32,111,112,101,114,97,116,111,114,32,105,110,32,99,111,110,100,105,116,105,111,110,97,108,45,99,111,109,112,105,108,101,32,100,105,114,101,99,116,105,118,101,0,0,0,49,57,48,45,69,120,112,101,99,116,101,100,32,35,84,72,69,78,0,0,0,0,0,0,49,57,49,45,39,35,73,70,39,32,119,105,116,104,111,117,116,32,39,35,69,78,68,73,70,39,0,0,0,0,0,0,49,57,50,45,39,35,83,69,76,69,67,84,39,32,119,105,116,104,111,117,116,32,39,35,69,78,68,83,69,76,69,67,84,39,0,0,0,0,0,0,49,57,51,45,39,35,69,76,83,69,39,32,109,117,115,116,32,98,101,32,112,114,101,99,101,100,101,100,32,98,121,32,39,35,73,70,39,0,0,0,49,57,52,45,39,35,69,78,68,73,70,39,32,109,117,115,116,32,98,101,32,112,114,101,99,101,100,101,100,32,98,121,32,39,35,73,70,39,0,0,49,57,53,45,73,108,108,101,103,97,108,32,115,121,109,98,111,108,32,105,110,32,99,111,110,100,105,116,105,111,110,97,108,45,99,111,109,112,105,108,101,32,100,105,114,101,99,116,105,118,101,0,0,0,0,0,49,57,54,45,69,120,112,101,99,116,101,100,32,97,32,117,115,101,114,45,100,101,102,105,110,101,100,32,115,121,109,98,111,108,0,0,0,0,0,0,49,57,55,45,76,105,109,105,116,32,111,102,32,49,54,32,110,101,115,116,101,100,32,35,73,70,45,35,84,72,69,78,32,115,116,97,116,101,109,101,110,116,115,32,101,120,99,101,101,100,101,100,0,0,0,0,49,57,56,45,69,120,112,101,99,116,101,100,32,97,32,99,104,97,114,97,99,116,101,114,32,111,114,32,65,83,67,73,73,32,118,97,108,117,101,0,49,57,57,45,0,0,0,0,50,48,48,45,69,120,112,101,99,116,101,100,32,39,35,69,78,68,73,70,39,0,0,0,50,49,56,45,76,105,109,105,116,32,111,102,32,49,54,32,110,101,115,116,101,100,32,35,83,69,76,69,67,84,32,115,116,97,116,101,109,101,110,116,115,32,101,120,99,101,101,100,101,100,0,0,0,0,0,0,50,49,57,45,69,120,112,101,99,116,101,100,32,39,35,67,65,83,69,39,0,0,0,0,50,50,48,45,39,35,67,65,83,69,39,32,109,117,115,116,32,98,101,32,112,114,101,99,101,100,101,100,32,98,121,32,39,35,83,69,76,69,67,84,39,0,0,0,0,0,0,0,50,50,49,45,39,35,69,78,68,83,69,76,69,67,84,39,32,109,117,115,116,32,98,101,32,112,114,101,99,101,100,101,100,32,98,121,32,39,35,83,69,76,69,67,84,39,0,0,50,50,50,45,69,120,112,101,99,116,101,100,32,97,32,100,101,99,108,97,114,97,116,105,111,110,44,32,114,117,110,45,116,105,109,101,32,115,116,97,116,101,109,101,110,116,44,32,111,114,32,39,35,69,78,68,73,70,39,0,0,0,0,0,50,50,51,45,69,120,112,101,99,116,101,100,32,97,32,100,101,99,108,97,114,97,116,105,111,110,44,32,114,117,110,45,116,105,109,101,32,115,116,97,116,101,109,101,110,116,44,32,111,114,32,39,35,69,78,68,83,69,76,69,67,84,39,0,50,50,52,45,69,120,112,101,99,116,101,100,32,39,35,69,76,83,69,39,0,0,0,0,50,50,53,45,69,120,112,101,99,116,101,100,32,110,117,109,98,101,114,44,32,101,100,105,116,111,114,32,100,105,114,101,99,116,105,118,101,44,32,111,114,32,35,68,69,70,73,78,69,39,100,32,115,121,109,98,111,108,0,0,0,0,0,0,50,50,54,45,69,120,112,101,99,116,101,100,32,115,116,97,116,101,109,101,110,116,115,32,116,111,32,102,111,108,108,111,119,32,112,114,101,118,105,111,117,115,32,39,67,65,83,69,39,0,0,0,0,0,0,0,50,50,55,45,69,120,112,101,99,116,101,100,32,97,32,99,111,110,115,116,97,110,116,44,32,118,97,114,105,97,98,108,101,32,111,114,32,39,87,79,82,68,39,0,0,0,0,0,50,50,56,45,39,69,76,83,69,73,70,39,32,109,117,115,116,32,98,101,32,112,114,101,99,101,100,101,100,32,98,121,32,39,73,70,39,0,0,0,50,50,57,45,76,105,109,105,116,32,111,102,32,49,54,32,69,76,83,69,73,70,32,115,116,97,116,101,109,101,110,116,115,32,119,105,116,104,105,110,32,73,70,32,115,116,114,117,99,116,117,114,101,32,101,120,99,101,101,100,101,100,0,0,50,51,48,45,39,69,76,83,69,73,70,39,32,110,111,116,32,97,108,108,111,119,101,100,32,97,102,116,101,114,32,39,69,76,83,69,39,0,0,0,32,0,0,0,48,0,0,0,80,0,0,0,112,0,0,0,144,0,0,0,168,0,0,0,200,0,0,0,240,0,0,0,8,1,0,0,40,1,0,0,72,1,0,0,96,1,0,0,120,1,0,0,144,1,0,0,168,1,0,0,200,1,0,0,240,1,0,0,8,2,0,0,40,2,0,0,64,2,0,0,88,2,0,0,112,2,0,0,136,2,0,0,160,2,0,0,184,2,0,0,8,3,0,0,40,3,0,0,88,3,0,0,120,3,0,0,152,3,0,0,168,3,0,0,192,3,0,0,224,3,0,0,8,4,0,0,56,4,0,0,96,4,0,0,120,4,0,0,144,4,0,0,168,4,0,0,200,4,0,0,240,4,0,0,24,5,0,0,72,5,0,0,112,5,0,0,176,5,0,0,216,5,0,0,8,6,0,0,40,6,0,0,80,6,0,0,128,6,0,0,160,6,0,0,184,6,0,0,232,6,0,0,0,7,0,0,24,7,0,0,48,7,0,0,112,7,0,0,136,7,0,0,168,7,0,0,192,7,0,0,240,7,0,0,40,8,0,0,64,8,0,0,120,8,0,0,168,8,0,0,208,8,0,0,8,9,0,0,72,9,0,0,128,9,0,0,168,9,0,0,248,9,0,0,48,10,0,0,112,10,0,0,144,10,0,0,176,10,0,0,200,10,0,0,8,11,0,0,40,11,0,0,72,11,0,0,104,11,0,0,136,11,0,0,192,11,0,0,248,11,0,0,48,12,0,0,72,12,0,0,112,12,0,0,184,12,0,0,248,12,0,0,40,13,0,0,80,13,0,0,112,13,0,0,152,13,0,0,208,13,0,0,16,14,0,0,72,14,0,0,96,14,0,0,128,14,0,0,168,14,0,0,208,14,0,0,248,14,0,0,48,15,0,0,88,15,0,0,144,15,0,0,184,15,0,0,192,15,0,0,216,15,0,0,16,16,0,0,40,16,0,0,88,16,0,0,136,16,0,0,200,16,0,0,8,17,0,0,32,17,0,0,96,17,0,0,152,17,0,0,200,17,0,0,240,17,0,0,48,18,0,0,73,78,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,73,78,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,1,0,0,0,0,0,0,0,73,78,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,2,0,0,0,0,0,0,0,73,78,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,3,0,0,0,0,0,0,0,73,78,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,4,0,0,0,0,0,0,0,73,78,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,5,0,0,0,0,0,0,0,73,78,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,6,0,0,0,0,0,0,0,73,78,55,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,7,0,0,0,0,0,0,0,73,78,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,8,0,0,0,0,0,0,0,73,78,57,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,9,0,0,0,0,0,0,0,73,78,49,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,10,0,0,0,0,0,0,0,73,78,49,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,11,0,0,0,0,0,0,0,73,78,49,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,12,0,0,0,0,0,0,0,73,78,49,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,13,0,0,0,0,0,0,0,73,78,49,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,14,0,0,0,0,0,0,0,73,78,49,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,15,0,0,0,0,0,0,0,79,85,84,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,16,0,0,0,0,0,0,0,79,85,84,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,17,0,0,0,0,0,0,0,79,85,84,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,18,0,0,0,0,0,0,0,79,85,84,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,19,0,0,0,0,0,0,0,79,85,84,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,20,0,0,0,0,0,0,0,79,85,84,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,21,0,0,0,0,0,0,0,79,85,84,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,22,0,0,0,0,0,0,0,79,85,84,55,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,23,0,0,0,0,0,0,0,79,85,84,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,24,0,0,0,0,0,0,0,79,85,84,57,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,25,0,0,0,0,0,0,0,79,85,84,49,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,26,0,0,0,0,0,0,0,79,85,84,49,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,27,0,0,0,0,0,0,0,79,85,84,49,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,28,0,0,0,0,0,0,0,79,85,84,49,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,29,0,0,0,0,0,0,0,79,85,84,49,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,30,0,0,0,0,0,0,0,79,85,84,49,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,31,0,0,0,0,0,0,0,68,73,82,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,32,0,0,0,0,0,0,0,68,73,82,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,33,0,0,0,0,0,0,0,68,73,82,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,34,0,0,0,0,0,0,0,68,73,82,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,35,0,0,0,0,0,0,0,68,73,82,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,36,0,0,0,0,0,0,0,68,73,82,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,37,0,0,0,0,0,0,0,68,73,82,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,38,0,0,0,0,0,0,0,68,73,82,55,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,39,0,0,0,0,0,0,0,68,73,82,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,40,0,0,0,0,0,0,0,68,73,82,57,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,41,0,0,0,0,0,0,0,68,73,82,49,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,42,0,0,0,0,0,0,0,68,73,82,49,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,43,0,0,0,0,0,0,0,68,73,82,49,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,44,0,0,0,0,0,0,0,68,73,82,49,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,45,0,0,0,0,0,0,0,68,73,82,49,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,46,0,0,0,0,0,0,0,68,73,82,49,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,47,0,0,0,0,0,0,0,73,78,65,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,1,0,0,0,0,0,0,73,78,66,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,1,1,0,0,0,0,0,0,73,78,67,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,2,1,0,0,0,0,0,0,73,78,68,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,3,1,0,0,0,0,0,0,79,85,84,65,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,4,1,0,0,0,0,0,0,79,85,84,66,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,5,1,0,0,0,0,0,0,79,85,84,67,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,6,1,0,0,0,0,0,0,79,85,84,68,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,7,1,0,0,0,0,0,0,68,73,82,65,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,8,1,0,0,0,0,0,0,68,73,82,66,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,9,1,0,0,0,0,0,0,68,73,82,67,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,10,1,0,0,0,0,0,0,68,73,82,68,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,11,1,0,0,0,0,0,0,73,78,76,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,2,0,0,0,0,0,0,73,78,72,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,1,2,0,0,0,0,0,0,79,85,84,76,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,2,2,0,0,0,0,0,0,79,85,84,72,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,3,2,0,0,0,0,0,0,68,73,82,76,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,4,2,0,0,0,0,0,0,68,73,82,72,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,5,2,0,0,0,0,0,0,66,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,6,2,0,0,0,0,0,0,66,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,7,2,0,0,0,0,0,0,66,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,8,2,0,0,0,0,0,0,66,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,9,2,0,0,0,0,0,0,66,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,10,2,0,0,0,0,0,0,66,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,11,2,0,0,0,0,0,0,66,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,12,2,0,0,0,0,0,0,66,55,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,13,2,0,0,0,0,0,0,66,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,14,2,0,0,0,0,0,0,66,57,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,15,2,0,0,0,0,0,0,66,49,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,16,2,0,0,0,0,0,0,66,49,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,17,2,0,0,0,0,0,0,66,49,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,18,2,0,0,0,0,0,0,66,49,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,19,2,0,0,0,0,0,0,66,49,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,20,2,0,0,0,0,0,0,66,49,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,21,2,0,0,0,0,0,0,66,49,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,22,2,0,0,0,0,0,0,66,49,55,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,23,2,0,0,0,0,0,0,66,49,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,24,2,0,0,0,0,0,0,66,49,57,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,25,2,0,0,0,0,0,0,66,50,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,26,2,0,0,0,0,0,0,66,50,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,27,2,0,0,0,0,0,0,66,50,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,28,2,0,0,0,0,0,0,66,50,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,29,2,0,0,0,0,0,0,66,50,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,30,2,0,0,0,0,0,0,66,50,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,31,2,0,0,0,0,0,0,73,78,83,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,3,0,0,0,0,0,0,79,85,84,83,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,1,3,0,0,0,0,0,0,68,73,82,83,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,2,3,0,0,0,0,0,0,87,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,3,3,0,0,0,0,0,0,87,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,4,3,0,0,0,0,0,0,87,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,5,3,0,0,0,0,0,0,87,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,6,3,0,0,0,0,0,0,87,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,7,3,0,0,0,0,0,0,87,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,8,3,0,0,0,0,0,0,87,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,9,3,0,0,0,0,0,0,87,55,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,10,3,0,0,0,0,0,0,87,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,11,3,0,0,0,0,0,0,87,57,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,12,3,0,0,0,0,0,0,87,49,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
/* memory initializer */ allocate([13,3,0,0,0,0,0,0,87,49,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,14,3,0,0,0,0,0,0,87,49,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,15,3,0,0,0,0,0,0,67,79,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,68,65,84,65,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,22,0,0,0,0,0,0,0,0,0,0,0,86,65,82,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,29,0,0,0,0,0,0,0,0,0,0,0,70,79,82,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,17,0,0,0,0,0,0,0,78,69,88,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,37,0,0,0,0,0,0,0,71,79,84,79,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,21,0,0,0,0,0,0,0,71,79,83,85,66,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,20,0,0,0,0,0,0,0,82,69,84,85,82,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,56,0,0,0,0,0,0,0,73,70,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,25,0,0,0,0,0,0,0,66,82,65,78,67,72,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,1,0,0,0,0,0,0,0,76,79,79,75,85,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,32,0,0,0,0,0,0,0,76,79,79,75,68,79,87,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,31,0,0,0,0,0,0,0,82,65,78,68,79,77,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,53,0,0,0,0,0,0,0,82,69,65,68,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,55,0,0,0,0,0,0,0,87,82,73,84,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,67,0,0,0,0,0,0,0,80,65,85,83,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,42,0,0,0,0,0,0,0,73,78,80,85,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,26,0,0,0,0,0,0,0,79,85,84,80,85,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,39,0,0,0,0,0,0,0,76,79,87,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,34,0,0,0,0,0,0,0,72,73,71,72,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,22,0,0,0,0,0,0,0,84,79,71,71,76,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,66,0,0,0,0,0,0,0,82,69,86,69,82,83,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,57,0,0,0,0,0,0,0,83,69,82,79,85,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,61,0,0,0,0,0,0,0,83,69,82,73,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,60,0,0,0,0,0,0,0,80,85,76,83,79,85,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,49,0,0,0,0,0,0,0,80,85,76,83,73,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,48,0,0,0,0,0,0,0,67,79,85,78,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,4,0,0,0,0,0,0,0,83,72,73,70,84,79,85,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,63,0,0,0,0,0,0,0,83,72,73,70,84,73,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,62,0,0,0,0,0,0,0,82,67,84,73,77,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,54,0,0,0,0,0,0,0,66,85,84,84,79,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,2,0,0,0,0,0,0,0,80,87,77,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,51,0,0,0,0,0,0,0,70,82,69,81,79,85,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,18,0,0,0,0,0,0,0,68,84,77,70,79,85,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,9,0,0,0,0,0,0,0,88,79,85,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,68,0,0,0,0,0,0,0,68,69,66,85,71,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,5,0,0,0,0,0,0,0,83,84,79,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,64,0,0,0,0,0,0,0,78,65,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,36,0,0,0,0,0,0,0,83,76,69,69,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,52,0,0,0,0,0,0,0,69,78,68,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,12,0,0,0,0,0,0,0,36,83,84,65,77,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,80,79,82,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,36,80,66,65,83,73,67,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,66,83,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,2,0,0,0,0,0,0,0,66,83,50,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,3,0,0,0,0,0,0,0,66,83,50,83,88,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,4,0,0,0,0,0,0,0,66,83,50,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,5,0,0,0,0,0,0,0,66,83,50,80,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,6,0,0,0,0,0,0,0,84,79,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,24,0,0,0,0,0,0,0,0,0,0,0,83,84,69,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,23,0,0,0,0,0,0,0,0,0,0,0,84,72,69,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,25,0,0,0,0,0,0,0,0,0,0,0,83,81,82,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,65,66,83,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,1,0,0,0,0,0,0,0,126,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,2,0,0,0,0,0,0,0,68,67,68,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,4,0,0,0,0,0,0,0,78,67,68,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,5,0,0,0,0,0,0,0,67,79,83,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,6,0,0,0,0,0,0,0,83,73,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,7,0,0,0,0,0,0,0,72,89,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,8,0,0,0,0,0,0,0,65,84,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,9,0,0,0,0,0,0,0,38,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,10,0,0,0,0,0,0,0,124,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,11,0,0,0,0,0,0,0,94,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,12,0,0,0,0,0,0,0,77,73,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,13,0,0,0,0,0,0,0,77,65,88,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,14,0,0,0,0,0,0,0,43,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,15,0,0,0,0,0,0,0,45,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,16,0,0,0,0,0,0,0,42,47,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,17,0,0,0,0,0,0,0,42,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,18,0,0,0,0,0,0,0,42,42,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,19,0,0,0,0,0,0,0,47,47,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,20,0,0,0,0,0,0,0,47,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,21,0,0,0,0,0,0,0,68,73,71,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,22,0,0,0,0,0,0,0,60,60,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,23,0,0,0,0,0,0,0,62,62,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,24,0,0,0,0,0,0,0,82,69,86,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,25,0,0,0,0,0,0,0,61,62,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,26,0,0,0,0,0,0,0,62,61,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,26,0,0,0,0,0,0,0,60,61,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,27,0,0,0,0,0,0,0,61,60,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,27,0,0,0,0,0,0,0,61,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,28,0,0,0,0,0,0,0,60,62,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,29,0,0,0,0,0,0,0,62,60,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,29,0,0,0,0,0,0,0,62,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,30,0,0,0,0,0,0,0,60,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,0,0,0,31,0,0,0,0,0,0,0,65,78,68,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,38,0,0,0,10,0,0,0,0,0,0,0,79,82,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,38,0,0,0,11,0,0,0,0,0,0,0,88,79,82,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,38,0,0,0,12,0,0,0,0,0,0,0,78,79,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,39,0,0,0,2,0,0,0,0,0,0,0,66,73,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,78,73,66,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,1,0,0,0,0,0,0,0,66,89,84,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,2,0,0,0,0,0,0,0,87,79,82,68,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,3,0,0,0,0,0,0,0,66,73,84,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,66,73,84,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,1,0,0,0,0,0,0,0,66,73,84,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,2,0,0,0,0,0,0,0,66,73,84,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,3,0,0,0,0,0,0,0,66,73,84,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,4,0,0,0,0,0,0,0,66,73,84,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,5,0,0,0,0,0,0,0,66,73,84,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,6,0,0,0,0,0,0,0,66,73,84,55,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,7,0,0,0,0,0,0,0,66,73,84,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,8,0,0,0,0,0,0,0,66,73,84,57,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,9,0,0,0,0,0,0,0,66,73,84,49,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,10,0,0,0,0,0,0,0,66,73,84,49,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,11,0,0,0,0,0,0,0,66,73,84,49,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,12,0,0,0,0,0,0,0,66,73,84,49,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,13,0,0,0,0,0,0,0,66,73,84,49,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,14,0,0,0,0,0,0,0,66,73,84,49,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,15,0,0,0,0,0,0,0,76,79,87,66,73,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,72,73,71,72,66,73,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,128,0,0,0,0,0,0,0,78,73,66,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,1,0,0,0,0,0,0,78,73,66,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,1,1,0,0,0,0,0,0,78,73,66,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,2,1,0,0,0,0,0,0,78,73,66,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,3,1,0,0,0,0,0,0,76,79,87,78,73,66,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,1,0,0,0,0,0,0,72,73,71,72,78,73,66,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,128,1,0,0,0,0,0,0,66,89,84,69,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,2,0,0,0,0,0,0,66,89,84,69,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,1,2,0,0,0,0,0,0,76,79,87,66,89,84,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,2,0,0,0,0,0,0,72,73,71,72,66,89,84,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,128,2,0,0,0,0,0,0,65,83,67,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,30,0,0,0,0,0,0,0,0,0,0,0,83,84,82,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,35,0,0,0,0,0,0,0,0,0,0,0,82,69,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,0,0,0,0,0,0,0,0,0,0,0,83,75,73,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,33,0,0,0,0,0,0,0,0,0,0,0,87,65,73,84,83,84,82,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,0,0,0,0,0,0,0,0,0,0,0,87,65,73,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,36,0,0,0,0,0,0,0,0,0,0,0,78,85,77,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,0,0,0,6,17,0,0,0,0,0,0,83,78,85,77,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,0,0,0,6,21,0,0,0,0,0,0,68,69,67,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,182,1,0,0,0,0,0,0,68,69,67,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,246,3,0,0,0,0,0,0,68,69,67,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,230,3,0,0,0,0,0,0,68,69,67,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,214,3,0,0,0,0,0,0,68,69,67,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,198,3,0,0,0,0,0,0,68,69,67,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,182,3,0,0,0,0,0,0,83,68,69,67,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,182,5,0,0,0,0,0,0,83,68,69,67,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,246,7,0,0,0,0,0,0,83,68,69,67,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,230,7,0,0,0,0,0,0,83,68,69,67,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,214,7,0,0,0,0,0,0,83,68,69,67,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,198,7,0,0,0,0,0,0,83,68,69,67,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,182,7,0,0,0,0,0,0,72,69,88,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,192,1,0,0,0,0,0,0,72,69,88,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,240,3,0,0,0,0,0,0,72,69,88,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,224,3,0,0,0,0,0,0,72,69,88,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,208,3,0,0,0,0,0,0,72,69,88,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,192,3,0,0,0,0,0,0,83,72,69,88,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,192,5,0,0,0,0,0,0,83,72,69,88,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,240,7,0,0,0,0,0,0,83,72,69,88,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,224,7,0,0,0,0,0,0,83,72,69,88,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,208,7,0,0,0,0,0,0,83,72,69,88,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,192,7,0,0,0,0,0,0,73,72,69,88,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,192,9,0,0,0,0,0,0,73,72,69,88,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,240,11,0,0,0,0,0,0,73,72,69,88,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,224,11,0,0,0,0,0,0,73,72,69,88,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,208,11,0,0,0,0,0,0,73,72,69,88,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,192,11,0,0,0,0,0,0,73,83,72,69,88,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,192,13,0,0,0,0,0,0,73,83,72,69,88,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,240,15,0,0,0,0,0,0,73,83,72,69,88,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,224,15,0,0,0,0,0,0,73,83,72,69,88,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,208,15,0,0,0,0,0,0,73,83,72,69,88,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,192,15,0,0,0,0,0,0,66,73,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,14,1,0,0,0,0,0,0,66,73,78,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,254,3,0,0,0,0,0,0,66,73,78,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,238,3,0,0,0,0,0,0,66,73,78,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,222,3,0,0,0,0,0,0,66,73,78,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,206,3,0,0,0,0,0,0,66,73,78,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,190,3,0,0,0,0,0,0,66,73,78,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,174,3,0,0,0,0,0,0,66,73,78,55,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,158,3,0,0,0,0,0,0,66,73,78,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,142,3,0,0,0,0,0,0,66,73,78,57,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,126,3,0,0,0,0,0,0,66,73,78,49,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,110,3,0,0,0,0,0,0,66,73,78,49,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,94,3,0,0,0,0,0,0,66,73,78,49,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,78,3,0,0,0,0,0,0,66,73,78,49,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,62,3,0,0,0,0,0,0,66,73,78,49,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,46,3,0,0,0,0,0,0,66,73,78,49,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,30,3,0,0,0,0,0,0,66,73,78,49,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,14,3,0,0,0,0,0,0,83,66,73,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,14,5,0,0,0,0,0,0,83,66,73,78,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,254,7,0,0,0,0,0,0,83,66,73,78,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,238,7,0,0,0,0,0,0,83,66,73,78,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,222,7,0,0,0,0,0,0,83,66,73,78,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,206,7,0,0,0,0,0,0,83,66,73,78,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,190,7,0,0,0,0,0,0,83,66,73,78,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,174,7,0,0,0,0,0,0,83,66,73,78,55,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,158,7,0,0,0,0,0,0,83,66,73,78,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,142,7,0,0,0,0,0,0,83,66,73,78,57,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,126,7,0,0,0,0,0,0,83,66,73,78,49,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,110,7,0,0,0,0,0,0,83,66,73,78,49,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,94,7,0,0,0,0,0,0,83,66,73,78,49,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,78,7,0,0,0,0,0,0,83,66,73,78,49,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,62,7,0,0,0,0,0,0,83,66,73,78,49,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,46,7,0,0,0,0,0,0,83,66,73,78,49,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,30,7,0,0,0,0,0,0,83,66,73,78,49,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,14,7,0,0,0,0,0,0,73,66,73,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,14,9,0,0,0,0,0,0,73,66,73,78,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,254,11,0,0,0,0,0,0,73,66,73,78,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,238,11,0,0,0,0,0,0,73,66,73,78,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,222,11,0,0,0,0,0,0,73,66,73,78,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,206,11,0,0,0,0,0,0,73,66,73,78,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,190,11,0,0,0,0,0,0,73,66,73,78,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,174,11,0,0,0,0,0,0,73,66,73,78,55,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,158,11,0,0,0,0,0,0,73,66,73,78,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,142,11,0,0,0,0,0,0,73,66,73,78,57,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,126,11,0,0,0,0,0,0,73,66,73,78,49,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,110,11,0,0,0,0,0,0,73,66,73,78,49,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,94,11,0,0,0,0,0,0,73,66,73,78,49,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,78,11,0,0,0,0,0,0,73,66,73,78,49,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,62,11,0,0,0,0,0,0,73,66,73,78,49,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,46,11,0,0,0,0,0,0,73,66,73,78,49,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,30,11,0,0,0,0,0,0,73,66,73,78,49,54], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+10240);
/* memory initializer */ allocate([31,0,0,0,14,11,0,0,0,0,0,0,73,83,66,73,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,14,13,0,0,0,0,0,0,73,83,66,73,78,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,254,15,0,0,0,0,0,0,73,83,66,73,78,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,238,15,0,0,0,0,0,0,73,83,66,73,78,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,222,15,0,0,0,0,0,0,73,83,66,73,78,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,206,15,0,0,0,0,0,0,73,83,66,73,78,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,190,15,0,0,0,0,0,0,73,83,66,73,78,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,174,15,0,0,0,0,0,0,73,83,66,73,78,55,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,158,15,0,0,0,0,0,0,73,83,66,73,78,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,142,15,0,0,0,0,0,0,73,83,66,73,78,57,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,126,15,0,0,0,0,0,0,73,83,66,73,78,49,48,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,110,15,0,0,0,0,0,0,73,83,66,73,78,49,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,94,15,0,0,0,0,0,0,73,83,66,73,78,49,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,78,15,0,0,0,0,0,0,73,83,66,73,78,49,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,62,15,0,0,0,0,0,0,73,83,66,73,78,49,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,46,15,0,0,0,0,0,0,73,83,66,73,78,49,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,30,15,0,0,0,0,0,0,73,83,66,73,78,49,54,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,31,0,0,0,14,15,0,0,0,0,0,0,46,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,13,0,0,0,0,0,0,0,0,0,0,0,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,15,0,0,0,0,0,0,0,0,0,0,0,92,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,0,0,0,0,0,0,0,0,0,0,0,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17,0,0,0,0,0,0,0,0,0,0,0,40,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,18,0,0,0,0,0,0,0,0,0,0,0,41,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,40,0,0,0,0,0,0,0,0,0,0,0,91,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,19,0,0,0,0,0,0,0,0,0,0,0,93,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,41,0,0,0,0,0,0,0,0,0,0,0,67,76,83,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,72,79,77,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,1,0,0,0,0,0,0,0,66,69,76,76,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,7,0,0,0,0,0,0,0,66,75,83,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,8,0,0,0,0,0,0,0,84,65,66,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,9,0,0,0,0,0,0,0,67,82,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,13,0,0,0,0,0,0,0,85,78,73,84,79,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,18,0,0,0,0,0,0,0,85,78,73,84,79,70,70,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,26,0,0,0,0,0,0,0,85,78,73,84,83,79,70,70,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,28,0,0,0,0,0,0,0,76,73,71,72,84,83,79,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,20,0,0,0,0,0,0,0,68,73,77,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,30,0,0,0,0,0,0,0,66,82,73,71,72,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,22,0,0,0,0,0,0,0,76,83,66,70,73,82,83,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,77,83,66,70,73,82,83,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,1,0,0,0,0,0,0,0,77,83,66,80,82,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,76,83,66,80,82,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,1,0,0,0,0,0,0,0,77,83,66,80,79,83,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,2,0,0,0,0,0,0,0,76,83,66,80,79,83,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,3,0,0,0,0,0,0,0,252,0,0,0,71,69,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,19,0,0,0,0,0,0,0,252,0,0,0,80,85,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,50,0,0,0,0,0,0,0,252,0,0,0,82,85,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,58,0,0,0,0,0,0,0,240,0,0,0,76,67,68,73,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,29,0,0,0,0,0,0,0,240,0,0,0,76,67,68,79,85,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,30,0,0,0,0,0,0,0,240,0,0,0,76,67,68,67,77,68,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,28,0,0,0,0,0,0,0,240,0,0,0,73,50,67,73,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,23,0,0,0,0,0,0,0,240,0,0,0,73,50,67,79,85,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,24,0,0,0,0,0,0,0,240,0,0,0,80,79,76,76,73,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,43,0,0,0,0,0,0,0,240,0,0,0,80,79,76,76,79,85,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,45,0,0,0,0,0,0,0,240,0,0,0,79,87,73,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,40,0,0,0,0,0,0,0,240,0,0,0,79,87,79,85,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,41,0,0,0,0,0,0,0,240,0,0,0,73,79,84,69,82,77,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,27,0,0,0,0,0,0,0,240,0,0,0,83,84,79,82,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,65,0,0,0,0,0,0,0,240,0,0,0,80,79,76,76,87,65,73,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,47,0,0,0,0,0,0,0,240,0,0,0,80,79,76,76,82,85,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,46,0,0,0,0,0,0,0,240,0,0,0,77,65,73,78,73,79,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,35,0,0,0,0,0,0,0,240,0,0,0,65,85,88,73,79,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,240,0,0,0,80,79,76,76,77,79,68,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,44,0,0,0,0,0,0,0,240,0,0,0,83,80,83,84,82,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,34,0,0,0,0,0,0,0,0,0,0,0,190,0,0,0,80,73,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,28,0,0,0,0,0,0,0,0,0,0,0,190,0,0,0,68,79,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,8,0,0,0,0,0,0,0,190,0,0,0,69,88,73,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,16,0,0,0,0,0,0,0,190,0,0,0,76,79,79,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,33,0,0,0,0,0,0,0,190,0,0,0,85,78,84,73,76,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,27,0,0,0,0,0,0,0,0,0,0,0,190,0,0,0,87,72,73,76,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,26,0,0,0,0,0,0,0,0,0,0,0,190,0,0,0,35,68,69,70,73,78,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,7,0,0,0,0,0,0,0,190,0,0,0,35,69,82,82,79,82,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,15,0,0,0,0,0,0,0,190,0,0,0,35,73,70,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,25,0,0,0,0,0,0,0,190,0,0,0,35,84,72,69,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,21,0,0,0,0,0,0,0,0,0,0,0,190,0,0,0,69,76,83,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,10,0,0,0,0,0,0,0,190,0,0,0,69,76,83,69,73,70,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,11,0,0,0,0,0,0,0,190,0,0,0,35,69,76,83,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,10,0,0,0,0,0,0,0,190,0,0,0,69,78,68,73,70,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,13,0,0,0,0,0,0,0,190,0,0,0,35,69,78,68,73,70,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,13,0,0,0,0,0,0,0,190,0,0,0,83,69,76,69,67,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,59,0,0,0,0,0,0,0,190,0,0,0,35,83,69,76,69,67,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,59,0,0,0,0,0,0,0,190,0,0,0,67,65,83,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,3,0,0,0,0,0,0,0,190,0,0,0,35,67,65,83,69,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,3,0,0,0,0,0,0,0,190,0,0,0,69,78,68,83,69,76,69,67,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,14,0,0,0,0,0,0,0,190,0,0,0,35,69,78,68,83,69,76,69,67,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,14,0,0,0,0,0,0,0,190,0,0,0,79,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,38,0,0,0,0,0,0,0,190,0,0,0,68,69,66,85,71,73,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,6,0,0,0,0,0,0,0,190,0,0,0,67,82,83,82,88,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,2,0,0,0,0,0,0,0,190,0,0,0,67,82,83,82,76,70,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,3,0,0,0,0,0,0,0,190,0,0,0,67,82,83,82,82,84,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,4,0,0,0,0,0,0,0,190,0,0,0,67,82,83,82,85,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,5,0,0,0,0,0,0,0,190,0,0,0,67,82,83,82,68,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,6,0,0,0,0,0,0,0,190,0,0,0,76,70,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,10,0,0,0,0,0,0,0,190,0,0,0,67,76,82,69,79,76,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,11,0,0,0,0,0,0,0,190,0,0,0,67,76,82,68,78,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,12,0,0,0,0,0,0,0,190,0,0,0,67,82,83,82,88,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,14,0,0,0,0,0,0,0,190,0,0,0,67,82,83,82,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,15,0,0,0,0,0,0,0,0,0,0,0,52,32,53,32,54,32,55,32,56,32,57,32,49,48,32,49,56], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+20508);
/* memory initializer */ allocate([1,0,0,0,2,0,0,0,4,0,0,0,8,0,0,0,16,0,0,0,32,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,10,0,0,0,16,0,0,0,0,0,0,0,46,0,0,0,0,0,0,0,36,83,84,65,77,80,0,0,36,80,79,82,84,0,0,0,36,80,66,65,83,73,67,0,67,79,77], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+250308);
/* memory initializer */ allocate([2,1,1,0,0,0,0,0,1,4,8,16,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,2,2,2,2,2,3,3,3,3,3,4,4,4,4,4,5,5,5,5,5,6,6,6,6,6,7,7,7,7,7,8,8,8,8,8,9,9,9,9,9,10,10,10,10,10,11,11,11,11,11,12,12,12,12,12,13,13,13,13,13,14,14,14,14,14,15,15,15,15,15,16,16,16,16,16,17,17,17,17,17,18,18,18,18,18,19,19,19,19,19,20,20,20,20,20,21,21,21,21,21,22,22,22,22,22,23,23,23,23,23,24,24,24,24,24,25,25,25,25,25,26,29,29,31,31,27,26,26,26,26,28,27,27,27,27,29,28,28,28,28,30,30,30,29,29,31,31,31,30,30,32,32,32,32,32,33,33,33,33,33,34,34,34,34,34,35,35,35,35,35,36,36,36,36,36,37,37,37,37,37,38,38,38,38,38,39,39,39,39,39,40,40,40,40,40,41,41,41,41,41,42,42,42,42,42,43,43,43,43,43,44,44,44,44,44,45,45,45,45,45,46,46,46,46,46,47,47,47,47,47,48,48,48,48,48,49,49,49,49,49,50,50,50,50,50,51,51,51,51,51,52,52,52,52,52,53,53,53,53,53,54,54,54,54,54,55,55,55,55,55,56,56,56,56,56,57,57,57,57,57,58,58,58,58,58,59,59,59,59,59,60,60,60,60,60,61,61,61,61,61,62,62,62,62,62,63,63,63,63,63], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+258680);




var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}


  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }

  
  
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value;
      return value;
    }
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

   
  Module["_memset"] = _memset;

  function ___errno_location() {
      return ___errno_state;
    }

  function _abort() {
      Module['abort']();
    }

  
  
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          stream.tty.ops.flush(stream.tty);
        },flush:function (stream) {
          stream.tty.ops.flush(stream.tty);
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              result = process['stdin']['read']();
              if (!result) {
                if (process['stdin']['_readableState'] && process['stdin']['_readableState']['ended']) {
                  return null;  // EOF
                }
                return undefined;  // no data available
              }
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          }
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          }
        }}};
  
  var MEMFS={ops_table:null,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.buffer.byteLength which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },getFileDataAsRegularArray:function (node) {
        if (node.contents && node.contents.subarray) {
          var arr = [];
          for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
          return arr; // Returns a copy of the original data.
        }
        return node.contents; // No-op, the file contents are already in a JS array. Return as-is.
      },getFileDataAsTypedArray:function (node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },expandFileStorage:function (node, newCapacity) {
  
        // If we are asked to expand the size of a file that already exists, revert to using a standard JS array to store the file
        // instead of a typed array. This makes resizing the array more flexible because we can just .push() elements at the back to
        // increase the size.
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
          node.contents = MEMFS.getFileDataAsRegularArray(node);
          node.usedBytes = node.contents.length; // We might be writing to a lazy-loaded file which had overridden this property, so force-reset it.
        }
  
        if (!node.contents || node.contents.subarray) { // Keep using a typed array if creating a new storage, or if old one was a typed array as well.
          var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
          if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
          // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
          // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
          // avoid overshooting the allocation cap by a very large margin.
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) | 0);
          if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
          var oldContents = node.contents;
          node.contents = new Uint8Array(newCapacity); // Allocate new storage.
          if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
          return;
        }
        // Not using a typed array to back the file storage. Use a standard JS array instead.
        if (!node.contents && newCapacity > 0) node.contents = [];
        while (node.contents.length < newCapacity) node.contents.push(0);
      },resizeFileStorage:function (node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
          return;
        }
  
        if (!node.contents || node.contents.subarray) { // Resize a typed array if that is being used as the backing store.
          var oldContents = node.contents;
          node.contents = new Uint8Array(new ArrayBuffer(newSize)); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
          return;
        }
        // Backing with a JS array.
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize;
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) { // Can we just reuse the buffer we are given?
              assert(position === 0, 'canOwn must imply no weird position inside the file');
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); // Use typed array write if available.
          else
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          node.usedBytes = Math.max(node.usedBytes, position+length);
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < stream.node.usedBytes) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        if (typeof indexedDB !== 'undefined') return indexedDB;
        var ret = null;
        if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, 'IDBFS used, but indexedDB not supported');
        return ret;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          fileStore.createIndex('timestamp', 'timestamp', { unique: false });
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function() {
          callback(this.error);
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function() { callback(this.error); };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
          // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
          node.contents = MEMFS.getFileDataAsTypedArray(node);
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.chmod(path, entry.mode);
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function() { callback(this.error); };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function() { callback(this.error); };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function() { done(this.error); };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so 
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          if (length === 0) return 0; // node errors on 0 length reads
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
  
      /*
      // Disabled, see https://github.com/kripken/emscripten/issues/2770
      stream = FS.getStreamFromPtr(stream);
      if (stream.stream_ops.flush) {
        stream.stream_ops.flush(stream);
      }
      */
    }var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
              
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); }
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); }
            }
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        var err = FS.nodePermissions(dir, 'x');
        if (err) return err;
        if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
        return 0;
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },getStreamFromPtr:function (ptr) {
        return FS.streams[ptr - 1];
      },getPtrForStream:function (stream) {
        return stream ? stream.fd + 1 : 0;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        try {
          if (FS.trackingDelegate['willMovePath']) {
            FS.trackingDelegate['willMovePath'](old_path, new_path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
        try {
          if (FS.trackingDelegate['onMovePath']) FS.trackingDelegate['onMovePath'](old_path, new_path);
        } catch(e) {
          console.log("FS.trackingDelegate['onMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return link.node_ops.readlink(link);
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        if (path === "") {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var err = FS.mayOpen(node, flags);
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        try {
          if (FS.trackingDelegate['onOpenFile']) {
            var trackingFlags = 0;
            if ((flags & 2097155) !== 1) {
              trackingFlags |= FS.tracking.openFlags.READ;
            }
            if ((flags & 2097155) !== 0) {
              trackingFlags |= FS.tracking.openFlags.WRITE;
            }
            FS.trackingDelegate['onOpenFile'](path, trackingFlags);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['onOpenFile']('"+path+"', flags) threw an exception: " + e.message);
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
          if (stream.path && FS.trackingDelegate['onWriteToFile']) FS.trackingDelegate['onWriteToFile'](stream.path);
        } catch(e) {
          console.log("FS.trackingDelegate['onWriteToFile']('"+path+"') threw an exception: " + e.message);
        }
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = '';
          var utf8 = new Runtime.UTF8Processor();
          for (var i = 0; i < length; i++) {
            ret += utf8.processCChar(buf[i]);
          }
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var utf8 = new Runtime.UTF8Processor();
          var buf = new Uint8Array(utf8.processJSString(data));
          FS.write(stream, buf, 0, buf.length, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        var random_device;
        if (typeof crypto !== 'undefined') {
          // for modern web browsers
          var randomBuffer = new Uint8Array(1);
          random_device = function() { crypto.getRandomValues(randomBuffer); return randomBuffer[0]; };
        } else if (ENVIRONMENT_IS_NODE) {
          // for nodejs
          random_device = function() { return require('crypto').randomBytes(1)[0]; };
        } else {
          // default for ES5 platforms
          random_device = function() { return (Math.random()*256)|0; };
        }
        FS.createDevice('/dev', 'random', random_device);
        FS.createDevice('/dev', 'urandom', random_device);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=FS.getPtrForStream(stdin);
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=FS.getPtrForStream(stdout);
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=FS.getPtrForStream(stderr);
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
          this.node = node;
          this.setErrno = function(errno) {
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          };
          this.setErrno(errno);
          this.message = ERRNO_MESSAGES[errno];
          if (this.stack) this.stack = demangleAll(this.stack);
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        }
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        }
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var chunkSize = 1024*1024; // Chunk size in bytes
  
          if (!hasByteServing) chunkSize = datalength;
  
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
  
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = this;
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
  
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperty(node, "usedBytes", {
            get: function() { return this.contents.length; }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        console.error('emscripten_set_main_loop_timing: Cannot set timing mode for main loop since a main loop does not exist! Call emscripten_set_main_loop first to set one up.');
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
          setTimeout(Browser.mainLoop.runner, value); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      }
      return 0;
    }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg) {
      Module['noExitRuntime'] = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
  
        if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
          Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          Browser.mainLoop.method = ''; // just warn once per call to set main loop
        }
  
        Browser.mainLoop.runIter(function() {
          if (typeof arg !== 'undefined') {
            Runtime.dynCall('vi', func, [arg]);
          } else {
            Runtime.dynCall('v', func);
          }
        });
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
      else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
      Browser.mainLoop.scheduler();
  
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function () {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function (func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          assert(typeof url == 'string', 'createObjectURL must return a url as a string');
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            assert(typeof url == 'string', 'createObjectURL must return a url as a string');
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
          
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && canvas.requestPointerLock) {
                canvas.requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          contextHandle = GL.createContext(canvas, contextAttributes);
          if (contextHandle) {
            ctx = GL.getContext(contextHandle).GLctx;
          }
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
        
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvasContainer.requestFullScreen();
      },nextRAF:0,fakeRequestAnimationFrame:function (func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          Browser.fakeRequestAnimationFrame(func);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           Browser.fakeRequestAnimationFrame;
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (!ABORT) func();
        });
      },safeSetTimeout:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setTimeout(function() {
          if (!ABORT) func();
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setInterval(function() {
          if (!ABORT) func();
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll': 
            delta = event.detail;
            break;
          case 'mousewheel': 
            delta = event.wheelDelta;
            break;
          case 'wheel': 
            delta = event['deltaY'];
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
          // If this assert lands, it's likely because the browser doesn't support scrollX or pageXOffset
          // and we have no viable fallback.
          assert((typeof scrollX !== 'undefined') && (typeof scrollY !== 'undefined'), 'Unable to retrieve scroll position, mouse positions likely broken.');
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              Browser.lastTouches[touch.identifier] = Browser.touches[touch.identifier];
              Browser.touches[touch.identifier] = { x: adjustedX, y: adjustedY };
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

   
  Module["_strcpy"] = _strcpy;

   
  Module["_strlen"] = _strlen;

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

   
  Module["_strncpy"] = _strncpy;
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });TTY.utf8 = new Runtime.UTF8Processor();
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");



Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array };
Module.asmLibraryArg = { "abort": abort, "assert": assert, "min": Math_min, "_fflush": _fflush, "_sysconf": _sysconf, "_abort": _abort, "___setErrNo": ___setErrNo, "_sbrk": _sbrk, "_time": _time, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_emscripten_set_main_loop": _emscripten_set_main_loop, "___errno_location": ___errno_location, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "NaN": NaN, "Infinity": Infinity };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'almost asm';
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = +env.NaN, inf = +env.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var abort=env.abort;
  var assert=env.assert;
  var Math_min=env.min;
  var _fflush=env._fflush;
  var _sysconf=env._sysconf;
  var _abort=env._abort;
  var ___setErrNo=env.___setErrNo;
  var _sbrk=env._sbrk;
  var _time=env._time;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var ___errno_location=env.___errno_location;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS
function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
STACKTOP = (STACKTOP + 15)&-16;
if ((STACKTOP|0) >= (STACK_MAX|0)) abort();

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
  HEAP8[tempDoublePtr+4>>0] = HEAP8[ptr+4>>0];
  HEAP8[tempDoublePtr+5>>0] = HEAP8[ptr+5>>0];
  HEAP8[tempDoublePtr+6>>0] = HEAP8[ptr+6>>0];
  HEAP8[tempDoublePtr+7>>0] = HEAP8[ptr+7>>0];
}
function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _TestRecAlignment($Rec) {
 $Rec = $Rec|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0;
 var $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0;
 var $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0;
 var $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0;
 var $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $Idx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $Rec;
 $1 = $0;
 HEAP32[8>>2] = $1;
 $2 = HEAP32[8>>2]|0;
 $3 = (($2) + 4201|0);
 $4 = (($3) + 2304|0);
 $5 = (($4) + -18|0);
 (_strcpy(($5|0),(25352|0))|0);
 $Idx = 2287;
 while(1) {
  $6 = $Idx;
  $7 = ($6>>>0)<(2304);
  if (!($7)) {
   break;
  }
  $8 = $Idx;
  $9 = HEAP32[8>>2]|0;
  $10 = (($9) + 4201|0);
  $11 = (($10) + ($8)|0);
  HEAP8[$11>>0] = 0;
  $12 = $Idx;
  $13 = ($12>>>0)>(2296);
  if ($13) {
   $14 = $Idx;
   $15 = (($14) + 1)|0;
   $Idx = $15;
  }
  $16 = $Idx;
  $17 = (($16) + 2)|0;
  $Idx = $17;
 }
 $18 = HEAP32[8>>2]|0;
 HEAP8[$18>>0] = 0;
 $19 = HEAP32[8>>2]|0;
 $20 = (($19) + 4|0);
 HEAP32[$20>>2] = 0;
 $21 = HEAP32[8>>2]|0;
 $22 = (($21) + 8|0);
 HEAP8[$22>>0] = 1;
 $23 = HEAP32[8>>2]|0;
 $24 = (($23) + 9|0);
 HEAP8[$24>>0] = 2;
 $25 = HEAP32[8>>2]|0;
 $26 = (($25) + 12|0);
 HEAP32[$26>>2] = 3;
 $Idx = 0;
 while(1) {
  $27 = $Idx;
  $28 = ($27|0)<(7);
  if (!($28)) {
   break;
  }
  $29 = HEAP32[8>>2]|0;
  $30 = (($29) + 4201|0);
  $31 = $Idx;
  $32 = $31<<1;
  $33 = (($30) + ($32)|0);
  $34 = (($33) + 2304|0);
  $35 = (($34) + -18|0);
  $36 = $Idx;
  $37 = HEAP32[8>>2]|0;
  $38 = (($37) + 16|0);
  $39 = (($38) + ($36<<2)|0);
  HEAP32[$39>>2] = $35;
  $40 = $Idx;
  $41 = (($40) + 1)|0;
  $Idx = $41;
 }
 $42 = HEAP32[8>>2]|0;
 $43 = (($42) + 44|0);
 HEAP32[$43>>2] = 11;
 $44 = HEAP32[8>>2]|0;
 $45 = (($44) + 44|0);
 $46 = (($45) + 4|0);
 HEAP32[$46>>2] = 12;
 $47 = HEAP32[8>>2]|0;
 $48 = (($47) + 44|0);
 $49 = (($48) + 8|0);
 HEAP32[$49>>2] = 13;
 $50 = HEAP32[8>>2]|0;
 $51 = (($50) + 44|0);
 $52 = (($51) + 12|0);
 HEAP32[$52>>2] = 14;
 $53 = HEAP32[8>>2]|0;
 $54 = (($53) + 44|0);
 $55 = (($54) + 16|0);
 HEAP32[$55>>2] = 15;
 $56 = HEAP32[8>>2]|0;
 $57 = (($56) + 44|0);
 $58 = (($57) + 20|0);
 HEAP32[$58>>2] = 16;
 $59 = HEAP32[8>>2]|0;
 $60 = (($59) + 44|0);
 $61 = (($60) + 24|0);
 HEAP32[$61>>2] = 17;
 $62 = HEAP32[8>>2]|0;
 $63 = (($62) + 4201|0);
 $64 = (($63) + 2304|0);
 $65 = (($64) + -3|0);
 $66 = HEAP32[8>>2]|0;
 $67 = (($66) + 72|0);
 HEAP32[$67>>2] = $65;
 $68 = HEAP32[8>>2]|0;
 $69 = (($68) + 76|0);
 HEAP32[$69>>2] = 19;
 $70 = HEAP32[8>>2]|0;
 $71 = (($70) + 80|0);
 HEAP32[$71>>2] = 20;
 $72 = HEAP32[8>>2]|0;
 $73 = (($72) + 84|0);
 HEAP32[$73>>2] = 21;
 $74 = HEAP32[8>>2]|0;
 $75 = (($74) + 88|0);
 HEAP32[$75>>2] = 22;
 $76 = HEAP32[8>>2]|0;
 $77 = (($76) + 92|0);
 HEAP32[$77>>2] = 23;
 $78 = HEAP32[8>>2]|0;
 $79 = (($78) + 96|0);
 HEAP32[$79>>2] = 24;
 $Idx = 0;
 while(1) {
  $80 = $Idx;
  $81 = ($80|0)<(2048);
  if (!($81)) {
   break;
  }
  $82 = $Idx;
  $83 = HEAP32[8>>2]|0;
  $84 = (($83) + 100|0);
  $85 = (($84) + ($82)|0);
  HEAP8[$85>>0] = 25;
  $86 = $Idx;
  $87 = (($86) + 1)|0;
  $Idx = $87;
 }
 $Idx = 0;
 while(1) {
  $88 = $Idx;
  $89 = ($88|0)<(2048);
  if (!($89)) {
   break;
  }
  $90 = $Idx;
  $91 = HEAP32[8>>2]|0;
  $92 = (($91) + 2148|0);
  $93 = (($92) + ($90)|0);
  HEAP8[$93>>0] = 26;
  $94 = $Idx;
  $95 = (($94) + 1)|0;
  $Idx = $95;
 }
 $96 = HEAP32[8>>2]|0;
 $97 = (($96) + 4196|0);
 HEAP8[$97>>0] = 27;
 $98 = HEAP32[8>>2]|0;
 $99 = (($98) + 4196|0);
 $100 = (($99) + 1|0);
 HEAP8[$100>>0] = 28;
 $101 = HEAP32[8>>2]|0;
 $102 = (($101) + 4196|0);
 $103 = (($102) + 2|0);
 HEAP8[$103>>0] = 29;
 $104 = HEAP32[8>>2]|0;
 $105 = (($104) + 4196|0);
 $106 = (($105) + 3|0);
 HEAP8[$106>>0] = 30;
 $107 = HEAP32[8>>2]|0;
 $108 = (($107) + 4200|0);
 HEAP8[$108>>0] = 31;
 $Idx = 0;
 while(1) {
  $109 = $Idx;
  $110 = ($109>>>0)<(2286);
  if (!($110)) {
   break;
  }
  $111 = $Idx;
  $112 = HEAP32[8>>2]|0;
  $113 = (($112) + 4201|0);
  $114 = (($113) + ($111)|0);
  HEAP8[$114>>0] = 32;
  $115 = $Idx;
  $116 = (($115) + 1)|0;
  $Idx = $116;
 }
 STACKTOP = sp;return 1;
}
function _Version() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = sp;return -126;
}
function _Compile($Rec,$Src,$DirectivesOnly,$ParseStampDirective,$Ref) {
 $Rec = $Rec|0;
 $Src = $Src|0;
 $DirectivesOnly = $DirectivesOnly|0;
 $ParseStampDirective = $ParseStampDirective|0;
 $Ref = $Ref|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $Rec;
 $1 = $Src;
 $2 = $DirectivesOnly;
 $3 = $ParseStampDirective;
 $4 = $Ref;
 $5 = $0;
 HEAP32[8>>2] = $5;
 $6 = $1;
 HEAP32[16>>2] = $6;
 $7 = $4;
 HEAP32[24>>2] = $7;
 __Z13InitializeRecv();
 $8 = $3;
 HEAP8[238416>>0] = $8;
 $9 = HEAP8[238416>>0]|0;
 $10 = ($9<<24>>24)!=(0);
 if ($10) {
  $11 = HEAP32[8>>2]|0;
  $12 = (($11) + 9|0);
  HEAP8[$12>>0] = 0;
 }
 $13 = HEAP32[8>>2]|0;
 $14 = (($13) + 80|0);
 HEAP32[$14>>2] = 200;
 HEAP8[238424>>0] = 0;
 $15 = HEAP32[8>>2]|0;
 HEAP8[$15>>0] = 0;
 $16 = (__Z11InitSymbolsv()|0);
 $17 = ($16|0)!=(0);
 if ($17) {
  $69 = HEAP32[8>>2]|0;
  $70 = HEAP8[$69>>0]|0;
  STACKTOP = sp;return ($70|0);
 }
 $18 = (__Z10Elementizeh(0)|0);
 $19 = ($18|0)!=(0);
 if (!($19)) {
  $20 = (__Z23CompileEditorDirectivesv()|0);
  $21 = ($20|0)!=(0);
  if (!($21)) {
   $22 = $2;
   $23 = ($22<<24>>24)!=(0);
   if ($23) {
    $64 = HEAP32[8>>2]|0;
    $65 = (($64) + 92|0);
    HEAP32[$65>>2] = 0;
    $66 = HEAP32[8>>2]|0;
    $67 = (($66) + 96|0);
    HEAP32[$67>>2] = 0;
    $68 = HEAP32[8>>2]|0;
    HEAP8[$68>>0] = 1;
   } else {
    $24 = (__Z13AdjustSymbolsv()|0);
    $25 = ($24|0)!=(0);
    if (!($25)) {
     $26 = (__Z10Elementizeh(1)|0);
     $27 = ($26|0)!=(0);
     if (!($27)) {
      $28 = (__Z19CompileCCDirectivesv()|0);
      $29 = ($28|0)!=(0);
      if (!($29)) {
       $30 = (__Z11CompilePinsh(0)|0);
       $31 = ($30|0)!=(0);
       if (!($31)) {
        $32 = (__Z16CompileConstantsh(0)|0);
        $33 = ($32|0)!=(0);
        if (!($33)) {
         $34 = (__Z11CompileDatah(0)|0);
         $35 = ($34|0)!=(0);
         if (!($35)) {
          $36 = (__Z16CompileConstantsh(1)|0);
          $37 = ($36|0)!=(0);
          if (!($37)) {
           $38 = (__Z11CompilePinsh(1)|0);
           $39 = ($38|0)!=(0);
           if (!($39)) {
            $40 = (__Z11CompileDatah(1)|0);
            $41 = ($40|0)!=(0);
            if (!($41)) {
             $42 = (__Z10CompileVarh(0)|0);
             $43 = ($42|0)!=(0);
             if (!($43)) {
              $44 = (__Z10CompileVarh(1)|0);
              $45 = ($44|0)!=(0);
              if (!($45)) {
               $46 = (__Z11CountGosubsv()|0);
               $47 = ($46|0)!=(0);
               if (!($47)) {
                $48 = (__Z19CompileInstructionsv()|0);
                $49 = ($48|0)!=(0);
                if (!($49)) {
                 $50 = (__Z23PatchRemainingAddressesv()|0);
                 $51 = ($50|0)!=(0);
                 if (!($51)) {
                  __Z14PreparePacketsv();
                  $52 = HEAP32[8>>2]|0;
                  $53 = (($52) + 92|0);
                  HEAP32[$53>>2] = 0;
                  $54 = HEAP32[8>>2]|0;
                  $55 = (($54) + 96|0);
                  HEAP32[$55>>2] = 0;
                  $56 = HEAP32[8>>2]|0;
                  $57 = (($56) + 4200|0);
                  $58 = HEAP8[$57>>0]|0;
                  $59 = $58&255;
                  $60 = ($59|0)==(0);
                  do {
                   if ($60) {
                    $61 = $2;
                    $62 = ($61<<24>>24)!=(0);
                    if ($62) {
                     label = 24;
                     break;
                    }
                    (__Z5Error10TErrorCode(61)|0);
                   } else {
                    label = 24;
                   }
                  } while(0);
                  if ((label|0) == 24) {
                   $63 = HEAP32[8>>2]|0;
                   HEAP8[$63>>0] = 1;
                  }
                 }
                }
               }
              }
             }
            }
           }
          }
         }
        }
       }
      }
     }
    }
   }
  }
 }
 $69 = HEAP32[8>>2]|0;
 $70 = HEAP8[$69>>0]|0;
 STACKTOP = sp;return ($70|0);
}
function __Z13InitializeRecv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $Idx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = HEAP32[8>>2]|0;
 $1 = (($0) + 4|0);
 HEAP32[$1>>2] = 0;
 $Idx = 0;
 while(1) {
  $2 = $Idx;
  $3 = ($2>>>0)<=(7);
  if (!($3)) {
   break;
  }
  $4 = $Idx;
  $5 = HEAP32[8>>2]|0;
  $6 = (($5) + 16|0);
  $7 = (($6) + ($4<<2)|0);
  HEAP32[$7>>2] = 0;
  $8 = $Idx;
  $9 = HEAP32[8>>2]|0;
  $10 = (($9) + 44|0);
  $11 = (($10) + ($8<<2)|0);
  HEAP32[$11>>2] = 0;
  $12 = $Idx;
  $13 = (($12) + 1)|0;
  $Idx = $13;
 }
 $14 = HEAP32[8>>2]|0;
 $15 = (($14) + 12|0);
 HEAP32[$15>>2] = 0;
 $16 = HEAP32[8>>2]|0;
 $17 = (($16) + 72|0);
 HEAP32[$17>>2] = 0;
 $18 = HEAP32[8>>2]|0;
 $19 = (($18) + 76|0);
 HEAP32[$19>>2] = 0;
 $20 = HEAP32[8>>2]|0;
 $21 = (($20) + 84|0);
 HEAP32[$21>>2] = 0;
 __Z11ClearEEPROMv();
 __Z20ClearSrcTokReferencev();
 STACKTOP = sp;return;
}
function __Z11InitSymbolsv() {
 var $$byval_copy = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Idx = 0, $Result = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy = sp + 64|0;
 $1 = sp;
 $Idx = 0;
 while(1) {
  $2 = $Idx;
  $3 = ($2|0)<(1024);
  if (!($3)) {
   break;
  }
  $4 = $Idx;
  $5 = (242120 + ($4<<2)|0);
  HEAP32[$5>>2] = -1;
  $6 = $Idx;
  $7 = (25400 + (($6*48)|0)|0);
  $8 = (($7) + 44|0);
  HEAP32[$8>>2] = -1;
  $9 = $Idx;
  $10 = (246216 + ($9<<2)|0);
  HEAP32[$10>>2] = -1;
  $11 = $Idx;
  $12 = (74560 + (($11*40)|0)|0);
  $13 = (($12) + 36|0);
  HEAP32[$13>>2] = -1;
  $14 = $Idx;
  $15 = (($14) + 1)|0;
  $Idx = $15;
 }
 HEAP32[25392>>2] = 0;
 HEAP32[74552>>2] = 0;
 $Idx = 0;
 while(1) {
  $16 = $Idx;
  $17 = ($16>>>0)<(363);
  if (!($17)) {
   label = 11;
   break;
  }
  $18 = $Idx;
  $19 = (5168 + (($18*48)|0)|0);
  dest=$1+0|0; src=$19+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
  dest=$$byval_copy+0|0; src=$1+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
  $20 = (__Z11EnterSymbol12TSymbolTable($$byval_copy)|0);
  $Result = $20;
  $21 = ($20|0)!=(0);
  if ($21) {
   label = 8;
   break;
  }
  $23 = $Idx;
  $24 = (($23) + 1)|0;
  $Idx = $24;
 }
 if ((label|0) == 8) {
  $22 = $Result;
  $0 = $22;
  $25 = $0;
  STACKTOP = sp;return ($25|0);
 }
 else if ((label|0) == 11) {
  $0 = 0;
  $25 = $0;
  STACKTOP = sp;return ($25|0);
 }
 return (0)|0;
}
function __Z10Elementizeh($LastPass) {
 $LastPass = $LastPass|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0;
 var $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0;
 var $97 = 0, $98 = 0, $99 = 0, $Number = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Number = sp + 8|0;
 $1 = $LastPass;
 $2 = HEAP32[8>>2]|0;
 $3 = (($2) + 88|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($4|0)>(0);
 if ($5) {
  $6 = $1;
  $7 = ($6<<24>>24)!=(0);
  if (!($7)) {
   HEAP32[250352>>2] = 0;
   while(1) {
    $8 = HEAP32[250352>>2]|0;
    $9 = HEAP32[8>>2]|0;
    $10 = (($9) + 88|0);
    $11 = HEAP32[$10>>2]|0;
    $12 = ($8|0)<($11|0);
    if (!($12)) {
     break;
    }
    $13 = HEAP32[250352>>2]|0;
    $14 = HEAP32[16>>2]|0;
    $15 = (($14) + ($13)|0);
    $16 = HEAP8[$15>>0]|0;
    $17 = $16 << 24 >> 24;
    $18 = ($17|0)>=(0);
    if ($18) {
     $19 = HEAP32[250352>>2]|0;
     $20 = HEAP32[16>>2]|0;
     $21 = (($20) + ($19)|0);
     $22 = HEAP8[$21>>0]|0;
     $23 = $22 << 24 >> 24;
     $24 = ($23|0)<=(8);
     if ($24) {
      label = 9;
     } else {
      label = 7;
     }
    } else {
     label = 7;
    }
    if ((label|0) == 7) {
     label = 0;
     $25 = HEAP32[250352>>2]|0;
     $26 = HEAP32[16>>2]|0;
     $27 = (($26) + ($25)|0);
     $28 = HEAP8[$27>>0]|0;
     $29 = $28 << 24 >> 24;
     $30 = ($29|0)>=(10);
     if ($30) {
      $31 = HEAP32[250352>>2]|0;
      $32 = HEAP32[16>>2]|0;
      $33 = (($32) + ($31)|0);
      $34 = HEAP8[$33>>0]|0;
      $35 = $34 << 24 >> 24;
      $36 = ($35|0)<=(31);
      if ($36) {
       label = 9;
      }
     }
    }
    if ((label|0) == 9) {
     label = 0;
     $37 = HEAP32[250352>>2]|0;
     $38 = HEAP32[16>>2]|0;
     $39 = (($38) + ($37)|0);
     HEAP8[$39>>0] = 3;
    }
    $40 = HEAP32[250352>>2]|0;
    $41 = (($40) + 1)|0;
    HEAP32[250352>>2] = $41;
   }
  }
 }
 $42 = HEAP32[8>>2]|0;
 $43 = (($42) + 88|0);
 $44 = HEAP32[$43>>2]|0;
 $45 = HEAP32[16>>2]|0;
 $46 = (($45) + ($44)|0);
 HEAP8[$46>>0] = 3;
 HEAP32[250352>>2] = 0;
 HEAP16[238720>>1] = 0;
 HEAP16[115520>>1] = 0;
 HEAP8[250360>>0] = 1;
 L18: while(1) {
  $47 = HEAP32[250352>>2]|0;
  $48 = HEAP32[8>>2]|0;
  $49 = (($48) + 88|0);
  $50 = HEAP32[$49>>2]|0;
  $51 = ($47|0)<($50|0);
  if (!($51)) {
   label = 98;
   break;
  }
  $52 = HEAP32[250352>>2]|0;
  $53 = $52&65535;
  HEAP16[250344>>1] = $53;
  $54 = HEAP32[250352>>2]|0;
  $55 = HEAP32[16>>2]|0;
  $56 = (($55) + ($54)|0);
  $57 = HEAP8[$56>>0]|0;
  HEAP8[250368>>0] = $57;
  $58 = HEAP32[250352>>2]|0;
  $59 = (($58) + 1)|0;
  HEAP32[250352>>2] = $59;
  $60 = $1;
  $61 = ($60<<24>>24)!=(0);
  if ($61) {
   $62 = HEAP8[250368>>0]|0;
   $63 = $62&255;
   do {
    switch ($63|0) {
    case 3:  {
     $64 = HEAP32[250392>>2]|0;
     $65 = (__Z12EnterElement12TElementTypeth($64,0,1)|0);
     $Result = $65;
     $66 = ($65|0)!=(0);
     if ($66) {
      label = 18;
      break L18;
     }
     break;
    }
    case 32: case 9: case 0:  {
     break;
    }
    case 44:  {
     $68 = (__Z12EnterElement12TElementTypeth(14,0,0)|0);
     $Result = $68;
     $69 = ($68|0)!=(0);
     if ($69) {
      label = 22;
      break L18;
     }
     $71 = HEAP8[238424>>0]|0;
     HEAP8[250360>>0] = $71;
     break;
    }
    case 58:  {
     HEAP8[250360>>0] = 0;
     $72 = HEAP32[250392>>2]|0;
     $73 = (__Z12EnterElement12TElementTypeth($72,1,1)|0);
     $Result = $73;
     $74 = ($73|0)!=(0);
     if ($74) {
      label = 25;
      break L18;
     }
     break;
    }
    case 39:  {
     $76 = HEAP32[250392>>2]|0;
     $77 = (__Z12EnterElement12TElementTypeth($76,0,1)|0);
     $Result = $77;
     $78 = ($77|0)!=(0);
     if ($78) {
      label = 28;
      break L18;
     }
     __Z9SkipToEndv();
     break;
    }
    case 34:  {
     $80 = (__Z9GetStringv()|0);
     $Result = $80;
     $81 = ($80|0)!=(0);
     if ($81) {
      label = 31;
      break L18;
     }
     break;
    }
    case 37:  {
     $83 = (__Z9GetNumber5TBasehPt(0,0,$Number)|0);
     $Result = $83;
     $84 = ($83|0)!=(0);
     if ($84) {
      label = 34;
      break L18;
     }
     $86 = HEAP16[$Number>>1]|0;
     $87 = (__Z12EnterElement12TElementTypeth(12,$86,0)|0);
     $Result = $87;
     $88 = ($87|0)!=(0);
     if ($88) {
      label = 36;
      break L18;
     }
     break;
    }
    case 36:  {
     $90 = (__Z9GetSymbolv()|0);
     $Result = $90;
     $91 = ($90|0)!=(0);
     if ($91) {
      label = 39;
      break L18;
     }
     $93 = HEAP8[238424>>0]|0;
     $94 = ($93<<24>>24)!=(0);
     if ($94) {
      $95 = HEAP32[((238728 + 36|0))>>2]|0;
      $96 = ($95|0)==(46);
      if ($96) {
       label = 42;
      }
     } else {
      label = 42;
     }
     if ((label|0) == 42) {
      label = 0;
      $97 = HEAP16[238720>>1]|0;
      $98 = (($97) + -1)<<16>>16;
      HEAP16[238720>>1] = $98;
      $99 = HEAP16[250344>>1]|0;
      $100 = $99&65535;
      $101 = (($100) + 1)|0;
      HEAP32[250352>>2] = $101;
      $102 = (__Z9GetNumber5TBasehPt(2,0,$Number)|0);
      $Result = $102;
      $103 = ($102|0)!=(0);
      if ($103) {
       label = 43;
       break L18;
      }
      $105 = HEAP16[$Number>>1]|0;
      $106 = (__Z12EnterElement12TElementTypeth(12,$105,0)|0);
      $Result = $106;
      $107 = ($106|0)!=(0);
      if ($107) {
       label = 45;
       break L18;
      }
     }
     break;
    }
    case 57: case 56: case 55: case 54: case 53: case 52: case 51: case 50: case 49: case 48:  {
     $109 = (__Z9GetNumber5TBasehPt(1,0,$Number)|0);
     $Result = $109;
     $110 = ($109|0)!=(0);
     if ($110) {
      label = 49;
      break L18;
     }
     $112 = HEAP16[$Number>>1]|0;
     $113 = (__Z12EnterElement12TElementTypeth(12,$112,0)|0);
     $Result = $113;
     $114 = ($113|0)!=(0);
     if ($114) {
      label = 51;
      break L18;
     }
     break;
    }
    case 35:  {
     $116 = HEAP8[238424>>0]|0;
     $117 = ($116<<24>>24)!=(0);
     if (!($117)) {
      label = 54;
      break L18;
     }
     $119 = (__Z9GetSymbolv()|0);
     $Result = $119;
     $120 = ($119|0)!=(0);
     if ($120) {
      label = 56;
      break L18;
     }
     $122 = HEAP32[((238728 + 36|0))>>2]|0;
     $123 = ($122|0)==(46);
     if ($123) {
      label = 58;
      break L18;
     }
     break;
    }
    default: {
     $125 = HEAP8[250368>>0]|0;
     $126 = $125&255;
     $127 = ($126|0)==(95);
     do {
      if ($127) {
       label = 65;
      } else {
       $128 = HEAP8[250368>>0]|0;
       $129 = $128&255;
       $130 = ($129|0)>=(65);
       if ($130) {
        $131 = HEAP8[250368>>0]|0;
        $132 = $131&255;
        $133 = ($132|0)<=(90);
        if ($133) {
         label = 65;
         break;
        }
       }
       $134 = HEAP8[250368>>0]|0;
       $135 = $134&255;
       $136 = ($135|0)>=(97);
       if ($136) {
        $137 = HEAP8[250368>>0]|0;
        $138 = $137&255;
        $139 = ($138|0)<=(122);
        if ($139) {
         label = 65;
         break;
        }
       }
       $143 = HEAP8[250368>>0]|0;
       HEAP8[238728>>0] = $143;
       HEAP8[((238728 + 1|0))>>0] = 0;
       HEAP8[((238728 + 2|0))>>0] = 0;
       while(1) {
        $144 = HEAP32[250352>>2]|0;
        $145 = HEAP32[16>>2]|0;
        $146 = (($145) + ($144)|0);
        $147 = HEAP8[$146>>0]|0;
        $148 = $147 << 24 >> 24;
        $149 = ($148|0)==(9);
        if ($149) {
         $242 = 1;
        } else {
         $150 = HEAP32[250352>>2]|0;
         $151 = HEAP32[16>>2]|0;
         $152 = (($151) + ($150)|0);
         $153 = HEAP8[$152>>0]|0;
         $154 = $153 << 24 >> 24;
         $155 = ($154|0)==(32);
         $242 = $155;
        }
        if (!($242)) {
         break;
        }
        $156 = HEAP32[250352>>2]|0;
        $157 = (($156) + 1)|0;
        HEAP32[250352>>2] = $157;
       }
       $158 = HEAP32[250352>>2]|0;
       $159 = HEAP32[16>>2]|0;
       $160 = (($159) + ($158)|0);
       $161 = HEAP8[$160>>0]|0;
       $162 = $161 << 24 >> 24;
       $163 = ($162|0)>(0);
       if ($163) {
        $164 = HEAP32[250352>>2]|0;
        $165 = HEAP32[16>>2]|0;
        $166 = (($165) + ($164)|0);
        $167 = HEAP8[$166>>0]|0;
        HEAP8[((238728 + 1|0))>>0] = $167;
        $168 = HEAP32[250352>>2]|0;
        $169 = (($168) + 1)|0;
        HEAP32[250352>>2] = $169;
        $170 = (__Z10FindSymbolP12TSymbolTable(238728)|0);
        $171 = ($170<<24>>24)!=(0);
        if ($171) {
         $172 = HEAP32[((238728 + 36|0))>>2]|0;
         $173 = HEAP16[((238728 + 40|0))>>1]|0;
         $174 = (__Z12EnterElement12TElementTypeth($172,$173,0)|0);
         $Result = $174;
         $175 = ($174|0)!=(0);
         if ($175) {
          label = 76;
          break L18;
         }
        } else {
         $177 = HEAP16[250344>>1]|0;
         $178 = $177&65535;
         $179 = (($178) + 1)|0;
         HEAP32[250352>>2] = $179;
         HEAP8[((238728 + 1|0))>>0] = 0;
        }
       }
       $180 = (_strlen((238728|0))|0);
       $181 = ($180>>>0)<(2);
       if ($181) {
        $182 = (__Z10FindSymbolP12TSymbolTable(238728)|0);
        $183 = ($182<<24>>24)!=(0);
        if (!($183)) {
         label = 85;
         break L18;
        }
        $184 = HEAP32[((238728 + 36|0))>>2]|0;
        $185 = HEAP16[((238728 + 40|0))>>1]|0;
        $186 = (__Z12EnterElement12TElementTypeth($184,$185,0)|0);
        $Result = $186;
        $187 = ($186|0)!=(0);
        if ($187) {
         label = 83;
         break L18;
        }
       }
      }
     } while(0);
     if ((label|0) == 65) {
      label = 0;
      $140 = (__Z9GetSymbolv()|0);
      $Result = $140;
      $141 = ($140|0)!=(0);
      if ($141) {
       label = 66;
       break L18;
      }
     }
    }
    }
   } while(0);
  } else {
   $190 = HEAP8[250368>>0]|0;
   $191 = $190&255;
   $192 = ($191|0)==(39);
   if ($192) {
    $193 = HEAP32[250392>>2]|0;
    $194 = (__Z12EnterElement12TElementTypeth($193,0,1)|0);
    $Result = $194;
    $195 = ($194|0)!=(0);
    if ($195) {
     label = 92;
     break;
    }
    $197 = (__Z12GetDirectivev()|0);
    $Result = $197;
    $198 = ($197|0)!=(0);
    if ($198) {
     label = 94;
     break;
    }
   }
  }
 }
 switch (label|0) {
  case 18: {
   $67 = $Result;
   $0 = $67;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 22: {
   $70 = $Result;
   $0 = $70;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 25: {
   $75 = $Result;
   $0 = $75;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 28: {
   $79 = $Result;
   $0 = $79;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 31: {
   $82 = $Result;
   $0 = $82;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 34: {
   $85 = $Result;
   $0 = $85;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 36: {
   $89 = $Result;
   $0 = $89;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 39: {
   $92 = $Result;
   $0 = $92;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 43: {
   $104 = $Result;
   $0 = $104;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 45: {
   $108 = $Result;
   $0 = $108;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 49: {
   $111 = $Result;
   $0 = $111;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 51: {
   $115 = $Result;
   $0 = $115;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 54: {
   $118 = (__Z12ElementErrorh10TErrorCode(0,3)|0);
   $0 = $118;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 56: {
   $121 = $Result;
   $0 = $121;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 58: {
   $124 = (__Z12ElementErrorh10TErrorCode(0,57)|0);
   $0 = $124;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 66: {
   $142 = $Result;
   $0 = $142;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 76: {
   $176 = $Result;
   $0 = $176;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 83: {
   $188 = $Result;
   $0 = $188;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 85: {
   $189 = (__Z12ElementErrorh10TErrorCode(0,3)|0);
   $0 = $189;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 92: {
   $196 = $Result;
   $0 = $196;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 94: {
   $199 = $Result;
   $0 = $199;
   $241 = $0;
   STACKTOP = sp;return ($241|0);
   break;
  }
  case 98: {
   $200 = HEAP8[250360>>0]|0;
   $201 = ($200<<24>>24)!=(0);
   do {
    if ($201) {
     $202 = HEAP16[238720>>1]|0;
     $203 = $202&65535;
     $204 = (($203) - 1)|0;
     $205 = ($204|0)>=(0);
     if ($205) {
      $206 = HEAP16[238720>>1]|0;
      $207 = $206&65535;
      $208 = (($207) - 1)|0;
      $209 = (115528 + (($208*12)|0)|0);
      $210 = HEAP32[$209>>2]|0;
      $211 = ($210|0)!=(47);
      if ($211) {
       $212 = HEAP16[238720>>1]|0;
       $213 = $212&65535;
       $214 = (($213) - 1)|0;
       $215 = (115528 + (($214*12)|0)|0);
       $216 = (($215) + 6|0);
       $217 = HEAP16[$216>>1]|0;
       $218 = $217&65535;
       $219 = HEAP16[238720>>1]|0;
       $220 = $219&65535;
       $221 = (($220) - 1)|0;
       $222 = (115528 + (($221*12)|0)|0);
       $223 = (($222) + 8|0);
       $224 = HEAP8[$223>>0]|0;
       $225 = $224&255;
       $226 = (($218) + ($225))|0;
       $227 = (($226) + 1)|0;
       $228 = $227&65535;
       HEAP16[250344>>1] = $228;
       $229 = HEAP16[250344>>1]|0;
       $230 = $229&65535;
       $231 = (($230) + 1)|0;
       HEAP32[250352>>2] = $231;
       HEAP8[250360>>0] = 0;
       $232 = HEAP32[250392>>2]|0;
       $233 = (__Z12EnterElement12TElementTypeth($232,0,1)|0);
       $Result = $233;
       $234 = ($233|0)!=(0);
       if (!($234)) {
        break;
       }
       $235 = $Result;
       $0 = $235;
       $241 = $0;
       STACKTOP = sp;return ($241|0);
      }
     }
    }
   } while(0);
   $236 = HEAP32[250392>>2]|0;
   $237 = (__Z12EnterElement12TElementTypeth($236,0,1)|0);
   $Result = $237;
   $238 = ($237|0)!=(0);
   if ($238) {
    $239 = $Result;
    $0 = $239;
    $241 = $0;
    STACKTOP = sp;return ($241|0);
   } else {
    $240 = HEAP16[238720>>1]|0;
    HEAP16[115520>>1] = $240;
    $0 = 0;
    $241 = $0;
    STACKTOP = sp;return ($241|0);
   }
   break;
  }
 }
 return (0)|0;
}
function __Z23CompileEditorDirectivesv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $PortNum = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = (__Z21CompileStampDirectivev()|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 if ($2) {
  $3 = $Result;
  $0 = $3;
  $32 = $0;
  STACKTOP = sp;return ($32|0);
 }
 $4 = (__Z20CompilePortDirectivev()|0);
 $Result = $4;
 $5 = ($4|0)!=(0);
 if ($5) {
  $6 = $Result;
  $0 = $6;
  $32 = $0;
  STACKTOP = sp;return ($32|0);
 }
 $7 = (__Z22CompilePBasicDirectivev()|0);
 $Result = $7;
 $8 = ($7|0)!=(0);
 if ($8) {
  $9 = $Result;
  $0 = $9;
  $32 = $0;
  STACKTOP = sp;return ($32|0);
 }
 $10 = HEAP32[8>>2]|0;
 $11 = (($10) + 9|0);
 $12 = HEAP8[$11>>0]|0;
 $13 = $12&255;
 (__Z17ModifySymbolValuePKct(250400,$13)|0);
 $14 = HEAP32[8>>2]|0;
 $15 = (($14) + 72|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = ($16|0)==(0|0);
 if ($17) {
  (__Z17ModifySymbolValuePKct(250408,-1)|0);
 } else {
  $18 = (_malloc(4)|0);
  $PortNum = $18;
  $19 = $PortNum;
  $20 = HEAP32[8>>2]|0;
  $21 = (($20) + 72|0);
  $22 = HEAP32[$21>>2]|0;
  $23 = (($22) + 3|0);
  (_strncpy(($19|0),($23|0),3)|0);
  $24 = $PortNum;
  $25 = (_atoi($24)|0);
  $26 = $25&65535;
  (__Z17ModifySymbolValuePKct(250408,$26)|0);
  $27 = $PortNum;
  _free($27);
 }
 $28 = HEAP32[8>>2]|0;
 $29 = (($28) + 80|0);
 $30 = HEAP32[$29>>2]|0;
 $31 = $30&65535;
 (__Z17ModifySymbolValuePKct(250416,$31)|0);
 $0 = 0;
 $32 = $0;
 STACKTOP = sp;return ($32|0);
}
function __Z13AdjustSymbolsv() {
 var $$byval_copy = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Idx = 0, $LangMask = 0, $Result = 0;
 var dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy = sp + 64|0;
 $1 = sp;
 $2 = HEAP32[8>>2]|0;
 $3 = (($2) + 9|0);
 $4 = HEAP8[$3>>0]|0;
 $5 = $4&255;
 $6 = ($5|0)>=(2);
 if ($6) {
  $7 = HEAP32[8>>2]|0;
  $8 = (($7) + 9|0);
  $9 = HEAP8[$8>>0]|0;
  $10 = $9&255;
  $11 = ($10|0)<(7);
  if ($11) {
   $17 = HEAP8[238424>>0]|0;
   $18 = ($17<<24>>24)!=(0);
   $19 = $18 ? 1 : 0;
   $20 = 64 << $19;
   $21 = $20&65535;
   $LangMask = $21;
   $Idx = 0;
   while(1) {
    $22 = $Idx;
    $23 = ($22|0)<=(53);
    if (!($23)) {
     label = 12;
     break;
    }
    $24 = $Idx;
    $25 = (22592 + (($24*52)|0)|0);
    $26 = HEAP32[$25>>2]|0;
    $27 = HEAP32[8>>2]|0;
    $28 = (($27) + 9|0);
    $29 = HEAP8[$28>>0]|0;
    $30 = $29&255;
    $31 = (250312 + ($30<<2)|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $LangMask;
    $34 = $33&65535;
    $35 = $32 | $34;
    $36 = $26 & $35;
    $37 = HEAP32[8>>2]|0;
    $38 = (($37) + 9|0);
    $39 = HEAP8[$38>>0]|0;
    $40 = $39&255;
    $41 = (250312 + ($40<<2)|0);
    $42 = HEAP32[$41>>2]|0;
    $43 = $LangMask;
    $44 = $43&65535;
    $45 = $42 | $44;
    $46 = ($36|0)==($45|0);
    if ($46) {
     $47 = $Idx;
     $48 = (22592 + (($47*52)|0)|0);
     $49 = (($48) + 4|0);
     dest=$1+0|0; src=$49+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
     dest=$$byval_copy+0|0; src=$1+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
     $50 = (__Z11EnterSymbol12TSymbolTable($$byval_copy)|0);
     $Result = $50;
     $51 = ($50|0)!=(0);
     if ($51) {
      label = 8;
      break;
     }
    }
    $53 = $Idx;
    $54 = (($53) + 1)|0;
    $Idx = $54;
   }
   if ((label|0) == 8) {
    $52 = $Result;
    $0 = $52;
    $55 = $0;
    STACKTOP = sp;return ($55|0);
   }
   else if ((label|0) == 12) {
    $0 = 0;
    $55 = $0;
    STACKTOP = sp;return ($55|0);
   }
  }
 }
 $12 = HEAP32[8>>2]|0;
 $13 = (($12) + 92|0);
 HEAP32[$13>>2] = 0;
 $14 = HEAP32[8>>2]|0;
 $15 = (($14) + 96|0);
 HEAP32[$15>>2] = 0;
 $16 = (__Z5Error10TErrorCode(60)|0);
 $0 = $16;
 $55 = $0;
 STACKTOP = sp;return ($55|0);
}
function __Z19CompileCCDirectivesv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $8 = 0, $9 = 0, $Element = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 4|0;
 HEAP16[238720>>1] = 0;
 HEAP8[238776>>0] = 0;
 HEAP8[250432>>0] = 0;
 HEAP8[250440>>0] = 0;
 L1: while(1) {
  $1 = (__Z10GetElementP12TElementList($Element)|0);
  $2 = ($1<<24>>24)!=(0);
  if (!($2)) {
   label = 31;
   break;
  }
  $3 = HEAP32[$Element>>2]|0;
  $4 = ($3|0)==(2);
  if ($4) {
   $5 = (($Element) + 4|0);
   $6 = HEAP16[$5>>1]|0;
   $7 = $6&65535;
   switch ($7|0) {
   case 25:  {
    $14 = (__Z11CompileCCIfv()|0);
    $Result = $14;
    $15 = ($14|0)!=(0);
    if ($15) {
     label = 12;
     break L1;
    }
    break;
   }
   case 59:  {
    $23 = (__Z15CompileCCSelectv()|0);
    $Result = $23;
    $24 = ($23|0)!=(0);
    if ($24) {
     label = 21;
     break L1;
    }
    break;
   }
   case 3:  {
    $26 = (__Z13CompileCCCasev()|0);
    $Result = $26;
    $27 = ($26|0)!=(0);
    if ($27) {
     label = 24;
     break L1;
    }
    break;
   }
   case 14:  {
    $29 = (__Z18CompileCCEndSelectv()|0);
    $Result = $29;
    $30 = ($29|0)!=(0);
    if ($30) {
     label = 27;
     break L1;
    }
    break;
   }
   case 7:  {
    $8 = (__Z15CompileCCDefinev()|0);
    $Result = $8;
    $9 = ($8|0)!=(0);
    if ($9) {
     label = 6;
     break L1;
    }
    break;
   }
   case 15:  {
    $11 = (__Z14CompileCCErrorv()|0);
    $Result = $11;
    $12 = ($11|0)!=(0);
    if ($12) {
     label = 9;
     break L1;
    }
    break;
   }
   case 10:  {
    $17 = (__Z13CompileCCElsev()|0);
    $Result = $17;
    $18 = ($17|0)!=(0);
    if ($18) {
     label = 15;
     break L1;
    }
    break;
   }
   case 13:  {
    $20 = (__Z14CompileCCEndIfv()|0);
    $Result = $20;
    $21 = ($20|0)!=(0);
    if ($21) {
     label = 18;
     break L1;
    }
    break;
   }
   default: {
   }
   }
  }
 }
 if ((label|0) == 6) {
  $10 = $Result;
  $0 = $10;
  $70 = $0;
  STACKTOP = sp;return ($70|0);
 }
 else if ((label|0) == 9) {
  $13 = $Result;
  $0 = $13;
  $70 = $0;
  STACKTOP = sp;return ($70|0);
 }
 else if ((label|0) == 12) {
  $16 = $Result;
  $0 = $16;
  $70 = $0;
  STACKTOP = sp;return ($70|0);
 }
 else if ((label|0) == 15) {
  $19 = $Result;
  $0 = $19;
  $70 = $0;
  STACKTOP = sp;return ($70|0);
 }
 else if ((label|0) == 18) {
  $22 = $Result;
  $0 = $22;
  $70 = $0;
  STACKTOP = sp;return ($70|0);
 }
 else if ((label|0) == 21) {
  $25 = $Result;
  $0 = $25;
  $70 = $0;
  STACKTOP = sp;return ($70|0);
 }
 else if ((label|0) == 24) {
  $28 = $Result;
  $0 = $28;
  $70 = $0;
  STACKTOP = sp;return ($70|0);
 }
 else if ((label|0) == 27) {
  $31 = $Result;
  $0 = $31;
  $70 = $0;
  STACKTOP = sp;return ($70|0);
 }
 else if ((label|0) == 31) {
  $32 = HEAP8[238424>>0]|0;
  $33 = ($32<<24>>24)!=(0);
  do {
   if ($33) {
    $34 = HEAP8[238776>>0]|0;
    $35 = $34&255;
    $36 = ($35|0)>(0);
    if ($36) {
     $37 = HEAP8[238776>>0]|0;
     $38 = $37&255;
     $39 = (($38) - 1)|0;
     $40 = (238784 + (($39*48)|0)|0);
     $41 = (($40) + 4|0);
     $42 = HEAP16[$41>>1]|0;
     $43 = $42&65535;
     $44 = (115528 + (($43*12)|0)|0);
     $45 = (($44) + 6|0);
     $46 = HEAP16[$45>>1]|0;
     $47 = $46&65535;
     $48 = HEAP32[8>>2]|0;
     $49 = (($48) + 92|0);
     HEAP32[$49>>2] = $47;
     $50 = HEAP8[238776>>0]|0;
     $51 = $50&255;
     $52 = (($51) - 1)|0;
     $53 = (238784 + (($52*48)|0)|0);
     $54 = (($53) + 4|0);
     $55 = HEAP16[$54>>1]|0;
     $56 = $55&65535;
     $57 = (115528 + (($56*12)|0)|0);
     $58 = (($57) + 8|0);
     $59 = HEAP8[$58>>0]|0;
     $60 = $59&255;
     $61 = HEAP32[8>>2]|0;
     $62 = (($61) + 96|0);
     HEAP32[$62>>2] = $60;
     $63 = HEAP8[238776>>0]|0;
     $64 = $63&255;
     $65 = (($64) - 1)|0;
     $66 = (238784 + (($65*48)|0)|0);
     $67 = HEAP32[$66>>2]|0;
     if ((($67|0) == 5) | (($67|0) == 4)) {
      $68 = (__Z5Error10TErrorCode(95)|0);
      $0 = $68;
      $70 = $0;
      STACKTOP = sp;return ($70|0);
     } else if ((($67|0) == 8)) {
      $69 = (__Z5Error10TErrorCode(96)|0);
      $0 = $69;
      $70 = $0;
      STACKTOP = sp;return ($70|0);
     } else {
      break;
     }
    }
   }
  } while(0);
  $0 = 0;
  $70 = $0;
  STACKTOP = sp;return ($70|0);
 }
 return (0)|0;
}
function __Z11CompilePinsh($LastPass) {
 $LastPass = $LastPass|0;
 var $$byval_copy = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0;
 var $62 = 0, $63 = 0, $7 = 0, $8 = 0, $9 = 0, $Element = 0, $Resolved = 0, $Result = 0, $SoftEnd = 0, $StartOfConstant = 0, $StartOfLine = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy = sp + 72|0;
 $Element = sp + 60|0;
 $Resolved = sp + 126|0;
 $SoftEnd = sp + 125|0;
 $2 = sp + 8|0;
 $1 = $LastPass;
 HEAP16[238720>>1] = 0;
 $StartOfLine = 0;
 while(1) {
  $3 = (__Z10GetElementP12TElementList($Element)|0);
  $4 = ($3<<24>>24)!=(0);
  if (!($4)) {
   label = 27;
   break;
  }
  (__Z10GetElementP12TElementList($Element)|0);
  $5 = HEAP32[$Element>>2]|0;
  $6 = ($5|0)==(28);
  if ($6) {
   $7 = $StartOfLine;
   HEAP16[238720>>1] = $7;
   $8 = (__Z18GetUndefinedSymbolv()|0);
   $Result = $8;
   $9 = ($8|0)!=(0);
   if ($9) {
    label = 5;
    break;
   }
   $11 = HEAP16[238720>>1]|0;
   $12 = (($11) + 1)<<16>>16;
   HEAP16[238720>>1] = $12;
   (__Z14PreviewElementP12TElementList($Element)|0);
   $13 = (($Element) + 6|0);
   $14 = HEAP16[$13>>1]|0;
   $StartOfConstant = $14;
   $15 = $1;
   $16 = (__Z15ResolveConstanthhPh($15,0,$Resolved)|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    label = 7;
    break;
   }
   $19 = HEAP8[$Resolved>>0]|0;
   $20 = ($19<<24>>24)!=(0);
   if ($20) {
    $21 = HEAP16[((250448 + 40|0))>>1]|0;
    $22 = $21&65535;
    $23 = ($22|0)>(15);
    if ($23) {
     label = 10;
     break;
    }
    HEAP32[((250448 + 36|0))>>2] = 42;
    dest=$2+0|0; src=250448+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
    dest=$$byval_copy+0|0; src=$2+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
    $43 = (__Z11EnterSymbol12TSymbolTable($$byval_copy)|0);
    $Result = $43;
    $44 = ($43|0)!=(0);
    if ($44) {
     label = 12;
     break;
    }
    $46 = (__Z6GetEndPh($SoftEnd)|0);
    $Result = $46;
    $47 = ($46|0)!=(0);
    if ($47) {
     label = 14;
     break;
    }
    $49 = $StartOfLine;
    $50 = HEAP16[238720>>1]|0;
    $51 = $50&65535;
    $52 = (($51) - 1)|0;
    $53 = $52&65535;
    __Z14CancelElementstt($49,$53);
   } else {
    $54 = (__Z6GetEndPh($SoftEnd)|0);
    $Result = $54;
    $55 = ($54|0)!=(0);
    if ($55) {
     label = 17;
     break;
    }
   }
  } else {
   while(1) {
    $57 = HEAP32[$Element>>2]|0;
    $58 = ($57|0)!=(47);
    if ($58) {
     $59 = (__Z10GetElementP12TElementList($Element)|0);
     $60 = ($59<<24>>24)!=(0);
     $63 = $60;
    } else {
     $63 = 0;
    }
    if (!($63)) {
     break;
    }
   }
  }
  $61 = HEAP16[238720>>1]|0;
  $StartOfLine = $61;
 }
 if ((label|0) == 5) {
  $10 = $Result;
  $0 = $10;
  $62 = $0;
  STACKTOP = sp;return ($62|0);
 }
 else if ((label|0) == 7) {
  $18 = $Result;
  $0 = $18;
  $62 = $0;
  STACKTOP = sp;return ($62|0);
 }
 else if ((label|0) == 10) {
  $24 = HEAP16[238720>>1]|0;
  $25 = (($24) + -1)<<16>>16;
  HEAP16[238720>>1] = $25;
  (__Z10GetElementP12TElementList($Element)|0);
  $26 = $StartOfConstant;
  $27 = $26&65535;
  $28 = HEAP32[8>>2]|0;
  $29 = (($28) + 92|0);
  HEAP32[$29>>2] = $27;
  $30 = (($Element) + 6|0);
  $31 = HEAP16[$30>>1]|0;
  $32 = $31&65535;
  $33 = $StartOfConstant;
  $34 = $33&65535;
  $35 = (($32) - ($34))|0;
  $36 = (($Element) + 8|0);
  $37 = HEAP8[$36>>0]|0;
  $38 = $37&255;
  $39 = (($35) + ($38))|0;
  $40 = HEAP32[8>>2]|0;
  $41 = (($40) + 96|0);
  HEAP32[$41>>2] = $39;
  $42 = (__Z5Error10TErrorCode(79)|0);
  $0 = $42;
  $62 = $0;
  STACKTOP = sp;return ($62|0);
 }
 else if ((label|0) == 12) {
  $45 = $Result;
  $0 = $45;
  $62 = $0;
  STACKTOP = sp;return ($62|0);
 }
 else if ((label|0) == 14) {
  $48 = $Result;
  $0 = $48;
  $62 = $0;
  STACKTOP = sp;return ($62|0);
 }
 else if ((label|0) == 17) {
  $56 = $Result;
  $0 = $56;
  $62 = $0;
  STACKTOP = sp;return ($62|0);
 }
 else if ((label|0) == 27) {
  $0 = 0;
  $62 = $0;
  STACKTOP = sp;return ($62|0);
 }
 return (0)|0;
}
function __Z16CompileConstantsh($LastPass) {
 $LastPass = $LastPass|0;
 var $$byval_copy = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, $Element = 0, $Resolved = 0, $Result = 0, $SoftEnd = 0, $StartOfLine = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy = sp + 72|0;
 $Element = sp + 60|0;
 $Resolved = sp + 124|0;
 $SoftEnd = sp + 123|0;
 $2 = sp + 8|0;
 $1 = $LastPass;
 HEAP16[238720>>1] = 0;
 $StartOfLine = 0;
 while(1) {
  $3 = (__Z10GetElementP12TElementList($Element)|0);
  $4 = ($3<<24>>24)!=(0);
  if (!($4)) {
   label = 25;
   break;
  }
  (__Z10GetElementP12TElementList($Element)|0);
  $5 = HEAP32[$Element>>2]|0;
  $6 = ($5|0)==(4);
  if ($6) {
   $7 = $StartOfLine;
   HEAP16[238720>>1] = $7;
   $8 = (__Z18GetUndefinedSymbolv()|0);
   $Result = $8;
   $9 = ($8|0)!=(0);
   if ($9) {
    label = 5;
    break;
   }
   $11 = HEAP16[238720>>1]|0;
   $12 = (($11) + 1)<<16>>16;
   HEAP16[238720>>1] = $12;
   $13 = $1;
   $14 = (__Z15ResolveConstanthhPh($13,0,$Resolved)|0);
   $Result = $14;
   $15 = ($14|0)!=(0);
   if ($15) {
    label = 7;
    break;
   }
   $17 = HEAP8[$Resolved>>0]|0;
   $18 = ($17<<24>>24)!=(0);
   if ($18) {
    dest=$2+0|0; src=250448+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
    dest=$$byval_copy+0|0; src=$2+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
    $19 = (__Z11EnterSymbol12TSymbolTable($$byval_copy)|0);
    $Result = $19;
    $20 = ($19|0)!=(0);
    if ($20) {
     label = 10;
     break;
    }
    $22 = (__Z6GetEndPh($SoftEnd)|0);
    $Result = $22;
    $23 = ($22|0)!=(0);
    if ($23) {
     label = 12;
     break;
    }
    $25 = $StartOfLine;
    $26 = HEAP16[238720>>1]|0;
    $27 = $26&65535;
    $28 = (($27) - 1)|0;
    $29 = $28&65535;
    __Z14CancelElementstt($25,$29);
   } else {
    $30 = (__Z6GetEndPh($SoftEnd)|0);
    $Result = $30;
    $31 = ($30|0)!=(0);
    if ($31) {
     label = 15;
     break;
    }
   }
  } else {
   while(1) {
    $33 = HEAP32[$Element>>2]|0;
    $34 = ($33|0)!=(47);
    if ($34) {
     $35 = (__Z10GetElementP12TElementList($Element)|0);
     $36 = ($35<<24>>24)!=(0);
     $39 = $36;
    } else {
     $39 = 0;
    }
    if (!($39)) {
     break;
    }
   }
  }
  $37 = HEAP16[238720>>1]|0;
  $StartOfLine = $37;
 }
 if ((label|0) == 5) {
  $10 = $Result;
  $0 = $10;
  $38 = $0;
  STACKTOP = sp;return ($38|0);
 }
 else if ((label|0) == 7) {
  $16 = $Result;
  $0 = $16;
  $38 = $0;
  STACKTOP = sp;return ($38|0);
 }
 else if ((label|0) == 10) {
  $21 = $Result;
  $0 = $21;
  $38 = $0;
  STACKTOP = sp;return ($38|0);
 }
 else if ((label|0) == 12) {
  $24 = $Result;
  $0 = $24;
  $38 = $0;
  STACKTOP = sp;return ($38|0);
 }
 else if ((label|0) == 15) {
  $32 = $Result;
  $0 = $32;
  $38 = $0;
  STACKTOP = sp;return ($38|0);
 }
 else if ((label|0) == 25) {
  $0 = 0;
  $38 = $0;
  STACKTOP = sp;return ($38|0);
 }
 return (0)|0;
}
function __Z11CompileDatah($LastPass) {
 $LastPass = $LastPass|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0;
 var $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0;
 var $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0;
 var $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0;
 var $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $DefinedFlag = 0, $EEPROMIdx = 0, $EEPROMValue = 0, $Element = 0, $Idx = 0;
 var $Preview = 0, $Resolved = 0, $Result = 0, $StartOfLine = 0, $SymbolFlag = 0, $WordFlag = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $EEPROMIdx = sp + 34|0;
 $Element = sp + 16|0;
 $Preview = sp + 4|0;
 $SymbolFlag = sp + 41|0;
 $Resolved = sp + 42|0;
 $EEPROMValue = sp + 32|0;
 $1 = $LastPass;
 HEAP16[$EEPROMIdx>>1] = 0;
 HEAP16[238720>>1] = 0;
 $2 = HEAP16[238720>>1]|0;
 $StartOfLine = $2;
 L1: while(1) {
  $3 = (__Z10GetElementP12TElementList($Element)|0);
  $4 = ($3<<24>>24)!=(0);
  if (!($4)) {
   label = 76;
   break;
  }
  HEAP8[$SymbolFlag>>0] = 0;
  $5 = HEAP32[$Element>>2]|0;
  $6 = ($5|0)!=(22);
  if ($6) {
   (__Z10GetElementP12TElementList($Element)|0);
   $7 = HEAP32[$Element>>2]|0;
   $8 = ($7|0)==(22);
   if ($8) {
    $9 = $StartOfLine;
    HEAP16[238720>>1] = $9;
    $10 = (__Z18GetUndefinedSymbolv()|0);
    $Result = $10;
    $11 = ($10|0)!=(0);
    if ($11) {
     label = 6;
     break;
    }
    $13 = $StartOfLine;
    $14 = HEAP16[238720>>1]|0;
    $15 = $14&65535;
    $16 = (($15) - 1)|0;
    $17 = $16&65535;
    __Z14CancelElementstt($13,$17);
    $18 = HEAP16[238720>>1]|0;
    $19 = (($18) + 1)<<16>>16;
    HEAP16[238720>>1] = $19;
    HEAP8[$SymbolFlag>>0] = 1;
   }
  }
  $20 = HEAP32[$Element>>2]|0;
  $21 = ($20|0)==(22);
  if ($21) {
   (__Z10GetElementP12TElementList($Element)|0);
   $22 = HEAP32[$Element>>2]|0;
   $23 = ($22|0)==(47);
   if ($23) {
    $24 = (__Z12AssignSymbolPhPt($SymbolFlag,$EEPROMIdx)|0);
    $Result = $24;
    $25 = ($24|0)!=(0);
    if ($25) {
     label = 12;
     break;
    }
    $27 = $StartOfLine;
    $28 = HEAP16[238720>>1]|0;
    $29 = $28&65535;
    $30 = (($29) - 1)|0;
    $31 = $30&65535;
    __Z14CancelElementstt($27,$31);
   } else {
    L17: while(1) {
     $32 = HEAP32[$Element>>2]|0;
     $33 = ($32|0)==(17);
     L19: do {
      if ($33) {
       $34 = (__Z15ResolveConstanthhPh(1,0,$Resolved)|0);
       $Result = $34;
       $35 = ($34|0)!=(0);
       if ($35) {
        label = 17;
        break L1;
       }
       $37 = HEAP16[((250448 + 40|0))>>1]|0;
       HEAP16[$EEPROMIdx>>1] = $37;
       $38 = HEAP16[$EEPROMIdx>>1]|0;
       $39 = $38&65535;
       $40 = ($39|0)>=(2048);
       if ($40) {
        label = 19;
        break L1;
       }
       $42 = (__Z12AssignSymbolPhPt($SymbolFlag,$EEPROMIdx)|0);
       $Result = $42;
       $43 = ($42|0)!=(0);
       if ($43) {
        label = 21;
        break L1;
       }
       (__Z10GetElementP12TElementList($Element)|0);
       $45 = HEAP32[$Element>>2]|0;
       $46 = ($45|0)!=(14);
       if ($46) {
        label = 23;
        break L17;
       }
       label = 66;
      } else {
       $57 = (__Z12AssignSymbolPhPt($SymbolFlag,$EEPROMIdx)|0);
       $Result = $57;
       $58 = ($57|0)!=(0);
       if ($58) {
        label = 30;
        break L1;
       }
       $DefinedFlag = 0;
       $WordFlag = 0;
       HEAP16[$EEPROMValue>>1] = 0;
       $60 = HEAP32[$Element>>2]|0;
       $61 = ($60|0)==(6);
       if ($61) {
        $62 = (($Element) + 4|0);
        $63 = HEAP16[$62>>1]|0;
        $64 = $63&65535;
        $65 = ($64|0)==(3);
        if ($65) {
         $WordFlag = 1;
         (__Z10GetElementP12TElementList($Element)|0);
        }
       }
       $66 = HEAP32[$Element>>2]|0;
       $67 = ($66|0)!=(18);
       do {
        if ($67) {
         $68 = HEAP16[238720>>1]|0;
         $69 = (($68) + -1)<<16>>16;
         HEAP16[238720>>1] = $69;
         $70 = $1;
         $71 = (__Z15ResolveConstanthhPh($70,0,$Resolved)|0);
         $Result = $71;
         $72 = ($71|0)!=(0);
         if ($72) {
          label = 37;
          break L1;
         }
         $74 = HEAP16[((250448 + 40|0))>>1]|0;
         HEAP16[$EEPROMValue>>1] = $74;
         $DefinedFlag = 1;
         (__Z14PreviewElementP12TElementList($Preview)|0);
         $75 = HEAP32[$Preview>>2]|0;
         $76 = ($75|0)!=(18);
         if (!($76)) {
          $95 = HEAP16[238720>>1]|0;
          $96 = (($95) + 1)<<16>>16;
          HEAP16[238720>>1] = $96;
          break;
         }
         $77 = $WordFlag;
         $78 = $DefinedFlag;
         $79 = $1;
         $80 = (__Z9EnterDataP12TElementListPtS1_hhh($Element,$EEPROMValue,$EEPROMIdx,$77,$78,$79)|0);
         $Result = $80;
         $81 = ($80|0)!=(0);
         if ($81) {
          label = 40;
          break L1;
         }
         (__Z10GetElementP12TElementList($Element)|0);
         $83 = HEAP32[$Element>>2]|0;
         $84 = ($83|0)==(14);
         if (!($84)) {
          label = 43;
          break L17;
         }
         (__Z10GetElementP12TElementList($Element)|0);
         break L19;
        }
       } while(0);
       $97 = (__Z15ResolveConstanthhPh(1,0,$Resolved)|0);
       $Result = $97;
       $98 = ($97|0)!=(0);
       if ($98) {
        label = 50;
        break L1;
       }
       $Idx = 1;
       while(1) {
        $100 = $Idx;
        $101 = $100&65535;
        $102 = HEAP16[((250448 + 40|0))>>1]|0;
        $103 = $102&65535;
        $104 = ($101|0)<=($103|0);
        if (!($104)) {
         break;
        }
        $105 = $WordFlag;
        $106 = $DefinedFlag;
        $107 = $1;
        $108 = (__Z9EnterDataP12TElementListPtS1_hhh($Element,$EEPROMValue,$EEPROMIdx,$105,$106,$107)|0);
        $Result = $108;
        $109 = ($108|0)!=(0);
        if ($109) {
         label = 54;
         break L1;
        }
        $111 = $Idx;
        $112 = (($111) + 1)<<16>>16;
        $Idx = $112;
       }
       $113 = (__Z8GetRightv()|0);
       $Result = $113;
       $114 = ($113|0)!=(0);
       if ($114) {
        label = 58;
        break L1;
       }
       (__Z10GetElementP12TElementList($Element)|0);
       $116 = HEAP32[$Element>>2]|0;
       $117 = ($116|0)!=(14);
       if ($117) {
        label = 60;
        break L17;
       }
       label = 66;
      }
     } while(0);
     if ((label|0) == 66) {
      label = 0;
      (__Z10GetElementP12TElementList($Element)|0);
     }
    }
    if ((label|0) == 23) {
     label = 0;
     $47 = HEAP32[$Element>>2]|0;
     $48 = ($47|0)!=(47);
     if ($48) {
      label = 24;
      break;
     }
     $50 = $1;
     $51 = ($50<<24>>24)!=(0);
     if ($51) {
      $52 = $StartOfLine;
      $53 = HEAP16[238720>>1]|0;
      $54 = $53&65535;
      $55 = (($54) - 1)|0;
      $56 = $55&65535;
      __Z14CancelElementstt($52,$56);
     }
    }
    else if ((label|0) == 43) {
     label = 0;
     $85 = HEAP32[$Element>>2]|0;
     $86 = ($85|0)!=(47);
     if ($86) {
      label = 44;
      break;
     }
     $88 = $1;
     $89 = ($88<<24>>24)!=(0);
     if ($89) {
      $90 = $StartOfLine;
      $91 = HEAP16[238720>>1]|0;
      $92 = $91&65535;
      $93 = (($92) - 1)|0;
      $94 = $93&65535;
      __Z14CancelElementstt($90,$94);
     }
    }
    else if ((label|0) == 60) {
     label = 0;
     $118 = HEAP32[$Element>>2]|0;
     $119 = ($118|0)!=(47);
     if ($119) {
      label = 61;
      break;
     }
     $121 = $1;
     $122 = ($121<<24>>24)!=(0);
     if ($122) {
      $123 = $StartOfLine;
      $124 = HEAP16[238720>>1]|0;
      $125 = $124&65535;
      $126 = (($125) - 1)|0;
      $127 = $126&65535;
      __Z14CancelElementstt($123,$127);
     }
    }
   }
  }
  while(1) {
   $128 = HEAP32[$Element>>2]|0;
   $129 = ($128|0)!=(47);
   if ($129) {
    $130 = (__Z10GetElementP12TElementList($Element)|0);
    $131 = ($130<<24>>24)!=(0);
    $134 = $131;
   } else {
    $134 = 0;
   }
   if (!($134)) {
    break;
   }
  }
  $132 = HEAP16[238720>>1]|0;
  $StartOfLine = $132;
 }
 switch (label|0) {
  case 6: {
   $12 = $Result;
   $0 = $12;
   $133 = $0;
   STACKTOP = sp;return ($133|0);
   break;
  }
  case 12: {
   $26 = $Result;
   $0 = $26;
   $133 = $0;
   STACKTOP = sp;return ($133|0);
   break;
  }
  case 17: {
   $36 = $Result;
   $0 = $36;
   $133 = $0;
   STACKTOP = sp;return ($133|0);
   break;
  }
  case 19: {
   $41 = (__Z5Error10TErrorCode(14)|0);
   $0 = $41;
   $133 = $0;
   STACKTOP = sp;return ($133|0);
   break;
  }
  case 21: {
   $44 = $Result;
   $0 = $44;
   $133 = $0;
   STACKTOP = sp;return ($133|0);
   break;
  }
  case 24: {
   $49 = (__Z5Error10TErrorCode(32)|0);
   $0 = $49;
   $133 = $0;
   STACKTOP = sp;return ($133|0);
   break;
  }
  case 30: {
   $59 = $Result;
   $0 = $59;
   $133 = $0;
   STACKTOP = sp;return ($133|0);
   break;
  }
  case 37: {
   $73 = $Result;
   $0 = $73;
   $133 = $0;
   STACKTOP = sp;return ($133|0);
   break;
  }
  case 40: {
   $82 = $Result;
   $0 = $82;
   $133 = $0;
   STACKTOP = sp;return ($133|0);
   break;
  }
  case 44: {
   $87 = (__Z5Error10TErrorCode(32)|0);
   $0 = $87;
   $133 = $0;
   STACKTOP = sp;return ($133|0);
   break;
  }
  case 50: {
   $99 = $Result;
   $0 = $99;
   $133 = $0;
   STACKTOP = sp;return ($133|0);
   break;
  }
  case 54: {
   $110 = $Result;
   $0 = $110;
   $133 = $0;
   STACKTOP = sp;return ($133|0);
   break;
  }
  case 58: {
   $115 = $Result;
   $0 = $115;
   $133 = $0;
   STACKTOP = sp;return ($133|0);
   break;
  }
  case 61: {
   $120 = (__Z5Error10TErrorCode(32)|0);
   $0 = $120;
   $133 = $0;
   STACKTOP = sp;return ($133|0);
   break;
  }
  case 76: {
   $0 = 0;
   $133 = $0;
   STACKTOP = sp;return ($133|0);
   break;
  }
 }
 return (0)|0;
}
function __Z10CompileVarh($LastPass) {
 $LastPass = $LastPass|0;
 var $$byval_copy = 0, $$byval_copy1 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0;
 var $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0;
 var $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0;
 var $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0;
 var $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0;
 var $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0;
 var $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0;
 var $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0;
 var $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0;
 var $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0;
 var $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $ArraySize = 0, $Element = 0, $Idx = 0, $Preview = 0, $Resolved = 0, $Result = 0, $SoftEnd = 0, $StartOfLine = 0, $Temp = 0;
 var dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 240|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy1 = sp + 176|0;
 $$byval_copy = sp + 80|0;
 $Resolved = sp + 237|0;
 $SoftEnd = sp + 238|0;
 $Element = sp + 48|0;
 $Preview = sp + 64|0;
 $2 = sp;
 $3 = sp + 128|0;
 $1 = $LastPass;
 $4 = $1;
 $5 = ($4<<24>>24)!=(0);
 if ($5) {
  $Temp = 3;
  $Idx = 0;
  while(1) {
   $14 = $Idx;
   $15 = ($14|0)<=(3);
   if (!($15)) {
    break;
   }
   $16 = $Temp;
   $17 = $16&255;
   $18 = $Idx;
   $19 = (3 - ($18))|0;
   $20 = (258688 + ($19)|0);
   $21 = HEAP8[$20>>0]|0;
   $22 = $21&255;
   $23 = $17 << $22;
   $24 = $23&255;
   $25 = $Idx;
   $26 = (3 - ($25))|0;
   $27 = (25384 + ($26)|0);
   HEAP8[$27>>0] = $24;
   $28 = $Temp;
   $29 = $28&255;
   $30 = $Idx;
   $31 = (3 - ($30))|0;
   $32 = (258688 + ($31)|0);
   $33 = HEAP8[$32>>0]|0;
   $34 = $33&255;
   $35 = $29 << $34;
   $36 = $Idx;
   $37 = (3 - ($36))|0;
   $38 = HEAP32[8>>2]|0;
   $39 = (($38) + 4196|0);
   $40 = (($39) + ($37)|0);
   $41 = HEAP8[$40>>0]|0;
   $42 = $41&255;
   $43 = (($35) + ($42))|0;
   $44 = $43&255;
   $Temp = $44;
   $45 = $Idx;
   $46 = (($45) + 1)|0;
   $Idx = $46;
  }
 } else {
  HEAP8[25376>>0] = 0;
  $Idx = 0;
  while(1) {
   $6 = $Idx;
   $7 = ($6|0)<=(3);
   if (!($7)) {
    break;
   }
   $8 = $Idx;
   $9 = HEAP32[8>>2]|0;
   $10 = (($9) + 4196|0);
   $11 = (($10) + ($8)|0);
   HEAP8[$11>>0] = 0;
   $12 = $Idx;
   $13 = (($12) + 1)|0;
   $Idx = $13;
  }
 }
 HEAP16[238720>>1] = 0;
 $47 = HEAP16[238720>>1]|0;
 $StartOfLine = $47;
 while(1) {
  $48 = (__Z10GetElementP12TElementList($Element)|0);
  $49 = ($48<<24>>24)!=(0);
  if (!($49)) {
   label = 75;
   break;
  }
  (__Z10GetElementP12TElementList($Element)|0);
  $50 = HEAP32[$Element>>2]|0;
  $51 = ($50|0)==(29);
  if ($51) {
   $52 = $StartOfLine;
   HEAP16[238720>>1] = $52;
   $53 = (__Z18GetUndefinedSymbolv()|0);
   $Result = $53;
   $54 = ($53|0)!=(0);
   if ($54) {
    label = 16;
    break;
   }
   $56 = HEAP16[238720>>1]|0;
   $57 = (($56) + 1)<<16>>16;
   HEAP16[238720>>1] = $57;
   (__Z10GetElementP12TElementList($Element)|0);
   $58 = HEAP32[$Element>>2]|0;
   $59 = ($58|0)==(6);
   if ($59) {
    (__Z14PreviewElementP12TElementList($Preview)|0);
    $ArraySize = 1;
    $60 = HEAP32[$Preview>>2]|0;
    $61 = ($60|0)==(18);
    if ($61) {
     $62 = HEAP16[238720>>1]|0;
     $63 = (($62) + 1)<<16>>16;
     HEAP16[238720>>1] = $63;
     $64 = (__Z15ResolveConstanthhPh(1,0,$Resolved)|0);
     $Result = $64;
     $65 = ($64|0)!=(0);
     if ($65) {
      label = 20;
      break;
     }
     $67 = HEAP16[((250448 + 40|0))>>1]|0;
     $ArraySize = $67;
     $68 = $ArraySize;
     $69 = $68&65535;
     $70 = ($69|0)==(0);
     if ($70) {
      label = 22;
      break;
     }
    }
    $72 = $1;
    $73 = ($72<<24>>24)!=(0);
    if ($73) {
     HEAP32[((250448 + 36|0))>>2] = 5;
     $129 = (($Element) + 4|0);
     $130 = HEAP16[$129>>1]|0;
     $131 = $130&65535;
     $132 = $131 << 8;
     $133 = (($Element) + 4|0);
     $134 = HEAP16[$133>>1]|0;
     $135 = $134&65535;
     $136 = (25384 + ($135)|0);
     $137 = HEAP8[$136>>0]|0;
     $138 = $137&255;
     $139 = (($132) + ($138))|0;
     $140 = $139&65535;
     HEAP16[((250448 + 40|0))>>1] = $140;
     $141 = $ArraySize;
     $142 = $141&65535;
     $143 = (($Element) + 4|0);
     $144 = HEAP16[$143>>1]|0;
     $145 = $144&65535;
     $146 = (25384 + ($145)|0);
     $147 = HEAP8[$146>>0]|0;
     $148 = $147&255;
     $149 = (($148) + ($142))|0;
     $150 = $149&255;
     HEAP8[$146>>0] = $150;
     dest=$2+0|0; src=250448+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
     dest=$$byval_copy+0|0; src=$2+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
     $151 = (__Z11EnterSymbol12TSymbolTable($$byval_copy)|0);
     $Result = $151;
     $152 = ($151|0)!=(0);
     if ($152) {
      label = 41;
      break;
     }
     $154 = HEAP32[$Preview>>2]|0;
     $155 = ($154|0)==(18);
     if ($155) {
      $156 = (__Z8GetRightv()|0);
      $Result = $156;
      $157 = ($156|0)!=(0);
      if ($157) {
       label = 44;
       break;
      }
     }
     $159 = (__Z6GetEndPh($SoftEnd)|0);
     $Result = $159;
     $160 = ($159|0)!=(0);
     if ($160) {
      label = 47;
      break;
     }
     $162 = $StartOfLine;
     $163 = HEAP16[238720>>1]|0;
     $164 = $163&65535;
     $165 = (($164) - 1)|0;
     $166 = $165&65535;
     __Z14CancelElementstt($162,$166);
     HEAP32[$Element>>2] = 47;
    } else {
     $74 = $ArraySize;
     $75 = $74&65535;
     $76 = ($75|0)>(255);
     if ($76) {
      label = 26;
      break;
     }
     $78 = $ArraySize;
     $79 = $78&65535;
     $80 = (($Element) + 4|0);
     $81 = HEAP16[$80>>1]|0;
     $82 = $81&65535;
     $83 = HEAP32[8>>2]|0;
     $84 = (($83) + 4196|0);
     $85 = (($84) + ($82)|0);
     $86 = HEAP8[$85>>0]|0;
     $87 = $86&255;
     $88 = (($87) + ($79))|0;
     $89 = $88&255;
     HEAP8[$85>>0] = $89;
     $90 = (($Element) + 4|0);
     $91 = HEAP16[$90>>1]|0;
     $92 = $91&65535;
     $93 = (258696 + ($92)|0);
     $94 = HEAP8[$93>>0]|0;
     $95 = $94&255;
     $96 = $ArraySize;
     $97 = $96&65535;
     $98 = Math_imul($97, $95)|0;
     $99 = $98&65535;
     $ArraySize = $99;
     $100 = $ArraySize;
     $101 = $100&65535;
     $102 = ($101|0)>(255);
     if ($102) {
      label = 28;
      break;
     }
     $104 = HEAP8[25376>>0]|0;
     $105 = $104&255;
     $106 = $ArraySize;
     $107 = $106&65535;
     $108 = (($105) + ($107))|0;
     $109 = ($108|0)>(255);
     if ($109) {
      label = 30;
      break;
     }
     $111 = $ArraySize;
     $112 = $111&65535;
     $113 = HEAP8[25376>>0]|0;
     $114 = $113&255;
     $115 = (($114) + ($112))|0;
     $116 = $115&255;
     HEAP8[25376>>0] = $116;
     $117 = HEAP8[25376>>0]|0;
     $118 = $117&255;
     $119 = ($118|0)>(208);
     if ($119) {
      label = 32;
      break;
     }
     $121 = HEAP32[$Preview>>2]|0;
     $122 = ($121|0)==(18);
     if ($122) {
      $123 = (__Z8GetRightv()|0);
      $Result = $123;
      $124 = ($123|0)!=(0);
      if ($124) {
       label = 35;
       break;
      }
     }
     $126 = (__Z6GetEndPh($SoftEnd)|0);
     $Result = $126;
     $127 = ($126|0)!=(0);
     if ($127) {
      label = 38;
      break;
     }
     HEAP32[$Element>>2] = 47;
    }
   } else {
    $167 = HEAP32[$Element>>2]|0;
    $168 = ($167|0)==(5);
    if ($168) {
     $169 = (__Z12GetModifiersP12TElementList($Element)|0);
     $Result = $169;
     $170 = ($169|0)!=(0);
     if ($170) {
      label = 52;
      break;
     }
     dest=$3+0|0; src=250448+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
     dest=$$byval_copy1+0|0; src=$3+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
     $172 = (__Z11EnterSymbol12TSymbolTable($$byval_copy1)|0);
     $Result = $172;
     $173 = ($172|0)!=(0);
     if ($173) {
      label = 54;
      break;
     }
     $175 = (__Z6GetEndPh($SoftEnd)|0);
     $Result = $175;
     $176 = ($175|0)!=(0);
     if ($176) {
      label = 56;
      break;
     }
     $178 = $StartOfLine;
     $179 = HEAP16[238720>>1]|0;
     $180 = $179&65535;
     $181 = (($180) - 1)|0;
     $182 = $181&65535;
     __Z14CancelElementstt($178,$182);
     HEAP32[$Element>>2] = 47;
    } else {
     $183 = HEAP32[$Element>>2]|0;
     $184 = ($183|0)!=(46);
     if ($184) {
      label = 59;
      break;
     }
     $186 = $1;
     $187 = ($186<<24>>24)!=(0);
     if ($187) {
      label = 61;
      break;
     }
     $189 = (($Element) + 4|0);
     $190 = HEAP16[$189>>1]|0;
     $191 = $190&65535;
     $192 = $191 & 255;
     $193 = (768 + ($192))|0;
     $194 = $193&65535;
     $195 = (($Element) + 4|0);
     HEAP16[$195>>1] = $194;
     $196 = (__Z12GetModifiersP12TElementList($Element)|0);
     $Result = $196;
     $197 = ($196|0)!=(0);
     if ($197) {
      label = 63;
      break;
     }
     $199 = (__Z6GetEndPh($SoftEnd)|0);
     $Result = $199;
     $200 = ($199|0)!=(0);
     if ($200) {
      label = 65;
      break;
     }
     HEAP32[$Element>>2] = 47;
    }
   }
  }
  while(1) {
   $202 = HEAP32[$Element>>2]|0;
   $203 = ($202|0)!=(47);
   if ($203) {
    $204 = (__Z10GetElementP12TElementList($Element)|0);
    $205 = ($204<<24>>24)!=(0);
    $208 = $205;
   } else {
    $208 = 0;
   }
   if (!($208)) {
    break;
   }
  }
  $206 = HEAP16[238720>>1]|0;
  $StartOfLine = $206;
 }
 switch (label|0) {
  case 16: {
   $55 = $Result;
   $0 = $55;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 20: {
   $66 = $Result;
   $0 = $66;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 22: {
   $71 = (__Z5Error10TErrorCode(27)|0);
   $0 = $71;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 26: {
   $77 = (__Z5Error10TErrorCode(28)|0);
   $0 = $77;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 28: {
   $103 = (__Z5Error10TErrorCode(28)|0);
   $0 = $103;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 30: {
   $110 = (__Z5Error10TErrorCode(28)|0);
   $0 = $110;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 32: {
   $120 = (__Z5Error10TErrorCode(28)|0);
   $0 = $120;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 35: {
   $125 = $Result;
   $0 = $125;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 38: {
   $128 = $Result;
   $0 = $128;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 41: {
   $153 = $Result;
   $0 = $153;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 44: {
   $158 = $Result;
   $0 = $158;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 47: {
   $161 = $Result;
   $0 = $161;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 52: {
   $171 = $Result;
   $0 = $171;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 54: {
   $174 = $Result;
   $0 = $174;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 56: {
   $177 = $Result;
   $0 = $177;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 59: {
   $185 = (__Z5Error10TErrorCode(37)|0);
   $0 = $185;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 61: {
   $188 = (__Z5Error10TErrorCode(10)|0);
   $0 = $188;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 63: {
   $198 = $Result;
   $0 = $198;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 65: {
   $201 = $Result;
   $0 = $201;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
  case 75: {
   $0 = 0;
   $207 = $0;
   STACKTOP = sp;return ($207|0);
   break;
  }
 }
 return (0)|0;
}
function __Z11CountGosubsv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Element = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 HEAP16[238720>>1] = 0;
 HEAP16[238408>>1] = 0;
 while(1) {
  $1 = (__Z10GetElementP12TElementList($Element)|0);
  $2 = ($1<<24>>24)!=(0);
  if (!($2)) {
   label = 10;
   break;
  }
  $3 = HEAP32[$Element>>2]|0;
  $4 = ($3|0)==(3);
  if ($4) {
   $5 = (($Element) + 4|0);
   $6 = HEAP16[$5>>1]|0;
   $7 = $6&65535;
   $8 = ($7|0)==(20);
   if ($8) {
    $9 = HEAP16[238408>>1]|0;
    $10 = (($9) + 1)<<16>>16;
    HEAP16[238408>>1] = $10;
   }
   $11 = HEAP16[238408>>1]|0;
   $12 = $11&65535;
   $13 = ($12|0)>(255);
   if ($13) {
    label = 7;
    break;
   }
  }
 }
 if ((label|0) == 7) {
  $14 = (__Z5Error10TErrorCode(47)|0);
  $0 = $14;
  $15 = $0;
  STACKTOP = sp;return ($15|0);
 }
 else if ((label|0) == 10) {
  $0 = 0;
  $15 = $0;
  STACKTOP = sp;return ($15|0);
 }
 return (0)|0;
}
function __Z19CompileInstructionsv() {
 var $$byval_copy = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0;
 var $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0;
 var $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0;
 var $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0;
 var $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0;
 var $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0;
 var $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0;
 var $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0;
 var $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0;
 var $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0;
 var $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0;
 var $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0;
 var $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0;
 var $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0;
 var $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0;
 var $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0;
 var $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0;
 var $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0;
 var $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $Element = 0, $Result = 0, $SoftEnd = 0, $StartFlag = 0, dest = 0, label = 0, sp = 0;
 var src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy = sp + 16|0;
 $SoftEnd = sp + 120|0;
 $Element = sp;
 $1 = sp + 64|0;
 HEAP16[238720>>1] = 0;
 HEAP32[258704>>2] = 0;
 HEAP8[238776>>0] = 0;
 HEAP8[258712>>0] = 0;
 HEAP8[250432>>0] = 0;
 HEAP8[258720>>0] = 0;
 HEAP8[250440>>0] = 0;
 $2 = HEAP32[8>>2]|0;
 $3 = (($2) + 8|0);
 HEAP8[$3>>0] = 0;
 $4 = HEAP16[238408>>1]|0;
 $5 = $4&65535;
 $6 = (($5) + 1)|0;
 $7 = ($6*14)|0;
 $8 = $7&65535;
 HEAP16[258728>>1] = $8;
 HEAP16[238408>>1] = 0;
 $StartFlag = 0;
 L1: while(1) {
  $9 = (__Z10GetElementP12TElementList($Element)|0);
  $10 = ($9<<24>>24)!=(0);
  if (!($10)) {
   label = 258;
   break;
  }
  $11 = HEAP32[$Element>>2]|0;
  $12 = ($11|0)==(43);
  if ($12) {
   label = 4;
   break;
  }
  $14 = HEAP32[$Element>>2]|0;
  $15 = ($14|0)==(46);
  if ($15) {
   $16 = (__Z10CopySymbolv()|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    label = 7;
    break;
   }
   HEAP32[((250448 + 36|0))>>2] = 43;
   $19 = HEAP16[258728>>1]|0;
   HEAP16[((250448 + 40|0))>>1] = $19;
   dest=$1+0|0; src=250448+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
   dest=$$byval_copy+0|0; src=$1+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
   $20 = (__Z11EnterSymbol12TSymbolTable($$byval_copy)|0);
   $Result = $20;
   $21 = ($20|0)!=(0);
   if ($21) {
    label = 9;
    break;
   }
   $23 = HEAP8[238424>>0]|0;
   $24 = ($23<<24>>24)!=(0);
   if ($24) {
    $25 = (__Z14PreviewElementP12TElementList($Element)|0);
    $26 = ($25<<24>>24)!=(0);
    if ($26) {
     $27 = HEAP32[$Element>>2]|0;
     $28 = ($27|0)!=(47);
     if ($28) {
      label = 15;
      break;
     }
     $29 = HEAP32[$Element>>2]|0;
     $30 = ($29|0)==(47);
     if ($30) {
      $31 = (($Element) + 4|0);
      $32 = HEAP16[$31>>1]|0;
      $33 = $32&65535;
      $34 = ($33|0)==(0);
      if ($34) {
       label = 15;
       break;
      }
     }
    }
   }
  } else {
   $36 = $StartFlag;
   $37 = ($36<<24>>24)!=(0);
   if (!($37)) {
    $38 = (__Z12PatchAddresst(0)|0);
    $Result = $38;
    $39 = ($38|0)!=(0);
    if ($39) {
     label = 19;
     break;
    }
    $StartFlag = 1;
   }
   __Z14EnterSrcTokRefv();
   $41 = HEAP32[$Element>>2]|0;
   $42 = ($41|0)==(5);
   if ($42) {
    label = 23;
   } else {
    $43 = HEAP32[$Element>>2]|0;
    $44 = ($43|0)==(42);
    if ($44) {
     label = 23;
    } else {
     $50 = HEAP32[$Element>>2]|0;
     $51 = ($50|0)!=(3);
     if ($51) {
      label = 27;
      break;
     }
     $53 = (($Element) + 4|0);
     $54 = HEAP16[$53>>1]|0;
     $55 = $54&65535;
     do {
      switch ($55|0) {
      case 0:  {
       $56 = (__Z12CompileAuxiov()|0);
       $Result = $56;
       $57 = ($56|0)!=(0);
       if ($57) {
        label = 30;
        break L1;
       }
       break;
      }
      case 1:  {
       $59 = (__Z13CompileBranchv()|0);
       $Result = $59;
       $60 = ($59|0)!=(0);
       if ($60) {
        label = 33;
        break L1;
       }
       break;
      }
      case 2:  {
       $62 = (__Z13CompileButtonv()|0);
       $Result = $62;
       $63 = ($62|0)!=(0);
       if ($63) {
        label = 36;
        break L1;
       }
       break;
      }
      case 3:  {
       $65 = (__Z11CompileCasev()|0);
       $Result = $65;
       $66 = ($65|0)!=(0);
       if ($66) {
        label = 39;
        break L1;
       }
       break;
      }
      case 4:  {
       $68 = (__Z12CompileCountv()|0);
       $Result = $68;
       $69 = ($68|0)!=(0);
       if ($69) {
        label = 42;
        break L1;
       }
       break;
      }
      case 5:  {
       $71 = (__Z12CompileDebugv()|0);
       $Result = $71;
       $72 = ($71|0)!=(0);
       if ($72) {
        label = 45;
        break L1;
       }
       break;
      }
      case 6:  {
       $74 = (__Z14CompileDebugInv()|0);
       $Result = $74;
       $75 = ($74|0)!=(0);
       if ($75) {
        label = 48;
        break L1;
       }
       break;
      }
      case 8:  {
       $77 = (__Z9CompileDov()|0);
       $Result = $77;
       $78 = ($77|0)!=(0);
       if ($78) {
        label = 51;
        break L1;
       }
       break;
      }
      case 9:  {
       $80 = (__Z14CompileDtmfoutv()|0);
       $Result = $80;
       $81 = ($80|0)!=(0);
       if ($81) {
        label = 54;
        break L1;
       }
       break;
      }
      case 10:  {
       $83 = (__Z11CompileElsev()|0);
       $Result = $83;
       $84 = ($83|0)!=(0);
       if ($84) {
        label = 57;
        break L1;
       }
       break;
      }
      case 12:  {
       $86 = (__Z10CompileEndv()|0);
       $Result = $86;
       $87 = ($86|0)!=(0);
       if ($87) {
        label = 60;
        break L1;
       }
       break;
      }
      case 13:  {
       $89 = (__Z12CompileEndIfv()|0);
       $Result = $89;
       $90 = ($89|0)!=(0);
       if ($90) {
        label = 63;
        break L1;
       }
       break;
      }
      case 14:  {
       $92 = (__Z16CompileEndSelectv()|0);
       $Result = $92;
       $93 = ($92|0)!=(0);
       if ($93) {
        label = 66;
        break L1;
       }
       break;
      }
      case 16:  {
       $95 = (__Z11CompileExitv()|0);
       $Result = $95;
       $96 = ($95|0)!=(0);
       if ($96) {
        label = 69;
        break L1;
       }
       break;
      }
      case 17:  {
       $98 = (__Z10CompileForv()|0);
       $Result = $98;
       $99 = ($98|0)!=(0);
       if ($99) {
        label = 72;
        break L1;
       }
       break;
      }
      case 18:  {
       $101 = (__Z14CompileFreqoutv()|0);
       $Result = $101;
       $102 = ($101|0)!=(0);
       if ($102) {
        label = 75;
        break L1;
       }
       break;
      }
      case 19:  {
       $104 = (__Z10CompileGetv()|0);
       $Result = $104;
       $105 = ($104|0)!=(0);
       if ($105) {
        label = 78;
        break L1;
       }
       break;
      }
      case 20:  {
       $107 = (__Z12CompileGosubv()|0);
       $Result = $107;
       $108 = ($107|0)!=(0);
       if ($108) {
        label = 81;
        break L1;
       }
       break;
      }
      case 21:  {
       $110 = (__Z11CompileGotov()|0);
       $Result = $110;
       $111 = ($110|0)!=(0);
       if ($111) {
        label = 84;
        break L1;
       }
       break;
      }
      case 22:  {
       $113 = (__Z11CompileHighv()|0);
       $Result = $113;
       $114 = ($113|0)!=(0);
       if ($114) {
        label = 87;
        break L1;
       }
       break;
      }
      case 23:  {
       $116 = (__Z12CompileI2cinv()|0);
       $Result = $116;
       $117 = ($116|0)!=(0);
       if ($117) {
        label = 90;
        break L1;
       }
       break;
      }
      case 24:  {
       $119 = (__Z13CompileI2coutv()|0);
       $Result = $119;
       $120 = ($119|0)!=(0);
       if ($120) {
        label = 93;
        break L1;
       }
       break;
      }
      case 11: case 25:  {
       $122 = (($Element) + 4|0);
       $123 = HEAP16[$122>>1]|0;
       $124 = $123&65535;
       $125 = ($124|0)==(11);
       $126 = $125&1;
       $127 = (__Z9CompileIfh($126)|0);
       $Result = $127;
       $128 = ($127|0)!=(0);
       if ($128) {
        label = 96;
        break L1;
       }
       break;
      }
      case 26:  {
       $130 = (__Z12CompileInputv()|0);
       $Result = $130;
       $131 = ($130|0)!=(0);
       if ($131) {
        label = 99;
        break L1;
       }
       break;
      }
      case 27:  {
       $133 = (__Z13CompileIotermv()|0);
       $Result = $133;
       $134 = ($133|0)!=(0);
       if ($134) {
        label = 102;
        break L1;
       }
       break;
      }
      case 28:  {
       $136 = (__Z13CompileLcdcmdv()|0);
       $Result = $136;
       $137 = ($136|0)!=(0);
       if ($137) {
        label = 105;
        break L1;
       }
       break;
      }
      case 29:  {
       $139 = (__Z12CompileLcdinv()|0);
       $Result = $139;
       $140 = ($139|0)!=(0);
       if ($140) {
        label = 108;
        break L1;
       }
       break;
      }
      case 30:  {
       $142 = (__Z13CompileLcdoutv()|0);
       $Result = $142;
       $143 = ($142|0)!=(0);
       if ($143) {
        label = 111;
        break L1;
       }
       break;
      }
      case 31:  {
       $145 = (__Z15CompileLookdownv()|0);
       $Result = $145;
       $146 = ($145|0)!=(0);
       if ($146) {
        label = 114;
        break L1;
       }
       break;
      }
      case 32:  {
       $148 = (__Z13CompileLookupv()|0);
       $Result = $148;
       $149 = ($148|0)!=(0);
       if ($149) {
        label = 117;
        break L1;
       }
       break;
      }
      case 33:  {
       $151 = (__Z11CompileLoopv()|0);
       $Result = $151;
       $152 = ($151|0)!=(0);
       if ($152) {
        label = 120;
        break L1;
       }
       break;
      }
      case 34:  {
       $154 = (__Z10CompileLowv()|0);
       $Result = $154;
       $155 = ($154|0)!=(0);
       if ($155) {
        label = 123;
        break L1;
       }
       break;
      }
      case 35:  {
       $157 = (__Z13CompileMainiov()|0);
       $Result = $157;
       $158 = ($157|0)!=(0);
       if ($158) {
        label = 126;
        break L1;
       }
       break;
      }
      case 36:  {
       $160 = (__Z10CompileNapv()|0);
       $Result = $160;
       $161 = ($160|0)!=(0);
       if ($161) {
        label = 129;
        break L1;
       }
       break;
      }
      case 37:  {
       $163 = (__Z11CompileNextv()|0);
       $Result = $163;
       $164 = ($163|0)!=(0);
       if ($164) {
        label = 132;
        break L1;
       }
       break;
      }
      case 38:  {
       $166 = (__Z9CompileOnv()|0);
       $Result = $166;
       $167 = ($166|0)!=(0);
       if ($167) {
        label = 135;
        break L1;
       }
       break;
      }
      case 39:  {
       $169 = (__Z13CompileOutputv()|0);
       $Result = $169;
       $170 = ($169|0)!=(0);
       if ($170) {
        label = 138;
        break L1;
       }
       break;
      }
      case 40:  {
       $172 = (__Z11CompileOwinv()|0);
       $Result = $172;
       $173 = ($172|0)!=(0);
       if ($173) {
        label = 141;
        break L1;
       }
       break;
      }
      case 41:  {
       $175 = (__Z12CompileOwoutv()|0);
       $Result = $175;
       $176 = ($175|0)!=(0);
       if ($176) {
        label = 144;
        break L1;
       }
       break;
      }
      case 42:  {
       $178 = (__Z12CompilePausev()|0);
       $Result = $178;
       $179 = ($178|0)!=(0);
       if ($179) {
        label = 147;
        break L1;
       }
       break;
      }
      case 43:  {
       $181 = (__Z13CompilePollinv()|0);
       $Result = $181;
       $182 = ($181|0)!=(0);
       if ($182) {
        label = 150;
        break L1;
       }
       break;
      }
      case 44:  {
       $184 = (__Z15CompilePollmodev()|0);
       $Result = $184;
       $185 = ($184|0)!=(0);
       if ($185) {
        label = 153;
        break L1;
       }
       break;
      }
      case 45:  {
       $187 = (__Z14CompilePolloutv()|0);
       $Result = $187;
       $188 = ($187|0)!=(0);
       if ($188) {
        label = 156;
        break L1;
       }
       break;
      }
      case 46:  {
       $190 = (__Z14CompilePollrunv()|0);
       $Result = $190;
       $191 = ($190|0)!=(0);
       if ($191) {
        label = 159;
        break L1;
       }
       break;
      }
      case 47:  {
       $193 = (__Z15CompilePollwaitv()|0);
       $Result = $193;
       $194 = ($193|0)!=(0);
       if ($194) {
        label = 162;
        break L1;
       }
       break;
      }
      case 48:  {
       $196 = (__Z13CompilePulsinv()|0);
       $Result = $196;
       $197 = ($196|0)!=(0);
       if ($197) {
        label = 165;
        break L1;
       }
       break;
      }
      case 49:  {
       $199 = (__Z14CompilePulsoutv()|0);
       $Result = $199;
       $200 = ($199|0)!=(0);
       if ($200) {
        label = 168;
        break L1;
       }
       break;
      }
      case 50:  {
       $202 = (__Z10CompilePutv()|0);
       $Result = $202;
       $203 = ($202|0)!=(0);
       if ($203) {
        label = 171;
        break L1;
       }
       break;
      }
      case 51:  {
       $205 = (__Z10CompilePwmv()|0);
       $Result = $205;
       $206 = ($205|0)!=(0);
       if ($206) {
        label = 174;
        break L1;
       }
       break;
      }
      case 53:  {
       $208 = (__Z13CompileRandomv()|0);
       $Result = $208;
       $209 = ($208|0)!=(0);
       if ($209) {
        label = 177;
        break L1;
       }
       break;
      }
      case 54:  {
       $211 = (__Z13CompileRctimev()|0);
       $Result = $211;
       $212 = ($211|0)!=(0);
       if ($212) {
        label = 180;
        break L1;
       }
       break;
      }
      case 55:  {
       $214 = (__Z11CompileReadv()|0);
       $Result = $214;
       $215 = ($214|0)!=(0);
       if ($215) {
        label = 183;
        break L1;
       }
       break;
      }
      case 56:  {
       $217 = (__Z13CompileReturnv()|0);
       $Result = $217;
       $218 = ($217|0)!=(0);
       if ($218) {
        label = 186;
        break L1;
       }
       break;
      }
      case 57:  {
       $220 = (__Z14CompileReversev()|0);
       $Result = $220;
       $221 = ($220|0)!=(0);
       if ($221) {
        label = 189;
        break L1;
       }
       break;
      }
      case 58:  {
       $223 = (__Z10CompileRunv()|0);
       $Result = $223;
       $224 = ($223|0)!=(0);
       if ($224) {
        label = 192;
        break L1;
       }
       break;
      }
      case 59:  {
       $226 = (__Z13CompileSelectv()|0);
       $Result = $226;
       $227 = ($226|0)!=(0);
       if ($227) {
        label = 195;
        break L1;
       }
       break;
      }
      case 60:  {
       $229 = (__Z12CompileSerinv()|0);
       $Result = $229;
       $230 = ($229|0)!=(0);
       if ($230) {
        label = 198;
        break L1;
       }
       break;
      }
      case 61:  {
       $232 = (__Z13CompileSeroutv()|0);
       $Result = $232;
       $233 = ($232|0)!=(0);
       if ($233) {
        label = 201;
        break L1;
       }
       break;
      }
      case 62:  {
       $235 = (__Z14CompileShiftinv()|0);
       $Result = $235;
       $236 = ($235|0)!=(0);
       if ($236) {
        label = 204;
        break L1;
       }
       break;
      }
      case 63:  {
       $238 = (__Z15CompileShiftoutv()|0);
       $Result = $238;
       $239 = ($238|0)!=(0);
       if ($239) {
        label = 207;
        break L1;
       }
       break;
      }
      case 52:  {
       $241 = (__Z12CompileSleepv()|0);
       $Result = $241;
       $242 = ($241|0)!=(0);
       if ($242) {
        label = 210;
        break L1;
       }
       break;
      }
      case 64:  {
       $244 = (__Z11CompileStopv()|0);
       $Result = $244;
       $245 = ($244|0)!=(0);
       if ($245) {
        label = 213;
        break L1;
       }
       break;
      }
      case 65:  {
       $247 = (__Z12CompileStorev()|0);
       $Result = $247;
       $248 = ($247|0)!=(0);
       if ($248) {
        label = 216;
        break L1;
       }
       break;
      }
      case 66:  {
       $250 = (__Z13CompileTogglev()|0);
       $Result = $250;
       $251 = ($250|0)!=(0);
       if ($251) {
        label = 219;
        break L1;
       }
       break;
      }
      case 67:  {
       $253 = (__Z12CompileWritev()|0);
       $Result = $253;
       $254 = ($253|0)!=(0);
       if ($254) {
        label = 222;
        break L1;
       }
       break;
      }
      case 68:  {
       $256 = (__Z11CompileXoutv()|0);
       $Result = $256;
       $257 = ($256|0)!=(0);
       if ($257) {
        label = 225;
        break L1;
       }
       break;
      }
      default: {
      }
      }
     } while(0);
    }
   }
   if ((label|0) == 23) {
    label = 0;
    $45 = HEAP16[238720>>1]|0;
    $46 = (($45) + -1)<<16>>16;
    HEAP16[238720>>1] = $46;
    $47 = (__Z10CompileLetv()|0);
    $Result = $47;
    $48 = ($47|0)!=(0);
    if ($48) {
     label = 24;
     break;
    }
   }
  }
  $259 = HEAP8[250432>>0]|0;
  $260 = $259&255;
  $261 = ($260|0)==(0);
  if ($261) {
   label = 231;
  } else {
   $262 = HEAP8[238776>>0]|0;
   $263 = $262&255;
   $264 = (($263) - 1)|0;
   $265 = (238784 + (($264*48)|0)|0);
   $266 = HEAP32[$265>>2]|0;
   $267 = ($266|0)<(4);
   if ($267) {
    $271 = HEAP8[238776>>0]|0;
    $272 = $271&255;
    $273 = (($272) - 1)|0;
    $274 = (238784 + (($273*48)|0)|0);
    $275 = HEAP32[$274>>2]|0;
    $276 = ($275|0)==(2);
    if ($276) {
     label = 236;
    } else {
     $277 = HEAP8[238776>>0]|0;
     $278 = $277&255;
     $279 = (($278) - 1)|0;
     $280 = (238784 + (($279*48)|0)|0);
     $281 = HEAP32[$280>>2]|0;
     $282 = ($281|0)==(0);
     if ($282) {
      label = 236;
     } else {
      $322 = HEAP8[238776>>0]|0;
      $323 = $322&255;
      $324 = (($323) - 1)|0;
      $325 = (238784 + (($324*48)|0)|0);
      $326 = HEAP32[$325>>2]|0;
      $327 = ($326|0)==(3);
      if ($327) {
       label = 254;
      } else {
       $328 = HEAP8[238776>>0]|0;
       $329 = $328&255;
       $330 = (($329) - 1)|0;
       $331 = (238784 + (($330*48)|0)|0);
       $332 = HEAP32[$331>>2]|0;
       $333 = ($332|0)==(1);
       if ($333) {
        label = 254;
       }
      }
      if ((label|0) == 254) {
       label = 0;
       $334 = HEAP8[238776>>0]|0;
       $335 = $334&255;
       $336 = (($335) - 1)|0;
       $337 = (238784 + (($336*48)|0)|0);
       $338 = HEAP32[$337>>2]|0;
       $339 = $338&255;
       $340 = $339&255;
       $341 = (($340) - 1)|0;
       $342 = HEAP8[238776>>0]|0;
       $343 = $342&255;
       $344 = (($343) - 1)|0;
       $345 = (238784 + (($344*48)|0)|0);
       HEAP32[$345>>2] = $341;
      }
     }
    }
    if ((label|0) == 236) {
     label = 0;
     (__Z14PreviewElementP12TElementList($Element)|0);
     $283 = HEAP8[238776>>0]|0;
     $284 = $283&255;
     $285 = (($284) - 1)|0;
     $286 = (238784 + (($285*48)|0)|0);
     $287 = HEAP32[$286>>2]|0;
     $288 = ($287|0)==(0);
     if ($288) {
      label = 240;
     } else {
      $289 = HEAP32[$Element>>2]|0;
      $290 = ($289|0)!=(3);
      if ($290) {
       label = 240;
      } else {
       $291 = (($Element) + 4|0);
       $292 = HEAP16[$291>>1]|0;
       $293 = $292&65535;
       $294 = ($293|0)!=(10);
       if ($294) {
        $295 = (($Element) + 4|0);
        $296 = HEAP16[$295>>1]|0;
        $297 = $296&65535;
        $298 = ($297|0)!=(11);
        if ($298) {
         label = 240;
        }
       }
      }
     }
     if ((label|0) == 240) {
      label = 0;
      $299 = (__Z6GetEndPh($SoftEnd)|0);
      $Result = $299;
      $300 = ($299|0)!=(0);
      if ($300) {
       label = 241;
       break;
      }
      $302 = HEAP8[$SoftEnd>>0]|0;
      $303 = ($302<<24>>24)!=(0);
      if (!($303)) {
       $304 = HEAP8[238776>>0]|0;
       $305 = $304&255;
       $306 = (($305) - 1)|0;
       $307 = (238784 + (($306*48)|0)|0);
       $308 = (($307) + 16|0);
       $309 = HEAP16[$308>>1]|0;
       $310 = $309&65535;
       $311 = ($310|0)>(0);
       if ($311) {
        $312 = (__Z15PatchSkipLabelsh(1)|0);
        $Result = $312;
        $313 = ($312|0)!=(0);
        if ($313) {
         label = 245;
         break;
        }
       }
       $315 = (__Z15PatchSkipLabelsh(0)|0);
       $Result = $315;
       $316 = ($315|0)!=(0);
       if ($316) {
        label = 248;
        break;
       }
       $318 = HEAP8[238776>>0]|0;
       $319 = (($318) + -1)<<24>>24;
       HEAP8[238776>>0] = $319;
       $320 = HEAP8[250432>>0]|0;
       $321 = (($320) + -1)<<24>>24;
       HEAP8[250432>>0] = $321;
      }
     }
    }
   } else {
    label = 231;
   }
  }
  if ((label|0) == 231) {
   label = 0;
   $268 = (__Z6GetEndPh($SoftEnd)|0);
   $Result = $268;
   $269 = ($268|0)!=(0);
   if ($269) {
    label = 232;
    break;
   }
  }
 }
 L197:  switch (label|0) {
  case 4: {
   $13 = (__Z5Error10TErrorCode(17)|0);
   $0 = $13;
   break;
  }
  case 7: {
   $18 = $Result;
   $0 = $18;
   break;
  }
  case 9: {
   $22 = $Result;
   $0 = $22;
   break;
  }
  case 15: {
   $35 = (__Z5Error10TErrorCode(78)|0);
   $0 = $35;
   break;
  }
  case 19: {
   $40 = $Result;
   $0 = $40;
   break;
  }
  case 24: {
   $49 = $Result;
   $0 = $49;
   break;
  }
  case 27: {
   $52 = (__Z5Error10TErrorCode(51)|0);
   $0 = $52;
   break;
  }
  case 30: {
   $58 = $Result;
   $0 = $58;
   break;
  }
  case 33: {
   $61 = $Result;
   $0 = $61;
   break;
  }
  case 36: {
   $64 = $Result;
   $0 = $64;
   break;
  }
  case 39: {
   $67 = $Result;
   $0 = $67;
   break;
  }
  case 42: {
   $70 = $Result;
   $0 = $70;
   break;
  }
  case 45: {
   $73 = $Result;
   $0 = $73;
   break;
  }
  case 48: {
   $76 = $Result;
   $0 = $76;
   break;
  }
  case 51: {
   $79 = $Result;
   $0 = $79;
   break;
  }
  case 54: {
   $82 = $Result;
   $0 = $82;
   break;
  }
  case 57: {
   $85 = $Result;
   $0 = $85;
   break;
  }
  case 60: {
   $88 = $Result;
   $0 = $88;
   break;
  }
  case 63: {
   $91 = $Result;
   $0 = $91;
   break;
  }
  case 66: {
   $94 = $Result;
   $0 = $94;
   break;
  }
  case 69: {
   $97 = $Result;
   $0 = $97;
   break;
  }
  case 72: {
   $100 = $Result;
   $0 = $100;
   break;
  }
  case 75: {
   $103 = $Result;
   $0 = $103;
   break;
  }
  case 78: {
   $106 = $Result;
   $0 = $106;
   break;
  }
  case 81: {
   $109 = $Result;
   $0 = $109;
   break;
  }
  case 84: {
   $112 = $Result;
   $0 = $112;
   break;
  }
  case 87: {
   $115 = $Result;
   $0 = $115;
   break;
  }
  case 90: {
   $118 = $Result;
   $0 = $118;
   break;
  }
  case 93: {
   $121 = $Result;
   $0 = $121;
   break;
  }
  case 96: {
   $129 = $Result;
   $0 = $129;
   break;
  }
  case 99: {
   $132 = $Result;
   $0 = $132;
   break;
  }
  case 102: {
   $135 = $Result;
   $0 = $135;
   break;
  }
  case 105: {
   $138 = $Result;
   $0 = $138;
   break;
  }
  case 108: {
   $141 = $Result;
   $0 = $141;
   break;
  }
  case 111: {
   $144 = $Result;
   $0 = $144;
   break;
  }
  case 114: {
   $147 = $Result;
   $0 = $147;
   break;
  }
  case 117: {
   $150 = $Result;
   $0 = $150;
   break;
  }
  case 120: {
   $153 = $Result;
   $0 = $153;
   break;
  }
  case 123: {
   $156 = $Result;
   $0 = $156;
   break;
  }
  case 126: {
   $159 = $Result;
   $0 = $159;
   break;
  }
  case 129: {
   $162 = $Result;
   $0 = $162;
   break;
  }
  case 132: {
   $165 = $Result;
   $0 = $165;
   break;
  }
  case 135: {
   $168 = $Result;
   $0 = $168;
   break;
  }
  case 138: {
   $171 = $Result;
   $0 = $171;
   break;
  }
  case 141: {
   $174 = $Result;
   $0 = $174;
   break;
  }
  case 144: {
   $177 = $Result;
   $0 = $177;
   break;
  }
  case 147: {
   $180 = $Result;
   $0 = $180;
   break;
  }
  case 150: {
   $183 = $Result;
   $0 = $183;
   break;
  }
  case 153: {
   $186 = $Result;
   $0 = $186;
   break;
  }
  case 156: {
   $189 = $Result;
   $0 = $189;
   break;
  }
  case 159: {
   $192 = $Result;
   $0 = $192;
   break;
  }
  case 162: {
   $195 = $Result;
   $0 = $195;
   break;
  }
  case 165: {
   $198 = $Result;
   $0 = $198;
   break;
  }
  case 168: {
   $201 = $Result;
   $0 = $201;
   break;
  }
  case 171: {
   $204 = $Result;
   $0 = $204;
   break;
  }
  case 174: {
   $207 = $Result;
   $0 = $207;
   break;
  }
  case 177: {
   $210 = $Result;
   $0 = $210;
   break;
  }
  case 180: {
   $213 = $Result;
   $0 = $213;
   break;
  }
  case 183: {
   $216 = $Result;
   $0 = $216;
   break;
  }
  case 186: {
   $219 = $Result;
   $0 = $219;
   break;
  }
  case 189: {
   $222 = $Result;
   $0 = $222;
   break;
  }
  case 192: {
   $225 = $Result;
   $0 = $225;
   break;
  }
  case 195: {
   $228 = $Result;
   $0 = $228;
   break;
  }
  case 198: {
   $231 = $Result;
   $0 = $231;
   break;
  }
  case 201: {
   $234 = $Result;
   $0 = $234;
   break;
  }
  case 204: {
   $237 = $Result;
   $0 = $237;
   break;
  }
  case 207: {
   $240 = $Result;
   $0 = $240;
   break;
  }
  case 210: {
   $243 = $Result;
   $0 = $243;
   break;
  }
  case 213: {
   $246 = $Result;
   $0 = $246;
   break;
  }
  case 216: {
   $249 = $Result;
   $0 = $249;
   break;
  }
  case 219: {
   $252 = $Result;
   $0 = $252;
   break;
  }
  case 222: {
   $255 = $Result;
   $0 = $255;
   break;
  }
  case 225: {
   $258 = $Result;
   $0 = $258;
   break;
  }
  case 232: {
   $270 = $Result;
   $0 = $270;
   break;
  }
  case 241: {
   $301 = $Result;
   $0 = $301;
   break;
  }
  case 245: {
   $314 = $Result;
   $0 = $314;
   break;
  }
  case 248: {
   $317 = $Result;
   $0 = $317;
   break;
  }
  case 258: {
   $346 = $StartFlag;
   $347 = ($346<<24>>24)!=(0);
   do {
    if ($347) {
     $348 = (__Z10Enter0Code16TInstructionCode(0)|0);
     $Result = $348;
     $349 = ($348|0)!=(0);
     if ($349) {
      $350 = $Result;
      $0 = $350;
      break L197;
     } else {
      break;
     }
    }
   } while(0);
   $351 = HEAP8[238424>>0]|0;
   $352 = ($351<<24>>24)!=(0);
   L282: do {
    if ($352) {
     $353 = HEAP8[238776>>0]|0;
     $354 = $353&255;
     $355 = ($354|0)>(0);
     if ($355) {
      $356 = HEAP8[238776>>0]|0;
      $357 = $356&255;
      $358 = (($357) - 1)|0;
      $359 = (238784 + (($358*48)|0)|0);
      $360 = (($359) + 4|0);
      $361 = HEAP16[$360>>1]|0;
      HEAP16[238720>>1] = $361;
      (__Z10GetElementP12TElementList($Element)|0);
      $362 = HEAP8[238776>>0]|0;
      $363 = $362&255;
      $364 = (($363) - 1)|0;
      $365 = (238784 + (($364*48)|0)|0);
      $366 = HEAP32[$365>>2]|0;
      switch ($366|0) {
      case 5: case 4: case 2: case 0:  {
       $367 = (__Z5Error10TErrorCode(72)|0);
       $0 = $367;
       break L197;
       break;
      }
      case 6:  {
       $368 = (__Z5Error10TErrorCode(73)|0);
       $0 = $368;
       break L197;
       break;
      }
      case 7:  {
       $369 = (__Z5Error10TErrorCode(74)|0);
       $0 = $369;
       break L197;
       break;
      }
      case 8:  {
       $370 = (__Z5Error10TErrorCode(88)|0);
       $0 = $370;
       break L197;
       break;
      }
      default: {
       break L282;
      }
      }
     }
    }
   } while(0);
   $0 = 0;
   break;
  }
 }
 $371 = $0;
 STACKTOP = sp;return ($371|0);
}
function __Z23PatchRemainingAddressesv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $Element = 0, $Idx = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 4|0;
 $Idx = 0;
 while(1) {
  $1 = $Idx;
  $2 = HEAP32[258704>>2]|0;
  $3 = (($2) - 1)|0;
  $4 = ($1|0)<($3|0);
  if (!($4)) {
   label = 8;
   break;
  }
  $5 = $Idx;
  $6 = (259056 + ($5<<1)|0);
  $7 = HEAP16[$6>>1]|0;
  HEAP16[238720>>1] = $7;
  $8 = $Idx;
  $9 = (($8) + 1)|0;
  $10 = (259056 + ($9<<1)|0);
  $11 = HEAP16[$10>>1]|0;
  HEAP16[258728>>1] = $11;
  $12 = $Idx;
  $13 = (($12) + 2)|0;
  $Idx = $13;
  (__Z10GetElementP12TElementList($Element)|0);
  $14 = HEAP32[$Element>>2]|0;
  $15 = ($14|0)==(46);
  if ($15) {
   label = 4;
   break;
  }
  $17 = (($Element) + 4|0);
  $18 = HEAP16[$17>>1]|0;
  $19 = (__Z12EnterAddresst($18)|0);
  $Result = $19;
  $20 = ($19|0)!=(0);
  if ($20) {
   label = 6;
   break;
  }
 }
 if ((label|0) == 4) {
  $16 = (__Z5Error10TErrorCode(11)|0);
  $0 = $16;
  $22 = $0;
  STACKTOP = sp;return ($22|0);
 }
 else if ((label|0) == 6) {
  $21 = $Result;
  $0 = $21;
  $22 = $0;
  STACKTOP = sp;return ($22|0);
 }
 else if ((label|0) == 8) {
  $0 = 0;
  $22 = $0;
  STACKTOP = sp;return ($22|0);
 }
 return (0)|0;
}
function __Z14PreparePacketsv() {
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0;
 var $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0;
 var $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0;
 var $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0;
 var $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0;
 var $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $BuffSize = 0, $Checksum = 0, $Flags = 0, $Idx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP16[258728>>1] = 0;
 $0 = HEAP32[8>>2]|0;
 $1 = (($0) + 4200|0);
 HEAP8[$1>>0] = 0;
 $BuffSize = 0;
 while(1) {
  $Flags = 0;
  $Idx = 0;
  while(1) {
   $2 = $Idx;
   $3 = ($2|0)<=(15);
   if (!($3)) {
    break;
   }
   $4 = $Flags;
   $5 = $4&255;
   $6 = HEAP16[258728>>1]|0;
   $7 = $6&65535;
   $8 = $Idx;
   $9 = (($7) + ($8))|0;
   $10 = HEAP32[8>>2]|0;
   $11 = (($10) + 2148|0);
   $12 = (($11) + ($9)|0);
   $13 = HEAP8[$12>>0]|0;
   $14 = $13&255;
   $15 = $5 | $14;
   $16 = $15&255;
   $Flags = $16;
   $17 = $Idx;
   $18 = (($17) + 1)|0;
   $Idx = $18;
  }
  $19 = $Flags;
  $20 = $19&255;
  $21 = $20 & 2;
  $22 = ($21|0)==(2);
  if ($22) {
   $23 = HEAP16[258728>>1]|0;
   $24 = $23&65535;
   $25 = (($24|0) / 16)&-1;
   $26 = (($25) + 128)|0;
   $27 = $26&255;
   $Checksum = $27;
   $28 = $Checksum;
   $29 = $BuffSize;
   $30 = HEAP32[8>>2]|0;
   $31 = (($30) + 4201|0);
   $32 = (($31) + ($29)|0);
   HEAP8[$32>>0] = $28;
   $33 = $BuffSize;
   $34 = (($33) + 1)|0;
   $BuffSize = $34;
   $Idx = 0;
   while(1) {
    $35 = $Idx;
    $36 = ($35|0)<=(15);
    if (!($36)) {
     break;
    }
    $37 = HEAP16[258728>>1]|0;
    $38 = $37&65535;
    $39 = $Idx;
    $40 = (($38) + ($39))|0;
    $41 = HEAP32[8>>2]|0;
    $42 = (($41) + 2148|0);
    $43 = (($42) + ($40)|0);
    $44 = HEAP8[$43>>0]|0;
    $45 = $44&255;
    $46 = $45 | 128;
    $47 = $46&255;
    $48 = HEAP16[258728>>1]|0;
    $49 = $48&65535;
    $50 = $Idx;
    $51 = (($49) + ($50))|0;
    $52 = HEAP32[8>>2]|0;
    $53 = (($52) + 2148|0);
    $54 = (($53) + ($51)|0);
    HEAP8[$54>>0] = $47;
    $55 = HEAP16[258728>>1]|0;
    $56 = $55&65535;
    $57 = $Idx;
    $58 = (($56) + ($57))|0;
    $59 = HEAP32[8>>2]|0;
    $60 = (($59) + 100|0);
    $61 = (($60) + ($58)|0);
    $62 = HEAP8[$61>>0]|0;
    $63 = $62&255;
    $64 = $Checksum;
    $65 = $64&255;
    $66 = (($65) + ($63))|0;
    $67 = $66&255;
    $Checksum = $67;
    $68 = HEAP16[258728>>1]|0;
    $69 = $68&65535;
    $70 = $Idx;
    $71 = (($69) + ($70))|0;
    $72 = HEAP32[8>>2]|0;
    $73 = (($72) + 100|0);
    $74 = (($73) + ($71)|0);
    $75 = HEAP8[$74>>0]|0;
    $76 = $BuffSize;
    $77 = HEAP32[8>>2]|0;
    $78 = (($77) + 4201|0);
    $79 = (($78) + ($76)|0);
    HEAP8[$79>>0] = $75;
    $80 = $BuffSize;
    $81 = (($80) + 1)|0;
    $BuffSize = $81;
    $82 = $Idx;
    $83 = (($82) + 1)|0;
    $Idx = $83;
   }
   $84 = $Checksum;
   $85 = $84&255;
   $86 = $85 ^ 255;
   $87 = (($86) + 1)|0;
   $88 = $87&255;
   $89 = $BuffSize;
   $90 = HEAP32[8>>2]|0;
   $91 = (($90) + 4201|0);
   $92 = (($91) + ($89)|0);
   HEAP8[$92>>0] = $88;
   $93 = $BuffSize;
   $94 = (($93) + 1)|0;
   $BuffSize = $94;
   $95 = HEAP32[8>>2]|0;
   $96 = (($95) + 4200|0);
   $97 = HEAP8[$96>>0]|0;
   $98 = (($97) + 1)<<24>>24;
   HEAP8[$96>>0] = $98;
  }
  $99 = HEAP16[258728>>1]|0;
  $100 = $99&65535;
  $101 = (($100) + 16)|0;
  $102 = $101&65535;
  HEAP16[258728>>1] = $102;
  $103 = HEAP16[258728>>1]|0;
  $104 = $103&65535;
  $105 = ($104|0)!=(2048);
  if (!($105)) {
   break;
  }
 }
 STACKTOP = sp;return;
}
function __Z5Error10TErrorCode($ErrorID) {
 $ErrorID = $ErrorID|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $ErrorID;
 $1 = $0;
 $2 = (4696 + ($1<<2)|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = (_strlen(($3|0))|0);
 $5 = (2303 - ($4))|0;
 $6 = HEAP32[8>>2]|0;
 $7 = (($6) + 4201|0);
 $8 = (($7) + ($5)|0);
 $9 = $0;
 $10 = (4696 + ($9<<2)|0);
 $11 = HEAP32[$10>>2]|0;
 (_strcpy(($8|0),($11|0))|0);
 $12 = $0;
 $13 = (4696 + ($12<<2)|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = (_strlen(($14|0))|0);
 $16 = (2303 - ($15))|0;
 $17 = HEAP32[8>>2]|0;
 $18 = (($17) + 4201|0);
 $19 = (($18) + ($16)|0);
 $20 = HEAP32[8>>2]|0;
 $21 = (($20) + 4|0);
 HEAP32[$21>>2] = $19;
 $22 = $0;
 STACKTOP = sp;return ($22|0);
}
function __Z11ClearEEPROMv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Idx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Idx = 0;
 while(1) {
  $0 = $Idx;
  $1 = ($0>>>0)<(2048);
  if (!($1)) {
   break;
  }
  $2 = $Idx;
  $3 = HEAP32[8>>2]|0;
  $4 = (($3) + 100|0);
  $5 = (($4) + ($2)|0);
  HEAP8[$5>>0] = 0;
  $6 = $Idx;
  $7 = (($6) + 1)|0;
  $Idx = $7;
 }
 $Idx = 0;
 while(1) {
  $8 = $Idx;
  $9 = ($8>>>0)<(2048);
  if (!($9)) {
   break;
  }
  $10 = $Idx;
  $11 = HEAP32[8>>2]|0;
  $12 = (($11) + 2148|0);
  $13 = (($12) + ($10)|0);
  HEAP8[$13>>0] = 0;
  $14 = $Idx;
  $15 = (($14) + 1)|0;
  $Idx = $15;
 }
 STACKTOP = sp;return;
}
function __Z20ClearSrcTokReferencev() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Idx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = HEAP32[24>>2]|0;
 $1 = ($0|0)!=(0|0);
 if (!($1)) {
  HEAP32[238432>>2] = 0;
  STACKTOP = sp;return;
 }
 $Idx = 0;
 while(1) {
  $2 = $Idx;
  $3 = ($2|0)<(2338);
  if (!($3)) {
   break;
  }
  $4 = HEAP32[24>>2]|0;
  $5 = $Idx;
  $6 = (($4) + ($5<<2)|0);
  HEAP16[$6>>1] = 0;
  $7 = HEAP32[24>>2]|0;
  $8 = $Idx;
  $9 = (($7) + ($8<<2)|0);
  $10 = (($9) + 2|0);
  HEAP16[$10>>1] = 0;
  $11 = $Idx;
  $12 = (($11) + 1)|0;
  $Idx = $12;
 }
 HEAP32[238432>>2] = 0;
 STACKTOP = sp;return;
}
function __Z12GetReadWriteh($Write) {
 $Write = $Write|0;
 var $$byval_copy = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Element = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy = sp + 32|0;
 $Element = sp + 12|0;
 $2 = sp;
 $1 = $Write;
 HEAP8[238440>>0] = 0;
 HEAP8[238448>>0] = 0;
 HEAP16[238456>>1] = 0;
 (__Z10GetElementP12TElementList($Element)|0);
 $3 = HEAP32[$Element>>2]|0;
 $4 = ($3|0)==(5);
 if (!($4)) {
  $5 = HEAP32[$Element>>2]|0;
  $6 = ($5|0)==(42);
  if (!($6)) {
   $7 = (__Z5Error10TErrorCode(37)|0);
   $0 = $7;
   $22 = $0;
   STACKTOP = sp;return ($22|0);
  }
 }
 $8 = HEAP32[$Element>>2]|0;
 $9 = ($8|0)==(42);
 if ($9) {
  $10 = $1;
  $11 = ($10<<24>>24)!=(0);
  if ($11) {
   $12 = (($Element) + 4|0);
   $13 = HEAP16[$12>>1]|0;
   $14 = $13&65535;
   $15 = (($14) + 16)|0;
   $16 = $15&65535;
   $17 = (($Element) + 4|0);
   HEAP16[$17>>1] = $16;
  }
 }
 ;HEAP32[$2+0>>2]=HEAP32[$Element+0>>2]|0;HEAP32[$2+4>>2]=HEAP32[$Element+4>>2]|0;HEAP32[$2+8>>2]=HEAP32[$Element+8>>2]|0;
 $18 = $1;
 ;HEAP32[$$byval_copy+0>>2]=HEAP32[$2+0>>2]|0;HEAP32[$$byval_copy+4>>2]=HEAP32[$2+4>>2]|0;HEAP32[$$byval_copy+8>>2]=HEAP32[$2+8>>2]|0;
 $19 = (__Z23EnterExpressionVariable12TElementListh($$byval_copy,$18)|0);
 $Result = $19;
 $20 = ($19|0)!=(0);
 if ($20) {
  $21 = $Result;
  $0 = $21;
  $22 = $0;
  STACKTOP = sp;return ($22|0);
 } else {
  $0 = 0;
  $22 = $0;
  STACKTOP = sp;return ($22|0);
 }
 return (0)|0;
}
function __Z10GetElementP12TElementList($Element) {
 $Element = $Element|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $Element;
 $Result = 0;
 $1 = $0;
 HEAP32[$1>>2] = 47;
 while(1) {
  $2 = HEAP16[238720>>1]|0;
  $3 = $2&65535;
  $4 = HEAP16[115520>>1]|0;
  $5 = $4&65535;
  $6 = ($3|0)<($5|0);
  if (!($6)) {
   break;
  }
  $7 = HEAP16[238720>>1]|0;
  $8 = $7&65535;
  $9 = (115528 + (($8*12)|0)|0);
  $10 = HEAP32[$9>>2]|0;
  $11 = ($10|0)!=(48);
  if ($11) {
   label = 4;
   break;
  }
  $40 = HEAP16[238720>>1]|0;
  $41 = (($40) + 1)<<16>>16;
  HEAP16[238720>>1] = $41;
 }
 if ((label|0) == 4) {
  $12 = HEAP16[238720>>1]|0;
  $13 = $12&65535;
  $14 = (115528 + (($13*12)|0)|0);
  $15 = HEAP32[$14>>2]|0;
  $16 = $0;
  HEAP32[$16>>2] = $15;
  $17 = HEAP16[238720>>1]|0;
  $18 = $17&65535;
  $19 = (115528 + (($18*12)|0)|0);
  $20 = (($19) + 4|0);
  $21 = HEAP16[$20>>1]|0;
  $22 = $0;
  $23 = (($22) + 4|0);
  HEAP16[$23>>1] = $21;
  $24 = HEAP16[238720>>1]|0;
  $25 = $24&65535;
  $26 = (115528 + (($25*12)|0)|0);
  $27 = (($26) + 6|0);
  $28 = HEAP16[$27>>1]|0;
  $29 = $0;
  $30 = (($29) + 6|0);
  HEAP16[$30>>1] = $28;
  $31 = HEAP16[238720>>1]|0;
  $32 = $31&65535;
  $33 = (115528 + (($32*12)|0)|0);
  $34 = (($33) + 8|0);
  $35 = HEAP8[$34>>0]|0;
  $36 = $0;
  $37 = (($36) + 8|0);
  HEAP8[$37>>0] = $35;
  $38 = HEAP16[238720>>1]|0;
  $39 = (($38) + 1)<<16>>16;
  HEAP16[238720>>1] = $39;
  $Result = 1;
 }
 $42 = $0;
 $43 = HEAP32[$42>>2]|0;
 $44 = ($43|0)==(46);
 if (!($44)) {
  $58 = $0;
  $59 = (($58) + 6|0);
  $60 = HEAP16[$59>>1]|0;
  $61 = $60&65535;
  $62 = HEAP32[8>>2]|0;
  $63 = (($62) + 92|0);
  HEAP32[$63>>2] = $61;
  $64 = $0;
  $65 = (($64) + 8|0);
  $66 = HEAP8[$65>>0]|0;
  $67 = $66&255;
  $68 = HEAP32[8>>2]|0;
  $69 = (($68) + 96|0);
  HEAP32[$69>>2] = $67;
  $70 = $Result;
  STACKTOP = sp;return ($70|0);
 }
 $45 = $0;
 $46 = (($45) + 6|0);
 $47 = HEAP16[$46>>1]|0;
 $48 = $47&65535;
 $49 = $0;
 $50 = (($49) + 8|0);
 $51 = HEAP8[$50>>0]|0;
 $52 = $51&255;
 __Z13GetSymbolNameii($48,$52);
 (__Z10FindSymbolP12TSymbolTable(238728)|0);
 $53 = HEAP32[((238728 + 36|0))>>2]|0;
 $54 = $0;
 HEAP32[$54>>2] = $53;
 $55 = HEAP16[((238728 + 40|0))>>1]|0;
 $56 = $0;
 $57 = (($56) + 4|0);
 HEAP16[$57>>1] = $55;
 $Result = 1;
 $58 = $0;
 $59 = (($58) + 6|0);
 $60 = HEAP16[$59>>1]|0;
 $61 = $60&65535;
 $62 = HEAP32[8>>2]|0;
 $63 = (($62) + 92|0);
 HEAP32[$63>>2] = $61;
 $64 = $0;
 $65 = (($64) + 8|0);
 $66 = HEAP8[$65>>0]|0;
 $67 = $66&255;
 $68 = HEAP32[8>>2]|0;
 $69 = (($68) + 96|0);
 HEAP32[$69>>2] = $67;
 $70 = $Result;
 STACKTOP = sp;return ($70|0);
}
function __Z23EnterExpressionVariable12TElementListh($Element,$Write) {
 $Element = $Element|0;
 $Write = $Write|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $9 = 0, $Preview = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Preview = sp;
 $1 = $Write;
 $2 = (__Z12GetModifiersP12TElementList($Element)|0);
 $Result = $2;
 $3 = ($2|0)!=(0);
 if ($3) {
  $4 = $Result;
  $0 = $4;
  $82 = $0;
  STACKTOP = sp;return ($82|0);
 }
 (__Z14PreviewElementP12TElementList($Preview)|0);
 $5 = HEAP32[$Preview>>2]|0;
 $6 = ($5|0)==(18);
 do {
  if ($6) {
   $7 = HEAP16[238720>>1]|0;
   $8 = (($7) + 1)<<16>>16;
   HEAP16[238720>>1] = $8;
   $9 = (__Z8PushLeftv()|0);
   $Result = $9;
   $10 = ($9|0)!=(0);
   if ($10) {
    $11 = $Result;
    $0 = $11;
    $82 = $0;
    STACKTOP = sp;return ($82|0);
   }
   $12 = (__Z13GetExpressionhhih(0,1,0,0)|0);
   $Result = $12;
   $13 = ($12|0)!=(0);
   if ($13) {
    $14 = $Result;
    $0 = $14;
    $82 = $0;
    STACKTOP = sp;return ($82|0);
   }
   $15 = HEAP8[238440>>0]|0;
   $16 = (($15) + -1)<<24>>24;
   HEAP8[238440>>0] = $16;
   $17 = (__Z8GetRightv()|0);
   $Result = $17;
   $18 = ($17|0)!=(0);
   if (!($18)) {
    $20 = (($Element) + 4|0);
    $21 = HEAP16[$20>>1]|0;
    $22 = $21&65535;
    $23 = $22 | 1024;
    $24 = $23&65535;
    $25 = (($Element) + 4|0);
    HEAP16[$25>>1] = $24;
    break;
   }
   $19 = $Result;
   $0 = $19;
   $82 = $0;
   STACKTOP = sp;return ($82|0);
  }
 } while(0);
 $26 = $1;
 $27 = ($26<<24>>24)!=(0);
 if ($27) {
  $28 = (($Element) + 4|0);
  $29 = HEAP16[$28>>1]|0;
  $30 = $29&65535;
  $31 = $30 | 2048;
  $32 = $31&65535;
  $33 = (($Element) + 4|0);
  HEAP16[$33>>1] = $32;
 }
 $34 = (($Element) + 4|0);
 $35 = HEAP16[$34>>1]|0;
 $36 = $35&65535;
 $37 = $36 & 65280;
 $38 = $37 | 48;
 $39 = (($Element) + 4|0);
 $40 = HEAP16[$39>>1]|0;
 $41 = $40&65535;
 $42 = $41 >> 8;
 $43 = $38 | $42;
 $44 = $43&255;
 $45 = (__Z23EnterExpressionOperatorh($44)|0);
 $Result = $45;
 $46 = ($45|0)!=(0);
 if ($46) {
  $47 = $Result;
  $0 = $47;
  $82 = $0;
  STACKTOP = sp;return ($82|0);
 }
 $48 = (($Element) + 4|0);
 $49 = HEAP16[$48>>1]|0;
 $50 = $49&65535;
 $51 = $50 & 1023;
 $52 = $51&65535;
 $53 = (($Element) + 4|0);
 HEAP16[$53>>1] = $52;
 $54 = (($Element) + 4|0);
 $55 = HEAP16[$54>>1]|0;
 $56 = $55&65535;
 $57 = $56 & 3840;
 $58 = ($57|0)==(0);
 if ($58) {
  $59 = (($Element) + 4|0);
  $60 = HEAP16[$59>>1]|0;
  $61 = $60&65535;
  $62 = $61 & 255;
  $63 = $62 | 3840;
  $64 = $63&65535;
  $65 = (($Element) + 4|0);
  HEAP16[$65>>1] = $64;
 }
 $66 = (($Element) + 4|0);
 $67 = HEAP16[$66>>1]|0;
 $68 = $67&65535;
 $69 = $68 ^ 1792;
 $70 = $69&65535;
 $71 = (($Element) + 4|0);
 HEAP16[$71>>1] = $70;
 $72 = (($Element) + 4|0);
 $73 = HEAP16[$72>>1]|0;
 $74 = $73&65535;
 $75 = $74 >> 8;
 $76 = $75&255;
 $77 = (($Element) + 4|0);
 $78 = HEAP16[$77>>1]|0;
 $79 = (__Z19EnterExpressionBitsht($76,$78)|0);
 $Result = $79;
 $80 = ($79|0)!=(0);
 if ($80) {
  $81 = $Result;
  $0 = $81;
  $82 = $0;
  STACKTOP = sp;return ($82|0);
 } else {
  $0 = 0;
  $82 = $0;
  STACKTOP = sp;return ($82|0);
 }
 return (0)|0;
}
function __Z19GetValueConditionalhhi($Conditional,$PinIsConstant,$SplitExpression) {
 $Conditional = $Conditional|0;
 $PinIsConstant = $PinIsConstant|0;
 $SplitExpression = $SplitExpression|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Conditional;
 $2 = $PinIsConstant;
 $3 = $SplitExpression;
 HEAP8[238440>>0] = 0;
 HEAP8[238448>>0] = 0;
 HEAP16[238456>>1] = 0;
 $4 = $1;
 $5 = $2;
 $6 = $3;
 $7 = (__Z13GetExpressionhhih($4,$5,$6,0)|0);
 $Result = $7;
 $8 = ($7|0)!=(0);
 if ($8) {
  $9 = $Result;
  $0 = $9;
  $10 = $0;
  STACKTOP = sp;return ($10|0);
 } else {
  $0 = 0;
  $10 = $0;
  STACKTOP = sp;return ($10|0);
 }
 return (0)|0;
}
function __Z13GetExpressionhhih($Conditional,$PinIsConstant,$SplitExpression,$CCDirective) {
 $Conditional = $Conditional|0;
 $PinIsConstant = $PinIsConstant|0;
 $SplitExpression = $SplitExpression|0;
 $CCDirective = $CCDirective|0;
 var $$byval_copy = 0, $$byval_copy1 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0;
 var $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0;
 var $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0;
 var $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0;
 var $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0;
 var $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0;
 var $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0;
 var $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0;
 var $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0;
 var $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0;
 var $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0;
 var $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0;
 var $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $Element = 0, $OldExpStackBottom = 0, $OldExpStackTop = 0, $OldParenCount = 0, $Result = 0, $State = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 96|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy1 = sp + 48|0;
 $$byval_copy = sp + 24|0;
 $Element = sp + 4|0;
 $5 = sp + 60|0;
 $6 = sp + 36|0;
 $1 = $Conditional;
 $2 = $PinIsConstant;
 $3 = $SplitExpression;
 $4 = $CCDirective;
 $7 = HEAP8[238712>>0]|0;
 $OldParenCount = $7;
 $8 = HEAP8[238440>>0]|0;
 $OldExpStackTop = $8;
 $9 = HEAP8[238448>>0]|0;
 $OldExpStackBottom = $9;
 HEAP8[238712>>0] = 0;
 $10 = HEAP8[238440>>0]|0;
 HEAP8[238448>>0] = $10;
 $11 = $1;
 $12 = ($11<<24>>24)!=(0);
 if ($12) {
  $State = 3;
 } else {
  $State = 0;
 }
 L5: while(1) {
  $13 = $State;
  $14 = ($13|0)!=(8);
  if (!($14)) {
   label = 143;
   break;
  }
  $15 = $State;
  switch ($15|0) {
  case 2:  {
   $48 = (($Element) + 4|0);
   $49 = HEAP16[$48>>1]|0;
   $50 = $49&255;
   $51 = (__Z4Pushh($50)|0);
   $Result = $51;
   $52 = ($51|0)!=(0);
   if ($52) {
    label = 24;
    break L5;
   }
   $State = 0;
   break;
  }
  case 0:  {
   (__Z10GetElementP12TElementList($Element)|0);
   $54 = HEAP32[$Element>>2]|0;
   switch ($54|0) {
   case 46:  {
    $55 = $4;
    $56 = ($55<<24>>24)!=(0);
    if (!($56)) {
     label = 28;
     break L5;
    }
    $58 = HEAP32[((238728 + 44|0))>>2]|0;
    $59 = ($58|0)==(1);
    if ($59) {
     label = 30;
     break L5;
    }
    HEAP32[$Element>>2] = 12;
    $61 = (($Element) + 4|0);
    HEAP16[$61>>1] = 0;
    $State = 4;
    break;
   }
   case 42: case 5: case 12:  {
    $State = 4;
    break;
   }
   case 44:  {
    $62 = $4;
    $63 = ($62<<24>>24)!=(0);
    if (!($63)) {
     label = 34;
     break L5;
    }
    $State = 4;
    break;
   }
   case 1: case 0:  {
    $65 = $4;
    $66 = ($65<<24>>24)!=(0);
    if (!($66)) {
     label = 39;
     break L5;
    }
    $State = 4;
    break;
   }
   case 11:  {
    $68 = $4;
    $69 = ($68<<24>>24)!=(0);
    if ($69) {
     label = 43;
     break L5;
    }
    $State = 2;
    break;
   }
   case 10:  {
    $71 = (($Element) + 4|0);
    $72 = HEAP16[$71>>1]|0;
    $73 = $72&65535;
    $74 = ($73|0)!=(16);
    if ($74) {
     label = 46;
     break L5;
    }
    $79 = (($Element) + 4|0);
    HEAP16[$79>>1] = 3;
    $State = 2;
    break;
   }
   case 18:  {
    $State = 1;
    break;
   }
   default: {
    label = 51;
    break L5;
   }
   }
   break;
  }
  case 1:  {
   $45 = (($Element) + 4|0);
   HEAP16[$45>>1] = 128;
   $46 = HEAP8[238712>>0]|0;
   $47 = (($46) + 1)<<24>>24;
   HEAP8[238712>>0] = $47;
   $State = 2;
   break;
  }
  case 3:  {
   $16 = (__Z8PushLeftv()|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    label = 8;
    break L5;
   }
   while(1) {
    $19 = (__Z8PushLeftv()|0);
    $Result = $19;
    $20 = ($19|0)!=(0);
    if ($20) {
     label = 11;
     break L5;
    }
    (__Z10GetElementP12TElementList($Element)|0);
    $22 = HEAP32[$Element>>2]|0;
    $23 = ($22|0)==(18);
    if (!($23)) {
     break;
    }
   }
   $24 = HEAP32[$Element>>2]|0;
   $25 = ($24|0)==(39);
   if ($25) {
    $26 = $3;
    $27 = ($26|0)!=(0);
    if ($27) {
     label = 16;
     break L5;
    }
    $29 = HEAP8[238440>>0]|0;
    $30 = $29&255;
    $31 = (($30) - 2)|0;
    $32 = $31&255;
    HEAP8[238440>>0] = $32;
    $33 = HEAP8[238712>>0]|0;
    $34 = $33&255;
    $35 = (($34) - 2)|0;
    $36 = $35&255;
    HEAP8[238712>>0] = $36;
    $37 = (($Element) + 4|0);
    $38 = HEAP16[$37>>1]|0;
    $39 = $38&255;
    $40 = (__Z4Pushh($39)|0);
    $Result = $40;
    $41 = ($40|0)!=(0);
    if ($41) {
     label = 18;
     break L5;
    }
   } else {
    $43 = HEAP16[238720>>1]|0;
    $44 = (($43) + -1)<<16>>16;
    HEAP16[238720>>1] = $44;
    $State = 0;
   }
   break;
  }
  case 4:  {
   $84 = HEAP32[$Element>>2]|0;
   $85 = ($84|0)==(12);
   do {
    if ($85) {
     label = 63;
    } else {
     $86 = HEAP32[$Element>>2]|0;
     $87 = ($86|0)==(42);
     if ($87) {
      $88 = $2;
      $89 = ($88<<24>>24)!=(0);
      if ($89) {
       label = 63;
       break;
      }
     }
     $90 = HEAP32[$Element>>2]|0;
     $91 = ($90|0)==(0);
     if ($91) {
      label = 60;
     } else {
      $92 = HEAP32[$Element>>2]|0;
      $93 = ($92|0)==(1);
      if ($93) {
       label = 60;
      }
     }
     if ((label|0) == 60) {
      label = 0;
      $94 = $4;
      $95 = ($94<<24>>24)!=(0);
      if ($95) {
       label = 63;
       break;
      }
     }
     $96 = HEAP32[$Element>>2]|0;
     $97 = ($96|0)==(44);
     if ($97) {
      $98 = $4;
      $99 = ($98<<24>>24)!=(0);
      if ($99) {
       label = 63;
       break;
      }
     }
     ;HEAP32[$6+0>>2]=HEAP32[$Element+0>>2]|0;HEAP32[$6+4>>2]=HEAP32[$Element+4>>2]|0;HEAP32[$6+8>>2]=HEAP32[$Element+8>>2]|0;
     ;HEAP32[$$byval_copy1+0>>2]=HEAP32[$6+0>>2]|0;HEAP32[$$byval_copy1+4>>2]=HEAP32[$6+4>>2]|0;HEAP32[$$byval_copy1+8>>2]=HEAP32[$6+8>>2]|0;
     $103 = (__Z23EnterExpressionVariable12TElementListh($$byval_copy1,0)|0);
     $Result = $103;
     $104 = ($103|0)!=(0);
     if ($104) {
      label = 67;
      break L5;
     }
    }
   } while(0);
   if ((label|0) == 63) {
    label = 0;
    ;HEAP32[$5+0>>2]=HEAP32[$Element+0>>2]|0;HEAP32[$5+4>>2]=HEAP32[$Element+4>>2]|0;HEAP32[$5+8>>2]=HEAP32[$Element+8>>2]|0;
    ;HEAP32[$$byval_copy+0>>2]=HEAP32[$5+0>>2]|0;HEAP32[$$byval_copy+4>>2]=HEAP32[$5+4>>2]|0;HEAP32[$$byval_copy+8>>2]=HEAP32[$5+8>>2]|0;
    $100 = (__Z23EnterExpressionConstant12TElementList($$byval_copy)|0);
    $Result = $100;
    $101 = ($100|0)!=(0);
    if ($101) {
     label = 64;
     break L5;
    }
   }
   $State = 5;
   break;
  }
  case 5:  {
   $106 = (__Z12PopOperatorsP12TElementList($Element)|0);
   $Result = $106;
   $107 = ($106|0)!=(0);
   if ($107) {
    label = 71;
    break L5;
   }
   (__Z10GetElementP12TElementList($Element)|0);
   $109 = $3;
   $110 = ($109|0)>(0);
   if ($110) {
    $111 = HEAP16[238720>>1]|0;
    $112 = $111&65535;
    $113 = $3;
    $114 = (($113) + 1)|0;
    $115 = ($112|0)==($114|0);
    if ($115) {
     $116 = HEAP32[$Element>>2]|0;
     $117 = ($116|0)!=(9);
     if ($117) {
      $118 = HEAP16[238720>>1]|0;
      $119 = (($118) + -1)<<16>>16;
      HEAP16[238720>>1] = $119;
      HEAP32[$Element>>2] = 9;
      $120 = HEAP8[238776>>0]|0;
      $121 = $120&255;
      $122 = (($121) - 1)|0;
      $123 = (238784 + (($122*48)|0)|0);
      $124 = (($123) + 8|0);
      $125 = HEAP32[$124>>2]|0;
      $126 = $125&65535;
      $127 = (($Element) + 4|0);
      HEAP16[$127>>1] = $126;
     } else {
      $128 = HEAP8[238776>>0]|0;
      $129 = $128&255;
      $130 = (($129) - 1)|0;
      $131 = (238784 + (($130*48)|0)|0);
      $132 = (($131) + 8|0);
      $133 = HEAP32[$132>>2]|0;
      $134 = ($133|0)!=(28);
      if ($134) {
       label = 77;
       break L5;
      }
     }
     $3 = -1;
    }
   }
   $136 = HEAP32[$Element>>2]|0;
   switch ($136|0) {
   case 46:  {
    label = 81;
    break L5;
    break;
   }
   case 9:  {
    $138 = $1;
    $139 = ($138<<24>>24)!=(0);
    if (!($139)) {
     label = 83;
     break L5;
    }
    $141 = (__Z7PopLeftv()|0);
    $Result = $141;
    $142 = ($141|0)!=(0);
    if ($142) {
     label = 85;
     break L5;
    }
    $144 = (($Element) + 4|0);
    $145 = HEAP16[$144>>1]|0;
    $146 = $145&255;
    $147 = (__Z4Pushh($146)|0);
    $Result = $147;
    $148 = ($147|0)!=(0);
    if ($148) {
     label = 87;
     break L5;
    }
    $State = 1;
    break;
   }
   case 38:  {
    $150 = $1;
    $151 = ($150<<24>>24)!=(0);
    if (!($151)) {
     label = 91;
     break L5;
    }
    $152 = $3;
    $153 = ($152|0)!=(0);
    if ($153) {
     label = 91;
     break L5;
    }
    $155 = (__Z7PopLeftv()|0);
    $Result = $155;
    $156 = ($155|0)!=(0);
    if ($156) {
     label = 93;
     break L5;
    }
    $158 = (__Z7PopLeftv()|0);
    $Result = $158;
    $159 = ($158|0)!=(0);
    if ($159) {
     label = 95;
     break L5;
    }
    $161 = (($Element) + 4|0);
    $162 = HEAP16[$161>>1]|0;
    $163 = $162&255;
    $164 = (__Z4Pushh($163)|0);
    $Result = $164;
    $165 = ($164|0)!=(0);
    if ($165) {
     label = 97;
     break L5;
    }
    $State = 3;
    break;
   }
   case 10:  {
    $167 = $4;
    $168 = ($167<<24>>24)!=(0);
    if ($168) {
     $169 = (($Element) + 4|0);
     $170 = HEAP16[$169>>1]|0;
     $171 = $170&65535;
     $172 = ($171|0)==(8);
     if ($172) {
      label = 109;
      break L5;
     }
     $173 = (($Element) + 4|0);
     $174 = HEAP16[$173>>1]|0;
     $175 = $174&65535;
     $176 = ($175|0)==(9);
     if ($176) {
      label = 109;
      break L5;
     }
     $177 = (($Element) + 4|0);
     $178 = HEAP16[$177>>1]|0;
     $179 = $178&65535;
     $180 = ($179|0)==(13);
     if ($180) {
      label = 109;
      break L5;
     }
     $181 = (($Element) + 4|0);
     $182 = HEAP16[$181>>1]|0;
     $183 = $182&65535;
     $184 = ($183|0)==(14);
     if ($184) {
      label = 109;
      break L5;
     }
     $185 = (($Element) + 4|0);
     $186 = HEAP16[$185>>1]|0;
     $187 = $186&65535;
     $188 = ($187|0)==(17);
     if ($188) {
      label = 109;
      break L5;
     }
     $189 = (($Element) + 4|0);
     $190 = HEAP16[$189>>1]|0;
     $191 = $190&65535;
     $192 = ($191|0)==(19);
     if ($192) {
      label = 109;
      break L5;
     }
     $193 = (($Element) + 4|0);
     $194 = HEAP16[$193>>1]|0;
     $195 = $194&65535;
     $196 = ($195|0)==(20);
     if ($196) {
      label = 109;
      break L5;
     }
     $197 = (($Element) + 4|0);
     $198 = HEAP16[$197>>1]|0;
     $199 = $198&65535;
     $200 = ($199|0)==(22);
     if ($200) {
      label = 109;
      break L5;
     }
     $201 = (($Element) + 4|0);
     $202 = HEAP16[$201>>1]|0;
     $203 = $202&65535;
     $204 = ($203|0)==(25);
     if ($204) {
      label = 109;
      break L5;
     }
    }
    $State = 2;
    break;
   }
   case 40:  {
    $206 = $1;
    $207 = ($206<<24>>24)!=(0);
    if ($207) {
     $208 = HEAP8[238712>>0]|0;
     $209 = $208&255;
     $210 = ($209|0)==(2);
     if ($210) {
      $State = 6;
     }
    }
    $211 = $State;
    $212 = ($211|0)!=(6);
    if ($212) {
     $213 = HEAP8[238712>>0]|0;
     $214 = (($213) + -1)<<24>>24;
     HEAP8[238712>>0] = $214;
     $215 = (__Z12Pop1OperatorP12TElementList($Element)|0);
     $216 = ($215<<24>>24)!=(0);
     if ($216) {
      $State = 5;
     } else {
      $State = 8;
     }
    }
    break;
   }
   case 18: case 11: case 5: case 12:  {
    label = 120;
    break L5;
    break;
   }
   default: {
    $218 = $3;
    $219 = ($218|0)<(1);
    if ($219) {
     $220 = $1;
     $221 = ($220<<24>>24)!=(0);
     if ($221) {
      $State = 6;
     } else {
      $State = 7;
     }
    } else {
     $222 = $3;
     $223 = $222&65535;
     HEAP16[238720>>1] = $223;
    }
   }
   }
   break;
  }
  case 6:  {
   $224 = (__Z7PopLeftv()|0);
   $Result = $224;
   $225 = ($224|0)!=(0);
   if ($225) {
    label = 130;
    break L5;
   }
   $227 = (__Z7PopLeftv()|0);
   $Result = $227;
   $228 = ($227|0)!=(0);
   if ($228) {
    label = 132;
    break L5;
   }
   $230 = HEAP8[238440>>0]|0;
   $231 = $230&255;
   $232 = HEAP8[238448>>0]|0;
   $233 = $232&255;
   $234 = ($231|0)==($233|0);
   if (!($234)) {
    label = 135;
    break L5;
   }
   $State = 8;
   break;
  }
  case 7:  {
   $236 = HEAP8[238440>>0]|0;
   $237 = $236&255;
   $238 = HEAP8[238448>>0]|0;
   $239 = $238&255;
   $240 = ($237|0)==($239|0);
   if (!($240)) {
    label = 139;
    break L5;
   }
   $State = 8;
   break;
  }
  case 8:  {
   break;
  }
  default: {
  }
  }
 }
 switch (label|0) {
  case 8: {
   $18 = $Result;
   $0 = $18;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 11: {
   $21 = $Result;
   $0 = $21;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 16: {
   $28 = (__Z5Error10TErrorCode(43)|0);
   $0 = $28;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 18: {
   $42 = $Result;
   $0 = $42;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 24: {
   $53 = $Result;
   $0 = $53;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 28: {
   $57 = (__Z5Error10TErrorCode(10)|0);
   $0 = $57;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 30: {
   $60 = (__Z5Error10TErrorCode(99)|0);
   $0 = $60;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 34: {
   $64 = (__Z5Error10TErrorCode(43)|0);
   $0 = $64;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 39: {
   $67 = (__Z5Error10TErrorCode(43)|0);
   $0 = $67;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 43: {
   $70 = (__Z5Error10TErrorCode(93)|0);
   $0 = $70;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 46: {
   $75 = $4;
   $76 = ($75<<24>>24)!=(0);
   if ($76) {
    $78 = (__Z5Error10TErrorCode(92)|0);
    $0 = $78;
    $247 = $0;
    STACKTOP = sp;return ($247|0);
   } else {
    $77 = (__Z5Error10TErrorCode(43)|0);
    $0 = $77;
    $247 = $0;
    STACKTOP = sp;return ($247|0);
   }
   break;
  }
  case 51: {
   $80 = $4;
   $81 = ($80<<24>>24)!=(0);
   if ($81) {
    $83 = (__Z5Error10TErrorCode(92)|0);
    $0 = $83;
    $247 = $0;
    STACKTOP = sp;return ($247|0);
   } else {
    $82 = (__Z5Error10TErrorCode(43)|0);
    $0 = $82;
    $247 = $0;
    STACKTOP = sp;return ($247|0);
   }
   break;
  }
  case 64: {
   $102 = $Result;
   $0 = $102;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 67: {
   $105 = $Result;
   $0 = $105;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 71: {
   $108 = $Result;
   $0 = $108;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 77: {
   $135 = (__Z5Error10TErrorCode(43)|0);
   $0 = $135;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 81: {
   $137 = (__Z5Error10TErrorCode(10)|0);
   $0 = $137;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 83: {
   $140 = (__Z5Error10TErrorCode(44)|0);
   $0 = $140;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 85: {
   $143 = $Result;
   $0 = $143;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 87: {
   $149 = $Result;
   $0 = $149;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 91: {
   $154 = (__Z5Error10TErrorCode(44)|0);
   $0 = $154;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 93: {
   $157 = $Result;
   $0 = $157;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 95: {
   $160 = $Result;
   $0 = $160;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 97: {
   $166 = $Result;
   $0 = $166;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 109: {
   $205 = (__Z5Error10TErrorCode(93)|0);
   $0 = $205;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 120: {
   $217 = (__Z5Error10TErrorCode(44)|0);
   $0 = $217;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 130: {
   $226 = $Result;
   $0 = $226;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 132: {
   $229 = $Result;
   $0 = $229;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 135: {
   $235 = (__Z5Error10TErrorCode(44)|0);
   $0 = $235;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 139: {
   $241 = (__Z5Error10TErrorCode(44)|0);
   $0 = $241;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
  case 143: {
   $242 = HEAP16[238720>>1]|0;
   $243 = (($242) + -1)<<16>>16;
   HEAP16[238720>>1] = $243;
   $244 = $OldParenCount;
   HEAP8[238712>>0] = $244;
   $245 = $OldExpStackTop;
   HEAP8[238440>>0] = $245;
   $246 = $OldExpStackBottom;
   HEAP8[238448>>0] = $246;
   $0 = 0;
   $247 = $0;
   STACKTOP = sp;return ($247|0);
   break;
  }
 }
 return (0)|0;
}
function __Z8PushLeftv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = HEAP8[238712>>0]|0;
 $2 = (($1) + 1)<<24>>24;
 HEAP8[238712>>0] = $2;
 $3 = (__Z4Pushh(-128)|0);
 $Result = $3;
 $4 = ($3|0)!=(0);
 if ($4) {
  $5 = $Result;
  $0 = $5;
  $6 = $0;
  STACKTOP = sp;return ($6|0);
 } else {
  $0 = 0;
  $6 = $0;
  STACKTOP = sp;return ($6|0);
 }
 return (0)|0;
}
function __Z4Pushh($Data) {
 $Data = $Data|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Data;
 $2 = HEAP8[238440>>0]|0;
 $3 = $2&255;
 $4 = ($3|0)==(255);
 if ($4) {
  $5 = (__Z5Error10TErrorCode(46)|0);
  $0 = $5;
  $13 = $0;
  STACKTOP = sp;return ($13|0);
 } else {
  $6 = HEAP8[238440>>0]|0;
  $7 = (($6) + 1)<<24>>24;
  HEAP8[238440>>0] = $7;
  $8 = $1;
  $9 = HEAP8[238440>>0]|0;
  $10 = $9&255;
  $11 = (($10) - 1)|0;
  $12 = (241864 + ($11)|0);
  HEAP8[$12>>0] = $8;
  $0 = 0;
  $13 = $0;
  STACKTOP = sp;return ($13|0);
 }
 return (0)|0;
}
function __Z23EnterExpressionConstant12TElementList($Element) {
 $Element = $Element|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Bit = 0, $BitCount = 0, $Result = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $BitCount = 15;
 $Bit = -32768;
 while(1) {
  $1 = $Bit;
  $2 = $1&65535;
  $3 = ($2|0)>(1);
  if ($3) {
   $4 = (($Element) + 4|0);
   $5 = HEAP16[$4>>1]|0;
   $6 = $5&65535;
   $7 = $Bit;
   $8 = $7&65535;
   $9 = $6 & $8;
   $10 = ($9|0)==(0);
   $55 = $10;
  } else {
   $55 = 0;
  }
  if (!($55)) {
   break;
  }
  $11 = $BitCount;
  $12 = (($11) + -1)<<24>>24;
  $BitCount = $12;
  $13 = $Bit;
  $14 = $13&65535;
  $15 = (($14|0) / 2)&-1;
  $16 = $15&65535;
  $Bit = $16;
 }
 $17 = $BitCount;
 $18 = $17&255;
 $19 = 32 | $18;
 $20 = $19&255;
 $21 = (__Z23EnterExpressionOperatorh($20)|0);
 $Result = $21;
 $22 = ($21|0)!=(0);
 if ($22) {
  $23 = $Result;
  $0 = $23;
  $54 = $0;
  STACKTOP = sp;return ($54|0);
 }
 $24 = (($Element) + 4|0);
 $25 = HEAP16[$24>>1]|0;
 $26 = $25&65535;
 $27 = ($26|0)==(0);
 if ($27) {
  label = 10;
 } else {
  $28 = (($Element) + 4|0);
  $29 = HEAP16[$28>>1]|0;
  $30 = $29&65535;
  $31 = (($Element) + 4|0);
  $32 = HEAP16[$31>>1]|0;
  $33 = $32&65535;
  $34 = $Bit;
  $35 = $34&65535;
  $36 = $33 & $35;
  $37 = ($30|0)==($36|0);
  if ($37) {
   label = 10;
  }
 }
 if ((label|0) == 10) {
  $38 = (($Element) + 4|0);
  $39 = HEAP16[$38>>1]|0;
  $40 = $39&65535;
  $41 = ($40|0)==(0);
  $42 = $41 ? 1 : 0;
  $43 = $42&65535;
  $44 = (($Element) + 4|0);
  HEAP16[$44>>1] = $43;
  $BitCount = 0;
 }
 $45 = $BitCount;
 $46 = $45&255;
 $47 = (($46) + 1)|0;
 $48 = $47&255;
 $49 = (($Element) + 4|0);
 $50 = HEAP16[$49>>1]|0;
 $51 = (__Z19EnterExpressionBitsht($48,$50)|0);
 $Result = $51;
 $52 = ($51|0)!=(0);
 if ($52) {
  $53 = $Result;
  $0 = $53;
  $54 = $0;
  STACKTOP = sp;return ($54|0);
 } else {
  $0 = 0;
  $54 = $0;
  STACKTOP = sp;return ($54|0);
 }
 return (0)|0;
}
function __Z12PopOperatorsP12TElementList($Element) {
 $Element = $Element|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $PopResult = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Element;
 $2 = $1;
 $3 = (__Z12Pop1OperatorP12TElementList($2)|0);
 $PopResult = $3;
 while(1) {
  $4 = $PopResult;
  $5 = ($4<<24>>24)!=(0);
  if ($5) {
   $6 = $1;
   $7 = (($6) + 4|0);
   $8 = HEAP16[$7>>1]|0;
   $9 = $8&65535;
   $10 = ($9|0)!=(128);
   $34 = $10;
  } else {
   $34 = 0;
  }
  if (!($34)) {
   break;
  }
  $11 = $1;
  $12 = (($11) + 4|0);
  $13 = HEAP16[$12>>1]|0;
  $14 = $13&255;
  $15 = (__Z23EnterExpressionOperatorh($14)|0);
  $Result = $15;
  $16 = ($15|0)!=(0);
  if ($16) {
   label = 6;
   break;
  }
  $18 = $1;
  $19 = (__Z12Pop1OperatorP12TElementList($18)|0);
  $PopResult = $19;
 }
 if ((label|0) == 6) {
  $17 = $Result;
  $0 = $17;
  $33 = $0;
  STACKTOP = sp;return ($33|0);
 }
 $20 = $PopResult;
 $21 = ($20<<24>>24)!=(0);
 if ($21) {
  $22 = $1;
  $23 = (($22) + 4|0);
  $24 = HEAP16[$23>>1]|0;
  $25 = $24&65535;
  $26 = ($25|0)==(128);
  $28 = $26;
 } else {
  $28 = 0;
 }
 $27 = $28 ? 1 : 0;
 $29 = HEAP8[238440>>0]|0;
 $30 = $29&255;
 $31 = (($30) + ($27))|0;
 $32 = $31&255;
 HEAP8[238440>>0] = $32;
 $0 = 0;
 $33 = $0;
 STACKTOP = sp;return ($33|0);
}
function __Z7PopLeftv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $Element = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 $1 = HEAP8[238440>>0]|0;
 $2 = (($1) + -1)<<24>>24;
 HEAP8[238440>>0] = $2;
 $3 = HEAP8[238712>>0]|0;
 $4 = (($3) + -1)<<24>>24;
 HEAP8[238712>>0] = $4;
 $5 = (__Z12PopOperatorsP12TElementList($Element)|0);
 $Result = $5;
 $6 = ($5|0)!=(0);
 if ($6) {
  $7 = $Result;
  $0 = $7;
  $8 = $0;
  STACKTOP = sp;return ($8|0);
 } else {
  $0 = 0;
  $8 = $0;
  STACKTOP = sp;return ($8|0);
 }
 return (0)|0;
}
function __Z12Pop1OperatorP12TElementList($Element) {
 $Element = $Element|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $Element;
 $Result = 0;
 $1 = HEAP8[238440>>0]|0;
 $2 = $1&255;
 $3 = HEAP8[238448>>0]|0;
 $4 = $3&255;
 $5 = ($2|0)>($4|0);
 if (!($5)) {
  $15 = $Result;
  STACKTOP = sp;return ($15|0);
 }
 $6 = HEAP8[238440>>0]|0;
 $7 = (($6) + -1)<<24>>24;
 HEAP8[238440>>0] = $7;
 $8 = HEAP8[238440>>0]|0;
 $9 = $8&255;
 $10 = (241864 + ($9)|0);
 $11 = HEAP8[$10>>0]|0;
 $12 = $11&255;
 $13 = $0;
 $14 = (($13) + 4|0);
 HEAP16[$14>>1] = $12;
 $Result = 1;
 $15 = $Result;
 STACKTOP = sp;return ($15|0);
}
function __Z23EnterExpressionOperatorh($Data) {
 $Data = $Data|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Data;
 $2 = $1;
 $3 = $2&255;
 $4 = ($3|0)==(0);
 if ($4) {
  label = 3;
 } else {
  $5 = $1;
  $6 = $5&255;
  $7 = ($6|0)==(9);
  if ($7) {
   label = 3;
  }
 }
 do {
  if ((label|0) == 3) {
   $8 = HEAP8[241856>>0]|0;
   $9 = $8&255;
   $10 = ($9|0)==(8);
   if (!($10)) {
    break;
   }
   $11 = (__Z5Error10TErrorCode(46)|0);
   $0 = $11;
   $47 = $0;
   STACKTOP = sp;return ($47|0);
  }
 } while(0);
 $12 = $1;
 $13 = $12&255;
 $14 = ($13|0)>(7);
 if ($14) {
  $15 = $1;
  $16 = $15&255;
  $17 = ($16|0)>(31);
  if ($17) {
   $18 = $1;
   $19 = $18&255;
   $20 = ($19|0)<=(51);
   do {
    if ($20) {
     $21 = HEAP8[241856>>0]|0;
     $22 = $21&255;
     $23 = ($22|0)==(8);
     if ($23) {
      $24 = (__Z5Error10TErrorCode(46)|0);
      $0 = $24;
      $47 = $0;
      STACKTOP = sp;return ($47|0);
     } else {
      $25 = HEAP8[241856>>0]|0;
      $26 = (($25) + 1)<<24>>24;
      HEAP8[241856>>0] = $26;
      break;
     }
    }
   } while(0);
   $27 = $1;
   $28 = $27&255;
   $29 = ($28|0)>(59);
   if ($29) {
    $30 = HEAP8[241856>>0]|0;
    $31 = (($30) + -1)<<24>>24;
    HEAP8[241856>>0] = $31;
   }
  } else {
   $32 = HEAP8[241856>>0]|0;
   $33 = (($32) + -1)<<24>>24;
   HEAP8[241856>>0] = $33;
  }
 }
 $34 = HEAP16[238456>>1]|0;
 $35 = $34&65535;
 $36 = ($35|0)==(0);
 $37 = $36 ? 1 : 0;
 $38 = (7 - ($37))|0;
 $39 = $38&255;
 $40 = $1;
 $41 = $40&255;
 $42 = $41 | 64;
 $43 = $42&65535;
 $44 = (__Z19EnterExpressionBitsht($39,$43)|0);
 $Result = $44;
 $45 = ($44|0)!=(0);
 if ($45) {
  $46 = $Result;
  $0 = $46;
  $47 = $0;
  STACKTOP = sp;return ($47|0);
 } else {
  $0 = 0;
  $47 = $0;
  STACKTOP = sp;return ($47|0);
 }
 return (0)|0;
}
function __Z19EnterExpressionBitsht($Bits,$Data) {
 $Bits = $Bits|0;
 $Data = $Data|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $9 = 0, $ShiftFactor = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Bits;
 $2 = $Data;
 $3 = $2;
 $4 = $3&65535;
 $5 = $1;
 $6 = $5&255;
 $7 = (16 - ($6))|0;
 $8 = $4 << $7;
 $9 = $8&65535;
 $2 = $9;
 while(1) {
  $10 = $1;
  $11 = $10&255;
  $12 = ($11|0)>(0);
  if (!($12)) {
   label = 8;
   break;
  }
  $13 = HEAP16[238456>>1]|0;
  $14 = $13&65535;
  $15 = $14 & 15;
  $16 = $15&255;
  $ShiftFactor = $16;
  $17 = $ShiftFactor;
  $18 = $17&255;
  $19 = ($18|0)==(0);
  if ($19) {
   $20 = HEAP16[238456>>1]|0;
   $21 = $20&65535;
   $22 = (($21|0) / 16)&-1;
   $23 = (($22) + 1)|0;
   $24 = (238456 + ($23<<1)|0);
   HEAP16[$24>>1] = 0;
  }
  $25 = HEAP16[238456>>1]|0;
  $26 = $25&65535;
  $27 = (($26|0) / 16)&-1;
  $28 = (($27) + 1)|0;
  $29 = (238456 + ($28<<1)|0);
  $30 = HEAP16[$29>>1]|0;
  $31 = $30&65535;
  $32 = $ShiftFactor;
  $33 = $32&255;
  $34 = (16 - ($33))|0;
  $35 = $1;
  $36 = $35&255;
  $37 = (__Z6Lowestii($34,$36)|0);
  $38 = $31 << $37;
  $39 = $2;
  $40 = $39&65535;
  $41 = $ShiftFactor;
  $42 = $41&255;
  $43 = (16 - ($42))|0;
  $44 = $1;
  $45 = $44&255;
  $46 = (__Z6Lowestii($43,$45)|0);
  $47 = (16 - ($46))|0;
  $48 = $40 >> $47;
  $49 = $38 | $48;
  $50 = $49&65535;
  $51 = HEAP16[238456>>1]|0;
  $52 = $51&65535;
  $53 = (($52|0) / 16)&-1;
  $54 = (($53) + 1)|0;
  $55 = (238456 + ($54<<1)|0);
  HEAP16[$55>>1] = $50;
  $56 = $2;
  $57 = $56&65535;
  $58 = $ShiftFactor;
  $59 = $58&255;
  $60 = (16 - ($59))|0;
  $61 = $57 << $60;
  $62 = $61&65535;
  $2 = $62;
  $63 = $1;
  $64 = $63&255;
  $65 = $ShiftFactor;
  $66 = $65&255;
  $67 = (16 - ($66))|0;
  $68 = (__Z6Lowestii($64,$67)|0);
  $69 = HEAP16[238456>>1]|0;
  $70 = $69&65535;
  $71 = (($70) + ($68))|0;
  $72 = $71&65535;
  HEAP16[238456>>1] = $72;
  $73 = HEAP16[238456>>1]|0;
  $74 = $73&65535;
  $75 = ($74|0)==(496);
  if ($75) {
   label = 6;
   break;
  }
  $77 = $ShiftFactor;
  $78 = $77&255;
  $79 = (16 - ($78))|0;
  $80 = $1;
  $81 = $80&255;
  $82 = (__Z6Lowestii($79,$81)|0);
  $83 = $1;
  $84 = $83&255;
  $85 = (($84) - ($82))|0;
  $86 = $85&255;
  $1 = $86;
 }
 if ((label|0) == 6) {
  $76 = (__Z5Error10TErrorCode(46)|0);
  $0 = $76;
  $87 = $0;
  STACKTOP = sp;return ($87|0);
 }
 else if ((label|0) == 8) {
  $0 = 0;
  $87 = $0;
  STACKTOP = sp;return ($87|0);
 }
 return (0)|0;
}
function __Z12GetModifiersP12TElementList($Element) {
 $Element = $Element|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0;
 var $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0;
 var $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0;
 var $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0;
 var $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $Code = 0, $Preview = 0, $SavedElement = 0, $Size = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $SavedElement = sp + 12|0;
 $Preview = sp;
 $1 = $Element;
 $2 = $1;
 ;HEAP32[$SavedElement+0>>2]=HEAP32[$2+0>>2]|0;HEAP32[$SavedElement+4>>2]=HEAP32[$2+4>>2]|0;HEAP32[$SavedElement+8>>2]=HEAP32[$2+8>>2]|0;
 while(1) {
  $3 = (__Z14PreviewElementP12TElementList($Preview)|0);
  $4 = ($3<<24>>24)!=(0);
  if ($4) {
   $5 = HEAP32[$Preview>>2]|0;
   $6 = ($5|0)==(13);
   $124 = $6;
  } else {
   $124 = 0;
  }
  if (!($124)) {
   label = 16;
   break;
  }
  $7 = $1;
  $8 = (($7) + 4|0);
  $9 = HEAP16[$8>>1]|0;
  $10 = $9&65535;
  $11 = $10 >> 8;
  $12 = $11&255;
  $Size = $12;
  $13 = $1;
  $14 = (($13) + 4|0);
  $15 = HEAP16[$14>>1]|0;
  $16 = $15&65535;
  $17 = $16 & 255;
  $18 = $17&255;
  $Code = $18;
  $19 = HEAP16[238720>>1]|0;
  $20 = (($19) + 1)<<16>>16;
  HEAP16[238720>>1] = $20;
  $21 = $Size;
  $22 = $21&255;
  $23 = ($22|0)==(0);
  if ($23) {
   label = 6;
   break;
  }
  $25 = $1;
  (__Z10GetElementP12TElementList($25)|0);
  $26 = $1;
  $27 = HEAP32[$26>>2]|0;
  $28 = ($27|0)!=(7);
  if ($28) {
   label = 8;
   break;
  }
  $30 = $Size;
  $31 = $30&255;
  $32 = $1;
  $33 = (($32) + 4|0);
  $34 = HEAP16[$33>>1]|0;
  $35 = $34&65535;
  $36 = $35 >> 8;
  $37 = ($31|0)<=($36|0);
  if ($37) {
   label = 10;
   break;
  }
  $39 = $Size;
  $40 = $39&255;
  $41 = $1;
  $42 = (($41) + 4|0);
  $43 = HEAP16[$42>>1]|0;
  $44 = $43&65535;
  $45 = $44 >> 8;
  $46 = (($40) - ($45))|0;
  $47 = $1;
  $48 = (($47) + 4|0);
  $49 = HEAP16[$48>>1]|0;
  $50 = $49&65535;
  $51 = $50 >> 8;
  $52 = ($51|0)==(0);
  $53 = $52 ? 1 : 0;
  $54 = (($46) + ($53))|0;
  $55 = $54&255;
  $Size = $55;
  $56 = $Code;
  $57 = $56&255;
  $58 = $57 << 8;
  $59 = (($58) + 1)|0;
  $60 = $Size;
  $61 = $60&255;
  $62 = $59 << $61;
  $63 = $62&65535;
  $64 = (($SavedElement) + 4|0);
  HEAP16[$64>>1] = $63;
  $65 = (($SavedElement) + 4|0);
  $66 = HEAP16[$65>>1]|0;
  $67 = (($66) + -1)<<16>>16;
  HEAP16[$65>>1] = $67;
  $68 = $1;
  $69 = (($68) + 4|0);
  $70 = HEAP16[$69>>1]|0;
  $71 = $70&65535;
  $72 = $71 & 128;
  $73 = ($72|0)==(128);
  if ($73) {
   $74 = $1;
   $75 = (($74) + 4|0);
   $76 = HEAP16[$75>>1]|0;
   $77 = $76&65535;
   $78 = $77 & 65280;
   $79 = (($SavedElement) + 4|0);
   $80 = HEAP16[$79>>1]|0;
   $81 = $80&65535;
   $82 = $81 & 255;
   $83 = (($78) + ($82))|0;
   $84 = $83&65535;
   $85 = $1;
   $86 = (($85) + 4|0);
   HEAP16[$86>>1] = $84;
  }
  $87 = $1;
  $88 = (($87) + 4|0);
  $89 = HEAP16[$88>>1]|0;
  $90 = $89&65535;
  $91 = $90 & 255;
  $92 = (($SavedElement) + 4|0);
  $93 = HEAP16[$92>>1]|0;
  $94 = $93&65535;
  $95 = $94 & 255;
  $96 = ($91|0)>($95|0);
  if ($96) {
   label = 14;
   break;
  }
  $98 = $1;
  $99 = (($98) + 4|0);
  $100 = HEAP16[$99>>1]|0;
  $101 = $100&65535;
  $102 = $101 & 65280;
  $103 = $1;
  $104 = (($103) + 4|0);
  $105 = HEAP16[$104>>1]|0;
  $106 = $105&65535;
  $107 = $106 & 255;
  $108 = (($SavedElement) + 4|0);
  $109 = HEAP16[$108>>1]|0;
  $110 = $109&65535;
  $111 = $110 >> 8;
  $112 = (($107) + ($111))|0;
  $113 = (($102) + ($112))|0;
  $114 = $113&65535;
  $115 = $1;
  $116 = (($115) + 4|0);
  HEAP16[$116>>1] = $114;
 }
 if ((label|0) == 6) {
  $24 = (__Z5Error10TErrorCode(40)|0);
  $0 = $24;
  $123 = $0;
  STACKTOP = sp;return ($123|0);
 }
 else if ((label|0) == 8) {
  $29 = (__Z5Error10TErrorCode(39)|0);
  $0 = $29;
  $123 = $0;
  STACKTOP = sp;return ($123|0);
 }
 else if ((label|0) == 10) {
  $38 = (__Z5Error10TErrorCode(41)|0);
  $0 = $38;
  $123 = $0;
  STACKTOP = sp;return ($123|0);
 }
 else if ((label|0) == 14) {
  $97 = (__Z5Error10TErrorCode(42)|0);
  $0 = $97;
  $123 = $0;
  STACKTOP = sp;return ($123|0);
 }
 else if ((label|0) == 16) {
  $117 = HEAP32[$SavedElement>>2]|0;
  HEAP32[((250448 + 36|0))>>2] = $117;
  $118 = HEAP32[$SavedElement>>2]|0;
  $119 = $1;
  HEAP32[$119>>2] = $118;
  $120 = $1;
  $121 = (($120) + 4|0);
  $122 = HEAP16[$121>>1]|0;
  HEAP16[((250448 + 40|0))>>1] = $122;
  $0 = 0;
  $123 = $0;
  STACKTOP = sp;return ($123|0);
 }
 return (0)|0;
}
function __Z14PreviewElementP12TElementList($Preview) {
 $Preview = $Preview|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $CurrentLength = 0, $CurrentStart = 0;
 var $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $Preview;
 $1 = HEAP32[8>>2]|0;
 $2 = (($1) + 92|0);
 $3 = HEAP32[$2>>2]|0;
 $CurrentStart = $3;
 $4 = HEAP32[8>>2]|0;
 $5 = (($4) + 96|0);
 $6 = HEAP32[$5>>2]|0;
 $CurrentLength = $6;
 $7 = $0;
 $8 = (__Z10GetElementP12TElementList($7)|0);
 $Result = $8;
 $9 = HEAP16[238720>>1]|0;
 $10 = (($9) + -1)<<16>>16;
 HEAP16[238720>>1] = $10;
 $11 = $CurrentStart;
 $12 = HEAP32[8>>2]|0;
 $13 = (($12) + 92|0);
 HEAP32[$13>>2] = $11;
 $14 = $CurrentLength;
 $15 = HEAP32[8>>2]|0;
 $16 = (($15) + 96|0);
 HEAP32[$16>>2] = $14;
 $17 = $Result;
 STACKTOP = sp;return ($17|0);
}
function __Z8GetRightv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $Element = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 (__Z10GetElementP12TElementList($Element)|0);
 $1 = HEAP32[$Element>>2]|0;
 $2 = ($1|0)!=(40);
 if ($2) {
  $3 = (__Z5Error10TErrorCode(20)|0);
  $0 = $3;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 } else {
  $0 = 0;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 }
 return (0)|0;
}
function __Z6Lowestii($Value1,$Value2) {
 $Value1 = $Value1|0;
 $Value2 = $Value2|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Value1;
 $2 = $Value2;
 $3 = $1;
 $4 = $2;
 $5 = ($3|0)<($4|0);
 if ($5) {
  $6 = $1;
  $0 = $6;
 } else {
  $7 = $2;
  $0 = $7;
 }
 $8 = $0;
 STACKTOP = sp;return ($8|0);
}
function __Z14CopyExpressionhh($SourceNumber,$DestinationNumber) {
 $SourceNumber = $SourceNumber|0;
 $DestinationNumber = $DestinationNumber|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Idx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $SourceNumber;
 $1 = $DestinationNumber;
 $Idx = 0;
 while(1) {
  $2 = $Idx;
  $3 = ($2|0)<=(31);
  if (!($3)) {
   break;
  }
  $4 = $Idx;
  $5 = $0;
  $6 = $5&255;
  $7 = (238456 + ($6<<6)|0);
  $8 = (($7) + ($4<<1)|0);
  $9 = HEAP16[$8>>1]|0;
  $10 = $Idx;
  $11 = $1;
  $12 = $11&255;
  $13 = (238456 + ($12<<6)|0);
  $14 = (($13) + ($10<<1)|0);
  HEAP16[$14>>1] = $9;
  $15 = $Idx;
  $16 = (($15) + 1)|0;
  $Idx = $16;
 }
 STACKTOP = sp;return;
}
function __Z15EnterExpressionhh($ExpNumber,$Enter1Before) {
 $ExpNumber = $ExpNumber|0;
 $Enter1Before = $Enter1Before|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Idx = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $ExpNumber;
 $2 = $Enter1Before;
 $3 = $2;
 $4 = ($3<<24>>24)!=(0);
 do {
  if ($4) {
   $5 = (__Z11EnterEEPROMht(1,1)|0);
   $Result = $5;
   $6 = ($5|0)!=(0);
   if (!($6)) {
    break;
   }
   $7 = $Result;
   $0 = $7;
   $45 = $0;
   STACKTOP = sp;return ($45|0);
  }
 } while(0);
 $Idx = 0;
 while(1) {
  $8 = $Idx;
  $9 = $1;
  $10 = $9&255;
  $11 = (238456 + ($10<<6)|0);
  $12 = HEAP16[$11>>1]|0;
  $13 = $12&65535;
  $14 = ($8|0)<($13|0);
  if (!($14)) {
   label = 10;
   break;
  }
  $15 = $1;
  $16 = $15&255;
  $17 = (238456 + ($16<<6)|0);
  $18 = HEAP16[$17>>1]|0;
  $19 = $18&65535;
  $20 = $Idx;
  $21 = (($19) - ($20))|0;
  $22 = (__Z6Lowestii(16,$21)|0);
  $23 = $22&255;
  $24 = $Idx;
  $25 = (($24|0) / 16)&-1;
  $26 = (($25) + 1)|0;
  $27 = $1;
  $28 = $27&255;
  $29 = (238456 + ($28<<6)|0);
  $30 = (($29) + ($26<<1)|0);
  $31 = HEAP16[$30>>1]|0;
  $32 = (__Z11EnterEEPROMht($23,$31)|0);
  $Result = $32;
  $33 = ($32|0)!=(0);
  if ($33) {
   label = 8;
   break;
  }
  $35 = $1;
  $36 = $35&255;
  $37 = (238456 + ($36<<6)|0);
  $38 = HEAP16[$37>>1]|0;
  $39 = $38&65535;
  $40 = $Idx;
  $41 = (($39) - ($40))|0;
  $42 = (__Z6Lowestii(16,$41)|0);
  $43 = $Idx;
  $44 = (($43) + ($42))|0;
  $Idx = $44;
 }
 if ((label|0) == 8) {
  $34 = $Result;
  $0 = $34;
  $45 = $0;
  STACKTOP = sp;return ($45|0);
 }
 else if ((label|0) == 10) {
  $0 = 0;
  $45 = $0;
  STACKTOP = sp;return ($45|0);
 }
 return (0)|0;
}
function __Z11EnterEEPROMht($Bits,$Data) {
 $Bits = $Bits|0;
 $Data = $Data|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0;
 var $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0;
 var $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0;
 var $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0;
 var $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0;
 var $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $ShiftFactor = 0, $Temp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Bits;
 $2 = $Data;
 $3 = HEAP16[258728>>1]|0;
 $4 = $3&65535;
 $5 = $1;
 $6 = $5&255;
 $7 = (($4) + ($6))|0;
 $8 = ($7|0)>(16384);
 if ($8) {
  $9 = (__Z5Error10TErrorCode(29)|0);
  $0 = $9;
  $125 = $0;
  STACKTOP = sp;return ($125|0);
 }
 $10 = $2;
 $11 = $10&65535;
 $12 = $1;
 $13 = $12&255;
 $14 = (16 - ($13))|0;
 $15 = $11 << $14;
 $16 = $15&65535;
 $2 = $16;
 while(1) {
  $17 = $1;
  $18 = $17&255;
  $19 = ($18|0)>(0);
  if (!($19)) {
   label = 9;
   break;
  }
  $20 = HEAP16[258728>>1]|0;
  $21 = $20&65535;
  $22 = $21 & 7;
  $23 = $22&255;
  $ShiftFactor = $23;
  $24 = HEAP16[258728>>1]|0;
  $25 = $24&65535;
  $26 = (($25|0) / 8)&-1;
  $27 = (2047 - ($26))|0;
  $28 = HEAP32[8>>2]|0;
  $29 = (($28) + 2148|0);
  $30 = (($29) + ($27)|0);
  $31 = HEAP8[$30>>0]|0;
  $32 = $31&255;
  $33 = $32 & 3;
  $Temp = $33;
  $34 = $Temp;
  $35 = ($34|0)==(1);
  if ($35) {
   label = 7;
   break;
  }
  $36 = $Temp;
  $37 = ($36|0)==(2);
  if ($37) {
   label = 7;
   break;
  }
  $56 = HEAP16[258728>>1]|0;
  $57 = $56&65535;
  $58 = (($57|0) / 8)&-1;
  $59 = (2047 - ($58))|0;
  $60 = HEAP32[8>>2]|0;
  $61 = (($60) + 100|0);
  $62 = (($61) + ($59)|0);
  $63 = HEAP8[$62>>0]|0;
  $64 = $63&255;
  $65 = $2;
  $66 = $65&65535;
  $67 = $ShiftFactor;
  $68 = $67&255;
  $69 = (8 + ($68))|0;
  $70 = $66 >> $69;
  $71 = $64 | $70;
  $72 = $71&255;
  $73 = HEAP16[258728>>1]|0;
  $74 = $73&65535;
  $75 = (($74|0) / 8)&-1;
  $76 = (2047 - ($75))|0;
  $77 = HEAP32[8>>2]|0;
  $78 = (($77) + 100|0);
  $79 = (($78) + ($76)|0);
  HEAP8[$79>>0] = $72;
  $80 = HEAP16[258728>>1]|0;
  $81 = $80&65535;
  $82 = (($81|0) / 8)&-1;
  $83 = (2047 - ($82))|0;
  $84 = HEAP32[8>>2]|0;
  $85 = (($84) + 2148|0);
  $86 = (($85) + ($83)|0);
  $87 = HEAP8[$86>>0]|0;
  $88 = $87&255;
  $89 = $88 | 3;
  $90 = $89&255;
  $91 = HEAP16[258728>>1]|0;
  $92 = $91&65535;
  $93 = (($92|0) / 8)&-1;
  $94 = (2047 - ($93))|0;
  $95 = HEAP32[8>>2]|0;
  $96 = (($95) + 2148|0);
  $97 = (($96) + ($94)|0);
  HEAP8[$97>>0] = $90;
  $98 = $2;
  $99 = $98&65535;
  $100 = $ShiftFactor;
  $101 = $100&255;
  $102 = (8 - ($101))|0;
  $103 = $99 << $102;
  $104 = $103&65535;
  $2 = $104;
  $105 = $1;
  $106 = $105&255;
  $107 = $ShiftFactor;
  $108 = $107&255;
  $109 = (8 - ($108))|0;
  $110 = (__Z6Lowestii($106,$109)|0);
  $111 = HEAP16[258728>>1]|0;
  $112 = $111&65535;
  $113 = (($112) + ($110))|0;
  $114 = $113&65535;
  HEAP16[258728>>1] = $114;
  $115 = $ShiftFactor;
  $116 = $115&255;
  $117 = (8 - ($116))|0;
  $118 = $1;
  $119 = $118&255;
  $120 = (__Z6Lowestii($117,$119)|0);
  $121 = $1;
  $122 = $121&255;
  $123 = (($122) - ($120))|0;
  $124 = $123&255;
  $1 = $124;
 }
 if ((label|0) == 7) {
  $38 = HEAP16[258728>>1]|0;
  $39 = $38&65535;
  $40 = $39<<2;
  $41 = (250496 + ($40<<1)|0);
  $42 = HEAP16[$41>>1]|0;
  $43 = $42&65535;
  $44 = HEAP32[8>>2]|0;
  $45 = (($44) + 92|0);
  HEAP32[$45>>2] = $43;
  $46 = HEAP16[258728>>1]|0;
  $47 = $46&65535;
  $48 = $47<<2;
  $49 = (($48) + 1)|0;
  $50 = (250496 + ($49<<1)|0);
  $51 = HEAP16[$50>>1]|0;
  $52 = $51&65535;
  $53 = HEAP32[8>>2]|0;
  $54 = (($53) + 96|0);
  HEAP32[$54>>2] = $52;
  $55 = (__Z5Error10TErrorCode(26)|0);
  $0 = $55;
  $125 = $0;
  STACKTOP = sp;return ($125|0);
 }
 else if ((label|0) == 9) {
  $0 = 0;
  $125 = $0;
  STACKTOP = sp;return ($125|0);
 }
 return (0)|0;
}
function __Z11EnterSymbol12TSymbolTable($Symbol) {
 $Symbol = $Symbol|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $Vector = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = HEAP32[25392>>2]|0;
 $2 = ($1|0)>=(1024);
 if ($2) {
  $3 = (__Z5Error10TErrorCode(30)|0);
  $0 = $3;
  $42 = $0;
  STACKTOP = sp;return ($42|0);
 }
 $4 = (__Z14CalcSymbolHashPKc($Symbol)|0);
 $Vector = $4;
 $5 = $Vector;
 $6 = (242120 + ($5<<2)|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = ($7|0)==(-1);
 if ($8) {
  $9 = HEAP32[25392>>2]|0;
  $10 = $Vector;
  $11 = (242120 + ($10<<2)|0);
  HEAP32[$11>>2] = $9;
 } else {
  $12 = $Vector;
  $13 = (242120 + ($12<<2)|0);
  $14 = HEAP32[$13>>2]|0;
  $Vector = $14;
  while(1) {
   $15 = $Vector;
   $16 = (25400 + (($15*48)|0)|0);
   $17 = (($16) + 44|0);
   $18 = HEAP32[$17>>2]|0;
   $19 = ($18|0)>(-1);
   if (!($19)) {
    break;
   }
   $20 = $Vector;
   $21 = (25400 + (($20*48)|0)|0);
   $22 = (($21) + 44|0);
   $23 = HEAP32[$22>>2]|0;
   $Vector = $23;
  }
  $24 = HEAP32[25392>>2]|0;
  $25 = $Vector;
  $26 = (25400 + (($25*48)|0)|0);
  $27 = (($26) + 44|0);
  HEAP32[$27>>2] = $24;
 }
 $28 = HEAP32[25392>>2]|0;
 $29 = (25400 + (($28*48)|0)|0);
 (_strcpy(($29|0),($Symbol|0))|0);
 $30 = (($Symbol) + 36|0);
 $31 = HEAP32[$30>>2]|0;
 $32 = HEAP32[25392>>2]|0;
 $33 = (25400 + (($32*48)|0)|0);
 $34 = (($33) + 36|0);
 HEAP32[$34>>2] = $31;
 $35 = (($Symbol) + 40|0);
 $36 = HEAP16[$35>>1]|0;
 $37 = HEAP32[25392>>2]|0;
 $38 = (25400 + (($37*48)|0)|0);
 $39 = (($38) + 40|0);
 HEAP16[$39>>1] = $36;
 $40 = HEAP32[25392>>2]|0;
 $41 = (($40) + 1)|0;
 HEAP32[25392>>2] = $41;
 $0 = 0;
 $42 = $0;
 STACKTOP = sp;return ($42|0);
}
function __Z14CalcSymbolHashPKc($SymbolName) {
 $SymbolName = $SymbolName|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Hash = 0, $Idx = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $SymbolName;
 $Hash = 0;
 $Idx = 0;
 while(1) {
  $1 = $0;
  $2 = $Idx;
  $3 = (($1) + ($2)|0);
  $4 = HEAP8[$3>>0]|0;
  $5 = $4 << 24 >> 24;
  $6 = ($5|0)!=(0);
  if (!($6)) {
   break;
  }
  $7 = $Hash;
  $8 = $0;
  $9 = $Idx;
  $10 = (($8) + ($9)|0);
  $11 = HEAP8[$10>>0]|0;
  $12 = $11 << 24 >> 24;
  $13 = (($7) + ($12))|0;
  $Hash = $13;
  $14 = $Idx;
  $15 = (($14) + 1)|0;
  $Idx = $15;
 }
 $16 = $Hash;
 $17 = $16 & 1023;
 STACKTOP = sp;return ($17|0);
}
function __Z16EnterUndefSymbolPc($Name) {
 $Name = $Name|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Vector = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Name;
 $2 = HEAP32[74552>>2]|0;
 $3 = ($2|0)>=(1024);
 if ($3) {
  $4 = (__Z5Error10TErrorCode(30)|0);
  $0 = $4;
  $35 = $0;
  STACKTOP = sp;return ($35|0);
 }
 $5 = $1;
 $6 = (__Z14CalcSymbolHashPKc($5)|0);
 $Vector = $6;
 $7 = $Vector;
 $8 = (246216 + ($7<<2)|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($9|0)==(-1);
 if ($10) {
  $11 = HEAP32[74552>>2]|0;
  $12 = $Vector;
  $13 = (246216 + ($12<<2)|0);
  HEAP32[$13>>2] = $11;
 } else {
  $14 = $Vector;
  $15 = (246216 + ($14<<2)|0);
  $16 = HEAP32[$15>>2]|0;
  $Vector = $16;
  while(1) {
   $17 = $Vector;
   $18 = (74560 + (($17*40)|0)|0);
   $19 = (($18) + 36|0);
   $20 = HEAP32[$19>>2]|0;
   $21 = ($20|0)>(-1);
   if (!($21)) {
    break;
   }
   $22 = $Vector;
   $23 = (74560 + (($22*40)|0)|0);
   $24 = (($23) + 36|0);
   $25 = HEAP32[$24>>2]|0;
   $Vector = $25;
  }
  $26 = HEAP32[74552>>2]|0;
  $27 = $Vector;
  $28 = (74560 + (($27*40)|0)|0);
  $29 = (($28) + 36|0);
  HEAP32[$29>>2] = $26;
 }
 $30 = HEAP32[74552>>2]|0;
 $31 = (74560 + (($30*40)|0)|0);
 $32 = $1;
 (_strcpy(($31|0),($32|0))|0);
 $33 = HEAP32[74552>>2]|0;
 $34 = (($33) + 1)|0;
 HEAP32[74552>>2] = $34;
 $0 = 0;
 $35 = $0;
 STACKTOP = sp;return ($35|0);
}
function __Z10FindSymbolP12TSymbolTable($Symbol) {
 $Symbol = $Symbol|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, $Vector = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $Symbol;
 $Result = 0;
 $1 = $0;
 $2 = (($1) + 36|0);
 HEAP32[$2>>2] = 46;
 $3 = $0;
 $4 = (($3) + 40|0);
 HEAP16[$4>>1] = 0;
 $5 = $0;
 $6 = (($5) + 44|0);
 HEAP32[$6>>2] = 0;
 $7 = $0;
 $8 = (__Z15GetSymbolVectorPKc($7)|0);
 $Vector = $8;
 $9 = $Vector;
 $10 = ($9|0)>(-1);
 if ($10) {
  $11 = $Vector;
  $12 = (25400 + (($11*48)|0)|0);
  $13 = (($12) + 36|0);
  $14 = HEAP32[$13>>2]|0;
  $15 = $0;
  $16 = (($15) + 36|0);
  HEAP32[$16>>2] = $14;
  $17 = $Vector;
  $18 = (25400 + (($17*48)|0)|0);
  $19 = (($18) + 40|0);
  $20 = HEAP16[$19>>1]|0;
  $21 = $0;
  $22 = (($21) + 40|0);
  HEAP16[$22>>1] = $20;
  $Result = 1;
  $29 = $Result;
  STACKTOP = sp;return ($29|0);
 } else {
  $23 = $0;
  $24 = (__Z20GetUndefSymbolVectorPc($23)|0);
  $25 = ($24|0)>(-1);
  $26 = $25 ? 1 : 0;
  $27 = $0;
  $28 = (($27) + 44|0);
  HEAP32[$28>>2] = $26;
  $29 = $Result;
  STACKTOP = sp;return ($29|0);
 }
 return (0)|0;
}
function __Z15GetSymbolVectorPKc($Name) {
 $Name = $Name|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $Name;
 $1 = $0;
 $2 = (__Z14CalcSymbolHashPKc($1)|0);
 $3 = (242120 + ($2<<2)|0);
 $4 = HEAP32[$3>>2]|0;
 $Result = $4;
 while(1) {
  $5 = $Result;
  $6 = ($5|0)>(-1);
  if ($6) {
   $7 = $Result;
   $8 = (25400 + (($7*48)|0)|0);
   $9 = $0;
   $10 = (_strcmp($8,$9)|0);
   $11 = ($10|0)!=(0);
   $17 = $11;
  } else {
   $17 = 0;
  }
  if (!($17)) {
   break;
  }
  $12 = $Result;
  $13 = (25400 + (($12*48)|0)|0);
  $14 = (($13) + 44|0);
  $15 = HEAP32[$14>>2]|0;
  $Result = $15;
 }
 $16 = $Result;
 STACKTOP = sp;return ($16|0);
}
function __Z20GetUndefSymbolVectorPc($Name) {
 $Name = $Name|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $Name;
 $1 = $0;
 $2 = (__Z14CalcSymbolHashPKc($1)|0);
 $3 = (246216 + ($2<<2)|0);
 $4 = HEAP32[$3>>2]|0;
 $Result = $4;
 while(1) {
  $5 = $Result;
  $6 = ($5|0)>(-1);
  if ($6) {
   $7 = $Result;
   $8 = (74560 + (($7*40)|0)|0);
   $9 = $0;
   $10 = (_strcmp($8,$9)|0);
   $11 = ($10|0)!=(0);
   $17 = $11;
  } else {
   $17 = 0;
  }
  if (!($17)) {
   break;
  }
  $12 = $Result;
  $13 = (74560 + (($12*40)|0)|0);
  $14 = (($13) + 36|0);
  $15 = HEAP32[$14>>2]|0;
  $Result = $15;
 }
 $16 = $Result;
 STACKTOP = sp;return ($16|0);
}
function __Z17ModifySymbolValuePKct($Name,$Value) {
 $Name = $Name|0;
 $Value = $Value|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Vector = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $Name;
 $1 = $Value;
 $2 = $0;
 $3 = (__Z15GetSymbolVectorPKc($2)|0);
 $Vector = $3;
 $4 = $Vector;
 $5 = ($4|0)>(-1);
 if ($5) {
  $6 = $1;
  $7 = $Vector;
  $8 = (25400 + (($7*48)|0)|0);
  $9 = (($8) + 40|0);
  HEAP16[$9>>1] = $6;
 }
 $10 = $Vector;
 $11 = ($10|0)>(-1);
 $12 = $11&1;
 STACKTOP = sp;return ($12|0);
}
function __Z12ElementErrorh10TErrorCode($IncLength,$ErrorID) {
 $IncLength = $IncLength|0;
 $ErrorID = $ErrorID|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $IncLength;
 $1 = $ErrorID;
 $2 = HEAP16[250344>>1]|0;
 $3 = $2&65535;
 $4 = HEAP32[8>>2]|0;
 $5 = (($4) + 92|0);
 HEAP32[$5>>2] = $3;
 $6 = HEAP32[250352>>2]|0;
 $7 = HEAP16[250344>>1]|0;
 $8 = $7&65535;
 $9 = (($6) - ($8))|0;
 $10 = $0;
 $11 = ($10<<24>>24)!=(0);
 $12 = $11 ? 1 : 0;
 $13 = (($9) + ($12))|0;
 $14 = HEAP32[8>>2]|0;
 $15 = (($14) + 96|0);
 HEAP32[$15>>2] = $13;
 $16 = $1;
 $17 = (__Z5Error10TErrorCode($16)|0);
 STACKTOP = sp;return ($17|0);
}
function __Z12EnterElement12TElementTypeth($ElementType,$Value,$IsEnd) {
 $ElementType = $ElementType|0;
 $Value = $Value|0;
 $IsEnd = $IsEnd|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $ElementType;
 $2 = $Value;
 $3 = $IsEnd;
 $4 = $3;
 $5 = ($4<<24>>24)!=(0);
 do {
  if ($5) {
   $6 = HEAP8[250360>>0]|0;
   $7 = ($6<<24>>24)!=(0);
   if ($7) {
    $0 = 0;
    $38 = $0;
    STACKTOP = sp;return ($38|0);
   } else {
    $1 = 47;
    break;
   }
  }
 } while(0);
 $8 = HEAP16[238720>>1]|0;
 $9 = $8&65535;
 $10 = ($9|0)==(10240);
 if ($10) {
  $11 = (__Z12ElementErrorh10TErrorCode(0,7)|0);
  $0 = $11;
  $38 = $0;
  STACKTOP = sp;return ($38|0);
 } else {
  $12 = $1;
  $13 = HEAP16[238720>>1]|0;
  $14 = $13&65535;
  $15 = (115528 + (($14*12)|0)|0);
  HEAP32[$15>>2] = $12;
  $16 = $2;
  $17 = HEAP16[238720>>1]|0;
  $18 = $17&65535;
  $19 = (115528 + (($18*12)|0)|0);
  $20 = (($19) + 4|0);
  HEAP16[$20>>1] = $16;
  $21 = HEAP16[250344>>1]|0;
  $22 = HEAP16[238720>>1]|0;
  $23 = $22&65535;
  $24 = (115528 + (($23*12)|0)|0);
  $25 = (($24) + 6|0);
  HEAP16[$25>>1] = $21;
  $26 = HEAP32[250352>>2]|0;
  $27 = HEAP16[250344>>1]|0;
  $28 = $27&65535;
  $29 = (($26) - ($28))|0;
  $30 = $29&255;
  $31 = HEAP16[238720>>1]|0;
  $32 = $31&65535;
  $33 = (115528 + (($32*12)|0)|0);
  $34 = (($33) + 8|0);
  HEAP8[$34>>0] = $30;
  $35 = HEAP16[238720>>1]|0;
  $36 = (($35) + 1)<<16>>16;
  HEAP16[238720>>1] = $36;
  $37 = $3;
  HEAP8[250360>>0] = $37;
  $0 = 0;
  $38 = $0;
  STACKTOP = sp;return ($38|0);
 }
 return (0)|0;
}
function __Z9SkipToEndv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 while(1) {
  $0 = HEAP32[250352>>2]|0;
  $1 = HEAP32[16>>2]|0;
  $2 = (($1) + ($0)|0);
  $3 = HEAP8[$2>>0]|0;
  $4 = $3 << 24 >> 24;
  $5 = ($4|0)!=(3);
  if (!($5)) {
   break;
  }
  $6 = HEAP32[250352>>2]|0;
  $7 = (($6) + 1)|0;
  HEAP32[250352>>2] = $7;
 }
 $8 = HEAP32[250352>>2]|0;
 $9 = (($8) + 1)|0;
 HEAP32[250352>>2] = $9;
 STACKTOP = sp;return;
}
function __Z9GetStringv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, $Value = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = HEAP32[250352>>2]|0;
 $2 = HEAP32[16>>2]|0;
 $3 = (($2) + ($1)|0);
 $4 = HEAP8[$3>>0]|0;
 $5 = $4 << 24 >> 24;
 $6 = ($5|0)==(34);
 if ($6) {
  $7 = (__Z12ElementErrorh10TErrorCode(1,1)|0);
  $0 = $7;
  $49 = $0;
  STACKTOP = sp;return ($49|0);
 }
 while(1) {
  $8 = HEAP32[250352>>2]|0;
  $9 = HEAP32[16>>2]|0;
  $10 = (($9) + ($8)|0);
  $11 = HEAP8[$10>>0]|0;
  $12 = $11 << 24 >> 24;
  $13 = ($12|0)!=(34);
  if (!($13)) {
   label = 14;
   break;
  }
  $14 = HEAP32[250352>>2]|0;
  $15 = HEAP32[16>>2]|0;
  $16 = (($15) + ($14)|0);
  $17 = HEAP8[$16>>0]|0;
  $18 = $17 << 24 >> 24;
  $19 = ($18|0)==(3);
  if ($19) {
   label = 6;
   break;
  }
  $21 = HEAP32[250352>>2]|0;
  $22 = HEAP32[16>>2]|0;
  $23 = (($22) + ($21)|0);
  $24 = HEAP8[$23>>0]|0;
  $25 = $24 << 24 >> 24;
  $Value = $25;
  $26 = HEAP32[250352>>2]|0;
  $27 = (($26) + 1)|0;
  HEAP32[250352>>2] = $27;
  $28 = $Value;
  $29 = (__Z12EnterElement12TElementTypeth(12,$28,0)|0);
  $Result = $29;
  $30 = ($29|0)!=(0);
  if ($30) {
   label = 8;
   break;
  }
  $32 = HEAP32[250352>>2]|0;
  $33 = HEAP32[16>>2]|0;
  $34 = (($33) + ($32)|0);
  $35 = HEAP8[$34>>0]|0;
  $36 = $35 << 24 >> 24;
  $37 = ($36|0)!=(34);
  if ($37) {
   $38 = HEAP32[250352>>2]|0;
   $39 = $38&65535;
   HEAP16[250344>>1] = $39;
   $40 = HEAP32[250352>>2]|0;
   $41 = (($40) + 1)|0;
   HEAP32[250352>>2] = $41;
   $42 = (__Z12EnterElement12TElementTypeth(14,0,0)|0);
   $Result = $42;
   $43 = ($42|0)!=(0);
   if ($43) {
    label = 11;
    break;
   }
   $45 = HEAP32[250352>>2]|0;
   $46 = (($45) + -1)|0;
   HEAP32[250352>>2] = $46;
  }
 }
 if ((label|0) == 6) {
  $20 = (__Z12ElementErrorh10TErrorCode(0,2)|0);
  $0 = $20;
  $49 = $0;
  STACKTOP = sp;return ($49|0);
 }
 else if ((label|0) == 8) {
  $31 = $Result;
  $0 = $31;
  $49 = $0;
  STACKTOP = sp;return ($49|0);
 }
 else if ((label|0) == 11) {
  $44 = $Result;
  $0 = $44;
  $49 = $0;
  STACKTOP = sp;return ($49|0);
 }
 else if ((label|0) == 14) {
  $47 = HEAP32[250352>>2]|0;
  $48 = (($47) + 1)|0;
  HEAP32[250352>>2] = $48;
  $0 = 0;
  $49 = $0;
  STACKTOP = sp;return ($49|0);
 }
 return (0)|0;
}
function __Z9GetNumber5TBasehPt($Base,$DPDigits,$Result) {
 $Base = $Base|0;
 $DPDigits = $DPDigits|0;
 $Result = $Result|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0;
 var $Count = 0, $FCount = 0, $Value = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Base;
 $2 = $DPDigits;
 $3 = $Result;
 $4 = $1;
 $5 = ($4|0)!=(1);
 if ($5) {
  $6 = HEAP32[250352>>2]|0;
  $7 = HEAP32[16>>2]|0;
  $8 = (($7) + ($6)|0);
  $9 = HEAP8[$8>>0]|0;
  $10 = $9 << 24 >> 24;
  $11 = (_toupper($10)|0);
  $12 = $11&255;
  HEAP8[250368>>0] = $12;
  $13 = HEAP32[250352>>2]|0;
  $14 = (($13) + 1)|0;
  HEAP32[250352>>2] = $14;
 }
 $15 = HEAP8[250368>>0]|0;
 $16 = $1;
 $17 = (__Z11InBaseRangec5TBase($15,$16)|0);
 $18 = ($17<<24>>24)!=(0);
 if (!($18)) {
  $19 = HEAP16[250344>>1]|0;
  $20 = (($19) + 1)<<16>>16;
  HEAP16[250344>>1] = $20;
  $21 = $1;
  $22 = ($21|0)==(0);
  if ($22) {
   $23 = (__Z12ElementErrorh10TErrorCode(0,5)|0);
   $0 = $23;
   $118 = $0;
   STACKTOP = sp;return ($118|0);
  } else {
   $24 = (__Z12ElementErrorh10TErrorCode(0,4)|0);
   $0 = $24;
   $118 = $0;
   STACKTOP = sp;return ($118|0);
  }
 }
 $Value = 0;
 $Count = 17;
 $FCount = 0;
 while(1) {
  $25 = HEAP8[250368>>0]|0;
  $26 = $1;
  $27 = (__Z11InBaseRangec5TBase($25,$26)|0);
  $28 = ($27<<24>>24)!=(0);
  if ($28) {
   label = 11;
  } else {
   $29 = $2;
   $30 = $29&255;
   $31 = ($30|0)>(0);
   if ($31) {
    $32 = HEAP8[250368>>0]|0;
    $33 = $32&255;
    $34 = ($33|0)==(46);
    if ($34) {
     label = 11;
    } else {
     $119 = 0;
    }
   } else {
    $119 = 0;
   }
  }
  if ((label|0) == 11) {
   label = 0;
   $35 = $Value;
   $36 = $35 & -65536;
   $37 = ($36|0)==(0);
   if ($37) {
    $38 = $Count;
    $39 = $38&255;
    $40 = ($39|0)>(0);
    $119 = $40;
   } else {
    $119 = 0;
   }
  }
  if (!($119)) {
   break;
  }
  $41 = HEAP8[250368>>0]|0;
  $42 = $41&255;
  $43 = ($42|0)!=(46);
  if ($43) {
   $44 = HEAP8[250368>>0]|0;
   $45 = (__Z11InBaseRangec5TBase($44,1)|0);
   $46 = ($45<<24>>24)!=(0);
   if ($46) {
    $47 = HEAP8[250368>>0]|0;
    $48 = $47&255;
    $49 = (($48) - 48)|0;
    $55 = $49;
   } else {
    $50 = HEAP8[250368>>0]|0;
    $51 = $50&255;
    $52 = (($51) - 65)|0;
    $53 = (($52) + 10)|0;
    $55 = $53;
   }
   $54 = $55&255;
   HEAP8[250368>>0] = $54;
   $56 = $Value;
   $57 = $1;
   $58 = (250376 + ($57<<2)|0);
   $59 = HEAP32[$58>>2]|0;
   $60 = Math_imul($56, $59)|0;
   $61 = HEAP8[250368>>0]|0;
   $62 = $61&255;
   $63 = (($60) + ($62))|0;
   $Value = $63;
  }
  $64 = HEAP8[250368>>0]|0;
  $65 = $64&255;
  $66 = ($65|0)==(46);
  if ($66) {
   label = 21;
  } else {
   $67 = $FCount;
   $68 = $67&255;
   $69 = ($68|0)>(0);
   if ($69) {
    label = 21;
   }
  }
  if ((label|0) == 21) {
   label = 0;
   $70 = $FCount;
   $71 = (($70) + 1)<<24>>24;
   $FCount = $71;
  }
  $72 = $FCount;
  $73 = $72&255;
  $74 = ($73|0)>(0);
  if ($74) {
   $75 = $Value;
   $76 = ($75|0)==(0);
   if ($76) {
    label = 24;
    break;
   }
  }
  $78 = HEAP32[250352>>2]|0;
  $79 = HEAP32[16>>2]|0;
  $80 = (($79) + ($78)|0);
  $81 = HEAP8[$80>>0]|0;
  $82 = $81 << 24 >> 24;
  $83 = (_toupper($82)|0);
  $84 = $83&255;
  HEAP8[250368>>0] = $84;
  $85 = HEAP32[250352>>2]|0;
  $86 = (($85) + 1)|0;
  HEAP32[250352>>2] = $86;
  $87 = $Count;
  $88 = (($87) + -1)<<24>>24;
  $Count = $88;
 }
 if ((label|0) == 24) {
  $77 = (__Z12ElementErrorh10TErrorCode(0,90)|0);
  $0 = $77;
  $118 = $0;
  STACKTOP = sp;return ($118|0);
 }
 $89 = $FCount;
 $90 = $89&255;
 $91 = ($90|0)==(0);
 if ($91) {
  $FCount = 1;
 }
 while(1) {
  $92 = $FCount;
  $93 = $92&255;
  $94 = $2;
  $95 = $94&255;
  $96 = (($95) + 1)|0;
  $97 = ($93|0)<($96|0);
  if (!($97)) {
   break;
  }
  $98 = $Value;
  $99 = $1;
  $100 = (250376 + ($99<<2)|0);
  $101 = HEAP32[$100>>2]|0;
  $102 = Math_imul($98, $101)|0;
  $Value = $102;
  $103 = $FCount;
  $104 = (($103) + 1)<<24>>24;
  $FCount = $104;
 }
 $105 = $Value;
 $106 = $105 & -65536;
 $107 = ($106|0)==(0);
 if (!($107)) {
  $110 = (__Z12ElementErrorh10TErrorCode(0,9)|0);
  $0 = $110;
  $118 = $0;
  STACKTOP = sp;return ($118|0);
 }
 $108 = HEAP32[250352>>2]|0;
 $109 = (($108) + -1)|0;
 HEAP32[250352>>2] = $109;
 $111 = $Count;
 $112 = $111&255;
 $113 = ($112|0)==(0);
 if ($113) {
  $114 = (__Z12ElementErrorh10TErrorCode(0,8)|0);
  $0 = $114;
  $118 = $0;
  STACKTOP = sp;return ($118|0);
 } else {
  $115 = $Value;
  $116 = $115&65535;
  $117 = $3;
  HEAP16[$117>>1] = $116;
  $0 = 0;
  $118 = $0;
  STACKTOP = sp;return ($118|0);
 }
 return (0)|0;
}
function __Z11InBaseRangec5TBase($C,$Base) {
 $C = $C|0;
 $Base = $Base|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $C;
 $2 = $Base;
 $3 = $1;
 $4 = $3 << 24 >> 24;
 $5 = (_toupper($4)|0);
 $6 = $5&255;
 $1 = $6;
 $7 = $2;
 if ((($7|0) == 0)) {
  $8 = $1;
  $9 = $8 << 24 >> 24;
  $10 = ($9|0)>=(48);
  if ($10) {
   $11 = $1;
   $12 = $11 << 24 >> 24;
   $13 = ($12|0)<=(49);
   $15 = $13;
  } else {
   $15 = 0;
  }
  $14 = $15&1;
  $0 = $14;
  $38 = $0;
  STACKTOP = sp;return ($38|0);
 } else if ((($7|0) == 1)) {
  $16 = $1;
  $17 = $16 << 24 >> 24;
  $18 = ($17|0)>=(48);
  if ($18) {
   $19 = $1;
   $20 = $19 << 24 >> 24;
   $21 = ($20|0)<=(57);
   $23 = $21;
  } else {
   $23 = 0;
  }
  $22 = $23&1;
  $0 = $22;
  $38 = $0;
  STACKTOP = sp;return ($38|0);
 } else {
  $24 = $1;
  $25 = $24 << 24 >> 24;
  $26 = ($25|0)>=(48);
  if ($26) {
   $27 = $1;
   $28 = $27 << 24 >> 24;
   $29 = ($28|0)<=(57);
   if ($29) {
    $37 = 1;
   } else {
    label = 10;
   }
  } else {
   label = 10;
  }
  if ((label|0) == 10) {
   $30 = $1;
   $31 = $30 << 24 >> 24;
   $32 = ($31|0)>=(65);
   if ($32) {
    $33 = $1;
    $34 = $33 << 24 >> 24;
    $35 = ($34|0)<=(70);
    $39 = $35;
   } else {
    $39 = 0;
   }
   $37 = $39;
  }
  $36 = $37&1;
  $0 = $36;
  $38 = $0;
  STACKTOP = sp;return ($38|0);
 }
 return (0)|0;
}
function __Z9GetSymbolv() {
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $12 = 0;
 var $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0;
 var $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0;
 var $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0;
 var $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0;
 var $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $Count = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Count = 32;
 $1 = HEAP8[250368>>0]|0;
 $2 = $1&255;
 $3 = (_toupper($2)|0);
 $4 = $3&255;
 HEAP8[238728>>0] = $4;
 HEAP8[((238728 + 1|0))>>0] = 0;
 while(1) {
  $5 = $Count;
  $6 = ($5|0)>(0);
  if ($6) {
   $7 = HEAP32[250352>>2]|0;
   $8 = HEAP32[16>>2]|0;
   $9 = (($8) + ($7)|0);
   $10 = HEAP8[$9>>0]|0;
   $11 = $10 << 24 >> 24;
   $12 = ($11|0)==(95);
   do {
    if ($12) {
     $113 = 1;
    } else {
     $13 = HEAP32[250352>>2]|0;
     $14 = HEAP32[16>>2]|0;
     $15 = (($14) + ($13)|0);
     $16 = HEAP8[$15>>0]|0;
     $17 = $16 << 24 >> 24;
     $18 = ($17|0)>=(48);
     if ($18) {
      $19 = HEAP32[250352>>2]|0;
      $20 = HEAP32[16>>2]|0;
      $21 = (($20) + ($19)|0);
      $22 = HEAP8[$21>>0]|0;
      $23 = $22 << 24 >> 24;
      $24 = ($23|0)<=(57);
      if ($24) {
       $113 = 1;
       break;
      }
     }
     $25 = HEAP32[250352>>2]|0;
     $26 = HEAP32[16>>2]|0;
     $27 = (($26) + ($25)|0);
     $28 = HEAP8[$27>>0]|0;
     $29 = $28 << 24 >> 24;
     $30 = ($29|0)>=(65);
     if ($30) {
      $31 = HEAP32[250352>>2]|0;
      $32 = HEAP32[16>>2]|0;
      $33 = (($32) + ($31)|0);
      $34 = HEAP8[$33>>0]|0;
      $35 = $34 << 24 >> 24;
      $36 = ($35|0)<=(90);
      if ($36) {
       $113 = 1;
       break;
      }
     }
     $37 = HEAP32[250352>>2]|0;
     $38 = HEAP32[16>>2]|0;
     $39 = (($38) + ($37)|0);
     $40 = HEAP8[$39>>0]|0;
     $41 = $40 << 24 >> 24;
     $42 = ($41|0)>=(97);
     if ($42) {
      $43 = HEAP32[250352>>2]|0;
      $44 = HEAP32[16>>2]|0;
      $45 = (($44) + ($43)|0);
      $46 = HEAP8[$45>>0]|0;
      $47 = $46 << 24 >> 24;
      $48 = ($47|0)<=(122);
      $114 = $48;
     } else {
      $114 = 0;
     }
     $113 = $114;
    }
   } while(0);
   $112 = $113;
  } else {
   $112 = 0;
  }
  if (!($112)) {
   break;
  }
  $49 = HEAP32[250352>>2]|0;
  $50 = HEAP32[16>>2]|0;
  $51 = (($50) + ($49)|0);
  $52 = HEAP8[$51>>0]|0;
  $53 = $52 << 24 >> 24;
  $54 = (_toupper($53)|0);
  $55 = $54&255;
  $56 = $Count;
  $57 = (32 - ($56))|0;
  $58 = (($57) + 1)|0;
  $59 = (238728 + ($58)|0);
  HEAP8[$59>>0] = $55;
  $60 = $Count;
  $61 = (32 - ($60))|0;
  $62 = (($61) + 2)|0;
  $63 = (238728 + ($62)|0);
  HEAP8[$63>>0] = 0;
  $64 = HEAP32[250352>>2]|0;
  $65 = (($64) + 1)|0;
  HEAP32[250352>>2] = $65;
  $66 = $Count;
  $67 = (($66) + -1)|0;
  $Count = $67;
 }
 $68 = $Count;
 $69 = ($68|0)==(0);
 if ($69) {
  $70 = (__Z12ElementErrorh10TErrorCode(0,6)|0);
  $0 = $70;
  $111 = $0;
  STACKTOP = sp;return ($111|0);
 }
 (__Z10FindSymbolP12TSymbolTable(238728)|0);
 $71 = HEAP32[((238728 + 36|0))>>2]|0;
 $72 = HEAP16[((238728 + 40|0))>>1]|0;
 $73 = (__Z12EnterElement12TElementTypeth($71,$72,0)|0);
 $Result = $73;
 $74 = ($73|0)!=(0);
 if ($74) {
  $75 = $Result;
  $0 = $75;
  $111 = $0;
  STACKTOP = sp;return ($111|0);
 }
 $76 = HEAP32[((238728 + 36|0))>>2]|0;
 $77 = ($76|0)==(22);
 if ($77) {
  label = 22;
 } else {
  $78 = HEAP32[((238728 + 36|0))>>2]|0;
  $79 = ($78|0)==(29);
  if ($79) {
   label = 22;
  } else {
   $80 = HEAP32[((238728 + 36|0))>>2]|0;
   $81 = ($80|0)==(4);
   if ($81) {
    label = 22;
   } else {
    $82 = HEAP32[((238728 + 36|0))>>2]|0;
    $83 = ($82|0)==(28);
    if ($83) {
     label = 22;
    }
   }
  }
 }
 do {
  if ((label|0) == 22) {
   $84 = HEAP16[238720>>1]|0;
   $85 = $84&65535;
   $86 = (($85) - 2)|0;
   $87 = ($86|0)>(-1);
   if ($87) {
    $88 = HEAP16[238720>>1]|0;
    $89 = $88&65535;
    $90 = (($89) - 2)|0;
    $91 = (115528 + (($90*12)|0)|0);
    $92 = HEAP32[$91>>2]|0;
    $93 = ($92|0)==(46);
    if ($93) {
     $94 = HEAP16[238720>>1]|0;
     $95 = $94&65535;
     $96 = (($95) - 2)|0;
     $97 = (115528 + (($96*12)|0)|0);
     $98 = (($97) + 6|0);
     $99 = HEAP16[$98>>1]|0;
     $100 = $99&65535;
     $101 = HEAP16[238720>>1]|0;
     $102 = $101&65535;
     $103 = (($102) - 2)|0;
     $104 = (115528 + (($103*12)|0)|0);
     $105 = (($104) + 8|0);
     $106 = HEAP8[$105>>0]|0;
     $107 = $106&255;
     __Z13GetSymbolNameii($100,$107);
     $108 = (__Z16EnterUndefSymbolPc(238728)|0);
     $Result = $108;
     $109 = ($108|0)!=(0);
     if (!($109)) {
      break;
     }
     $110 = $Result;
     $0 = $110;
     $111 = $0;
     STACKTOP = sp;return ($111|0);
    }
   }
  }
 } while(0);
 $0 = 0;
 $111 = $0;
 STACKTOP = sp;return ($111|0);
}
function __Z13GetSymbolNameii($Start,$Length) {
 $Start = $Start|0;
 $Length = $Length|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $Idx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $Start;
 $1 = $Length;
 HEAP8[238728>>0] = 0;
 $Idx = 0;
 while(1) {
  $2 = $Idx;
  $3 = $1;
  $4 = ($2|0)<($3|0);
  if (!($4)) {
   break;
  }
  $5 = $0;
  $6 = $Idx;
  $7 = (($5) + ($6))|0;
  $8 = HEAP32[16>>2]|0;
  $9 = (($8) + ($7)|0);
  $10 = HEAP8[$9>>0]|0;
  $11 = $10 << 24 >> 24;
  $12 = (_toupper($11)|0);
  $13 = $12&255;
  $14 = $Idx;
  $15 = (238728 + ($14)|0);
  HEAP8[$15>>0] = $13;
  $16 = $Idx;
  $17 = (($16) + 1)|0;
  $Idx = $17;
 }
 $18 = $1;
 $19 = (238728 + ($18)|0);
 HEAP8[$19>>0] = 0;
 STACKTOP = sp;return;
}
function __Z11GetFilenameh($Quoted) {
 $Quoted = $Quoted|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0;
 var $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0;
 var $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0;
 var $96 = 0, $97 = 0, $98 = 0, $99 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Quoted;
 $2 = HEAP32[250352>>2]|0;
 $3 = $2&65535;
 HEAP16[250344>>1] = $3;
 $4 = $1;
 $5 = ($4<<24>>24)!=(0);
 do {
  if ($5) {
   $8 = HEAP32[250352>>2]|0;
   $9 = HEAP32[16>>2]|0;
   $10 = (($9) + ($8)|0);
   $11 = HEAP8[$10>>0]|0;
   $12 = $11 << 24 >> 24;
   $13 = ($12|0)==(34);
   if (!($13)) {
    break;
   }
   $14 = (__Z12ElementErrorh10TErrorCode(1,1)|0);
   $0 = $14;
   $120 = $0;
   STACKTOP = sp;return ($120|0);
  } else {
   $6 = HEAP16[250344>>1]|0;
   $7 = (($6) + -1)<<16>>16;
   HEAP16[250344>>1] = $7;
  }
 } while(0);
 while(1) {
  $15 = HEAP32[250352>>2]|0;
  $16 = HEAP32[16>>2]|0;
  $17 = (($16) + ($15)|0);
  $18 = HEAP8[$17>>0]|0;
  $19 = $18 << 24 >> 24;
  $20 = ($19|0)==(33);
  do {
   if ($20) {
    $121 = 1;
   } else {
    $21 = HEAP32[250352>>2]|0;
    $22 = HEAP32[16>>2]|0;
    $23 = (($22) + ($21)|0);
    $24 = HEAP8[$23>>0]|0;
    $25 = $24 << 24 >> 24;
    $26 = ($25|0)>=(35);
    if ($26) {
     $27 = HEAP32[250352>>2]|0;
     $28 = HEAP32[16>>2]|0;
     $29 = (($28) + ($27)|0);
     $30 = HEAP8[$29>>0]|0;
     $31 = $30 << 24 >> 24;
     $32 = ($31|0)<=(41);
     if ($32) {
      $121 = 1;
      break;
     }
    }
    $33 = HEAP32[250352>>2]|0;
    $34 = HEAP32[16>>2]|0;
    $35 = (($34) + ($33)|0);
    $36 = HEAP8[$35>>0]|0;
    $37 = $36 << 24 >> 24;
    $38 = ($37|0)==(43);
    if ($38) {
     $121 = 1;
    } else {
     $39 = HEAP32[250352>>2]|0;
     $40 = HEAP32[16>>2]|0;
     $41 = (($40) + ($39)|0);
     $42 = HEAP8[$41>>0]|0;
     $43 = $42 << 24 >> 24;
     $44 = ($43|0)>=(45);
     if ($44) {
      $45 = HEAP32[250352>>2]|0;
      $46 = HEAP32[16>>2]|0;
      $47 = (($46) + ($45)|0);
      $48 = HEAP8[$47>>0]|0;
      $49 = $48 << 24 >> 24;
      $50 = ($49|0)<=(59);
      if ($50) {
       $121 = 1;
       break;
      }
     }
     $51 = HEAP32[250352>>2]|0;
     $52 = HEAP32[16>>2]|0;
     $53 = (($52) + ($51)|0);
     $54 = HEAP8[$53>>0]|0;
     $55 = $54 << 24 >> 24;
     $56 = ($55|0)==(61);
     if ($56) {
      $121 = 1;
     } else {
      $57 = HEAP32[250352>>2]|0;
      $58 = HEAP32[16>>2]|0;
      $59 = (($58) + ($57)|0);
      $60 = HEAP8[$59>>0]|0;
      $61 = $60 << 24 >> 24;
      $62 = ($61|0)>=(64);
      if ($62) {
       $63 = HEAP32[250352>>2]|0;
       $64 = HEAP32[16>>2]|0;
       $65 = (($64) + ($63)|0);
       $66 = HEAP8[$65>>0]|0;
       $67 = $66 << 24 >> 24;
       $68 = ($67|0)<=(122);
       if ($68) {
        $121 = 1;
        break;
       }
      }
      $69 = HEAP32[250352>>2]|0;
      $70 = HEAP32[16>>2]|0;
      $71 = (($70) + ($69)|0);
      $72 = HEAP8[$71>>0]|0;
      $73 = $72 << 24 >> 24;
      $74 = ($73|0)==(126);
      if ($74) {
       $121 = 1;
      } else {
       $75 = $1;
       $76 = ($75<<24>>24)!=(0);
       if ($76) {
        $77 = HEAP32[250352>>2]|0;
        $78 = HEAP32[16>>2]|0;
        $79 = (($78) + ($77)|0);
        $80 = HEAP8[$79>>0]|0;
        $81 = $80 << 24 >> 24;
        $82 = ($81|0)==(32);
        if ($82) {
         $123 = 1;
        } else {
         $83 = HEAP32[250352>>2]|0;
         $84 = HEAP32[16>>2]|0;
         $85 = (($84) + ($83)|0);
         $86 = HEAP8[$85>>0]|0;
         $87 = $86 << 24 >> 24;
         $88 = ($87|0)==(44);
         if ($88) {
          $123 = 1;
         } else {
          $89 = HEAP32[250352>>2]|0;
          $90 = HEAP32[16>>2]|0;
          $91 = (($90) + ($89)|0);
          $92 = HEAP8[$91>>0]|0;
          $93 = $92 << 24 >> 24;
          $94 = ($93|0)==(123);
          if ($94) {
           $123 = 1;
          } else {
           $95 = HEAP32[250352>>2]|0;
           $96 = HEAP32[16>>2]|0;
           $97 = (($96) + ($95)|0);
           $98 = HEAP8[$97>>0]|0;
           $99 = $98 << 24 >> 24;
           $100 = ($99|0)==(125);
           $123 = $100;
          }
         }
        }
        $122 = $123;
       } else {
        $122 = 0;
       }
       $121 = $122;
      }
     }
    }
   }
  } while(0);
  if (!($121)) {
   break;
  }
  $101 = HEAP32[250352>>2]|0;
  $102 = (($101) + 1)|0;
  HEAP32[250352>>2] = $102;
 }
 $103 = $1;
 $104 = ($103<<24>>24)!=(0);
 if ($104) {
  $105 = HEAP32[250352>>2]|0;
  $106 = HEAP32[16>>2]|0;
  $107 = (($106) + ($105)|0);
  $108 = HEAP8[$107>>0]|0;
  $109 = $108 << 24 >> 24;
  $110 = ($109|0)!=(34);
  if ($110) {
   $111 = (__Z12ElementErrorh10TErrorCode(0,2)|0);
   $0 = $111;
   $120 = $0;
   STACKTOP = sp;return ($120|0);
  }
 }
 $112 = (__Z12EnterElement12TElementTypeth(45,0,0)|0);
 $Result = $112;
 $113 = ($112|0)!=(0);
 if ($113) {
  $114 = $Result;
  $0 = $114;
  $120 = $0;
  STACKTOP = sp;return ($120|0);
 } else {
  $115 = $1;
  $116 = ($115<<24>>24)!=(0);
  $117 = $116 ? 1 : 0;
  $118 = HEAP32[250352>>2]|0;
  $119 = (($118) + ($117))|0;
  HEAP32[250352>>2] = $119;
  $0 = 0;
  $120 = $0;
  STACKTOP = sp;return ($120|0);
 }
 return (0)|0;
}
function __Z12GetDirectivev() {
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0;
 var $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0;
 var $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0;
 var $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0;
 var $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $Directive = 0, $Number = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Number = sp + 8|0;
 while(1) {
  $1 = HEAP32[250352>>2]|0;
  $2 = HEAP32[8>>2]|0;
  $3 = (($2) + 88|0);
  $4 = HEAP32[$3>>2]|0;
  $5 = ($1|0)<($4|0);
  if ($5) {
   $6 = HEAP32[250352>>2]|0;
   $7 = HEAP32[16>>2]|0;
   $8 = (($7) + ($6)|0);
   $9 = HEAP8[$8>>0]|0;
   $10 = $9 << 24 >> 24;
   $11 = ($10|0)==(9);
   if ($11) {
    $170 = 1;
   } else {
    $12 = HEAP32[250352>>2]|0;
    $13 = HEAP32[16>>2]|0;
    $14 = (($13) + ($12)|0);
    $15 = HEAP8[$14>>0]|0;
    $16 = $15 << 24 >> 24;
    $17 = ($16|0)==(32);
    $170 = $17;
   }
   $169 = $170;
  } else {
   $169 = 0;
  }
  if (!($169)) {
   break;
  }
  $18 = HEAP32[250352>>2]|0;
  $19 = (($18) + 1)|0;
  HEAP32[250352>>2] = $19;
 }
 $20 = HEAP32[250352>>2]|0;
 $21 = (($20) + 1)|0;
 HEAP32[250352>>2] = $21;
 $22 = HEAP32[250352>>2]|0;
 $23 = (($22) - 1)|0;
 $24 = HEAP32[16>>2]|0;
 $25 = (($24) + ($23)|0);
 $26 = HEAP8[$25>>0]|0;
 $27 = $26 << 24 >> 24;
 $28 = ($27|0)==(123);
 if ($28) {
  while(1) {
   $29 = HEAP32[250352>>2]|0;
   $30 = HEAP32[8>>2]|0;
   $31 = (($30) + 88|0);
   $32 = HEAP32[$31>>2]|0;
   $33 = ($29|0)<($32|0);
   if ($33) {
    $34 = HEAP32[250352>>2]|0;
    $35 = HEAP32[16>>2]|0;
    $36 = (($35) + ($34)|0);
    $37 = HEAP8[$36>>0]|0;
    $38 = $37 << 24 >> 24;
    $39 = ($38|0)==(9);
    if ($39) {
     $172 = 1;
    } else {
     $40 = HEAP32[250352>>2]|0;
     $41 = HEAP32[16>>2]|0;
     $42 = (($41) + ($40)|0);
     $43 = HEAP8[$42>>0]|0;
     $44 = $43 << 24 >> 24;
     $45 = ($44|0)==(32);
     $172 = $45;
    }
    $171 = $172;
   } else {
    $171 = 0;
   }
   if (!($171)) {
    break;
   }
   $46 = HEAP32[250352>>2]|0;
   $47 = (($46) + 1)|0;
   HEAP32[250352>>2] = $47;
  }
  $48 = HEAP32[250352>>2]|0;
  $49 = HEAP32[16>>2]|0;
  $50 = (($49) + ($48)|0);
  $51 = HEAP8[$50>>0]|0;
  $52 = $51 << 24 >> 24;
  $53 = ($52|0)==(36);
  L24: do {
   if ($53) {
    $Directive = 1;
    L27: while(1) {
     $54 = $Directive;
     $55 = $54&255;
     $56 = ($55|0)>(0);
     if ($56) {
      $57 = HEAP32[250352>>2]|0;
      $58 = HEAP32[8>>2]|0;
      $59 = (($58) + 88|0);
      $60 = HEAP32[$59>>2]|0;
      $61 = ($57|0)<=($60|0);
      $173 = $61;
     } else {
      $173 = 0;
     }
     if (!($173)) {
      label = 76;
      break;
     }
     $62 = HEAP32[250352>>2]|0;
     $63 = $62&65535;
     HEAP16[250344>>1] = $63;
     $64 = HEAP32[250352>>2]|0;
     $65 = HEAP32[16>>2]|0;
     $66 = (($65) + ($64)|0);
     $67 = HEAP8[$66>>0]|0;
     HEAP8[250368>>0] = $67;
     $68 = HEAP32[250352>>2]|0;
     $69 = (($68) + 1)|0;
     HEAP32[250352>>2] = $69;
     $70 = HEAP8[250368>>0]|0;
     $71 = $70&255;
     switch ($71|0) {
     case 44:  {
      $76 = (__Z12EnterElement12TElementTypeth(14,0,0)|0);
      $Result = $76;
      $77 = ($76|0)!=(0);
      if ($77) {
       label = 28;
       break L27;
      }
      break;
     }
     case 32: case 9: case 0:  {
      break;
     }
     case 36:  {
      $85 = (__Z9GetSymbolv()|0);
      $Result = $85;
      $86 = ($85|0)!=(0);
      if ($86) {
       label = 38;
       break L27;
      }
      $88 = $Directive;
      $89 = (($88) + 1)<<24>>24;
      $Directive = $89;
      $90 = HEAP32[((238728 + 36|0))>>2]|0;
      $91 = ($90|0)!=(0);
      if ($91) {
       label = 40;
       break L27;
      }
      break;
     }
     case 3:  {
      $72 = HEAP32[250392>>2]|0;
      $73 = (__Z12EnterElement12TElementTypeth($72,0,1)|0);
      $Result = $73;
      $74 = ($73|0)!=(0);
      if ($74) {
       label = 23;
       break L27;
      }
      $Directive = 0;
      break;
     }
     case 125:  {
      $79 = (__Z12EnterElement12TElementTypeth(20,0,0)|0);
      $Result = $79;
      $80 = ($79|0)!=(0);
      if ($80) {
       label = 31;
       break L27;
      }
      __Z9SkipToEndv();
      $Directive = 0;
      break;
     }
     case 57: case 56: case 55: case 54: case 53: case 52: case 51: case 50: case 49: case 48:  {
      $93 = (__Z9GetNumber5TBasehPt(1,2,$Number)|0);
      $Result = $93;
      $94 = ($93|0)!=(0);
      if ($94) {
       label = 43;
       break L27;
      }
      $96 = HEAP16[$Number>>1]|0;
      $97 = (__Z12EnterElement12TElementTypeth(12,$96,0)|0);
      $Result = $97;
      $98 = ($97|0)!=(0);
      if ($98) {
       label = 45;
       break L27;
      }
      break;
     }
     case 34:  {
      $82 = (__Z11GetFilenameh(1)|0);
      $Result = $82;
      $83 = ($82|0)!=(0);
      if ($83) {
       label = 35;
       break L27;
      }
      break;
     }
     default: {
      $100 = HEAP8[250368>>0]|0;
      $101 = $100&255;
      $102 = ($101|0)==(95);
      do {
       if ($102) {
        label = 54;
       } else {
        $103 = HEAP8[250368>>0]|0;
        $104 = $103&255;
        $105 = ($104|0)>=(48);
        if ($105) {
         $106 = HEAP8[250368>>0]|0;
         $107 = $106&255;
         $108 = ($107|0)<=(57);
         if ($108) {
          label = 54;
          break;
         }
        }
        $109 = HEAP8[250368>>0]|0;
        $110 = $109&255;
        $111 = ($110|0)>=(65);
        if ($111) {
         $112 = HEAP8[250368>>0]|0;
         $113 = $112&255;
         $114 = ($113|0)<=(90);
         if ($114) {
          label = 54;
          break;
         }
        }
        $115 = HEAP8[250368>>0]|0;
        $116 = $115&255;
        $117 = ($116|0)>=(97);
        if ($117) {
         $118 = HEAP8[250368>>0]|0;
         $119 = $118&255;
         $120 = ($119|0)<=(122);
         if ($120) {
          label = 54;
         } else {
          label = 58;
         }
        } else {
         label = 58;
        }
       }
      } while(0);
      if ((label|0) == 54) {
       label = 0;
       $121 = $Directive;
       $122 = $121&255;
       $123 = ($122|0)<(3);
       if ($123) {
        $124 = (__Z9GetSymbolv()|0);
        $Result = $124;
        $125 = ($124|0)!=(0);
        if ($125) {
         label = 56;
         break L27;
        }
        $127 = $Directive;
        $128 = (($127) + 1)<<24>>24;
        $Directive = $128;
       } else {
        label = 58;
       }
      }
      if ((label|0) == 58) {
       label = 0;
       $129 = HEAP8[250368>>0]|0;
       $130 = $129&255;
       $131 = ($130|0)==(33);
       do {
        if (!($131)) {
         $132 = HEAP8[250368>>0]|0;
         $133 = $132&255;
         $134 = ($133|0)>=(35);
         if ($134) {
          $135 = HEAP8[250368>>0]|0;
          $136 = $135&255;
          $137 = ($136|0)<=(41);
          if ($137) {
           break;
          }
         }
         $138 = HEAP8[250368>>0]|0;
         $139 = $138&255;
         $140 = ($139|0)==(43);
         if (!($140)) {
          $141 = HEAP8[250368>>0]|0;
          $142 = $141&255;
          $143 = ($142|0)>=(45);
          if ($143) {
           $144 = HEAP8[250368>>0]|0;
           $145 = $144&255;
           $146 = ($145|0)<=(59);
           if ($146) {
            break;
           }
          }
          $147 = HEAP8[250368>>0]|0;
          $148 = $147&255;
          $149 = ($148|0)==(61);
          if (!($149)) {
           $150 = HEAP8[250368>>0]|0;
           $151 = $150&255;
           $152 = ($151|0)>=(64);
           if ($152) {
            $153 = HEAP8[250368>>0]|0;
            $154 = $153&255;
            $155 = ($154|0)<=(122);
            if ($155) {
             break;
            }
           }
           $156 = HEAP8[250368>>0]|0;
           $157 = $156&255;
           $158 = ($157|0)==(126);
           if (!($158)) {
            label = 72;
            break L27;
           }
          }
         }
        }
       } while(0);
       $159 = $Directive;
       $160 = $159&255;
       $161 = ($160|0)<(3);
       if ($161) {
        label = 72;
        break L27;
       }
       $162 = (__Z11GetFilenameh(0)|0);
       $Result = $162;
       $163 = ($162|0)!=(0);
       if ($163) {
        label = 70;
        break L27;
       }
      }
     }
     }
    }
    switch (label|0) {
     case 23: {
      $75 = $Result;
      $0 = $75;
      $168 = $0;
      STACKTOP = sp;return ($168|0);
      break;
     }
     case 28: {
      $78 = $Result;
      $0 = $78;
      $168 = $0;
      STACKTOP = sp;return ($168|0);
      break;
     }
     case 31: {
      $81 = $Result;
      $0 = $81;
      $168 = $0;
      STACKTOP = sp;return ($168|0);
      break;
     }
     case 35: {
      $84 = $Result;
      $0 = $84;
      $168 = $0;
      STACKTOP = sp;return ($168|0);
      break;
     }
     case 38: {
      $87 = $Result;
      $0 = $87;
      $168 = $0;
      STACKTOP = sp;return ($168|0);
      break;
     }
     case 40: {
      $92 = (__Z12ElementErrorh10TErrorCode(0,57)|0);
      $0 = $92;
      $168 = $0;
      STACKTOP = sp;return ($168|0);
      break;
     }
     case 43: {
      $95 = $Result;
      $0 = $95;
      $168 = $0;
      STACKTOP = sp;return ($168|0);
      break;
     }
     case 45: {
      $99 = $Result;
      $0 = $99;
      $168 = $0;
      STACKTOP = sp;return ($168|0);
      break;
     }
     case 56: {
      $126 = $Result;
      $0 = $126;
      $168 = $0;
      STACKTOP = sp;return ($168|0);
      break;
     }
     case 70: {
      $164 = $Result;
      $0 = $164;
      $168 = $0;
      STACKTOP = sp;return ($168|0);
      break;
     }
     case 72: {
      $165 = (__Z12ElementErrorh10TErrorCode(0,3)|0);
      $0 = $165;
      $168 = $0;
      STACKTOP = sp;return ($168|0);
      break;
     }
     case 76: {
      break L24;
      break;
     }
    }
   } else {
    $166 = HEAP32[250352>>2]|0;
    $167 = (($166) + 1)|0;
    HEAP32[250352>>2] = $167;
    __Z9SkipToEndv();
   }
  } while(0);
 } else {
  __Z9SkipToEndv();
 }
 $0 = 0;
 $168 = $0;
 STACKTOP = sp;return ($168|0);
}
function __Z14CancelElementstt($Start,$Finish) {
 $Start = $Start|0;
 $Finish = $Finish|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Idx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $Start;
 $1 = $Finish;
 $2 = $0;
 $3 = $2&65535;
 $Idx = $3;
 while(1) {
  $4 = $Idx;
  $5 = $1;
  $6 = $5&65535;
  $7 = ($4|0)<=($6|0);
  if (!($7)) {
   break;
  }
  $8 = $Idx;
  $9 = (115528 + (($8*12)|0)|0);
  HEAP32[$9>>2] = 48;
  $10 = $Idx;
  $11 = (($10) + 1)|0;
  $Idx = $11;
 }
 STACKTOP = sp;return;
}
function __Z12VoidElementstt($Start,$Finish) {
 $Start = $Start|0;
 $Finish = $Finish|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Idx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $Start;
 $1 = $Finish;
 $2 = $0;
 $3 = $1;
 __Z14CancelElementstt($2,$3);
 $4 = $1;
 $5 = $4&65535;
 $6 = (($5) + 1)|0;
 $7 = HEAP16[115520>>1]|0;
 $8 = $7&65535;
 $9 = ($6|0)<($8|0);
 if (!($9)) {
  STACKTOP = sp;return;
 }
 $10 = $1;
 $11 = $10&65535;
 $12 = (($11) + 1)|0;
 $13 = (115528 + (($12*12)|0)|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = ($14|0)==(47);
 if (!($15)) {
  STACKTOP = sp;return;
 }
 $16 = $0;
 $17 = $16&65535;
 $18 = (($17) - 1)|0;
 $Idx = $18;
 while(1) {
  $19 = $Idx;
  $20 = ($19|0)>(-1);
  if ($20) {
   $21 = $Idx;
   $22 = (115528 + (($21*12)|0)|0);
   $23 = HEAP32[$22>>2]|0;
   $24 = ($23|0)==(48);
   $43 = $24;
  } else {
   $43 = 0;
  }
  if (!($43)) {
   break;
  }
  $25 = $Idx;
  $26 = (($25) + -1)|0;
  $Idx = $26;
 }
 $27 = $Idx;
 $28 = ($27|0)==(-1);
 if ($28) {
  label = 11;
 } else {
  $29 = $Idx;
  $30 = ($29|0)>(-1);
  if ($30) {
   $31 = $Idx;
   $32 = (115528 + (($31*12)|0)|0);
   $33 = HEAP32[$32>>2]|0;
   $34 = ($33|0)==(47);
   if ($34) {
    label = 11;
   }
  }
 }
 if ((label|0) == 11) {
  $35 = $1;
  $36 = $35&65535;
  $37 = (($36) + 1)|0;
  $38 = $37&65535;
  $39 = $1;
  $40 = $39&65535;
  $41 = (($40) + 1)|0;
  $42 = $41&65535;
  __Z14CancelElementstt($38,$42);
 }
 STACKTOP = sp;return;
}
function __Z21CompileStampDirectivev() {
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0;
 var $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0;
 var $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0;
 var $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0;
 var $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0;
 var $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $Element = 0, $ProgCount = 0, $StartOfLine = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 HEAP16[238720>>1] = 0;
 $ProgCount = 0;
 L1: while(1) {
  $1 = (__Z10GetElementP12TElementList($Element)|0);
  $2 = ($1<<24>>24)!=(0);
  if (!($2)) {
   label = 34;
   break;
  }
  $3 = HEAP32[$Element>>2]|0;
  $4 = ($3|0)==(0);
  if ($4) {
   $5 = (($Element) + 4|0);
   $6 = HEAP16[$5>>1]|0;
   $7 = $6&65535;
   $8 = ($7|0)==(0);
   if ($8) {
    $9 = HEAP16[238720>>1]|0;
    $10 = $9&65535;
    $11 = (($10) - 1)|0;
    $12 = $11&65535;
    $StartOfLine = $12;
    $13 = HEAP8[238416>>0]|0;
    $14 = ($13<<24>>24)!=(0);
    if (!($14)) {
     label = 6;
     break;
    }
    $27 = HEAP32[8>>2]|0;
    $28 = (($27) + 9|0);
    $29 = HEAP8[$28>>0]|0;
    $30 = $29&255;
    $31 = ($30|0)!=(0);
    if ($31) {
     label = 11;
     break;
    }
    (__Z10GetElementP12TElementList($Element)|0);
    $33 = HEAP32[$Element>>2]|0;
    $34 = ($33|0)!=(1);
    if ($34) {
     label = 13;
     break;
    }
    $36 = (($Element) + 4|0);
    $37 = HEAP16[$36>>1]|0;
    $38 = $37&255;
    $39 = HEAP32[8>>2]|0;
    $40 = (($39) + 9|0);
    HEAP8[$40>>0] = $38;
    $41 = HEAP32[8>>2]|0;
    $42 = (($41) + 92|0);
    $43 = HEAP32[$42>>2]|0;
    $44 = HEAP32[8>>2]|0;
    $45 = (($44) + 12|0);
    HEAP32[$45>>2] = $43;
    $46 = (($Element) + 4|0);
    $47 = HEAP16[$46>>1]|0;
    $48 = $47&65535;
    $49 = ($48|0)==(3);
    if ($49) {
     label = 18;
    } else {
     $50 = (($Element) + 4|0);
     $51 = HEAP16[$50>>1]|0;
     $52 = $51&65535;
     $53 = ($52|0)==(4);
     if ($53) {
      label = 18;
     } else {
      $54 = (($Element) + 4|0);
      $55 = HEAP16[$54>>1]|0;
      $56 = $55&65535;
      $57 = ($56|0)==(5);
      if ($57) {
       label = 18;
      } else {
       $58 = (($Element) + 4|0);
       $59 = HEAP16[$58>>1]|0;
       $60 = $59&65535;
       $61 = ($60|0)==(6);
       if ($61) {
        label = 18;
       } else {
        (__Z10GetElementP12TElementList($Element)|0);
       }
      }
     }
    }
    if ((label|0) == 18) {
     label = 0;
     while(1) {
      $62 = (__Z10GetElementP12TElementList($Element)|0);
      $63 = ($62<<24>>24)!=(0);
      if ($63) {
       $64 = HEAP32[$Element>>2]|0;
       $65 = ($64|0)==(14);
       $108 = $65;
      } else {
       $108 = 0;
      }
      if (!($108)) {
       break;
      }
      $66 = $ProgCount;
      $67 = $66&255;
      $68 = ($67|0)>(6);
      if ($68) {
       label = 23;
       break L1;
      }
      (__Z10GetElementP12TElementList($Element)|0);
      $70 = HEAP32[$Element>>2]|0;
      $71 = ($70|0)!=(45);
      if ($71) {
       label = 25;
       break L1;
      }
      $73 = (($Element) + 6|0);
      $74 = HEAP16[$73>>1]|0;
      $75 = $74&65535;
      $76 = HEAP32[16>>2]|0;
      $77 = (($76) + ($75)|0);
      $78 = $ProgCount;
      $79 = $78&255;
      $80 = HEAP32[8>>2]|0;
      $81 = (($80) + 16|0);
      $82 = (($81) + ($79<<2)|0);
      HEAP32[$82>>2] = $77;
      $83 = (($Element) + 6|0);
      $84 = HEAP16[$83>>1]|0;
      $85 = $84&65535;
      $86 = (($Element) + 8|0);
      $87 = HEAP8[$86>>0]|0;
      $88 = $87&255;
      $89 = (($85) + ($88))|0;
      $90 = HEAP32[16>>2]|0;
      $91 = (($90) + ($89)|0);
      HEAP8[$91>>0] = 0;
      $92 = HEAP32[8>>2]|0;
      $93 = (($92) + 92|0);
      $94 = HEAP32[$93>>2]|0;
      $95 = $ProgCount;
      $96 = $95&255;
      $97 = HEAP32[8>>2]|0;
      $98 = (($97) + 44|0);
      $99 = (($98) + ($96<<2)|0);
      HEAP32[$99>>2] = $94;
      $100 = $ProgCount;
      $101 = (($100) + 1)<<24>>24;
      $ProgCount = $101;
     }
    }
    $102 = HEAP32[$Element>>2]|0;
    $103 = ($102|0)!=(20);
    if ($103) {
     label = 30;
     break;
    }
    $105 = $StartOfLine;
    $106 = HEAP16[238720>>1]|0;
    __Z14CancelElementstt($105,$106);
   }
  }
 }
 if ((label|0) == 6) {
  $15 = HEAP16[238720>>1]|0;
  $16 = (($15) + -1)<<16>>16;
  HEAP16[238720>>1] = $16;
  while(1) {
   (__Z10GetElementP12TElementList($Element)|0);
   $17 = HEAP16[238720>>1]|0;
   $18 = $17&65535;
   $19 = (($18) - 1)|0;
   $20 = $19&65535;
   $21 = HEAP16[238720>>1]|0;
   $22 = $21&65535;
   $23 = (($22) - 1)|0;
   $24 = $23&65535;
   __Z14CancelElementstt($20,$24);
   $25 = HEAP32[$Element>>2]|0;
   $26 = ($25|0)!=(47);
   if (!($26)) {
    break;
   }
  }
  $0 = 0;
  $107 = $0;
  STACKTOP = sp;return ($107|0);
 }
 else if ((label|0) == 11) {
  $32 = (__Z5Error10TErrorCode(58)|0);
  $0 = $32;
  $107 = $0;
  STACKTOP = sp;return ($107|0);
 }
 else if ((label|0) == 13) {
  $35 = (__Z5Error10TErrorCode(55)|0);
  $0 = $35;
  $107 = $0;
  STACKTOP = sp;return ($107|0);
 }
 else if ((label|0) == 23) {
  $69 = (__Z5Error10TErrorCode(24)|0);
  $0 = $69;
  $107 = $0;
  STACKTOP = sp;return ($107|0);
 }
 else if ((label|0) == 25) {
  $72 = (__Z5Error10TErrorCode(56)|0);
  $0 = $72;
  $107 = $0;
  STACKTOP = sp;return ($107|0);
 }
 else if ((label|0) == 30) {
  $104 = (__Z5Error10TErrorCode(23)|0);
  $0 = $104;
  $107 = $0;
  STACKTOP = sp;return ($107|0);
 }
 else if ((label|0) == 34) {
  $0 = 0;
  $107 = $0;
  STACKTOP = sp;return ($107|0);
 }
 return (0)|0;
}
function __Z20CompilePortDirectivev() {
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0;
 var $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0;
 var $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0;
 var $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0;
 var $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0;
 var $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $Element = 0, $Idx = 0, $StartOfLine = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 4|0;
 HEAP16[238720>>1] = 0;
 L1: while(1) {
  $1 = (__Z10GetElementP12TElementList($Element)|0);
  $2 = ($1<<24>>24)!=(0);
  if (!($2)) {
   label = 28;
   break;
  }
  $3 = HEAP32[$Element>>2]|0;
  $4 = ($3|0)==(0);
  if ($4) {
   $5 = (($Element) + 4|0);
   $6 = HEAP16[$5>>1]|0;
   $7 = $6&65535;
   $8 = ($7|0)==(1);
   if ($8) {
    $9 = HEAP16[238720>>1]|0;
    $10 = $9&65535;
    $11 = (($10) - 1)|0;
    $12 = $11&65535;
    $StartOfLine = $12;
    $13 = HEAP32[8>>2]|0;
    $14 = (($13) + 72|0);
    $15 = HEAP32[$14>>2]|0;
    $16 = ($15|0)!=(0|0);
    if ($16) {
     label = 6;
     break;
    }
    (__Z10GetElementP12TElementList($Element)|0);
    $18 = HEAP32[$Element>>2]|0;
    $19 = ($18|0)!=(46);
    if ($19) {
     label = 9;
     break;
    }
    $20 = (($Element) + 8|0);
    $21 = HEAP8[$20>>0]|0;
    $22 = $21&255;
    $23 = ($22|0)<(4);
    if ($23) {
     label = 9;
     break;
    }
    $25 = (($Element) + 6|0);
    $26 = HEAP16[$25>>1]|0;
    $27 = $26&65535;
    $Idx = $27;
    while(1) {
     $28 = $Idx;
     $29 = (($Element) + 6|0);
     $30 = HEAP16[$29>>1]|0;
     $31 = $30&65535;
     $32 = (($31) + 2)|0;
     $33 = ($28|0)<=($32|0);
     if (!($33)) {
      break;
     }
     $34 = $Idx;
     $35 = HEAP32[16>>2]|0;
     $36 = (($35) + ($34)|0);
     $37 = HEAP8[$36>>0]|0;
     $38 = $37 << 24 >> 24;
     $39 = (_toupper($38)|0);
     $40 = $Idx;
     $41 = (($Element) + 6|0);
     $42 = HEAP16[$41>>1]|0;
     $43 = $42&65535;
     $44 = (($40) - ($43))|0;
     $45 = (250424 + ($44)|0);
     $46 = HEAP8[$45>>0]|0;
     $47 = $46 << 24 >> 24;
     $48 = ($39|0)!=($47|0);
     if ($48) {
      label = 13;
      break L1;
     }
     $50 = $Idx;
     $51 = (($50) + 1)|0;
     $Idx = $51;
    }
    $52 = (($Element) + 6|0);
    $53 = HEAP16[$52>>1]|0;
    $54 = $53&65535;
    $55 = (($54) + 3)|0;
    $Idx = $55;
    while(1) {
     $56 = $Idx;
     $57 = (($Element) + 6|0);
     $58 = HEAP16[$57>>1]|0;
     $59 = $58&65535;
     $60 = (($Element) + 8|0);
     $61 = HEAP8[$60>>0]|0;
     $62 = $61&255;
     $63 = (($59) + ($62))|0;
     $64 = ($56|0)<($63|0);
     if (!($64)) {
      break;
     }
     $65 = $Idx;
     $66 = HEAP32[16>>2]|0;
     $67 = (($66) + ($65)|0);
     $68 = HEAP8[$67>>0]|0;
     $69 = $68 << 24 >> 24;
     $70 = ($69|0)>=(48);
     if (!($70)) {
      label = 20;
      break L1;
     }
     $71 = $Idx;
     $72 = HEAP32[16>>2]|0;
     $73 = (($72) + ($71)|0);
     $74 = HEAP8[$73>>0]|0;
     $75 = $74 << 24 >> 24;
     $76 = ($75|0)<=(57);
     if (!($76)) {
      label = 20;
      break L1;
     }
     $78 = $Idx;
     $79 = (($78) + 1)|0;
     $Idx = $79;
    }
    $80 = (($Element) + 6|0);
    $81 = HEAP16[$80>>1]|0;
    $82 = $81&65535;
    $83 = HEAP32[16>>2]|0;
    $84 = (($83) + ($82)|0);
    $85 = HEAP32[8>>2]|0;
    $86 = (($85) + 72|0);
    HEAP32[$86>>2] = $84;
    $87 = (($Element) + 6|0);
    $88 = HEAP16[$87>>1]|0;
    $89 = $88&65535;
    $90 = (($Element) + 8|0);
    $91 = HEAP8[$90>>0]|0;
    $92 = $91&255;
    $93 = (($89) + ($92))|0;
    $94 = HEAP32[16>>2]|0;
    $95 = (($94) + ($93)|0);
    HEAP8[$95>>0] = 0;
    $96 = HEAP32[8>>2]|0;
    $97 = (($96) + 92|0);
    $98 = HEAP32[$97>>2]|0;
    $99 = HEAP32[8>>2]|0;
    $100 = (($99) + 76|0);
    HEAP32[$100>>2] = $98;
    (__Z10GetElementP12TElementList($Element)|0);
    $101 = HEAP32[$Element>>2]|0;
    $102 = ($101|0)!=(20);
    if ($102) {
     label = 24;
     break;
    }
    $104 = $StartOfLine;
    $105 = HEAP16[238720>>1]|0;
    __Z14CancelElementstt($104,$105);
   }
  }
 }
 if ((label|0) == 6) {
  $17 = (__Z5Error10TErrorCode(58)|0);
  $0 = $17;
  $106 = $0;
  STACKTOP = sp;return ($106|0);
 }
 else if ((label|0) == 9) {
  $24 = (__Z5Error10TErrorCode(59)|0);
  $0 = $24;
  $106 = $0;
  STACKTOP = sp;return ($106|0);
 }
 else if ((label|0) == 13) {
  $49 = (__Z5Error10TErrorCode(59)|0);
  $0 = $49;
  $106 = $0;
  STACKTOP = sp;return ($106|0);
 }
 else if ((label|0) == 20) {
  $77 = (__Z5Error10TErrorCode(59)|0);
  $0 = $77;
  $106 = $0;
  STACKTOP = sp;return ($106|0);
 }
 else if ((label|0) == 24) {
  $103 = (__Z5Error10TErrorCode(23)|0);
  $0 = $103;
  $106 = $0;
  STACKTOP = sp;return ($106|0);
 }
 else if ((label|0) == 28) {
  $0 = 0;
  $106 = $0;
  STACKTOP = sp;return ($106|0);
 }
 return (0)|0;
}
function __Z22CompilePBasicDirectivev() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $Element = 0, $StartOfLine = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 HEAP16[238720>>1] = 0;
 while(1) {
  $1 = (__Z10GetElementP12TElementList($Element)|0);
  $2 = ($1<<24>>24)!=(0);
  if (!($2)) {
   label = 17;
   break;
  }
  $3 = HEAP32[$Element>>2]|0;
  $4 = ($3|0)==(0);
  if ($4) {
   $5 = (($Element) + 4|0);
   $6 = HEAP16[$5>>1]|0;
   $7 = $6&65535;
   $8 = ($7|0)==(2);
   if ($8) {
    $9 = HEAP16[238720>>1]|0;
    $10 = $9&65535;
    $11 = (($10) - 1)|0;
    $12 = $11&65535;
    $StartOfLine = $12;
    $13 = HEAP32[8>>2]|0;
    $14 = (($13) + 84|0);
    $15 = HEAP32[$14>>2]|0;
    $16 = ($15|0)!=(0);
    if ($16) {
     label = 6;
     break;
    }
    (__Z10GetElementP12TElementList($Element)|0);
    $18 = HEAP32[$Element>>2]|0;
    $19 = ($18|0)!=(12);
    if ($19) {
     label = 8;
     break;
    }
    $21 = (($Element) + 4|0);
    $22 = HEAP16[$21>>1]|0;
    $23 = $22&65535;
    $24 = ($23|0)==(200);
    if (!($24)) {
     $25 = (($Element) + 4|0);
     $26 = HEAP16[$25>>1]|0;
     $27 = $26&65535;
     $28 = ($27|0)==(250);
     if (!($28)) {
      label = 11;
      break;
     }
    }
    $30 = (($Element) + 4|0);
    $31 = HEAP16[$30>>1]|0;
    $32 = $31&65535;
    $33 = ($32|0)==(250);
    $34 = $33&1;
    HEAP8[238424>>0] = $34;
    $35 = (($Element) + 4|0);
    $36 = HEAP16[$35>>1]|0;
    $37 = $36&65535;
    $38 = HEAP32[8>>2]|0;
    $39 = (($38) + 80|0);
    HEAP32[$39>>2] = $37;
    $40 = HEAP32[8>>2]|0;
    $41 = (($40) + 92|0);
    $42 = HEAP32[$41>>2]|0;
    $43 = HEAP32[8>>2]|0;
    $44 = (($43) + 84|0);
    HEAP32[$44>>2] = $42;
    $45 = (($Element) + 6|0);
    $46 = HEAP16[$45>>1]|0;
    $47 = $46&65535;
    $48 = (($Element) + 8|0);
    $49 = HEAP8[$48>>0]|0;
    $50 = $49&255;
    $51 = (($47) + ($50))|0;
    $52 = HEAP32[16>>2]|0;
    $53 = (($52) + ($51)|0);
    HEAP8[$53>>0] = 0;
    (__Z10GetElementP12TElementList($Element)|0);
    $54 = HEAP32[$Element>>2]|0;
    $55 = ($54|0)!=(20);
    if ($55) {
     label = 13;
     break;
    }
    $57 = $StartOfLine;
    $58 = HEAP16[238720>>1]|0;
    __Z14CancelElementstt($57,$58);
   }
  }
 }
 if ((label|0) == 6) {
  $17 = (__Z5Error10TErrorCode(58)|0);
  $0 = $17;
  $59 = $0;
  STACKTOP = sp;return ($59|0);
 }
 else if ((label|0) == 8) {
  $20 = (__Z5Error10TErrorCode(12)|0);
  $0 = $20;
  $59 = $0;
  STACKTOP = sp;return ($59|0);
 }
 else if ((label|0) == 11) {
  $29 = (__Z5Error10TErrorCode(91)|0);
  $0 = $29;
  $59 = $0;
  STACKTOP = sp;return ($59|0);
 }
 else if ((label|0) == 13) {
  $56 = (__Z5Error10TErrorCode(23)|0);
  $0 = $56;
  $59 = $0;
  STACKTOP = sp;return ($59|0);
 }
 else if ((label|0) == 17) {
  $0 = 0;
  $59 = $0;
  STACKTOP = sp;return ($59|0);
 }
 return (0)|0;
}
function __Z15CompileCCDefinev() {
 var $$byval_copy = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0;
 var $62 = 0, $7 = 0, $8 = 0, $9 = 0, $Element = 0, $Redefine = 0, $Result = 0, $SoftEnd = 0, $StartOfLine = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy = sp + 72|0;
 $Element = sp + 48|0;
 $SoftEnd = sp + 123|0;
 $1 = sp;
 $2 = HEAP8[238776>>0]|0;
 $3 = $2&255;
 $4 = ($3|0)==(0);
 if ($4) {
  label = 3;
 } else {
  $5 = HEAP8[238776>>0]|0;
  $6 = $5&255;
  $7 = (($6) - 1)|0;
  $8 = (238784 + (($7*48)|0)|0);
  $9 = (($8) + 12|0);
  $10 = HEAP16[$9>>1]|0;
  $11 = $10&65535;
  $12 = ($11|0)==(0);
  if ($12) {
   label = 3;
  } else {
   while(1) {
    $57 = (__Z10GetElementP12TElementList($Element)|0);
    $58 = ($57<<24>>24)!=(0);
    if ($58) {
     $59 = HEAP32[$Element>>2]|0;
     $60 = ($59|0)!=(47);
     $62 = $60;
    } else {
     $62 = 0;
    }
    if (!($62)) {
     break;
    }
   }
  }
 }
 do {
  if ((label|0) == 3) {
   $13 = HEAP16[238720>>1]|0;
   $14 = $13&65535;
   $15 = (($14) - 1)|0;
   $16 = $15&65535;
   $StartOfLine = $16;
   (__Z10GetElementP12TElementList($Element)|0);
   $17 = HEAP32[$Element>>2]|0;
   $18 = ($17|0)==(46);
   if ($18) {
    $19 = HEAP32[((238728 + 44|0))>>2]|0;
    $20 = ($19|0)==(1);
    if ($20) {
     $21 = (__Z5Error10TErrorCode(25)|0);
     $0 = $21;
     $61 = $0;
     STACKTOP = sp;return ($61|0);
    }
   }
   $22 = HEAP32[$Element>>2]|0;
   $23 = ($22|0)!=(46);
   if ($23) {
    $24 = HEAP32[$Element>>2]|0;
    $25 = ($24|0)!=(44);
    if ($25) {
     $26 = (__Z5Error10TErrorCode(100)|0);
     $0 = $26;
     $61 = $0;
     STACKTOP = sp;return ($61|0);
    }
   }
   $27 = (__Z10CopySymbolv()|0);
   $Result = $27;
   $28 = ($27|0)!=(0);
   if ($28) {
    $29 = $Result;
    $0 = $29;
    $61 = $0;
    STACKTOP = sp;return ($61|0);
   }
   $30 = HEAP32[((250448 + 36|0))>>2]|0;
   $31 = ($30|0)==(44);
   $32 = $31&1;
   $Redefine = $32;
   (__Z14PreviewElementP12TElementList($Element)|0);
   $33 = HEAP32[$Element>>2]|0;
   $34 = ($33|0)!=(47);
   do {
    if ($34) {
     $35 = (__Z8GetEqualv()|0);
     $Result = $35;
     $36 = ($35|0)!=(0);
     if ($36) {
      $37 = $Result;
      $0 = $37;
      $61 = $0;
      STACKTOP = sp;return ($61|0);
     }
     $38 = (__Z24GetCCDirectiveExpressioni(0)|0);
     $Result = $38;
     $39 = ($38|0)!=(0);
     if (!($39)) {
      $41 = (__Z28ResolveCCDirectiveExpressionv()|0);
      $42 = $41&65535;
      HEAP16[((250448 + 40|0))>>1] = $42;
      break;
     }
     $40 = $Result;
     $0 = $40;
     $61 = $0;
     STACKTOP = sp;return ($61|0);
    } else {
     HEAP16[((250448 + 40|0))>>1] = -1;
    }
   } while(0);
   HEAP32[((250448 + 36|0))>>2] = 44;
   $43 = $Redefine;
   $44 = ($43<<24>>24)!=(0);
   do {
    if ($44) {
     $48 = HEAP16[((250448 + 40|0))>>1]|0;
     (__Z17ModifySymbolValuePKct(250448,$48)|0);
    } else {
     dest=$1+0|0; src=250448+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
     dest=$$byval_copy+0|0; src=$1+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
     $45 = (__Z11EnterSymbol12TSymbolTable($$byval_copy)|0);
     $Result = $45;
     $46 = ($45|0)!=(0);
     if (!($46)) {
      break;
     }
     $47 = $Result;
     $0 = $47;
     $61 = $0;
     STACKTOP = sp;return ($61|0);
    }
   } while(0);
   $49 = (__Z6GetEndPh($SoftEnd)|0);
   $Result = $49;
   $50 = ($49|0)!=(0);
   if (!($50)) {
    $52 = $StartOfLine;
    $53 = HEAP16[238720>>1]|0;
    $54 = $53&65535;
    $55 = (($54) - 1)|0;
    $56 = $55&65535;
    __Z14CancelElementstt($52,$56);
    break;
   }
   $51 = $Result;
   $0 = $51;
   $61 = $0;
   STACKTOP = sp;return ($61|0);
  }
 } while(0);
 $0 = 0;
 $61 = $0;
 STACKTOP = sp;return ($61|0);
}
function __Z14CompileCCErrorv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $9 = 0, $Element = 0, $ErrorString = 0, $Idx = 0, $StartOfError = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 8|0;
 $1 = (_malloc(1024)|0);
 $ErrorString = $1;
 $2 = HEAP8[238776>>0]|0;
 $3 = $2&255;
 $4 = ($3|0)==(0);
 if (!($4)) {
  $5 = HEAP8[238776>>0]|0;
  $6 = $5&255;
  $7 = (($6) - 1)|0;
  $8 = (238784 + (($7*48)|0)|0);
  $9 = (($8) + 12|0);
  $10 = HEAP16[$9>>1]|0;
  $11 = $10&65535;
  $12 = ($11|0)==(0);
  if (!($12)) {
   while(1) {
    $76 = (__Z10GetElementP12TElementList($Element)|0);
    $77 = ($76<<24>>24)!=(0);
    if ($77) {
     $78 = HEAP32[$Element>>2]|0;
     $79 = ($78|0)!=(47);
     $82 = $79;
    } else {
     $82 = 0;
    }
    if (!($82)) {
     break;
    }
   }
   $80 = $ErrorString;
   _free($80);
   $0 = 0;
   $81 = $0;
   STACKTOP = sp;return ($81|0);
  }
 }
 $13 = HEAP32[8>>2]|0;
 $14 = (($13) + 92|0);
 $15 = HEAP32[$14>>2]|0;
 $16 = $15&65535;
 $StartOfError = $16;
 $17 = $ErrorString;
 $18 = HEAP32[((4696 + 412|0))>>2]|0;
 (_strcpy(($17|0),($18|0))|0);
 $19 = $ErrorString;
 $20 = (_strlen(($19|0))|0);
 $Idx = $20;
 while(1) {
  $21 = (__Z10GetElementP12TElementList($Element)|0);
  $22 = ($21<<24>>24)!=(0);
  if (!($22)) {
   break;
  }
  $23 = HEAP32[$Element>>2]|0;
  $24 = ($23|0)!=(12);
  if ($24) {
   label = 6;
   break;
  }
  $27 = (($Element) + 4|0);
  $28 = HEAP16[$27>>1]|0;
  $29 = $28&255;
  $30 = $ErrorString;
  $31 = $Idx;
  $32 = (($31) + 1)|0;
  $Idx = $32;
  $33 = (($30) + ($31)|0);
  HEAP8[$33>>0] = $29;
  (__Z10GetElementP12TElementList($Element)|0);
  $34 = HEAP32[$Element>>2]|0;
  $35 = ($34|0)!=(14);
  if ($35) {
   $36 = HEAP32[$Element>>2]|0;
   $37 = ($36|0)!=(47);
   if ($37) {
    label = 9;
    break;
   }
  }
  $40 = HEAP32[$Element>>2]|0;
  $41 = ($40|0)==(47);
  if ($41) {
   label = 11;
   break;
  }
 }
 if ((label|0) == 6) {
  $25 = $ErrorString;
  _free($25);
  $26 = (__Z5Error10TErrorCode(102)|0);
  $0 = $26;
  $81 = $0;
  STACKTOP = sp;return ($81|0);
 }
 else if ((label|0) == 9) {
  $38 = $ErrorString;
  _free($38);
  $39 = (__Z5Error10TErrorCode(32)|0);
  $0 = $39;
  $81 = $0;
  STACKTOP = sp;return ($81|0);
 }
 else if ((label|0) == 11) {
 }
 $42 = $ErrorString;
 $43 = $Idx;
 $44 = (($42) + ($43)|0);
 HEAP8[$44>>0] = 0;
 $45 = HEAP32[8>>2]|0;
 $46 = (($45) + 92|0);
 $47 = HEAP32[$46>>2]|0;
 $48 = HEAP32[8>>2]|0;
 $49 = (($48) + 96|0);
 $50 = HEAP32[$49>>2]|0;
 $51 = (($47) + ($50))|0;
 $52 = (($51) - 1)|0;
 $53 = $StartOfError;
 $54 = $53&65535;
 $55 = (($52) - ($54))|0;
 $56 = HEAP32[8>>2]|0;
 $57 = (($56) + 96|0);
 HEAP32[$57>>2] = $55;
 $58 = $StartOfError;
 $59 = $58&65535;
 $60 = HEAP32[8>>2]|0;
 $61 = (($60) + 92|0);
 HEAP32[$61>>2] = $59;
 $62 = $ErrorString;
 $63 = (_strlen(($62|0))|0);
 $64 = (65535 - ($63))|0;
 $65 = HEAP32[16>>2]|0;
 $66 = (($65) + ($64)|0);
 $67 = $ErrorString;
 (_strcpy(($66|0),($67|0))|0);
 $68 = $ErrorString;
 $69 = (_strlen(($68|0))|0);
 $70 = (65535 - ($69))|0;
 $71 = HEAP32[16>>2]|0;
 $72 = (($71) + ($70)|0);
 $73 = HEAP32[8>>2]|0;
 $74 = (($73) + 4|0);
 HEAP32[$74>>2] = $72;
 $75 = $ErrorString;
 _free($75);
 $0 = 103;
 $81 = $0;
 STACKTOP = sp;return ($81|0);
}
function __Z11CompileCCIfv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Element = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 4|0;
 $1 = HEAP8[250432>>0]|0;
 $2 = $1&255;
 $3 = ($2|0)==(16);
 if ($3) {
  $4 = (__Z5Error10TErrorCode(101)|0);
  $0 = $4;
  $49 = $0;
  STACKTOP = sp;return ($49|0);
 }
 $5 = HEAP8[238776>>0]|0;
 $6 = $5&255;
 $7 = (238784 + (($6*48)|0)|0);
 HEAP32[$7>>2] = 5;
 $8 = HEAP16[238720>>1]|0;
 $9 = $8&65535;
 $10 = (($9) - 1)|0;
 $11 = $10&65535;
 $12 = HEAP8[238776>>0]|0;
 $13 = $12&255;
 $14 = (238784 + (($13*48)|0)|0);
 $15 = (($14) + 4|0);
 HEAP16[$15>>1] = $11;
 HEAP8[241856>>0] = 0;
 $16 = (__Z24GetCCDirectiveExpressioni(0)|0);
 $Result = $16;
 $17 = ($16|0)!=(0);
 if ($17) {
  $18 = $Result;
  $0 = $18;
  $49 = $0;
  STACKTOP = sp;return ($49|0);
 }
 (__Z10GetElementP12TElementList($Element)|0);
 $19 = HEAP32[$Element>>2]|0;
 $20 = ($19|0)!=(21);
 if ($20) {
  $21 = (__Z5Error10TErrorCode(94)|0);
  $0 = $21;
  $49 = $0;
  STACKTOP = sp;return ($49|0);
 } else {
  $22 = HEAP8[238776>>0]|0;
  $23 = $22&255;
  $24 = (238784 + (($23*48)|0)|0);
  $25 = (($24) + 4|0);
  $26 = HEAP16[$25>>1]|0;
  $27 = HEAP16[238720>>1]|0;
  $28 = $27&65535;
  $29 = (($28) - 1)|0;
  $30 = $29&65535;
  __Z12VoidElementstt($26,$30);
  $31 = (__Z28ResolveCCDirectiveExpressionv()|0);
  $32 = ($31|0)!=(0);
  $33 = $32 ^ 1;
  $34 = $33 ? 1 : 0;
  $35 = $34&65535;
  $36 = HEAP8[238776>>0]|0;
  $37 = $36&255;
  $38 = (238784 + (($37*48)|0)|0);
  $39 = (($38) + 12|0);
  HEAP16[$39>>1] = $35;
  $40 = HEAP16[238720>>1]|0;
  $41 = HEAP8[238776>>0]|0;
  $42 = $41&255;
  $43 = (238784 + (($42*48)|0)|0);
  $44 = (($43) + 14|0);
  HEAP16[$44>>1] = $40;
  $45 = HEAP8[238776>>0]|0;
  $46 = (($45) + 1)<<24>>24;
  HEAP8[238776>>0] = $46;
  $47 = HEAP8[250432>>0]|0;
  $48 = (($47) + 1)<<24>>24;
  HEAP8[250432>>0] = $48;
  $0 = 0;
  $49 = $0;
  STACKTOP = sp;return ($49|0);
 }
 return (0)|0;
}
function __Z13CompileCCElsev() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = HEAP8[250432>>0]|0;
 $2 = $1&255;
 $3 = ($2|0)==(0);
 if ($3) {
  $4 = (__Z5Error10TErrorCode(97)|0);
  $0 = $4;
  $78 = $0;
  STACKTOP = sp;return ($78|0);
 }
 $5 = HEAP8[238776>>0]|0;
 $6 = $5&255;
 $7 = (($6) - 1)|0;
 $8 = (238784 + (($7*48)|0)|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($9|0)>(5);
 if ($10) {
  $11 = (__Z14CCNestingErrorv()|0);
  $0 = $11;
  $78 = $0;
  STACKTOP = sp;return ($78|0);
 }
 $12 = HEAP8[238776>>0]|0;
 $13 = $12&255;
 $14 = (($13) - 1)|0;
 $15 = (238784 + (($14*48)|0)|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = ($16|0)!=(5);
 if ($17) {
  $18 = (__Z5Error10TErrorCode(104)|0);
  $0 = $18;
  $78 = $0;
  STACKTOP = sp;return ($78|0);
 }
 $19 = HEAP8[238776>>0]|0;
 $20 = $19&255;
 $21 = (($20) - 1)|0;
 $22 = (238784 + (($21*48)|0)|0);
 $23 = HEAP32[$22>>2]|0;
 $24 = $23&255;
 $25 = $24&255;
 $26 = (($25) - 1)|0;
 $27 = HEAP8[238776>>0]|0;
 $28 = $27&255;
 $29 = (($28) - 1)|0;
 $30 = (238784 + (($29*48)|0)|0);
 HEAP32[$30>>2] = $26;
 $31 = HEAP8[238776>>0]|0;
 $32 = $31&255;
 $33 = (($32) - 1)|0;
 $34 = (238784 + (($33*48)|0)|0);
 $35 = (($34) + 12|0);
 $36 = HEAP16[$35>>1]|0;
 $37 = $36&65535;
 $38 = ($37|0)==(0);
 if ($38) {
  $39 = HEAP16[238720>>1]|0;
  $40 = $39&65535;
  $41 = (($40) - 1)|0;
  $42 = $41&65535;
  $43 = HEAP8[238776>>0]|0;
  $44 = $43&255;
  $45 = (($44) - 1)|0;
  $46 = (238784 + (($45*48)|0)|0);
  $47 = (($46) + 14|0);
  HEAP16[$47>>1] = $42;
 }
 $48 = HEAP8[238776>>0]|0;
 $49 = $48&255;
 $50 = (($49) - 1)|0;
 $51 = (238784 + (($50*48)|0)|0);
 $52 = (($51) + 14|0);
 $53 = HEAP16[$52>>1]|0;
 $54 = HEAP16[238720>>1]|0;
 $55 = $54&65535;
 $56 = (($55) - 1)|0;
 $57 = $56&65535;
 __Z12VoidElementstt($53,$57);
 $58 = HEAP8[238776>>0]|0;
 $59 = $58&255;
 $60 = (($59) - 1)|0;
 $61 = (238784 + (($60*48)|0)|0);
 $62 = (($61) + 12|0);
 $63 = HEAP16[$62>>1]|0;
 $64 = $63&65535;
 $65 = $64 ^ 1;
 $66 = $65&65535;
 $67 = HEAP8[238776>>0]|0;
 $68 = $67&255;
 $69 = (($68) - 1)|0;
 $70 = (238784 + (($69*48)|0)|0);
 $71 = (($70) + 12|0);
 HEAP16[$71>>1] = $66;
 $72 = HEAP16[238720>>1]|0;
 $73 = HEAP8[238776>>0]|0;
 $74 = $73&255;
 $75 = (($74) - 1)|0;
 $76 = (238784 + (($75*48)|0)|0);
 $77 = (($76) + 14|0);
 HEAP16[$77>>1] = $72;
 $0 = 0;
 $78 = $0;
 STACKTOP = sp;return ($78|0);
}
function __Z14CompileCCEndIfv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $5 = 0;
 var $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = HEAP8[250432>>0]|0;
 $2 = $1&255;
 $3 = ($2|0)==(0);
 if ($3) {
  $4 = (__Z5Error10TErrorCode(98)|0);
  $0 = $4;
  $43 = $0;
  STACKTOP = sp;return ($43|0);
 }
 $5 = HEAP8[238776>>0]|0;
 $6 = $5&255;
 $7 = (($6) - 1)|0;
 $8 = (238784 + (($7*48)|0)|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($9|0)>(5);
 if ($10) {
  $11 = (__Z14CCNestingErrorv()|0);
  $0 = $11;
  $43 = $0;
  STACKTOP = sp;return ($43|0);
 }
 $12 = HEAP8[238776>>0]|0;
 $13 = $12&255;
 $14 = (($13) - 1)|0;
 $15 = (238784 + (($14*48)|0)|0);
 $16 = (($15) + 12|0);
 $17 = HEAP16[$16>>1]|0;
 $18 = $17&65535;
 $19 = ($18|0)==(0);
 if ($19) {
  $20 = HEAP16[238720>>1]|0;
  $21 = $20&65535;
  $22 = (($21) - 1)|0;
  $23 = $22&65535;
  $24 = HEAP8[238776>>0]|0;
  $25 = $24&255;
  $26 = (($25) - 1)|0;
  $27 = (238784 + (($26*48)|0)|0);
  $28 = (($27) + 14|0);
  HEAP16[$28>>1] = $23;
 }
 $29 = HEAP8[238776>>0]|0;
 $30 = $29&255;
 $31 = (($30) - 1)|0;
 $32 = (238784 + (($31*48)|0)|0);
 $33 = (($32) + 14|0);
 $34 = HEAP16[$33>>1]|0;
 $35 = HEAP16[238720>>1]|0;
 $36 = $35&65535;
 $37 = (($36) - 1)|0;
 $38 = $37&65535;
 __Z12VoidElementstt($34,$38);
 $39 = HEAP8[238776>>0]|0;
 $40 = (($39) + -1)<<24>>24;
 HEAP8[238776>>0] = $40;
 $41 = HEAP8[250432>>0]|0;
 $42 = (($41) + -1)<<24>>24;
 HEAP8[250432>>0] = $42;
 $0 = 0;
 $43 = $0;
 STACKTOP = sp;return ($43|0);
}
function __Z15CompileCCSelectv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Element = 0, $Resolved = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 4|0;
 $Resolved = sp + 20|0;
 $1 = HEAP8[250440>>0]|0;
 $2 = $1&255;
 $3 = ($2|0)==(16);
 if ($3) {
  $4 = (__Z5Error10TErrorCode(105)|0);
  $0 = $4;
  $48 = $0;
  STACKTOP = sp;return ($48|0);
 }
 $5 = HEAP8[238776>>0]|0;
 $6 = $5&255;
 $7 = (238784 + (($6*48)|0)|0);
 HEAP32[$7>>2] = 8;
 $8 = HEAP16[238720>>1]|0;
 $9 = $8&65535;
 $10 = (($9) - 1)|0;
 $11 = $10&65535;
 $12 = HEAP8[238776>>0]|0;
 $13 = $12&255;
 $14 = (238784 + (($13*48)|0)|0);
 $15 = (($14) + 4|0);
 HEAP16[$15>>1] = $11;
 $16 = HEAP16[238720>>1]|0;
 $17 = HEAP8[238776>>0]|0;
 $18 = $17&255;
 $19 = (238784 + (($18*48)|0)|0);
 $20 = (($19) + 6|0);
 HEAP16[$20>>1] = $16;
 $21 = HEAP8[238776>>0]|0;
 $22 = $21&255;
 $23 = (238784 + (($22*48)|0)|0);
 $24 = (($23) + 12|0);
 HEAP16[$24>>1] = 1;
 $25 = HEAP8[238776>>0]|0;
 $26 = $25&255;
 $27 = (238784 + (($26*48)|0)|0);
 $28 = (($27) + 16|0);
 HEAP16[$28>>1] = 0;
 $29 = HEAP8[238776>>0]|0;
 $30 = (($29) + 1)<<24>>24;
 HEAP8[238776>>0] = $30;
 $31 = HEAP8[250440>>0]|0;
 $32 = (($31) + 1)<<24>>24;
 HEAP8[250440>>0] = $32;
 HEAP8[241856>>0] = 0;
 $33 = (__Z15ResolveConstanthhPh(1,1,$Resolved)|0);
 $Result = $33;
 $34 = ($33|0)!=(0);
 if ($34) {
  $35 = $Result;
  $0 = $35;
  $48 = $0;
  STACKTOP = sp;return ($48|0);
 }
 (__Z10GetElementP12TElementList($Element)|0);
 $36 = HEAP32[$Element>>2]|0;
 $37 = ($36|0)!=(47);
 if ($37) {
  $38 = (__Z5Error10TErrorCode(31)|0);
  $0 = $38;
  $48 = $0;
  STACKTOP = sp;return ($48|0);
 }
 (__Z10GetElementP12TElementList($Element)|0);
 $39 = HEAP32[$Element>>2]|0;
 $40 = ($39|0)==(2);
 if ($40) {
  $41 = (($Element) + 4|0);
  $42 = HEAP16[$41>>1]|0;
  $43 = $42&65535;
  $44 = ($43|0)==(3);
  if ($44) {
   $46 = HEAP16[238720>>1]|0;
   $47 = (($46) + -1)<<16>>16;
   HEAP16[238720>>1] = $47;
   $0 = 0;
   $48 = $0;
   STACKTOP = sp;return ($48|0);
  }
 }
 $45 = (__Z5Error10TErrorCode(106)|0);
 $0 = $45;
 $48 = $0;
 STACKTOP = sp;return ($48|0);
}
function __Z13CompileCCCasev() {
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0;
 var $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0;
 var $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0;
 var $96 = 0, $97 = 0, $98 = 0, $99 = 0, $CaseElse = 0, $Element = 0, $ProcessOr = 0, $Result = 0, $TempIdx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 8|0;
 $1 = HEAP8[250440>>0]|0;
 $2 = $1&255;
 $3 = ($2|0)==(0);
 if ($3) {
  $4 = (__Z5Error10TErrorCode(107)|0);
  $0 = $4;
  $162 = $0;
  STACKTOP = sp;return ($162|0);
 }
 $5 = HEAP8[238776>>0]|0;
 $6 = $5&255;
 $7 = (($6) - 1)|0;
 $8 = (238784 + (($7*48)|0)|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($9|0)!=(8);
 if ($10) {
  $11 = (__Z14CCNestingErrorv()|0);
  $0 = $11;
  $162 = $0;
  STACKTOP = sp;return ($162|0);
 }
 $12 = HEAP8[238776>>0]|0;
 $13 = $12&255;
 $14 = (($13) - 1)|0;
 $15 = (238784 + (($14*48)|0)|0);
 $16 = (($15) + 12|0);
 $17 = HEAP16[$16>>1]|0;
 $18 = $17&65535;
 $19 = ($18|0)==(0);
 if ($19) {
  $20 = HEAP16[238720>>1]|0;
  $21 = $20&65535;
  $22 = (($21) - 1)|0;
  $23 = $22&65535;
  $24 = HEAP8[238776>>0]|0;
  $25 = $24&255;
  $26 = (($25) - 1)|0;
  $27 = (238784 + (($26*48)|0)|0);
  $28 = (($27) + 16|0);
  HEAP16[$28>>1] = $23;
  $29 = HEAP8[238776>>0]|0;
  $30 = $29&255;
  $31 = (($30) - 1)|0;
  $32 = (238784 + (($31*48)|0)|0);
  $33 = (($32) + 12|0);
  HEAP16[$33>>1] = 2;
 }
 $ProcessOr = 0;
 $TempIdx = 0;
 (__Z10GetElementP12TElementList($Element)|0);
 $34 = HEAP32[$Element>>2]|0;
 $35 = ($34|0)==(3);
 if ($35) {
  $36 = (($Element) + 4|0);
  $37 = HEAP16[$36>>1]|0;
  $38 = $37&65535;
  $39 = ($38|0)==(10);
  if ($39) {
   $40 = (__Z5Error10TErrorCode(111)|0);
   $0 = $40;
   $162 = $0;
   STACKTOP = sp;return ($162|0);
  }
 }
 $41 = HEAP32[$Element>>2]|0;
 $42 = ($41|0)==(2);
 if ($42) {
  $43 = (($Element) + 4|0);
  $44 = HEAP16[$43>>1]|0;
  $45 = $44&65535;
  $46 = ($45|0)==(10);
  $48 = $46;
 } else {
  $48 = 0;
 }
 $47 = $48&1;
 $CaseElse = $47;
 $49 = $CaseElse;
 $50 = ($49<<24>>24)!=(0);
 do {
  if (!($50)) {
   $51 = HEAP16[238720>>1]|0;
   $52 = (($51) + -1)<<16>>16;
   HEAP16[238720>>1] = $52;
   while(1) {
    $53 = HEAP16[238720>>1]|0;
    $54 = $53&65535;
    $TempIdx = $54;
    while(1) {
     $55 = (__Z10GetElementP12TElementList($Element)|0);
     $56 = ($55<<24>>24)!=(0);
     if ($56) {
      $57 = HEAP32[$Element>>2]|0;
      $58 = ($57|0)==(14);
      if ($58) {
       $64 = 1;
      } else {
       $59 = HEAP32[$Element>>2]|0;
       $60 = ($59|0)==(24);
       if ($60) {
        $64 = 1;
       } else {
        $61 = HEAP32[$Element>>2]|0;
        $62 = ($61|0)==(47);
        $64 = $62;
       }
      }
      $63 = $64 ^ 1;
      $163 = $63;
     } else {
      $163 = 0;
     }
     if (!($163)) {
      break;
     }
    }
    $65 = $TempIdx;
    $66 = $65&65535;
    HEAP16[238720>>1] = $66;
    $67 = HEAP8[238776>>0]|0;
    $68 = $67&255;
    $69 = (($68) - 1)|0;
    $70 = (238784 + (($69*48)|0)|0);
    $71 = (($70) + 6|0);
    $72 = HEAP16[$71>>1]|0;
    HEAP16[238720>>1] = $72;
    $73 = HEAP32[$Element>>2]|0;
    $74 = ($73|0)==(24);
    if ($74) {
     $75 = HEAP8[238776>>0]|0;
     $76 = $75&255;
     $77 = (($76) - 1)|0;
     $78 = (238784 + (($77*48)|0)|0);
     $79 = (($78) + 8|0);
     HEAP32[$79>>2] = 26;
     $80 = $TempIdx;
     $81 = (__Z24GetCCDirectiveExpressioni($80)|0);
     $Result = $81;
     $82 = ($81|0)!=(0);
     if ($82) {
      label = 24;
      break;
     }
     __Z14CopyExpressionhh(0,1);
     $84 = (__Z5GetTOv()|0);
     $Result = $84;
     $85 = ($84|0)!=(0);
     if ($85) {
      label = 26;
      break;
     }
     $87 = HEAP16[238720>>1]|0;
     $88 = $87&65535;
     $TempIdx = $88;
     $89 = HEAP8[238776>>0]|0;
     $90 = $89&255;
     $91 = (($90) - 1)|0;
     $92 = (238784 + (($91*48)|0)|0);
     $93 = (($92) + 6|0);
     $94 = HEAP16[$93>>1]|0;
     HEAP16[238720>>1] = $94;
     $95 = HEAP8[238776>>0]|0;
     $96 = $95&255;
     $97 = (($96) - 1)|0;
     $98 = (238784 + (($97*48)|0)|0);
     $99 = (($98) + 8|0);
     HEAP32[$99>>2] = 27;
     $100 = $TempIdx;
     $101 = (__Z24GetCCDirectiveExpressioni($100)|0);
     $Result = $101;
     $102 = ($101|0)!=(0);
     if ($102) {
      label = 28;
      break;
     }
     __Z14CopyExpressionhh(0,2);
     __Z14CopyExpressionhh(1,0);
     $104 = (__Z16AppendExpressionh13TOperatorCode(2,10)|0);
     $Result = $104;
     $105 = ($104|0)!=(0);
     if ($105) {
      label = 30;
      break;
     }
    } else {
     $107 = HEAP8[238776>>0]|0;
     $108 = $107&255;
     $109 = (($108) - 1)|0;
     $110 = (238784 + (($109*48)|0)|0);
     $111 = (($110) + 8|0);
     HEAP32[$111>>2] = 28;
     $112 = $TempIdx;
     $113 = (__Z24GetCCDirectiveExpressioni($112)|0);
     $Result = $113;
     $114 = ($113|0)!=(0);
     if ($114) {
      label = 33;
      break;
     }
    }
    $116 = $ProcessOr;
    $117 = ($116<<24>>24)!=(0);
    if ($117) {
     __Z14CopyExpressionhh(0,1);
     __Z14CopyExpressionhh(3,0);
     $118 = (__Z16AppendExpressionh13TOperatorCode(1,11)|0);
     $Result = $118;
     $119 = ($118|0)!=(0);
     if ($119) {
      label = 37;
      break;
     }
    }
    (__Z10GetElementP12TElementList($Element)|0);
    $121 = HEAP32[$Element>>2]|0;
    $122 = ($121|0)==(14);
    if ($122) {
     __Z14CopyExpressionhh(0,3);
     $ProcessOr = 1;
    }
    $123 = HEAP32[$Element>>2]|0;
    $124 = ($123|0)==(14);
    if (!($124)) {
     label = 43;
     break;
    }
   }
   if ((label|0) == 24) {
    $83 = $Result;
    $0 = $83;
    $162 = $0;
    STACKTOP = sp;return ($162|0);
   }
   else if ((label|0) == 26) {
    $86 = $Result;
    $0 = $86;
    $162 = $0;
    STACKTOP = sp;return ($162|0);
   }
   else if ((label|0) == 28) {
    $103 = $Result;
    $0 = $103;
    $162 = $0;
    STACKTOP = sp;return ($162|0);
   }
   else if ((label|0) == 30) {
    $106 = $Result;
    $0 = $106;
    $162 = $0;
    STACKTOP = sp;return ($162|0);
   }
   else if ((label|0) == 33) {
    $115 = $Result;
    $0 = $115;
    $162 = $0;
    STACKTOP = sp;return ($162|0);
   }
   else if ((label|0) == 37) {
    $120 = $Result;
    $0 = $120;
    $162 = $0;
    STACKTOP = sp;return ($162|0);
   }
   else if ((label|0) == 43) {
    $125 = HEAP32[$Element>>2]|0;
    $126 = ($125|0)!=(47);
    if (!($126)) {
     $128 = HEAP16[238720>>1]|0;
     $129 = (($128) + -1)<<16>>16;
     HEAP16[238720>>1] = $129;
     break;
    }
    $127 = (__Z5Error10TErrorCode(32)|0);
    $0 = $127;
    $162 = $0;
    STACKTOP = sp;return ($162|0);
   }
  }
 } while(0);
 $130 = HEAP8[238776>>0]|0;
 $131 = $130&255;
 $132 = (($131) - 1)|0;
 $133 = (238784 + (($132*48)|0)|0);
 $134 = (($133) + 12|0);
 $135 = HEAP16[$134>>1]|0;
 $136 = $135&65535;
 $137 = ($136|0)==(1);
 do {
  if ($137) {
   $138 = (__Z28ResolveCCDirectiveExpressionv()|0);
   $139 = ($138|0)!=(0);
   if (!($139)) {
    $140 = $CaseElse;
    $141 = ($140<<24>>24)!=(0);
    if (!($141)) {
     break;
    }
   }
   $142 = (__Z10GetElementP12TElementList($Element)|0);
   $143 = ($142<<24>>24)!=(0);
   if ($143) {
    $144 = HEAP32[$Element>>2]|0;
    $145 = ($144|0)!=(47);
    if ($145) {
     $146 = HEAP16[238720>>1]|0;
     $147 = (($146) + -1)<<16>>16;
     HEAP16[238720>>1] = $147;
    }
   }
   $148 = HEAP16[238720>>1]|0;
   $149 = $148&65535;
   $150 = (($149) - 1)|0;
   $151 = $150&65535;
   $152 = HEAP8[238776>>0]|0;
   $153 = $152&255;
   $154 = (($153) - 1)|0;
   $155 = (238784 + (($154*48)|0)|0);
   $156 = (($155) + 14|0);
   HEAP16[$156>>1] = $151;
   $157 = HEAP8[238776>>0]|0;
   $158 = $157&255;
   $159 = (($158) - 1)|0;
   $160 = (238784 + (($159*48)|0)|0);
   $161 = (($160) + 12|0);
   HEAP16[$161>>1] = 0;
  }
 } while(0);
 $0 = 0;
 $162 = $0;
 STACKTOP = sp;return ($162|0);
}
function __Z18CompileCCEndSelectv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = HEAP8[250440>>0]|0;
 $2 = $1&255;
 $3 = ($2|0)==(0);
 if ($3) {
  $4 = (__Z5Error10TErrorCode(108)|0);
  $0 = $4;
  $73 = $0;
  STACKTOP = sp;return ($73|0);
 }
 $5 = HEAP8[238776>>0]|0;
 $6 = $5&255;
 $7 = (($6) - 1)|0;
 $8 = (238784 + (($7*48)|0)|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($9|0)!=(8);
 if ($10) {
  $11 = (__Z14CCNestingErrorv()|0);
  $0 = $11;
  $73 = $0;
  STACKTOP = sp;return ($73|0);
 }
 $12 = HEAP8[238776>>0]|0;
 $13 = $12&255;
 $14 = (($13) - 1)|0;
 $15 = (238784 + (($14*48)|0)|0);
 $16 = (($15) + 12|0);
 $17 = HEAP16[$16>>1]|0;
 $18 = $17&65535;
 $19 = ($18|0)==(0);
 if ($19) {
  $20 = HEAP16[238720>>1]|0;
  $21 = $20&65535;
  $22 = (($21) - 1)|0;
  $23 = $22&65535;
  $24 = HEAP8[238776>>0]|0;
  $25 = $24&255;
  $26 = (($25) - 1)|0;
  $27 = (238784 + (($26*48)|0)|0);
  $28 = (($27) + 16|0);
  HEAP16[$28>>1] = $23;
 }
 $29 = HEAP8[238776>>0]|0;
 $30 = $29&255;
 $31 = (($30) - 1)|0;
 $32 = (238784 + (($31*48)|0)|0);
 $33 = (($32) + 16|0);
 $34 = HEAP16[$33>>1]|0;
 $35 = $34&65535;
 $36 = ($35|0)>(0);
 if ($36) {
  $37 = HEAP8[238776>>0]|0;
  $38 = $37&255;
  $39 = (($38) - 1)|0;
  $40 = (238784 + (($39*48)|0)|0);
  $41 = (($40) + 4|0);
  $42 = HEAP16[$41>>1]|0;
  $43 = HEAP8[238776>>0]|0;
  $44 = $43&255;
  $45 = (($44) - 1)|0;
  $46 = (238784 + (($45*48)|0)|0);
  $47 = (($46) + 14|0);
  $48 = HEAP16[$47>>1]|0;
  __Z12VoidElementstt($42,$48);
  $49 = HEAP8[238776>>0]|0;
  $50 = $49&255;
  $51 = (($50) - 1)|0;
  $52 = (238784 + (($51*48)|0)|0);
  $53 = (($52) + 16|0);
  $54 = HEAP16[$53>>1]|0;
  $55 = HEAP16[238720>>1]|0;
  $56 = $55&65535;
  $57 = (($56) - 1)|0;
  $58 = $57&65535;
  __Z12VoidElementstt($54,$58);
 } else {
  $59 = HEAP8[238776>>0]|0;
  $60 = $59&255;
  $61 = (($60) - 1)|0;
  $62 = (238784 + (($61*48)|0)|0);
  $63 = (($62) + 4|0);
  $64 = HEAP16[$63>>1]|0;
  $65 = HEAP16[238720>>1]|0;
  $66 = $65&65535;
  $67 = (($66) - 1)|0;
  $68 = $67&65535;
  __Z12VoidElementstt($64,$68);
 }
 $69 = HEAP8[238776>>0]|0;
 $70 = (($69) + -1)<<24>>24;
 HEAP8[238776>>0] = $70;
 $71 = HEAP8[250440>>0]|0;
 $72 = (($71) + -1)<<24>>24;
 HEAP8[250440>>0] = $72;
 $0 = 0;
 $73 = $0;
 STACKTOP = sp;return ($73|0);
}
function __Z24GetCCDirectiveExpressioni($SplitExpression) {
 $SplitExpression = $SplitExpression|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $SplitExpression;
 HEAP8[238440>>0] = 0;
 HEAP8[238448>>0] = 0;
 HEAP16[238456>>1] = 0;
 HEAP8[241856>>0] = 0;
 $2 = $1;
 $3 = (__Z13GetExpressionhhih(1,0,$2,1)|0);
 $Result = $3;
 $4 = ($3|0)!=(0);
 if ($4) {
  $5 = $Result;
  $0 = $5;
  $6 = $0;
  STACKTOP = sp;return ($6|0);
 } else {
  $0 = 0;
  $6 = $0;
  STACKTOP = sp;return ($6|0);
 }
 return (0)|0;
}
function __Z28ResolveCCDirectiveExpressionv() {
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0;
 var $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0;
 var $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0;
 var $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0;
 var $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0;
 var $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0;
 var $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $BitIdx = 0, $Idx = 0, $Stack = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $BitIdx = sp + 32|0;
 $Stack = sp;
 $Idx = 0;
 HEAP16[$BitIdx>>1] = 0;
 while(1) {
  $0 = HEAP16[$BitIdx>>1]|0;
  $1 = $0&65535;
  $2 = HEAP16[238456>>1]|0;
  $3 = $2&65535;
  $4 = ($1|0)<($3|0);
  if (!($4)) {
   break;
  }
  $5 = (__Z10GetExpBitshPt(6,$BitIdx)|0);
  $6 = $Idx;
  $7 = $6&255;
  $8 = (($Stack) + ($7<<2)|0);
  HEAP32[$8>>2] = $5;
  $9 = $Idx;
  $10 = $9&255;
  $11 = (($Stack) + ($10<<2)|0);
  $12 = HEAP32[$11>>2]|0;
  $13 = $12 & 32;
  $14 = ($13|0)==(32);
  if ($14) {
   $15 = (__Z10GetExpBitshPt(1,$BitIdx)|0);
   $16 = ($15|0)==(0);
   if ($16) {
    $17 = $Idx;
    $18 = $17&255;
    $19 = (($Stack) + ($18<<2)|0);
    $20 = HEAP32[$19>>2]|0;
    $21 = $20 & 15;
    $22 = (__Z12RaiseToPowerii(2,$21)|0);
    $23 = $Idx;
    $24 = $23&255;
    $25 = (($Stack) + ($24<<2)|0);
    HEAP32[$25>>2] = $22;
   } else {
    $26 = $Idx;
    $27 = $26&255;
    $28 = (($Stack) + ($27<<2)|0);
    $29 = HEAP32[$28>>2]|0;
    $30 = $29 & 15;
    $31 = ($30|0)>(0);
    if ($31) {
     $32 = $Idx;
     $33 = $32&255;
     $34 = (($Stack) + ($33<<2)|0);
     $35 = HEAP32[$34>>2]|0;
     $36 = $35 & 15;
     $37 = 1 << $36;
     $38 = $Idx;
     $39 = $38&255;
     $40 = (($Stack) + ($39<<2)|0);
     $41 = HEAP32[$40>>2]|0;
     $42 = $41 & 15;
     $43 = $42&255;
     $44 = (__Z10GetExpBitshPt($43,$BitIdx)|0);
     $45 = (($37) + ($44))|0;
     $46 = $Idx;
     $47 = $46&255;
     $48 = (($Stack) + ($47<<2)|0);
     HEAP32[$48>>2] = $45;
    } else {
     $49 = $Idx;
     $50 = $49&255;
     $51 = (($Stack) + ($50<<2)|0);
     HEAP32[$51>>2] = 0;
    }
   }
  } else {
   $52 = $Idx;
   $53 = $52&255;
   $54 = (($Stack) + ($53<<2)|0);
   $55 = HEAP32[$54>>2]|0;
   do {
    switch ($55|0) {
    case 16:  {
     $72 = $Idx;
     $73 = $72&255;
     $74 = (($73) - 2)|0;
     $75 = (($Stack) + ($74<<2)|0);
     $76 = HEAP32[$75>>2]|0;
     $77 = $Idx;
     $78 = $77&255;
     $79 = (($78) - 1)|0;
     $80 = (($Stack) + ($79<<2)|0);
     $81 = HEAP32[$80>>2]|0;
     $82 = (($76) - ($81))|0;
     $83 = $82 & 65535;
     $84 = $Idx;
     $85 = $84&255;
     $86 = (($85) - 2)|0;
     $87 = (($Stack) + ($86<<2)|0);
     HEAP32[$87>>2] = $83;
     break;
    }
    case 3:  {
     $296 = $Idx;
     $297 = $296&255;
     $298 = (($297) - 1)|0;
     $299 = (($Stack) + ($298<<2)|0);
     $300 = HEAP32[$299>>2]|0;
     $301 = (0 - ($300))|0;
     $302 = $301 & 65535;
     $303 = $Idx;
     $304 = $303&255;
     $305 = (($304) - 1)|0;
     $306 = (($Stack) + ($305<<2)|0);
     HEAP32[$306>>2] = $302;
     $307 = $Idx;
     $308 = (($307) + 1)<<24>>24;
     $Idx = $308;
     break;
    }
    case 12:  {
     $184 = $Idx;
     $185 = $184&255;
     $186 = (($185) - 2)|0;
     $187 = (($Stack) + ($186<<2)|0);
     $188 = HEAP32[$187>>2]|0;
     $189 = $Idx;
     $190 = $189&255;
     $191 = (($190) - 1)|0;
     $192 = (($Stack) + ($191<<2)|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = $188 ^ $193;
     $195 = $194 & 65535;
     $196 = $Idx;
     $197 = $196&255;
     $198 = (($197) - 2)|0;
     $199 = (($Stack) + ($198<<2)|0);
     HEAP32[$199>>2] = $195;
     break;
    }
    case 26:  {
     $200 = $Idx;
     $201 = $200&255;
     $202 = (($201) - 2)|0;
     $203 = (($Stack) + ($202<<2)|0);
     $204 = HEAP32[$203>>2]|0;
     $205 = $Idx;
     $206 = $205&255;
     $207 = (($206) - 1)|0;
     $208 = (($Stack) + ($207<<2)|0);
     $209 = HEAP32[$208>>2]|0;
     $210 = ($204|0)>=($209|0);
     $211 = $210 ? 65535 : 0;
     $212 = $Idx;
     $213 = $212&255;
     $214 = (($213) - 2)|0;
     $215 = (($Stack) + ($214<<2)|0);
     HEAP32[$215>>2] = $211;
     break;
    }
    case 27:  {
     $216 = $Idx;
     $217 = $216&255;
     $218 = (($217) - 2)|0;
     $219 = (($Stack) + ($218<<2)|0);
     $220 = HEAP32[$219>>2]|0;
     $221 = $Idx;
     $222 = $221&255;
     $223 = (($222) - 1)|0;
     $224 = (($Stack) + ($223<<2)|0);
     $225 = HEAP32[$224>>2]|0;
     $226 = ($220|0)<=($225|0);
     $227 = $226 ? 65535 : 0;
     $228 = $Idx;
     $229 = $228&255;
     $230 = (($229) - 2)|0;
     $231 = (($Stack) + ($230<<2)|0);
     HEAP32[$231>>2] = $227;
     break;
    }
    case 24:  {
     $136 = $Idx;
     $137 = $136&255;
     $138 = (($137) - 2)|0;
     $139 = (($Stack) + ($138<<2)|0);
     $140 = HEAP32[$139>>2]|0;
     $141 = $Idx;
     $142 = $141&255;
     $143 = (($142) - 1)|0;
     $144 = (($Stack) + ($143<<2)|0);
     $145 = HEAP32[$144>>2]|0;
     $146 = $140 >> $145;
     $147 = $146 & 65535;
     $148 = $Idx;
     $149 = $148&255;
     $150 = (($149) - 2)|0;
     $151 = (($Stack) + ($150<<2)|0);
     HEAP32[$151>>2] = $147;
     break;
    }
    case 11:  {
     $168 = $Idx;
     $169 = $168&255;
     $170 = (($169) - 2)|0;
     $171 = (($Stack) + ($170<<2)|0);
     $172 = HEAP32[$171>>2]|0;
     $173 = $Idx;
     $174 = $173&255;
     $175 = (($174) - 1)|0;
     $176 = (($Stack) + ($175<<2)|0);
     $177 = HEAP32[$176>>2]|0;
     $178 = $172 | $177;
     $179 = $178 & 65535;
     $180 = $Idx;
     $181 = $180&255;
     $182 = (($181) - 2)|0;
     $183 = (($Stack) + ($182<<2)|0);
     HEAP32[$183>>2] = $179;
     break;
    }
    case 15:  {
     $56 = $Idx;
     $57 = $56&255;
     $58 = (($57) - 2)|0;
     $59 = (($Stack) + ($58<<2)|0);
     $60 = HEAP32[$59>>2]|0;
     $61 = $Idx;
     $62 = $61&255;
     $63 = (($62) - 1)|0;
     $64 = (($Stack) + ($63<<2)|0);
     $65 = HEAP32[$64>>2]|0;
     $66 = (($60) + ($65))|0;
     $67 = $66 & 65535;
     $68 = $Idx;
     $69 = $68&255;
     $70 = (($69) - 2)|0;
     $71 = (($Stack) + ($70<<2)|0);
     HEAP32[$71>>2] = $67;
     break;
    }
    case 28:  {
     $232 = $Idx;
     $233 = $232&255;
     $234 = (($233) - 2)|0;
     $235 = (($Stack) + ($234<<2)|0);
     $236 = HEAP32[$235>>2]|0;
     $237 = $Idx;
     $238 = $237&255;
     $239 = (($238) - 1)|0;
     $240 = (($Stack) + ($239<<2)|0);
     $241 = HEAP32[$240>>2]|0;
     $242 = ($236|0)==($241|0);
     $243 = $242 ? 65535 : 0;
     $244 = $Idx;
     $245 = $244&255;
     $246 = (($245) - 2)|0;
     $247 = (($Stack) + ($246<<2)|0);
     HEAP32[$247>>2] = $243;
     break;
    }
    case 29:  {
     $248 = $Idx;
     $249 = $248&255;
     $250 = (($249) - 2)|0;
     $251 = (($Stack) + ($250<<2)|0);
     $252 = HEAP32[$251>>2]|0;
     $253 = $Idx;
     $254 = $253&255;
     $255 = (($254) - 1)|0;
     $256 = (($Stack) + ($255<<2)|0);
     $257 = HEAP32[$256>>2]|0;
     $258 = ($252|0)!=($257|0);
     $259 = $258 ? 65535 : 0;
     $260 = $Idx;
     $261 = $260&255;
     $262 = (($261) - 2)|0;
     $263 = (($Stack) + ($262<<2)|0);
     HEAP32[$263>>2] = $259;
     break;
    }
    case 31:  {
     $280 = $Idx;
     $281 = $280&255;
     $282 = (($281) - 2)|0;
     $283 = (($Stack) + ($282<<2)|0);
     $284 = HEAP32[$283>>2]|0;
     $285 = $Idx;
     $286 = $285&255;
     $287 = (($286) - 1)|0;
     $288 = (($Stack) + ($287<<2)|0);
     $289 = HEAP32[$288>>2]|0;
     $290 = ($284|0)<($289|0);
     $291 = $290 ? 65535 : 0;
     $292 = $Idx;
     $293 = $292&255;
     $294 = (($293) - 2)|0;
     $295 = (($Stack) + ($294<<2)|0);
     HEAP32[$295>>2] = $291;
     break;
    }
    case 30:  {
     $264 = $Idx;
     $265 = $264&255;
     $266 = (($265) - 2)|0;
     $267 = (($Stack) + ($266<<2)|0);
     $268 = HEAP32[$267>>2]|0;
     $269 = $Idx;
     $270 = $269&255;
     $271 = (($270) - 1)|0;
     $272 = (($Stack) + ($271<<2)|0);
     $273 = HEAP32[$272>>2]|0;
     $274 = ($268|0)>($273|0);
     $275 = $274 ? 65535 : 0;
     $276 = $Idx;
     $277 = $276&255;
     $278 = (($277) - 2)|0;
     $279 = (($Stack) + ($278<<2)|0);
     HEAP32[$279>>2] = $275;
     break;
    }
    case 10:  {
     $152 = $Idx;
     $153 = $152&255;
     $154 = (($153) - 2)|0;
     $155 = (($Stack) + ($154<<2)|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = $Idx;
     $158 = $157&255;
     $159 = (($158) - 1)|0;
     $160 = (($Stack) + ($159<<2)|0);
     $161 = HEAP32[$160>>2]|0;
     $162 = $156 & $161;
     $163 = $162 & 65535;
     $164 = $Idx;
     $165 = $164&255;
     $166 = (($165) - 2)|0;
     $167 = (($Stack) + ($166<<2)|0);
     HEAP32[$167>>2] = $163;
     break;
    }
    case 23:  {
     $120 = $Idx;
     $121 = $120&255;
     $122 = (($121) - 2)|0;
     $123 = (($Stack) + ($122<<2)|0);
     $124 = HEAP32[$123>>2]|0;
     $125 = $Idx;
     $126 = $125&255;
     $127 = (($126) - 1)|0;
     $128 = (($Stack) + ($127<<2)|0);
     $129 = HEAP32[$128>>2]|0;
     $130 = $124 << $129;
     $131 = $130 & 65535;
     $132 = $Idx;
     $133 = $132&255;
     $134 = (($133) - 2)|0;
     $135 = (($Stack) + ($134<<2)|0);
     HEAP32[$135>>2] = $131;
     break;
    }
    case 21:  {
     $104 = $Idx;
     $105 = $104&255;
     $106 = (($105) - 2)|0;
     $107 = (($Stack) + ($106<<2)|0);
     $108 = HEAP32[$107>>2]|0;
     $109 = $Idx;
     $110 = $109&255;
     $111 = (($110) - 1)|0;
     $112 = (($Stack) + ($111<<2)|0);
     $113 = HEAP32[$112>>2]|0;
     $114 = (($108|0) / ($113|0))&-1;
     $115 = $114 & 65535;
     $116 = $Idx;
     $117 = $116&255;
     $118 = (($117) - 2)|0;
     $119 = (($Stack) + ($118<<2)|0);
     HEAP32[$119>>2] = $115;
     break;
    }
    case 18:  {
     $88 = $Idx;
     $89 = $88&255;
     $90 = (($89) - 2)|0;
     $91 = (($Stack) + ($90<<2)|0);
     $92 = HEAP32[$91>>2]|0;
     $93 = $Idx;
     $94 = $93&255;
     $95 = (($94) - 1)|0;
     $96 = (($Stack) + ($95<<2)|0);
     $97 = HEAP32[$96>>2]|0;
     $98 = Math_imul($92, $97)|0;
     $99 = $98 & 65535;
     $100 = $Idx;
     $101 = $100&255;
     $102 = (($101) - 2)|0;
     $103 = (($Stack) + ($102<<2)|0);
     HEAP32[$103>>2] = $99;
     break;
    }
    case 2:  {
     $309 = $Idx;
     $310 = $309&255;
     $311 = (($310) - 1)|0;
     $312 = (($Stack) + ($311<<2)|0);
     $313 = HEAP32[$312>>2]|0;
     $314 = $313 ^ 65535;
     $315 = $Idx;
     $316 = $315&255;
     $317 = (($316) - 1)|0;
     $318 = (($Stack) + ($317<<2)|0);
     HEAP32[$318>>2] = $314;
     $319 = $Idx;
     $320 = (($319) + 1)<<24>>24;
     $Idx = $320;
     break;
    }
    default: {
    }
    }
   } while(0);
   $321 = $Idx;
   $322 = $321&255;
   $323 = (($322) - 2)|0;
   $324 = $323&255;
   $Idx = $324;
  }
  (__Z10GetExpBitshPt(1,$BitIdx)|0);
  $325 = $Idx;
  $326 = (($325) + 1)<<24>>24;
  $Idx = $326;
 }
 $327 = HEAP32[$Stack>>2]|0;
 STACKTOP = sp;return ($327|0);
}
function __Z14CCNestingErrorv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = HEAP8[238776>>0]|0;
 $2 = $1&255;
 $3 = (($2) - 1)|0;
 $4 = (238784 + (($3*48)|0)|0);
 $5 = HEAP32[$4>>2]|0;
 if ((($5|0) == 5) | (($5|0) == 4)) {
  $6 = (__Z5Error10TErrorCode(109)|0);
  $0 = $6;
 } else if ((($5|0) == 8)) {
  $7 = (__Z5Error10TErrorCode(110)|0);
  $0 = $7;
 } else {
  $0 = 0;
 }
 $8 = $0;
 STACKTOP = sp;return ($8|0);
}
function __Z10CopySymbolv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 dest=250448+0|0; src=238728+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 $1 = HEAP32[25392>>2]|0;
 $2 = ($1|0)>=(1024);
 if ($2) {
  $3 = (__Z5Error10TErrorCode(30)|0);
  $0 = $3;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 } else {
  $0 = 0;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 }
 return (0)|0;
}
function __Z8GetEqualv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $Element = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 (__Z10GetElementP12TElementList($Element)|0);
 $1 = HEAP32[$Element>>2]|0;
 $2 = ($1|0)==(9);
 if ($2) {
  $3 = (($Element) + 4|0);
  $4 = HEAP16[$3>>1]|0;
  $5 = $4&65535;
  $6 = ($5|0)==(28);
  if ($6) {
   $0 = 0;
   $8 = $0;
   STACKTOP = sp;return ($8|0);
  }
 }
 $7 = (__Z5Error10TErrorCode(52)|0);
 $0 = $7;
 $8 = $0;
 STACKTOP = sp;return ($8|0);
}
function __Z6GetEndPh($Result) {
 $Result = $Result|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Element = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 $1 = $Result;
 (__Z10GetElementP12TElementList($Element)|0);
 $2 = HEAP32[$Element>>2]|0;
 $3 = ($2|0)!=(47);
 if ($3) {
  $4 = (__Z5Error10TErrorCode(31)|0);
  $0 = $4;
  $11 = $0;
  STACKTOP = sp;return ($11|0);
 } else {
  $5 = (($Element) + 4|0);
  $6 = HEAP16[$5>>1]|0;
  $7 = ($6<<16>>16)!=(0);
  $8 = $7 ? 1 : 0;
  $9 = $8&255;
  $10 = $1;
  HEAP8[$10>>0] = $9;
  $0 = 0;
  $11 = $0;
  STACKTOP = sp;return ($11|0);
 }
 return (0)|0;
}
function __Z15ResolveConstanthhPh($LastPass,$CCDefine,$Resolved) {
 $LastPass = $LastPass|0;
 $CCDefine = $CCDefine|0;
 $Resolved = $Resolved|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0;
 var $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0;
 var $97 = 0, $98 = 0, $99 = 0, $Element = 0, $NFlag = 0, $Operation = 0, $Preview = 0, $URFlag = 0, $Value = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 20|0;
 $Preview = sp + 4|0;
 $1 = $LastPass;
 $2 = $CCDefine;
 $3 = $Resolved;
 $NFlag = 0;
 $URFlag = 0;
 $Value = 0;
 $4 = (($Preview) + 4|0);
 HEAP16[$4>>1] = 15;
 $5 = HEAP16[238720>>1]|0;
 $6 = (($5) + -1)<<16>>16;
 HEAP16[238720>>1] = $6;
 L1: while(1) {
  $7 = (($Preview) + 4|0);
  $8 = HEAP16[$7>>1]|0;
  $9 = $8&65535;
  $Operation = $9;
  $10 = HEAP16[238720>>1]|0;
  $11 = (($10) + 1)<<16>>16;
  HEAP16[238720>>1] = $11;
  (__Z10GetElementP12TElementList($Element)|0);
  $12 = HEAP32[$Element>>2]|0;
  $13 = ($12|0)==(10);
  if ($13) {
   $14 = (($Element) + 4|0);
   $15 = HEAP16[$14>>1]|0;
   $16 = $15&65535;
   $17 = ($16|0)!=(16);
   if ($17) {
    $18 = $2;
    $19 = ($18<<24>>24)!=(0);
    if (!($19)) {
     label = 5;
     break;
    }
    (__Z5Error10TErrorCode(92)|0);
   }
   $NFlag = 1;
   (__Z10GetElementP12TElementList($Element)|0);
  }
  $21 = HEAP32[$Element>>2]|0;
  $22 = ($21|0)==(12);
  do {
   if (!($22)) {
    $23 = HEAP32[$Element>>2]|0;
    $24 = ($23|0)==(42);
    if (!($24)) {
     $25 = $2;
     $26 = ($25<<24>>24)!=(0);
     if ($26) {
      $27 = HEAP32[$Element>>2]|0;
      $28 = ($27|0)==(44);
      if ($28) {
       break;
      }
     }
     $29 = HEAP32[$Element>>2]|0;
     $30 = ($29|0)==(0);
     if (!($30)) {
      $31 = HEAP32[$Element>>2]|0;
      $32 = ($31|0)==(1);
      if (!($32)) {
       $33 = $2;
       $34 = ($33<<24>>24)!=(0);
       if ($34) {
        $42 = HEAP32[$Element>>2]|0;
        $43 = ($42|0)!=(46);
        if ($43) {
         label = 22;
         break L1;
        }
        $45 = HEAP32[((238728 + 44|0))>>2]|0;
        $46 = ($45|0)==(1);
        if ($46) {
         label = 24;
         break L1;
        }
        $48 = (($Element) + 4|0);
        HEAP16[$48>>1] = 0;
       } else {
        $35 = HEAP32[$Element>>2]|0;
        $36 = ($35|0)!=(46);
        if ($36) {
         label = 17;
         break L1;
        }
        $38 = $1;
        $39 = ($38<<24>>24)!=(0);
        if ($39) {
         label = 19;
         break L1;
        }
        $41 = (($Element) + 4|0);
        HEAP16[$41>>1] = 1;
        $URFlag = 1;
       }
      }
     }
    }
   }
  } while(0);
  $49 = $NFlag;
  $50 = ($49<<24>>24)!=(0);
  if ($50) {
   $51 = (($Element) + 4|0);
   $52 = HEAP16[$51>>1]|0;
   $53 = $52&65535;
   $54 = (0 - ($53))|0;
   $55 = $54&65535;
   $56 = (($Element) + 4|0);
   HEAP16[$56>>1] = $55;
  }
  $NFlag = 0;
  $57 = $Operation;
  $58 = ($57|0)==(23);
  if ($58) {
   label = 31;
  } else {
   $59 = $Operation;
   $60 = ($59|0)==(24);
   if ($60) {
    label = 31;
   }
  }
  if ((label|0) == 31) {
   label = 0;
   $61 = (($Element) + 4|0);
   $62 = HEAP16[$61>>1]|0;
   $63 = $62&65535;
   $64 = (__Z6Lowestii($63,16)|0);
   $65 = $64&65535;
   $66 = (($Element) + 4|0);
   HEAP16[$66>>1] = $65;
  }
  $67 = $Operation;
  do {
   switch ($67|0) {
   case 15:  {
    $103 = $Value;
    $104 = $103&65535;
    $105 = (($Element) + 4|0);
    $106 = HEAP16[$105>>1]|0;
    $107 = $106&65535;
    $108 = (($104) + ($107))|0;
    $109 = $108&65535;
    $Value = $109;
    break;
   }
   case 24:  {
    $75 = $Value;
    $76 = $75&65535;
    $77 = (($Element) + 4|0);
    $78 = HEAP16[$77>>1]|0;
    $79 = $78&65535;
    $80 = $76 >> $79;
    $81 = $80&65535;
    $Value = $81;
    break;
   }
   case 12:  {
    $96 = $Value;
    $97 = $96&65535;
    $98 = (($Element) + 4|0);
    $99 = HEAP16[$98>>1]|0;
    $100 = $99&65535;
    $101 = $97 ^ $100;
    $102 = $101&65535;
    $Value = $102;
    break;
   }
   case 10:  {
    $82 = $Value;
    $83 = $82&65535;
    $84 = (($Element) + 4|0);
    $85 = HEAP16[$84>>1]|0;
    $86 = $85&65535;
    $87 = $83 & $86;
    $88 = $87&65535;
    $Value = $88;
    break;
   }
   case 16:  {
    $110 = $Value;
    $111 = $110&65535;
    $112 = (($Element) + 4|0);
    $113 = HEAP16[$112>>1]|0;
    $114 = $113&65535;
    $115 = (($111) - ($114))|0;
    $116 = $115&65535;
    $Value = $116;
    break;
   }
   case 21:  {
    $124 = (($Element) + 4|0);
    $125 = HEAP16[$124>>1]|0;
    $126 = $125&65535;
    $127 = ($126|0)>(0);
    if (!($127)) {
     label = 43;
     break L1;
    }
    $128 = $Value;
    $129 = $128&65535;
    $130 = (($Element) + 4|0);
    $131 = HEAP16[$130>>1]|0;
    $132 = $131&65535;
    $133 = (($129|0) / ($132|0))&-1;
    $134 = $133&65535;
    $Value = $134;
    break;
   }
   case 23:  {
    $68 = $Value;
    $69 = $68&65535;
    $70 = (($Element) + 4|0);
    $71 = HEAP16[$70>>1]|0;
    $72 = $71&65535;
    $73 = $69 << $72;
    $74 = $73&65535;
    $Value = $74;
    break;
   }
   case 11:  {
    $89 = $Value;
    $90 = $89&65535;
    $91 = (($Element) + 4|0);
    $92 = HEAP16[$91>>1]|0;
    $93 = $92&65535;
    $94 = $90 | $93;
    $95 = $94&65535;
    $Value = $95;
    break;
   }
   case 18:  {
    $117 = $Value;
    $118 = $117&65535;
    $119 = (($Element) + 4|0);
    $120 = HEAP16[$119>>1]|0;
    $121 = $120&65535;
    $122 = Math_imul($118, $121)|0;
    $123 = $122&65535;
    $Value = $123;
    break;
   }
   default: {
   }
   }
  } while(0);
  (__Z14PreviewElementP12TElementList($Preview)|0);
  $136 = HEAP32[$Preview>>2]|0;
  $137 = ($136|0)==(10);
  if ($137) {
   $138 = (($Preview) + 4|0);
   $139 = HEAP16[$138>>1]|0;
   $140 = $139&65535;
   $141 = ($140|0)==(23);
   if ($141) {
    $182 = 1;
   } else {
    $142 = (($Preview) + 4|0);
    $143 = HEAP16[$142>>1]|0;
    $144 = $143&65535;
    $145 = ($144|0)==(24);
    if ($145) {
     $182 = 1;
    } else {
     $146 = (($Preview) + 4|0);
     $147 = HEAP16[$146>>1]|0;
     $148 = $147&65535;
     $149 = ($148|0)==(10);
     if ($149) {
      $182 = 1;
     } else {
      $150 = (($Preview) + 4|0);
      $151 = HEAP16[$150>>1]|0;
      $152 = $151&65535;
      $153 = ($152|0)==(11);
      if ($153) {
       $182 = 1;
      } else {
       $154 = (($Preview) + 4|0);
       $155 = HEAP16[$154>>1]|0;
       $156 = $155&65535;
       $157 = ($156|0)==(12);
       if ($157) {
        $182 = 1;
       } else {
        $158 = (($Preview) + 4|0);
        $159 = HEAP16[$158>>1]|0;
        $160 = $159&65535;
        $161 = ($160|0)==(15);
        if ($161) {
         $182 = 1;
        } else {
         $162 = (($Preview) + 4|0);
         $163 = HEAP16[$162>>1]|0;
         $164 = $163&65535;
         $165 = ($164|0)==(16);
         if ($165) {
          $182 = 1;
         } else {
          $166 = (($Preview) + 4|0);
          $167 = HEAP16[$166>>1]|0;
          $168 = $167&65535;
          $169 = ($168|0)==(18);
          if ($169) {
           $182 = 1;
          } else {
           $170 = (($Preview) + 4|0);
           $171 = HEAP16[$170>>1]|0;
           $172 = $171&65535;
           $173 = ($172|0)==(21);
           $182 = $173;
          }
         }
        }
       }
      }
     }
    }
   }
   $181 = $182;
  } else {
   $181 = 0;
  }
  if (!($181)) {
   label = 59;
   break;
  }
 }
 if ((label|0) == 5) {
  $20 = (__Z5Error10TErrorCode(12)|0);
  $0 = $20;
  $180 = $0;
  STACKTOP = sp;return ($180|0);
 }
 else if ((label|0) == 17) {
  $37 = (__Z5Error10TErrorCode(12)|0);
  $0 = $37;
  $180 = $0;
  STACKTOP = sp;return ($180|0);
 }
 else if ((label|0) == 19) {
  $40 = (__Z5Error10TErrorCode(10)|0);
  $0 = $40;
  $180 = $0;
  STACKTOP = sp;return ($180|0);
 }
 else if ((label|0) == 22) {
  $44 = (__Z5Error10TErrorCode(112)|0);
  $0 = $44;
  $180 = $0;
  STACKTOP = sp;return ($180|0);
 }
 else if ((label|0) == 24) {
  $47 = (__Z5Error10TErrorCode(99)|0);
  $0 = $47;
  $180 = $0;
  STACKTOP = sp;return ($180|0);
 }
 else if ((label|0) == 43) {
  $135 = (__Z5Error10TErrorCode(13)|0);
  $0 = $135;
  $180 = $0;
  STACKTOP = sp;return ($180|0);
 }
 else if ((label|0) == 59) {
  HEAP32[((250448 + 36|0))>>2] = 12;
  $174 = $Value;
  HEAP16[((250448 + 40|0))>>1] = $174;
  $175 = $URFlag;
  $176 = ($175<<24>>24)!=(0);
  $177 = $176 ^ 1;
  $178 = $177&1;
  $179 = $3;
  HEAP8[$179>>0] = $178;
  $0 = 0;
  $180 = $0;
  STACKTOP = sp;return ($180|0);
 }
 return (0)|0;
}
function __Z16AppendExpressionh13TOperatorCode($SourceExpression,$AppendOperator) {
 $SourceExpression = $SourceExpression|0;
 $AppendOperator = $AppendOperator|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Idx = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $SourceExpression;
 $2 = $AppendOperator;
 $3 = (__Z19EnterExpressionBitsht(1,1)|0);
 $Result = $3;
 $4 = ($3|0)!=(0);
 if ($4) {
  $5 = $Result;
  $0 = $5;
  $55 = $0;
  STACKTOP = sp;return ($55|0);
 }
 $Idx = 0;
 while(1) {
  $6 = $Idx;
  $7 = $6&255;
  $8 = $1;
  $9 = $8&255;
  $10 = (238456 + ($9<<6)|0);
  $11 = HEAP16[$10>>1]|0;
  $12 = $11&65535;
  $13 = ($7|0)<($12|0);
  if (!($13)) {
   break;
  }
  $14 = $1;
  $15 = $14&255;
  $16 = (238456 + ($15<<6)|0);
  $17 = HEAP16[$16>>1]|0;
  $18 = $17&65535;
  $19 = $Idx;
  $20 = $19&255;
  $21 = (($18) - ($20))|0;
  $22 = (__Z6Lowestii(16,$21)|0);
  $23 = $22&255;
  $24 = $Idx;
  $25 = $24&255;
  $26 = (($25|0) / 16)&-1;
  $27 = (($26) + 1)|0;
  $28 = $1;
  $29 = $28&255;
  $30 = (238456 + ($29<<6)|0);
  $31 = (($30) + ($27<<1)|0);
  $32 = HEAP16[$31>>1]|0;
  $33 = (__Z19EnterExpressionBitsht($23,$32)|0);
  $Result = $33;
  $34 = ($33|0)!=(0);
  if ($34) {
   label = 6;
   break;
  }
  $36 = $1;
  $37 = $36&255;
  $38 = (238456 + ($37<<6)|0);
  $39 = HEAP16[$38>>1]|0;
  $40 = $39&65535;
  $41 = $Idx;
  $42 = $41&255;
  $43 = (($40) - ($42))|0;
  $44 = (($43) + 1)|0;
  $45 = (__Z6Lowestii(16,$44)|0);
  $46 = $Idx;
  $47 = $46&255;
  $48 = (($47) + ($45))|0;
  $49 = $48&255;
  $Idx = $49;
 }
 if ((label|0) == 6) {
  $35 = $Result;
  $0 = $35;
  $55 = $0;
  STACKTOP = sp;return ($55|0);
 }
 $50 = $2;
 $51 = $50&255;
 $52 = (__Z23EnterExpressionOperatorh($51)|0);
 $Result = $52;
 $53 = ($52|0)!=(0);
 if ($53) {
  $54 = $Result;
  $0 = $54;
  $55 = $0;
  STACKTOP = sp;return ($55|0);
 } else {
  $0 = 0;
  $55 = $0;
  STACKTOP = sp;return ($55|0);
 }
 return (0)|0;
}
function __Z5GetTOv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $Element = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 (__Z10GetElementP12TElementList($Element)|0);
 $1 = HEAP32[$Element>>2]|0;
 $2 = ($1|0)!=(24);
 if ($2) {
  $3 = (__Z5Error10TErrorCode(54)|0);
  $0 = $3;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 } else {
  $0 = 0;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 }
 return (0)|0;
}
function __Z18GetUndefinedSymbolv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $Element = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 (__Z10GetElementP12TElementList($Element)|0);
 $1 = HEAP32[$Element>>2]|0;
 $2 = ($1|0)==(46);
 do {
  if ($2) {
   $3 = (__Z10CopySymbolv()|0);
   $Result = $3;
   $4 = ($3|0)!=(0);
   if ($4) {
    $5 = $Result;
    $0 = $5;
    break;
   }
   $0 = 0;
  } else {
   $6 = (__Z5Error10TErrorCode(25)|0);
   $0 = $6;
  }
 } while(0);
 $7 = $0;
 STACKTOP = sp;return ($7|0);
}
function __Z12AssignSymbolPhPt($SymbolFlag,$EEPROMIdx) {
 $SymbolFlag = $SymbolFlag|0;
 $EEPROMIdx = $EEPROMIdx|0;
 var $$byval_copy = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, dest = 0, label = 0, sp = 0, src = 0;
 var stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy = sp + 64|0;
 $3 = sp;
 $1 = $SymbolFlag;
 $2 = $EEPROMIdx;
 $4 = $1;
 $5 = HEAP8[$4>>0]|0;
 $6 = ($5<<24>>24)!=(0);
 do {
  if ($6) {
   HEAP32[((250448 + 36|0))>>2] = 12;
   $7 = $2;
   $8 = HEAP16[$7>>1]|0;
   HEAP16[((250448 + 40|0))>>1] = $8;
   dest=$3+0|0; src=250448+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
   dest=$$byval_copy+0|0; src=$3+0|0; stop=dest+48|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
   $9 = (__Z11EnterSymbol12TSymbolTable($$byval_copy)|0);
   $Result = $9;
   $10 = ($9|0)!=(0);
   if (!($10)) {
    $12 = $1;
    HEAP8[$12>>0] = 0;
    break;
   }
   $11 = $Result;
   $0 = $11;
   $13 = $0;
   STACKTOP = sp;return ($13|0);
  }
 } while(0);
 $0 = 0;
 $13 = $0;
 STACKTOP = sp;return ($13|0);
}
function __Z9EnterDataP12TElementListPtS1_hhh($Element,$EEPROMValue,$EEPROMIdx,$WordFlag,$DefinedFlag,$LastPass) {
 $Element = $Element|0;
 $EEPROMValue = $EEPROMValue|0;
 $EEPROMIdx = $EEPROMIdx|0;
 $WordFlag = $WordFlag|0;
 $DefinedFlag = $DefinedFlag|0;
 $LastPass = $LastPass|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $9 = 0, $Idx = 0, $Value = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Element;
 $2 = $EEPROMValue;
 $3 = $EEPROMIdx;
 $4 = $WordFlag;
 $5 = $DefinedFlag;
 $6 = $LastPass;
 $7 = $2;
 $8 = HEAP16[$7>>1]|0;
 $9 = $8&255;
 $Value = $9;
 $Idx = 0;
 while(1) {
  $10 = $Idx;
  $11 = $10&255;
  $12 = $4;
  $13 = ($12<<24>>24)!=(0);
  $14 = $13 ? 1 : 0;
  $15 = ($11|0)<=($14|0);
  if (!($15)) {
   label = 11;
   break;
  }
  $16 = $3;
  $17 = HEAP16[$16>>1]|0;
  $18 = $17&65535;
  $19 = ($18|0)>=(2048);
  if ($19) {
   label = 4;
   break;
  }
  $21 = $6;
  $22 = ($21<<24>>24)!=(0);
  if ($22) {
   $23 = $3;
   $24 = HEAP16[$23>>1]|0;
   $25 = $24&65535;
   $26 = HEAP32[8>>2]|0;
   $27 = (($26) + 2148|0);
   $28 = (($27) + ($25)|0);
   $29 = HEAP8[$28>>0]|0;
   $30 = $29&255;
   $31 = $30 & 3;
   $32 = ($31|0)>(0);
   if ($32) {
    label = 7;
    break;
   }
   $34 = $5;
   $35 = ($34<<24>>24)!=(0);
   $36 = $35 ? 1 : 0;
   $37 = (1 + ($36))|0;
   $38 = $37&255;
   $39 = $3;
   $40 = HEAP16[$39>>1]|0;
   $41 = $40&65535;
   $42 = HEAP32[8>>2]|0;
   $43 = (($42) + 2148|0);
   $44 = (($43) + ($41)|0);
   HEAP8[$44>>0] = $38;
   $45 = $Value;
   $46 = $3;
   $47 = HEAP16[$46>>1]|0;
   $48 = $47&65535;
   $49 = HEAP32[8>>2]|0;
   $50 = (($49) + 100|0);
   $51 = (($50) + ($48)|0);
   HEAP8[$51>>0] = $45;
   $52 = $1;
   $53 = (($52) + 6|0);
   $54 = HEAP16[$53>>1]|0;
   $55 = $3;
   $56 = HEAP16[$55>>1]|0;
   $57 = $56&65535;
   $58 = $57<<1;
   $59 = (250496 + ($58<<1)|0);
   HEAP16[$59>>1] = $54;
   $60 = $1;
   $61 = (($60) + 8|0);
   $62 = HEAP8[$61>>0]|0;
   $63 = $62&255;
   $64 = $3;
   $65 = HEAP16[$64>>1]|0;
   $66 = $65&65535;
   $67 = $66<<1;
   $68 = (($67) + 1)|0;
   $69 = (250496 + ($68<<1)|0);
   HEAP16[$69>>1] = $63;
  }
  $70 = $3;
  $71 = HEAP16[$70>>1]|0;
  $72 = (($71) + 1)<<16>>16;
  HEAP16[$70>>1] = $72;
  $73 = $2;
  $74 = HEAP16[$73>>1]|0;
  $75 = $74&65535;
  $76 = $75 >> 8;
  $77 = $76&255;
  $Value = $77;
  $78 = $Idx;
  $79 = (($78) + 1)<<24>>24;
  $Idx = $79;
 }
 if ((label|0) == 4) {
  $20 = (__Z5Error10TErrorCode(14)|0);
  $0 = $20;
  $80 = $0;
  STACKTOP = sp;return ($80|0);
 }
 else if ((label|0) == 7) {
  $33 = (__Z5Error10TErrorCode(15)|0);
  $0 = $33;
  $80 = $0;
  STACKTOP = sp;return ($80|0);
 }
 else if ((label|0) == 11) {
  $0 = 0;
  $80 = $0;
  STACKTOP = sp;return ($80|0);
 }
 return (0)|0;
}
function __Z10GetExpBitshPt($Bits,$BitIdx) {
 $Bits = $Bits|0;
 $BitIdx = $BitIdx|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $Bits;
 $1 = $BitIdx;
 $Result = 0;
 while(1) {
  $2 = $0;
  $3 = $2&255;
  $4 = ($3|0)>(0);
  if ($4) {
   $5 = $1;
   $6 = HEAP16[$5>>1]|0;
   $7 = $6&65535;
   $8 = HEAP16[238456>>1]|0;
   $9 = $8&65535;
   $10 = ($7|0)<($9|0);
   $45 = $10;
  } else {
   $45 = 0;
  }
  if (!($45)) {
   break;
  }
  $11 = $Result;
  $12 = $11 << 1;
  $13 = $1;
  $14 = HEAP16[$13>>1]|0;
  $15 = $14&65535;
  $16 = (($15|0) / 16)&-1;
  $17 = (($16) + 1)|0;
  $18 = (238456 + ($17<<1)|0);
  $19 = HEAP16[$18>>1]|0;
  $20 = $19&65535;
  $21 = HEAP16[238456>>1]|0;
  $22 = $21&65535;
  $23 = $1;
  $24 = HEAP16[$23>>1]|0;
  $25 = $24&65535;
  $26 = (($25|0) / 16)&-1;
  $27 = $26<<4;
  $28 = (($22) - ($27))|0;
  $29 = (($28) - 1)|0;
  $30 = (__Z6Lowestii(15,$29)|0);
  $31 = $1;
  $32 = HEAP16[$31>>1]|0;
  $33 = $32&65535;
  $34 = (($33|0) % 16)&-1;
  $35 = (($30) - ($34))|0;
  $36 = $20 >> $35;
  $37 = $36 & 1;
  $38 = (($12) + ($37))|0;
  $Result = $38;
  $39 = $0;
  $40 = (($39) + -1)<<24>>24;
  $0 = $40;
  $41 = $1;
  $42 = HEAP16[$41>>1]|0;
  $43 = (($42) + 1)<<16>>16;
  HEAP16[$41>>1] = $43;
 }
 $44 = $Result;
 STACKTOP = sp;return ($44|0);
}
function __Z12RaiseToPowerii($Base,$Exponent) {
 $Base = $Base|0;
 $Exponent = $Exponent|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $0 = $Base;
 $1 = $Exponent;
 $Result = 1;
 while(1) {
  $2 = $1;
  $3 = ($2|0)>(0);
  if (!($3)) {
   break;
  }
  $4 = $Result;
  $5 = $0;
  $6 = Math_imul($4, $5)|0;
  $Result = $6;
  $7 = $1;
  $8 = (($7) + -1)|0;
  $1 = $8;
 }
 $9 = $Result;
 STACKTOP = sp;return ($9|0);
}
function __Z12PatchAddresst($SourceAddress) {
 $SourceAddress = $SourceAddress|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, $TempIdx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $SourceAddress;
 $2 = HEAP16[258728>>1]|0;
 $TempIdx = $2;
 $3 = $1;
 HEAP16[258728>>1] = $3;
 $4 = $TempIdx;
 $5 = (__Z12EnterAddresst($4)|0);
 $Result = $5;
 $6 = ($5|0)!=(0);
 if ($6) {
  $7 = $Result;
  $0 = $7;
  $9 = $0;
  STACKTOP = sp;return ($9|0);
 } else {
  $8 = $TempIdx;
  HEAP16[258728>>1] = $8;
  $0 = 0;
  $9 = $0;
  STACKTOP = sp;return ($9|0);
 }
 return (0)|0;
}
function __Z14EnterSrcTokRefv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Element = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 $0 = HEAP32[24>>2]|0;
 $1 = ($0|0)!=(0|0);
 if (!($1)) {
  STACKTOP = sp;return;
 }
 $2 = HEAP32[238432>>2]|0;
 $3 = ($2|0)>(2337);
 if ($3) {
  STACKTOP = sp;return;
 } else {
  $4 = HEAP16[238720>>1]|0;
  $5 = (($4) + -1)<<16>>16;
  HEAP16[238720>>1] = $5;
  (__Z10GetElementP12TElementList($Element)|0);
  $6 = (($Element) + 6|0);
  $7 = HEAP16[$6>>1]|0;
  $8 = HEAP32[24>>2]|0;
  $9 = HEAP32[238432>>2]|0;
  $10 = (($8) + ($9<<2)|0);
  HEAP16[$10>>1] = $7;
  $11 = HEAP16[258728>>1]|0;
  $12 = HEAP32[24>>2]|0;
  $13 = HEAP32[238432>>2]|0;
  $14 = (($12) + ($13<<2)|0);
  $15 = (($14) + 2|0);
  HEAP16[$15>>1] = $11;
  $16 = HEAP32[238432>>2]|0;
  $17 = (($16) + 1)|0;
  HEAP32[238432>>2] = $17;
  STACKTOP = sp;return;
 }
}
function __Z10CompileLetv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 1;
 $1 = (__Z8GetWriteh(1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetEqualv()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 0;
   $7 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   $13 = (__Z10Enter0Code16TInstructionCode(26)|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $16 = $0;
 STACKTOP = sp;return ($16|0);
}
function __Z12CompileAuxiov() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = (__Z10Enter0Code16TInstructionCode(31)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 if ($2) {
  $3 = $Result;
  $0 = $3;
 } else {
  $0 = 0;
 }
 $4 = $0;
 STACKTOP = sp;return ($4|0);
}
function __Z13CompileBranchv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $FoundBracket = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $FoundBracket = sp + 8|0;
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,0)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(15)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   $7 = (__Z8GetCommav()|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z14GetLeftBracketv()|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   while(1) {
    $13 = (__Z15GetAddressEnterv()|0);
    $Result = $13;
    $14 = ($13|0)!=(0);
    if ($14) {
     label = 11;
     break;
    }
    $16 = (__Z17GetCommaOrBracketPh($FoundBracket)|0);
    $Result = $16;
    $17 = ($16|0)!=(0);
    if ($17) {
     label = 13;
     break;
    }
    $19 = HEAP8[$FoundBracket>>0]|0;
    $20 = ($19<<24>>24)!=(0);
    $21 = $20 ^ 1;
    if (!($21)) {
     label = 16;
     break;
    }
   }
   if ((label|0) == 11) {
    $15 = $Result;
    $0 = $15;
    break;
   }
   else if ((label|0) == 13) {
    $18 = $Result;
    $0 = $18;
    break;
   }
   else if ((label|0) == 16) {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $22 = $0;
 STACKTOP = sp;return ($22|0);
}
function __Z13CompileButtonv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $OldElementListIdx = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 5;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 0;
   $7 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z8GetCommav()|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   HEAP8[241856>>0] = 1;
   $13 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   }
   $16 = (__Z8GetCommav()|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    $18 = $Result;
    $0 = $18;
    break;
   }
   HEAP8[241856>>0] = 2;
   $19 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $19;
   $20 = ($19|0)!=(0);
   if ($20) {
    $21 = $Result;
    $0 = $21;
    break;
   }
   $22 = (__Z8GetCommav()|0);
   $Result = $22;
   $23 = ($22|0)!=(0);
   if ($23) {
    $24 = $Result;
    $0 = $24;
    break;
   }
   $25 = HEAP16[238720>>1]|0;
   $26 = $25&65535;
   $OldElementListIdx = $26;
   HEAP8[241856>>0] = 4;
   $27 = (__Z7GetReadh(2)|0);
   $Result = $27;
   $28 = ($27|0)!=(0);
   if ($28) {
    $29 = $Result;
    $0 = $29;
    break;
   }
   $30 = $OldElementListIdx;
   $31 = $30&65535;
   HEAP16[238720>>1] = $31;
   HEAP8[241856>>0] = 1;
   $32 = (__Z8GetWriteh(3)|0);
   $Result = $32;
   $33 = ($32|0)!=(0);
   if ($33) {
    $34 = $Result;
    $0 = $34;
    break;
   }
   $35 = (__Z8GetCommav()|0);
   $Result = $35;
   $36 = ($35|0)!=(0);
   if ($36) {
    $37 = $Result;
    $0 = $37;
    break;
   }
   HEAP8[241856>>0] = 3;
   $38 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $38;
   $39 = ($38|0)!=(0);
   if ($39) {
    $40 = $Result;
    $0 = $40;
    break;
   }
   $41 = (__Z8GetCommav()|0);
   $Result = $41;
   $42 = ($41|0)!=(0);
   if ($42) {
    $43 = $Result;
    $0 = $43;
    break;
   }
   $44 = (__Z15EnterExpressionhh(2,1)|0);
   $Result = $44;
   $45 = ($44|0)!=(0);
   if ($45) {
    $46 = $Result;
    $0 = $46;
    break;
   }
   $47 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $47;
   $48 = ($47|0)!=(0);
   if ($48) {
    $49 = $Result;
    $0 = $49;
    break;
   }
   $50 = (__Z10Enter0Code16TInstructionCode(42)|0);
   $Result = $50;
   $51 = ($50|0)!=(0);
   if ($51) {
    $52 = $Result;
    $0 = $52;
    break;
   }
   $53 = (__Z15EnterExpressionhh(3,0)|0);
   $Result = $53;
   $54 = ($53|0)!=(0);
   if ($54) {
    $55 = $Result;
    $0 = $55;
    break;
   }
   $56 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $56;
   $57 = ($56|0)!=(0);
   if ($57) {
    $58 = $Result;
    $0 = $58;
    break;
   }
   $59 = (__Z15GetAddressEnterv()|0);
   $Result = $59;
   $60 = ($59|0)!=(0);
   if ($60) {
    $61 = $Result;
    $0 = $61;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $62 = $0;
 STACKTOP = sp;return ($62|0);
}
function __Z11CompileCasev() {
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0;
 var $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0;
 var $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0;
 var $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0;
 var $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $Element = 0, $ProcessOr = 0, $Result = 0, $TempIdx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 8|0;
 HEAP8[241856>>0] = 0;
 $1 = HEAP8[250440>>0]|0;
 $2 = $1&255;
 $3 = ($2|0)==(0);
 if ($3) {
  $4 = (__Z5Error10TErrorCode(84)|0);
  $0 = $4;
  $186 = $0;
  STACKTOP = sp;return ($186|0);
 }
 $5 = HEAP8[238776>>0]|0;
 $6 = $5&255;
 $7 = (($6) - 1)|0;
 $8 = (238784 + (($7*48)|0)|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($9|0)!=(8);
 if ($10) {
  $11 = (__Z12NestingErrorv()|0);
  $0 = $11;
  $186 = $0;
  STACKTOP = sp;return ($186|0);
 }
 $12 = HEAP8[238776>>0]|0;
 $13 = $12&255;
 $14 = (($13) - 1)|0;
 $15 = (238784 + (($14*48)|0)|0);
 $16 = (($15) + 14|0);
 $17 = HEAP16[$16>>1]|0;
 $18 = $17&65535;
 $19 = ($18|0)>(0);
 do {
  if ($19) {
   $20 = HEAP8[238776>>0]|0;
   $21 = $20&255;
   $22 = (($21) - 1)|0;
   $23 = (238784 + (($22*48)|0)|0);
   $24 = (($23) + 14|0);
   $25 = HEAP16[$24>>1]|0;
   $26 = $25&65535;
   $27 = HEAP16[258728>>1]|0;
   $28 = $27&65535;
   $29 = (($28) - 14)|0;
   $30 = ($26|0)==($29|0);
   if ($30) {
    $31 = (__Z5Error10TErrorCode(113)|0);
    $0 = $31;
    $186 = $0;
    STACKTOP = sp;return ($186|0);
   }
   $32 = (__Z10Enter0Code16TInstructionCode(9)|0);
   $Result = $32;
   $33 = ($32|0)!=(0);
   if ($33) {
    $34 = $Result;
    $0 = $34;
    $186 = $0;
    STACKTOP = sp;return ($186|0);
   }
   $TempIdx = 0;
   while(1) {
    $35 = $TempIdx;
    $36 = ($35|0)<(15);
    if ($36) {
     $37 = $TempIdx;
     $38 = HEAP8[238776>>0]|0;
     $39 = $38&255;
     $40 = (($39) - 1)|0;
     $41 = (238784 + (($40*48)|0)|0);
     $42 = (($41) + 16|0);
     $43 = (($42) + ($37<<1)|0);
     $44 = HEAP16[$43>>1]|0;
     $45 = $44&65535;
     $46 = ($45|0)!=(0);
     $187 = $46;
    } else {
     $187 = 0;
    }
    if (!($187)) {
     break;
    }
    $47 = $TempIdx;
    $48 = (($47) + 1)|0;
    $TempIdx = $48;
   }
   $49 = $TempIdx;
   $50 = ($49|0)==(15);
   if ($50) {
    $51 = (__Z5Error10TErrorCode(85)|0);
    $0 = $51;
    $186 = $0;
    STACKTOP = sp;return ($186|0);
   }
   $52 = HEAP16[258728>>1]|0;
   $53 = $TempIdx;
   $54 = HEAP8[238776>>0]|0;
   $55 = $54&255;
   $56 = (($55) - 1)|0;
   $57 = (238784 + (($56*48)|0)|0);
   $58 = (($57) + 16|0);
   $59 = (($58) + ($53<<1)|0);
   HEAP16[$59>>1] = $52;
   $60 = HEAP16[258728>>1]|0;
   $61 = $60&65535;
   $62 = (($61) + 14)|0;
   $63 = $62&65535;
   HEAP16[258728>>1] = $63;
   $64 = (__Z15PatchSkipLabelsh(0)|0);
   $Result = $64;
   $65 = ($64|0)!=(0);
   if (!($65)) {
    break;
   }
   $66 = $Result;
   $0 = $66;
   $186 = $0;
   STACKTOP = sp;return ($186|0);
  }
 } while(0);
 $ProcessOr = 0;
 $TempIdx = 0;
 $67 = (__Z10GetElementP12TElementList($Element)|0);
 $68 = ($67<<24>>24)!=(0);
 do {
  if ($68) {
   $69 = HEAP32[$Element>>2]|0;
   $70 = ($69|0)==(3);
   if ($70) {
    $71 = (($Element) + 4|0);
    $72 = HEAP16[$71>>1]|0;
    $73 = $72&65535;
    $74 = ($73|0)==(10);
    if ($74) {
     break;
    }
   }
   $75 = HEAP16[238720>>1]|0;
   $76 = (($75) + -1)<<16>>16;
   HEAP16[238720>>1] = $76;
   while(1) {
    $77 = HEAP16[238720>>1]|0;
    $78 = $77&65535;
    $TempIdx = $78;
    while(1) {
     $79 = (__Z10GetElementP12TElementList($Element)|0);
     $80 = ($79<<24>>24)!=(0);
     if ($80) {
      $81 = HEAP32[$Element>>2]|0;
      $82 = ($81|0)==(14);
      if ($82) {
       $88 = 1;
      } else {
       $83 = HEAP32[$Element>>2]|0;
       $84 = ($83|0)==(24);
       if ($84) {
        $88 = 1;
       } else {
        $85 = HEAP32[$Element>>2]|0;
        $86 = ($85|0)==(47);
        $88 = $86;
       }
      }
      $87 = $88 ^ 1;
      $188 = $87;
     } else {
      $188 = 0;
     }
     if (!($188)) {
      break;
     }
    }
    $89 = $TempIdx;
    $90 = $89&65535;
    HEAP16[238720>>1] = $90;
    $91 = HEAP8[238776>>0]|0;
    $92 = $91&255;
    $93 = (($92) - 1)|0;
    $94 = (238784 + (($93*48)|0)|0);
    $95 = (($94) + 6|0);
    $96 = HEAP16[$95>>1]|0;
    HEAP16[238720>>1] = $96;
    $97 = HEAP32[$Element>>2]|0;
    $98 = ($97|0)==(24);
    if ($98) {
     $99 = HEAP8[238776>>0]|0;
     $100 = $99&255;
     $101 = (($100) - 1)|0;
     $102 = (238784 + (($101*48)|0)|0);
     $103 = (($102) + 8|0);
     HEAP32[$103>>2] = 26;
     $104 = $TempIdx;
     $105 = (__Z19GetValueConditionalhhi(1,0,$104)|0);
     $Result = $105;
     $106 = ($105|0)!=(0);
     if ($106) {
      label = 34;
      break;
     }
     __Z14CopyExpressionhh(0,1);
     $108 = (__Z5GetTOv()|0);
     $Result = $108;
     $109 = ($108|0)!=(0);
     if ($109) {
      label = 36;
      break;
     }
     $111 = HEAP16[238720>>1]|0;
     $112 = $111&65535;
     $TempIdx = $112;
     $113 = HEAP8[238776>>0]|0;
     $114 = $113&255;
     $115 = (($114) - 1)|0;
     $116 = (238784 + (($115*48)|0)|0);
     $117 = (($116) + 6|0);
     $118 = HEAP16[$117>>1]|0;
     HEAP16[238720>>1] = $118;
     $119 = HEAP8[238776>>0]|0;
     $120 = $119&255;
     $121 = (($120) - 1)|0;
     $122 = (238784 + (($121*48)|0)|0);
     $123 = (($122) + 8|0);
     HEAP32[$123>>2] = 27;
     $124 = $TempIdx;
     $125 = (__Z19GetValueConditionalhhi(1,0,$124)|0);
     $Result = $125;
     $126 = ($125|0)!=(0);
     if ($126) {
      label = 38;
      break;
     }
     __Z14CopyExpressionhh(0,2);
     __Z14CopyExpressionhh(1,0);
     $128 = (__Z16AppendExpressionh13TOperatorCode(2,10)|0);
     $Result = $128;
     $129 = ($128|0)!=(0);
     if ($129) {
      label = 40;
      break;
     }
    } else {
     $131 = HEAP8[238776>>0]|0;
     $132 = $131&255;
     $133 = (($132) - 1)|0;
     $134 = (238784 + (($133*48)|0)|0);
     $135 = (($134) + 8|0);
     HEAP32[$135>>2] = 28;
     $136 = $TempIdx;
     $137 = (__Z19GetValueConditionalhhi(1,0,$136)|0);
     $Result = $137;
     $138 = ($137|0)!=(0);
     if ($138) {
      label = 43;
      break;
     }
    }
    $140 = $ProcessOr;
    $141 = ($140<<24>>24)!=(0);
    if ($141) {
     __Z14CopyExpressionhh(0,1);
     __Z14CopyExpressionhh(3,0);
     $142 = (__Z16AppendExpressionh13TOperatorCode(1,11)|0);
     $Result = $142;
     $143 = ($142|0)!=(0);
     if ($143) {
      label = 47;
      break;
     }
    }
    (__Z10GetElementP12TElementList($Element)|0);
    $145 = HEAP32[$Element>>2]|0;
    $146 = ($145|0)==(14);
    if ($146) {
     __Z14CopyExpressionhh(0,3);
     $ProcessOr = 1;
    }
    $147 = HEAP32[$Element>>2]|0;
    $148 = ($147|0)==(14);
    if (!($148)) {
     label = 53;
     break;
    }
   }
   if ((label|0) == 34) {
    $107 = $Result;
    $0 = $107;
    $186 = $0;
    STACKTOP = sp;return ($186|0);
   }
   else if ((label|0) == 36) {
    $110 = $Result;
    $0 = $110;
    $186 = $0;
    STACKTOP = sp;return ($186|0);
   }
   else if ((label|0) == 38) {
    $127 = $Result;
    $0 = $127;
    $186 = $0;
    STACKTOP = sp;return ($186|0);
   }
   else if ((label|0) == 40) {
    $130 = $Result;
    $0 = $130;
    $186 = $0;
    STACKTOP = sp;return ($186|0);
   }
   else if ((label|0) == 43) {
    $139 = $Result;
    $0 = $139;
    $186 = $0;
    STACKTOP = sp;return ($186|0);
   }
   else if ((label|0) == 47) {
    $144 = $Result;
    $0 = $144;
    $186 = $0;
    STACKTOP = sp;return ($186|0);
   }
   else if ((label|0) == 53) {
    $149 = HEAP32[$Element>>2]|0;
    $150 = ($149|0)!=(47);
    if ($150) {
     $151 = (__Z5Error10TErrorCode(32)|0);
     $0 = $151;
     $186 = $0;
     STACKTOP = sp;return ($186|0);
    }
    $152 = HEAP16[238720>>1]|0;
    $153 = (($152) + -1)<<16>>16;
    HEAP16[238720>>1] = $153;
    $154 = (__Z15EnterExpressionhh(0,1)|0);
    $Result = $154;
    $155 = ($154|0)!=(0);
    if ($155) {
     $156 = $Result;
     $0 = $156;
     $186 = $0;
     STACKTOP = sp;return ($186|0);
    }
    $157 = (__Z10Enter0Code16TInstructionCode(13)|0);
    $Result = $157;
    $158 = ($157|0)!=(0);
    if ($158) {
     $159 = $Result;
     $0 = $159;
     $186 = $0;
     STACKTOP = sp;return ($186|0);
    }
    $160 = HEAP16[258728>>1]|0;
    $161 = $160&65535;
    $TempIdx = $161;
    $162 = HEAP16[258728>>1]|0;
    $163 = $162&65535;
    $164 = (($163) + 14)|0;
    $165 = $164&65535;
    HEAP16[258728>>1] = $165;
    $166 = (__Z10Enter0Code16TInstructionCode(9)|0);
    $Result = $166;
    $167 = ($166|0)!=(0);
    if (!($167)) {
     $169 = HEAP16[258728>>1]|0;
     $170 = HEAP8[238776>>0]|0;
     $171 = $170&255;
     $172 = (($171) - 1)|0;
     $173 = (238784 + (($172*48)|0)|0);
     $174 = (($173) + 14|0);
     HEAP16[$174>>1] = $169;
     $175 = HEAP16[258728>>1]|0;
     $176 = $175&65535;
     $177 = (($176) + 14)|0;
     $178 = $177&65535;
     HEAP16[258728>>1] = $178;
     break;
    }
    $168 = $Result;
    $0 = $168;
    $186 = $0;
    STACKTOP = sp;return ($186|0);
   }
  }
 } while(0);
 $179 = $TempIdx;
 $180 = ($179|0)>(0);
 do {
  if ($180) {
   $181 = $TempIdx;
   $182 = $181&65535;
   $183 = (__Z12PatchAddresst($182)|0);
   $Result = $183;
   $184 = ($183|0)!=(0);
   if (!($184)) {
    break;
   }
   $185 = $Result;
   $0 = $185;
   $186 = $0;
   STACKTOP = sp;return ($186|0);
  }
 } while(0);
 $0 = 0;
 $186 = $0;
 STACKTOP = sp;return ($186|0);
}
function __Z12CompileCountv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 1;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 0;
   $7 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   $13 = (__Z8GetCommav()|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   }
   $16 = (__Z10Enter0Code16TInstructionCode(38)|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    $18 = $Result;
    $0 = $18;
    break;
   }
   $19 = (__Z23GetWriteEnterExpressionv()|0);
   $Result = $19;
   $20 = ($19|0)!=(0);
   if ($20) {
    $21 = $Result;
    $0 = $21;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $22 = $0;
 STACKTOP = sp;return ($22|0);
}
function __Z12CompileDebugv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = HEAP32[8>>2]|0;
 $2 = (($1) + 8|0);
 HEAP8[$2>>0] = 1;
 $3 = HEAP32[8>>2]|0;
 $4 = (($3) + 9|0);
 $5 = HEAP8[$4>>0]|0;
 $6 = $5&255;
 $7 = ($6|0)==(2);
 do {
  if ($7) {
   label = 4;
  } else {
   $8 = HEAP32[8>>2]|0;
   $9 = (($8) + 9|0);
   $10 = HEAP8[$9>>0]|0;
   $11 = $10&255;
   $12 = ($11|0)==(3);
   if ($12) {
    label = 4;
   } else {
    $13 = HEAP32[8>>2]|0;
    $14 = (($13) + 9|0);
    $15 = HEAP8[$14>>0]|0;
    $16 = $15&255;
    $17 = ($16|0)==(6);
    if ($17) {
     label = 4;
    } else {
     $21 = (__Z13EnterConstantth(240,1)|0);
     $Result = $21;
     $22 = ($21|0)!=(0);
     if ($22) {
      $23 = $Result;
      $0 = $23;
      break;
     } else {
      label = 10;
      break;
     }
    }
   }
  }
 } while(0);
 do {
  if ((label|0) == 4) {
   $18 = (__Z13EnterConstantth(84,1)|0);
   $Result = $18;
   $19 = ($18|0)!=(0);
   if ($19) {
    $20 = $Result;
    $0 = $20;
    break;
   } else {
    label = 10;
    break;
   }
  }
 } while(0);
 do {
  if ((label|0) == 10) {
   $24 = (__Z13EnterConstantth(16,1)|0);
   $Result = $24;
   $25 = ($24|0)!=(0);
   if ($25) {
    $26 = $Result;
    $0 = $26;
    break;
   }
   $27 = (__Z10Enter0Code16TInstructionCode(32)|0);
   $Result = $27;
   $28 = ($27|0)!=(0);
   if ($28) {
    $29 = $Result;
    $0 = $29;
    break;
   }
   $30 = (__Z21CompileOutputSequencev()|0);
   $Result = $30;
   $31 = ($30|0)!=(0);
   if ($31) {
    $32 = $Result;
    $0 = $32;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $33 = $0;
 STACKTOP = sp;return ($33|0);
}
function __Z14CompileDebugInv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = HEAP32[8>>2]|0;
 $2 = (($1) + 8|0);
 HEAP8[$2>>0] = 1;
 $3 = (__Z13EnterConstantth(1,1)|0);
 $Result = $3;
 $4 = ($3|0)!=(0);
 L1: do {
  if ($4) {
   $5 = $Result;
   $0 = $5;
  } else {
   $6 = HEAP32[8>>2]|0;
   $7 = (($6) + 9|0);
   $8 = HEAP8[$7>>0]|0;
   $9 = $8&255;
   $10 = ($9|0)==(2);
   do {
    if ($10) {
     label = 6;
    } else {
     $11 = HEAP32[8>>2]|0;
     $12 = (($11) + 9|0);
     $13 = HEAP8[$12>>0]|0;
     $14 = $13&255;
     $15 = ($14|0)==(3);
     if ($15) {
      label = 6;
     } else {
      $16 = HEAP32[8>>2]|0;
      $17 = (($16) + 9|0);
      $18 = HEAP8[$17>>0]|0;
      $19 = $18&255;
      $20 = ($19|0)==(6);
      if ($20) {
       label = 6;
      } else {
       $24 = (__Z13EnterConstantth(240,1)|0);
       $Result = $24;
       $25 = ($24|0)!=(0);
       if ($25) {
        $26 = $Result;
        $0 = $26;
        break L1;
       } else {
        break;
       }
      }
     }
    }
   } while(0);
   do {
    if ((label|0) == 6) {
     $21 = (__Z13EnterConstantth(84,1)|0);
     $Result = $21;
     $22 = ($21|0)!=(0);
     if ($22) {
      $23 = $Result;
      $0 = $23;
      break L1;
     } else {
      break;
     }
    }
   } while(0);
   $27 = (__Z13EnterConstantth(16,1)|0);
   $Result = $27;
   $28 = ($27|0)!=(0);
   if ($28) {
    $29 = $Result;
    $0 = $29;
    break;
   }
   $30 = (__Z10Enter0Code16TInstructionCode(34)|0);
   $Result = $30;
   $31 = ($30|0)!=(0);
   if ($31) {
    $32 = $Result;
    $0 = $32;
    break;
   }
   $33 = (__Z20CompileInputSequencev()|0);
   $Result = $33;
   $34 = ($33|0)!=(0);
   if ($34) {
    $35 = $Result;
    $0 = $35;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $36 = $0;
 STACKTOP = sp;return ($36|0);
}
function __Z9CompileDov() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $Element = 0, $Idx = 0, $MainPartLabel = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 12|0;
 $1 = HEAP8[258720>>0]|0;
 $2 = $1&255;
 $3 = ($2|0)==(16);
 if ($3) {
  $4 = (__Z5Error10TErrorCode(67)|0);
  $0 = $4;
  $91 = $0;
  STACKTOP = sp;return ($91|0);
 }
 $5 = HEAP8[238776>>0]|0;
 $6 = $5&255;
 $7 = (238784 + (($6*48)|0)|0);
 HEAP32[$7>>2] = 7;
 $8 = HEAP16[238720>>1]|0;
 $9 = $8&65535;
 $10 = (($9) - 1)|0;
 $11 = $10&65535;
 $12 = HEAP8[238776>>0]|0;
 $13 = $12&255;
 $14 = (238784 + (($13*48)|0)|0);
 $15 = (($14) + 4|0);
 HEAP16[$15>>1] = $11;
 $16 = HEAP16[258728>>1]|0;
 $17 = HEAP8[238776>>0]|0;
 $18 = $17&255;
 $19 = (238784 + (($18*48)|0)|0);
 $20 = (($19) + 12|0);
 HEAP16[$20>>1] = $16;
 $21 = HEAP8[238776>>0]|0;
 $22 = $21&255;
 $23 = (238784 + (($22*48)|0)|0);
 $24 = (($23) + 14|0);
 HEAP16[$24>>1] = 0;
 $Idx = 0;
 while(1) {
  $25 = $Idx;
  $26 = ($25|0)<(16);
  if (!($26)) {
   break;
  }
  $27 = $Idx;
  $28 = HEAP8[238776>>0]|0;
  $29 = $28&255;
  $30 = (238784 + (($29*48)|0)|0);
  $31 = (($30) + 16|0);
  $32 = (($31) + ($27<<1)|0);
  HEAP16[$32>>1] = 0;
  $33 = $Idx;
  $34 = (($33) + 1)|0;
  $Idx = $34;
 }
 $35 = HEAP8[238776>>0]|0;
 $36 = (($35) + 1)<<24>>24;
 HEAP8[238776>>0] = $36;
 $37 = HEAP8[258720>>0]|0;
 $38 = (($37) + 1)<<24>>24;
 HEAP8[258720>>0] = $38;
 (__Z14PreviewElementP12TElementList($Element)|0);
 $39 = HEAP32[$Element>>2]|0;
 $40 = ($39|0)!=(47);
 if ($40) {
  (__Z10GetElementP12TElementList($Element)|0);
  $41 = HEAP32[$Element>>2]|0;
  $42 = ($41|0)==(26);
  if (!($42)) {
   $43 = HEAP32[$Element>>2]|0;
   $44 = ($43|0)==(27);
   if (!($44)) {
    $45 = (__Z5Error10TErrorCode(70)|0);
    $0 = $45;
    $91 = $0;
    STACKTOP = sp;return ($91|0);
   }
  }
  HEAP8[241856>>0] = 0;
  $46 = (__Z19GetValueConditionalhhi(1,0,0)|0);
  $Result = $46;
  $47 = ($46|0)!=(0);
  if ($47) {
   $48 = $Result;
   $0 = $48;
   $91 = $0;
   STACKTOP = sp;return ($91|0);
  }
  $49 = (__Z15EnterExpressionhh(0,1)|0);
  $Result = $49;
  $50 = ($49|0)!=(0);
  if ($50) {
   $51 = $Result;
   $0 = $51;
   $91 = $0;
   STACKTOP = sp;return ($91|0);
  }
  $52 = (__Z10Enter0Code16TInstructionCode(13)|0);
  $Result = $52;
  $53 = ($52|0)!=(0);
  if ($53) {
   $54 = $Result;
   $0 = $54;
   $91 = $0;
   STACKTOP = sp;return ($91|0);
  }
  $55 = HEAP32[$Element>>2]|0;
  $56 = ($55|0)==(27);
  do {
   if ($56) {
    $57 = HEAP16[258728>>1]|0;
    $58 = HEAP8[238776>>0]|0;
    $59 = $58&255;
    $60 = (($59) - 1)|0;
    $61 = (238784 + (($60*48)|0)|0);
    $62 = (($61) + 14|0);
    HEAP16[$62>>1] = $57;
    $63 = HEAP16[258728>>1]|0;
    $64 = $63&65535;
    $65 = (($64) + 14)|0;
    $66 = $65&65535;
    HEAP16[258728>>1] = $66;
   } else {
    $67 = HEAP16[258728>>1]|0;
    $68 = $67&65535;
    $MainPartLabel = $68;
    $69 = HEAP16[258728>>1]|0;
    $70 = $69&65535;
    $71 = (($70) + 14)|0;
    $72 = $71&65535;
    HEAP16[258728>>1] = $72;
    $73 = (__Z10Enter0Code16TInstructionCode(9)|0);
    $Result = $73;
    $74 = ($73|0)!=(0);
    if ($74) {
     $75 = $Result;
     $0 = $75;
     $91 = $0;
     STACKTOP = sp;return ($91|0);
    }
    $76 = HEAP16[258728>>1]|0;
    $77 = HEAP8[238776>>0]|0;
    $78 = $77&255;
    $79 = (($78) - 1)|0;
    $80 = (238784 + (($79*48)|0)|0);
    $81 = (($80) + 14|0);
    HEAP16[$81>>1] = $76;
    $82 = HEAP16[258728>>1]|0;
    $83 = $82&65535;
    $84 = (($83) + 14)|0;
    $85 = $84&65535;
    HEAP16[258728>>1] = $85;
    $86 = $MainPartLabel;
    $87 = $86&65535;
    $88 = (__Z12PatchAddresst($87)|0);
    $Result = $88;
    $89 = ($88|0)!=(0);
    if (!($89)) {
     break;
    }
    $90 = $Result;
    $0 = $90;
    $91 = $0;
    STACKTOP = sp;return ($91|0);
   }
  } while(0);
 }
 $0 = 0;
 $91 = $0;
 STACKTOP = sp;return ($91|0);
}
function __Z14CompileDtmfoutv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $FoundBracket = 0, $Preview = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Preview = sp;
 $FoundBracket = sp + 20|0;
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 L1: do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   (__Z14PreviewElementP12TElementList($Preview)|0);
   $7 = HEAP32[$Preview>>2]|0;
   $8 = ($7|0)==(19);
   do {
    if ($8) {
     $9 = (__Z13EnterConstantth(50,1)|0);
     $Result = $9;
     $10 = ($9|0)!=(0);
     if ($10) {
      $11 = $Result;
      $0 = $11;
      break L1;
     }
     $12 = (__Z13EnterConstantth(200,1)|0);
     $Result = $12;
     $13 = ($12|0)!=(0);
     if ($13) {
      $14 = $Result;
      $0 = $14;
      break L1;
     } else {
      break;
     }
    } else {
     HEAP8[241856>>0] = 2;
     $15 = (__Z8GetValuehh(1,0)|0);
     $Result = $15;
     $16 = ($15|0)!=(0);
     if ($16) {
      $17 = $Result;
      $0 = $17;
      break L1;
     }
     $18 = (__Z8GetCommav()|0);
     $Result = $18;
     $19 = ($18|0)!=(0);
     if ($19) {
      $20 = $Result;
      $0 = $20;
      break L1;
     }
     HEAP8[241856>>0] = 1;
     $21 = (__Z23GetValueEnterExpressionhh(1,0)|0);
     $Result = $21;
     $22 = ($21|0)!=(0);
     if ($22) {
      $23 = $Result;
      $0 = $23;
      break L1;
     }
     $24 = (__Z8GetCommav()|0);
     $Result = $24;
     $25 = ($24|0)!=(0);
     if ($25) {
      $26 = $Result;
      $0 = $26;
      break L1;
     }
     $27 = (__Z15EnterExpressionhh(1,1)|0);
     $Result = $27;
     $28 = ($27|0)!=(0);
     if ($28) {
      $29 = $Result;
      $0 = $29;
      break L1;
     } else {
      break;
     }
    }
   } while(0);
   $30 = (__Z10Enter0Code16TInstructionCode(24)|0);
   $Result = $30;
   $31 = ($30|0)!=(0);
   if ($31) {
    $32 = $Result;
    $0 = $32;
    break;
   }
   $33 = (__Z14GetLeftBracketv()|0);
   $Result = $33;
   $34 = ($33|0)!=(0);
   if ($34) {
    $35 = $Result;
    $0 = $35;
    break;
   }
   while(1) {
    HEAP8[241856>>0] = 3;
    $36 = (__Z23GetValueEnterExpressionhh(0,0)|0);
    $Result = $36;
    $37 = ($36|0)!=(0);
    if ($37) {
     label = 28;
     break;
    }
    $39 = (__Z11EnterEEPROMht(1,0)|0);
    $Result = $39;
    $40 = ($39|0)!=(0);
    if ($40) {
     label = 30;
     break;
    }
    $42 = (__Z17GetCommaOrBracketPh($FoundBracket)|0);
    $Result = $42;
    $43 = ($42|0)!=(0);
    if ($43) {
     label = 32;
     break;
    }
    $45 = HEAP8[$FoundBracket>>0]|0;
    $46 = ($45<<24>>24)!=(0);
    $47 = $46 ^ 1;
    if (!($47)) {
     label = 35;
     break;
    }
   }
   if ((label|0) == 28) {
    $38 = $Result;
    $0 = $38;
    break;
   }
   else if ((label|0) == 30) {
    $41 = $Result;
    $0 = $41;
    break;
   }
   else if ((label|0) == 32) {
    $44 = $Result;
    $0 = $44;
    break;
   }
   else if ((label|0) == 35) {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $48 = $0;
 STACKTOP = sp;return ($48|0);
}
function __Z11CompileElsev() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = HEAP8[250432>>0]|0;
 $2 = $1&255;
 $3 = ($2|0)==(0);
 if ($3) {
  $4 = (__Z5Error10TErrorCode(63)|0);
  $0 = $4;
  $67 = $0;
  STACKTOP = sp;return ($67|0);
 }
 $5 = HEAP8[238776>>0]|0;
 $6 = $5&255;
 $7 = (($6) - 1)|0;
 $8 = (238784 + (($7*48)|0)|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($9|0)>(5);
 if ($10) {
  $11 = (__Z12NestingErrorv()|0);
  $0 = $11;
  $67 = $0;
  STACKTOP = sp;return ($67|0);
 }
 $12 = HEAP8[238776>>0]|0;
 $13 = $12&255;
 $14 = (($13) - 1)|0;
 $15 = (238784 + (($14*48)|0)|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = ($16|0)==(2);
 if (!($17)) {
  $18 = HEAP8[238776>>0]|0;
  $19 = $18&255;
  $20 = (($19) - 1)|0;
  $21 = (238784 + (($20*48)|0)|0);
  $22 = HEAP32[$21>>2]|0;
  $23 = ($22|0)==(5);
  if (!($23)) {
   $24 = HEAP8[238776>>0]|0;
   $25 = $24&255;
   $26 = (($25) - 1)|0;
   $27 = (238784 + (($26*48)|0)|0);
   $28 = HEAP32[$27>>2]|0;
   $29 = ($28|0)<(4);
   if ($29) {
    $30 = (__Z5Error10TErrorCode(66)|0);
    $0 = $30;
    $67 = $0;
    STACKTOP = sp;return ($67|0);
   } else {
    $31 = (__Z5Error10TErrorCode(65)|0);
    $0 = $31;
    $67 = $0;
    STACKTOP = sp;return ($67|0);
   }
  }
 }
 $32 = (__Z10Enter0Code16TInstructionCode(9)|0);
 $Result = $32;
 $33 = ($32|0)!=(0);
 if ($33) {
  $34 = $Result;
  $0 = $34;
  $67 = $0;
  STACKTOP = sp;return ($67|0);
 }
 $35 = HEAP16[258728>>1]|0;
 $36 = $35&65535;
 $37 = (($36) + 14)|0;
 $38 = $37&65535;
 HEAP16[258728>>1] = $38;
 $39 = (__Z15PatchSkipLabelsh(0)|0);
 $Result = $39;
 $40 = ($39|0)!=(0);
 if ($40) {
  $41 = $Result;
  $0 = $41;
  $67 = $0;
  STACKTOP = sp;return ($67|0);
 } else {
  $42 = HEAP16[258728>>1]|0;
  $43 = $42&65535;
  $44 = (($43) - 14)|0;
  $45 = $44&65535;
  $46 = HEAP8[238776>>0]|0;
  $47 = $46&255;
  $48 = (($47) - 1)|0;
  $49 = (238784 + (($48*48)|0)|0);
  $50 = (($49) + 14|0);
  HEAP16[$50>>1] = $45;
  $51 = HEAP8[238776>>0]|0;
  $52 = $51&255;
  $53 = (($52) - 1)|0;
  $54 = (238784 + (($53*48)|0)|0);
  $55 = HEAP32[$54>>2]|0;
  $56 = $55&255;
  $57 = $56&255;
  $58 = (($57) - 1)|0;
  $59 = HEAP8[238776>>0]|0;
  $60 = $59&255;
  $61 = (($60) - 1)|0;
  $62 = (238784 + (($61*48)|0)|0);
  HEAP32[$62>>2] = $58;
  $63 = HEAP8[238776>>0]|0;
  $64 = $63&255;
  $65 = (($64) - 1)|0;
  $66 = (238784 + (($65*48)|0)|0);
  HEAP32[$66>>2] = $58;
  $0 = 0;
  $67 = $0;
  STACKTOP = sp;return ($67|0);
 }
 return (0)|0;
}
function __Z10CompileEndv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = (__Z10Enter0Code16TInstructionCode(0)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 if ($2) {
  $3 = $Result;
  $0 = $3;
 } else {
  $0 = 0;
 }
 $4 = $0;
 STACKTOP = sp;return ($4|0);
}
function __Z12CompileEndIfv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = HEAP8[250432>>0]|0;
 $2 = $1&255;
 $3 = ($2|0)==(0);
 if ($3) {
  $4 = (__Z5Error10TErrorCode(64)|0);
  $0 = $4;
  $30 = $0;
  STACKTOP = sp;return ($30|0);
 }
 $5 = HEAP8[238776>>0]|0;
 $6 = $5&255;
 $7 = (($6) - 1)|0;
 $8 = (238784 + (($7*48)|0)|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($9|0)>(5);
 if ($10) {
  $11 = (__Z12NestingErrorv()|0);
  $0 = $11;
  $30 = $0;
  STACKTOP = sp;return ($30|0);
 }
 $12 = HEAP8[238776>>0]|0;
 $13 = $12&255;
 $14 = (($13) - 1)|0;
 $15 = (238784 + (($14*48)|0)|0);
 $16 = (($15) + 16|0);
 $17 = HEAP16[$16>>1]|0;
 $18 = $17&65535;
 $19 = ($18|0)>(0);
 do {
  if ($19) {
   $20 = (__Z15PatchSkipLabelsh(1)|0);
   $Result = $20;
   $21 = ($20|0)!=(0);
   if (!($21)) {
    break;
   }
   $22 = $Result;
   $0 = $22;
   $30 = $0;
   STACKTOP = sp;return ($30|0);
  }
 } while(0);
 $23 = (__Z15PatchSkipLabelsh(0)|0);
 $Result = $23;
 $24 = ($23|0)!=(0);
 if ($24) {
  $25 = $Result;
  $0 = $25;
  $30 = $0;
  STACKTOP = sp;return ($30|0);
 } else {
  $26 = HEAP8[238776>>0]|0;
  $27 = (($26) + -1)<<24>>24;
  HEAP8[238776>>0] = $27;
  $28 = HEAP8[250432>>0]|0;
  $29 = (($28) + -1)<<24>>24;
  HEAP8[250432>>0] = $29;
  $0 = 0;
  $30 = $0;
  STACKTOP = sp;return ($30|0);
 }
 return (0)|0;
}
function __Z16CompileEndSelectv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = HEAP8[250440>>0]|0;
 $2 = $1&255;
 $3 = ($2|0)==(0);
 do {
  if ($3) {
   $4 = (__Z5Error10TErrorCode(87)|0);
   $0 = $4;
  } else {
   $5 = HEAP8[238776>>0]|0;
   $6 = $5&255;
   $7 = (($6) - 1)|0;
   $8 = (238784 + (($7*48)|0)|0);
   $9 = HEAP32[$8>>2]|0;
   $10 = ($9|0)!=(8);
   if ($10) {
    $11 = (__Z12NestingErrorv()|0);
    $0 = $11;
    break;
   }
   $12 = HEAP8[238776>>0]|0;
   $13 = $12&255;
   $14 = (($13) - 1)|0;
   $15 = (238784 + (($14*48)|0)|0);
   $16 = (($15) + 14|0);
   $17 = HEAP16[$16>>1]|0;
   $18 = $17&65535;
   $19 = HEAP16[258728>>1]|0;
   $20 = $19&65535;
   $21 = (($20) - 14)|0;
   $22 = ($18|0)==($21|0);
   if ($22) {
    $23 = (__Z5Error10TErrorCode(113)|0);
    $0 = $23;
    break;
   }
   $24 = (__Z15PatchSkipLabelsh(0)|0);
   $Result = $24;
   $25 = ($24|0)!=(0);
   if ($25) {
    $26 = $Result;
    $0 = $26;
    break;
   }
   $27 = (__Z15PatchSkipLabelsh(1)|0);
   $Result = $27;
   $28 = ($27|0)!=(0);
   if ($28) {
    $29 = $Result;
    $0 = $29;
    break;
   } else {
    $30 = HEAP8[238776>>0]|0;
    $31 = (($30) + -1)<<24>>24;
    HEAP8[238776>>0] = $31;
    $32 = HEAP8[250440>>0]|0;
    $33 = (($32) + -1)<<24>>24;
    HEAP8[250440>>0] = $33;
    $0 = 0;
    break;
   }
  }
 } while(0);
 $34 = $0;
 STACKTOP = sp;return ($34|0);
}
function __Z11CompileExitv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Idx = 0, $Result = 0, $StackIdx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = HEAP8[258712>>0]|0;
 $2 = $1&255;
 $3 = ($2|0)==(0);
 if ($3) {
  $4 = HEAP8[258720>>0]|0;
  $5 = $4&255;
  $6 = ($5|0)==(0);
  if ($6) {
   $7 = (__Z5Error10TErrorCode(71)|0);
   $0 = $7;
   $51 = $0;
   STACKTOP = sp;return ($51|0);
  }
 }
 $8 = HEAP8[238776>>0]|0;
 $9 = $8&255;
 $10 = (($9) - 1)|0;
 $StackIdx = $10;
 while(1) {
  $11 = $StackIdx;
  $12 = ($11|0)>(0);
  if ($12) {
   $13 = $StackIdx;
   $14 = (238784 + (($13*48)|0)|0);
   $15 = HEAP32[$14>>2]|0;
   $16 = ($15|0)!=(7);
   if ($16) {
    $17 = $StackIdx;
    $18 = (238784 + (($17*48)|0)|0);
    $19 = HEAP32[$18>>2]|0;
    $20 = ($19|0)!=(6);
    $53 = $20;
   } else {
    $53 = 0;
   }
   $52 = $53;
  } else {
   $52 = 0;
  }
  if (!($52)) {
   break;
  }
  $21 = $StackIdx;
  $22 = (($21) + -1)|0;
  $StackIdx = $22;
 }
 $Idx = 0;
 while(1) {
  $23 = $Idx;
  $24 = ($23|0)<(16);
  if ($24) {
   $25 = $Idx;
   $26 = $StackIdx;
   $27 = (238784 + (($26*48)|0)|0);
   $28 = (($27) + 16|0);
   $29 = (($28) + ($25<<1)|0);
   $30 = HEAP16[$29>>1]|0;
   $31 = $30&65535;
   $32 = ($31|0)!=(0);
   $54 = $32;
  } else {
   $54 = 0;
  }
  if (!($54)) {
   break;
  }
  $33 = $Idx;
  $34 = (($33) + 1)|0;
  $Idx = $34;
 }
 $35 = $Idx;
 $36 = ($35|0)==(16);
 if ($36) {
  $37 = (__Z5Error10TErrorCode(75)|0);
  $0 = $37;
  $51 = $0;
  STACKTOP = sp;return ($51|0);
 }
 $38 = (__Z10Enter0Code16TInstructionCode(9)|0);
 $Result = $38;
 $39 = ($38|0)!=(0);
 if ($39) {
  $40 = $Result;
  $0 = $40;
  $51 = $0;
  STACKTOP = sp;return ($51|0);
 } else {
  $41 = HEAP16[258728>>1]|0;
  $42 = $Idx;
  $43 = $StackIdx;
  $44 = (238784 + (($43*48)|0)|0);
  $45 = (($44) + 16|0);
  $46 = (($45) + ($42<<1)|0);
  HEAP16[$46>>1] = $41;
  $47 = HEAP16[258728>>1]|0;
  $48 = $47&65535;
  $49 = (($48) + 14)|0;
  $50 = $49&65535;
  HEAP16[258728>>1] = $50;
  $0 = 0;
  $51 = $0;
  STACKTOP = sp;return ($51|0);
 }
 return (0)|0;
}
function __Z10CompileForv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Element = 0, $Idx = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 8|0;
 $1 = HEAP8[258712>>0]|0;
 $2 = $1&255;
 $3 = ($2|0)==(16);
 if ($3) {
  $4 = (__Z5Error10TErrorCode(48)|0);
  $0 = $4;
  $54 = $0;
  STACKTOP = sp;return ($54|0);
 }
 $5 = HEAP8[238776>>0]|0;
 $6 = $5&255;
 $7 = (238784 + (($6*48)|0)|0);
 HEAP32[$7>>2] = 6;
 $8 = HEAP16[238720>>1]|0;
 $9 = $8&65535;
 $10 = (($9) - 1)|0;
 $11 = $10&65535;
 $12 = HEAP8[238776>>0]|0;
 $13 = $12&255;
 $14 = (238784 + (($13*48)|0)|0);
 $15 = (($14) + 4|0);
 HEAP16[$15>>1] = $11;
 $Idx = 0;
 while(1) {
  $16 = $Idx;
  $17 = ($16|0)<(16);
  if (!($17)) {
   break;
  }
  $18 = $Idx;
  $19 = HEAP8[238776>>0]|0;
  $20 = $19&255;
  $21 = (238784 + (($20*48)|0)|0);
  $22 = (($21) + 16|0);
  $23 = (($22) + ($18<<1)|0);
  HEAP16[$23>>1] = 0;
  $24 = $Idx;
  $25 = (($24) + 1)|0;
  $Idx = $25;
 }
 $26 = (__Z10CompileLetv()|0);
 $Result = $26;
 $27 = ($26|0)!=(0);
 if ($27) {
  $28 = $Result;
  $0 = $28;
  $54 = $0;
  STACKTOP = sp;return ($54|0);
 }
 $29 = HEAP16[258728>>1]|0;
 $30 = HEAP8[238776>>0]|0;
 $31 = $30&255;
 $32 = (238784 + (($31*48)|0)|0);
 $33 = (($32) + 12|0);
 HEAP16[$33>>1] = $29;
 $34 = HEAP8[238776>>0]|0;
 $35 = (($34) + 1)<<24>>24;
 HEAP8[238776>>0] = $35;
 $36 = HEAP8[258712>>0]|0;
 $37 = (($36) + 1)<<24>>24;
 HEAP8[258712>>0] = $37;
 $38 = (__Z5GetTOv()|0);
 $Result = $38;
 $39 = ($38|0)!=(0);
 if ($39) {
  $40 = $Result;
  $0 = $40;
  $54 = $0;
  STACKTOP = sp;return ($54|0);
 }
 HEAP8[241856>>0] = 0;
 $41 = (__Z19GetValueConditionalhhi(0,0,0)|0);
 $Result = $41;
 $42 = ($41|0)!=(0);
 if ($42) {
  $43 = $Result;
  $0 = $43;
  $54 = $0;
  STACKTOP = sp;return ($54|0);
 }
 (__Z10GetElementP12TElementList($Element)|0);
 $44 = HEAP32[$Element>>2]|0;
 $45 = ($44|0)!=(47);
 do {
  if ($45) {
   $46 = HEAP32[$Element>>2]|0;
   $47 = ($46|0)!=(23);
   if ($47) {
    $48 = (__Z5Error10TErrorCode(33)|0);
    $0 = $48;
    $54 = $0;
    STACKTOP = sp;return ($54|0);
   }
   HEAP8[241856>>0] = 0;
   $49 = (__Z19GetValueConditionalhhi(0,0,0)|0);
   $Result = $49;
   $50 = ($49|0)!=(0);
   if (!($50)) {
    break;
   }
   $51 = $Result;
   $0 = $51;
   $54 = $0;
   STACKTOP = sp;return ($54|0);
  } else {
   $52 = HEAP16[238720>>1]|0;
   $53 = (($52) + -1)<<16>>16;
   HEAP16[238720>>1] = $53;
  }
 } while(0);
 $0 = 0;
 $54 = $0;
 STACKTOP = sp;return ($54|0);
}
function __Z14CompileFreqoutv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Preview = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Preview = sp;
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 L1: do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 1;
   $7 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z8GetCommav()|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   HEAP8[241856>>0] = 2;
   $13 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   }
   (__Z14PreviewElementP12TElementList($Preview)|0);
   $16 = HEAP32[$Preview>>2]|0;
   $17 = ($16|0)==(14);
   do {
    if ($17) {
     $18 = HEAP16[238720>>1]|0;
     $19 = (($18) + 1)<<16>>16;
     HEAP16[238720>>1] = $19;
     HEAP8[241856>>0] = 3;
     $20 = (__Z23GetValueEnterExpressionhh(1,0)|0);
     $Result = $20;
     $21 = ($20|0)!=(0);
     if ($21) {
      $22 = $Result;
      $0 = $22;
      break L1;
     }
     $23 = (__Z10Enter0Code16TInstructionCode(23)|0);
     $Result = $23;
     $24 = ($23|0)!=(0);
     if ($24) {
      $25 = $Result;
      $0 = $25;
      break L1;
     } else {
      break;
     }
    } else {
     $26 = (__Z10Enter0Code16TInstructionCode(22)|0);
     $Result = $26;
     $27 = ($26|0)!=(0);
     if ($27) {
      $28 = $Result;
      $0 = $28;
      break L1;
     } else {
      break;
     }
    }
   } while(0);
   $0 = 0;
  }
 } while(0);
 $29 = $0;
 STACKTOP = sp;return ($29|0);
}
function __Z10CompileGetv() {
 var $$byval_copy = 0, $$byval_copy1 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0;
 var $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0;
 var $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0;
 var $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0;
 var $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0;
 var $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0;
 var $204 = 0, $205 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0;
 var $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0;
 var $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0;
 var $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0;
 var $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $Element = 0, $Idx = 0, $PrevElement = 0, $Result = 0, $Temp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy1 = sp;
 $$byval_copy = sp + 40|0;
 $Element = sp + 12|0;
 $1 = sp + 52|0;
 $2 = sp + 24|0;
 $Temp = 0;
 $Idx = 0;
 HEAP8[241856>>0] = 0;
 $3 = (__Z23GetValueEnterExpressionhh(1,0)|0);
 $Result = $3;
 $4 = ($3|0)!=(0);
 if ($4) {
  $5 = $Result;
  $0 = $5;
  $205 = $0;
  STACKTOP = sp;return ($205|0);
 }
 __Z14CopyExpressionhh(0,1);
 $6 = (__Z10Enter0Code16TInstructionCode(27)|0);
 $Result = $6;
 $7 = ($6|0)!=(0);
 if ($7) {
  $8 = $Result;
  $0 = $8;
  $205 = $0;
  STACKTOP = sp;return ($205|0);
 }
 $9 = (__Z8GetCommav()|0);
 $Result = $9;
 $10 = ($9|0)!=(0);
 if ($10) {
  $11 = $Result;
  $0 = $11;
  $205 = $0;
  STACKTOP = sp;return ($205|0);
 }
 while(1) {
  $12 = HEAP8[238424>>0]|0;
  $13 = ($12<<24>>24)!=(0);
  if ($13) {
   $14 = (__Z14PreviewElementP12TElementList($Element)|0);
   $15 = ($14<<24>>24)!=(0);
   if ($15) {
    $16 = HEAP32[$Element>>2]|0;
    $17 = ($16|0)==(6);
    if ($17) {
     (__Z10GetElementP12TElementList($Element)|0);
     $18 = (($Element) + 4|0);
     $19 = HEAP16[$18>>1]|0;
     $20 = $19&65535;
     $21 = ($20|0)!=(3);
     if ($21) {
      label = 12;
      break;
     }
     $23 = HEAP16[238720>>1]|0;
     $24 = $23&65535;
     $Temp = $24;
    }
   }
  }
  HEAP8[241856>>0] = 1;
  $25 = (__Z23GetWriteEnterExpressionv()|0);
  $Result = $25;
  $26 = ($25|0)!=(0);
  if ($26) {
   label = 15;
   break;
  }
  $28 = $Temp;
  $29 = ($28|0)>(0);
  if ($29) {
   $30 = HEAP16[238720>>1]|0;
   $31 = $30&65535;
   $PrevElement = $31;
   $32 = $Temp;
   $33 = $32&65535;
   HEAP16[238720>>1] = $33;
   $34 = (__Z10GetElementP12TElementList($Element)|0);
   $35 = ($34<<24>>24)!=(0);
   if ($35) {
    $36 = (($Element) + 4|0);
    $37 = HEAP16[$36>>1]|0;
    $38 = $37&65535;
    $39 = $38 & 3840;
    $40 = ($39|0)!=(768);
    if ($40) {
     label = 19;
     break;
    }
   }
   $42 = (($Element) + 6|0);
   $43 = HEAP16[$42>>1]|0;
   $44 = $43&65535;
   $Temp = $44;
   $45 = (__Z10GetElementP12TElementList($Element)|0);
   $46 = ($45<<24>>24)!=(0);
   if ($46) {
    $47 = HEAP32[$Element>>2]|0;
    $48 = ($47|0)==(13);
    if ($48) {
     label = 22;
     break;
    }
   }
   $64 = $PrevElement;
   $65 = $64&65535;
   HEAP16[238720>>1] = $65;
   __Z14CopyExpressionhh(0,2);
   __Z14CopyExpressionhh(1,0);
   $66 = $Idx;
   $67 = (($66) + 1)|0;
   $Idx = $67;
   $68 = $Idx;
   $69 = $68&65535;
   $70 = (($Element) + 4|0);
   HEAP16[$70>>1] = $69;
   ;HEAP32[$1+0>>2]=HEAP32[$Element+0>>2]|0;HEAP32[$1+4>>2]=HEAP32[$Element+4>>2]|0;HEAP32[$1+8>>2]=HEAP32[$Element+8>>2]|0;
   ;HEAP32[$$byval_copy+0>>2]=HEAP32[$1+0>>2]|0;HEAP32[$$byval_copy+4>>2]=HEAP32[$1+4>>2]|0;HEAP32[$$byval_copy+8>>2]=HEAP32[$1+8>>2]|0;
   $71 = (__Z23EnterExpressionConstant12TElementList($$byval_copy)|0);
   $Result = $71;
   $72 = ($71|0)!=(0);
   if ($72) {
    label = 24;
    break;
   }
   $74 = (__Z23EnterExpressionOperatorh(15)|0);
   $Result = $74;
   $75 = ($74|0)!=(0);
   if ($75) {
    label = 26;
    break;
   }
   $77 = (__Z15EnterExpressionhh(0,1)|0);
   $Result = $77;
   $78 = ($77|0)!=(0);
   if ($78) {
    label = 28;
    break;
   }
   $80 = (__Z10Enter0Code16TInstructionCode(27)|0);
   $Result = $80;
   $81 = ($80|0)!=(0);
   if ($81) {
    label = 30;
    break;
   }
   __Z14CopyExpressionhh(2,0);
   $83 = HEAP16[238456>>1]|0;
   $84 = $83&65535;
   $85 = (($84) - 10)|0;
   $86 = (($85|0) / 16)&-1;
   $87 = (($86) + 1)|0;
   $88 = (238456 + ($87<<1)|0);
   $89 = HEAP16[$88>>1]|0;
   $90 = $89&65535;
   $91 = HEAP16[238456>>1]|0;
   $92 = $91&65535;
   $93 = (($92) - 10)|0;
   $94 = (($93|0) % 16)&-1;
   $95 = (16 - ($94))|0;
   $96 = 1 << $95;
   $97 = (($96) - 1)|0;
   $98 = $90 & $97;
   $Temp = $98;
   $99 = HEAP16[238456>>1]|0;
   $100 = $99&65535;
   $101 = (($100) - 10)|0;
   $102 = (($101|0) % 16)&-1;
   $103 = (16 - ($102))|0;
   $104 = ($103|0)<(10);
   if ($104) {
    $105 = $Temp;
    $106 = HEAP16[238456>>1]|0;
    $107 = $106&65535;
    $108 = (($107) - 10)|0;
    $109 = (($108|0) % 16)&-1;
    $110 = (16 - ($109))|0;
    $111 = (10 - ($110))|0;
    $112 = $105 << $111;
    $113 = HEAP16[238456>>1]|0;
    $114 = $113&65535;
    $115 = (($114|0) / 16)&-1;
    $116 = (($115) + 1)|0;
    $117 = (238456 + ($116<<1)|0);
    $118 = HEAP16[$117>>1]|0;
    $119 = $118&65535;
    $120 = (($112) + ($119))|0;
    $Temp = $120;
   }
   $121 = HEAP16[238456>>1]|0;
   $122 = $121&65535;
   $123 = (($122) - 10)|0;
   $124 = (($123|0) / 16)&-1;
   $125 = (($124) + 1)|0;
   $126 = (238456 + ($125<<1)|0);
   $127 = HEAP16[$126>>1]|0;
   $128 = $127&65535;
   $129 = HEAP16[238456>>1]|0;
   $130 = $129&65535;
   $131 = (($130) - 10)|0;
   $132 = (($131|0) % 16)&-1;
   $133 = (16 - ($132))|0;
   $134 = $128 >> $133;
   $135 = $134&65535;
   $136 = HEAP16[238456>>1]|0;
   $137 = $136&65535;
   $138 = (($137) - 10)|0;
   $139 = (($138|0) / 16)&-1;
   $140 = (($139) + 1)|0;
   $141 = (238456 + ($140<<1)|0);
   HEAP16[$141>>1] = $135;
   $142 = HEAP16[238456>>1]|0;
   $143 = $142&65535;
   $144 = (($143) - 10)|0;
   $145 = $144&65535;
   HEAP16[238456>>1] = $145;
   $146 = HEAP16[238456>>1]|0;
   $147 = $146&65535;
   $148 = ($147|0)>(0);
   if ($148) {
    $149 = (__Z19EnterExpressionBitsht(7,66)|0);
    $Result = $149;
    $150 = ($149|0)!=(0);
    if ($150) {
     label = 35;
     break;
    }
    $152 = (__Z23EnterExpressionOperatorh(18)|0);
    $Result = $152;
    $153 = ($152|0)!=(0);
    if ($153) {
     label = 37;
     break;
    }
    $155 = (__Z19EnterExpressionBitsht(1,1)|0);
    $Result = $155;
    $156 = ($155|0)!=(0);
    if ($156) {
     label = 39;
     break;
    }
   }
   $158 = $Temp;
   $159 = $158 & 992;
   $160 = $159 << 1;
   $161 = $Temp;
   $162 = $161 & 15;
   $163 = $162<<1;
   $164 = (($163) + 1)|0;
   $165 = (($160) + ($164))|0;
   $166 = $165&65535;
   $167 = (__Z19EnterExpressionBitsht(11,$166)|0);
   $Result = $167;
   $168 = ($167|0)!=(0);
   if ($168) {
    label = 42;
    break;
   }
   $170 = (__Z15EnterExpressionhh(0,0)|0);
   $Result = $170;
   $171 = ($170|0)!=(0);
   if ($171) {
    label = 44;
    break;
   }
   $173 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $173;
   $174 = ($173|0)!=(0);
   if ($174) {
    label = 46;
    break;
   }
  }
  $176 = $Idx;
  $177 = (($176) + 1)|0;
  $Idx = $177;
  $Temp = 0;
  $178 = HEAP8[238424>>0]|0;
  $179 = ($178<<24>>24)!=(0);
  if ($179) {
   (__Z14PreviewElementP12TElementList($Element)|0);
  } else {
   HEAP32[$Element>>2] = 47;
  }
  $180 = HEAP32[$Element>>2]|0;
  $181 = ($180|0)==(14);
  if ($181) {
   __Z14CopyExpressionhh(1,0);
   $182 = $Idx;
   $183 = $182&65535;
   $184 = (($Element) + 4|0);
   HEAP16[$184>>1] = $183;
   ;HEAP32[$2+0>>2]=HEAP32[$Element+0>>2]|0;HEAP32[$2+4>>2]=HEAP32[$Element+4>>2]|0;HEAP32[$2+8>>2]=HEAP32[$Element+8>>2]|0;
   ;HEAP32[$$byval_copy1+0>>2]=HEAP32[$2+0>>2]|0;HEAP32[$$byval_copy1+4>>2]=HEAP32[$2+4>>2]|0;HEAP32[$$byval_copy1+8>>2]=HEAP32[$2+8>>2]|0;
   $185 = (__Z23EnterExpressionConstant12TElementList($$byval_copy1)|0);
   $Result = $185;
   $186 = ($185|0)!=(0);
   if ($186) {
    label = 53;
    break;
   }
   $188 = (__Z23EnterExpressionOperatorh(15)|0);
   $Result = $188;
   $189 = ($188|0)!=(0);
   if ($189) {
    label = 55;
    break;
   }
   $191 = (__Z15EnterExpressionhh(0,1)|0);
   $Result = $191;
   $192 = ($191|0)!=(0);
   if ($192) {
    label = 57;
    break;
   }
   $194 = (__Z10Enter0Code16TInstructionCode(27)|0);
   $Result = $194;
   $195 = ($194|0)!=(0);
   if ($195) {
    label = 59;
    break;
   }
   $197 = (__Z8GetCommav()|0);
   $Result = $197;
   $198 = ($197|0)!=(0);
   if ($198) {
    label = 61;
    break;
   }
  }
  $200 = HEAP32[$Element>>2]|0;
  $201 = ($200|0)==(14);
  if (!($201)) {
   label = 65;
   break;
  }
 }
 switch (label|0) {
  case 12: {
   $22 = (__Z5Error10TErrorCode(76)|0);
   $0 = $22;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 15: {
   $27 = $Result;
   $0 = $27;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 19: {
   $41 = (__Z5Error10TErrorCode(77)|0);
   $0 = $41;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 22: {
   (__Z10GetElementP12TElementList($Element)|0);
   $49 = $Temp;
   $50 = HEAP32[8>>2]|0;
   $51 = (($50) + 92|0);
   HEAP32[$51>>2] = $49;
   $52 = (($Element) + 6|0);
   $53 = HEAP16[$52>>1]|0;
   $54 = $53&65535;
   $55 = $Temp;
   $56 = (($54) - ($55))|0;
   $57 = (($Element) + 8|0);
   $58 = HEAP8[$57>>0]|0;
   $59 = $58&255;
   $60 = (($56) + ($59))|0;
   $61 = HEAP32[8>>2]|0;
   $62 = (($61) + 96|0);
   HEAP32[$62>>2] = $60;
   $63 = (__Z5Error10TErrorCode(77)|0);
   $0 = $63;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 24: {
   $73 = $Result;
   $0 = $73;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 26: {
   $76 = $Result;
   $0 = $76;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 28: {
   $79 = $Result;
   $0 = $79;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 30: {
   $82 = $Result;
   $0 = $82;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 35: {
   $151 = $Result;
   $0 = $151;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 37: {
   $154 = $Result;
   $0 = $154;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 39: {
   $157 = $Result;
   $0 = $157;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 42: {
   $169 = $Result;
   $0 = $169;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 44: {
   $172 = $Result;
   $0 = $172;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 46: {
   $175 = $Result;
   $0 = $175;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 53: {
   $187 = $Result;
   $0 = $187;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 55: {
   $190 = $Result;
   $0 = $190;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 57: {
   $193 = $Result;
   $0 = $193;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 59: {
   $196 = $Result;
   $0 = $196;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 61: {
   $199 = $Result;
   $0 = $199;
   $205 = $0;
   STACKTOP = sp;return ($205|0);
   break;
  }
  case 65: {
   $202 = HEAP32[$Element>>2]|0;
   $203 = ($202|0)!=(47);
   if ($203) {
    (__Z10GetElementP12TElementList($Element)|0);
    $204 = (__Z5Error10TErrorCode(32)|0);
    $0 = $204;
    $205 = $0;
    STACKTOP = sp;return ($205|0);
   } else {
    $0 = 0;
    $205 = $0;
    STACKTOP = sp;return ($205|0);
   }
   break;
  }
 }
 return (0)|0;
}
function __Z12CompileGosubv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = (__Z10Enter0Code16TInstructionCode(10)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = HEAP16[238408>>1]|0;
   $5 = (($4) + 1)<<16>>16;
   HEAP16[238408>>1] = $5;
   $6 = HEAP16[238408>>1]|0;
   $7 = (__Z11EnterEEPROMht(8,$6)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z15GetAddressEnterv()|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   $13 = HEAP16[238408>>1]|0;
   $14 = $13&65535;
   $15 = ($14*14)|0;
   $16 = $15&65535;
   $17 = (__Z12PatchAddresst($16)|0);
   $Result = $17;
   $18 = ($17|0)!=(0);
   if ($18) {
    $19 = $Result;
    $0 = $19;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $20 = $0;
 STACKTOP = sp;return ($20|0);
}
function __Z11CompileGotov() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = (__Z10Enter0Code16TInstructionCode(9)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z15GetAddressEnterv()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $7 = $0;
 STACKTOP = sp;return ($7|0);
}
function __Z11CompileHighv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(5)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $7 = $0;
 STACKTOP = sp;return ($7|0);
}
function __Z12CompileI2cinv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Low = 0;
 var $Preview = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Preview = sp;
 $Low = 0;
 HEAP8[241856>>0] = 3;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 L1: do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 2;
   $7 = (__Z8GetValuehh(2,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z8GetCommav()|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   (__Z14PreviewElementP12TElementList($Preview)|0);
   $13 = HEAP32[$Preview>>2]|0;
   $14 = ($13|0)!=(19);
   do {
    if ($14) {
     HEAP8[241856>>0] = 1;
     $15 = (__Z8GetValuehh(3,0)|0);
     $Result = $15;
     $16 = ($15|0)!=(0);
     if ($16) {
      $17 = $Result;
      $0 = $17;
      break L1;
     }
     $18 = (__Z14CheckBackslashv()|0);
     $19 = ($18<<24>>24)!=(0);
     do {
      if ($19) {
       HEAP8[241856>>0] = 0;
       $20 = (__Z23GetValueEnterExpressionhh(1,0)|0);
       $Result = $20;
       $21 = ($20|0)!=(0);
       if ($21) {
        $22 = $Result;
        $0 = $22;
        break L1;
       } else {
        $Low = 1;
        break;
       }
      }
     } while(0);
     $23 = (__Z8GetCommav()|0);
     $Result = $23;
     $24 = ($23|0)!=(0);
     if ($24) {
      $25 = $Result;
      $0 = $25;
      break L1;
     }
     $26 = (__Z15EnterExpressionhh(3,1)|0);
     $Result = $26;
     $27 = ($26|0)!=(0);
     if ($27) {
      $28 = $Result;
      $0 = $28;
      break L1;
     }
     $29 = (__Z15EnterExpressionhh(2,1)|0);
     $Result = $29;
     $30 = ($29|0)!=(0);
     if ($30) {
      $31 = $Result;
      $0 = $31;
      break L1;
     } else {
      break;
     }
    } else {
     $32 = (__Z15EnterExpressionhh(2,1)|0);
     $Result = $32;
     $33 = ($32|0)!=(0);
     if ($33) {
      $34 = $Result;
      $0 = $34;
      break L1;
     }
     $35 = (__Z13EnterConstantth(0,1)|0);
     $Result = $35;
     $36 = ($35|0)!=(0);
     if ($36) {
      $37 = $Result;
      $0 = $37;
      break L1;
     } else {
      break;
     }
    }
   } while(0);
   $38 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $38;
   $39 = ($38|0)!=(0);
   if ($39) {
    $40 = $Result;
    $0 = $40;
    break;
   }
   $41 = $Low;
   $42 = ($41<<24>>24)!=(0);
   do {
    if ($42) {
     $43 = (__Z10Enter0Code16TInstructionCode(47)|0);
     $Result = $43;
     $44 = ($43|0)!=(0);
     if ($44) {
      $45 = $Result;
      $0 = $45;
      break L1;
     } else {
      break;
     }
    } else {
     $46 = (__Z10Enter0Code16TInstructionCode(48)|0);
     $Result = $46;
     $47 = ($46|0)!=(0);
     if ($47) {
      $48 = $Result;
      $0 = $48;
      break L1;
     } else {
      break;
     }
    }
   } while(0);
   $49 = (__Z14GetLeftBracketv()|0);
   $Result = $49;
   $50 = ($49|0)!=(0);
   if ($50) {
    $51 = $Result;
    $0 = $51;
    break;
   }
   $52 = (__Z20CompileInputSequencev()|0);
   $Result = $52;
   $53 = ($52|0)!=(0);
   if ($53) {
    $54 = $Result;
    $0 = $54;
    break;
   }
   $55 = (__Z15GetRightBracketv()|0);
   $Result = $55;
   $56 = ($55|0)!=(0);
   if ($56) {
    $57 = $Result;
    $0 = $57;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $58 = $0;
 STACKTOP = sp;return ($58|0);
}
function __Z13CompileI2coutv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Low = 0;
 var $Preview = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Preview = sp;
 $Low = 0;
 HEAP8[241856>>0] = 3;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 L1: do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 2;
   $7 = (__Z8GetValuehh(2,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z8GetCommav()|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   (__Z14PreviewElementP12TElementList($Preview)|0);
   $13 = HEAP32[$Preview>>2]|0;
   $14 = ($13|0)!=(19);
   do {
    if ($14) {
     HEAP8[241856>>0] = 1;
     $15 = (__Z8GetValuehh(3,0)|0);
     $Result = $15;
     $16 = ($15|0)!=(0);
     if ($16) {
      $17 = $Result;
      $0 = $17;
      break L1;
     }
     $18 = (__Z14CheckBackslashv()|0);
     $19 = ($18<<24>>24)!=(0);
     do {
      if ($19) {
       HEAP8[241856>>0] = 0;
       $20 = (__Z23GetValueEnterExpressionhh(1,0)|0);
       $Result = $20;
       $21 = ($20|0)!=(0);
       if ($21) {
        $22 = $Result;
        $0 = $22;
        break L1;
       } else {
        $Low = 1;
        break;
       }
      }
     } while(0);
     $23 = (__Z8GetCommav()|0);
     $Result = $23;
     $24 = ($23|0)!=(0);
     if ($24) {
      $25 = $Result;
      $0 = $25;
      break L1;
     }
     $26 = (__Z15EnterExpressionhh(3,1)|0);
     $Result = $26;
     $27 = ($26|0)!=(0);
     if ($27) {
      $28 = $Result;
      $0 = $28;
      break L1;
     }
     $29 = (__Z15EnterExpressionhh(2,1)|0);
     $Result = $29;
     $30 = ($29|0)!=(0);
     if ($30) {
      $31 = $Result;
      $0 = $31;
      break L1;
     } else {
      break;
     }
    } else {
     $32 = (__Z15EnterExpressionhh(2,1)|0);
     $Result = $32;
     $33 = ($32|0)!=(0);
     if ($33) {
      $34 = $Result;
      $0 = $34;
      break L1;
     }
     $35 = (__Z13EnterConstantth(0,1)|0);
     $Result = $35;
     $36 = ($35|0)!=(0);
     if ($36) {
      $37 = $Result;
      $0 = $37;
      break L1;
     } else {
      break;
     }
    }
   } while(0);
   $38 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $38;
   $39 = ($38|0)!=(0);
   if ($39) {
    $40 = $Result;
    $0 = $40;
    break;
   }
   $41 = $Low;
   $42 = ($41<<24>>24)!=(0);
   do {
    if ($42) {
     $43 = (__Z10Enter0Code16TInstructionCode(49)|0);
     $Result = $43;
     $44 = ($43|0)!=(0);
     if ($44) {
      $45 = $Result;
      $0 = $45;
      break L1;
     } else {
      break;
     }
    } else {
     $46 = (__Z10Enter0Code16TInstructionCode(50)|0);
     $Result = $46;
     $47 = ($46|0)!=(0);
     if ($47) {
      $48 = $Result;
      $0 = $48;
      break L1;
     } else {
      break;
     }
    }
   } while(0);
   $49 = (__Z14GetLeftBracketv()|0);
   $Result = $49;
   $50 = ($49|0)!=(0);
   if ($50) {
    $51 = $Result;
    $0 = $51;
    break;
   }
   $52 = (__Z21CompileOutputSequencev()|0);
   $Result = $52;
   $53 = ($52|0)!=(0);
   if ($53) {
    $54 = $Result;
    $0 = $54;
    break;
   }
   $55 = (__Z15GetRightBracketv()|0);
   $Result = $55;
   $56 = ($55|0)!=(0);
   if ($56) {
    $57 = $Result;
    $0 = $57;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $58 = $0;
 STACKTOP = sp;return ($58|0);
}
function __Z9CompileIfh($ElseIf) {
 $ElseIf = $ElseIf|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0;
 var $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0;
 var $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0;
 var $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0;
 var $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $Element = 0, $Element2 = 0, $Enhanced = 0, $MainPartLabel = 0, $Result = 0, $TempIdx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 16|0;
 $Element2 = sp + 4|0;
 $1 = $ElseIf;
 $2 = HEAP8[238424>>0]|0;
 $Enhanced = $2;
 $3 = $1;
 $4 = ($3<<24>>24)!=(0);
 do {
  if ($4) {
   $45 = HEAP8[250432>>0]|0;
   $46 = $45&255;
   $47 = ($46|0)==(0);
   if ($47) {
    $48 = (__Z5Error10TErrorCode(115)|0);
    $0 = $48;
    $189 = $0;
    STACKTOP = sp;return ($189|0);
   }
   $TempIdx = 0;
   while(1) {
    $49 = $TempIdx;
    $50 = ($49|0)<(16);
    if ($50) {
     $51 = $TempIdx;
     $52 = HEAP8[238776>>0]|0;
     $53 = $52&255;
     $54 = (($53) - 1)|0;
     $55 = (238784 + (($54*48)|0)|0);
     $56 = (($55) + 16|0);
     $57 = (($56) + ($51<<1)|0);
     $58 = HEAP16[$57>>1]|0;
     $59 = $58&65535;
     $60 = ($59|0)!=(0);
     $191 = $60;
    } else {
     $191 = 0;
    }
    if (!($191)) {
     break;
    }
    $61 = $TempIdx;
    $62 = (($61) + 1)|0;
    $TempIdx = $62;
   }
   $63 = $TempIdx;
   $64 = ($63|0)==(16);
   if ($64) {
    $65 = (__Z5Error10TErrorCode(116)|0);
    $0 = $65;
    $189 = $0;
    STACKTOP = sp;return ($189|0);
   }
   $66 = HEAP8[238776>>0]|0;
   $67 = $66&255;
   $68 = (($67) - 1)|0;
   $69 = (238784 + (($68*48)|0)|0);
   $70 = HEAP32[$69>>2]|0;
   $71 = ($70|0)>(5);
   if ($71) {
    $72 = (__Z12NestingErrorv()|0);
    $0 = $72;
    $189 = $0;
    STACKTOP = sp;return ($189|0);
   }
   $73 = HEAP8[238776>>0]|0;
   $74 = $73&255;
   $75 = (($74) - 1)|0;
   $76 = (238784 + (($75*48)|0)|0);
   $77 = HEAP32[$76>>2]|0;
   $78 = ($77|0)==(4);
   if ($78) {
    $79 = (__Z5Error10TErrorCode(117)|0);
    $0 = $79;
    $189 = $0;
    STACKTOP = sp;return ($189|0);
   }
   $80 = (__Z10Enter0Code16TInstructionCode(9)|0);
   $Result = $80;
   $81 = ($80|0)!=(0);
   if ($81) {
    $82 = $Result;
    $0 = $82;
    $189 = $0;
    STACKTOP = sp;return ($189|0);
   }
   $83 = HEAP16[258728>>1]|0;
   $84 = $83&65535;
   $85 = (($84) + 14)|0;
   $86 = $85&65535;
   HEAP16[258728>>1] = $86;
   $87 = (__Z15PatchSkipLabelsh(0)|0);
   $Result = $87;
   $88 = ($87|0)!=(0);
   if (!($88)) {
    $90 = HEAP16[258728>>1]|0;
    $91 = $90&65535;
    $92 = (($91) - 14)|0;
    $93 = $92&65535;
    $94 = $TempIdx;
    $95 = HEAP8[238776>>0]|0;
    $96 = $95&255;
    $97 = (($96) - 1)|0;
    $98 = (238784 + (($97*48)|0)|0);
    $99 = (($98) + 16|0);
    $100 = (($99) + ($94<<1)|0);
    HEAP16[$100>>1] = $93;
    $101 = HEAP8[238776>>0]|0;
    $102 = (($101) + -1)<<24>>24;
    HEAP8[238776>>0] = $102;
    $103 = HEAP8[250432>>0]|0;
    $104 = (($103) + -1)<<24>>24;
    HEAP8[250432>>0] = $104;
    break;
   }
   $89 = $Result;
   $0 = $89;
   $189 = $0;
   STACKTOP = sp;return ($189|0);
  } else {
   $5 = HEAP8[250432>>0]|0;
   $6 = $5&255;
   $7 = ($6|0)==(16);
   if ($7) {
    $8 = (__Z5Error10TErrorCode(62)|0);
    $0 = $8;
    $189 = $0;
    STACKTOP = sp;return ($189|0);
   }
   $9 = HEAP16[238720>>1]|0;
   $10 = $9&65535;
   $11 = (($10) - 1)|0;
   $12 = $11&65535;
   $13 = HEAP8[238776>>0]|0;
   $14 = $13&255;
   $15 = (238784 + (($14*48)|0)|0);
   $16 = (($15) + 4|0);
   HEAP16[$16>>1] = $12;
   $17 = HEAP16[238720>>1]|0;
   $18 = $17&65535;
   $TempIdx = $18;
   while(1) {
    $19 = (__Z10GetElementP12TElementList($Element)|0);
    $20 = ($19<<24>>24)!=(0);
    if ($20) {
     $21 = HEAP32[$Element>>2]|0;
     $22 = ($21|0)!=(25);
     if ($22) {
      $23 = HEAP32[$Element>>2]|0;
      $24 = ($23|0)!=(47);
      $190 = $24;
     } else {
      $190 = 0;
     }
    } else {
     $190 = 0;
    }
    if (!($190)) {
     break;
    }
   }
   (__Z10GetElementP12TElementList($Element2)|0);
   $25 = HEAP32[$Element>>2]|0;
   $26 = ($25|0)==(25);
   do {
    if ($26) {
     $27 = HEAP32[$Element2>>2]|0;
     $28 = ($27|0)==(43);
     if (!($28)) {
      $29 = HEAP32[$Element2>>2]|0;
      $30 = ($29|0)==(46);
      if (!($30)) {
       $31 = HEAP32[$Element2>>2]|0;
       $32 = ($31|0)==(3);
       if (!($32)) {
        break;
       }
       $33 = (($Element2) + 4|0);
       $34 = HEAP16[$33>>1]|0;
       $35 = $34&65535;
       $36 = ($35|0)==(21);
       if (!($36)) {
        break;
       }
       $37 = (__Z10GetElementP12TElementList($Element2)|0);
       $38 = ($37<<24>>24)!=(0);
       if (!($38)) {
        break;
       }
       $39 = (__Z10GetElementP12TElementList($Element2)|0);
       $40 = ($39<<24>>24)!=(0);
       if (!($40)) {
        break;
       }
       $41 = HEAP32[$Element2>>2]|0;
       $42 = ($41|0)==(47);
       if (!($42)) {
        break;
       }
      }
     }
     $Enhanced = 0;
    }
   } while(0);
   $43 = $TempIdx;
   $44 = $43&65535;
   HEAP16[238720>>1] = $44;
  }
 } while(0);
 HEAP8[241856>>0] = 0;
 $105 = (__Z19GetValueConditionalhhi(1,0,0)|0);
 $Result = $105;
 $106 = ($105|0)!=(0);
 if ($106) {
  $107 = $Result;
  $0 = $107;
  $189 = $0;
  STACKTOP = sp;return ($189|0);
 }
 $108 = (__Z15EnterExpressionhh(0,1)|0);
 $Result = $108;
 $109 = ($108|0)!=(0);
 if ($109) {
  $110 = $Result;
  $0 = $110;
  $189 = $0;
  STACKTOP = sp;return ($189|0);
 }
 $111 = (__Z10Enter0Code16TInstructionCode(13)|0);
 $Result = $111;
 $112 = ($111|0)!=(0);
 if ($112) {
  $113 = $Result;
  $0 = $113;
  $189 = $0;
  STACKTOP = sp;return ($189|0);
 }
 (__Z10GetElementP12TElementList($Element)|0);
 $114 = HEAP32[$Element>>2]|0;
 $115 = ($114|0)!=(25);
 if ($115) {
  $116 = (__Z5Error10TErrorCode(53)|0);
  $0 = $116;
  $189 = $0;
  STACKTOP = sp;return ($189|0);
 }
 $117 = $Enhanced;
 $118 = ($117<<24>>24)!=(0);
 do {
  if ($118) {
   $132 = $1;
   $133 = ($132<<24>>24)!=(0);
   if ($133) {
    $142 = HEAP8[238776>>0]|0;
    $143 = $142&255;
    $144 = (238784 + (($143*48)|0)|0);
    $145 = HEAP32[$144>>2]|0;
    $146 = ($145|0)==(2);
    if ($146) {
     $147 = HEAP8[238776>>0]|0;
     $148 = $147&255;
     $149 = (238784 + (($148*48)|0)|0);
     HEAP32[$149>>2] = 3;
    }
   } else {
    (__Z14PreviewElementP12TElementList($Element)|0);
    $134 = HEAP32[$Element>>2]|0;
    $135 = ($134|0)==(47);
    if ($135) {
     $136 = HEAP8[238776>>0]|0;
     $137 = $136&255;
     $138 = (238784 + (($137*48)|0)|0);
     HEAP32[$138>>2] = 5;
    } else {
     $139 = HEAP8[238776>>0]|0;
     $140 = $139&255;
     $141 = (238784 + (($140*48)|0)|0);
     HEAP32[$141>>2] = 3;
    }
   }
   $150 = HEAP16[258728>>1]|0;
   $151 = $150&65535;
   $MainPartLabel = $151;
   $152 = HEAP16[258728>>1]|0;
   $153 = $152&65535;
   $154 = (($153) + 14)|0;
   $155 = $154&65535;
   HEAP16[258728>>1] = $155;
   $156 = (__Z10Enter0Code16TInstructionCode(9)|0);
   $Result = $156;
   $157 = ($156|0)!=(0);
   if ($157) {
    $158 = $Result;
    $0 = $158;
    $189 = $0;
    STACKTOP = sp;return ($189|0);
   }
   $159 = HEAP16[258728>>1]|0;
   $160 = HEAP8[238776>>0]|0;
   $161 = $160&255;
   $162 = (238784 + (($161*48)|0)|0);
   $163 = (($162) + 14|0);
   HEAP16[$163>>1] = $159;
   $164 = HEAP16[258728>>1]|0;
   $165 = $164&65535;
   $166 = (($165) + 14)|0;
   $167 = $166&65535;
   HEAP16[258728>>1] = $167;
   $168 = $MainPartLabel;
   $169 = $168&65535;
   $170 = (__Z12PatchAddresst($169)|0);
   $Result = $170;
   $171 = ($170|0)!=(0);
   if ($171) {
    $172 = $Result;
    $0 = $172;
    $189 = $0;
    STACKTOP = sp;return ($189|0);
   }
   $173 = $1;
   $174 = ($173<<24>>24)!=(0);
   if (!($174)) {
    $TempIdx = 0;
    while(1) {
     $175 = $TempIdx;
     $176 = ($175|0)<(16);
     if (!($176)) {
      break;
     }
     $177 = $TempIdx;
     $178 = HEAP8[238776>>0]|0;
     $179 = $178&255;
     $180 = (238784 + (($179*48)|0)|0);
     $181 = (($180) + 16|0);
     $182 = (($181) + ($177<<1)|0);
     HEAP16[$182>>1] = 0;
     $183 = $TempIdx;
     $184 = (($183) + 1)|0;
     $TempIdx = $184;
    }
   }
   $185 = HEAP8[238776>>0]|0;
   $186 = (($185) + 1)<<24>>24;
   HEAP8[238776>>0] = $186;
   $187 = HEAP8[250432>>0]|0;
   $188 = (($187) + 1)<<24>>24;
   HEAP8[250432>>0] = $188;
  } else {
   $119 = HEAP8[238424>>0]|0;
   $120 = ($119<<24>>24)!=(0);
   if ($120) {
    (__Z14PreviewElementP12TElementList($Element)|0);
    $121 = HEAP32[$Element>>2]|0;
    $122 = ($121|0)==(3);
    if ($122) {
     $123 = (($Element) + 4|0);
     $124 = HEAP16[$123>>1]|0;
     $125 = $124&65535;
     $126 = ($125|0)==(21);
     if ($126) {
      $127 = HEAP16[238720>>1]|0;
      $128 = (($127) + 1)<<16>>16;
      HEAP16[238720>>1] = $128;
     }
    }
   }
   $129 = (__Z15GetAddressEnterv()|0);
   $Result = $129;
   $130 = ($129|0)!=(0);
   if (!($130)) {
    break;
   }
   $131 = $Result;
   $0 = $131;
   $189 = $0;
   STACKTOP = sp;return ($189|0);
  }
 } while(0);
 $0 = 0;
 $189 = $0;
 STACKTOP = sp;return ($189|0);
}
function __Z12CompileInputv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(12)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $7 = $0;
 STACKTOP = sp;return ($7|0);
}
function __Z13CompileIotermv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,0)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(58)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $7 = $0;
 STACKTOP = sp;return ($7|0);
}
function __Z13CompileLcdcmdv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 1;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 0;
   $7 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   $13 = (__Z10Enter0Code16TInstructionCode(46)|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $16 = $0;
 STACKTOP = sp;return ($16|0);
}
function __Z12CompileLcdinv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 1;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 0;
   $7 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   $13 = (__Z8GetCommav()|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   }
   $16 = (__Z10Enter0Code16TInstructionCode(44)|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    $18 = $Result;
    $0 = $18;
    break;
   }
   $19 = (__Z14GetLeftBracketv()|0);
   $Result = $19;
   $20 = ($19|0)!=(0);
   if ($20) {
    $21 = $Result;
    $0 = $21;
    break;
   }
   $22 = (__Z20CompileInputSequencev()|0);
   $Result = $22;
   $23 = ($22|0)!=(0);
   if ($23) {
    $24 = $Result;
    $0 = $24;
    break;
   }
   $25 = (__Z15GetRightBracketv()|0);
   $Result = $25;
   $26 = ($25|0)!=(0);
   if ($26) {
    $27 = $Result;
    $0 = $27;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $28 = $0;
 STACKTOP = sp;return ($28|0);
}
function __Z13CompileLcdoutv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 1;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 0;
   $7 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   $13 = (__Z8GetCommav()|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   }
   $16 = (__Z10Enter0Code16TInstructionCode(45)|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    $18 = $Result;
    $0 = $18;
    break;
   }
   $19 = (__Z14GetLeftBracketv()|0);
   $Result = $19;
   $20 = ($19|0)!=(0);
   if ($20) {
    $21 = $Result;
    $0 = $21;
    break;
   }
   $22 = (__Z21CompileOutputSequencev()|0);
   $Result = $22;
   $23 = ($22|0)!=(0);
   if ($23) {
    $24 = $Result;
    $0 = $24;
    break;
   }
   $25 = (__Z15GetRightBracketv()|0);
   $Result = $25;
   $26 = ($25|0)!=(0);
   if ($26) {
    $27 = $Result;
    $0 = $27;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $28 = $0;
 STACKTOP = sp;return ($28|0);
}
function __Z15CompileLookdownv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Element = 0, $FoundBracket = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 $FoundBracket = sp + 20|0;
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,0)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 L1: do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(17)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   $7 = (__Z8GetCommav()|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   (__Z10GetElementP12TElementList($Element)|0);
   $10 = HEAP32[$Element>>2]|0;
   $11 = ($10|0)!=(9);
   do {
    if ($11) {
     $12 = HEAP32[$Element>>2]|0;
     $13 = ($12|0)!=(19);
     if ($13) {
      $14 = (__Z5Error10TErrorCode(45)|0);
      $0 = $14;
      break L1;
     } else {
      $15 = HEAP16[238720>>1]|0;
      $16 = (($15) + -1)<<16>>16;
      HEAP16[238720>>1] = $16;
      $17 = (($Element) + 4|0);
      HEAP16[$17>>1] = 28;
      break;
     }
    }
   } while(0);
   $18 = (($Element) + 4|0);
   $19 = HEAP16[$18>>1]|0;
   $20 = (__Z11EnterEEPROMht(3,$19)|0);
   $Result = $20;
   $21 = ($20|0)!=(0);
   if ($21) {
    $22 = $Result;
    $0 = $22;
    break;
   }
   $23 = (__Z14GetLeftBracketv()|0);
   $Result = $23;
   $24 = ($23|0)!=(0);
   if ($24) {
    $25 = $Result;
    $0 = $25;
    break;
   }
   while(1) {
    HEAP8[241856>>0] = 3;
    $26 = (__Z23GetValueEnterExpressionhh(0,0)|0);
    $Result = $26;
    $27 = ($26|0)!=(0);
    if ($27) {
     label = 17;
     break;
    }
    $29 = (__Z11EnterEEPROMht(1,0)|0);
    $Result = $29;
    $30 = ($29|0)!=(0);
    if ($30) {
     label = 19;
     break;
    }
    $32 = (__Z17GetCommaOrBracketPh($FoundBracket)|0);
    $Result = $32;
    $33 = ($32|0)!=(0);
    if ($33) {
     label = 21;
     break;
    }
    $35 = HEAP8[$FoundBracket>>0]|0;
    $36 = ($35<<24>>24)!=(0);
    $37 = $36 ^ 1;
    if (!($37)) {
     label = 24;
     break;
    }
   }
   if ((label|0) == 17) {
    $28 = $Result;
    $0 = $28;
    break;
   }
   else if ((label|0) == 19) {
    $31 = $Result;
    $0 = $31;
    break;
   }
   else if ((label|0) == 21) {
    $34 = $Result;
    $0 = $34;
    break;
   }
   else if ((label|0) == 24) {
    $38 = (__Z8GetCommav()|0);
    $Result = $38;
    $39 = ($38|0)!=(0);
    if ($39) {
     $40 = $Result;
     $0 = $40;
     break;
    }
    HEAP8[241856>>0] = 1;
    $41 = (__Z23GetWriteEnterExpressionv()|0);
    $Result = $41;
    $42 = ($41|0)!=(0);
    if ($42) {
     $43 = $Result;
     $0 = $43;
     break;
    } else {
     $0 = 0;
     break;
    }
   }
  }
 } while(0);
 $44 = $0;
 STACKTOP = sp;return ($44|0);
}
function __Z13CompileLookupv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $FoundBracket = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $FoundBracket = sp + 8|0;
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,0)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(16)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   $7 = (__Z8GetCommav()|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z14GetLeftBracketv()|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   while(1) {
    HEAP8[241856>>0] = 2;
    $13 = (__Z23GetValueEnterExpressionhh(0,0)|0);
    $Result = $13;
    $14 = ($13|0)!=(0);
    if ($14) {
     label = 11;
     break;
    }
    $16 = (__Z11EnterEEPROMht(1,0)|0);
    $Result = $16;
    $17 = ($16|0)!=(0);
    if ($17) {
     label = 13;
     break;
    }
    $19 = (__Z17GetCommaOrBracketPh($FoundBracket)|0);
    $Result = $19;
    $20 = ($19|0)!=(0);
    if ($20) {
     label = 15;
     break;
    }
    $22 = HEAP8[$FoundBracket>>0]|0;
    $23 = ($22<<24>>24)!=(0);
    $24 = $23 ^ 1;
    if (!($24)) {
     label = 18;
     break;
    }
   }
   if ((label|0) == 11) {
    $15 = $Result;
    $0 = $15;
    break;
   }
   else if ((label|0) == 13) {
    $18 = $Result;
    $0 = $18;
    break;
   }
   else if ((label|0) == 15) {
    $21 = $Result;
    $0 = $21;
    break;
   }
   else if ((label|0) == 18) {
    $25 = (__Z8GetCommav()|0);
    $Result = $25;
    $26 = ($25|0)!=(0);
    if ($26) {
     $27 = $Result;
     $0 = $27;
     break;
    }
    HEAP8[241856>>0] = 1;
    $28 = (__Z23GetWriteEnterExpressionv()|0);
    $Result = $28;
    $29 = ($28|0)!=(0);
    if ($29) {
     $30 = $Result;
     $0 = $30;
     break;
    } else {
     $0 = 0;
     break;
    }
   }
  }
 } while(0);
 $31 = $0;
 STACKTOP = sp;return ($31|0);
}
function __Z11CompileLoopv() {
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0;
 var $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0;
 var $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0;
 var $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0;
 var $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0;
 var $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $Element = 0, $Result = 0, $SkipLabel = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 4|0;
 $1 = HEAP8[258720>>0]|0;
 $2 = $1&255;
 $3 = ($2|0)==(0);
 L1: do {
  if ($3) {
   $4 = (__Z5Error10TErrorCode(68)|0);
   $0 = $4;
  } else {
   $5 = HEAP8[238776>>0]|0;
   $6 = $5&255;
   $7 = (($6) - 1)|0;
   $8 = (238784 + (($7*48)|0)|0);
   $9 = HEAP32[$8>>2]|0;
   $10 = ($9|0)!=(7);
   if ($10) {
    $11 = (__Z12NestingErrorv()|0);
    $0 = $11;
    break;
   }
   (__Z14PreviewElementP12TElementList($Element)|0);
   $12 = HEAP32[$Element>>2]|0;
   $13 = ($12|0)==(47);
   if ($13) {
    $14 = (__Z10Enter0Code16TInstructionCode(9)|0);
    $Result = $14;
    $15 = ($14|0)!=(0);
    if ($15) {
     $16 = $Result;
     $0 = $16;
     break;
    }
    $17 = HEAP8[238776>>0]|0;
    $18 = $17&255;
    $19 = (($18) - 1)|0;
    $20 = (238784 + (($19*48)|0)|0);
    $21 = (($20) + 12|0);
    $22 = HEAP16[$21>>1]|0;
    $23 = (__Z12EnterAddresst($22)|0);
    $Result = $23;
    $24 = ($23|0)!=(0);
    if ($24) {
     $25 = $Result;
     $0 = $25;
     break;
    }
    $26 = HEAP8[238776>>0]|0;
    $27 = $26&255;
    $28 = (($27) - 1)|0;
    $29 = (238784 + (($28*48)|0)|0);
    $30 = (($29) + 14|0);
    $31 = HEAP16[$30>>1]|0;
    $32 = $31&65535;
    $33 = ($32|0)!=(0);
    do {
     if ($33) {
      $34 = HEAP8[238776>>0]|0;
      $35 = $34&255;
      $36 = (($35) - 1)|0;
      $37 = (238784 + (($36*48)|0)|0);
      $38 = (($37) + 14|0);
      $39 = HEAP16[$38>>1]|0;
      $40 = (__Z12PatchAddresst($39)|0);
      $Result = $40;
      $41 = ($40|0)!=(0);
      if ($41) {
       $42 = $Result;
       $0 = $42;
       break L1;
      } else {
       break;
      }
     }
    } while(0);
   } else {
    (__Z10GetElementP12TElementList($Element)|0);
    $43 = HEAP32[$Element>>2]|0;
    $44 = ($43|0)==(26);
    if (!($44)) {
     $45 = HEAP32[$Element>>2]|0;
     $46 = ($45|0)==(27);
     if (!($46)) {
      $47 = (__Z5Error10TErrorCode(70)|0);
      $0 = $47;
      break;
     }
    }
    $48 = HEAP8[238776>>0]|0;
    $49 = $48&255;
    $50 = (($49) - 1)|0;
    $51 = (238784 + (($50*48)|0)|0);
    $52 = (($51) + 14|0);
    $53 = HEAP16[$52>>1]|0;
    $54 = $53&65535;
    $55 = ($54|0)!=(0);
    if ($55) {
     $56 = (__Z5Error10TErrorCode(69)|0);
     $0 = $56;
     break;
    }
    HEAP8[241856>>0] = 0;
    $57 = (__Z19GetValueConditionalhhi(1,0,0)|0);
    $Result = $57;
    $58 = ($57|0)!=(0);
    if ($58) {
     $59 = $Result;
     $0 = $59;
     break;
    }
    $60 = (__Z15EnterExpressionhh(0,1)|0);
    $Result = $60;
    $61 = ($60|0)!=(0);
    if ($61) {
     $62 = $Result;
     $0 = $62;
     break;
    }
    $63 = (__Z10Enter0Code16TInstructionCode(13)|0);
    $Result = $63;
    $64 = ($63|0)!=(0);
    if ($64) {
     $65 = $Result;
     $0 = $65;
     break;
    }
    $66 = HEAP32[$Element>>2]|0;
    $67 = ($66|0)==(26);
    do {
     if ($67) {
      $68 = HEAP8[238776>>0]|0;
      $69 = $68&255;
      $70 = (($69) - 1)|0;
      $71 = (238784 + (($70*48)|0)|0);
      $72 = (($71) + 12|0);
      $73 = HEAP16[$72>>1]|0;
      $74 = (__Z12EnterAddresst($73)|0);
      $Result = $74;
      $75 = ($74|0)!=(0);
      if ($75) {
       $76 = $Result;
       $0 = $76;
       break L1;
      } else {
       break;
      }
     } else {
      $77 = HEAP16[258728>>1]|0;
      $SkipLabel = $77;
      $78 = HEAP16[258728>>1]|0;
      $79 = $78&65535;
      $80 = (($79) + 14)|0;
      $81 = $80&65535;
      HEAP16[258728>>1] = $81;
      $82 = (__Z10Enter0Code16TInstructionCode(9)|0);
      $Result = $82;
      $83 = ($82|0)!=(0);
      if ($83) {
       $84 = $Result;
       $0 = $84;
       break L1;
      }
      $85 = HEAP8[238776>>0]|0;
      $86 = $85&255;
      $87 = (($86) - 1)|0;
      $88 = (238784 + (($87*48)|0)|0);
      $89 = (($88) + 12|0);
      $90 = HEAP16[$89>>1]|0;
      $91 = (__Z12EnterAddresst($90)|0);
      $Result = $91;
      $92 = ($91|0)!=(0);
      if ($92) {
       $93 = $Result;
       $0 = $93;
       break L1;
      }
      $94 = $SkipLabel;
      $95 = (__Z12PatchAddresst($94)|0);
      $Result = $95;
      $96 = ($95|0)!=(0);
      if ($96) {
       $97 = $Result;
       $0 = $97;
       break L1;
      } else {
       break;
      }
     }
    } while(0);
   }
   $98 = (__Z15PatchSkipLabelsh(1)|0);
   $Result = $98;
   $99 = ($98|0)!=(0);
   if ($99) {
    $100 = $Result;
    $0 = $100;
    break;
   } else {
    $101 = HEAP8[238776>>0]|0;
    $102 = (($101) + -1)<<24>>24;
    HEAP8[238776>>0] = $102;
    $103 = HEAP8[258720>>0]|0;
    $104 = (($103) + -1)<<24>>24;
    HEAP8[258720>>0] = $104;
    $0 = 0;
    break;
   }
  }
 } while(0);
 $105 = $0;
 STACKTOP = sp;return ($105|0);
}
function __Z10CompileLowv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(7)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $7 = $0;
 STACKTOP = sp;return ($7|0);
}
function __Z13CompileMainiov() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = (__Z10Enter0Code16TInstructionCode(30)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 if ($2) {
  $3 = $Result;
  $0 = $3;
 } else {
  $0 = 0;
 }
 $4 = $0;
 STACKTOP = sp;return ($4|0);
}
function __Z10CompileNapv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,0)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(2)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   $7 = HEAP16[258728>>1]|0;
   $8 = $7&65535;
   $9 = (($8) + 14)|0;
   $10 = $9&65535;
   $11 = (__Z12EnterAddresst($10)|0);
   $Result = $11;
   $12 = ($11|0)!=(0);
   if ($12) {
    $13 = $Result;
    $0 = $13;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $14 = $0;
 STACKTOP = sp;return ($14|0);
}
function __Z11CompileNextv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $9 = 0, $Element = 0, $OldElementListIdx1 = 0, $OldElementListIdx2 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 8|0;
 $1 = HEAP8[258712>>0]|0;
 $2 = $1&255;
 $3 = ($2|0)==(0);
 L1: do {
  if ($3) {
   $4 = (__Z5Error10TErrorCode(34)|0);
   $0 = $4;
  } else {
   $5 = HEAP8[238776>>0]|0;
   $6 = $5&255;
   $7 = (($6) - 1)|0;
   $8 = (238784 + (($7*48)|0)|0);
   $9 = HEAP32[$8>>2]|0;
   $10 = ($9|0)!=(6);
   if ($10) {
    $11 = (__Z12NestingErrorv()|0);
    $0 = $11;
    break;
   }
   $12 = HEAP16[238720>>1]|0;
   $13 = $12&65535;
   $OldElementListIdx1 = $13;
   $14 = HEAP8[238776>>0]|0;
   $15 = $14&255;
   $16 = (($15) - 1)|0;
   $17 = (238784 + (($16*48)|0)|0);
   $18 = (($17) + 4|0);
   $19 = HEAP16[$18>>1]|0;
   $20 = $19&65535;
   $21 = (($20) + 1)|0;
   $22 = $21&65535;
   HEAP16[238720>>1] = $22;
   $23 = HEAP16[238720>>1]|0;
   $24 = $23&65535;
   $OldElementListIdx2 = $24;
   HEAP8[241856>>0] = 2;
   $25 = (__Z7GetReadh(1)|0);
   $Result = $25;
   $26 = ($25|0)!=(0);
   if ($26) {
    $27 = $Result;
    $0 = $27;
    break;
   }
   $28 = $OldElementListIdx2;
   $29 = $28&65535;
   HEAP16[238720>>1] = $29;
   HEAP8[241856>>0] = 3;
   $30 = (__Z8GetWriteh(2)|0);
   $Result = $30;
   $31 = ($30|0)!=(0);
   if ($31) {
    $32 = $Result;
    $0 = $32;
    break;
   }
   $33 = HEAP16[238720>>1]|0;
   $34 = (($33) + 1)<<16>>16;
   HEAP16[238720>>1] = $34;
   HEAP8[241856>>0] = 1;
   $35 = (__Z8GetValuehh(3,0)|0);
   $Result = $35;
   $36 = ($35|0)!=(0);
   if ($36) {
    $37 = $Result;
    $0 = $37;
    break;
   }
   $38 = HEAP16[238720>>1]|0;
   $39 = (($38) + 1)<<16>>16;
   HEAP16[238720>>1] = $39;
   HEAP8[241856>>0] = 0;
   $40 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $40;
   $41 = ($40|0)!=(0);
   if ($41) {
    $42 = $Result;
    $0 = $42;
    break;
   }
   $43 = (__Z15EnterExpressionhh(3,1)|0);
   $Result = $43;
   $44 = ($43|0)!=(0);
   if ($44) {
    $45 = $Result;
    $0 = $45;
    break;
   }
   $46 = (__Z10Enter0Code16TInstructionCode(14)|0);
   $Result = $46;
   $47 = ($46|0)!=(0);
   if ($47) {
    $48 = $Result;
    $0 = $48;
    break;
   }
   $49 = (__Z15EnterExpressionhh(1,0)|0);
   $Result = $49;
   $50 = ($49|0)!=(0);
   if ($50) {
    $51 = $Result;
    $0 = $51;
    break;
   }
   (__Z10GetElementP12TElementList($Element)|0);
   $52 = HEAP32[$Element>>2]|0;
   $53 = ($52|0)!=(47);
   do {
    if ($53) {
     HEAP8[241856>>0] = 3;
     $54 = (__Z23GetValueEnterExpressionhh(1,0)|0);
     $Result = $54;
     $55 = ($54|0)!=(0);
     if ($55) {
      $56 = $Result;
      $0 = $56;
      break L1;
     } else {
      break;
     }
    } else {
     $57 = (__Z13EnterConstantth(1,1)|0);
     $Result = $57;
     $58 = ($57|0)!=(0);
     if ($58) {
      $59 = $Result;
      $0 = $59;
      break L1;
     } else {
      break;
     }
    }
   } while(0);
   $60 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $60;
   $61 = ($60|0)!=(0);
   if ($61) {
    $62 = $Result;
    $0 = $62;
    break;
   }
   $63 = (__Z15EnterExpressionhh(2,0)|0);
   $Result = $63;
   $64 = ($63|0)!=(0);
   if ($64) {
    $65 = $Result;
    $0 = $65;
    break;
   }
   $66 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $66;
   $67 = ($66|0)!=(0);
   if ($67) {
    $68 = $Result;
    $0 = $68;
    break;
   }
   $69 = HEAP8[238776>>0]|0;
   $70 = $69&255;
   $71 = (($70) - 1)|0;
   $72 = (238784 + (($71*48)|0)|0);
   $73 = (($72) + 12|0);
   $74 = HEAP16[$73>>1]|0;
   $75 = (__Z12EnterAddresst($74)|0);
   $Result = $75;
   $76 = ($75|0)!=(0);
   if ($76) {
    $77 = $Result;
    $0 = $77;
    break;
   }
   $78 = (__Z15PatchSkipLabelsh(1)|0);
   $Result = $78;
   $79 = ($78|0)!=(0);
   if ($79) {
    $80 = $Result;
    $0 = $80;
    break;
   } else {
    $81 = HEAP8[238776>>0]|0;
    $82 = (($81) + -1)<<24>>24;
    HEAP8[238776>>0] = $82;
    $83 = HEAP8[258712>>0]|0;
    $84 = (($83) + -1)<<24>>24;
    HEAP8[258712>>0] = $84;
    $85 = $OldElementListIdx1;
    $86 = $85&65535;
    HEAP16[238720>>1] = $86;
    $0 = 0;
    break;
   }
  }
 } while(0);
 $87 = $0;
 STACKTOP = sp;return ($87|0);
}
function __Z9CompileOnv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $7 = 0, $8 = 0, $9 = 0, $Element = 0, $EndFound = 0, $OnGosub = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 4|0;
 $EndFound = sp + 20|0;
 HEAP8[241856>>0] = 0;
 $OnGosub = 0;
 $1 = (__Z19GetValueConditionalhhi(0,0,0)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 L1: do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   (__Z10GetElementP12TElementList($Element)|0);
   $4 = HEAP32[$Element>>2]|0;
   $5 = ($4|0)==(3);
   do {
    if ($5) {
     $6 = (($Element) + 4|0);
     $7 = HEAP16[$6>>1]|0;
     $8 = $7&65535;
     $9 = ($8|0)==(21);
     if (!($9)) {
      $10 = (($Element) + 4|0);
      $11 = HEAP16[$10>>1]|0;
      $12 = $11&65535;
      $13 = ($12|0)==(20);
      if (!($13)) {
       break;
      }
     }
     $15 = (($Element) + 4|0);
     $16 = HEAP16[$15>>1]|0;
     $17 = $16&65535;
     $18 = ($17|0)==(20);
     do {
      if ($18) {
       $OnGosub = 1;
       $19 = (__Z10Enter0Code16TInstructionCode(10)|0);
       $Result = $19;
       $20 = ($19|0)!=(0);
       if ($20) {
        $21 = $Result;
        $0 = $21;
        break L1;
       }
       $22 = HEAP16[238408>>1]|0;
       $23 = (($22) + 1)<<16>>16;
       HEAP16[238408>>1] = $23;
       $24 = HEAP16[238408>>1]|0;
       $25 = (__Z11EnterEEPROMht(8,$24)|0);
       $Result = $25;
       $26 = ($25|0)!=(0);
       if ($26) {
        $27 = $Result;
        $0 = $27;
        break L1;
       }
       $28 = HEAP16[258728>>1]|0;
       $29 = $28&65535;
       $30 = (($29) + 14)|0;
       $31 = $30&65535;
       $32 = (__Z12EnterAddresst($31)|0);
       $Result = $32;
       $33 = ($32|0)!=(0);
       if ($33) {
        $34 = $Result;
        $0 = $34;
        break L1;
       } else {
        break;
       }
      }
     } while(0);
     $35 = (__Z15EnterExpressionhh(0,1)|0);
     $Result = $35;
     $36 = ($35|0)!=(0);
     if ($36) {
      $37 = $Result;
      $0 = $37;
      break L1;
     }
     $38 = (__Z10Enter0Code16TInstructionCode(15)|0);
     $Result = $38;
     $39 = ($38|0)!=(0);
     if ($39) {
      $40 = $Result;
      $0 = $40;
      break L1;
     }
     while(1) {
      $41 = (__Z15GetAddressEnterv()|0);
      $Result = $41;
      $42 = ($41|0)!=(0);
      if ($42) {
       label = 21;
       break;
      }
      $44 = (__Z13GetCommaOrEndPh($EndFound)|0);
      $Result = $44;
      $45 = ($44|0)!=(0);
      if ($45) {
       label = 23;
       break;
      }
      $47 = HEAP8[$EndFound>>0]|0;
      $48 = ($47<<24>>24)!=(0);
      $49 = $48 ^ 1;
      if (!($49)) {
       label = 26;
       break;
      }
     }
     if ((label|0) == 21) {
      $43 = $Result;
      $0 = $43;
      break L1;
     }
     else if ((label|0) == 23) {
      $46 = $Result;
      $0 = $46;
      break L1;
     }
     else if ((label|0) == 26) {
      $50 = HEAP16[238720>>1]|0;
      $51 = (($50) + -1)<<16>>16;
      HEAP16[238720>>1] = $51;
      $52 = $OnGosub;
      $53 = ($52<<24>>24)!=(0);
      do {
       if ($53) {
        $54 = (__Z10Enter0Code16TInstructionCode(11)|0);
        $Result = $54;
        $55 = ($54|0)!=(0);
        if ($55) {
         $56 = $Result;
         $0 = $56;
         break L1;
        }
        $57 = HEAP16[238408>>1]|0;
        $58 = $57&65535;
        $59 = ($58*14)|0;
        $60 = $59&65535;
        $61 = (__Z12PatchAddresst($60)|0);
        $Result = $61;
        $62 = ($61|0)!=(0);
        if ($62) {
         $63 = $Result;
         $0 = $63;
         break L1;
        } else {
         break;
        }
       }
      } while(0);
      $0 = 0;
      break L1;
     }
    }
   } while(0);
   $14 = (__Z5Error10TErrorCode(89)|0);
   $0 = $14;
  }
 } while(0);
 $64 = $0;
 STACKTOP = sp;return ($64|0);
}
function __Z13CompileOutputv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(4)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $7 = $0;
 STACKTOP = sp;return ($7|0);
}
function __Z11CompileOwinv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 1;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 0;
   $7 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   $13 = (__Z8GetCommav()|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   }
   $16 = (__Z10Enter0Code16TInstructionCode(57)|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    $18 = $Result;
    $0 = $18;
    break;
   }
   $19 = (__Z14GetLeftBracketv()|0);
   $Result = $19;
   $20 = ($19|0)!=(0);
   if ($20) {
    $21 = $Result;
    $0 = $21;
    break;
   }
   $22 = (__Z20CompileInputSequencev()|0);
   $Result = $22;
   $23 = ($22|0)!=(0);
   if ($23) {
    $24 = $Result;
    $0 = $24;
    break;
   }
   $25 = (__Z15GetRightBracketv()|0);
   $Result = $25;
   $26 = ($25|0)!=(0);
   if ($26) {
    $27 = $Result;
    $0 = $27;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $28 = $0;
 STACKTOP = sp;return ($28|0);
}
function __Z12CompileOwoutv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 1;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 0;
   $7 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   $13 = (__Z8GetCommav()|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   }
   $16 = (__Z10Enter0Code16TInstructionCode(56)|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    $18 = $Result;
    $0 = $18;
    break;
   }
   $19 = (__Z14GetLeftBracketv()|0);
   $Result = $19;
   $20 = ($19|0)!=(0);
   if ($20) {
    $21 = $Result;
    $0 = $21;
    break;
   }
   $22 = (__Z21CompileOutputSequencev()|0);
   $Result = $22;
   $23 = ($22|0)!=(0);
   if ($23) {
    $24 = $Result;
    $0 = $24;
    break;
   }
   $25 = (__Z15GetRightBracketv()|0);
   $Result = $25;
   $26 = ($25|0)!=(0);
   if ($26) {
    $27 = $Result;
    $0 = $27;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $28 = $0;
 STACKTOP = sp;return ($28|0);
}
function __Z12CompilePausev() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,0)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(21)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $7 = $0;
 STACKTOP = sp;return ($7|0);
}
function __Z13CompilePollinv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 1;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 0;
   $7 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   $13 = (__Z10Enter0Code16TInstructionCode(53)|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $16 = $0;
 STACKTOP = sp;return ($16|0);
}
function __Z15CompilePollmodev() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,0)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(52)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $7 = $0;
 STACKTOP = sp;return ($7|0);
}
function __Z14CompilePolloutv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 1;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 0;
   $7 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   $13 = (__Z10Enter0Code16TInstructionCode(54)|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $16 = $0;
 STACKTOP = sp;return ($16|0);
}
function __Z14CompilePollrunv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,0)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(51)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $7 = $0;
 STACKTOP = sp;return ($7|0);
}
function __Z15CompilePollwaitv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,0)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(55)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   $7 = HEAP16[258728>>1]|0;
   $8 = $7&65535;
   $9 = (($8) + 14)|0;
   $10 = $9&65535;
   $11 = (__Z12EnterAddresst($10)|0);
   $Result = $11;
   $12 = ($11|0)!=(0);
   if ($12) {
    $13 = $Result;
    $0 = $13;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $14 = $0;
 STACKTOP = sp;return ($14|0);
}
function __Z13CompilePulsinv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 1;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 0;
   $7 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   $13 = (__Z8GetCommav()|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   }
   $16 = (__Z10Enter0Code16TInstructionCode(37)|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    $18 = $Result;
    $0 = $18;
    break;
   }
   $19 = (__Z23GetWriteEnterExpressionv()|0);
   $Result = $19;
   $20 = ($19|0)!=(0);
   if ($20) {
    $21 = $Result;
    $0 = $21;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $22 = $0;
 STACKTOP = sp;return ($22|0);
}
function __Z14CompilePulsoutv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 1;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 0;
   $7 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   $13 = (__Z10Enter0Code16TInstructionCode(36)|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $16 = $0;
 STACKTOP = sp;return ($16|0);
}
function __Z10CompilePutv() {
 var $$byval_copy = 0, $$byval_copy1 = 0, $$byval_copy2 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0;
 var $79 = 0, $8 = 0, $80 = 0, $81 = 0, $9 = 0, $Element = 0, $Idx = 0, $Result = 0, $ValueStart = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy2 = sp + 84|0;
 $$byval_copy1 = sp + 40|0;
 $$byval_copy = sp;
 $Element = sp + 72|0;
 $1 = sp + 52|0;
 $2 = sp + 24|0;
 $3 = sp + 12|0;
 $ValueStart = 0;
 $Idx = 0;
 HEAP8[241856>>0] = 0;
 $4 = (__Z8GetValuehh(1,0)|0);
 $Result = $4;
 $5 = ($4|0)!=(0);
 if ($5) {
  $6 = $Result;
  $0 = $6;
  $81 = $0;
  STACKTOP = sp;return ($81|0);
 }
 while(1) {
  $7 = (__Z8GetCommav()|0);
  $Result = $7;
  $8 = ($7|0)!=(0);
  if ($8) {
   label = 5;
   break;
  }
  $10 = HEAP8[238424>>0]|0;
  $11 = ($10<<24>>24)!=(0);
  if ($11) {
   $12 = (__Z14PreviewElementP12TElementList($Element)|0);
   $13 = ($12<<24>>24)!=(0);
   if ($13) {
    $14 = HEAP32[$Element>>2]|0;
    $15 = ($14|0)==(6);
    if ($15) {
     (__Z10GetElementP12TElementList($Element)|0);
     $16 = (($Element) + 4|0);
     $17 = HEAP16[$16>>1]|0;
     $18 = $17&65535;
     $19 = ($18|0)!=(3);
     if ($19) {
      label = 10;
      break;
     }
     $21 = HEAP16[238720>>1]|0;
     $22 = $21&65535;
     $ValueStart = $22;
    }
   }
  }
  __Z14CopyExpressionhh(1,0);
  $23 = $Idx;
  $24 = ($23|0)>(0);
  if ($24) {
   $25 = $Idx;
   $26 = $25&65535;
   $27 = (($Element) + 4|0);
   HEAP16[$27>>1] = $26;
   ;HEAP32[$1+0>>2]=HEAP32[$Element+0>>2]|0;HEAP32[$1+4>>2]=HEAP32[$Element+4>>2]|0;HEAP32[$1+8>>2]=HEAP32[$Element+8>>2]|0;
   ;HEAP32[$$byval_copy+0>>2]=HEAP32[$1+0>>2]|0;HEAP32[$$byval_copy+4>>2]=HEAP32[$1+4>>2]|0;HEAP32[$$byval_copy+8>>2]=HEAP32[$1+8>>2]|0;
   $28 = (__Z23EnterExpressionConstant12TElementList($$byval_copy)|0);
   $Result = $28;
   $29 = ($28|0)!=(0);
   if ($29) {
    label = 14;
    break;
   }
   $31 = (__Z23EnterExpressionOperatorh(15)|0);
   $Result = $31;
   $32 = ($31|0)!=(0);
   if ($32) {
    label = 16;
    break;
   }
  }
  $34 = (__Z15EnterExpressionhh(0,1)|0);
  $Result = $34;
  $35 = ($34|0)!=(0);
  if ($35) {
   label = 19;
   break;
  }
  HEAP8[241856>>0] = 1;
  $37 = (__Z23GetValueEnterExpressionhh(1,0)|0);
  $Result = $37;
  $38 = ($37|0)!=(0);
  if ($38) {
   label = 21;
   break;
  }
  __Z14CopyExpressionhh(0,2);
  $40 = (__Z10Enter0Code16TInstructionCode(28)|0);
  $Result = $40;
  $41 = ($40|0)!=(0);
  if ($41) {
   label = 23;
   break;
  }
  $43 = $ValueStart;
  $44 = ($43|0)>(0);
  if ($44) {
   __Z14CopyExpressionhh(1,0);
   $45 = $Idx;
   $46 = (($45) + 1)|0;
   $Idx = $46;
   $47 = $Idx;
   $48 = $47&65535;
   $49 = (($Element) + 4|0);
   HEAP16[$49>>1] = $48;
   ;HEAP32[$2+0>>2]=HEAP32[$Element+0>>2]|0;HEAP32[$2+4>>2]=HEAP32[$Element+4>>2]|0;HEAP32[$2+8>>2]=HEAP32[$Element+8>>2]|0;
   ;HEAP32[$$byval_copy1+0>>2]=HEAP32[$2+0>>2]|0;HEAP32[$$byval_copy1+4>>2]=HEAP32[$2+4>>2]|0;HEAP32[$$byval_copy1+8>>2]=HEAP32[$2+8>>2]|0;
   $50 = (__Z23EnterExpressionConstant12TElementList($$byval_copy1)|0);
   $Result = $50;
   $51 = ($50|0)!=(0);
   if ($51) {
    label = 26;
    break;
   }
   $53 = (__Z23EnterExpressionOperatorh(15)|0);
   $Result = $53;
   $54 = ($53|0)!=(0);
   if ($54) {
    label = 28;
    break;
   }
   $56 = (__Z15EnterExpressionhh(0,1)|0);
   $Result = $56;
   $57 = ($56|0)!=(0);
   if ($57) {
    label = 30;
    break;
   }
   __Z14CopyExpressionhh(2,0);
   $59 = (($Element) + 4|0);
   HEAP16[$59>>1] = 8;
   ;HEAP32[$3+0>>2]=HEAP32[$Element+0>>2]|0;HEAP32[$3+4>>2]=HEAP32[$Element+4>>2]|0;HEAP32[$3+8>>2]=HEAP32[$Element+8>>2]|0;
   ;HEAP32[$$byval_copy2+0>>2]=HEAP32[$3+0>>2]|0;HEAP32[$$byval_copy2+4>>2]=HEAP32[$3+4>>2]|0;HEAP32[$$byval_copy2+8>>2]=HEAP32[$3+8>>2]|0;
   $60 = (__Z23EnterExpressionConstant12TElementList($$byval_copy2)|0);
   $Result = $60;
   $61 = ($60|0)!=(0);
   if ($61) {
    label = 32;
    break;
   }
   $63 = (__Z23EnterExpressionOperatorh(24)|0);
   $Result = $63;
   $64 = ($63|0)!=(0);
   if ($64) {
    label = 34;
    break;
   }
   $66 = (__Z15EnterExpressionhh(0,1)|0);
   $Result = $66;
   $67 = ($66|0)!=(0);
   if ($67) {
    label = 36;
    break;
   }
   $69 = (__Z10Enter0Code16TInstructionCode(28)|0);
   $Result = $69;
   $70 = ($69|0)!=(0);
   if ($70) {
    label = 38;
    break;
   }
  }
  $72 = $Idx;
  $73 = (($72) + 1)|0;
  $Idx = $73;
  $ValueStart = 0;
  $74 = HEAP8[238424>>0]|0;
  $75 = ($74<<24>>24)!=(0);
  if ($75) {
   (__Z14PreviewElementP12TElementList($Element)|0);
  } else {
   HEAP32[$Element>>2] = 47;
  }
  $76 = HEAP32[$Element>>2]|0;
  $77 = ($76|0)==(14);
  if (!($77)) {
   label = 45;
   break;
  }
 }
 switch (label|0) {
  case 5: {
   $9 = $Result;
   $0 = $9;
   $81 = $0;
   STACKTOP = sp;return ($81|0);
   break;
  }
  case 10: {
   $20 = (__Z5Error10TErrorCode(114)|0);
   $0 = $20;
   $81 = $0;
   STACKTOP = sp;return ($81|0);
   break;
  }
  case 14: {
   $30 = $Result;
   $0 = $30;
   $81 = $0;
   STACKTOP = sp;return ($81|0);
   break;
  }
  case 16: {
   $33 = $Result;
   $0 = $33;
   $81 = $0;
   STACKTOP = sp;return ($81|0);
   break;
  }
  case 19: {
   $36 = $Result;
   $0 = $36;
   $81 = $0;
   STACKTOP = sp;return ($81|0);
   break;
  }
  case 21: {
   $39 = $Result;
   $0 = $39;
   $81 = $0;
   STACKTOP = sp;return ($81|0);
   break;
  }
  case 23: {
   $42 = $Result;
   $0 = $42;
   $81 = $0;
   STACKTOP = sp;return ($81|0);
   break;
  }
  case 26: {
   $52 = $Result;
   $0 = $52;
   $81 = $0;
   STACKTOP = sp;return ($81|0);
   break;
  }
  case 28: {
   $55 = $Result;
   $0 = $55;
   $81 = $0;
   STACKTOP = sp;return ($81|0);
   break;
  }
  case 30: {
   $58 = $Result;
   $0 = $58;
   $81 = $0;
   STACKTOP = sp;return ($81|0);
   break;
  }
  case 32: {
   $62 = $Result;
   $0 = $62;
   $81 = $0;
   STACKTOP = sp;return ($81|0);
   break;
  }
  case 34: {
   $65 = $Result;
   $0 = $65;
   $81 = $0;
   STACKTOP = sp;return ($81|0);
   break;
  }
  case 36: {
   $68 = $Result;
   $0 = $68;
   $81 = $0;
   STACKTOP = sp;return ($81|0);
   break;
  }
  case 38: {
   $71 = $Result;
   $0 = $71;
   $81 = $0;
   STACKTOP = sp;return ($81|0);
   break;
  }
  case 45: {
   $78 = HEAP32[$Element>>2]|0;
   $79 = ($78|0)!=(47);
   if ($79) {
    (__Z10GetElementP12TElementList($Element)|0);
    $80 = (__Z5Error10TErrorCode(32)|0);
    $0 = $80;
    $81 = $0;
    STACKTOP = sp;return ($81|0);
   } else {
    $0 = 0;
    $81 = $0;
    STACKTOP = sp;return ($81|0);
   }
   break;
  }
 }
 return (0)|0;
}
function __Z10CompilePwmv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 2;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 0;
   $7 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z8GetCommav()|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   HEAP8[241856>>0] = 1;
   $13 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   }
   $16 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    $18 = $Result;
    $0 = $18;
    break;
   }
   $19 = (__Z10Enter0Code16TInstructionCode(43)|0);
   $Result = $19;
   $20 = ($19|0)!=(0);
   if ($20) {
    $21 = $Result;
    $0 = $21;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $22 = $0;
 STACKTOP = sp;return ($22|0);
}
function __Z13CompileRandomv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $OldElementListIdx = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = HEAP16[238720>>1]|0;
 $OldElementListIdx = $1;
 HEAP8[241856>>0] = 0;
 $2 = (__Z12GetReadWriteh(0)|0);
 $Result = $2;
 $3 = ($2|0)!=(0);
 do {
  if ($3) {
   $4 = $Result;
   $0 = $4;
  } else {
   $5 = (__Z15EnterExpressionhh(0,1)|0);
   $Result = $5;
   $6 = ($5|0)!=(0);
   if ($6) {
    $7 = $Result;
    $0 = $7;
    break;
   }
   $8 = (__Z10Enter0Code16TInstructionCode(18)|0);
   $Result = $8;
   $9 = ($8|0)!=(0);
   if ($9) {
    $10 = $Result;
    $0 = $10;
    break;
   }
   $11 = $OldElementListIdx;
   HEAP16[238720>>1] = $11;
   HEAP8[241856>>0] = 1;
   $12 = (__Z23GetWriteEnterExpressionv()|0);
   $Result = $12;
   $13 = ($12|0)!=(0);
   if ($13) {
    $14 = $Result;
    $0 = $14;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $15 = $0;
 STACKTOP = sp;return ($15|0);
}
function __Z13CompileRctimev() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 1;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 0;
   $7 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   $13 = (__Z8GetCommav()|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   }
   $16 = (__Z10Enter0Code16TInstructionCode(41)|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    $18 = $Result;
    $0 = $18;
    break;
   }
   $19 = (__Z23GetWriteEnterExpressionv()|0);
   $Result = $19;
   $20 = ($19|0)!=(0);
   if ($20) {
    $21 = $Result;
    $0 = $21;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $22 = $0;
 STACKTOP = sp;return ($22|0);
}
function __Z11CompileReadv() {
 var $$byval_copy = 0, $$byval_copy1 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0;
 var $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0;
 var $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0;
 var $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0;
 var $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0;
 var $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0;
 var $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0;
 var $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0;
 var $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0;
 var $98 = 0, $99 = 0, $Element = 0, $Idx = 0, $PrevElement = 0, $Result = 0, $Temp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy1 = sp;
 $$byval_copy = sp + 40|0;
 $Element = sp + 12|0;
 $1 = sp + 52|0;
 $2 = sp + 24|0;
 $Temp = 0;
 $Idx = 0;
 HEAP8[241856>>0] = 0;
 $3 = (__Z23GetValueEnterExpressionhh(1,0)|0);
 $Result = $3;
 $4 = ($3|0)!=(0);
 if ($4) {
  $5 = $Result;
  $0 = $5;
  $219 = $0;
  STACKTOP = sp;return ($219|0);
 }
 __Z14CopyExpressionhh(0,1);
 $6 = (__Z10Enter0Code16TInstructionCode(19)|0);
 $Result = $6;
 $7 = ($6|0)!=(0);
 if ($7) {
  $8 = $Result;
  $0 = $8;
  $219 = $0;
  STACKTOP = sp;return ($219|0);
 }
 $9 = (__Z8GetCommav()|0);
 $Result = $9;
 $10 = ($9|0)!=(0);
 if ($10) {
  $11 = $Result;
  $0 = $11;
  $219 = $0;
  STACKTOP = sp;return ($219|0);
 }
 while(1) {
  $12 = HEAP16[258728>>1]|0;
  $13 = $12&65535;
  $14 = (($13) + 14)|0;
  $15 = $14&65535;
  $16 = (__Z12EnterAddresst($15)|0);
  $Result = $16;
  $17 = ($16|0)!=(0);
  if ($17) {
   label = 9;
   break;
  }
  $19 = HEAP8[238424>>0]|0;
  $20 = ($19<<24>>24)!=(0);
  if ($20) {
   $21 = (__Z14PreviewElementP12TElementList($Element)|0);
   $22 = ($21<<24>>24)!=(0);
   if ($22) {
    $23 = HEAP32[$Element>>2]|0;
    $24 = ($23|0)==(6);
    if ($24) {
     (__Z10GetElementP12TElementList($Element)|0);
     $25 = (($Element) + 4|0);
     $26 = HEAP16[$25>>1]|0;
     $27 = $26&65535;
     $28 = ($27|0)!=(3);
     if ($28) {
      label = 14;
      break;
     }
     $30 = HEAP16[238720>>1]|0;
     $31 = $30&65535;
     $Temp = $31;
    }
   }
  }
  HEAP8[241856>>0] = 1;
  $32 = (__Z23GetWriteEnterExpressionv()|0);
  $Result = $32;
  $33 = ($32|0)!=(0);
  if ($33) {
   label = 17;
   break;
  }
  $35 = $Temp;
  $36 = ($35|0)>(0);
  if ($36) {
   $37 = HEAP16[238720>>1]|0;
   $38 = $37&65535;
   $PrevElement = $38;
   $39 = $Temp;
   $40 = $39&65535;
   HEAP16[238720>>1] = $40;
   $41 = (__Z10GetElementP12TElementList($Element)|0);
   $42 = ($41<<24>>24)!=(0);
   if ($42) {
    $43 = (($Element) + 4|0);
    $44 = HEAP16[$43>>1]|0;
    $45 = $44&65535;
    $46 = $45 & 3840;
    $47 = ($46|0)!=(768);
    if ($47) {
     label = 21;
     break;
    }
   }
   $49 = (($Element) + 6|0);
   $50 = HEAP16[$49>>1]|0;
   $51 = $50&65535;
   $Temp = $51;
   $52 = (__Z10GetElementP12TElementList($Element)|0);
   $53 = ($52<<24>>24)!=(0);
   if ($53) {
    $54 = HEAP32[$Element>>2]|0;
    $55 = ($54|0)==(13);
    if ($55) {
     label = 24;
     break;
    }
   }
   $71 = $PrevElement;
   $72 = $71&65535;
   HEAP16[238720>>1] = $72;
   __Z14CopyExpressionhh(0,2);
   __Z14CopyExpressionhh(1,0);
   $73 = $Idx;
   $74 = (($73) + 1)|0;
   $Idx = $74;
   $75 = $Idx;
   $76 = $75&65535;
   $77 = (($Element) + 4|0);
   HEAP16[$77>>1] = $76;
   ;HEAP32[$1+0>>2]=HEAP32[$Element+0>>2]|0;HEAP32[$1+4>>2]=HEAP32[$Element+4>>2]|0;HEAP32[$1+8>>2]=HEAP32[$Element+8>>2]|0;
   ;HEAP32[$$byval_copy+0>>2]=HEAP32[$1+0>>2]|0;HEAP32[$$byval_copy+4>>2]=HEAP32[$1+4>>2]|0;HEAP32[$$byval_copy+8>>2]=HEAP32[$1+8>>2]|0;
   $78 = (__Z23EnterExpressionConstant12TElementList($$byval_copy)|0);
   $Result = $78;
   $79 = ($78|0)!=(0);
   if ($79) {
    label = 26;
    break;
   }
   $81 = (__Z23EnterExpressionOperatorh(15)|0);
   $Result = $81;
   $82 = ($81|0)!=(0);
   if ($82) {
    label = 28;
    break;
   }
   $84 = (__Z15EnterExpressionhh(0,1)|0);
   $Result = $84;
   $85 = ($84|0)!=(0);
   if ($85) {
    label = 30;
    break;
   }
   $87 = (__Z10Enter0Code16TInstructionCode(19)|0);
   $Result = $87;
   $88 = ($87|0)!=(0);
   if ($88) {
    label = 32;
    break;
   }
   $90 = HEAP16[258728>>1]|0;
   $91 = $90&65535;
   $92 = (($91) + 14)|0;
   $93 = $92&65535;
   $94 = (__Z12EnterAddresst($93)|0);
   $Result = $94;
   $95 = ($94|0)!=(0);
   if ($95) {
    label = 34;
    break;
   }
   __Z14CopyExpressionhh(2,0);
   $97 = HEAP16[238456>>1]|0;
   $98 = $97&65535;
   $99 = (($98) - 10)|0;
   $100 = (($99|0) / 16)&-1;
   $101 = (($100) + 1)|0;
   $102 = (238456 + ($101<<1)|0);
   $103 = HEAP16[$102>>1]|0;
   $104 = $103&65535;
   $105 = HEAP16[238456>>1]|0;
   $106 = $105&65535;
   $107 = (($106) - 10)|0;
   $108 = (($107|0) % 16)&-1;
   $109 = (16 - ($108))|0;
   $110 = 1 << $109;
   $111 = (($110) - 1)|0;
   $112 = $104 & $111;
   $Temp = $112;
   $113 = HEAP16[238456>>1]|0;
   $114 = $113&65535;
   $115 = (($114) - 10)|0;
   $116 = (($115|0) % 16)&-1;
   $117 = (16 - ($116))|0;
   $118 = ($117|0)<(10);
   if ($118) {
    $119 = $Temp;
    $120 = HEAP16[238456>>1]|0;
    $121 = $120&65535;
    $122 = (($121) - 10)|0;
    $123 = (($122|0) % 16)&-1;
    $124 = (16 - ($123))|0;
    $125 = (10 - ($124))|0;
    $126 = $119 << $125;
    $127 = HEAP16[238456>>1]|0;
    $128 = $127&65535;
    $129 = (($128|0) / 16)&-1;
    $130 = (($129) + 1)|0;
    $131 = (238456 + ($130<<1)|0);
    $132 = HEAP16[$131>>1]|0;
    $133 = $132&65535;
    $134 = (($126) + ($133))|0;
    $Temp = $134;
   }
   $135 = HEAP16[238456>>1]|0;
   $136 = $135&65535;
   $137 = (($136) - 10)|0;
   $138 = (($137|0) / 16)&-1;
   $139 = (($138) + 1)|0;
   $140 = (238456 + ($139<<1)|0);
   $141 = HEAP16[$140>>1]|0;
   $142 = $141&65535;
   $143 = HEAP16[238456>>1]|0;
   $144 = $143&65535;
   $145 = (($144) - 10)|0;
   $146 = (($145|0) % 16)&-1;
   $147 = (16 - ($146))|0;
   $148 = $142 >> $147;
   $149 = $148&65535;
   $150 = HEAP16[238456>>1]|0;
   $151 = $150&65535;
   $152 = (($151) - 10)|0;
   $153 = (($152|0) / 16)&-1;
   $154 = (($153) + 1)|0;
   $155 = (238456 + ($154<<1)|0);
   HEAP16[$155>>1] = $149;
   $156 = HEAP16[238456>>1]|0;
   $157 = $156&65535;
   $158 = (($157) - 10)|0;
   $159 = $158&65535;
   HEAP16[238456>>1] = $159;
   $160 = HEAP16[238456>>1]|0;
   $161 = $160&65535;
   $162 = ($161|0)>(0);
   if ($162) {
    $163 = (__Z19EnterExpressionBitsht(7,66)|0);
    $Result = $163;
    $164 = ($163|0)!=(0);
    if ($164) {
     label = 39;
     break;
    }
    $166 = (__Z23EnterExpressionOperatorh(18)|0);
    $Result = $166;
    $167 = ($166|0)!=(0);
    if ($167) {
     label = 41;
     break;
    }
    $169 = (__Z19EnterExpressionBitsht(1,1)|0);
    $Result = $169;
    $170 = ($169|0)!=(0);
    if ($170) {
     label = 43;
     break;
    }
   }
   $172 = $Temp;
   $173 = $172 & 992;
   $174 = $173 << 1;
   $175 = $Temp;
   $176 = $175 & 15;
   $177 = $176<<1;
   $178 = (($177) + 1)|0;
   $179 = (($174) + ($178))|0;
   $180 = $179&65535;
   $181 = (__Z19EnterExpressionBitsht(11,$180)|0);
   $Result = $181;
   $182 = ($181|0)!=(0);
   if ($182) {
    label = 46;
    break;
   }
   $184 = (__Z15EnterExpressionhh(0,0)|0);
   $Result = $184;
   $185 = ($184|0)!=(0);
   if ($185) {
    label = 48;
    break;
   }
   $187 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $187;
   $188 = ($187|0)!=(0);
   if ($188) {
    label = 50;
    break;
   }
  }
  $190 = $Idx;
  $191 = (($190) + 1)|0;
  $Idx = $191;
  $Temp = 0;
  $192 = HEAP8[238424>>0]|0;
  $193 = ($192<<24>>24)!=(0);
  if ($193) {
   (__Z14PreviewElementP12TElementList($Element)|0);
  } else {
   HEAP32[$Element>>2] = 47;
  }
  $194 = HEAP32[$Element>>2]|0;
  $195 = ($194|0)==(14);
  if ($195) {
   __Z14CopyExpressionhh(1,0);
   $196 = $Idx;
   $197 = $196&65535;
   $198 = (($Element) + 4|0);
   HEAP16[$198>>1] = $197;
   ;HEAP32[$2+0>>2]=HEAP32[$Element+0>>2]|0;HEAP32[$2+4>>2]=HEAP32[$Element+4>>2]|0;HEAP32[$2+8>>2]=HEAP32[$Element+8>>2]|0;
   ;HEAP32[$$byval_copy1+0>>2]=HEAP32[$2+0>>2]|0;HEAP32[$$byval_copy1+4>>2]=HEAP32[$2+4>>2]|0;HEAP32[$$byval_copy1+8>>2]=HEAP32[$2+8>>2]|0;
   $199 = (__Z23EnterExpressionConstant12TElementList($$byval_copy1)|0);
   $Result = $199;
   $200 = ($199|0)!=(0);
   if ($200) {
    label = 57;
    break;
   }
   $202 = (__Z23EnterExpressionOperatorh(15)|0);
   $Result = $202;
   $203 = ($202|0)!=(0);
   if ($203) {
    label = 59;
    break;
   }
   $205 = (__Z15EnterExpressionhh(0,1)|0);
   $Result = $205;
   $206 = ($205|0)!=(0);
   if ($206) {
    label = 61;
    break;
   }
   $208 = (__Z10Enter0Code16TInstructionCode(19)|0);
   $Result = $208;
   $209 = ($208|0)!=(0);
   if ($209) {
    label = 63;
    break;
   }
   $211 = (__Z8GetCommav()|0);
   $Result = $211;
   $212 = ($211|0)!=(0);
   if ($212) {
    label = 65;
    break;
   }
  }
  $214 = HEAP32[$Element>>2]|0;
  $215 = ($214|0)==(14);
  if (!($215)) {
   label = 69;
   break;
  }
 }
 switch (label|0) {
  case 9: {
   $18 = $Result;
   $0 = $18;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 14: {
   $29 = (__Z5Error10TErrorCode(76)|0);
   $0 = $29;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 17: {
   $34 = $Result;
   $0 = $34;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 21: {
   $48 = (__Z5Error10TErrorCode(77)|0);
   $0 = $48;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 24: {
   (__Z10GetElementP12TElementList($Element)|0);
   $56 = $Temp;
   $57 = HEAP32[8>>2]|0;
   $58 = (($57) + 92|0);
   HEAP32[$58>>2] = $56;
   $59 = (($Element) + 6|0);
   $60 = HEAP16[$59>>1]|0;
   $61 = $60&65535;
   $62 = $Temp;
   $63 = (($61) - ($62))|0;
   $64 = (($Element) + 8|0);
   $65 = HEAP8[$64>>0]|0;
   $66 = $65&255;
   $67 = (($63) + ($66))|0;
   $68 = HEAP32[8>>2]|0;
   $69 = (($68) + 96|0);
   HEAP32[$69>>2] = $67;
   $70 = (__Z5Error10TErrorCode(77)|0);
   $0 = $70;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 26: {
   $80 = $Result;
   $0 = $80;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 28: {
   $83 = $Result;
   $0 = $83;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 30: {
   $86 = $Result;
   $0 = $86;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 32: {
   $89 = $Result;
   $0 = $89;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 34: {
   $96 = $Result;
   $0 = $96;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 39: {
   $165 = $Result;
   $0 = $165;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 41: {
   $168 = $Result;
   $0 = $168;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 43: {
   $171 = $Result;
   $0 = $171;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 46: {
   $183 = $Result;
   $0 = $183;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 48: {
   $186 = $Result;
   $0 = $186;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 50: {
   $189 = $Result;
   $0 = $189;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 57: {
   $201 = $Result;
   $0 = $201;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 59: {
   $204 = $Result;
   $0 = $204;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 61: {
   $207 = $Result;
   $0 = $207;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 63: {
   $210 = $Result;
   $0 = $210;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 65: {
   $213 = $Result;
   $0 = $213;
   $219 = $0;
   STACKTOP = sp;return ($219|0);
   break;
  }
  case 69: {
   $216 = HEAP32[$Element>>2]|0;
   $217 = ($216|0)!=(47);
   if ($217) {
    (__Z10GetElementP12TElementList($Element)|0);
    $218 = (__Z5Error10TErrorCode(32)|0);
    $0 = $218;
    $219 = $0;
    STACKTOP = sp;return ($219|0);
   } else {
    $0 = 0;
    $219 = $0;
    STACKTOP = sp;return ($219|0);
   }
   break;
  }
 }
 return (0)|0;
}
function __Z13CompileReturnv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = (__Z10Enter0Code16TInstructionCode(11)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 if ($2) {
  $3 = $Result;
  $0 = $3;
 } else {
  $0 = 0;
 }
 $4 = $0;
 STACKTOP = sp;return ($4|0);
}
function __Z14CompileReversev() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(8)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $7 = $0;
 STACKTOP = sp;return ($7|0);
}
function __Z10CompileRunv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,0)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(29)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $7 = $0;
 STACKTOP = sp;return ($7|0);
}
function __Z13CompileSelectv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Element = 0, $Idx = 0, $Result = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 8|0;
 $1 = HEAP8[250440>>0]|0;
 $2 = $1&255;
 $3 = ($2|0)==(16);
 if ($3) {
  $4 = (__Z5Error10TErrorCode(82)|0);
  $0 = $4;
  $56 = $0;
  STACKTOP = sp;return ($56|0);
 }
 $5 = HEAP8[238776>>0]|0;
 $6 = $5&255;
 $7 = (238784 + (($6*48)|0)|0);
 HEAP32[$7>>2] = 8;
 $8 = HEAP16[238720>>1]|0;
 $9 = $8&65535;
 $10 = (($9) - 1)|0;
 $11 = $10&65535;
 $12 = HEAP8[238776>>0]|0;
 $13 = $12&255;
 $14 = (238784 + (($13*48)|0)|0);
 $15 = (($14) + 4|0);
 HEAP16[$15>>1] = $11;
 $16 = HEAP16[238720>>1]|0;
 $17 = HEAP8[238776>>0]|0;
 $18 = $17&255;
 $19 = (238784 + (($18*48)|0)|0);
 $20 = (($19) + 6|0);
 HEAP16[$20>>1] = $16;
 $21 = HEAP8[238776>>0]|0;
 $22 = $21&255;
 $23 = (238784 + (($22*48)|0)|0);
 $24 = (($23) + 14|0);
 HEAP16[$24>>1] = 0;
 $Idx = 0;
 while(1) {
  $25 = $Idx;
  $26 = ($25|0)<(16);
  if (!($26)) {
   break;
  }
  $27 = $Idx;
  $28 = HEAP8[238776>>0]|0;
  $29 = $28&255;
  $30 = (238784 + (($29*48)|0)|0);
  $31 = (($30) + 16|0);
  $32 = (($31) + ($27<<1)|0);
  HEAP16[$32>>1] = 0;
  $33 = $Idx;
  $34 = (($33) + 1)|0;
  $Idx = $34;
 }
 $35 = HEAP8[238776>>0]|0;
 $36 = (($35) + 1)<<24>>24;
 HEAP8[238776>>0] = $36;
 $37 = HEAP8[250440>>0]|0;
 $38 = (($37) + 1)<<24>>24;
 HEAP8[250440>>0] = $38;
 HEAP8[241856>>0] = 0;
 $39 = (__Z19GetValueConditionalhhi(0,0,0)|0);
 $Result = $39;
 $40 = ($39|0)!=(0);
 if ($40) {
  $41 = $Result;
  $0 = $41;
  $56 = $0;
  STACKTOP = sp;return ($56|0);
 }
 (__Z10GetElementP12TElementList($Element)|0);
 $42 = HEAP32[$Element>>2]|0;
 $43 = ($42|0)!=(47);
 if ($43) {
  $44 = (__Z5Error10TErrorCode(31)|0);
  $0 = $44;
  $56 = $0;
  STACKTOP = sp;return ($56|0);
 }
 (__Z10GetElementP12TElementList($Element)|0);
 $45 = HEAP32[$Element>>2]|0;
 $46 = ($45|0)==(3);
 if ($46) {
  $47 = (($Element) + 4|0);
  $48 = HEAP16[$47>>1]|0;
  $49 = $48&65535;
  $50 = ($49|0)==(3);
  if ($50) {
   $52 = HEAP16[238720>>1]|0;
   $53 = $52&65535;
   $54 = (($53) - 2)|0;
   $55 = $54&65535;
   HEAP16[238720>>1] = $55;
   $0 = 0;
   $56 = $0;
   STACKTOP = sp;return ($56|0);
  }
 }
 $51 = (__Z5Error10TErrorCode(83)|0);
 $0 = $51;
 $56 = $0;
 STACKTOP = sp;return ($56|0);
}
function __Z12CompileSerinv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $9 = 0, $Flow = 0, $Preview = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Preview = sp;
 $Flow = 0;
 HEAP8[241856>>0] = 4;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 L1: do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z14CheckBackslashv()|0);
   $5 = ($4<<24>>24)!=(0);
   do {
    if ($5) {
     HEAP8[241856>>0] = 5;
     $6 = (__Z8GetValuehh(2,1)|0);
     $Result = $6;
     $7 = ($6|0)!=(0);
     if ($7) {
      $8 = $Result;
      $0 = $8;
      break L1;
     } else {
      $Flow = 1;
      break;
     }
    }
   } while(0);
   $9 = (__Z8GetCommav()|0);
   $Result = $9;
   $10 = ($9|0)!=(0);
   if ($10) {
    $11 = $Result;
    $0 = $11;
    break;
   }
   HEAP8[241856>>0] = 3;
   $12 = (__Z8GetValuehh(3,0)|0);
   $Result = $12;
   $13 = ($12|0)!=(0);
   if ($13) {
    $14 = $Result;
    $0 = $14;
    break;
   }
   $15 = (__Z8GetCommav()|0);
   $Result = $15;
   $16 = ($15|0)!=(0);
   if ($16) {
    $17 = $Result;
    $0 = $17;
    break;
   }
   (__Z14PreviewElementP12TElementList($Preview)|0);
   $18 = HEAP32[$Preview>>2]|0;
   $19 = ($18|0)!=(19);
   do {
    if ($19) {
     $20 = HEAP32[$Preview>>2]|0;
     $21 = ($20|0)==(43);
     $22 = $21&1;
     $23 = HEAP32[$Preview>>2]|0;
     $24 = ($23|0)==(46);
     $25 = $24&1;
     $26 = $22 | $25;
     $27 = ($26|0)!=(0);
     do {
      if ($27) {
       $28 = (__Z11EnterEEPROMht(8,221)|0);
       $Result = $28;
       $29 = ($28|0)!=(0);
       if ($29) {
        $30 = $Result;
        $0 = $30;
        break L1;
       }
       $31 = (__Z15GetAddressEnterv()|0);
       $Result = $31;
       $32 = ($31|0)!=(0);
       if ($32) {
        $33 = $Result;
        $0 = $33;
        break L1;
       }
       $34 = (__Z8GetCommav()|0);
       $Result = $34;
       $35 = ($34|0)!=(0);
       if ($35) {
        $36 = $Result;
        $0 = $36;
        break L1;
       }
       (__Z14PreviewElementP12TElementList($Preview)|0);
       $37 = HEAP32[$Preview>>2]|0;
       $38 = ($37|0)==(19);
       do {
        if ($38) {
         $39 = (__Z13EnterConstantth(0,1)|0);
         $Result = $39;
         $40 = ($39|0)!=(0);
         if ($40) {
          $41 = $Result;
          $0 = $41;
          break L1;
         }
         $42 = (__Z13EnterConstantth(1,1)|0);
         $Result = $42;
         $43 = ($42|0)!=(0);
         if ($43) {
          $44 = $Result;
          $0 = $44;
          break L1;
         } else {
          break;
         }
        } else {
         $45 = (__Z10GetTimeoutv()|0);
         $Result = $45;
         $46 = ($45|0)!=(0);
         if ($46) {
          $47 = $Result;
          $0 = $47;
          break L1;
         } else {
          break;
         }
        }
       } while(0);
      } else {
       $48 = (__Z10GetTimeoutv()|0);
       $Result = $48;
       $49 = ($48|0)!=(0);
       if ($49) {
        $50 = $Result;
        $0 = $50;
        break L1;
       } else {
        break;
       }
      }
     } while(0);
    } else {
     $51 = (__Z13EnterConstantth(1,1)|0);
     $Result = $51;
     $52 = ($51|0)!=(0);
     if ($52) {
      $53 = $Result;
      $0 = $53;
      break L1;
     } else {
      break;
     }
    }
   } while(0);
   $54 = (__Z15EnterExpressionhh(3,1)|0);
   $Result = $54;
   $55 = ($54|0)!=(0);
   if ($55) {
    $56 = $Result;
    $0 = $56;
    break;
   }
   $57 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $57;
   $58 = ($57|0)!=(0);
   if ($58) {
    $59 = $Result;
    $0 = $59;
    break;
   }
   $60 = $Flow;
   $61 = ($60<<24>>24)!=(0);
   do {
    if ($61) {
     $62 = (__Z15EnterExpressionhh(2,1)|0);
     $Result = $62;
     $63 = ($62|0)!=(0);
     if ($63) {
      $64 = $Result;
      $0 = $64;
      break L1;
     }
     $65 = (__Z10Enter0Code16TInstructionCode(35)|0);
     $Result = $65;
     $66 = ($65|0)!=(0);
     if ($66) {
      $67 = $Result;
      $0 = $67;
      break L1;
     } else {
      break;
     }
    } else {
     $68 = (__Z10Enter0Code16TInstructionCode(34)|0);
     $Result = $68;
     $69 = ($68|0)!=(0);
     if ($69) {
      $70 = $Result;
      $0 = $70;
      break L1;
     } else {
      break;
     }
    }
   } while(0);
   $71 = (__Z14GetLeftBracketv()|0);
   $Result = $71;
   $72 = ($71|0)!=(0);
   if ($72) {
    $73 = $Result;
    $0 = $73;
    break;
   }
   $74 = (__Z20CompileInputSequencev()|0);
   $Result = $74;
   $75 = ($74|0)!=(0);
   if ($75) {
    $76 = $Result;
    $0 = $76;
    break;
   }
   $77 = (__Z15GetRightBracketv()|0);
   $Result = $77;
   $78 = ($77|0)!=(0);
   if ($78) {
    $79 = $Result;
    $0 = $79;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $80 = $0;
 STACKTOP = sp;return ($80|0);
}
function __Z13CompileSeroutv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $7 = 0, $8 = 0, $9 = 0, $Flow = 0, $Preview = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Preview = sp;
 $Flow = 0;
 HEAP8[241856>>0] = 3;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 L1: do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z14CheckBackslashv()|0);
   $5 = ($4<<24>>24)!=(0);
   do {
    if ($5) {
     HEAP8[241856>>0] = 4;
     $6 = (__Z8GetValuehh(2,1)|0);
     $Result = $6;
     $7 = ($6|0)!=(0);
     if ($7) {
      $8 = $Result;
      $0 = $8;
      break L1;
     } else {
      $Flow = 1;
      break;
     }
    }
   } while(0);
   $9 = (__Z8GetCommav()|0);
   $Result = $9;
   $10 = ($9|0)!=(0);
   if ($10) {
    $11 = $Result;
    $0 = $11;
    break;
   }
   HEAP8[241856>>0] = 2;
   $12 = (__Z8GetValuehh(3,0)|0);
   $Result = $12;
   $13 = ($12|0)!=(0);
   if ($13) {
    $14 = $Result;
    $0 = $14;
    break;
   }
   $15 = (__Z8GetCommav()|0);
   $Result = $15;
   $16 = ($15|0)!=(0);
   if ($16) {
    $17 = $Result;
    $0 = $17;
    break;
   }
   (__Z14PreviewElementP12TElementList($Preview)|0);
   $18 = HEAP32[$Preview>>2]|0;
   $19 = ($18|0)!=(19);
   do {
    if ($19) {
     HEAP8[241856>>0] = 1;
     $20 = (__Z19GetValueConditionalhhi(0,0,0)|0);
     $Result = $20;
     $21 = ($20|0)!=(0);
     if ($21) {
      $22 = $Result;
      $0 = $22;
      break L1;
     }
     $23 = (__Z8GetCommav()|0);
     $Result = $23;
     $24 = ($23|0)!=(0);
     if ($24) {
      $25 = $Result;
      $0 = $25;
      break L1;
     }
     $26 = $Flow;
     $27 = ($26<<24>>24)!=(0);
     do {
      if ($27) {
       $28 = (__Z11EnterEEPROMht(8,221)|0);
       $Result = $28;
       $29 = ($28|0)!=(0);
       if ($29) {
        $30 = $Result;
        $0 = $30;
        break L1;
       }
       $31 = (__Z15GetAddressEnterv()|0);
       $Result = $31;
       $32 = ($31|0)!=(0);
       if ($32) {
        $33 = $Result;
        $0 = $33;
        break L1;
       }
       $34 = (__Z8GetCommav()|0);
       $Result = $34;
       $35 = ($34|0)!=(0);
       if ($35) {
        $36 = $Result;
        $0 = $36;
        break L1;
       } else {
        break;
       }
      }
     } while(0);
     $37 = (__Z15EnterExpressionhh(0,1)|0);
     $Result = $37;
     $38 = ($37|0)!=(0);
     if ($38) {
      $39 = $Result;
      $0 = $39;
      break L1;
     } else {
      break;
     }
    }
   } while(0);
   $40 = (__Z15EnterExpressionhh(3,1)|0);
   $Result = $40;
   $41 = ($40|0)!=(0);
   if ($41) {
    $42 = $Result;
    $0 = $42;
    break;
   }
   $43 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $43;
   $44 = ($43|0)!=(0);
   if ($44) {
    $45 = $Result;
    $0 = $45;
    break;
   }
   $46 = $Flow;
   $47 = ($46<<24>>24)!=(0);
   do {
    if ($47) {
     $48 = (__Z15EnterExpressionhh(2,1)|0);
     $Result = $48;
     $49 = ($48|0)!=(0);
     if ($49) {
      $50 = $Result;
      $0 = $50;
      break L1;
     }
     $51 = (__Z10Enter0Code16TInstructionCode(33)|0);
     $Result = $51;
     $52 = ($51|0)!=(0);
     if ($52) {
      $53 = $Result;
      $0 = $53;
      break L1;
     } else {
      break;
     }
    } else {
     $54 = (__Z10Enter0Code16TInstructionCode(32)|0);
     $Result = $54;
     $55 = ($54|0)!=(0);
     if ($55) {
      $56 = $Result;
      $0 = $56;
      break L1;
     } else {
      break;
     }
    }
   } while(0);
   $57 = (__Z14GetLeftBracketv()|0);
   $Result = $57;
   $58 = ($57|0)!=(0);
   if ($58) {
    $59 = $Result;
    $0 = $59;
    break;
   }
   $60 = (__Z21CompileOutputSequencev()|0);
   $Result = $60;
   $61 = ($60|0)!=(0);
   if ($61) {
    $62 = $Result;
    $0 = $62;
    break;
   }
   $63 = (__Z15GetRightBracketv()|0);
   $Result = $63;
   $64 = ($63|0)!=(0);
   if ($64) {
    $65 = $Result;
    $0 = $65;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $66 = $0;
 STACKTOP = sp;return ($66|0);
}
function __Z14CompileShiftinv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $7 = 0, $8 = 0;
 var $9 = 0, $FoundBracket = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $FoundBracket = sp + 8|0;
 HEAP8[241856>>0] = 1;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 2;
   $7 = (__Z8GetValuehh(2,1)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z8GetCommav()|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   HEAP8[241856>>0] = 0;
   $13 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   }
   $16 = (__Z8GetCommav()|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    $18 = $Result;
    $0 = $18;
    break;
   }
   $19 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $19;
   $20 = ($19|0)!=(0);
   if ($20) {
    $21 = $Result;
    $0 = $21;
    break;
   }
   $22 = (__Z15EnterExpressionhh(2,1)|0);
   $Result = $22;
   $23 = ($22|0)!=(0);
   if ($23) {
    $24 = $Result;
    $0 = $24;
    break;
   }
   $25 = (__Z10Enter0Code16TInstructionCode(39)|0);
   $Result = $25;
   $26 = ($25|0)!=(0);
   if ($26) {
    $27 = $Result;
    $0 = $27;
    break;
   }
   $28 = (__Z14GetLeftBracketv()|0);
   $Result = $28;
   $29 = ($28|0)!=(0);
   if ($29) {
    $30 = $Result;
    $0 = $30;
    break;
   }
   while(1) {
    HEAP8[241856>>0] = 5;
    $31 = (__Z8GetWriteh(1)|0);
    $Result = $31;
    $32 = ($31|0)!=(0);
    if ($32) {
     label = 23;
     break;
    }
    $34 = (__Z14CheckBackslashv()|0);
    $35 = ($34<<24>>24)!=(0);
    if ($35) {
     HEAP8[241856>>0] = 3;
     $36 = (__Z23GetValueEnterExpressionhh(0,0)|0);
     $Result = $36;
     $37 = ($36|0)!=(0);
     if ($37) {
      label = 26;
      break;
     }
    } else {
     $39 = (__Z13EnterConstantth(8,0)|0);
     $Result = $39;
     $40 = ($39|0)!=(0);
     if ($40) {
      label = 29;
      break;
     }
    }
    $42 = (__Z13EnterConstantth(0,1)|0);
    $Result = $42;
    $43 = ($42|0)!=(0);
    if ($43) {
     label = 32;
     break;
    }
    $45 = (__Z11EnterEEPROMht(1,0)|0);
    $Result = $45;
    $46 = ($45|0)!=(0);
    if ($46) {
     label = 34;
     break;
    }
    $48 = (__Z15EnterExpressionhh(1,0)|0);
    $Result = $48;
    $49 = ($48|0)!=(0);
    if ($49) {
     label = 36;
     break;
    }
    $51 = (__Z11EnterEEPROMht(1,0)|0);
    $Result = $51;
    $52 = ($51|0)!=(0);
    if ($52) {
     label = 38;
     break;
    }
    $54 = (__Z17GetCommaOrBracketPh($FoundBracket)|0);
    $Result = $54;
    $55 = ($54|0)!=(0);
    if ($55) {
     label = 40;
     break;
    }
    $57 = HEAP8[$FoundBracket>>0]|0;
    $58 = ($57<<24>>24)!=(0);
    $59 = $58 ^ 1;
    if (!($59)) {
     label = 43;
     break;
    }
   }
   if ((label|0) == 23) {
    $33 = $Result;
    $0 = $33;
    break;
   }
   else if ((label|0) == 26) {
    $38 = $Result;
    $0 = $38;
    break;
   }
   else if ((label|0) == 29) {
    $41 = $Result;
    $0 = $41;
    break;
   }
   else if ((label|0) == 32) {
    $44 = $Result;
    $0 = $44;
    break;
   }
   else if ((label|0) == 34) {
    $47 = $Result;
    $0 = $47;
    break;
   }
   else if ((label|0) == 36) {
    $50 = $Result;
    $0 = $50;
    break;
   }
   else if ((label|0) == 38) {
    $53 = $Result;
    $0 = $53;
    break;
   }
   else if ((label|0) == 40) {
    $56 = $Result;
    $0 = $56;
    break;
   }
   else if ((label|0) == 43) {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $60 = $0;
 STACKTOP = sp;return ($60|0);
}
function __Z15CompileShiftoutv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $FoundBracket = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $FoundBracket = sp + 8|0;
 HEAP8[241856>>0] = 1;
 $1 = (__Z8GetValuehh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 2;
   $7 = (__Z8GetValuehh(2,1)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z8GetCommav()|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   HEAP8[241856>>0] = 0;
   $13 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   }
   $16 = (__Z8GetCommav()|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    $18 = $Result;
    $0 = $18;
    break;
   }
   $19 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $19;
   $20 = ($19|0)!=(0);
   if ($20) {
    $21 = $Result;
    $0 = $21;
    break;
   }
   $22 = (__Z15EnterExpressionhh(2,1)|0);
   $Result = $22;
   $23 = ($22|0)!=(0);
   if ($23) {
    $24 = $Result;
    $0 = $24;
    break;
   }
   $25 = (__Z10Enter0Code16TInstructionCode(40)|0);
   $Result = $25;
   $26 = ($25|0)!=(0);
   if ($26) {
    $27 = $Result;
    $0 = $27;
    break;
   }
   $28 = (__Z14GetLeftBracketv()|0);
   $Result = $28;
   $29 = ($28|0)!=(0);
   if ($29) {
    $30 = $Result;
    $0 = $30;
    break;
   }
   while(1) {
    HEAP8[241856>>0] = 4;
    $31 = (__Z8GetValuehh(1,0)|0);
    $Result = $31;
    $32 = ($31|0)!=(0);
    if ($32) {
     label = 23;
     break;
    }
    $34 = (__Z14CheckBackslashv()|0);
    $35 = ($34<<24>>24)!=(0);
    if ($35) {
     HEAP8[241856>>0] = 3;
     $36 = (__Z23GetValueEnterExpressionhh(0,0)|0);
     $Result = $36;
     $37 = ($36|0)!=(0);
     if ($37) {
      label = 26;
      break;
     }
    } else {
     $39 = (__Z13EnterConstantth(8,0)|0);
     $Result = $39;
     $40 = ($39|0)!=(0);
     if ($40) {
      label = 29;
      break;
     }
    }
    $42 = (__Z15EnterExpressionhh(1,1)|0);
    $Result = $42;
    $43 = ($42|0)!=(0);
    if ($43) {
     label = 32;
     break;
    }
    $45 = (__Z11EnterEEPROMht(1,0)|0);
    $Result = $45;
    $46 = ($45|0)!=(0);
    if ($46) {
     label = 34;
     break;
    }
    $48 = (__Z17GetCommaOrBracketPh($FoundBracket)|0);
    $Result = $48;
    $49 = ($48|0)!=(0);
    if ($49) {
     label = 36;
     break;
    }
    $51 = HEAP8[$FoundBracket>>0]|0;
    $52 = ($51<<24>>24)!=(0);
    $53 = $52 ^ 1;
    if (!($53)) {
     label = 39;
     break;
    }
   }
   if ((label|0) == 23) {
    $33 = $Result;
    $0 = $33;
    break;
   }
   else if ((label|0) == 26) {
    $38 = $Result;
    $0 = $38;
    break;
   }
   else if ((label|0) == 29) {
    $41 = $Result;
    $0 = $41;
    break;
   }
   else if ((label|0) == 32) {
    $44 = $Result;
    $0 = $44;
    break;
   }
   else if ((label|0) == 34) {
    $47 = $Result;
    $0 = $47;
    break;
   }
   else if ((label|0) == 36) {
    $50 = $Result;
    $0 = $50;
    break;
   }
   else if ((label|0) == 39) {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $54 = $0;
 STACKTOP = sp;return ($54|0);
}
function __Z12CompileSleepv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,0)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(1)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   $7 = HEAP16[258728>>1]|0;
   $8 = $7&65535;
   $9 = (($8) + 14)|0;
   $10 = $9&65535;
   $11 = (__Z12EnterAddresst($10)|0);
   $Result = $11;
   $12 = ($11|0)!=(0);
   if ($12) {
    $13 = $Result;
    $0 = $13;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $14 = $0;
 STACKTOP = sp;return ($14|0);
}
function __Z11CompileStopv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = (__Z10Enter0Code16TInstructionCode(3)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 if ($2) {
  $3 = $Result;
  $0 = $3;
 } else {
  $0 = 0;
 }
 $4 = $0;
 STACKTOP = sp;return ($4|0);
}
function __Z12CompileStorev() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,0)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(59)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $7 = $0;
 STACKTOP = sp;return ($7|0);
}
function __Z13CompileTogglev() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z10Enter0Code16TInstructionCode(6)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $7 = $0;
 STACKTOP = sp;return ($7|0);
}
function __Z12CompileWritev() {
 var $$byval_copy = 0, $$byval_copy1 = 0, $$byval_copy2 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0;
 var $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0;
 var $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $Element = 0;
 var $Idx = 0, $Result = 0, $ValueStart = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 112|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy2 = sp + 84|0;
 $$byval_copy1 = sp + 40|0;
 $$byval_copy = sp;
 $Element = sp + 72|0;
 $1 = sp + 52|0;
 $2 = sp + 24|0;
 $3 = sp + 12|0;
 $ValueStart = 0;
 $Idx = 0;
 HEAP8[241856>>0] = 1;
 $4 = (__Z8GetValuehh(1,0)|0);
 $Result = $4;
 $5 = ($4|0)!=(0);
 if ($5) {
  $6 = $Result;
  $0 = $6;
  $95 = $0;
  STACKTOP = sp;return ($95|0);
 }
 while(1) {
  $7 = (__Z8GetCommav()|0);
  $Result = $7;
  $8 = ($7|0)!=(0);
  if ($8) {
   label = 5;
   break;
  }
  $10 = HEAP8[238424>>0]|0;
  $11 = ($10<<24>>24)!=(0);
  if ($11) {
   $12 = (__Z14PreviewElementP12TElementList($Element)|0);
   $13 = ($12<<24>>24)!=(0);
   if ($13) {
    $14 = HEAP32[$Element>>2]|0;
    $15 = ($14|0)==(6);
    if ($15) {
     (__Z10GetElementP12TElementList($Element)|0);
     $16 = (($Element) + 4|0);
     $17 = HEAP16[$16>>1]|0;
     $18 = $17&65535;
     $19 = ($18|0)!=(3);
     if ($19) {
      label = 10;
      break;
     }
     $21 = HEAP16[238720>>1]|0;
     $22 = $21&65535;
     $ValueStart = $22;
    }
   }
  }
  HEAP8[241856>>0] = 0;
  $23 = (__Z23GetValueEnterExpressionhh(1,0)|0);
  $Result = $23;
  $24 = ($23|0)!=(0);
  if ($24) {
   label = 13;
   break;
  }
  __Z14CopyExpressionhh(0,2);
  __Z14CopyExpressionhh(1,0);
  $26 = $Idx;
  $27 = ($26|0)>(0);
  if ($27) {
   $28 = $Idx;
   $29 = $28&65535;
   $30 = (($Element) + 4|0);
   HEAP16[$30>>1] = $29;
   ;HEAP32[$1+0>>2]=HEAP32[$Element+0>>2]|0;HEAP32[$1+4>>2]=HEAP32[$Element+4>>2]|0;HEAP32[$1+8>>2]=HEAP32[$Element+8>>2]|0;
   ;HEAP32[$$byval_copy+0>>2]=HEAP32[$1+0>>2]|0;HEAP32[$$byval_copy+4>>2]=HEAP32[$1+4>>2]|0;HEAP32[$$byval_copy+8>>2]=HEAP32[$1+8>>2]|0;
   $31 = (__Z23EnterExpressionConstant12TElementList($$byval_copy)|0);
   $Result = $31;
   $32 = ($31|0)!=(0);
   if ($32) {
    label = 16;
    break;
   }
   $34 = (__Z23EnterExpressionOperatorh(15)|0);
   $Result = $34;
   $35 = ($34|0)!=(0);
   if ($35) {
    label = 18;
    break;
   }
  }
  $37 = (__Z15EnterExpressionhh(0,1)|0);
  $Result = $37;
  $38 = ($37|0)!=(0);
  if ($38) {
   label = 21;
   break;
  }
  $40 = (__Z10Enter0Code16TInstructionCode(20)|0);
  $Result = $40;
  $41 = ($40|0)!=(0);
  if ($41) {
   label = 23;
   break;
  }
  $43 = HEAP16[258728>>1]|0;
  $44 = $43&65535;
  $45 = (($44) + 14)|0;
  $46 = $45&65535;
  $47 = (__Z12EnterAddresst($46)|0);
  $Result = $47;
  $48 = ($47|0)!=(0);
  if ($48) {
   label = 25;
   break;
  }
  $50 = $ValueStart;
  $51 = ($50|0)>(0);
  if ($51) {
   __Z14CopyExpressionhh(2,0);
   $52 = (($Element) + 4|0);
   HEAP16[$52>>1] = 8;
   ;HEAP32[$2+0>>2]=HEAP32[$Element+0>>2]|0;HEAP32[$2+4>>2]=HEAP32[$Element+4>>2]|0;HEAP32[$2+8>>2]=HEAP32[$Element+8>>2]|0;
   ;HEAP32[$$byval_copy1+0>>2]=HEAP32[$2+0>>2]|0;HEAP32[$$byval_copy1+4>>2]=HEAP32[$2+4>>2]|0;HEAP32[$$byval_copy1+8>>2]=HEAP32[$2+8>>2]|0;
   $53 = (__Z23EnterExpressionConstant12TElementList($$byval_copy1)|0);
   $Result = $53;
   $54 = ($53|0)!=(0);
   if ($54) {
    label = 28;
    break;
   }
   $56 = (__Z23EnterExpressionOperatorh(24)|0);
   $Result = $56;
   $57 = ($56|0)!=(0);
   if ($57) {
    label = 30;
    break;
   }
   $59 = (__Z15EnterExpressionhh(0,1)|0);
   $Result = $59;
   $60 = ($59|0)!=(0);
   if ($60) {
    label = 32;
    break;
   }
   __Z14CopyExpressionhh(1,0);
   $62 = $Idx;
   $63 = (($62) + 1)|0;
   $Idx = $63;
   $64 = $Idx;
   $65 = $64&65535;
   $66 = (($Element) + 4|0);
   HEAP16[$66>>1] = $65;
   ;HEAP32[$3+0>>2]=HEAP32[$Element+0>>2]|0;HEAP32[$3+4>>2]=HEAP32[$Element+4>>2]|0;HEAP32[$3+8>>2]=HEAP32[$Element+8>>2]|0;
   ;HEAP32[$$byval_copy2+0>>2]=HEAP32[$3+0>>2]|0;HEAP32[$$byval_copy2+4>>2]=HEAP32[$3+4>>2]|0;HEAP32[$$byval_copy2+8>>2]=HEAP32[$3+8>>2]|0;
   $67 = (__Z23EnterExpressionConstant12TElementList($$byval_copy2)|0);
   $Result = $67;
   $68 = ($67|0)!=(0);
   if ($68) {
    label = 34;
    break;
   }
   $70 = (__Z23EnterExpressionOperatorh(15)|0);
   $Result = $70;
   $71 = ($70|0)!=(0);
   if ($71) {
    label = 36;
    break;
   }
   $73 = (__Z15EnterExpressionhh(0,1)|0);
   $Result = $73;
   $74 = ($73|0)!=(0);
   if ($74) {
    label = 38;
    break;
   }
   $76 = (__Z10Enter0Code16TInstructionCode(20)|0);
   $Result = $76;
   $77 = ($76|0)!=(0);
   if ($77) {
    label = 40;
    break;
   }
   $79 = HEAP16[258728>>1]|0;
   $80 = $79&65535;
   $81 = (($80) + 14)|0;
   $82 = $81&65535;
   $83 = (__Z12EnterAddresst($82)|0);
   $Result = $83;
   $84 = ($83|0)!=(0);
   if ($84) {
    label = 42;
    break;
   }
  }
  $86 = $Idx;
  $87 = (($86) + 1)|0;
  $Idx = $87;
  $ValueStart = 0;
  $88 = HEAP8[238424>>0]|0;
  $89 = ($88<<24>>24)!=(0);
  if ($89) {
   (__Z14PreviewElementP12TElementList($Element)|0);
  } else {
   HEAP32[$Element>>2] = 47;
  }
  $90 = HEAP32[$Element>>2]|0;
  $91 = ($90|0)==(14);
  if (!($91)) {
   label = 49;
   break;
  }
 }
 switch (label|0) {
  case 5: {
   $9 = $Result;
   $0 = $9;
   $95 = $0;
   STACKTOP = sp;return ($95|0);
   break;
  }
  case 10: {
   $20 = (__Z5Error10TErrorCode(114)|0);
   $0 = $20;
   $95 = $0;
   STACKTOP = sp;return ($95|0);
   break;
  }
  case 13: {
   $25 = $Result;
   $0 = $25;
   $95 = $0;
   STACKTOP = sp;return ($95|0);
   break;
  }
  case 16: {
   $33 = $Result;
   $0 = $33;
   $95 = $0;
   STACKTOP = sp;return ($95|0);
   break;
  }
  case 18: {
   $36 = $Result;
   $0 = $36;
   $95 = $0;
   STACKTOP = sp;return ($95|0);
   break;
  }
  case 21: {
   $39 = $Result;
   $0 = $39;
   $95 = $0;
   STACKTOP = sp;return ($95|0);
   break;
  }
  case 23: {
   $42 = $Result;
   $0 = $42;
   $95 = $0;
   STACKTOP = sp;return ($95|0);
   break;
  }
  case 25: {
   $49 = $Result;
   $0 = $49;
   $95 = $0;
   STACKTOP = sp;return ($95|0);
   break;
  }
  case 28: {
   $55 = $Result;
   $0 = $55;
   $95 = $0;
   STACKTOP = sp;return ($95|0);
   break;
  }
  case 30: {
   $58 = $Result;
   $0 = $58;
   $95 = $0;
   STACKTOP = sp;return ($95|0);
   break;
  }
  case 32: {
   $61 = $Result;
   $0 = $61;
   $95 = $0;
   STACKTOP = sp;return ($95|0);
   break;
  }
  case 34: {
   $69 = $Result;
   $0 = $69;
   $95 = $0;
   STACKTOP = sp;return ($95|0);
   break;
  }
  case 36: {
   $72 = $Result;
   $0 = $72;
   $95 = $0;
   STACKTOP = sp;return ($95|0);
   break;
  }
  case 38: {
   $75 = $Result;
   $0 = $75;
   $95 = $0;
   STACKTOP = sp;return ($95|0);
   break;
  }
  case 40: {
   $78 = $Result;
   $0 = $78;
   $95 = $0;
   STACKTOP = sp;return ($95|0);
   break;
  }
  case 42: {
   $85 = $Result;
   $0 = $85;
   $95 = $0;
   STACKTOP = sp;return ($95|0);
   break;
  }
  case 49: {
   $92 = HEAP32[$Element>>2]|0;
   $93 = ($92|0)!=(47);
   if ($93) {
    (__Z10GetElementP12TElementList($Element)|0);
    $94 = (__Z5Error10TErrorCode(32)|0);
    $0 = $94;
    $95 = $0;
    STACKTOP = sp;return ($95|0);
   } else {
    $0 = 0;
    $95 = $0;
    STACKTOP = sp;return ($95|0);
   }
   break;
  }
 }
 return (0)|0;
}
function __Z11CompileXoutv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $7 = 0, $8 = 0, $9 = 0, $FoundBracket = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $FoundBracket = sp + 8|0;
 HEAP8[241856>>0] = 0;
 $1 = (__Z23GetValueEnterExpressionhh(1,1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 L1: do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   HEAP8[241856>>0] = 1;
   $7 = (__Z23GetValueEnterExpressionhh(1,1)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z8GetCommav()|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   $13 = (__Z10Enter0Code16TInstructionCode(25)|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   }
   $16 = (__Z14GetLeftBracketv()|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    $18 = $Result;
    $0 = $18;
    break;
   }
   while(1) {
    HEAP8[241856>>0] = 2;
    $19 = (__Z23GetValueEnterExpressionhh(0,0)|0);
    $Result = $19;
    $20 = ($19|0)!=(0);
    if ($20) {
     label = 15;
     break;
    }
    $22 = (__Z12GetBackslashv()|0);
    $Result = $22;
    $23 = ($22|0)!=(0);
    if ($23) {
     label = 17;
     break;
    }
    $25 = (__Z13EnterConstantth(16,1)|0);
    $Result = $25;
    $26 = ($25|0)!=(0);
    if ($26) {
     label = 19;
     break;
    }
    $28 = (__Z13EnterOperator13TOperatorCode(20)|0);
    $Result = $28;
    $29 = ($28|0)!=(0);
    if ($29) {
     label = 21;
     break;
    }
    HEAP8[241856>>0] = 3;
    $31 = (__Z23GetValueEnterExpressionhh(1,0)|0);
    $Result = $31;
    $32 = ($31|0)!=(0);
    if ($32) {
     label = 23;
     break;
    }
    $34 = (__Z13EnterConstantth(16,1)|0);
    $Result = $34;
    $35 = ($34|0)!=(0);
    if ($35) {
     label = 25;
     break;
    }
    $37 = (__Z13EnterOperator13TOperatorCode(18)|0);
    $Result = $37;
    $38 = ($37|0)!=(0);
    if ($38) {
     label = 27;
     break;
    }
    $40 = (__Z13EnterOperator13TOperatorCode(15)|0);
    $Result = $40;
    $41 = ($40|0)!=(0);
    if ($41) {
     label = 29;
     break;
    }
    $43 = (__Z14CheckBackslashv()|0);
    $44 = ($43<<24>>24)!=(0);
    if ($44) {
     HEAP8[241856>>0] = 3;
     $45 = (__Z23GetValueEnterExpressionhh(1,0)|0);
     $Result = $45;
     $46 = ($45|0)!=(0);
     if ($46) {
      label = 32;
      break;
     }
    } else {
     $48 = (__Z13EnterConstantth(2,1)|0);
     $Result = $48;
     $49 = ($48|0)!=(0);
     if ($49) {
      label = 35;
      break;
     }
    }
    $51 = (__Z13EnterOperator13TOperatorCode(2)|0);
    $Result = $51;
    $52 = ($51|0)!=(0);
    if ($52) {
     label = 38;
     break;
    }
    $54 = (__Z11EnterEEPROMht(1,0)|0);
    $Result = $54;
    $55 = ($54|0)!=(0);
    if ($55) {
     label = 40;
     break;
    }
    $57 = (__Z17GetCommaOrBracketPh($FoundBracket)|0);
    $Result = $57;
    $58 = ($57|0)!=(0);
    if ($58) {
     label = 42;
     break;
    }
    $60 = HEAP8[$FoundBracket>>0]|0;
    $61 = ($60<<24>>24)!=(0);
    $62 = $61 ^ 1;
    if (!($62)) {
     label = 45;
     break;
    }
   }
   switch (label|0) {
    case 15: {
     $21 = $Result;
     $0 = $21;
     break L1;
     break;
    }
    case 17: {
     $24 = $Result;
     $0 = $24;
     break L1;
     break;
    }
    case 19: {
     $27 = $Result;
     $0 = $27;
     break L1;
     break;
    }
    case 21: {
     $30 = $Result;
     $0 = $30;
     break L1;
     break;
    }
    case 23: {
     $33 = $Result;
     $0 = $33;
     break L1;
     break;
    }
    case 25: {
     $36 = $Result;
     $0 = $36;
     break L1;
     break;
    }
    case 27: {
     $39 = $Result;
     $0 = $39;
     break L1;
     break;
    }
    case 29: {
     $42 = $Result;
     $0 = $42;
     break L1;
     break;
    }
    case 32: {
     $47 = $Result;
     $0 = $47;
     break L1;
     break;
    }
    case 35: {
     $50 = $Result;
     $0 = $50;
     break L1;
     break;
    }
    case 38: {
     $53 = $Result;
     $0 = $53;
     break L1;
     break;
    }
    case 40: {
     $56 = $Result;
     $0 = $56;
     break L1;
     break;
    }
    case 42: {
     $59 = $Result;
     $0 = $59;
     break L1;
     break;
    }
    case 45: {
     $0 = 0;
     break L1;
     break;
    }
   }
  }
 } while(0);
 $63 = $0;
 STACKTOP = sp;return ($63|0);
}
function __Z15PatchSkipLabelsh($Exits) {
 $Exits = $Exits|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Idx = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Exits;
 $2 = $1;
 $3 = ($2<<24>>24)!=(0);
 do {
  if ($3) {
   $Idx = 0;
   while(1) {
    $4 = $Idx;
    $5 = ($4|0)<(16);
    if ($5) {
     $6 = $Idx;
     $7 = HEAP8[238776>>0]|0;
     $8 = $7&255;
     $9 = (($8) - 1)|0;
     $10 = (238784 + (($9*48)|0)|0);
     $11 = (($10) + 16|0);
     $12 = (($11) + ($6<<1)|0);
     $13 = HEAP16[$12>>1]|0;
     $14 = $13&65535;
     $15 = ($14|0)!=(0);
     $52 = $15;
    } else {
     $52 = 0;
    }
    if (!($52)) {
     label = 9;
     break;
    }
    $16 = $Idx;
    $17 = HEAP8[238776>>0]|0;
    $18 = $17&255;
    $19 = (($18) - 1)|0;
    $20 = (238784 + (($19*48)|0)|0);
    $21 = (($20) + 16|0);
    $22 = (($21) + ($16<<1)|0);
    $23 = HEAP16[$22>>1]|0;
    $24 = (__Z12PatchAddresst($23)|0);
    $Result = $24;
    $25 = ($24|0)!=(0);
    if ($25) {
     break;
    }
    $27 = $Idx;
    $28 = (($27) + 1)|0;
    $Idx = $28;
   }
   if ((label|0) == 9) {
    break;
   }
   $26 = $Result;
   $0 = $26;
   $51 = $0;
   STACKTOP = sp;return ($51|0);
  } else {
   $29 = HEAP8[238776>>0]|0;
   $30 = $29&255;
   $31 = (($30) - 1)|0;
   $32 = (238784 + (($31*48)|0)|0);
   $33 = (($32) + 14|0);
   $34 = HEAP16[$33>>1]|0;
   $35 = $34&65535;
   $36 = ($35|0)>(0);
   do {
    if ($36) {
     $37 = HEAP8[238776>>0]|0;
     $38 = $37&255;
     $39 = (($38) - 1)|0;
     $40 = (238784 + (($39*48)|0)|0);
     $41 = (($40) + 14|0);
     $42 = HEAP16[$41>>1]|0;
     $43 = (__Z12PatchAddresst($42)|0);
     $Result = $43;
     $44 = ($43|0)!=(0);
     if (!($44)) {
      $46 = HEAP8[238776>>0]|0;
      $47 = $46&255;
      $48 = (($47) - 1)|0;
      $49 = (238784 + (($48*48)|0)|0);
      $50 = (($49) + 14|0);
      HEAP16[$50>>1] = 0;
      break;
     }
     $45 = $Result;
     $0 = $45;
     $51 = $0;
     STACKTOP = sp;return ($51|0);
    }
   } while(0);
  }
 } while(0);
 $0 = 0;
 $51 = $0;
 STACKTOP = sp;return ($51|0);
}
function __Z10Enter0Code16TInstructionCode($Code) {
 $Code = $Code|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Code;
 $2 = HEAP32[8>>2]|0;
 $3 = (($2) + 9|0);
 $4 = HEAP8[$3>>0]|0;
 $5 = $4&255;
 $6 = (($5) - 2)|0;
 $7 = $1;
 $8 = (258736 + (($7*5)|0)|0);
 $9 = (($8) + ($6)|0);
 $10 = HEAP8[$9>>0]|0;
 $11 = $10&255;
 $12 = (__Z11EnterEEPROMht(7,$11)|0);
 $Result = $12;
 $13 = ($12|0)!=(0);
 if ($13) {
  $14 = $Result;
  $0 = $14;
  $15 = $0;
  STACKTOP = sp;return ($15|0);
 } else {
  $0 = 0;
  $15 = $0;
  STACKTOP = sp;return ($15|0);
 }
 return (0)|0;
}
function __Z23GetValueEnterExpressionhh($Enter1Before,$PinIsConstant) {
 $Enter1Before = $Enter1Before|0;
 $PinIsConstant = $PinIsConstant|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Enter1Before;
 $2 = $PinIsConstant;
 $3 = $2;
 $4 = (__Z19GetValueConditionalhhi(0,$3,0)|0);
 $Result = $4;
 $5 = ($4|0)!=(0);
 do {
  if ($5) {
   $6 = $Result;
   $0 = $6;
  } else {
   $7 = $1;
   $8 = (__Z15EnterExpressionhh(0,$7)|0);
   $Result = $8;
   $9 = ($8|0)!=(0);
   if ($9) {
    $10 = $Result;
    $0 = $10;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $11 = $0;
 STACKTOP = sp;return ($11|0);
}
function __Z8GetCommav() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $Element = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 (__Z10GetElementP12TElementList($Element)|0);
 $1 = HEAP32[$Element>>2]|0;
 $2 = ($1|0)!=(14);
 if ($2) {
  $3 = (__Z5Error10TErrorCode(35)|0);
  $0 = $3;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 } else {
  $0 = 0;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 }
 return (0)|0;
}
function __Z14GetLeftBracketv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $Element = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 (__Z10GetElementP12TElementList($Element)|0);
 $1 = HEAP32[$Element>>2]|0;
 $2 = ($1|0)!=(19);
 if ($2) {
  $3 = (__Z5Error10TErrorCode(21)|0);
  $0 = $3;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 } else {
  $0 = 0;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 }
 return (0)|0;
}
function __Z15GetAddressEnterv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Element = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 (__Z10GetElementP12TElementList($Element)|0);
 $1 = HEAP32[$Element>>2]|0;
 $2 = ($1|0)==(43);
 do {
  if ($2) {
   $3 = (($Element) + 4|0);
   $4 = HEAP16[$3>>1]|0;
   $5 = (__Z12EnterAddresst($4)|0);
   $Result = $5;
   $6 = ($5|0)!=(0);
   if (!($6)) {
    break;
   }
   $7 = $Result;
   $0 = $7;
   $27 = $0;
   STACKTOP = sp;return ($27|0);
  } else {
   $8 = HEAP32[$Element>>2]|0;
   $9 = ($8|0)!=(46);
   if (!($9)) {
    $11 = HEAP16[238720>>1]|0;
    $12 = $11&65535;
    $13 = (($12) - 1)|0;
    $14 = $13&65535;
    $15 = HEAP32[258704>>2]|0;
    $16 = (259056 + ($15<<1)|0);
    HEAP16[$16>>1] = $14;
    $17 = HEAP16[258728>>1]|0;
    $18 = HEAP32[258704>>2]|0;
    $19 = (($18) + 1)|0;
    $20 = (259056 + ($19<<1)|0);
    HEAP16[$20>>1] = $17;
    $21 = HEAP32[258704>>2]|0;
    $22 = (($21) + 2)|0;
    HEAP32[258704>>2] = $22;
    $23 = HEAP16[258728>>1]|0;
    $24 = $23&65535;
    $25 = (($24) + 14)|0;
    $26 = $25&65535;
    HEAP16[258728>>1] = $26;
    break;
   }
   $10 = (__Z5Error10TErrorCode(50)|0);
   $0 = $10;
   $27 = $0;
   STACKTOP = sp;return ($27|0);
  }
 } while(0);
 $0 = 0;
 $27 = $0;
 STACKTOP = sp;return ($27|0);
}
function __Z17GetCommaOrBracketPh($FoundBracket) {
 $FoundBracket = $FoundBracket|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Element = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 $1 = $FoundBracket;
 $2 = $1;
 HEAP8[$2>>0] = 0;
 (__Z10GetElementP12TElementList($Element)|0);
 $3 = HEAP32[$Element>>2]|0;
 $4 = ($3|0)==(14);
 do {
  if ($4) {
   $5 = (__Z11EnterEEPROMht(1,1)|0);
   $Result = $5;
   $6 = ($5|0)!=(0);
   if ($6) {
    $7 = $Result;
    $0 = $7;
    break;
   } else {
    label = 10;
    break;
   }
  } else {
   $8 = HEAP32[$Element>>2]|0;
   $9 = ($8|0)!=(41);
   if ($9) {
    $10 = (__Z5Error10TErrorCode(36)|0);
    $0 = $10;
    break;
   }
   $11 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $11;
   $12 = ($11|0)!=(0);
   if ($12) {
    $13 = $Result;
    $0 = $13;
    break;
   } else {
    $14 = $1;
    HEAP8[$14>>0] = 1;
    label = 10;
    break;
   }
  }
 } while(0);
 if ((label|0) == 10) {
  $0 = 0;
 }
 $15 = $0;
 STACKTOP = sp;return ($15|0);
}
function __Z8GetValuehh($ExpNumber,$PinIsConstant) {
 $ExpNumber = $ExpNumber|0;
 $PinIsConstant = $PinIsConstant|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $ExpNumber;
 $2 = $PinIsConstant;
 $3 = $2;
 $4 = (__Z19GetValueConditionalhhi(0,$3,0)|0);
 $Result = $4;
 $5 = ($4|0)!=(0);
 if ($5) {
  $6 = $Result;
  $0 = $6;
  $8 = $0;
  STACKTOP = sp;return ($8|0);
 } else {
  $7 = $1;
  __Z14CopyExpressionhh(0,$7);
  $0 = 0;
  $8 = $0;
  STACKTOP = sp;return ($8|0);
 }
 return (0)|0;
}
function __Z7GetReadh($ExpNumber) {
 $ExpNumber = $ExpNumber|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $ExpNumber;
 $2 = (__Z12GetReadWriteh(0)|0);
 $Result = $2;
 $3 = ($2|0)!=(0);
 if ($3) {
  $4 = $Result;
  $0 = $4;
 } else {
  $5 = $1;
  __Z14CopyExpressionhh(0,$5);
  $0 = 0;
 }
 $6 = $0;
 STACKTOP = sp;return ($6|0);
}
function __Z8GetWriteh($ExpNumber) {
 $ExpNumber = $ExpNumber|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $ExpNumber;
 $2 = (__Z12GetReadWriteh(1)|0);
 $Result = $2;
 $3 = ($2|0)!=(0);
 if ($3) {
  $4 = $Result;
  $0 = $4;
 } else {
  $5 = $1;
  __Z14CopyExpressionhh(0,$5);
  $0 = 0;
 }
 $6 = $0;
 STACKTOP = sp;return ($6|0);
}
function __Z12NestingErrorv() {
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = HEAP8[238776>>0]|0;
 $2 = $1&255;
 $3 = (($2) - 1)|0;
 $4 = (238784 + (($3*48)|0)|0);
 $5 = HEAP32[$4>>2]|0;
 switch ($5|0) {
 case 8:  {
  $9 = (__Z5Error10TErrorCode(86)|0);
  $0 = $9;
  break;
 }
 case 7:  {
  $8 = (__Z5Error10TErrorCode(81)|0);
  $0 = $8;
  break;
 }
 case 5: case 4: case 2: case 0:  {
  $6 = (__Z5Error10TErrorCode(65)|0);
  $0 = $6;
  break;
 }
 case 6:  {
  $7 = (__Z5Error10TErrorCode(80)|0);
  $0 = $7;
  break;
 }
 default: {
  $0 = 0;
 }
 }
 $10 = $0;
 STACKTOP = sp;return ($10|0);
}
function __Z23GetWriteEnterExpressionv() {
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = (__Z12GetReadWriteh(1)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z15EnterExpressionhh(0,0)|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   $7 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $10 = $0;
 STACKTOP = sp;return ($10|0);
}
function __Z13EnterConstantth($Constant,$Enter1Before) {
 $Constant = $Constant|0;
 $Enter1Before = $Enter1Before|0;
 var $$byval_copy = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Element = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $$byval_copy = sp + 28|0;
 $Element = sp;
 $3 = sp + 16|0;
 $1 = $Constant;
 $2 = $Enter1Before;
 HEAP8[241856>>0] = 0;
 HEAP16[238456>>1] = 0;
 $4 = $1;
 $5 = (($Element) + 4|0);
 HEAP16[$5>>1] = $4;
 ;HEAP32[$3+0>>2]=HEAP32[$Element+0>>2]|0;HEAP32[$3+4>>2]=HEAP32[$Element+4>>2]|0;HEAP32[$3+8>>2]=HEAP32[$Element+8>>2]|0;
 ;HEAP32[$$byval_copy+0>>2]=HEAP32[$3+0>>2]|0;HEAP32[$$byval_copy+4>>2]=HEAP32[$3+4>>2]|0;HEAP32[$$byval_copy+8>>2]=HEAP32[$3+8>>2]|0;
 $6 = (__Z23EnterExpressionConstant12TElementList($$byval_copy)|0);
 $Result = $6;
 $7 = ($6|0)!=(0);
 if ($7) {
  $8 = $Result;
  $0 = $8;
  $13 = $0;
  STACKTOP = sp;return ($13|0);
 }
 $9 = $2;
 $10 = (__Z15EnterExpressionhh(0,$9)|0);
 $Result = $10;
 $11 = ($10|0)!=(0);
 if ($11) {
  $12 = $Result;
  $0 = $12;
  $13 = $0;
  STACKTOP = sp;return ($13|0);
 } else {
  $0 = 0;
  $13 = $0;
  STACKTOP = sp;return ($13|0);
 }
 return (0)|0;
}
function __Z21CompileOutputSequencev() {
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0;
 var $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0;
 var $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $ASCFlag = 0, $Element = 0;
 var $ExpFlag = 0, $Preview = 0, $Result = 0, $State = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 12|0;
 $Preview = sp;
 $State = 0;
 L1: while(1) {
  $1 = $State;
  $2 = ($1|0)!=(8);
  if (!($2)) {
   label = 97;
   break;
  }
  $3 = $State;
  switch ($3|0) {
  case 8:  {
   break;
  }
  case 3:  {
   $20 = (__Z13CheckQuestionv()|0);
   $21 = ($20<<24>>24)!=(0);
   if ($21) {
    $ExpFlag = 1;
    $ASCFlag = 1;
    $22 = $ASCFlag;
    $23 = (__Z9EnterTexth($22)|0);
    $Result = $23;
    $24 = ($23|0)!=(0);
    if ($24) {
     label = 24;
     break L1;
    }
   }
   $26 = (__Z15GetByteVariableP12TElementList($Element)|0);
   $Result = $26;
   $27 = ($26|0)!=(0);
   if ($27) {
    label = 27;
    break L1;
   }
   $29 = (__Z14CheckBackslashv()|0);
   $30 = ($29<<24>>24)!=(0);
   if ($30) {
    $42 = (($Element) + 4|0);
    $43 = HEAP16[$42>>1]|0;
    $44 = (__Z13EnterConstantth($43,0)|0);
    $Result = $44;
    $45 = ($44|0)!=(0);
    if ($45) {
     label = 35;
     break L1;
    }
    HEAP8[241856>>0] = 1;
    $47 = (__Z23GetValueEnterExpressionhh(1,0)|0);
    $Result = $47;
    $48 = ($47|0)!=(0);
    if ($48) {
     label = 37;
     break L1;
    }
   } else {
    $31 = (($Element) + 4|0);
    $32 = HEAP16[$31>>1]|0;
    $33 = $32&65535;
    $34 = $33 | 512;
    $35 = $34&65535;
    $36 = (__Z13EnterConstantth($35,0)|0);
    $Result = $36;
    $37 = ($36|0)!=(0);
    if ($37) {
     label = 30;
     break L1;
    }
    $39 = (__Z13EnterConstantth(32,1)|0);
    $Result = $39;
    $40 = ($39|0)!=(0);
    if ($40) {
     label = 32;
     break L1;
    }
   }
   $50 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $50;
   $51 = ($50|0)!=(0);
   if ($51) {
    label = 40;
    break L1;
   }
   $State = 7;
   break;
  }
  case 1:  {
   $7 = (__Z11GetQuestionv()|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    label = 13;
    break L1;
   }
   $ExpFlag = 1;
   $ASCFlag = 1;
   $10 = $ASCFlag;
   $11 = (__Z9EnterTexth($10)|0);
   $Result = $11;
   $12 = ($11|0)!=(0);
   if ($12) {
    label = 15;
    break L1;
   }
   $State = 2;
   break;
  }
  case 0:  {
   $ASCFlag = 0;
   $ExpFlag = 0;
   (__Z10GetElementP12TElementList($Element)|0);
   $4 = HEAP32[$Element>>2]|0;
   switch ($4|0) {
   case 30:  {
    $State = 1;
    break;
   }
   case 35:  {
    $State = 3;
    break;
   }
   case 15:  {
    $State = 6;
    break;
   }
   case 31:  {
    $State = 5;
    break;
   }
   case 32:  {
    $State = 4;
    break;
   }
   default: {
    $5 = HEAP16[238720>>1]|0;
    $6 = (($5) + -1)<<16>>16;
    HEAP16[238720>>1] = $6;
    $State = 2;
   }
   }
   break;
  }
  case 5:  {
   $68 = (__Z13CheckQuestionv()|0);
   $69 = ($68<<24>>24)!=(0);
   if ($69) {
    $ExpFlag = 1;
    $70 = $ASCFlag;
    $71 = (__Z9EnterTexth($70)|0);
    $Result = $71;
    $72 = ($71|0)!=(0);
    if ($72) {
     label = 55;
     break L1;
    }
   }
   $74 = $ExpFlag;
   $75 = ($74<<24>>24)!=(0);
   if ($75) {
    $76 = (($Element) + 4|0);
    $77 = HEAP16[$76>>1]|0;
    $78 = $77&65535;
    $79 = $78 & 15;
    $80 = ($79|0)!=(6);
    if ($80) {
     $81 = (($Element) + 4|0);
     $82 = HEAP16[$81>>1]|0;
     $83 = $82&65535;
     $84 = $83 | 2048;
     $85 = $84&65535;
     $86 = (($Element) + 4|0);
     HEAP16[$86>>1] = $85;
    }
   }
   $87 = (($Element) + 4|0);
   $88 = HEAP16[$87>>1]|0;
   $89 = (__Z13EnterConstantth($88,0)|0);
   $Result = $89;
   $90 = ($89|0)!=(0);
   if ($90) {
    label = 62;
    break L1;
   }
   HEAP8[241856>>0] = 1;
   $92 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $92;
   $93 = ($92|0)!=(0);
   if ($93) {
    label = 64;
    break L1;
   }
   $95 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $95;
   $96 = ($95|0)!=(0);
   if ($96) {
    label = 66;
    break L1;
   }
   $State = 7;
   break;
  }
  case 7:  {
   $111 = $ASCFlag;
   $112 = ($111<<24>>24)!=(0);
   if ($112) {
    $113 = (__Z13EnterConstantth(34,1)|0);
    $Result = $113;
    $114 = ($113|0)!=(0);
    if ($114) {
     label = 79;
     break L1;
    }
    $116 = (__Z11EnterEEPROMht(1,0)|0);
    $Result = $116;
    $117 = ($116|0)!=(0);
    if ($117) {
     label = 81;
     break L1;
    }
   }
   $119 = $ExpFlag;
   $120 = ($119<<24>>24)!=(0);
   if ($120) {
    $121 = (__Z13EnterConstantth(13,1)|0);
    $Result = $121;
    $122 = ($121|0)!=(0);
    if ($122) {
     label = 85;
     break L1;
    }
    $124 = (__Z11EnterEEPROMht(1,0)|0);
    $Result = $124;
    $125 = ($124|0)!=(0);
    if ($125) {
     label = 87;
     break L1;
    }
   }
   (__Z14PreviewElementP12TElementList($Preview)|0);
   $127 = HEAP32[$Preview>>2]|0;
   $128 = ($127|0)==(14);
   if ($128) {
    $129 = HEAP16[238720>>1]|0;
    $130 = (($129) + 1)<<16>>16;
    HEAP16[238720>>1] = $130;
    $131 = (__Z11EnterEEPROMht(1,1)|0);
    $Result = $131;
    $132 = ($131|0)!=(0);
    if ($132) {
     label = 91;
     break L1;
    }
    $State = 0;
   } else {
    $State = 8;
   }
   break;
  }
  case 2:  {
   HEAP8[241856>>0] = 1;
   $14 = (__Z23GetValueEnterExpressionhh(0,0)|0);
   $Result = $14;
   $15 = ($14|0)!=(0);
   if ($15) {
    label = 18;
    break L1;
   }
   $17 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $17;
   $18 = ($17|0)!=(0);
   if ($18) {
    label = 20;
    break L1;
   }
   $State = 7;
   break;
  }
  case 4:  {
   HEAP8[241856>>0] = 0;
   $53 = (__Z23GetValueEnterExpressionhh(0,0)|0);
   $Result = $53;
   $54 = ($53|0)!=(0);
   if ($54) {
    label = 43;
    break L1;
   }
   $56 = (__Z13EnterConstantth(1024,1)|0);
   $Result = $56;
   $57 = ($56|0)!=(0);
   if ($57) {
    label = 45;
    break L1;
   }
   $59 = (__Z12GetBackslashv()|0);
   $Result = $59;
   $60 = ($59|0)!=(0);
   if ($60) {
    label = 47;
    break L1;
   }
   HEAP8[241856>>0] = 2;
   $62 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $62;
   $63 = ($62|0)!=(0);
   if ($63) {
    label = 49;
    break L1;
   }
   $65 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $65;
   $66 = ($65|0)!=(0);
   if ($66) {
    label = 51;
    break L1;
   }
   $State = 7;
   break;
  }
  case 6:  {
   $ExpFlag = 1;
   $98 = $ASCFlag;
   $99 = (__Z9EnterTexth($98)|0);
   $Result = $99;
   $100 = ($99|0)!=(0);
   if ($100) {
    label = 69;
    break L1;
   }
   $102 = (__Z13EnterConstantth(438,0)|0);
   $Result = $102;
   $103 = ($102|0)!=(0);
   if ($103) {
    label = 71;
    break L1;
   }
   HEAP8[241856>>0] = 1;
   $105 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $105;
   $106 = ($105|0)!=(0);
   if ($106) {
    label = 73;
    break L1;
   }
   $108 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $108;
   $109 = ($108|0)!=(0);
   if ($109) {
    label = 75;
    break L1;
   }
   $State = 7;
   break;
  }
  default: {
  }
  }
 }
 switch (label|0) {
  case 13: {
   $9 = $Result;
   $0 = $9;
   break;
  }
  case 15: {
   $13 = $Result;
   $0 = $13;
   break;
  }
  case 18: {
   $16 = $Result;
   $0 = $16;
   break;
  }
  case 20: {
   $19 = $Result;
   $0 = $19;
   break;
  }
  case 24: {
   $25 = $Result;
   $0 = $25;
   break;
  }
  case 27: {
   $28 = $Result;
   $0 = $28;
   break;
  }
  case 30: {
   $38 = $Result;
   $0 = $38;
   break;
  }
  case 32: {
   $41 = $Result;
   $0 = $41;
   break;
  }
  case 35: {
   $46 = $Result;
   $0 = $46;
   break;
  }
  case 37: {
   $49 = $Result;
   $0 = $49;
   break;
  }
  case 40: {
   $52 = $Result;
   $0 = $52;
   break;
  }
  case 43: {
   $55 = $Result;
   $0 = $55;
   break;
  }
  case 45: {
   $58 = $Result;
   $0 = $58;
   break;
  }
  case 47: {
   $61 = $Result;
   $0 = $61;
   break;
  }
  case 49: {
   $64 = $Result;
   $0 = $64;
   break;
  }
  case 51: {
   $67 = $Result;
   $0 = $67;
   break;
  }
  case 55: {
   $73 = $Result;
   $0 = $73;
   break;
  }
  case 62: {
   $91 = $Result;
   $0 = $91;
   break;
  }
  case 64: {
   $94 = $Result;
   $0 = $94;
   break;
  }
  case 66: {
   $97 = $Result;
   $0 = $97;
   break;
  }
  case 69: {
   $101 = $Result;
   $0 = $101;
   break;
  }
  case 71: {
   $104 = $Result;
   $0 = $104;
   break;
  }
  case 73: {
   $107 = $Result;
   $0 = $107;
   break;
  }
  case 75: {
   $110 = $Result;
   $0 = $110;
   break;
  }
  case 79: {
   $115 = $Result;
   $0 = $115;
   break;
  }
  case 81: {
   $118 = $Result;
   $0 = $118;
   break;
  }
  case 85: {
   $123 = $Result;
   $0 = $123;
   break;
  }
  case 87: {
   $126 = $Result;
   $0 = $126;
   break;
  }
  case 91: {
   $133 = $Result;
   $0 = $133;
   break;
  }
  case 97: {
   $134 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $134;
   $135 = ($134|0)!=(0);
   if ($135) {
    $136 = $Result;
    $0 = $136;
    break;
   } else {
    $0 = 0;
    break;
   }
   break;
  }
 }
 $137 = $0;
 STACKTOP = sp;return ($137|0);
}
function __Z20CompileInputSequencev() {
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0;
 var $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0;
 var $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0;
 var $99 = 0, $Count = 0, $Element = 0, $OldElementListIdx = 0, $Preview = 0, $Result = 0, $State = 0, $TotalCount = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 48|0;
 $Preview = sp + 32|0;
 $OldElementListIdx = sp + 4|0;
 $State = 0;
 L1: while(1) {
  $1 = $State;
  $2 = ($1|0)!=(8);
  if (!($2)) {
   label = 114;
   break;
  }
  $3 = $State;
  switch ($3|0) {
  case 2:  {
   $13 = (__Z11EnterEEPROMht(1,1)|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    label = 18;
    break L1;
   }
   $16 = (__Z15GetByteVariableP12TElementList($Element)|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    label = 20;
    break L1;
   }
   $19 = (__Z12GetBackslashv()|0);
   $Result = $19;
   $20 = ($19|0)!=(0);
   if ($20) {
    label = 22;
    break L1;
   }
   HEAP8[241856>>0] = 2;
   $22 = (__Z8GetValuehh(1,0)|0);
   $Result = $22;
   $23 = ($22|0)!=(0);
   if ($23) {
    label = 24;
    break L1;
   }
   $25 = (__Z14CheckBackslashv()|0);
   $26 = ($25<<24>>24)!=(0);
   if ($26) {
    HEAP8[241856>>0] = 0;
    $27 = (__Z23GetValueEnterExpressionhh(0,0)|0);
    $Result = $27;
    $28 = ($27|0)!=(0);
    if ($28) {
     label = 27;
     break L1;
    }
    $30 = (__Z11EnterEEPROMht(1,1)|0);
    $Result = $30;
    $31 = ($30|0)!=(0);
    if ($31) {
     label = 29;
     break L1;
    }
    $33 = (($Element) + 4|0);
    $34 = HEAP16[$33>>1]|0;
    $35 = $34&65535;
    $36 = $35 | 512;
    $37 = $36&65535;
    $38 = (($Element) + 4|0);
    HEAP16[$38>>1] = $37;
   }
   $39 = (($Element) + 4|0);
   $40 = HEAP16[$39>>1]|0;
   $41 = (__Z13EnterConstantth($40,0)|0);
   $Result = $41;
   $42 = ($41|0)!=(0);
   if ($42) {
    label = 32;
    break L1;
   }
   $44 = (__Z15EnterExpressionhh(1,1)|0);
   $Result = $44;
   $45 = ($44|0)!=(0);
   if ($45) {
    label = 34;
    break L1;
   }
   $47 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $47;
   $48 = ($47|0)!=(0);
   if ($48) {
    label = 36;
    break L1;
   }
   $State = 7;
   break;
  }
  case 6:  {
   $175 = (($Element) + 4|0);
   $176 = HEAP16[$175>>1]|0;
   $177 = (__Z13EnterConstantth($176,1)|0);
   $Result = $177;
   $178 = ($177|0)!=(0);
   if ($178) {
    label = 98;
    break L1;
   }
   $180 = (__Z13EnterConstantth(0,1)|0);
   $Result = $180;
   $181 = ($180|0)!=(0);
   if ($181) {
    label = 100;
    break L1;
   }
   $183 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $183;
   $184 = ($183|0)!=(0);
   if ($184) {
    label = 102;
    break L1;
   }
   HEAP8[241856>>0] = 1;
   $186 = (__Z23GetWriteEnterExpressionv()|0);
   $Result = $186;
   $187 = ($186|0)!=(0);
   if ($187) {
    label = 104;
    break L1;
   }
   $State = 7;
   break;
  }
  case 3:  {
   $59 = (__Z13EnterConstantth(1024,1)|0);
   $Result = $59;
   $60 = ($59|0)!=(0);
   if ($60) {
    label = 46;
    break L1;
   }
   HEAP8[241856>>0] = 1;
   $62 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $62;
   $63 = ($62|0)!=(0);
   if ($63) {
    label = 48;
    break L1;
   }
   $65 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $65;
   $66 = ($65|0)!=(0);
   if ($66) {
    label = 50;
    break L1;
   }
   $State = 7;
   break;
  }
  case 5:  {
   $100 = (__Z11EnterEEPROMht(1,1)|0);
   $Result = $100;
   $101 = ($100|0)!=(0);
   if ($101) {
    label = 69;
    break L1;
   }
   $103 = (__Z7GetLeftv()|0);
   $Result = $103;
   $104 = ($103|0)!=(0);
   if ($104) {
    label = 71;
    break L1;
   }
   $Count = 0;
   while(1) {
    $106 = HEAP16[238720>>1]|0;
    $107 = $106&65535;
    $108 = $Count;
    $109 = $108&255;
    $110 = (($OldElementListIdx) + ($109<<2)|0);
    HEAP32[$110>>2] = $107;
    $111 = $Count;
    $112 = $111&255;
    $113 = (5 - ($112))|0;
    $114 = $113&255;
    HEAP8[241856>>0] = $114;
    $115 = (__Z19GetValueConditionalhhi(0,0,0)|0);
    $Result = $115;
    $116 = ($115|0)!=(0);
    if ($116) {
     label = 74;
     break L1;
    }
    $118 = $Count;
    $119 = (($118) + 1)<<24>>24;
    $Count = $119;
    (__Z10GetElementP12TElementList($Element)|0);
    $120 = HEAP32[$Element>>2]|0;
    $121 = ($120|0)==(14);
    if ($121) {
     $122 = $Count;
     $123 = $122&255;
     $124 = ($123|0)!=(6);
     $200 = $124;
    } else {
     $200 = 0;
    }
    if (!($200)) {
     break;
    }
   }
   $125 = $Count;
   $126 = $125&255;
   $127 = ($126|0)==(6);
   $128 = $127&1;
   $129 = HEAP32[$Element>>2]|0;
   $130 = ($129|0)==(14);
   $131 = $130&1;
   $132 = $128 & $131;
   $133 = ($132|0)!=(0);
   if ($133) {
    label = 80;
    break L1;
   }
   $135 = HEAP16[238720>>1]|0;
   $136 = (($135) + -1)<<16>>16;
   HEAP16[238720>>1] = $136;
   $137 = (__Z8GetRightv()|0);
   $Result = $137;
   $138 = ($137|0)!=(0);
   if ($138) {
    label = 82;
    break L1;
   }
   $140 = $Count;
   $TotalCount = $140;
   $141 = HEAP16[238720>>1]|0;
   $142 = $141&65535;
   $143 = (($OldElementListIdx) + 24|0);
   HEAP32[$143>>2] = $142;
   while(1) {
    $144 = $Count;
    $145 = $144&255;
    $146 = (($145) - 1)|0;
    $147 = (($OldElementListIdx) + ($146<<2)|0);
    $148 = HEAP32[$147>>2]|0;
    $149 = $148&65535;
    HEAP16[238720>>1] = $149;
    HEAP8[241856>>0] = 0;
    $150 = (__Z23GetValueEnterExpressionhh(0,0)|0);
    $Result = $150;
    $151 = ($150|0)!=(0);
    if ($151) {
     label = 85;
     break L1;
    }
    $153 = (__Z11EnterEEPROMht(1,1)|0);
    $Result = $153;
    $154 = ($153|0)!=(0);
    if ($154) {
     label = 87;
     break L1;
    }
    $156 = $Count;
    $157 = (($156) + -1)<<24>>24;
    $Count = $157;
    $158 = $Count;
    $159 = $158&255;
    $160 = ($159|0)!=(0);
    if (!($160)) {
     break;
    }
   }
   $161 = (($OldElementListIdx) + 24|0);
   $162 = HEAP32[$161>>2]|0;
   $163 = $162&65535;
   HEAP16[238720>>1] = $163;
   $164 = (__Z13EnterConstantth(3140,0)|0);
   $Result = $164;
   $165 = ($164|0)!=(0);
   if ($165) {
    label = 91;
    break L1;
   }
   $167 = $TotalCount;
   $168 = $167&255;
   $169 = (__Z13EnterConstantth($168,1)|0);
   $Result = $169;
   $170 = ($169|0)!=(0);
   if ($170) {
    label = 93;
    break L1;
   }
   $172 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $172;
   $173 = ($172|0)!=(0);
   if ($173) {
    label = 95;
    break L1;
   }
   $State = 7;
   break;
  }
  case 7:  {
   (__Z14PreviewElementP12TElementList($Preview)|0);
   $189 = HEAP32[$Preview>>2]|0;
   $190 = ($189|0)==(14);
   if ($190) {
    $191 = HEAP16[238720>>1]|0;
    $192 = (($191) + 1)<<16>>16;
    HEAP16[238720>>1] = $192;
    $193 = (__Z11EnterEEPROMht(1,1)|0);
    $Result = $193;
    $194 = ($193|0)!=(0);
    if ($194) {
     label = 108;
     break L1;
    }
    $State = 0;
   } else {
    $State = 8;
   }
   break;
  }
  case 8:  {
   break;
  }
  case 4:  {
   $68 = (__Z15GetByteVariableP12TElementList($Element)|0);
   $Result = $68;
   $69 = ($68|0)!=(0);
   if ($69) {
    label = 53;
    break L1;
   }
   $71 = (__Z14CheckBackslashv()|0);
   $72 = ($71<<24>>24)!=(0);
   if ($72) {
    $85 = (($Element) + 4|0);
    $86 = HEAP16[$85>>1]|0;
    $87 = $86&65535;
    $88 = $87 & 255;
    $89 = $88 | 2560;
    $90 = $89&65535;
    $91 = (__Z13EnterConstantth($90,1)|0);
    $Result = $91;
    $92 = ($91|0)!=(0);
    if ($92) {
     label = 61;
     break L1;
    }
    HEAP8[241856>>0] = 1;
    $94 = (__Z23GetValueEnterExpressionhh(1,0)|0);
    $Result = $94;
    $95 = ($94|0)!=(0);
    if ($95) {
     label = 63;
     break L1;
    }
   } else {
    $73 = (($Element) + 4|0);
    $74 = HEAP16[$73>>1]|0;
    $75 = $74&65535;
    $76 = $75 & 255;
    $77 = $76 | 2048;
    $78 = $77&65535;
    $79 = (__Z13EnterConstantth($78,1)|0);
    $Result = $79;
    $80 = ($79|0)!=(0);
    if ($80) {
     label = 56;
     break L1;
    }
    $82 = (__Z13EnterConstantth(32,1)|0);
    $Result = $82;
    $83 = ($82|0)!=(0);
    if ($83) {
     label = 58;
     break L1;
    }
   }
   $97 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $97;
   $98 = ($97|0)!=(0);
   if ($98) {
    label = 66;
    break L1;
   }
   $State = 7;
   break;
  }
  case 0:  {
   (__Z10GetElementP12TElementList($Element)|0);
   $4 = HEAP32[$Element>>2]|0;
   switch ($4|0) {
   case 34:  {
    $State = 1;
    break;
   }
   case 36:  {
    $State = 5;
    break;
   }
   case 33:  {
    $State = 3;
    break;
   }
   case 37:  {
    $State = 4;
    break;
   }
   case 35:  {
    $State = 2;
    break;
   }
   case 31: case 8:  {
    $State = 6;
    break;
   }
   default: {
    $5 = HEAP16[238720>>1]|0;
    $6 = (($5) + -1)<<16>>16;
    HEAP16[238720>>1] = $6;
    $7 = (__Z11EnterEEPROMht(1,0)|0);
    $Result = $7;
    $8 = ($7|0)!=(0);
    if ($8) {
     label = 12;
     break L1;
    }
    HEAP8[241856>>0] = 1;
    $10 = (__Z23GetWriteEnterExpressionv()|0);
    $Result = $10;
    $11 = ($10|0)!=(0);
    if ($11) {
     label = 14;
     break L1;
    }
    $State = 7;
   }
   }
   break;
  }
  case 1:  {
   $50 = (__Z13EnterConstantth(4096,1)|0);
   $Result = $50;
   $51 = ($50|0)!=(0);
   if ($51) {
    label = 39;
    break L1;
   }
   HEAP8[241856>>0] = 1;
   $53 = (__Z23GetValueEnterExpressionhh(1,0)|0);
   $Result = $53;
   $54 = ($53|0)!=(0);
   if ($54) {
    label = 41;
    break L1;
   }
   $56 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $56;
   $57 = ($56|0)!=(0);
   if ($57) {
    label = 43;
    break L1;
   }
   $State = 7;
   break;
  }
  default: {
  }
  }
 }
 switch (label|0) {
  case 12: {
   $9 = $Result;
   $0 = $9;
   break;
  }
  case 14: {
   $12 = $Result;
   $0 = $12;
   break;
  }
  case 18: {
   $15 = $Result;
   $0 = $15;
   break;
  }
  case 20: {
   $18 = $Result;
   $0 = $18;
   break;
  }
  case 22: {
   $21 = $Result;
   $0 = $21;
   break;
  }
  case 24: {
   $24 = $Result;
   $0 = $24;
   break;
  }
  case 27: {
   $29 = $Result;
   $0 = $29;
   break;
  }
  case 29: {
   $32 = $Result;
   $0 = $32;
   break;
  }
  case 32: {
   $43 = $Result;
   $0 = $43;
   break;
  }
  case 34: {
   $46 = $Result;
   $0 = $46;
   break;
  }
  case 36: {
   $49 = $Result;
   $0 = $49;
   break;
  }
  case 39: {
   $52 = $Result;
   $0 = $52;
   break;
  }
  case 41: {
   $55 = $Result;
   $0 = $55;
   break;
  }
  case 43: {
   $58 = $Result;
   $0 = $58;
   break;
  }
  case 46: {
   $61 = $Result;
   $0 = $61;
   break;
  }
  case 48: {
   $64 = $Result;
   $0 = $64;
   break;
  }
  case 50: {
   $67 = $Result;
   $0 = $67;
   break;
  }
  case 53: {
   $70 = $Result;
   $0 = $70;
   break;
  }
  case 56: {
   $81 = $Result;
   $0 = $81;
   break;
  }
  case 58: {
   $84 = $Result;
   $0 = $84;
   break;
  }
  case 61: {
   $93 = $Result;
   $0 = $93;
   break;
  }
  case 63: {
   $96 = $Result;
   $0 = $96;
   break;
  }
  case 66: {
   $99 = $Result;
   $0 = $99;
   break;
  }
  case 69: {
   $102 = $Result;
   $0 = $102;
   break;
  }
  case 71: {
   $105 = $Result;
   $0 = $105;
   break;
  }
  case 74: {
   $117 = $Result;
   $0 = $117;
   break;
  }
  case 80: {
   $134 = (__Z5Error10TErrorCode(49)|0);
   $0 = $134;
   break;
  }
  case 82: {
   $139 = $Result;
   $0 = $139;
   break;
  }
  case 85: {
   $152 = $Result;
   $0 = $152;
   break;
  }
  case 87: {
   $155 = $Result;
   $0 = $155;
   break;
  }
  case 91: {
   $166 = $Result;
   $0 = $166;
   break;
  }
  case 93: {
   $171 = $Result;
   $0 = $171;
   break;
  }
  case 95: {
   $174 = $Result;
   $0 = $174;
   break;
  }
  case 98: {
   $179 = $Result;
   $0 = $179;
   break;
  }
  case 100: {
   $182 = $Result;
   $0 = $182;
   break;
  }
  case 102: {
   $185 = $Result;
   $0 = $185;
   break;
  }
  case 104: {
   $188 = $Result;
   $0 = $188;
   break;
  }
  case 108: {
   $195 = $Result;
   $0 = $195;
   break;
  }
  case 114: {
   $196 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $196;
   $197 = ($196|0)!=(0);
   if ($197) {
    $198 = $Result;
    $0 = $198;
    break;
   } else {
    $0 = 0;
    break;
   }
   break;
  }
 }
 $199 = $0;
 STACKTOP = sp;return ($199|0);
}
function __Z14CheckBackslashv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Preview = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Preview = sp;
 (__Z14PreviewElementP12TElementList($Preview)|0);
 $0 = HEAP32[$Preview>>2]|0;
 $1 = ($0|0)==(16);
 $2 = $1 ? 1 : 0;
 $3 = HEAP16[238720>>1]|0;
 $4 = $3&65535;
 $5 = (($4) + ($2))|0;
 $6 = $5&65535;
 HEAP16[238720>>1] = $6;
 $7 = HEAP32[$Preview>>2]|0;
 $8 = ($7|0)==(16);
 $9 = $8&1;
 STACKTOP = sp;return ($9|0);
}
function __Z15GetRightBracketv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $Element = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 (__Z10GetElementP12TElementList($Element)|0);
 $1 = HEAP32[$Element>>2]|0;
 $2 = ($1|0)!=(41);
 if ($2) {
  $3 = (__Z5Error10TErrorCode(22)|0);
  $0 = $3;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 } else {
  $0 = 0;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 }
 return (0)|0;
}
function __Z12EnterAddresst($Address) {
 $Address = $Address|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Address;
 $2 = $1;
 $3 = (__Z11EnterEEPROMht(3,$2)|0);
 $Result = $3;
 $4 = ($3|0)!=(0);
 do {
  if ($4) {
   $5 = $Result;
   $0 = $5;
  } else {
   $6 = $1;
   $7 = $6&65535;
   $8 = (($7|0) / 8)&-1;
   $9 = $8&65535;
   $10 = (__Z11EnterEEPROMht(11,$9)|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $13 = $0;
 STACKTOP = sp;return ($13|0);
}
function __Z13GetCommaOrEndPh($EndFound) {
 $EndFound = $EndFound|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Element = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp + 4|0;
 $1 = $EndFound;
 $2 = $1;
 HEAP8[$2>>0] = 0;
 (__Z10GetElementP12TElementList($Element)|0);
 $3 = HEAP32[$Element>>2]|0;
 $4 = ($3|0)==(14);
 do {
  if ($4) {
   $5 = (__Z11EnterEEPROMht(1,1)|0);
   $Result = $5;
   $6 = ($5|0)!=(0);
   if ($6) {
    $7 = $Result;
    $0 = $7;
    break;
   } else {
    label = 10;
    break;
   }
  } else {
   $8 = HEAP32[$Element>>2]|0;
   $9 = ($8|0)==(47);
   if (!($9)) {
    $10 = (__Z5Error10TErrorCode(32)|0);
    $0 = $10;
    break;
   }
   $11 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $11;
   $12 = ($11|0)!=(0);
   if ($12) {
    $13 = $Result;
    $0 = $13;
    break;
   } else {
    $14 = $1;
    HEAP8[$14>>0] = 1;
    label = 10;
    break;
   }
  }
 } while(0);
 if ((label|0) == 10) {
  $0 = 0;
 }
 $15 = $0;
 STACKTOP = sp;return ($15|0);
}
function __Z10GetTimeoutv() {
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 HEAP8[241856>>0] = 2;
 $1 = (__Z19GetValueConditionalhhi(0,0,0)|0);
 $Result = $1;
 $2 = ($1|0)!=(0);
 do {
  if ($2) {
   $3 = $Result;
   $0 = $3;
  } else {
   $4 = (__Z8GetCommav()|0);
   $Result = $4;
   $5 = ($4|0)!=(0);
   if ($5) {
    $6 = $Result;
    $0 = $6;
    break;
   }
   $7 = (__Z11EnterEEPROMht(8,221)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z15GetAddressEnterv()|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   }
   $13 = (__Z8GetCommav()|0);
   $Result = $13;
   $14 = ($13|0)!=(0);
   if ($14) {
    $15 = $Result;
    $0 = $15;
    break;
   }
   $16 = (__Z15EnterExpressionhh(0,1)|0);
   $Result = $16;
   $17 = ($16|0)!=(0);
   if ($17) {
    $18 = $Result;
    $0 = $18;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $19 = $0;
 STACKTOP = sp;return ($19|0);
}
function __Z12GetBackslashv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $Element = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 (__Z10GetElementP12TElementList($Element)|0);
 $1 = HEAP32[$Element>>2]|0;
 $2 = ($1|0)!=(16);
 if ($2) {
  $3 = (__Z5Error10TErrorCode(18)|0);
  $0 = $3;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 } else {
  $0 = 0;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 }
 return (0)|0;
}
function __Z13EnterOperator13TOperatorCode($Operator) {
 $Operator = $Operator|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Operator;
 $2 = (__Z11EnterEEPROMht(1,1)|0);
 $Result = $2;
 $3 = ($2|0)!=(0);
 do {
  if ($3) {
   $4 = $Result;
   $0 = $4;
  } else {
   $5 = $1;
   $6 = $5&255;
   $7 = $6&255;
   $8 = (__Z11EnterEEPROMht(6,$7)|0);
   $Result = $8;
   $9 = ($8|0)!=(0);
   if ($9) {
    $10 = $Result;
    $0 = $10;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $11 = $0;
 STACKTOP = sp;return ($11|0);
}
function __Z7GetLeftv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $Element = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 (__Z10GetElementP12TElementList($Element)|0);
 $1 = HEAP32[$Element>>2]|0;
 $2 = ($1|0)!=(18);
 if ($2) {
  $3 = (__Z5Error10TErrorCode(19)|0);
  $0 = $3;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 } else {
  $0 = 0;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 }
 return (0)|0;
}
function __Z11GetQuestionv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $Element = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Element = sp;
 (__Z10GetElementP12TElementList($Element)|0);
 $1 = HEAP32[$Element>>2]|0;
 $2 = ($1|0)!=(15);
 if ($2) {
  $3 = (__Z5Error10TErrorCode(16)|0);
  $0 = $3;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 } else {
  $0 = 0;
  $4 = $0;
  STACKTOP = sp;return ($4|0);
 }
 return (0)|0;
}
function __Z13CheckQuestionv() {
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Preview = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $Preview = sp;
 (__Z14PreviewElementP12TElementList($Preview)|0);
 $0 = HEAP32[$Preview>>2]|0;
 $1 = ($0|0)==(15);
 $2 = $1 ? 1 : 0;
 $3 = HEAP16[238720>>1]|0;
 $4 = $3&65535;
 $5 = (($4) + ($2))|0;
 $6 = $5&65535;
 HEAP16[238720>>1] = $6;
 $7 = HEAP32[$Preview>>2]|0;
 $8 = ($7|0)==(15);
 $9 = $8&1;
 STACKTOP = sp;return ($9|0);
}
function __Z15GetByteVariableP12TElementList($Element) {
 $Element = $Element|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $3 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Element;
 $2 = $1;
 (__Z10GetElementP12TElementList($2)|0);
 $3 = $1;
 $4 = HEAP32[$3>>2]|0;
 $5 = ($4|0)!=(5);
 $6 = $5&1;
 $7 = $1;
 $8 = (($7) + 4|0);
 $9 = HEAP16[$8>>1]|0;
 $10 = $9&65535;
 $11 = $10 & 512;
 $12 = ($11|0)!=(512);
 $13 = $12&1;
 $14 = $6 | $13;
 $15 = ($14|0)!=(0);
 if ($15) {
  $16 = (__Z5Error10TErrorCode(38)|0);
  $0 = $16;
  $25 = $0;
  STACKTOP = sp;return ($25|0);
 } else {
  $17 = $1;
  $18 = (($17) + 4|0);
  $19 = HEAP16[$18>>1]|0;
  $20 = $19&65535;
  $21 = $20 & 255;
  $22 = $21&65535;
  $23 = $1;
  $24 = (($23) + 4|0);
  HEAP16[$24>>1] = $22;
  $0 = 0;
  $25 = $0;
  STACKTOP = sp;return ($25|0);
 }
 return (0)|0;
}
function __Z8EnterChrc($Character) {
 $Character = $Character|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Result = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $1 = $Character;
 $2 = $1;
 $3 = $2 << 24 >> 24;
 $4 = (__Z13EnterConstantth($3,0)|0);
 $Result = $4;
 $5 = ($4|0)!=(0);
 do {
  if ($5) {
   $6 = $Result;
   $0 = $6;
  } else {
   $7 = (__Z11EnterEEPROMht(1,0)|0);
   $Result = $7;
   $8 = ($7|0)!=(0);
   if ($8) {
    $9 = $Result;
    $0 = $9;
    break;
   }
   $10 = (__Z11EnterEEPROMht(1,1)|0);
   $Result = $10;
   $11 = ($10|0)!=(0);
   if ($11) {
    $12 = $Result;
    $0 = $12;
    break;
   } else {
    $0 = 0;
    break;
   }
  }
 } while(0);
 $13 = $0;
 STACKTOP = sp;return ($13|0);
}
function __Z9EnterTexth($ASCFlag) {
 $ASCFlag = $ASCFlag|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $Idx = 0, $OldElementListIdx = 0, $OldErrorStart = 0, $Result = 0, $TextElement = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0; if ((STACKTOP|0) >= (STACK_MAX|0)) abort();
 $TextElement = sp + 20|0;
 $1 = $ASCFlag;
 (__Z10GetElementP12TElementList($TextElement)|0);
 $2 = HEAP32[8>>2]|0;
 $3 = (($2) + 92|0);
 $4 = HEAP32[$3>>2]|0;
 $OldErrorStart = $4;
 $5 = HEAP16[238720>>1]|0;
 $6 = (($5) + -1)<<16>>16;
 HEAP16[238720>>1] = $6;
 $7 = HEAP16[238720>>1]|0;
 $8 = $7&65535;
 $OldElementListIdx = $8;
 HEAP8[241856>>0] = 0;
 $9 = (__Z19GetValueConditionalhhi(0,0,0)|0);
 $Result = $9;
 $10 = ($9|0)!=(0);
 if ($10) {
  $11 = $Result;
  $0 = $11;
  $49 = $0;
  STACKTOP = sp;return ($49|0);
 }
 $12 = HEAP16[238720>>1]|0;
 $13 = (($12) + -1)<<16>>16;
 HEAP16[238720>>1] = $13;
 (__Z10GetElementP12TElementList($TextElement)|0);
 $14 = $OldElementListIdx;
 $15 = $14&65535;
 HEAP16[238720>>1] = $15;
 $16 = $OldErrorStart;
 $Idx = $16;
 while(1) {
  $17 = $Idx;
  $18 = HEAP32[8>>2]|0;
  $19 = (($18) + 92|0);
  $20 = HEAP32[$19>>2]|0;
  $21 = HEAP32[8>>2]|0;
  $22 = (($21) + 96|0);
  $23 = HEAP32[$22>>2]|0;
  $24 = (($20) + ($23))|0;
  $25 = ($17|0)<($24|0);
  if (!($25)) {
   break;
  }
  $26 = $Idx;
  $27 = HEAP32[16>>2]|0;
  $28 = (($27) + ($26)|0);
  $29 = HEAP8[$28>>0]|0;
  $30 = (__Z8EnterChrc($29)|0);
  $Result = $30;
  $31 = ($30|0)!=(0);
  if ($31) {
   label = 6;
   break;
  }
  $33 = $Idx;
  $34 = (($33) + 1)|0;
  $Idx = $34;
 }
 if ((label|0) == 6) {
  $32 = $Result;
  $0 = $32;
  $49 = $0;
  STACKTOP = sp;return ($49|0);
 }
 $35 = (__Z8EnterChrc(32)|0);
 $Result = $35;
 $36 = ($35|0)!=(0);
 if ($36) {
  $37 = $Result;
  $0 = $37;
  $49 = $0;
  STACKTOP = sp;return ($49|0);
 }
 $38 = (__Z8EnterChrc(61)|0);
 $Result = $38;
 $39 = ($38|0)!=(0);
 if ($39) {
  $40 = $Result;
  $0 = $40;
  $49 = $0;
  STACKTOP = sp;return ($49|0);
 }
 $41 = (__Z8EnterChrc(32)|0);
 $Result = $41;
 $42 = ($41|0)!=(0);
 if ($42) {
  $43 = $Result;
  $0 = $43;
  $49 = $0;
  STACKTOP = sp;return ($49|0);
 }
 $44 = $1;
 $45 = ($44<<24>>24)!=(0);
 do {
  if ($45) {
   $46 = (__Z8EnterChrc(34)|0);
   $Result = $46;
   $47 = ($46|0)!=(0);
   if (!($47)) {
    break;
   }
   $48 = $Result;
   $0 = $48;
   $49 = $0;
   STACKTOP = sp;return ($49|0);
  }
 } while(0);
 $0 = 0;
 $49 = $0;
 STACKTOP = sp;return ($49|0);
}
function _islower($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($c) + -97)|0;
 $1 = ($0>>>0)<(26);
 $2 = $1&1;
 STACKTOP = sp;return ($2|0);
}
function _toupper($c) {
 $c = $c|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_islower($c)|0);
 $1 = ($0|0)==(0);
 $2 = $c & 95;
 $$0 = $1 ? $c : $2;
 STACKTOP = sp;return ($$0|0);
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i23$i = 0, $$pre$i25 = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i24$iZ2D = 0, $$pre$phi$i26Z2D = 0, $$pre$phi$iZ2D = 0, $$pre$phi59$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre105 = 0, $$pre58$i$i = 0, $$rsize$0$i = 0, $$rsize$3$i = 0, $$sum = 0, $$sum$i$i = 0, $$sum$i$i$i = 0, $$sum$i12$i = 0, $$sum$i13$i = 0;
 var $$sum$i16$i = 0, $$sum$i19$i = 0, $$sum$i2338 = 0, $$sum$i32 = 0, $$sum$i39 = 0, $$sum1 = 0, $$sum1$i = 0, $$sum1$i$i = 0, $$sum1$i14$i = 0, $$sum1$i20$i = 0, $$sum1$i24 = 0, $$sum10 = 0, $$sum10$i = 0, $$sum10$i$i = 0, $$sum10$pre$i$i = 0, $$sum102$i = 0, $$sum103$i = 0, $$sum104$i = 0, $$sum105$i = 0, $$sum106$i = 0;
 var $$sum107$i = 0, $$sum108$i = 0, $$sum109$i = 0, $$sum11$i = 0, $$sum11$i$i = 0, $$sum11$i22$i = 0, $$sum110$i = 0, $$sum111$i = 0, $$sum1112 = 0, $$sum112$i = 0, $$sum113$i = 0, $$sum114$i = 0, $$sum115$i = 0, $$sum12$i = 0, $$sum12$i$i = 0, $$sum13$i = 0, $$sum13$i$i = 0, $$sum14$i$i = 0, $$sum14$pre$i = 0, $$sum15$i = 0;
 var $$sum15$i$i = 0, $$sum16$i = 0, $$sum16$i$i = 0, $$sum17$i = 0, $$sum17$i$i = 0, $$sum18$i = 0, $$sum1819$i$i = 0, $$sum2 = 0, $$sum2$i = 0, $$sum2$i$i = 0, $$sum2$i$i$i = 0, $$sum2$i15$i = 0, $$sum2$i17$i = 0, $$sum2$i21$i = 0, $$sum2$pre$i = 0, $$sum20$i$i = 0, $$sum21$i$i = 0, $$sum22$i$i = 0, $$sum23$i$i = 0, $$sum24$i$i = 0;
 var $$sum25$i$i = 0, $$sum26$pre$i$i = 0, $$sum27$i$i = 0, $$sum28$i$i = 0, $$sum29$i$i = 0, $$sum3$i = 0, $$sum3$i$i = 0, $$sum3$i27 = 0, $$sum30$i$i = 0, $$sum3132$i$i = 0, $$sum34$i$i = 0, $$sum3536$i$i = 0, $$sum3738$i$i = 0, $$sum39$i$i = 0, $$sum4 = 0, $$sum4$i = 0, $$sum4$i28 = 0, $$sum40$i$i = 0, $$sum41$i$i = 0, $$sum42$i$i = 0;
 var $$sum5$i = 0, $$sum5$i$i = 0, $$sum56 = 0, $$sum6$i = 0, $$sum67$i$i = 0, $$sum7$i = 0, $$sum8$i = 0, $$sum8$pre = 0, $$sum9 = 0, $$sum9$i = 0, $$sum9$i$i = 0, $$tsize$1$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0;
 var $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0;
 var $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0;
 var $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0;
 var $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0, $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $108 = 0;
 var $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0;
 var $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0;
 var $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0;
 var $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0;
 var $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0;
 var $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0;
 var $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0;
 var $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0;
 var $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0;
 var $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0;
 var $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0;
 var $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0;
 var $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0;
 var $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0;
 var $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0;
 var $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0;
 var $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0;
 var $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0;
 var $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0;
 var $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0;
 var $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0;
 var $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0;
 var $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0;
 var $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0;
 var $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0;
 var $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0;
 var $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0;
 var $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0;
 var $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0;
 var $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0;
 var $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0;
 var $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0;
 var $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0;
 var $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0;
 var $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0;
 var $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0;
 var $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0;
 var $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0;
 var $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0;
 var $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0;
 var $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0;
 var $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0;
 var $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0;
 var $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0;
 var $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0;
 var $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0;
 var $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0;
 var $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0;
 var $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0;
 var $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0, $F5$0$i = 0, $I1$0$c$i$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0, $K12$027$i = 0, $K2$015$i$i = 0, $K8$053$i$i = 0;
 var $R$0$i = 0, $R$0$i$i = 0, $R$0$i18 = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i20 = 0, $RP$0$i = 0, $RP$0$i$i = 0, $RP$0$i17 = 0, $T$0$lcssa$i = 0, $T$0$lcssa$i$i = 0, $T$0$lcssa$i26$i = 0, $T$014$i$i = 0, $T$026$i = 0, $T$052$i$i = 0, $br$0$i = 0, $br$030$i = 0, $cond$i = 0, $cond$i$i = 0, $cond$i21 = 0;
 var $exitcond$i$i = 0, $i$02$i$i = 0, $idx$0$i = 0, $mem$0 = 0, $nb$0 = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i$i = 0, $or$cond$i27$i = 0, $or$cond$i29 = 0, $or$cond1$i = 0, $or$cond19$i = 0, $or$cond2$i = 0, $or$cond24$i = 0, $or$cond3$i = 0, $or$cond4$i = 0, $or$cond47$i = 0, $or$cond5$i = 0, $or$cond6$i = 0, $or$cond8$i = 0;
 var $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i15 = 0, $rsize$1$i = 0, $rsize$2$i = 0, $rsize$3$lcssa$i = 0, $rsize$331$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$073$i = 0, $sp$166$i = 0, $ssize$0$i = 0, $ssize$1$i = 0, $ssize$129$i = 0, $ssize$2$i = 0, $t$0$i = 0, $t$0$i14 = 0;
 var $t$1$i = 0, $t$2$ph$i = 0, $t$2$v$3$i = 0, $t$230$i = 0, $tbase$245$i = 0, $tsize$03141$i = 0, $tsize$1$i = 0, $tsize$244$i = 0, $v$0$i = 0, $v$0$i16 = 0, $v$1$i = 0, $v$2$i = 0, $v$3$lcssa$i = 0, $v$332$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   if ($1) {
    $5 = 16;
   } else {
    $2 = (($bytes) + 11)|0;
    $3 = $2 & -8;
    $5 = $3;
   }
   $4 = $5 >>> 3;
   $6 = HEAP32[263152>>2]|0;
   $7 = $6 >>> $4;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($4))|0;
    $13 = $12 << 1;
    $14 = ((263152 + ($13<<2)|0) + 40|0);
    $$sum10 = (($13) + 2)|0;
    $15 = ((263152 + ($$sum10<<2)|0) + 40|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = (($16) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[263152>>2] = $22;
     } else {
      $23 = HEAP32[((263152 + 16|0))>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = (($18) + 12|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)==($16|0);
      if ($27) {
       HEAP32[$25>>2] = $14;
       HEAP32[$15>>2] = $18;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = (($16) + 4|0);
    HEAP32[$30>>2] = $29;
    $$sum1112 = $28 | 4;
    $31 = (($16) + ($$sum1112)|0);
    $32 = HEAP32[$31>>2]|0;
    $33 = $32 | 1;
    HEAP32[$31>>2] = $33;
    $mem$0 = $17;
    STACKTOP = sp;return ($mem$0|0);
   }
   $34 = HEAP32[((263152 + 8|0))>>2]|0;
   $35 = ($5>>>0)>($34>>>0);
   if ($35) {
    $36 = ($7|0)==(0);
    if (!($36)) {
     $37 = $7 << $4;
     $38 = 2 << $4;
     $39 = (0 - ($38))|0;
     $40 = $38 | $39;
     $41 = $37 & $40;
     $42 = (0 - ($41))|0;
     $43 = $41 & $42;
     $44 = (($43) + -1)|0;
     $45 = $44 >>> 12;
     $46 = $45 & 16;
     $47 = $44 >>> $46;
     $48 = $47 >>> 5;
     $49 = $48 & 8;
     $50 = $49 | $46;
     $51 = $47 >>> $49;
     $52 = $51 >>> 2;
     $53 = $52 & 4;
     $54 = $50 | $53;
     $55 = $51 >>> $53;
     $56 = $55 >>> 1;
     $57 = $56 & 2;
     $58 = $54 | $57;
     $59 = $55 >>> $57;
     $60 = $59 >>> 1;
     $61 = $60 & 1;
     $62 = $58 | $61;
     $63 = $59 >>> $61;
     $64 = (($62) + ($63))|0;
     $65 = $64 << 1;
     $66 = ((263152 + ($65<<2)|0) + 40|0);
     $$sum4 = (($65) + 2)|0;
     $67 = ((263152 + ($$sum4<<2)|0) + 40|0);
     $68 = HEAP32[$67>>2]|0;
     $69 = (($68) + 8|0);
     $70 = HEAP32[$69>>2]|0;
     $71 = ($66|0)==($70|0);
     do {
      if ($71) {
       $72 = 1 << $64;
       $73 = $72 ^ -1;
       $74 = $6 & $73;
       HEAP32[263152>>2] = $74;
       $89 = $34;
      } else {
       $75 = HEAP32[((263152 + 16|0))>>2]|0;
       $76 = ($70>>>0)<($75>>>0);
       if ($76) {
        _abort();
        // unreachable;
       }
       $77 = (($70) + 12|0);
       $78 = HEAP32[$77>>2]|0;
       $79 = ($78|0)==($68|0);
       if ($79) {
        HEAP32[$77>>2] = $66;
        HEAP32[$67>>2] = $70;
        $$pre = HEAP32[((263152 + 8|0))>>2]|0;
        $89 = $$pre;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $80 = $64 << 3;
     $81 = (($80) - ($5))|0;
     $82 = $5 | 3;
     $83 = (($68) + 4|0);
     HEAP32[$83>>2] = $82;
     $84 = (($68) + ($5)|0);
     $85 = $81 | 1;
     $$sum56 = $5 | 4;
     $86 = (($68) + ($$sum56)|0);
     HEAP32[$86>>2] = $85;
     $87 = (($68) + ($80)|0);
     HEAP32[$87>>2] = $81;
     $88 = ($89|0)==(0);
     if (!($88)) {
      $90 = HEAP32[((263152 + 20|0))>>2]|0;
      $91 = $89 >>> 3;
      $92 = $91 << 1;
      $93 = ((263152 + ($92<<2)|0) + 40|0);
      $94 = HEAP32[263152>>2]|0;
      $95 = 1 << $91;
      $96 = $94 & $95;
      $97 = ($96|0)==(0);
      if ($97) {
       $98 = $94 | $95;
       HEAP32[263152>>2] = $98;
       $$sum8$pre = (($92) + 2)|0;
       $$pre105 = ((263152 + ($$sum8$pre<<2)|0) + 40|0);
       $$pre$phiZ2D = $$pre105;$F4$0 = $93;
      } else {
       $$sum9 = (($92) + 2)|0;
       $99 = ((263152 + ($$sum9<<2)|0) + 40|0);
       $100 = HEAP32[$99>>2]|0;
       $101 = HEAP32[((263152 + 16|0))>>2]|0;
       $102 = ($100>>>0)<($101>>>0);
       if ($102) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $99;$F4$0 = $100;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $90;
      $103 = (($F4$0) + 12|0);
      HEAP32[$103>>2] = $90;
      $104 = (($90) + 8|0);
      HEAP32[$104>>2] = $F4$0;
      $105 = (($90) + 12|0);
      HEAP32[$105>>2] = $93;
     }
     HEAP32[((263152 + 8|0))>>2] = $81;
     HEAP32[((263152 + 20|0))>>2] = $84;
     $mem$0 = $69;
     STACKTOP = sp;return ($mem$0|0);
    }
    $106 = HEAP32[((263152 + 4|0))>>2]|0;
    $107 = ($106|0)==(0);
    if ($107) {
     $nb$0 = $5;
    } else {
     $108 = (0 - ($106))|0;
     $109 = $106 & $108;
     $110 = (($109) + -1)|0;
     $111 = $110 >>> 12;
     $112 = $111 & 16;
     $113 = $110 >>> $112;
     $114 = $113 >>> 5;
     $115 = $114 & 8;
     $116 = $115 | $112;
     $117 = $113 >>> $115;
     $118 = $117 >>> 2;
     $119 = $118 & 4;
     $120 = $116 | $119;
     $121 = $117 >>> $119;
     $122 = $121 >>> 1;
     $123 = $122 & 2;
     $124 = $120 | $123;
     $125 = $121 >>> $123;
     $126 = $125 >>> 1;
     $127 = $126 & 1;
     $128 = $124 | $127;
     $129 = $125 >>> $127;
     $130 = (($128) + ($129))|0;
     $131 = ((263152 + ($130<<2)|0) + 304|0);
     $132 = HEAP32[$131>>2]|0;
     $133 = (($132) + 4|0);
     $134 = HEAP32[$133>>2]|0;
     $135 = $134 & -8;
     $136 = (($135) - ($5))|0;
     $rsize$0$i = $136;$t$0$i = $132;$v$0$i = $132;
     while(1) {
      $137 = (($t$0$i) + 16|0);
      $138 = HEAP32[$137>>2]|0;
      $139 = ($138|0)==(0|0);
      if ($139) {
       $140 = (($t$0$i) + 20|0);
       $141 = HEAP32[$140>>2]|0;
       $142 = ($141|0)==(0|0);
       if ($142) {
        break;
       } else {
        $144 = $141;
       }
      } else {
       $144 = $138;
      }
      $143 = (($144) + 4|0);
      $145 = HEAP32[$143>>2]|0;
      $146 = $145 & -8;
      $147 = (($146) - ($5))|0;
      $148 = ($147>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $148 ? $147 : $rsize$0$i;
      $$v$0$i = $148 ? $144 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $144;$v$0$i = $$v$0$i;
     }
     $149 = HEAP32[((263152 + 16|0))>>2]|0;
     $150 = ($v$0$i>>>0)<($149>>>0);
     if ($150) {
      _abort();
      // unreachable;
     }
     $151 = (($v$0$i) + ($5)|0);
     $152 = ($v$0$i>>>0)<($151>>>0);
     if (!($152)) {
      _abort();
      // unreachable;
     }
     $153 = (($v$0$i) + 24|0);
     $154 = HEAP32[$153>>2]|0;
     $155 = (($v$0$i) + 12|0);
     $156 = HEAP32[$155>>2]|0;
     $157 = ($156|0)==($v$0$i|0);
     do {
      if ($157) {
       $167 = (($v$0$i) + 20|0);
       $168 = HEAP32[$167>>2]|0;
       $169 = ($168|0)==(0|0);
       if ($169) {
        $170 = (($v$0$i) + 16|0);
        $171 = HEAP32[$170>>2]|0;
        $172 = ($171|0)==(0|0);
        if ($172) {
         $R$1$i = 0;
         break;
        } else {
         $R$0$i = $171;$RP$0$i = $170;
        }
       } else {
        $R$0$i = $168;$RP$0$i = $167;
       }
       while(1) {
        $173 = (($R$0$i) + 20|0);
        $174 = HEAP32[$173>>2]|0;
        $175 = ($174|0)==(0|0);
        if (!($175)) {
         $R$0$i = $174;$RP$0$i = $173;
         continue;
        }
        $176 = (($R$0$i) + 16|0);
        $177 = HEAP32[$176>>2]|0;
        $178 = ($177|0)==(0|0);
        if ($178) {
         break;
        } else {
         $R$0$i = $177;$RP$0$i = $176;
        }
       }
       $179 = ($RP$0$i>>>0)<($149>>>0);
       if ($179) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$0$i>>2] = 0;
        $R$1$i = $R$0$i;
        break;
       }
      } else {
       $158 = (($v$0$i) + 8|0);
       $159 = HEAP32[$158>>2]|0;
       $160 = ($159>>>0)<($149>>>0);
       if ($160) {
        _abort();
        // unreachable;
       }
       $161 = (($159) + 12|0);
       $162 = HEAP32[$161>>2]|0;
       $163 = ($162|0)==($v$0$i|0);
       if (!($163)) {
        _abort();
        // unreachable;
       }
       $164 = (($156) + 8|0);
       $165 = HEAP32[$164>>2]|0;
       $166 = ($165|0)==($v$0$i|0);
       if ($166) {
        HEAP32[$161>>2] = $156;
        HEAP32[$164>>2] = $159;
        $R$1$i = $156;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $180 = ($154|0)==(0|0);
     do {
      if (!($180)) {
       $181 = (($v$0$i) + 28|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ((263152 + ($182<<2)|0) + 304|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($v$0$i|0)==($184|0);
       if ($185) {
        HEAP32[$183>>2] = $R$1$i;
        $cond$i = ($R$1$i|0)==(0|0);
        if ($cond$i) {
         $186 = 1 << $182;
         $187 = $186 ^ -1;
         $188 = HEAP32[((263152 + 4|0))>>2]|0;
         $189 = $188 & $187;
         HEAP32[((263152 + 4|0))>>2] = $189;
         break;
        }
       } else {
        $190 = HEAP32[((263152 + 16|0))>>2]|0;
        $191 = ($154>>>0)<($190>>>0);
        if ($191) {
         _abort();
         // unreachable;
        }
        $192 = (($154) + 16|0);
        $193 = HEAP32[$192>>2]|0;
        $194 = ($193|0)==($v$0$i|0);
        if ($194) {
         HEAP32[$192>>2] = $R$1$i;
        } else {
         $195 = (($154) + 20|0);
         HEAP32[$195>>2] = $R$1$i;
        }
        $196 = ($R$1$i|0)==(0|0);
        if ($196) {
         break;
        }
       }
       $197 = HEAP32[((263152 + 16|0))>>2]|0;
       $198 = ($R$1$i>>>0)<($197>>>0);
       if ($198) {
        _abort();
        // unreachable;
       }
       $199 = (($R$1$i) + 24|0);
       HEAP32[$199>>2] = $154;
       $200 = (($v$0$i) + 16|0);
       $201 = HEAP32[$200>>2]|0;
       $202 = ($201|0)==(0|0);
       do {
        if (!($202)) {
         $203 = ($201>>>0)<($197>>>0);
         if ($203) {
          _abort();
          // unreachable;
         } else {
          $204 = (($R$1$i) + 16|0);
          HEAP32[$204>>2] = $201;
          $205 = (($201) + 24|0);
          HEAP32[$205>>2] = $R$1$i;
          break;
         }
        }
       } while(0);
       $206 = (($v$0$i) + 20|0);
       $207 = HEAP32[$206>>2]|0;
       $208 = ($207|0)==(0|0);
       if (!($208)) {
        $209 = HEAP32[((263152 + 16|0))>>2]|0;
        $210 = ($207>>>0)<($209>>>0);
        if ($210) {
         _abort();
         // unreachable;
        } else {
         $211 = (($R$1$i) + 20|0);
         HEAP32[$211>>2] = $207;
         $212 = (($207) + 24|0);
         HEAP32[$212>>2] = $R$1$i;
         break;
        }
       }
      }
     } while(0);
     $213 = ($rsize$0$i>>>0)<(16);
     if ($213) {
      $214 = (($rsize$0$i) + ($5))|0;
      $215 = $214 | 3;
      $216 = (($v$0$i) + 4|0);
      HEAP32[$216>>2] = $215;
      $$sum4$i = (($214) + 4)|0;
      $217 = (($v$0$i) + ($$sum4$i)|0);
      $218 = HEAP32[$217>>2]|0;
      $219 = $218 | 1;
      HEAP32[$217>>2] = $219;
     } else {
      $220 = $5 | 3;
      $221 = (($v$0$i) + 4|0);
      HEAP32[$221>>2] = $220;
      $222 = $rsize$0$i | 1;
      $$sum$i39 = $5 | 4;
      $223 = (($v$0$i) + ($$sum$i39)|0);
      HEAP32[$223>>2] = $222;
      $$sum1$i = (($rsize$0$i) + ($5))|0;
      $224 = (($v$0$i) + ($$sum1$i)|0);
      HEAP32[$224>>2] = $rsize$0$i;
      $225 = HEAP32[((263152 + 8|0))>>2]|0;
      $226 = ($225|0)==(0);
      if (!($226)) {
       $227 = HEAP32[((263152 + 20|0))>>2]|0;
       $228 = $225 >>> 3;
       $229 = $228 << 1;
       $230 = ((263152 + ($229<<2)|0) + 40|0);
       $231 = HEAP32[263152>>2]|0;
       $232 = 1 << $228;
       $233 = $231 & $232;
       $234 = ($233|0)==(0);
       if ($234) {
        $235 = $231 | $232;
        HEAP32[263152>>2] = $235;
        $$sum2$pre$i = (($229) + 2)|0;
        $$pre$i = ((263152 + ($$sum2$pre$i<<2)|0) + 40|0);
        $$pre$phi$iZ2D = $$pre$i;$F1$0$i = $230;
       } else {
        $$sum3$i = (($229) + 2)|0;
        $236 = ((263152 + ($$sum3$i<<2)|0) + 40|0);
        $237 = HEAP32[$236>>2]|0;
        $238 = HEAP32[((263152 + 16|0))>>2]|0;
        $239 = ($237>>>0)<($238>>>0);
        if ($239) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $236;$F1$0$i = $237;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $227;
       $240 = (($F1$0$i) + 12|0);
       HEAP32[$240>>2] = $227;
       $241 = (($227) + 8|0);
       HEAP32[$241>>2] = $F1$0$i;
       $242 = (($227) + 12|0);
       HEAP32[$242>>2] = $230;
      }
      HEAP32[((263152 + 8|0))>>2] = $rsize$0$i;
      HEAP32[((263152 + 20|0))>>2] = $151;
     }
     $243 = (($v$0$i) + 8|0);
     $mem$0 = $243;
     STACKTOP = sp;return ($mem$0|0);
    }
   } else {
    $nb$0 = $5;
   }
  } else {
   $244 = ($bytes>>>0)>(4294967231);
   if ($244) {
    $nb$0 = -1;
   } else {
    $245 = (($bytes) + 11)|0;
    $246 = $245 & -8;
    $247 = HEAP32[((263152 + 4|0))>>2]|0;
    $248 = ($247|0)==(0);
    if ($248) {
     $nb$0 = $246;
    } else {
     $249 = (0 - ($246))|0;
     $250 = $245 >>> 8;
     $251 = ($250|0)==(0);
     if ($251) {
      $idx$0$i = 0;
     } else {
      $252 = ($246>>>0)>(16777215);
      if ($252) {
       $idx$0$i = 31;
      } else {
       $253 = (($250) + 1048320)|0;
       $254 = $253 >>> 16;
       $255 = $254 & 8;
       $256 = $250 << $255;
       $257 = (($256) + 520192)|0;
       $258 = $257 >>> 16;
       $259 = $258 & 4;
       $260 = $259 | $255;
       $261 = $256 << $259;
       $262 = (($261) + 245760)|0;
       $263 = $262 >>> 16;
       $264 = $263 & 2;
       $265 = $260 | $264;
       $266 = (14 - ($265))|0;
       $267 = $261 << $264;
       $268 = $267 >>> 15;
       $269 = (($266) + ($268))|0;
       $270 = $269 << 1;
       $271 = (($269) + 7)|0;
       $272 = $246 >>> $271;
       $273 = $272 & 1;
       $274 = $273 | $270;
       $idx$0$i = $274;
      }
     }
     $275 = ((263152 + ($idx$0$i<<2)|0) + 304|0);
     $276 = HEAP32[$275>>2]|0;
     $277 = ($276|0)==(0|0);
     L126: do {
      if ($277) {
       $rsize$2$i = $249;$t$1$i = 0;$v$2$i = 0;
      } else {
       $278 = ($idx$0$i|0)==(31);
       if ($278) {
        $282 = 0;
       } else {
        $279 = $idx$0$i >>> 1;
        $280 = (25 - ($279))|0;
        $282 = $280;
       }
       $281 = $246 << $282;
       $rsize$0$i15 = $249;$rst$0$i = 0;$sizebits$0$i = $281;$t$0$i14 = $276;$v$0$i16 = 0;
       while(1) {
        $283 = (($t$0$i14) + 4|0);
        $284 = HEAP32[$283>>2]|0;
        $285 = $284 & -8;
        $286 = (($285) - ($246))|0;
        $287 = ($286>>>0)<($rsize$0$i15>>>0);
        if ($287) {
         $288 = ($285|0)==($246|0);
         if ($288) {
          $rsize$2$i = $286;$t$1$i = $t$0$i14;$v$2$i = $t$0$i14;
          break L126;
         } else {
          $rsize$1$i = $286;$v$1$i = $t$0$i14;
         }
        } else {
         $rsize$1$i = $rsize$0$i15;$v$1$i = $v$0$i16;
        }
        $289 = (($t$0$i14) + 20|0);
        $290 = HEAP32[$289>>2]|0;
        $291 = $sizebits$0$i >>> 31;
        $292 = ((($t$0$i14) + ($291<<2)|0) + 16|0);
        $293 = HEAP32[$292>>2]|0;
        $294 = ($290|0)==(0|0);
        $295 = ($290|0)==($293|0);
        $or$cond19$i = $294 | $295;
        $rst$1$i = $or$cond19$i ? $rst$0$i : $290;
        $296 = ($293|0)==(0|0);
        $297 = $sizebits$0$i << 1;
        if ($296) {
         $rsize$2$i = $rsize$1$i;$t$1$i = $rst$1$i;$v$2$i = $v$1$i;
         break;
        } else {
         $rsize$0$i15 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $297;$t$0$i14 = $293;$v$0$i16 = $v$1$i;
        }
       }
      }
     } while(0);
     $298 = ($t$1$i|0)==(0|0);
     $299 = ($v$2$i|0)==(0|0);
     $or$cond$i = $298 & $299;
     if ($or$cond$i) {
      $300 = 2 << $idx$0$i;
      $301 = (0 - ($300))|0;
      $302 = $300 | $301;
      $303 = $247 & $302;
      $304 = ($303|0)==(0);
      if ($304) {
       $nb$0 = $246;
       break;
      }
      $305 = (0 - ($303))|0;
      $306 = $303 & $305;
      $307 = (($306) + -1)|0;
      $308 = $307 >>> 12;
      $309 = $308 & 16;
      $310 = $307 >>> $309;
      $311 = $310 >>> 5;
      $312 = $311 & 8;
      $313 = $312 | $309;
      $314 = $310 >>> $312;
      $315 = $314 >>> 2;
      $316 = $315 & 4;
      $317 = $313 | $316;
      $318 = $314 >>> $316;
      $319 = $318 >>> 1;
      $320 = $319 & 2;
      $321 = $317 | $320;
      $322 = $318 >>> $320;
      $323 = $322 >>> 1;
      $324 = $323 & 1;
      $325 = $321 | $324;
      $326 = $322 >>> $324;
      $327 = (($325) + ($326))|0;
      $328 = ((263152 + ($327<<2)|0) + 304|0);
      $329 = HEAP32[$328>>2]|0;
      $t$2$ph$i = $329;
     } else {
      $t$2$ph$i = $t$1$i;
     }
     $330 = ($t$2$ph$i|0)==(0|0);
     if ($330) {
      $rsize$3$lcssa$i = $rsize$2$i;$v$3$lcssa$i = $v$2$i;
     } else {
      $rsize$331$i = $rsize$2$i;$t$230$i = $t$2$ph$i;$v$332$i = $v$2$i;
      while(1) {
       $331 = (($t$230$i) + 4|0);
       $332 = HEAP32[$331>>2]|0;
       $333 = $332 & -8;
       $334 = (($333) - ($246))|0;
       $335 = ($334>>>0)<($rsize$331$i>>>0);
       $$rsize$3$i = $335 ? $334 : $rsize$331$i;
       $t$2$v$3$i = $335 ? $t$230$i : $v$332$i;
       $336 = (($t$230$i) + 16|0);
       $337 = HEAP32[$336>>2]|0;
       $338 = ($337|0)==(0|0);
       if (!($338)) {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $337;$v$332$i = $t$2$v$3$i;
        continue;
       }
       $339 = (($t$230$i) + 20|0);
       $340 = HEAP32[$339>>2]|0;
       $341 = ($340|0)==(0|0);
       if ($341) {
        $rsize$3$lcssa$i = $$rsize$3$i;$v$3$lcssa$i = $t$2$v$3$i;
        break;
       } else {
        $rsize$331$i = $$rsize$3$i;$t$230$i = $340;$v$332$i = $t$2$v$3$i;
       }
      }
     }
     $342 = ($v$3$lcssa$i|0)==(0|0);
     if ($342) {
      $nb$0 = $246;
     } else {
      $343 = HEAP32[((263152 + 8|0))>>2]|0;
      $344 = (($343) - ($246))|0;
      $345 = ($rsize$3$lcssa$i>>>0)<($344>>>0);
      if ($345) {
       $346 = HEAP32[((263152 + 16|0))>>2]|0;
       $347 = ($v$3$lcssa$i>>>0)<($346>>>0);
       if ($347) {
        _abort();
        // unreachable;
       }
       $348 = (($v$3$lcssa$i) + ($246)|0);
       $349 = ($v$3$lcssa$i>>>0)<($348>>>0);
       if (!($349)) {
        _abort();
        // unreachable;
       }
       $350 = (($v$3$lcssa$i) + 24|0);
       $351 = HEAP32[$350>>2]|0;
       $352 = (($v$3$lcssa$i) + 12|0);
       $353 = HEAP32[$352>>2]|0;
       $354 = ($353|0)==($v$3$lcssa$i|0);
       do {
        if ($354) {
         $364 = (($v$3$lcssa$i) + 20|0);
         $365 = HEAP32[$364>>2]|0;
         $366 = ($365|0)==(0|0);
         if ($366) {
          $367 = (($v$3$lcssa$i) + 16|0);
          $368 = HEAP32[$367>>2]|0;
          $369 = ($368|0)==(0|0);
          if ($369) {
           $R$1$i20 = 0;
           break;
          } else {
           $R$0$i18 = $368;$RP$0$i17 = $367;
          }
         } else {
          $R$0$i18 = $365;$RP$0$i17 = $364;
         }
         while(1) {
          $370 = (($R$0$i18) + 20|0);
          $371 = HEAP32[$370>>2]|0;
          $372 = ($371|0)==(0|0);
          if (!($372)) {
           $R$0$i18 = $371;$RP$0$i17 = $370;
           continue;
          }
          $373 = (($R$0$i18) + 16|0);
          $374 = HEAP32[$373>>2]|0;
          $375 = ($374|0)==(0|0);
          if ($375) {
           break;
          } else {
           $R$0$i18 = $374;$RP$0$i17 = $373;
          }
         }
         $376 = ($RP$0$i17>>>0)<($346>>>0);
         if ($376) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$0$i17>>2] = 0;
          $R$1$i20 = $R$0$i18;
          break;
         }
        } else {
         $355 = (($v$3$lcssa$i) + 8|0);
         $356 = HEAP32[$355>>2]|0;
         $357 = ($356>>>0)<($346>>>0);
         if ($357) {
          _abort();
          // unreachable;
         }
         $358 = (($356) + 12|0);
         $359 = HEAP32[$358>>2]|0;
         $360 = ($359|0)==($v$3$lcssa$i|0);
         if (!($360)) {
          _abort();
          // unreachable;
         }
         $361 = (($353) + 8|0);
         $362 = HEAP32[$361>>2]|0;
         $363 = ($362|0)==($v$3$lcssa$i|0);
         if ($363) {
          HEAP32[$358>>2] = $353;
          HEAP32[$361>>2] = $356;
          $R$1$i20 = $353;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $377 = ($351|0)==(0|0);
       do {
        if (!($377)) {
         $378 = (($v$3$lcssa$i) + 28|0);
         $379 = HEAP32[$378>>2]|0;
         $380 = ((263152 + ($379<<2)|0) + 304|0);
         $381 = HEAP32[$380>>2]|0;
         $382 = ($v$3$lcssa$i|0)==($381|0);
         if ($382) {
          HEAP32[$380>>2] = $R$1$i20;
          $cond$i21 = ($R$1$i20|0)==(0|0);
          if ($cond$i21) {
           $383 = 1 << $379;
           $384 = $383 ^ -1;
           $385 = HEAP32[((263152 + 4|0))>>2]|0;
           $386 = $385 & $384;
           HEAP32[((263152 + 4|0))>>2] = $386;
           break;
          }
         } else {
          $387 = HEAP32[((263152 + 16|0))>>2]|0;
          $388 = ($351>>>0)<($387>>>0);
          if ($388) {
           _abort();
           // unreachable;
          }
          $389 = (($351) + 16|0);
          $390 = HEAP32[$389>>2]|0;
          $391 = ($390|0)==($v$3$lcssa$i|0);
          if ($391) {
           HEAP32[$389>>2] = $R$1$i20;
          } else {
           $392 = (($351) + 20|0);
           HEAP32[$392>>2] = $R$1$i20;
          }
          $393 = ($R$1$i20|0)==(0|0);
          if ($393) {
           break;
          }
         }
         $394 = HEAP32[((263152 + 16|0))>>2]|0;
         $395 = ($R$1$i20>>>0)<($394>>>0);
         if ($395) {
          _abort();
          // unreachable;
         }
         $396 = (($R$1$i20) + 24|0);
         HEAP32[$396>>2] = $351;
         $397 = (($v$3$lcssa$i) + 16|0);
         $398 = HEAP32[$397>>2]|0;
         $399 = ($398|0)==(0|0);
         do {
          if (!($399)) {
           $400 = ($398>>>0)<($394>>>0);
           if ($400) {
            _abort();
            // unreachable;
           } else {
            $401 = (($R$1$i20) + 16|0);
            HEAP32[$401>>2] = $398;
            $402 = (($398) + 24|0);
            HEAP32[$402>>2] = $R$1$i20;
            break;
           }
          }
         } while(0);
         $403 = (($v$3$lcssa$i) + 20|0);
         $404 = HEAP32[$403>>2]|0;
         $405 = ($404|0)==(0|0);
         if (!($405)) {
          $406 = HEAP32[((263152 + 16|0))>>2]|0;
          $407 = ($404>>>0)<($406>>>0);
          if ($407) {
           _abort();
           // unreachable;
          } else {
           $408 = (($R$1$i20) + 20|0);
           HEAP32[$408>>2] = $404;
           $409 = (($404) + 24|0);
           HEAP32[$409>>2] = $R$1$i20;
           break;
          }
         }
        }
       } while(0);
       $410 = ($rsize$3$lcssa$i>>>0)<(16);
       L204: do {
        if ($410) {
         $411 = (($rsize$3$lcssa$i) + ($246))|0;
         $412 = $411 | 3;
         $413 = (($v$3$lcssa$i) + 4|0);
         HEAP32[$413>>2] = $412;
         $$sum18$i = (($411) + 4)|0;
         $414 = (($v$3$lcssa$i) + ($$sum18$i)|0);
         $415 = HEAP32[$414>>2]|0;
         $416 = $415 | 1;
         HEAP32[$414>>2] = $416;
        } else {
         $417 = $246 | 3;
         $418 = (($v$3$lcssa$i) + 4|0);
         HEAP32[$418>>2] = $417;
         $419 = $rsize$3$lcssa$i | 1;
         $$sum$i2338 = $246 | 4;
         $420 = (($v$3$lcssa$i) + ($$sum$i2338)|0);
         HEAP32[$420>>2] = $419;
         $$sum1$i24 = (($rsize$3$lcssa$i) + ($246))|0;
         $421 = (($v$3$lcssa$i) + ($$sum1$i24)|0);
         HEAP32[$421>>2] = $rsize$3$lcssa$i;
         $422 = $rsize$3$lcssa$i >>> 3;
         $423 = ($rsize$3$lcssa$i>>>0)<(256);
         if ($423) {
          $424 = $422 << 1;
          $425 = ((263152 + ($424<<2)|0) + 40|0);
          $426 = HEAP32[263152>>2]|0;
          $427 = 1 << $422;
          $428 = $426 & $427;
          $429 = ($428|0)==(0);
          do {
           if ($429) {
            $430 = $426 | $427;
            HEAP32[263152>>2] = $430;
            $$sum14$pre$i = (($424) + 2)|0;
            $$pre$i25 = ((263152 + ($$sum14$pre$i<<2)|0) + 40|0);
            $$pre$phi$i26Z2D = $$pre$i25;$F5$0$i = $425;
           } else {
            $$sum17$i = (($424) + 2)|0;
            $431 = ((263152 + ($$sum17$i<<2)|0) + 40|0);
            $432 = HEAP32[$431>>2]|0;
            $433 = HEAP32[((263152 + 16|0))>>2]|0;
            $434 = ($432>>>0)<($433>>>0);
            if (!($434)) {
             $$pre$phi$i26Z2D = $431;$F5$0$i = $432;
             break;
            }
            _abort();
            // unreachable;
           }
          } while(0);
          HEAP32[$$pre$phi$i26Z2D>>2] = $348;
          $435 = (($F5$0$i) + 12|0);
          HEAP32[$435>>2] = $348;
          $$sum15$i = (($246) + 8)|0;
          $436 = (($v$3$lcssa$i) + ($$sum15$i)|0);
          HEAP32[$436>>2] = $F5$0$i;
          $$sum16$i = (($246) + 12)|0;
          $437 = (($v$3$lcssa$i) + ($$sum16$i)|0);
          HEAP32[$437>>2] = $425;
          break;
         }
         $438 = $rsize$3$lcssa$i >>> 8;
         $439 = ($438|0)==(0);
         if ($439) {
          $I7$0$i = 0;
         } else {
          $440 = ($rsize$3$lcssa$i>>>0)>(16777215);
          if ($440) {
           $I7$0$i = 31;
          } else {
           $441 = (($438) + 1048320)|0;
           $442 = $441 >>> 16;
           $443 = $442 & 8;
           $444 = $438 << $443;
           $445 = (($444) + 520192)|0;
           $446 = $445 >>> 16;
           $447 = $446 & 4;
           $448 = $447 | $443;
           $449 = $444 << $447;
           $450 = (($449) + 245760)|0;
           $451 = $450 >>> 16;
           $452 = $451 & 2;
           $453 = $448 | $452;
           $454 = (14 - ($453))|0;
           $455 = $449 << $452;
           $456 = $455 >>> 15;
           $457 = (($454) + ($456))|0;
           $458 = $457 << 1;
           $459 = (($457) + 7)|0;
           $460 = $rsize$3$lcssa$i >>> $459;
           $461 = $460 & 1;
           $462 = $461 | $458;
           $I7$0$i = $462;
          }
         }
         $463 = ((263152 + ($I7$0$i<<2)|0) + 304|0);
         $$sum2$i = (($246) + 28)|0;
         $464 = (($v$3$lcssa$i) + ($$sum2$i)|0);
         HEAP32[$464>>2] = $I7$0$i;
         $$sum3$i27 = (($246) + 16)|0;
         $465 = (($v$3$lcssa$i) + ($$sum3$i27)|0);
         $$sum4$i28 = (($246) + 20)|0;
         $466 = (($v$3$lcssa$i) + ($$sum4$i28)|0);
         HEAP32[$466>>2] = 0;
         HEAP32[$465>>2] = 0;
         $467 = HEAP32[((263152 + 4|0))>>2]|0;
         $468 = 1 << $I7$0$i;
         $469 = $467 & $468;
         $470 = ($469|0)==(0);
         if ($470) {
          $471 = $467 | $468;
          HEAP32[((263152 + 4|0))>>2] = $471;
          HEAP32[$463>>2] = $348;
          $$sum5$i = (($246) + 24)|0;
          $472 = (($v$3$lcssa$i) + ($$sum5$i)|0);
          HEAP32[$472>>2] = $463;
          $$sum6$i = (($246) + 12)|0;
          $473 = (($v$3$lcssa$i) + ($$sum6$i)|0);
          HEAP32[$473>>2] = $348;
          $$sum7$i = (($246) + 8)|0;
          $474 = (($v$3$lcssa$i) + ($$sum7$i)|0);
          HEAP32[$474>>2] = $348;
          break;
         }
         $475 = HEAP32[$463>>2]|0;
         $476 = ($I7$0$i|0)==(31);
         if ($476) {
          $484 = 0;
         } else {
          $477 = $I7$0$i >>> 1;
          $478 = (25 - ($477))|0;
          $484 = $478;
         }
         $479 = (($475) + 4|0);
         $480 = HEAP32[$479>>2]|0;
         $481 = $480 & -8;
         $482 = ($481|0)==($rsize$3$lcssa$i|0);
         L225: do {
          if ($482) {
           $T$0$lcssa$i = $475;
          } else {
           $483 = $rsize$3$lcssa$i << $484;
           $K12$027$i = $483;$T$026$i = $475;
           while(1) {
            $491 = $K12$027$i >>> 31;
            $492 = ((($T$026$i) + ($491<<2)|0) + 16|0);
            $487 = HEAP32[$492>>2]|0;
            $493 = ($487|0)==(0|0);
            if ($493) {
             break;
            }
            $485 = $K12$027$i << 1;
            $486 = (($487) + 4|0);
            $488 = HEAP32[$486>>2]|0;
            $489 = $488 & -8;
            $490 = ($489|0)==($rsize$3$lcssa$i|0);
            if ($490) {
             $T$0$lcssa$i = $487;
             break L225;
            } else {
             $K12$027$i = $485;$T$026$i = $487;
            }
           }
           $494 = HEAP32[((263152 + 16|0))>>2]|0;
           $495 = ($492>>>0)<($494>>>0);
           if ($495) {
            _abort();
            // unreachable;
           } else {
            HEAP32[$492>>2] = $348;
            $$sum11$i = (($246) + 24)|0;
            $496 = (($v$3$lcssa$i) + ($$sum11$i)|0);
            HEAP32[$496>>2] = $T$026$i;
            $$sum12$i = (($246) + 12)|0;
            $497 = (($v$3$lcssa$i) + ($$sum12$i)|0);
            HEAP32[$497>>2] = $348;
            $$sum13$i = (($246) + 8)|0;
            $498 = (($v$3$lcssa$i) + ($$sum13$i)|0);
            HEAP32[$498>>2] = $348;
            break L204;
           }
          }
         } while(0);
         $499 = (($T$0$lcssa$i) + 8|0);
         $500 = HEAP32[$499>>2]|0;
         $501 = HEAP32[((263152 + 16|0))>>2]|0;
         $502 = ($T$0$lcssa$i>>>0)>=($501>>>0);
         $503 = ($500>>>0)>=($501>>>0);
         $or$cond24$i = $502 & $503;
         if ($or$cond24$i) {
          $504 = (($500) + 12|0);
          HEAP32[$504>>2] = $348;
          HEAP32[$499>>2] = $348;
          $$sum8$i = (($246) + 8)|0;
          $505 = (($v$3$lcssa$i) + ($$sum8$i)|0);
          HEAP32[$505>>2] = $500;
          $$sum9$i = (($246) + 12)|0;
          $506 = (($v$3$lcssa$i) + ($$sum9$i)|0);
          HEAP32[$506>>2] = $T$0$lcssa$i;
          $$sum10$i = (($246) + 24)|0;
          $507 = (($v$3$lcssa$i) + ($$sum10$i)|0);
          HEAP32[$507>>2] = 0;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $508 = (($v$3$lcssa$i) + 8|0);
       $mem$0 = $508;
       STACKTOP = sp;return ($mem$0|0);
      } else {
       $nb$0 = $246;
      }
     }
    }
   }
  }
 } while(0);
 $509 = HEAP32[((263152 + 8|0))>>2]|0;
 $510 = ($509>>>0)<($nb$0>>>0);
 if (!($510)) {
  $511 = (($509) - ($nb$0))|0;
  $512 = HEAP32[((263152 + 20|0))>>2]|0;
  $513 = ($511>>>0)>(15);
  if ($513) {
   $514 = (($512) + ($nb$0)|0);
   HEAP32[((263152 + 20|0))>>2] = $514;
   HEAP32[((263152 + 8|0))>>2] = $511;
   $515 = $511 | 1;
   $$sum2 = (($nb$0) + 4)|0;
   $516 = (($512) + ($$sum2)|0);
   HEAP32[$516>>2] = $515;
   $517 = (($512) + ($509)|0);
   HEAP32[$517>>2] = $511;
   $518 = $nb$0 | 3;
   $519 = (($512) + 4|0);
   HEAP32[$519>>2] = $518;
  } else {
   HEAP32[((263152 + 8|0))>>2] = 0;
   HEAP32[((263152 + 20|0))>>2] = 0;
   $520 = $509 | 3;
   $521 = (($512) + 4|0);
   HEAP32[$521>>2] = $520;
   $$sum1 = (($509) + 4)|0;
   $522 = (($512) + ($$sum1)|0);
   $523 = HEAP32[$522>>2]|0;
   $524 = $523 | 1;
   HEAP32[$522>>2] = $524;
  }
  $525 = (($512) + 8|0);
  $mem$0 = $525;
  STACKTOP = sp;return ($mem$0|0);
 }
 $526 = HEAP32[((263152 + 12|0))>>2]|0;
 $527 = ($526>>>0)>($nb$0>>>0);
 if ($527) {
  $528 = (($526) - ($nb$0))|0;
  HEAP32[((263152 + 12|0))>>2] = $528;
  $529 = HEAP32[((263152 + 24|0))>>2]|0;
  $530 = (($529) + ($nb$0)|0);
  HEAP32[((263152 + 24|0))>>2] = $530;
  $531 = $528 | 1;
  $$sum = (($nb$0) + 4)|0;
  $532 = (($529) + ($$sum)|0);
  HEAP32[$532>>2] = $531;
  $533 = $nb$0 | 3;
  $534 = (($529) + 4|0);
  HEAP32[$534>>2] = $533;
  $535 = (($529) + 8|0);
  $mem$0 = $535;
  STACKTOP = sp;return ($mem$0|0);
 }
 $536 = HEAP32[263624>>2]|0;
 $537 = ($536|0)==(0);
 do {
  if ($537) {
   $538 = (_sysconf(30)|0);
   $539 = (($538) + -1)|0;
   $540 = $539 & $538;
   $541 = ($540|0)==(0);
   if ($541) {
    HEAP32[((263624 + 8|0))>>2] = $538;
    HEAP32[((263624 + 4|0))>>2] = $538;
    HEAP32[((263624 + 12|0))>>2] = -1;
    HEAP32[((263624 + 16|0))>>2] = -1;
    HEAP32[((263624 + 20|0))>>2] = 0;
    HEAP32[((263152 + 444|0))>>2] = 0;
    $542 = (_time((0|0))|0);
    $543 = $542 & -16;
    $544 = $543 ^ 1431655768;
    HEAP32[263624>>2] = $544;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $545 = (($nb$0) + 48)|0;
 $546 = HEAP32[((263624 + 8|0))>>2]|0;
 $547 = (($nb$0) + 47)|0;
 $548 = (($546) + ($547))|0;
 $549 = (0 - ($546))|0;
 $550 = $548 & $549;
 $551 = ($550>>>0)>($nb$0>>>0);
 if (!($551)) {
  $mem$0 = 0;
  STACKTOP = sp;return ($mem$0|0);
 }
 $552 = HEAP32[((263152 + 440|0))>>2]|0;
 $553 = ($552|0)==(0);
 if (!($553)) {
  $554 = HEAP32[((263152 + 432|0))>>2]|0;
  $555 = (($554) + ($550))|0;
  $556 = ($555>>>0)<=($554>>>0);
  $557 = ($555>>>0)>($552>>>0);
  $or$cond1$i = $556 | $557;
  if ($or$cond1$i) {
   $mem$0 = 0;
   STACKTOP = sp;return ($mem$0|0);
  }
 }
 $558 = HEAP32[((263152 + 444|0))>>2]|0;
 $559 = $558 & 4;
 $560 = ($559|0)==(0);
 L266: do {
  if ($560) {
   $561 = HEAP32[((263152 + 24|0))>>2]|0;
   $562 = ($561|0)==(0|0);
   L268: do {
    if ($562) {
     label = 181;
    } else {
     $sp$0$i$i = ((263152 + 448|0));
     while(1) {
      $563 = HEAP32[$sp$0$i$i>>2]|0;
      $564 = ($563>>>0)>($561>>>0);
      if (!($564)) {
       $565 = (($sp$0$i$i) + 4|0);
       $566 = HEAP32[$565>>2]|0;
       $567 = (($563) + ($566)|0);
       $568 = ($567>>>0)>($561>>>0);
       if ($568) {
        break;
       }
      }
      $569 = (($sp$0$i$i) + 8|0);
      $570 = HEAP32[$569>>2]|0;
      $571 = ($570|0)==(0|0);
      if ($571) {
       label = 181;
       break L268;
      } else {
       $sp$0$i$i = $570;
      }
     }
     $572 = ($sp$0$i$i|0)==(0|0);
     if ($572) {
      label = 181;
     } else {
      $595 = HEAP32[((263152 + 12|0))>>2]|0;
      $596 = (($548) - ($595))|0;
      $597 = $596 & $549;
      $598 = ($597>>>0)<(2147483647);
      if ($598) {
       $599 = (_sbrk(($597|0))|0);
       $600 = HEAP32[$sp$0$i$i>>2]|0;
       $601 = HEAP32[$565>>2]|0;
       $602 = (($600) + ($601)|0);
       $603 = ($599|0)==($602|0);
       if ($603) {
        $br$0$i = $599;$ssize$1$i = $597;
        label = 190;
       } else {
        $br$030$i = $599;$ssize$129$i = $597;
        label = 191;
       }
      } else {
       $tsize$03141$i = 0;
      }
     }
    }
   } while(0);
   do {
    if ((label|0) == 181) {
     $573 = (_sbrk(0)|0);
     $574 = ($573|0)==((-1)|0);
     if ($574) {
      $tsize$03141$i = 0;
     } else {
      $575 = $573;
      $576 = HEAP32[((263624 + 4|0))>>2]|0;
      $577 = (($576) + -1)|0;
      $578 = $577 & $575;
      $579 = ($578|0)==(0);
      if ($579) {
       $ssize$0$i = $550;
      } else {
       $580 = (($577) + ($575))|0;
       $581 = (0 - ($576))|0;
       $582 = $580 & $581;
       $583 = (($550) - ($575))|0;
       $584 = (($583) + ($582))|0;
       $ssize$0$i = $584;
      }
      $585 = HEAP32[((263152 + 432|0))>>2]|0;
      $586 = (($585) + ($ssize$0$i))|0;
      $587 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $588 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i29 = $587 & $588;
      if ($or$cond$i29) {
       $589 = HEAP32[((263152 + 440|0))>>2]|0;
       $590 = ($589|0)==(0);
       if (!($590)) {
        $591 = ($586>>>0)<=($585>>>0);
        $592 = ($586>>>0)>($589>>>0);
        $or$cond2$i = $591 | $592;
        if ($or$cond2$i) {
         $tsize$03141$i = 0;
         break;
        }
       }
       $593 = (_sbrk(($ssize$0$i|0))|0);
       $594 = ($593|0)==($573|0);
       if ($594) {
        $br$0$i = $573;$ssize$1$i = $ssize$0$i;
        label = 190;
       } else {
        $br$030$i = $593;$ssize$129$i = $ssize$0$i;
        label = 191;
       }
      } else {
       $tsize$03141$i = 0;
      }
     }
    }
   } while(0);
   L288: do {
    if ((label|0) == 190) {
     $604 = ($br$0$i|0)==((-1)|0);
     if ($604) {
      $tsize$03141$i = $ssize$1$i;
     } else {
      $tbase$245$i = $br$0$i;$tsize$244$i = $ssize$1$i;
      label = 201;
      break L266;
     }
    }
    else if ((label|0) == 191) {
     $605 = (0 - ($ssize$129$i))|0;
     $606 = ($br$030$i|0)!=((-1)|0);
     $607 = ($ssize$129$i>>>0)<(2147483647);
     $or$cond5$i = $606 & $607;
     $608 = ($545>>>0)>($ssize$129$i>>>0);
     $or$cond4$i = $or$cond5$i & $608;
     do {
      if ($or$cond4$i) {
       $609 = HEAP32[((263624 + 8|0))>>2]|0;
       $610 = (($547) - ($ssize$129$i))|0;
       $611 = (($610) + ($609))|0;
       $612 = (0 - ($609))|0;
       $613 = $611 & $612;
       $614 = ($613>>>0)<(2147483647);
       if ($614) {
        $615 = (_sbrk(($613|0))|0);
        $616 = ($615|0)==((-1)|0);
        if ($616) {
         (_sbrk(($605|0))|0);
         $tsize$03141$i = 0;
         break L288;
        } else {
         $617 = (($613) + ($ssize$129$i))|0;
         $ssize$2$i = $617;
         break;
        }
       } else {
        $ssize$2$i = $ssize$129$i;
       }
      } else {
       $ssize$2$i = $ssize$129$i;
      }
     } while(0);
     $618 = ($br$030$i|0)==((-1)|0);
     if ($618) {
      $tsize$03141$i = 0;
     } else {
      $tbase$245$i = $br$030$i;$tsize$244$i = $ssize$2$i;
      label = 201;
      break L266;
     }
    }
   } while(0);
   $619 = HEAP32[((263152 + 444|0))>>2]|0;
   $620 = $619 | 4;
   HEAP32[((263152 + 444|0))>>2] = $620;
   $tsize$1$i = $tsize$03141$i;
   label = 198;
  } else {
   $tsize$1$i = 0;
   label = 198;
  }
 } while(0);
 if ((label|0) == 198) {
  $621 = ($550>>>0)<(2147483647);
  if ($621) {
   $622 = (_sbrk(($550|0))|0);
   $623 = (_sbrk(0)|0);
   $624 = ($622|0)!=((-1)|0);
   $625 = ($623|0)!=((-1)|0);
   $or$cond3$i = $624 & $625;
   $626 = ($622>>>0)<($623>>>0);
   $or$cond6$i = $or$cond3$i & $626;
   if ($or$cond6$i) {
    $627 = $623;
    $628 = $622;
    $629 = (($627) - ($628))|0;
    $630 = (($nb$0) + 40)|0;
    $631 = ($629>>>0)>($630>>>0);
    $$tsize$1$i = $631 ? $629 : $tsize$1$i;
    if ($631) {
     $tbase$245$i = $622;$tsize$244$i = $$tsize$1$i;
     label = 201;
    }
   }
  }
 }
 if ((label|0) == 201) {
  $632 = HEAP32[((263152 + 432|0))>>2]|0;
  $633 = (($632) + ($tsize$244$i))|0;
  HEAP32[((263152 + 432|0))>>2] = $633;
  $634 = HEAP32[((263152 + 436|0))>>2]|0;
  $635 = ($633>>>0)>($634>>>0);
  if ($635) {
   HEAP32[((263152 + 436|0))>>2] = $633;
  }
  $636 = HEAP32[((263152 + 24|0))>>2]|0;
  $637 = ($636|0)==(0|0);
  L308: do {
   if ($637) {
    $638 = HEAP32[((263152 + 16|0))>>2]|0;
    $639 = ($638|0)==(0|0);
    $640 = ($tbase$245$i>>>0)<($638>>>0);
    $or$cond8$i = $639 | $640;
    if ($or$cond8$i) {
     HEAP32[((263152 + 16|0))>>2] = $tbase$245$i;
    }
    HEAP32[((263152 + 448|0))>>2] = $tbase$245$i;
    HEAP32[((263152 + 452|0))>>2] = $tsize$244$i;
    HEAP32[((263152 + 460|0))>>2] = 0;
    $641 = HEAP32[263624>>2]|0;
    HEAP32[((263152 + 36|0))>>2] = $641;
    HEAP32[((263152 + 32|0))>>2] = -1;
    $i$02$i$i = 0;
    while(1) {
     $642 = $i$02$i$i << 1;
     $643 = ((263152 + ($642<<2)|0) + 40|0);
     $$sum$i$i = (($642) + 3)|0;
     $644 = ((263152 + ($$sum$i$i<<2)|0) + 40|0);
     HEAP32[$644>>2] = $643;
     $$sum1$i$i = (($642) + 2)|0;
     $645 = ((263152 + ($$sum1$i$i<<2)|0) + 40|0);
     HEAP32[$645>>2] = $643;
     $646 = (($i$02$i$i) + 1)|0;
     $exitcond$i$i = ($646|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$02$i$i = $646;
     }
    }
    $647 = (($tsize$244$i) + -40)|0;
    $648 = (($tbase$245$i) + 8|0);
    $649 = $648;
    $650 = $649 & 7;
    $651 = ($650|0)==(0);
    if ($651) {
     $655 = 0;
    } else {
     $652 = (0 - ($649))|0;
     $653 = $652 & 7;
     $655 = $653;
    }
    $654 = (($tbase$245$i) + ($655)|0);
    $656 = (($647) - ($655))|0;
    HEAP32[((263152 + 24|0))>>2] = $654;
    HEAP32[((263152 + 12|0))>>2] = $656;
    $657 = $656 | 1;
    $$sum$i12$i = (($655) + 4)|0;
    $658 = (($tbase$245$i) + ($$sum$i12$i)|0);
    HEAP32[$658>>2] = $657;
    $$sum2$i$i = (($tsize$244$i) + -36)|0;
    $659 = (($tbase$245$i) + ($$sum2$i$i)|0);
    HEAP32[$659>>2] = 40;
    $660 = HEAP32[((263624 + 16|0))>>2]|0;
    HEAP32[((263152 + 28|0))>>2] = $660;
   } else {
    $sp$073$i = ((263152 + 448|0));
    while(1) {
     $661 = HEAP32[$sp$073$i>>2]|0;
     $662 = (($sp$073$i) + 4|0);
     $663 = HEAP32[$662>>2]|0;
     $664 = (($661) + ($663)|0);
     $665 = ($tbase$245$i|0)==($664|0);
     if ($665) {
      label = 213;
      break;
     }
     $666 = (($sp$073$i) + 8|0);
     $667 = HEAP32[$666>>2]|0;
     $668 = ($667|0)==(0|0);
     if ($668) {
      break;
     } else {
      $sp$073$i = $667;
     }
    }
    if ((label|0) == 213) {
     $669 = (($sp$073$i) + 12|0);
     $670 = HEAP32[$669>>2]|0;
     $671 = $670 & 8;
     $672 = ($671|0)==(0);
     if ($672) {
      $673 = ($636>>>0)>=($661>>>0);
      $674 = ($636>>>0)<($tbase$245$i>>>0);
      $or$cond47$i = $673 & $674;
      if ($or$cond47$i) {
       $675 = (($663) + ($tsize$244$i))|0;
       HEAP32[$662>>2] = $675;
       $676 = HEAP32[((263152 + 12|0))>>2]|0;
       $677 = (($676) + ($tsize$244$i))|0;
       $678 = (($636) + 8|0);
       $679 = $678;
       $680 = $679 & 7;
       $681 = ($680|0)==(0);
       if ($681) {
        $685 = 0;
       } else {
        $682 = (0 - ($679))|0;
        $683 = $682 & 7;
        $685 = $683;
       }
       $684 = (($636) + ($685)|0);
       $686 = (($677) - ($685))|0;
       HEAP32[((263152 + 24|0))>>2] = $684;
       HEAP32[((263152 + 12|0))>>2] = $686;
       $687 = $686 | 1;
       $$sum$i16$i = (($685) + 4)|0;
       $688 = (($636) + ($$sum$i16$i)|0);
       HEAP32[$688>>2] = $687;
       $$sum2$i17$i = (($677) + 4)|0;
       $689 = (($636) + ($$sum2$i17$i)|0);
       HEAP32[$689>>2] = 40;
       $690 = HEAP32[((263624 + 16|0))>>2]|0;
       HEAP32[((263152 + 28|0))>>2] = $690;
       break;
      }
     }
    }
    $691 = HEAP32[((263152 + 16|0))>>2]|0;
    $692 = ($tbase$245$i>>>0)<($691>>>0);
    if ($692) {
     HEAP32[((263152 + 16|0))>>2] = $tbase$245$i;
     $756 = $tbase$245$i;
    } else {
     $756 = $691;
    }
    $693 = (($tbase$245$i) + ($tsize$244$i)|0);
    $sp$166$i = ((263152 + 448|0));
    while(1) {
     $694 = HEAP32[$sp$166$i>>2]|0;
     $695 = ($694|0)==($693|0);
     if ($695) {
      label = 223;
      break;
     }
     $696 = (($sp$166$i) + 8|0);
     $697 = HEAP32[$696>>2]|0;
     $698 = ($697|0)==(0|0);
     if ($698) {
      break;
     } else {
      $sp$166$i = $697;
     }
    }
    if ((label|0) == 223) {
     $699 = (($sp$166$i) + 12|0);
     $700 = HEAP32[$699>>2]|0;
     $701 = $700 & 8;
     $702 = ($701|0)==(0);
     if ($702) {
      HEAP32[$sp$166$i>>2] = $tbase$245$i;
      $703 = (($sp$166$i) + 4|0);
      $704 = HEAP32[$703>>2]|0;
      $705 = (($704) + ($tsize$244$i))|0;
      HEAP32[$703>>2] = $705;
      $706 = (($tbase$245$i) + 8|0);
      $707 = $706;
      $708 = $707 & 7;
      $709 = ($708|0)==(0);
      if ($709) {
       $713 = 0;
      } else {
       $710 = (0 - ($707))|0;
       $711 = $710 & 7;
       $713 = $711;
      }
      $712 = (($tbase$245$i) + ($713)|0);
      $$sum102$i = (($tsize$244$i) + 8)|0;
      $714 = (($tbase$245$i) + ($$sum102$i)|0);
      $715 = $714;
      $716 = $715 & 7;
      $717 = ($716|0)==(0);
      if ($717) {
       $720 = 0;
      } else {
       $718 = (0 - ($715))|0;
       $719 = $718 & 7;
       $720 = $719;
      }
      $$sum103$i = (($720) + ($tsize$244$i))|0;
      $721 = (($tbase$245$i) + ($$sum103$i)|0);
      $722 = $721;
      $723 = $712;
      $724 = (($722) - ($723))|0;
      $$sum$i19$i = (($713) + ($nb$0))|0;
      $725 = (($tbase$245$i) + ($$sum$i19$i)|0);
      $726 = (($724) - ($nb$0))|0;
      $727 = $nb$0 | 3;
      $$sum1$i20$i = (($713) + 4)|0;
      $728 = (($tbase$245$i) + ($$sum1$i20$i)|0);
      HEAP32[$728>>2] = $727;
      $729 = ($721|0)==($636|0);
      L345: do {
       if ($729) {
        $730 = HEAP32[((263152 + 12|0))>>2]|0;
        $731 = (($730) + ($726))|0;
        HEAP32[((263152 + 12|0))>>2] = $731;
        HEAP32[((263152 + 24|0))>>2] = $725;
        $732 = $731 | 1;
        $$sum42$i$i = (($$sum$i19$i) + 4)|0;
        $733 = (($tbase$245$i) + ($$sum42$i$i)|0);
        HEAP32[$733>>2] = $732;
       } else {
        $734 = HEAP32[((263152 + 20|0))>>2]|0;
        $735 = ($721|0)==($734|0);
        if ($735) {
         $736 = HEAP32[((263152 + 8|0))>>2]|0;
         $737 = (($736) + ($726))|0;
         HEAP32[((263152 + 8|0))>>2] = $737;
         HEAP32[((263152 + 20|0))>>2] = $725;
         $738 = $737 | 1;
         $$sum40$i$i = (($$sum$i19$i) + 4)|0;
         $739 = (($tbase$245$i) + ($$sum40$i$i)|0);
         HEAP32[$739>>2] = $738;
         $$sum41$i$i = (($737) + ($$sum$i19$i))|0;
         $740 = (($tbase$245$i) + ($$sum41$i$i)|0);
         HEAP32[$740>>2] = $737;
         break;
        }
        $$sum2$i21$i = (($tsize$244$i) + 4)|0;
        $$sum104$i = (($$sum2$i21$i) + ($720))|0;
        $741 = (($tbase$245$i) + ($$sum104$i)|0);
        $742 = HEAP32[$741>>2]|0;
        $743 = $742 & 3;
        $744 = ($743|0)==(1);
        if ($744) {
         $745 = $742 & -8;
         $746 = $742 >>> 3;
         $747 = ($742>>>0)<(256);
         L353: do {
          if ($747) {
           $$sum3738$i$i = $720 | 8;
           $$sum114$i = (($$sum3738$i$i) + ($tsize$244$i))|0;
           $748 = (($tbase$245$i) + ($$sum114$i)|0);
           $749 = HEAP32[$748>>2]|0;
           $$sum39$i$i = (($tsize$244$i) + 12)|0;
           $$sum115$i = (($$sum39$i$i) + ($720))|0;
           $750 = (($tbase$245$i) + ($$sum115$i)|0);
           $751 = HEAP32[$750>>2]|0;
           $752 = $746 << 1;
           $753 = ((263152 + ($752<<2)|0) + 40|0);
           $754 = ($749|0)==($753|0);
           do {
            if (!($754)) {
             $755 = ($749>>>0)<($756>>>0);
             if ($755) {
              _abort();
              // unreachable;
             }
             $757 = (($749) + 12|0);
             $758 = HEAP32[$757>>2]|0;
             $759 = ($758|0)==($721|0);
             if ($759) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $760 = ($751|0)==($749|0);
           if ($760) {
            $761 = 1 << $746;
            $762 = $761 ^ -1;
            $763 = HEAP32[263152>>2]|0;
            $764 = $763 & $762;
            HEAP32[263152>>2] = $764;
            break;
           }
           $765 = ($751|0)==($753|0);
           do {
            if ($765) {
             $$pre58$i$i = (($751) + 8|0);
             $$pre$phi59$i$iZ2D = $$pre58$i$i;
            } else {
             $766 = ($751>>>0)<($756>>>0);
             if ($766) {
              _abort();
              // unreachable;
             }
             $767 = (($751) + 8|0);
             $768 = HEAP32[$767>>2]|0;
             $769 = ($768|0)==($721|0);
             if ($769) {
              $$pre$phi59$i$iZ2D = $767;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $770 = (($749) + 12|0);
           HEAP32[$770>>2] = $751;
           HEAP32[$$pre$phi59$i$iZ2D>>2] = $749;
          } else {
           $$sum34$i$i = $720 | 24;
           $$sum105$i = (($$sum34$i$i) + ($tsize$244$i))|0;
           $771 = (($tbase$245$i) + ($$sum105$i)|0);
           $772 = HEAP32[$771>>2]|0;
           $$sum5$i$i = (($tsize$244$i) + 12)|0;
           $$sum106$i = (($$sum5$i$i) + ($720))|0;
           $773 = (($tbase$245$i) + ($$sum106$i)|0);
           $774 = HEAP32[$773>>2]|0;
           $775 = ($774|0)==($721|0);
           do {
            if ($775) {
             $$sum67$i$i = $720 | 16;
             $$sum112$i = (($$sum2$i21$i) + ($$sum67$i$i))|0;
             $785 = (($tbase$245$i) + ($$sum112$i)|0);
             $786 = HEAP32[$785>>2]|0;
             $787 = ($786|0)==(0|0);
             if ($787) {
              $$sum113$i = (($$sum67$i$i) + ($tsize$244$i))|0;
              $788 = (($tbase$245$i) + ($$sum113$i)|0);
              $789 = HEAP32[$788>>2]|0;
              $790 = ($789|0)==(0|0);
              if ($790) {
               $R$1$i$i = 0;
               break;
              } else {
               $R$0$i$i = $789;$RP$0$i$i = $788;
              }
             } else {
              $R$0$i$i = $786;$RP$0$i$i = $785;
             }
             while(1) {
              $791 = (($R$0$i$i) + 20|0);
              $792 = HEAP32[$791>>2]|0;
              $793 = ($792|0)==(0|0);
              if (!($793)) {
               $R$0$i$i = $792;$RP$0$i$i = $791;
               continue;
              }
              $794 = (($R$0$i$i) + 16|0);
              $795 = HEAP32[$794>>2]|0;
              $796 = ($795|0)==(0|0);
              if ($796) {
               break;
              } else {
               $R$0$i$i = $795;$RP$0$i$i = $794;
              }
             }
             $797 = ($RP$0$i$i>>>0)<($756>>>0);
             if ($797) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$0$i$i>>2] = 0;
              $R$1$i$i = $R$0$i$i;
              break;
             }
            } else {
             $$sum3536$i$i = $720 | 8;
             $$sum107$i = (($$sum3536$i$i) + ($tsize$244$i))|0;
             $776 = (($tbase$245$i) + ($$sum107$i)|0);
             $777 = HEAP32[$776>>2]|0;
             $778 = ($777>>>0)<($756>>>0);
             if ($778) {
              _abort();
              // unreachable;
             }
             $779 = (($777) + 12|0);
             $780 = HEAP32[$779>>2]|0;
             $781 = ($780|0)==($721|0);
             if (!($781)) {
              _abort();
              // unreachable;
             }
             $782 = (($774) + 8|0);
             $783 = HEAP32[$782>>2]|0;
             $784 = ($783|0)==($721|0);
             if ($784) {
              HEAP32[$779>>2] = $774;
              HEAP32[$782>>2] = $777;
              $R$1$i$i = $774;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $798 = ($772|0)==(0|0);
           if ($798) {
            break;
           }
           $$sum30$i$i = (($tsize$244$i) + 28)|0;
           $$sum108$i = (($$sum30$i$i) + ($720))|0;
           $799 = (($tbase$245$i) + ($$sum108$i)|0);
           $800 = HEAP32[$799>>2]|0;
           $801 = ((263152 + ($800<<2)|0) + 304|0);
           $802 = HEAP32[$801>>2]|0;
           $803 = ($721|0)==($802|0);
           do {
            if ($803) {
             HEAP32[$801>>2] = $R$1$i$i;
             $cond$i$i = ($R$1$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $804 = 1 << $800;
             $805 = $804 ^ -1;
             $806 = HEAP32[((263152 + 4|0))>>2]|0;
             $807 = $806 & $805;
             HEAP32[((263152 + 4|0))>>2] = $807;
             break L353;
            } else {
             $808 = HEAP32[((263152 + 16|0))>>2]|0;
             $809 = ($772>>>0)<($808>>>0);
             if ($809) {
              _abort();
              // unreachable;
             }
             $810 = (($772) + 16|0);
             $811 = HEAP32[$810>>2]|0;
             $812 = ($811|0)==($721|0);
             if ($812) {
              HEAP32[$810>>2] = $R$1$i$i;
             } else {
              $813 = (($772) + 20|0);
              HEAP32[$813>>2] = $R$1$i$i;
             }
             $814 = ($R$1$i$i|0)==(0|0);
             if ($814) {
              break L353;
             }
            }
           } while(0);
           $815 = HEAP32[((263152 + 16|0))>>2]|0;
           $816 = ($R$1$i$i>>>0)<($815>>>0);
           if ($816) {
            _abort();
            // unreachable;
           }
           $817 = (($R$1$i$i) + 24|0);
           HEAP32[$817>>2] = $772;
           $$sum3132$i$i = $720 | 16;
           $$sum109$i = (($$sum3132$i$i) + ($tsize$244$i))|0;
           $818 = (($tbase$245$i) + ($$sum109$i)|0);
           $819 = HEAP32[$818>>2]|0;
           $820 = ($819|0)==(0|0);
           do {
            if (!($820)) {
             $821 = ($819>>>0)<($815>>>0);
             if ($821) {
              _abort();
              // unreachable;
             } else {
              $822 = (($R$1$i$i) + 16|0);
              HEAP32[$822>>2] = $819;
              $823 = (($819) + 24|0);
              HEAP32[$823>>2] = $R$1$i$i;
              break;
             }
            }
           } while(0);
           $$sum110$i = (($$sum2$i21$i) + ($$sum3132$i$i))|0;
           $824 = (($tbase$245$i) + ($$sum110$i)|0);
           $825 = HEAP32[$824>>2]|0;
           $826 = ($825|0)==(0|0);
           if ($826) {
            break;
           }
           $827 = HEAP32[((263152 + 16|0))>>2]|0;
           $828 = ($825>>>0)<($827>>>0);
           if ($828) {
            _abort();
            // unreachable;
           } else {
            $829 = (($R$1$i$i) + 20|0);
            HEAP32[$829>>2] = $825;
            $830 = (($825) + 24|0);
            HEAP32[$830>>2] = $R$1$i$i;
            break;
           }
          }
         } while(0);
         $$sum9$i$i = $745 | $720;
         $$sum111$i = (($$sum9$i$i) + ($tsize$244$i))|0;
         $831 = (($tbase$245$i) + ($$sum111$i)|0);
         $832 = (($745) + ($726))|0;
         $oldfirst$0$i$i = $831;$qsize$0$i$i = $832;
        } else {
         $oldfirst$0$i$i = $721;$qsize$0$i$i = $726;
        }
        $833 = (($oldfirst$0$i$i) + 4|0);
        $834 = HEAP32[$833>>2]|0;
        $835 = $834 & -2;
        HEAP32[$833>>2] = $835;
        $836 = $qsize$0$i$i | 1;
        $$sum10$i$i = (($$sum$i19$i) + 4)|0;
        $837 = (($tbase$245$i) + ($$sum10$i$i)|0);
        HEAP32[$837>>2] = $836;
        $$sum11$i22$i = (($qsize$0$i$i) + ($$sum$i19$i))|0;
        $838 = (($tbase$245$i) + ($$sum11$i22$i)|0);
        HEAP32[$838>>2] = $qsize$0$i$i;
        $839 = $qsize$0$i$i >>> 3;
        $840 = ($qsize$0$i$i>>>0)<(256);
        if ($840) {
         $841 = $839 << 1;
         $842 = ((263152 + ($841<<2)|0) + 40|0);
         $843 = HEAP32[263152>>2]|0;
         $844 = 1 << $839;
         $845 = $843 & $844;
         $846 = ($845|0)==(0);
         do {
          if ($846) {
           $847 = $843 | $844;
           HEAP32[263152>>2] = $847;
           $$sum26$pre$i$i = (($841) + 2)|0;
           $$pre$i23$i = ((263152 + ($$sum26$pre$i$i<<2)|0) + 40|0);
           $$pre$phi$i24$iZ2D = $$pre$i23$i;$F4$0$i$i = $842;
          } else {
           $$sum29$i$i = (($841) + 2)|0;
           $848 = ((263152 + ($$sum29$i$i<<2)|0) + 40|0);
           $849 = HEAP32[$848>>2]|0;
           $850 = HEAP32[((263152 + 16|0))>>2]|0;
           $851 = ($849>>>0)<($850>>>0);
           if (!($851)) {
            $$pre$phi$i24$iZ2D = $848;$F4$0$i$i = $849;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i24$iZ2D>>2] = $725;
         $852 = (($F4$0$i$i) + 12|0);
         HEAP32[$852>>2] = $725;
         $$sum27$i$i = (($$sum$i19$i) + 8)|0;
         $853 = (($tbase$245$i) + ($$sum27$i$i)|0);
         HEAP32[$853>>2] = $F4$0$i$i;
         $$sum28$i$i = (($$sum$i19$i) + 12)|0;
         $854 = (($tbase$245$i) + ($$sum28$i$i)|0);
         HEAP32[$854>>2] = $842;
         break;
        }
        $855 = $qsize$0$i$i >>> 8;
        $856 = ($855|0)==(0);
        do {
         if ($856) {
          $I7$0$i$i = 0;
         } else {
          $857 = ($qsize$0$i$i>>>0)>(16777215);
          if ($857) {
           $I7$0$i$i = 31;
           break;
          }
          $858 = (($855) + 1048320)|0;
          $859 = $858 >>> 16;
          $860 = $859 & 8;
          $861 = $855 << $860;
          $862 = (($861) + 520192)|0;
          $863 = $862 >>> 16;
          $864 = $863 & 4;
          $865 = $864 | $860;
          $866 = $861 << $864;
          $867 = (($866) + 245760)|0;
          $868 = $867 >>> 16;
          $869 = $868 & 2;
          $870 = $865 | $869;
          $871 = (14 - ($870))|0;
          $872 = $866 << $869;
          $873 = $872 >>> 15;
          $874 = (($871) + ($873))|0;
          $875 = $874 << 1;
          $876 = (($874) + 7)|0;
          $877 = $qsize$0$i$i >>> $876;
          $878 = $877 & 1;
          $879 = $878 | $875;
          $I7$0$i$i = $879;
         }
        } while(0);
        $880 = ((263152 + ($I7$0$i$i<<2)|0) + 304|0);
        $$sum12$i$i = (($$sum$i19$i) + 28)|0;
        $881 = (($tbase$245$i) + ($$sum12$i$i)|0);
        HEAP32[$881>>2] = $I7$0$i$i;
        $$sum13$i$i = (($$sum$i19$i) + 16)|0;
        $882 = (($tbase$245$i) + ($$sum13$i$i)|0);
        $$sum14$i$i = (($$sum$i19$i) + 20)|0;
        $883 = (($tbase$245$i) + ($$sum14$i$i)|0);
        HEAP32[$883>>2] = 0;
        HEAP32[$882>>2] = 0;
        $884 = HEAP32[((263152 + 4|0))>>2]|0;
        $885 = 1 << $I7$0$i$i;
        $886 = $884 & $885;
        $887 = ($886|0)==(0);
        if ($887) {
         $888 = $884 | $885;
         HEAP32[((263152 + 4|0))>>2] = $888;
         HEAP32[$880>>2] = $725;
         $$sum15$i$i = (($$sum$i19$i) + 24)|0;
         $889 = (($tbase$245$i) + ($$sum15$i$i)|0);
         HEAP32[$889>>2] = $880;
         $$sum16$i$i = (($$sum$i19$i) + 12)|0;
         $890 = (($tbase$245$i) + ($$sum16$i$i)|0);
         HEAP32[$890>>2] = $725;
         $$sum17$i$i = (($$sum$i19$i) + 8)|0;
         $891 = (($tbase$245$i) + ($$sum17$i$i)|0);
         HEAP32[$891>>2] = $725;
         break;
        }
        $892 = HEAP32[$880>>2]|0;
        $893 = ($I7$0$i$i|0)==(31);
        if ($893) {
         $901 = 0;
        } else {
         $894 = $I7$0$i$i >>> 1;
         $895 = (25 - ($894))|0;
         $901 = $895;
        }
        $896 = (($892) + 4|0);
        $897 = HEAP32[$896>>2]|0;
        $898 = $897 & -8;
        $899 = ($898|0)==($qsize$0$i$i|0);
        L442: do {
         if ($899) {
          $T$0$lcssa$i26$i = $892;
         } else {
          $900 = $qsize$0$i$i << $901;
          $K8$053$i$i = $900;$T$052$i$i = $892;
          while(1) {
           $908 = $K8$053$i$i >>> 31;
           $909 = ((($T$052$i$i) + ($908<<2)|0) + 16|0);
           $904 = HEAP32[$909>>2]|0;
           $910 = ($904|0)==(0|0);
           if ($910) {
            break;
           }
           $902 = $K8$053$i$i << 1;
           $903 = (($904) + 4|0);
           $905 = HEAP32[$903>>2]|0;
           $906 = $905 & -8;
           $907 = ($906|0)==($qsize$0$i$i|0);
           if ($907) {
            $T$0$lcssa$i26$i = $904;
            break L442;
           } else {
            $K8$053$i$i = $902;$T$052$i$i = $904;
           }
          }
          $911 = HEAP32[((263152 + 16|0))>>2]|0;
          $912 = ($909>>>0)<($911>>>0);
          if ($912) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$909>>2] = $725;
           $$sum23$i$i = (($$sum$i19$i) + 24)|0;
           $913 = (($tbase$245$i) + ($$sum23$i$i)|0);
           HEAP32[$913>>2] = $T$052$i$i;
           $$sum24$i$i = (($$sum$i19$i) + 12)|0;
           $914 = (($tbase$245$i) + ($$sum24$i$i)|0);
           HEAP32[$914>>2] = $725;
           $$sum25$i$i = (($$sum$i19$i) + 8)|0;
           $915 = (($tbase$245$i) + ($$sum25$i$i)|0);
           HEAP32[$915>>2] = $725;
           break L345;
          }
         }
        } while(0);
        $916 = (($T$0$lcssa$i26$i) + 8|0);
        $917 = HEAP32[$916>>2]|0;
        $918 = HEAP32[((263152 + 16|0))>>2]|0;
        $919 = ($T$0$lcssa$i26$i>>>0)>=($918>>>0);
        $920 = ($917>>>0)>=($918>>>0);
        $or$cond$i27$i = $919 & $920;
        if ($or$cond$i27$i) {
         $921 = (($917) + 12|0);
         HEAP32[$921>>2] = $725;
         HEAP32[$916>>2] = $725;
         $$sum20$i$i = (($$sum$i19$i) + 8)|0;
         $922 = (($tbase$245$i) + ($$sum20$i$i)|0);
         HEAP32[$922>>2] = $917;
         $$sum21$i$i = (($$sum$i19$i) + 12)|0;
         $923 = (($tbase$245$i) + ($$sum21$i$i)|0);
         HEAP32[$923>>2] = $T$0$lcssa$i26$i;
         $$sum22$i$i = (($$sum$i19$i) + 24)|0;
         $924 = (($tbase$245$i) + ($$sum22$i$i)|0);
         HEAP32[$924>>2] = 0;
         break;
        } else {
         _abort();
         // unreachable;
        }
       }
      } while(0);
      $$sum1819$i$i = $713 | 8;
      $925 = (($tbase$245$i) + ($$sum1819$i$i)|0);
      $mem$0 = $925;
      STACKTOP = sp;return ($mem$0|0);
     }
    }
    $sp$0$i$i$i = ((263152 + 448|0));
    while(1) {
     $926 = HEAP32[$sp$0$i$i$i>>2]|0;
     $927 = ($926>>>0)>($636>>>0);
     if (!($927)) {
      $928 = (($sp$0$i$i$i) + 4|0);
      $929 = HEAP32[$928>>2]|0;
      $930 = (($926) + ($929)|0);
      $931 = ($930>>>0)>($636>>>0);
      if ($931) {
       break;
      }
     }
     $932 = (($sp$0$i$i$i) + 8|0);
     $933 = HEAP32[$932>>2]|0;
     $sp$0$i$i$i = $933;
    }
    $$sum$i13$i = (($929) + -47)|0;
    $$sum1$i14$i = (($929) + -39)|0;
    $934 = (($926) + ($$sum1$i14$i)|0);
    $935 = $934;
    $936 = $935 & 7;
    $937 = ($936|0)==(0);
    if ($937) {
     $940 = 0;
    } else {
     $938 = (0 - ($935))|0;
     $939 = $938 & 7;
     $940 = $939;
    }
    $$sum2$i15$i = (($$sum$i13$i) + ($940))|0;
    $941 = (($926) + ($$sum2$i15$i)|0);
    $942 = (($636) + 16|0);
    $943 = ($941>>>0)<($942>>>0);
    $944 = $943 ? $636 : $941;
    $945 = (($944) + 8|0);
    $946 = (($tsize$244$i) + -40)|0;
    $947 = (($tbase$245$i) + 8|0);
    $948 = $947;
    $949 = $948 & 7;
    $950 = ($949|0)==(0);
    if ($950) {
     $954 = 0;
    } else {
     $951 = (0 - ($948))|0;
     $952 = $951 & 7;
     $954 = $952;
    }
    $953 = (($tbase$245$i) + ($954)|0);
    $955 = (($946) - ($954))|0;
    HEAP32[((263152 + 24|0))>>2] = $953;
    HEAP32[((263152 + 12|0))>>2] = $955;
    $956 = $955 | 1;
    $$sum$i$i$i = (($954) + 4)|0;
    $957 = (($tbase$245$i) + ($$sum$i$i$i)|0);
    HEAP32[$957>>2] = $956;
    $$sum2$i$i$i = (($tsize$244$i) + -36)|0;
    $958 = (($tbase$245$i) + ($$sum2$i$i$i)|0);
    HEAP32[$958>>2] = 40;
    $959 = HEAP32[((263624 + 16|0))>>2]|0;
    HEAP32[((263152 + 28|0))>>2] = $959;
    $960 = (($944) + 4|0);
    HEAP32[$960>>2] = 27;
    ;HEAP32[$945+0>>2]=HEAP32[((263152 + 448|0))+0>>2]|0;HEAP32[$945+4>>2]=HEAP32[((263152 + 448|0))+4>>2]|0;HEAP32[$945+8>>2]=HEAP32[((263152 + 448|0))+8>>2]|0;HEAP32[$945+12>>2]=HEAP32[((263152 + 448|0))+12>>2]|0;
    HEAP32[((263152 + 448|0))>>2] = $tbase$245$i;
    HEAP32[((263152 + 452|0))>>2] = $tsize$244$i;
    HEAP32[((263152 + 460|0))>>2] = 0;
    HEAP32[((263152 + 456|0))>>2] = $945;
    $961 = (($944) + 28|0);
    HEAP32[$961>>2] = 7;
    $962 = (($944) + 32|0);
    $963 = ($962>>>0)<($930>>>0);
    if ($963) {
     $965 = $961;
     while(1) {
      $964 = (($965) + 4|0);
      HEAP32[$964>>2] = 7;
      $966 = (($965) + 8|0);
      $967 = ($966>>>0)<($930>>>0);
      if ($967) {
       $965 = $964;
      } else {
       break;
      }
     }
    }
    $968 = ($944|0)==($636|0);
    if (!($968)) {
     $969 = $944;
     $970 = $636;
     $971 = (($969) - ($970))|0;
     $972 = (($636) + ($971)|0);
     $$sum3$i$i = (($971) + 4)|0;
     $973 = (($636) + ($$sum3$i$i)|0);
     $974 = HEAP32[$973>>2]|0;
     $975 = $974 & -2;
     HEAP32[$973>>2] = $975;
     $976 = $971 | 1;
     $977 = (($636) + 4|0);
     HEAP32[$977>>2] = $976;
     HEAP32[$972>>2] = $971;
     $978 = $971 >>> 3;
     $979 = ($971>>>0)<(256);
     if ($979) {
      $980 = $978 << 1;
      $981 = ((263152 + ($980<<2)|0) + 40|0);
      $982 = HEAP32[263152>>2]|0;
      $983 = 1 << $978;
      $984 = $982 & $983;
      $985 = ($984|0)==(0);
      do {
       if ($985) {
        $986 = $982 | $983;
        HEAP32[263152>>2] = $986;
        $$sum10$pre$i$i = (($980) + 2)|0;
        $$pre$i$i = ((263152 + ($$sum10$pre$i$i<<2)|0) + 40|0);
        $$pre$phi$i$iZ2D = $$pre$i$i;$F$0$i$i = $981;
       } else {
        $$sum11$i$i = (($980) + 2)|0;
        $987 = ((263152 + ($$sum11$i$i<<2)|0) + 40|0);
        $988 = HEAP32[$987>>2]|0;
        $989 = HEAP32[((263152 + 16|0))>>2]|0;
        $990 = ($988>>>0)<($989>>>0);
        if (!($990)) {
         $$pre$phi$i$iZ2D = $987;$F$0$i$i = $988;
         break;
        }
        _abort();
        // unreachable;
       }
      } while(0);
      HEAP32[$$pre$phi$i$iZ2D>>2] = $636;
      $991 = (($F$0$i$i) + 12|0);
      HEAP32[$991>>2] = $636;
      $992 = (($636) + 8|0);
      HEAP32[$992>>2] = $F$0$i$i;
      $993 = (($636) + 12|0);
      HEAP32[$993>>2] = $981;
      break;
     }
     $994 = $971 >>> 8;
     $995 = ($994|0)==(0);
     if ($995) {
      $I1$0$i$i = 0;
     } else {
      $996 = ($971>>>0)>(16777215);
      if ($996) {
       $I1$0$i$i = 31;
      } else {
       $997 = (($994) + 1048320)|0;
       $998 = $997 >>> 16;
       $999 = $998 & 8;
       $1000 = $994 << $999;
       $1001 = (($1000) + 520192)|0;
       $1002 = $1001 >>> 16;
       $1003 = $1002 & 4;
       $1004 = $1003 | $999;
       $1005 = $1000 << $1003;
       $1006 = (($1005) + 245760)|0;
       $1007 = $1006 >>> 16;
       $1008 = $1007 & 2;
       $1009 = $1004 | $1008;
       $1010 = (14 - ($1009))|0;
       $1011 = $1005 << $1008;
       $1012 = $1011 >>> 15;
       $1013 = (($1010) + ($1012))|0;
       $1014 = $1013 << 1;
       $1015 = (($1013) + 7)|0;
       $1016 = $971 >>> $1015;
       $1017 = $1016 & 1;
       $1018 = $1017 | $1014;
       $I1$0$i$i = $1018;
      }
     }
     $1019 = ((263152 + ($I1$0$i$i<<2)|0) + 304|0);
     $1020 = (($636) + 28|0);
     $I1$0$c$i$i = $I1$0$i$i;
     HEAP32[$1020>>2] = $I1$0$c$i$i;
     $1021 = (($636) + 20|0);
     HEAP32[$1021>>2] = 0;
     $1022 = (($636) + 16|0);
     HEAP32[$1022>>2] = 0;
     $1023 = HEAP32[((263152 + 4|0))>>2]|0;
     $1024 = 1 << $I1$0$i$i;
     $1025 = $1023 & $1024;
     $1026 = ($1025|0)==(0);
     if ($1026) {
      $1027 = $1023 | $1024;
      HEAP32[((263152 + 4|0))>>2] = $1027;
      HEAP32[$1019>>2] = $636;
      $1028 = (($636) + 24|0);
      HEAP32[$1028>>2] = $1019;
      $1029 = (($636) + 12|0);
      HEAP32[$1029>>2] = $636;
      $1030 = (($636) + 8|0);
      HEAP32[$1030>>2] = $636;
      break;
     }
     $1031 = HEAP32[$1019>>2]|0;
     $1032 = ($I1$0$i$i|0)==(31);
     if ($1032) {
      $1040 = 0;
     } else {
      $1033 = $I1$0$i$i >>> 1;
      $1034 = (25 - ($1033))|0;
      $1040 = $1034;
     }
     $1035 = (($1031) + 4|0);
     $1036 = HEAP32[$1035>>2]|0;
     $1037 = $1036 & -8;
     $1038 = ($1037|0)==($971|0);
     L493: do {
      if ($1038) {
       $T$0$lcssa$i$i = $1031;
      } else {
       $1039 = $971 << $1040;
       $K2$015$i$i = $1039;$T$014$i$i = $1031;
       while(1) {
        $1047 = $K2$015$i$i >>> 31;
        $1048 = ((($T$014$i$i) + ($1047<<2)|0) + 16|0);
        $1043 = HEAP32[$1048>>2]|0;
        $1049 = ($1043|0)==(0|0);
        if ($1049) {
         break;
        }
        $1041 = $K2$015$i$i << 1;
        $1042 = (($1043) + 4|0);
        $1044 = HEAP32[$1042>>2]|0;
        $1045 = $1044 & -8;
        $1046 = ($1045|0)==($971|0);
        if ($1046) {
         $T$0$lcssa$i$i = $1043;
         break L493;
        } else {
         $K2$015$i$i = $1041;$T$014$i$i = $1043;
        }
       }
       $1050 = HEAP32[((263152 + 16|0))>>2]|0;
       $1051 = ($1048>>>0)<($1050>>>0);
       if ($1051) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$1048>>2] = $636;
        $1052 = (($636) + 24|0);
        HEAP32[$1052>>2] = $T$014$i$i;
        $1053 = (($636) + 12|0);
        HEAP32[$1053>>2] = $636;
        $1054 = (($636) + 8|0);
        HEAP32[$1054>>2] = $636;
        break L308;
       }
      }
     } while(0);
     $1055 = (($T$0$lcssa$i$i) + 8|0);
     $1056 = HEAP32[$1055>>2]|0;
     $1057 = HEAP32[((263152 + 16|0))>>2]|0;
     $1058 = ($T$0$lcssa$i$i>>>0)>=($1057>>>0);
     $1059 = ($1056>>>0)>=($1057>>>0);
     $or$cond$i$i = $1058 & $1059;
     if ($or$cond$i$i) {
      $1060 = (($1056) + 12|0);
      HEAP32[$1060>>2] = $636;
      HEAP32[$1055>>2] = $636;
      $1061 = (($636) + 8|0);
      HEAP32[$1061>>2] = $1056;
      $1062 = (($636) + 12|0);
      HEAP32[$1062>>2] = $T$0$lcssa$i$i;
      $1063 = (($636) + 24|0);
      HEAP32[$1063>>2] = 0;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   }
  } while(0);
  $1064 = HEAP32[((263152 + 12|0))>>2]|0;
  $1065 = ($1064>>>0)>($nb$0>>>0);
  if ($1065) {
   $1066 = (($1064) - ($nb$0))|0;
   HEAP32[((263152 + 12|0))>>2] = $1066;
   $1067 = HEAP32[((263152 + 24|0))>>2]|0;
   $1068 = (($1067) + ($nb$0)|0);
   HEAP32[((263152 + 24|0))>>2] = $1068;
   $1069 = $1066 | 1;
   $$sum$i32 = (($nb$0) + 4)|0;
   $1070 = (($1067) + ($$sum$i32)|0);
   HEAP32[$1070>>2] = $1069;
   $1071 = $nb$0 | 3;
   $1072 = (($1067) + 4|0);
   HEAP32[$1072>>2] = $1071;
   $1073 = (($1067) + 8|0);
   $mem$0 = $1073;
   STACKTOP = sp;return ($mem$0|0);
  }
 }
 $1074 = (___errno_location()|0);
 HEAP32[$1074>>2] = 12;
 $mem$0 = 0;
 STACKTOP = sp;return ($mem$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$pre = 0, $$pre$phi66Z2D = 0, $$pre$phi68Z2D = 0, $$pre$phiZ2D = 0, $$pre65 = 0, $$pre67 = 0, $$sum = 0, $$sum16$pre = 0, $$sum17 = 0, $$sum18 = 0, $$sum19 = 0, $$sum2 = 0, $$sum20 = 0, $$sum2324 = 0, $$sum25 = 0, $$sum26 = 0, $$sum28 = 0, $$sum29 = 0, $$sum3 = 0, $$sum30 = 0;
 var $$sum31 = 0, $$sum32 = 0, $$sum33 = 0, $$sum34 = 0, $$sum35 = 0, $$sum36 = 0, $$sum37 = 0, $$sum5 = 0, $$sum67 = 0, $$sum8 = 0, $$sum9 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0;
 var $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0;
 var $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0;
 var $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0;
 var $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0;
 var $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0;
 var $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0;
 var $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0;
 var $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0;
 var $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0;
 var $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0;
 var $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0;
 var $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0;
 var $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0;
 var $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0;
 var $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0;
 var $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F16$0 = 0, $I18$0 = 0, $I18$0$c = 0, $K19$058 = 0, $R$0 = 0, $R$1 = 0, $R7$0 = 0;
 var $R7$1 = 0, $RP$0 = 0, $RP9$0 = 0, $T$0$lcssa = 0, $T$057 = 0, $cond = 0, $cond54 = 0, $or$cond = 0, $p$0 = 0, $psize$0 = 0, $psize$1 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  STACKTOP = sp;return;
 }
 $1 = (($mem) + -8|0);
 $2 = HEAP32[((263152 + 16|0))>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = (($mem) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & 3;
 $7 = ($6|0)==(1);
 if ($7) {
  _abort();
  // unreachable;
 }
 $8 = $5 & -8;
 $$sum = (($8) + -8)|0;
 $9 = (($mem) + ($$sum)|0);
 $10 = $5 & 1;
 $11 = ($10|0)==(0);
 do {
  if ($11) {
   $12 = HEAP32[$1>>2]|0;
   $13 = ($6|0)==(0);
   if ($13) {
    STACKTOP = sp;return;
   }
   $$sum2 = (-8 - ($12))|0;
   $14 = (($mem) + ($$sum2)|0);
   $15 = (($12) + ($8))|0;
   $16 = ($14>>>0)<($2>>>0);
   if ($16) {
    _abort();
    // unreachable;
   }
   $17 = HEAP32[((263152 + 20|0))>>2]|0;
   $18 = ($14|0)==($17|0);
   if ($18) {
    $$sum3 = (($8) + -4)|0;
    $103 = (($mem) + ($$sum3)|0);
    $104 = HEAP32[$103>>2]|0;
    $105 = $104 & 3;
    $106 = ($105|0)==(3);
    if (!($106)) {
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    HEAP32[((263152 + 8|0))>>2] = $15;
    $107 = $104 & -2;
    HEAP32[$103>>2] = $107;
    $108 = $15 | 1;
    $$sum26 = (($$sum2) + 4)|0;
    $109 = (($mem) + ($$sum26)|0);
    HEAP32[$109>>2] = $108;
    HEAP32[$9>>2] = $15;
    STACKTOP = sp;return;
   }
   $19 = $12 >>> 3;
   $20 = ($12>>>0)<(256);
   if ($20) {
    $$sum36 = (($$sum2) + 8)|0;
    $21 = (($mem) + ($$sum36)|0);
    $22 = HEAP32[$21>>2]|0;
    $$sum37 = (($$sum2) + 12)|0;
    $23 = (($mem) + ($$sum37)|0);
    $24 = HEAP32[$23>>2]|0;
    $25 = $19 << 1;
    $26 = ((263152 + ($25<<2)|0) + 40|0);
    $27 = ($22|0)==($26|0);
    if (!($27)) {
     $28 = ($22>>>0)<($2>>>0);
     if ($28) {
      _abort();
      // unreachable;
     }
     $29 = (($22) + 12|0);
     $30 = HEAP32[$29>>2]|0;
     $31 = ($30|0)==($14|0);
     if (!($31)) {
      _abort();
      // unreachable;
     }
    }
    $32 = ($24|0)==($22|0);
    if ($32) {
     $33 = 1 << $19;
     $34 = $33 ^ -1;
     $35 = HEAP32[263152>>2]|0;
     $36 = $35 & $34;
     HEAP32[263152>>2] = $36;
     $p$0 = $14;$psize$0 = $15;
     break;
    }
    $37 = ($24|0)==($26|0);
    if ($37) {
     $$pre67 = (($24) + 8|0);
     $$pre$phi68Z2D = $$pre67;
    } else {
     $38 = ($24>>>0)<($2>>>0);
     if ($38) {
      _abort();
      // unreachable;
     }
     $39 = (($24) + 8|0);
     $40 = HEAP32[$39>>2]|0;
     $41 = ($40|0)==($14|0);
     if ($41) {
      $$pre$phi68Z2D = $39;
     } else {
      _abort();
      // unreachable;
     }
    }
    $42 = (($22) + 12|0);
    HEAP32[$42>>2] = $24;
    HEAP32[$$pre$phi68Z2D>>2] = $22;
    $p$0 = $14;$psize$0 = $15;
    break;
   }
   $$sum28 = (($$sum2) + 24)|0;
   $43 = (($mem) + ($$sum28)|0);
   $44 = HEAP32[$43>>2]|0;
   $$sum29 = (($$sum2) + 12)|0;
   $45 = (($mem) + ($$sum29)|0);
   $46 = HEAP32[$45>>2]|0;
   $47 = ($46|0)==($14|0);
   do {
    if ($47) {
     $$sum31 = (($$sum2) + 20)|0;
     $57 = (($mem) + ($$sum31)|0);
     $58 = HEAP32[$57>>2]|0;
     $59 = ($58|0)==(0|0);
     if ($59) {
      $$sum30 = (($$sum2) + 16)|0;
      $60 = (($mem) + ($$sum30)|0);
      $61 = HEAP32[$60>>2]|0;
      $62 = ($61|0)==(0|0);
      if ($62) {
       $R$1 = 0;
       break;
      } else {
       $R$0 = $61;$RP$0 = $60;
      }
     } else {
      $R$0 = $58;$RP$0 = $57;
     }
     while(1) {
      $63 = (($R$0) + 20|0);
      $64 = HEAP32[$63>>2]|0;
      $65 = ($64|0)==(0|0);
      if (!($65)) {
       $R$0 = $64;$RP$0 = $63;
       continue;
      }
      $66 = (($R$0) + 16|0);
      $67 = HEAP32[$66>>2]|0;
      $68 = ($67|0)==(0|0);
      if ($68) {
       break;
      } else {
       $R$0 = $67;$RP$0 = $66;
      }
     }
     $69 = ($RP$0>>>0)<($2>>>0);
     if ($69) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$0>>2] = 0;
      $R$1 = $R$0;
      break;
     }
    } else {
     $$sum35 = (($$sum2) + 8)|0;
     $48 = (($mem) + ($$sum35)|0);
     $49 = HEAP32[$48>>2]|0;
     $50 = ($49>>>0)<($2>>>0);
     if ($50) {
      _abort();
      // unreachable;
     }
     $51 = (($49) + 12|0);
     $52 = HEAP32[$51>>2]|0;
     $53 = ($52|0)==($14|0);
     if (!($53)) {
      _abort();
      // unreachable;
     }
     $54 = (($46) + 8|0);
     $55 = HEAP32[$54>>2]|0;
     $56 = ($55|0)==($14|0);
     if ($56) {
      HEAP32[$51>>2] = $46;
      HEAP32[$54>>2] = $49;
      $R$1 = $46;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $70 = ($44|0)==(0|0);
   if ($70) {
    $p$0 = $14;$psize$0 = $15;
   } else {
    $$sum32 = (($$sum2) + 28)|0;
    $71 = (($mem) + ($$sum32)|0);
    $72 = HEAP32[$71>>2]|0;
    $73 = ((263152 + ($72<<2)|0) + 304|0);
    $74 = HEAP32[$73>>2]|0;
    $75 = ($14|0)==($74|0);
    if ($75) {
     HEAP32[$73>>2] = $R$1;
     $cond = ($R$1|0)==(0|0);
     if ($cond) {
      $76 = 1 << $72;
      $77 = $76 ^ -1;
      $78 = HEAP32[((263152 + 4|0))>>2]|0;
      $79 = $78 & $77;
      HEAP32[((263152 + 4|0))>>2] = $79;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    } else {
     $80 = HEAP32[((263152 + 16|0))>>2]|0;
     $81 = ($44>>>0)<($80>>>0);
     if ($81) {
      _abort();
      // unreachable;
     }
     $82 = (($44) + 16|0);
     $83 = HEAP32[$82>>2]|0;
     $84 = ($83|0)==($14|0);
     if ($84) {
      HEAP32[$82>>2] = $R$1;
     } else {
      $85 = (($44) + 20|0);
      HEAP32[$85>>2] = $R$1;
     }
     $86 = ($R$1|0)==(0|0);
     if ($86) {
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
    $87 = HEAP32[((263152 + 16|0))>>2]|0;
    $88 = ($R$1>>>0)<($87>>>0);
    if ($88) {
     _abort();
     // unreachable;
    }
    $89 = (($R$1) + 24|0);
    HEAP32[$89>>2] = $44;
    $$sum33 = (($$sum2) + 16)|0;
    $90 = (($mem) + ($$sum33)|0);
    $91 = HEAP32[$90>>2]|0;
    $92 = ($91|0)==(0|0);
    do {
     if (!($92)) {
      $93 = ($91>>>0)<($87>>>0);
      if ($93) {
       _abort();
       // unreachable;
      } else {
       $94 = (($R$1) + 16|0);
       HEAP32[$94>>2] = $91;
       $95 = (($91) + 24|0);
       HEAP32[$95>>2] = $R$1;
       break;
      }
     }
    } while(0);
    $$sum34 = (($$sum2) + 20)|0;
    $96 = (($mem) + ($$sum34)|0);
    $97 = HEAP32[$96>>2]|0;
    $98 = ($97|0)==(0|0);
    if ($98) {
     $p$0 = $14;$psize$0 = $15;
    } else {
     $99 = HEAP32[((263152 + 16|0))>>2]|0;
     $100 = ($97>>>0)<($99>>>0);
     if ($100) {
      _abort();
      // unreachable;
     } else {
      $101 = (($R$1) + 20|0);
      HEAP32[$101>>2] = $97;
      $102 = (($97) + 24|0);
      HEAP32[$102>>2] = $R$1;
      $p$0 = $14;$psize$0 = $15;
      break;
     }
    }
   }
  } else {
   $p$0 = $1;$psize$0 = $8;
  }
 } while(0);
 $110 = ($p$0>>>0)<($9>>>0);
 if (!($110)) {
  _abort();
  // unreachable;
 }
 $$sum25 = (($8) + -4)|0;
 $111 = (($mem) + ($$sum25)|0);
 $112 = HEAP32[$111>>2]|0;
 $113 = $112 & 1;
 $114 = ($113|0)==(0);
 if ($114) {
  _abort();
  // unreachable;
 }
 $115 = $112 & 2;
 $116 = ($115|0)==(0);
 if ($116) {
  $117 = HEAP32[((263152 + 24|0))>>2]|0;
  $118 = ($9|0)==($117|0);
  if ($118) {
   $119 = HEAP32[((263152 + 12|0))>>2]|0;
   $120 = (($119) + ($psize$0))|0;
   HEAP32[((263152 + 12|0))>>2] = $120;
   HEAP32[((263152 + 24|0))>>2] = $p$0;
   $121 = $120 | 1;
   $122 = (($p$0) + 4|0);
   HEAP32[$122>>2] = $121;
   $123 = HEAP32[((263152 + 20|0))>>2]|0;
   $124 = ($p$0|0)==($123|0);
   if (!($124)) {
    STACKTOP = sp;return;
   }
   HEAP32[((263152 + 20|0))>>2] = 0;
   HEAP32[((263152 + 8|0))>>2] = 0;
   STACKTOP = sp;return;
  }
  $125 = HEAP32[((263152 + 20|0))>>2]|0;
  $126 = ($9|0)==($125|0);
  if ($126) {
   $127 = HEAP32[((263152 + 8|0))>>2]|0;
   $128 = (($127) + ($psize$0))|0;
   HEAP32[((263152 + 8|0))>>2] = $128;
   HEAP32[((263152 + 20|0))>>2] = $p$0;
   $129 = $128 | 1;
   $130 = (($p$0) + 4|0);
   HEAP32[$130>>2] = $129;
   $131 = (($p$0) + ($128)|0);
   HEAP32[$131>>2] = $128;
   STACKTOP = sp;return;
  }
  $132 = $112 & -8;
  $133 = (($132) + ($psize$0))|0;
  $134 = $112 >>> 3;
  $135 = ($112>>>0)<(256);
  do {
   if ($135) {
    $136 = (($mem) + ($8)|0);
    $137 = HEAP32[$136>>2]|0;
    $$sum2324 = $8 | 4;
    $138 = (($mem) + ($$sum2324)|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = $134 << 1;
    $141 = ((263152 + ($140<<2)|0) + 40|0);
    $142 = ($137|0)==($141|0);
    if (!($142)) {
     $143 = HEAP32[((263152 + 16|0))>>2]|0;
     $144 = ($137>>>0)<($143>>>0);
     if ($144) {
      _abort();
      // unreachable;
     }
     $145 = (($137) + 12|0);
     $146 = HEAP32[$145>>2]|0;
     $147 = ($146|0)==($9|0);
     if (!($147)) {
      _abort();
      // unreachable;
     }
    }
    $148 = ($139|0)==($137|0);
    if ($148) {
     $149 = 1 << $134;
     $150 = $149 ^ -1;
     $151 = HEAP32[263152>>2]|0;
     $152 = $151 & $150;
     HEAP32[263152>>2] = $152;
     break;
    }
    $153 = ($139|0)==($141|0);
    if ($153) {
     $$pre65 = (($139) + 8|0);
     $$pre$phi66Z2D = $$pre65;
    } else {
     $154 = HEAP32[((263152 + 16|0))>>2]|0;
     $155 = ($139>>>0)<($154>>>0);
     if ($155) {
      _abort();
      // unreachable;
     }
     $156 = (($139) + 8|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = ($157|0)==($9|0);
     if ($158) {
      $$pre$phi66Z2D = $156;
     } else {
      _abort();
      // unreachable;
     }
    }
    $159 = (($137) + 12|0);
    HEAP32[$159>>2] = $139;
    HEAP32[$$pre$phi66Z2D>>2] = $137;
   } else {
    $$sum5 = (($8) + 16)|0;
    $160 = (($mem) + ($$sum5)|0);
    $161 = HEAP32[$160>>2]|0;
    $$sum67 = $8 | 4;
    $162 = (($mem) + ($$sum67)|0);
    $163 = HEAP32[$162>>2]|0;
    $164 = ($163|0)==($9|0);
    do {
     if ($164) {
      $$sum9 = (($8) + 12)|0;
      $175 = (($mem) + ($$sum9)|0);
      $176 = HEAP32[$175>>2]|0;
      $177 = ($176|0)==(0|0);
      if ($177) {
       $$sum8 = (($8) + 8)|0;
       $178 = (($mem) + ($$sum8)|0);
       $179 = HEAP32[$178>>2]|0;
       $180 = ($179|0)==(0|0);
       if ($180) {
        $R7$1 = 0;
        break;
       } else {
        $R7$0 = $179;$RP9$0 = $178;
       }
      } else {
       $R7$0 = $176;$RP9$0 = $175;
      }
      while(1) {
       $181 = (($R7$0) + 20|0);
       $182 = HEAP32[$181>>2]|0;
       $183 = ($182|0)==(0|0);
       if (!($183)) {
        $R7$0 = $182;$RP9$0 = $181;
        continue;
       }
       $184 = (($R7$0) + 16|0);
       $185 = HEAP32[$184>>2]|0;
       $186 = ($185|0)==(0|0);
       if ($186) {
        break;
       } else {
        $R7$0 = $185;$RP9$0 = $184;
       }
      }
      $187 = HEAP32[((263152 + 16|0))>>2]|0;
      $188 = ($RP9$0>>>0)<($187>>>0);
      if ($188) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$0>>2] = 0;
       $R7$1 = $R7$0;
       break;
      }
     } else {
      $165 = (($mem) + ($8)|0);
      $166 = HEAP32[$165>>2]|0;
      $167 = HEAP32[((263152 + 16|0))>>2]|0;
      $168 = ($166>>>0)<($167>>>0);
      if ($168) {
       _abort();
       // unreachable;
      }
      $169 = (($166) + 12|0);
      $170 = HEAP32[$169>>2]|0;
      $171 = ($170|0)==($9|0);
      if (!($171)) {
       _abort();
       // unreachable;
      }
      $172 = (($163) + 8|0);
      $173 = HEAP32[$172>>2]|0;
      $174 = ($173|0)==($9|0);
      if ($174) {
       HEAP32[$169>>2] = $163;
       HEAP32[$172>>2] = $166;
       $R7$1 = $163;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $189 = ($161|0)==(0|0);
    if (!($189)) {
     $$sum18 = (($8) + 20)|0;
     $190 = (($mem) + ($$sum18)|0);
     $191 = HEAP32[$190>>2]|0;
     $192 = ((263152 + ($191<<2)|0) + 304|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = ($9|0)==($193|0);
     if ($194) {
      HEAP32[$192>>2] = $R7$1;
      $cond54 = ($R7$1|0)==(0|0);
      if ($cond54) {
       $195 = 1 << $191;
       $196 = $195 ^ -1;
       $197 = HEAP32[((263152 + 4|0))>>2]|0;
       $198 = $197 & $196;
       HEAP32[((263152 + 4|0))>>2] = $198;
       break;
      }
     } else {
      $199 = HEAP32[((263152 + 16|0))>>2]|0;
      $200 = ($161>>>0)<($199>>>0);
      if ($200) {
       _abort();
       // unreachable;
      }
      $201 = (($161) + 16|0);
      $202 = HEAP32[$201>>2]|0;
      $203 = ($202|0)==($9|0);
      if ($203) {
       HEAP32[$201>>2] = $R7$1;
      } else {
       $204 = (($161) + 20|0);
       HEAP32[$204>>2] = $R7$1;
      }
      $205 = ($R7$1|0)==(0|0);
      if ($205) {
       break;
      }
     }
     $206 = HEAP32[((263152 + 16|0))>>2]|0;
     $207 = ($R7$1>>>0)<($206>>>0);
     if ($207) {
      _abort();
      // unreachable;
     }
     $208 = (($R7$1) + 24|0);
     HEAP32[$208>>2] = $161;
     $$sum19 = (($8) + 8)|0;
     $209 = (($mem) + ($$sum19)|0);
     $210 = HEAP32[$209>>2]|0;
     $211 = ($210|0)==(0|0);
     do {
      if (!($211)) {
       $212 = ($210>>>0)<($206>>>0);
       if ($212) {
        _abort();
        // unreachable;
       } else {
        $213 = (($R7$1) + 16|0);
        HEAP32[$213>>2] = $210;
        $214 = (($210) + 24|0);
        HEAP32[$214>>2] = $R7$1;
        break;
       }
      }
     } while(0);
     $$sum20 = (($8) + 12)|0;
     $215 = (($mem) + ($$sum20)|0);
     $216 = HEAP32[$215>>2]|0;
     $217 = ($216|0)==(0|0);
     if (!($217)) {
      $218 = HEAP32[((263152 + 16|0))>>2]|0;
      $219 = ($216>>>0)<($218>>>0);
      if ($219) {
       _abort();
       // unreachable;
      } else {
       $220 = (($R7$1) + 20|0);
       HEAP32[$220>>2] = $216;
       $221 = (($216) + 24|0);
       HEAP32[$221>>2] = $R7$1;
       break;
      }
     }
    }
   }
  } while(0);
  $222 = $133 | 1;
  $223 = (($p$0) + 4|0);
  HEAP32[$223>>2] = $222;
  $224 = (($p$0) + ($133)|0);
  HEAP32[$224>>2] = $133;
  $225 = HEAP32[((263152 + 20|0))>>2]|0;
  $226 = ($p$0|0)==($225|0);
  if ($226) {
   HEAP32[((263152 + 8|0))>>2] = $133;
   STACKTOP = sp;return;
  } else {
   $psize$1 = $133;
  }
 } else {
  $227 = $112 & -2;
  HEAP32[$111>>2] = $227;
  $228 = $psize$0 | 1;
  $229 = (($p$0) + 4|0);
  HEAP32[$229>>2] = $228;
  $230 = (($p$0) + ($psize$0)|0);
  HEAP32[$230>>2] = $psize$0;
  $psize$1 = $psize$0;
 }
 $231 = $psize$1 >>> 3;
 $232 = ($psize$1>>>0)<(256);
 if ($232) {
  $233 = $231 << 1;
  $234 = ((263152 + ($233<<2)|0) + 40|0);
  $235 = HEAP32[263152>>2]|0;
  $236 = 1 << $231;
  $237 = $235 & $236;
  $238 = ($237|0)==(0);
  if ($238) {
   $239 = $235 | $236;
   HEAP32[263152>>2] = $239;
   $$sum16$pre = (($233) + 2)|0;
   $$pre = ((263152 + ($$sum16$pre<<2)|0) + 40|0);
   $$pre$phiZ2D = $$pre;$F16$0 = $234;
  } else {
   $$sum17 = (($233) + 2)|0;
   $240 = ((263152 + ($$sum17<<2)|0) + 40|0);
   $241 = HEAP32[$240>>2]|0;
   $242 = HEAP32[((263152 + 16|0))>>2]|0;
   $243 = ($241>>>0)<($242>>>0);
   if ($243) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $240;$F16$0 = $241;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$0;
  $244 = (($F16$0) + 12|0);
  HEAP32[$244>>2] = $p$0;
  $245 = (($p$0) + 8|0);
  HEAP32[$245>>2] = $F16$0;
  $246 = (($p$0) + 12|0);
  HEAP32[$246>>2] = $234;
  STACKTOP = sp;return;
 }
 $247 = $psize$1 >>> 8;
 $248 = ($247|0)==(0);
 if ($248) {
  $I18$0 = 0;
 } else {
  $249 = ($psize$1>>>0)>(16777215);
  if ($249) {
   $I18$0 = 31;
  } else {
   $250 = (($247) + 1048320)|0;
   $251 = $250 >>> 16;
   $252 = $251 & 8;
   $253 = $247 << $252;
   $254 = (($253) + 520192)|0;
   $255 = $254 >>> 16;
   $256 = $255 & 4;
   $257 = $256 | $252;
   $258 = $253 << $256;
   $259 = (($258) + 245760)|0;
   $260 = $259 >>> 16;
   $261 = $260 & 2;
   $262 = $257 | $261;
   $263 = (14 - ($262))|0;
   $264 = $258 << $261;
   $265 = $264 >>> 15;
   $266 = (($263) + ($265))|0;
   $267 = $266 << 1;
   $268 = (($266) + 7)|0;
   $269 = $psize$1 >>> $268;
   $270 = $269 & 1;
   $271 = $270 | $267;
   $I18$0 = $271;
  }
 }
 $272 = ((263152 + ($I18$0<<2)|0) + 304|0);
 $273 = (($p$0) + 28|0);
 $I18$0$c = $I18$0;
 HEAP32[$273>>2] = $I18$0$c;
 $274 = (($p$0) + 20|0);
 HEAP32[$274>>2] = 0;
 $275 = (($p$0) + 16|0);
 HEAP32[$275>>2] = 0;
 $276 = HEAP32[((263152 + 4|0))>>2]|0;
 $277 = 1 << $I18$0;
 $278 = $276 & $277;
 $279 = ($278|0)==(0);
 L199: do {
  if ($279) {
   $280 = $276 | $277;
   HEAP32[((263152 + 4|0))>>2] = $280;
   HEAP32[$272>>2] = $p$0;
   $281 = (($p$0) + 24|0);
   HEAP32[$281>>2] = $272;
   $282 = (($p$0) + 12|0);
   HEAP32[$282>>2] = $p$0;
   $283 = (($p$0) + 8|0);
   HEAP32[$283>>2] = $p$0;
  } else {
   $284 = HEAP32[$272>>2]|0;
   $285 = ($I18$0|0)==(31);
   if ($285) {
    $293 = 0;
   } else {
    $286 = $I18$0 >>> 1;
    $287 = (25 - ($286))|0;
    $293 = $287;
   }
   $288 = (($284) + 4|0);
   $289 = HEAP32[$288>>2]|0;
   $290 = $289 & -8;
   $291 = ($290|0)==($psize$1|0);
   L205: do {
    if ($291) {
     $T$0$lcssa = $284;
    } else {
     $292 = $psize$1 << $293;
     $K19$058 = $292;$T$057 = $284;
     while(1) {
      $300 = $K19$058 >>> 31;
      $301 = ((($T$057) + ($300<<2)|0) + 16|0);
      $296 = HEAP32[$301>>2]|0;
      $302 = ($296|0)==(0|0);
      if ($302) {
       break;
      }
      $294 = $K19$058 << 1;
      $295 = (($296) + 4|0);
      $297 = HEAP32[$295>>2]|0;
      $298 = $297 & -8;
      $299 = ($298|0)==($psize$1|0);
      if ($299) {
       $T$0$lcssa = $296;
       break L205;
      } else {
       $K19$058 = $294;$T$057 = $296;
      }
     }
     $303 = HEAP32[((263152 + 16|0))>>2]|0;
     $304 = ($301>>>0)<($303>>>0);
     if ($304) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$301>>2] = $p$0;
      $305 = (($p$0) + 24|0);
      HEAP32[$305>>2] = $T$057;
      $306 = (($p$0) + 12|0);
      HEAP32[$306>>2] = $p$0;
      $307 = (($p$0) + 8|0);
      HEAP32[$307>>2] = $p$0;
      break L199;
     }
    }
   } while(0);
   $308 = (($T$0$lcssa) + 8|0);
   $309 = HEAP32[$308>>2]|0;
   $310 = HEAP32[((263152 + 16|0))>>2]|0;
   $311 = ($T$0$lcssa>>>0)>=($310>>>0);
   $312 = ($309>>>0)>=($310>>>0);
   $or$cond = $311 & $312;
   if ($or$cond) {
    $313 = (($309) + 12|0);
    HEAP32[$313>>2] = $p$0;
    HEAP32[$308>>2] = $p$0;
    $314 = (($p$0) + 8|0);
    HEAP32[$314>>2] = $309;
    $315 = (($p$0) + 12|0);
    HEAP32[$315>>2] = $T$0$lcssa;
    $316 = (($p$0) + 24|0);
    HEAP32[$316>>2] = 0;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $317 = HEAP32[((263152 + 32|0))>>2]|0;
 $318 = (($317) + -1)|0;
 HEAP32[((263152 + 32|0))>>2] = $318;
 $319 = ($318|0)==(0);
 if ($319) {
  $sp$0$in$i = ((263152 + 456|0));
 } else {
  STACKTOP = sp;return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $320 = ($sp$0$i|0)==(0|0);
  $321 = (($sp$0$i) + 8|0);
  if ($320) {
   break;
  } else {
   $sp$0$in$i = $321;
  }
 }
 HEAP32[((263152 + 32|0))>>2] = -1;
 STACKTOP = sp;return;
}
function _isdigit($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($c) + -48)|0;
 $1 = ($0>>>0)<(10);
 $2 = $1&1;
 STACKTOP = sp;return ($2|0);
}
function _isspace($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($c|0)==(32);
 if ($0) {
  $4 = 1;
 } else {
  $1 = (($c) + -9)|0;
  $2 = ($1>>>0)<(5);
  $4 = $2;
 }
 $3 = $4&1;
 STACKTOP = sp;return ($3|0);
}
function _atoi($s) {
 $s = $s|0;
 var $$0 = 0, $$1$ph = 0, $$12 = 0, $$neg1 = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $n$0$lcssa = 0, $n$03 = 0, $neg$0 = 0, $neg$1$ph = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $$0 = $s;
 while(1) {
  $0 = HEAP8[$$0>>0]|0;
  $1 = $0 << 24 >> 24;
  $2 = (_isspace($1)|0);
  $3 = ($2|0)==(0);
  $4 = (($$0) + 1|0);
  if ($3) {
   break;
  } else {
   $$0 = $4;
  }
 }
 $5 = HEAP8[$$0>>0]|0;
 $6 = $5 << 24 >> 24;
 if ((($6|0) == 45)) {
  $neg$0 = 1;
  label = 5;
 } else if ((($6|0) == 43)) {
  $neg$0 = 0;
  label = 5;
 } else {
  $$1$ph = $$0;$8 = $5;$neg$1$ph = 0;
 }
 if ((label|0) == 5) {
  $$pre = HEAP8[$4>>0]|0;
  $$1$ph = $4;$8 = $$pre;$neg$1$ph = $neg$0;
 }
 $7 = $8 << 24 >> 24;
 $9 = (_isdigit($7)|0);
 $10 = ($9|0)==(0);
 if ($10) {
  $n$0$lcssa = 0;
  $20 = ($neg$1$ph|0)!=(0);
  $21 = (0 - ($n$0$lcssa))|0;
  $22 = $20 ? $n$0$lcssa : $21;
  STACKTOP = sp;return ($22|0);
 } else {
  $$12 = $$1$ph;$n$03 = 0;
 }
 while(1) {
  $11 = ($n$03*10)|0;
  $12 = (($$12) + 1|0);
  $13 = HEAP8[$$12>>0]|0;
  $14 = $13 << 24 >> 24;
  $$neg1 = (($11) + 48)|0;
  $15 = (($$neg1) - ($14))|0;
  $16 = HEAP8[$12>>0]|0;
  $17 = $16 << 24 >> 24;
  $18 = (_isdigit($17)|0);
  $19 = ($18|0)==(0);
  if ($19) {
   $n$0$lcssa = $15;
   break;
  } else {
   $$12 = $12;$n$03 = $15;
  }
 }
 $20 = ($neg$1$ph|0)!=(0);
 $21 = (0 - ($n$0$lcssa))|0;
 $22 = $20 ? $n$0$lcssa : $21;
 STACKTOP = sp;return ($22|0);
}
function _strcmp($l,$r) {
 $l = $l|0;
 $r = $r|0;
 var $$014 = 0, $$05 = 0, $$lcssa = 0, $$lcssa2 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond3 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$l>>0]|0;
 $1 = HEAP8[$r>>0]|0;
 $2 = ($0<<24>>24)!=($1<<24>>24);
 $3 = ($0<<24>>24)==(0);
 $or$cond3 = $2 | $3;
 if ($or$cond3) {
  $$lcssa = $0;$$lcssa2 = $1;
 } else {
  $$014 = $l;$$05 = $r;
  while(1) {
   $4 = (($$014) + 1|0);
   $5 = (($$05) + 1|0);
   $6 = HEAP8[$4>>0]|0;
   $7 = HEAP8[$5>>0]|0;
   $8 = ($6<<24>>24)!=($7<<24>>24);
   $9 = ($6<<24>>24)==(0);
   $or$cond = $8 | $9;
   if ($or$cond) {
    $$lcssa = $6;$$lcssa2 = $7;
    break;
   } else {
    $$014 = $4;$$05 = $5;
   }
  }
 }
 $10 = $$lcssa&255;
 $11 = $$lcssa2&255;
 $12 = (($10) - ($11))|0;
 STACKTOP = sp;return ($12|0);
}
function runPostSets() {
 
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _strcpy(pdest, psrc) {
    pdest = pdest|0; psrc = psrc|0;
    var i = 0;
    do {
      HEAP8[(((pdest+i)|0)>>0)]=HEAP8[(((psrc+i)|0)>>0)];
      i = (i+1)|0;
    } while (((HEAP8[(((psrc)+(i-1))>>0)])|0));
    return pdest|0;
}
function _strlen(ptr) {
    ptr = ptr|0;
    var curr = 0;
    curr = ptr;
    while (((HEAP8[((curr)>>0)])|0)) {
      curr = (curr + 1)|0;
    }
    return (curr - ptr)|0;
}
function _memcpy(dest, src, num) {

    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if ((num|0) >= 4096) return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}
function _strncpy(pdest, psrc, num) {
    pdest = pdest|0; psrc = psrc|0; num = num|0;
    var padding = 0, curr = 0, i = 0;
    while ((i|0) < (num|0)) {
      curr = padding ? 0 : ((HEAP8[(((psrc)+(i))>>0)])|0);
      HEAP8[(((pdest)+(i))>>0)]=curr;
      padding = padding ? 1 : (((HEAP8[(((psrc)+(i))>>0)])|0) == 0);
      i = (i+1)|0;
    }
    return pdest|0;
}

// EMSCRIPTEN_END_FUNCS

  

  // EMSCRIPTEN_END_FUNCS
  

  return { _strlen: _strlen, _free: _free, _strncpy: _strncpy, _Version: _Version, _memset: _memset, _malloc: _malloc, _memcpy: _memcpy, _Compile: _Compile, _strcpy: _strcpy, _TestRecAlignment: _TestRecAlignment, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0 };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var real__strlen = asm["_strlen"]; asm["_strlen"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__strlen.apply(null, arguments);
};

var real__strncpy = asm["_strncpy"]; asm["_strncpy"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__strncpy.apply(null, arguments);
};

var real__Version = asm["_Version"]; asm["_Version"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__Version.apply(null, arguments);
};

var real__Compile = asm["_Compile"]; asm["_Compile"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__Compile.apply(null, arguments);
};

var real__strcpy = asm["_strcpy"]; asm["_strcpy"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__strcpy.apply(null, arguments);
};

var real__TestRecAlignment = asm["_TestRecAlignment"]; asm["_TestRecAlignment"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real__TestRecAlignment.apply(null, arguments);
};

var real_runPostSets = asm["runPostSets"]; asm["runPostSets"] = function() {
assert(runtimeInitialized, 'you need to wait for the runtime to be ready (e.g. wait for main() to be called)');
assert(!runtimeExited, 'the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)');
return real_runPostSets.apply(null, arguments);
};
var _strlen = Module["_strlen"] = asm["_strlen"];
var _free = Module["_free"] = asm["_free"];
var _strncpy = Module["_strncpy"] = asm["_strncpy"];
var _Version = Module["_Version"] = asm["_Version"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _Compile = Module["_Compile"] = asm["_Compile"];
var _strcpy = Module["_strcpy"] = asm["_strcpy"];
var _TestRecAlignment = Module["_TestRecAlignment"] = asm["_TestRecAlignment"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];


// Warning: printing of i64 values may be slightly rounded! No deep i64 math used, so precise i64 code not included
var i64Math = null;

// === Auto-generated postamble setup entry stuff ===

if (memoryInitializer) {
  if (typeof Module['locateFile'] === 'function') {
    memoryInitializer = Module['locateFile'](memoryInitializer);
  } else if (Module['memoryInitializerPrefixURL']) {
    memoryInitializer = Module['memoryInitializerPrefixURL'] + memoryInitializer;
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    var data = Module['readBinary'](memoryInitializer);
    HEAPU8.set(data, STATIC_BASE);
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      for (var i = 0; i < data.length; i++) {
        assert(HEAPU8[STATIC_BASE + i] === 0, "area for memory initializer should not have been touched before it's loaded");
      }
      HEAPU8.set(data, STATIC_BASE);
      removeRunDependency('memory initializer');
    }, function(data) {
      throw 'could not load memory initializer ' + memoryInitializer;
    });
  }
}

function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun'] && shouldRunNow) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);

  initialStackTop = STACKTOP;

  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();

    if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
      Module.printErr('pre-main prep time: ' + (Date.now() - preloadStartTime) + ' ms');
    }

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status) {
  if (Module['noExitRuntime']) {
    Module.printErr('exit(' + status + ') called, but noExitRuntime, so not exiting');
    return;
  }

  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;

  // exit the runtime
  exitRuntime();

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '';

  throw 'abort() at ' + stackTrace() + extra;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}



/*global Module: false */

//The value returned is in the format: XYY ;where X is the major version number and Y is the minor. For example, if the Version function returned 116, that indicates the version of the tokenizer is 1.16. If Version returned 123, that would indicate the tokenizer is version 1.23
function version(){
  return Module.ccall('Version', 'number');
}

function get32(buffer, starting){
  return buffer[starting] + (buffer[starting + 1] << 8) + (buffer[starting + 2] << 16) + (buffer[starting + 3] << 24);
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

