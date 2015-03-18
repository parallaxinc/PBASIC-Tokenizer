/*************************************************************************************************************************************************/
/* FILE:          tokenizertypes.h                                                                                                               */
/*                                                                                                                                               */
/* VERSION:       1.30                                                                                                                           */
/*                                                                                                                                               */
/* PURPOSE:       This is the header file for tokenizer.cpp that contains all the definitions of types, constants, etc., required for the        */ 
/*                tokenizer.                                                                                                                     */
/*                                                                                                                                               */
/* COPYRIGHT:     (c) 2001 - 2013 Parallax Inc.                                                                                                  */
/*                                                                                                                                               */
/* TERMS OF USE:  MIT License                                                                                                                    */
/*                Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation     */ 
/*                files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy,     */
/*                modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software */
/*                is furnished to do so, subject to the following conditions:                                                                    */
/*                                                                                                                                               */
/*                The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. */
/*                                                                                                                                               */
/*                THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE           */
/*                WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR          */
/*                COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,    */
/*                ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                          */
/*************************************************************************************************************************************************/



#if defined(LINUX) || defined(__APPLE_CC__) /*For some reason, limits.h is not auto-included in Linux or Macintosh*/
  #include <limits.h>
#endif /*Linux or Macintosh*/

/* Simple Defines */
#define True  1
#define False 0

#undef byte                         /*Set 'byte' to 8-bits*/
#if UCHAR_MAX == 0xff		            /*and verify 'char is 8-bits*/
  typedef unsigned char byte;
#else
  #error 'byte', 'char' and 'bool' MUST be 8 bits!
#endif

#undef bool                         /*Set 'bool' to 8-bits*/
#define bool byte		                /*Note: byte size is verified above*/

#undef word                         /*Set 'word' to 16-bits*/
#if USHRT_MAX == 0xffff
  typedef unsigned short int word;
#else
  #error 'word' MUST be 16 bits!
#endif

#if INT_MAX != 0x7fffffff           /*Verify 'int' is 32-bits*/
  #if INT_MAX != 0xffffffff
    #error 'int' MUST be 32 bits!
  #endif
#endif


#ifdef LINUX
  /* Linux-Only Types */
  #define STDAPI    uint8_t         /* define STDAPI */
#endif /*Linux*/

#ifdef __APPLE_CC__
  #define STDAPI	bool
#endif /*Macintosh*/


#define SymbolSize		      32		  /*Maximum size of symbol (in characters)*/
#define SymbolTableSize     1024    /*Maximum symbols allowed in symbol table (MUST BE POWER OF 2 FOR CalcSymbolHash TO WORK)*/
#define MaxSourceSize       0x10000 /*Maximum source file size*/
#define EEPROMSize		      0x800	  /*224lc16b eeprom - 2k bytes / 16k bits*/
#define SrcTokRefSize       ((EEPROMSize*8-14) / 7)  //Max size of Source-Token Crossreference list int((# EEPROM Bits - Overhead) / CommandSize)
#define ElementListSize     10240   /*Size of element list*/
#define PatchListSize       0x400*2 /*Size of address patch list*/
#define ForNextStackSize    16      /*Max number of nested FOR..NEXT loops (Limited by firmware)*/
#define IfThenStackSize     16      /*Max number of nested IF..THENs*/
#define DoLoopStackSize     16      /*Max number of nested DO..LOOPs*/
#define SelectStackSize     16      /*Max number of nested SELECT CASEs*/
#define NestingStackSize    ForNextStackSize+IfThenStackSize+DoLoopStackSize+SelectStackSize   /*Max number of nested code blocks*/
#define MaxExits            16      /*Maximum number of Exits within a given loop*/
#define ExpressionSize      0x200   /*Size of Expression Buffer (in bits)*/
#define PathNameSize        255     /*Maximum size of path and filename*/
#define ETX                 3       /*End Of Text Character*/

/* Macro Defines */
#define IsSymbolChar(C)                ( ((C) == '_') ||                   /* _    */ \
                                       ( ((C) >= '0') && ((C) <= '9') ) || /* 0..9 */ \
                                       ( ((C) >= 'A') && ((C) <= 'Z') ) || /* A..Z */ \
                                       ( ((C) >= 'a') && ((C) <= 'z') ) )  /* a..z */

#define IsDigitChar(C)                 ( ((C) >= '0') && ((C) <= '9') )    /* 0..9 */

#define IllegalCCDirectiveOperator(Op) ( ((Op) == ocHyp) ||  \
                                         ((Op) == ocAtn) ||  \
                                         ((Op) == ocMin) ||  \
                                         ((Op) == ocMax) ||  \
                                         ((Op) == ocMum) ||  \
                                         ((Op) == ocMuh) ||  \
                                         ((Op) == ocMod) ||  \
                                         ((Op) == ocDig) ||  \
                                         ((Op) == ocRev) )

/*File path characters and quoted file path characters are used to parse file names from the $STAMP directive*/
#define IsFilePathChar(C,Quoted)  ( ((C) == '!') ||                      /* !               */ \
                                   (((C) >= '#') && ((C) <= ')')) ||     /* #$%&'()         */ \
                                    ((C) == '+') ||                      /* +               */ \
                                   (((C) >= '-') && ((C) <= ';')) ||     /* -./0123456789:; */ \
                                    ((C) == '=') ||                      /* =               */ \
                                   (((C) >= '@') && ((C) <= 'z')) ||     /* @A..Z[\]^_`a..z */ \
                                    ((C) == '~') ||                      /* ~               */ \
                                    ((Quoted) &&                         /* If Quoted...    */ \
                                      (((C) == ' ') ||                   /* space           */ \
                                       ((C) == ',') ||                   /* ,               */ \
                                       ((C) == '{') ||                   /* {               */ \
                                       ((C) == '}'))) )                  /* }               */

#define IsConstantOperatorCode(C) ( ((C) == ocShl) || ((C) == ocShr) ||  /* Allowed operators for constant declarations */ \
                                    ((C) == ocAnd) || ((C) == ocOr)  || \
                                    ((C) == ocXor) || ((C) == ocAdd) || \
                                    ((C) == ocSub) || ((C) == ocMul) || \
                                    ((C) == ocDiv) ) 


#define IsMultiFileCapable(Module) ( (Module == tmBS2e) || (Module == tmBS2sx) || (Module == tmBS2p) || (Module == tmBS2pe) )


/* Types */
/*Define Bases*/
typedef enum TBase {bBinary, bDecimal, bHexadecimal, bNumElements} TBase;

/*Define Target Modules*/
typedef enum TTargetModule {tmNone, tmBS1, tmBS2, tmBS2e, tmBS2sx, tmBS2p, tmBS2pe, tmNumElements} TTargetModule;

/*Define Source Code Element Types.  These are ordered and grouped by function, but also by the order in which they
  should appear in the GetReservedWords function.  See comments beginning with "GRW" to find out how the GetReservedWord
  function should show their type.  NOTE: If TElementType is changed, change ElementTypeNames and ResWordTypeID (inside 
  of GetReservedWords) appropriately.*/
typedef enum TElementType  
             {etDirective,            /* $STAMP, $PORT, etc. */
              etTargetModule,         /* BS1, BS2, etc. */
              etCCDirective,          /* #DEFINE, #IF, #SELECT, etc. */
              etInstruction,          /* OUTPUT, HIGH, LOW, etc. */
              etCon,	                /* CON                           {GRW: "Declaration"} */
              etVariable,	            /* INS, OUTS, DIRS, etc. */
              etVariableAuto,         /* WORD, BYTE, NIB, BIT          {GRW: "VariableType"} */
              etVariableMod,          /* HIGHBYTE, LOWNIB, BIT15, etc. */
              etAnyNumberIO,          /* (S)NUM                        {GRW: "IOFormatter"} */
              etCond1Op,              /* <, <=, =>, >, =, <>           {GRW: "ConditionalOp"} */
              etBinaryOp,	            /* HYP, ATN, &, etc. */
              etUnaryOp,              /* SQR, ABS, ~, etc. */
              etConstant,	            /* 99, $FF, %11 */
              etPeriod,               /* . */
              etComma,                /* , */
              etQuestion,             /* ?                             {GRW: "QuestionMark"} */
              etBackslash,            /* \ */
              etAt,                   /* @                             {GRW: "AtSign"} */
              etLeft,                 /* (                             {GRW: "Parentheses"} */
              etLeftBracket,          /* [                             {GRW: "Brackets"} */
              etRightCurlyBrace,      /* } */
              etCCThen,               /* #THEN                         {GRW: etCCDirective} */
              etData,	                /* DATA                          {GRW: etInstruction} */
              etStep,                 /* STEP                          {GRW: etInstruction} */
              etTo,                   /* TO                            {GRW: etInstruction} */
              etThen,                 /* THEN                          {GRW: etInstruction} */
              etWhile,                /* WHILE                         {GRW: etInstruction} */
              etUntil,                /* UNTIL                         {GRW: etInstruction} */
              etPin,                  /* PIN                           {GRW: etCon} */
              etVar,	                /* VAR                           {GRW: etCon} */
              etASCIIIO,              /* ASC (must be followed by '?') {GRW: etAnyNumberIO} */
              etNumberIO,             /* (I)(S)DEC/HEX/BIN(1-16)       {GRW: etAnyNumberIO} */
              etRepeatIO,             /* REP                           {GRW: etAnyNumberIO} */
              etSkipIO,               /* SKIP                          {GRW: etAnyNumberIO} */
              etSpStringIO,           /* SPSTR - for BS2p and BS2pe    {GRW: etAnyNumberIO} */
              etStringIO,             /* STR                           {GRW: etAnyNumberIO} */
              etWaitIO,               /* WAIT                          {GRW: etAnyNumberIO} */
              etWaitStringIO,         /* WAITSTR                       {GRW: etAnyNumberIO} */
              etCond2Op,              /* AND, OR, XOR                  {GRW: etCond1Op} */
              etCond3Op,              /* NOT                           {GRW: etCond1Op} */
              etRight,                /* )                             {GRW: "etLeft"} */
              etRightBracket,         /* ]                             {GRW: "etLeftBracket"} */
              etPinNumber,            /* 0, 1,..15 */
              etAddress,	            /* (address symbol) */
              etCCConstant,	          /* 99, $FF, %11 (compile-time constant only) */
              etFileName,             /* Project member file: Slot2.bsx, etc */
              etUndef,	              /* (undefined symbol) */
              etEnd,                  /* end-of-line */
              etCancel} TElementType; /* canceled element record */


/*Define PBASIC Instruction Types.  The order they appear here DOES NOT affect the tokenizer operation.  They are
  alphabetically arranged for clarity only*/
typedef enum TInstructionType {itAuxio,itBranch,itButton,itCase,itCount,itDebug,itDebugIn,itDefine,itDo,itDtmfout,itElse,
                       itElseIf,itEnd,itEndIf,itEndSelect,itError,itExit,itFor,itFreqout,itGet,itGosub,itGoto,itHigh,
                       itI2cin,itI2cout,itIf,itInput,itIoterm,itLcdcmd,itLcdin,itLcdout,itLookdown,itLookup,itLoop,itLow,
                       itMainio,itNap,itNext,itOn,itOutput,itOwin,itOwout,itPause,itPollin,itPollmode,itPollout,
                       itPollrun,itPollwait,itPulsin,itPulsout,itPut,itPwm,itSleep,itRandom,itRctime,itRead,itReturn,
                       itReverse,itRun,itSelect,itSerin,itSerout,itShiftin,itShiftout,itStop,itStore,itToggle,itWrite,
                       itXout} TInstructionType;
							   
/*Define PBASIC Instruction Code names - Used to index into the InstCode array.  The order they appear here IS CRITICAL
  to the operation of the tokenizer.  If the order is changed here, it ABSOLUTELY must be changed in the InstCode array,
  defined below, as well!*/
typedef enum TInstructionCode {icEnd,icSleep,icNap,icStop,icOutput,icHigh,icToggle,icLow,icReverse,icGoto,icGosub,
                               icReturn,icInput,icIf,icNext,icBranch,icLookup,icLookdown,icRandom,icRead,icWrite,icPause,
                               icFreqout1,icFreqout2,icDtmfout,icXout,icDone,icGet,icPut,icRun,
                               icMainio,icAuxio,icSeroutNoFlow,icSeroutFlow,icSerinNoFlow,icSerinFlow,icPulsout,
                               icPulsin,icCount,icShiftin,icShiftout,icRctime,icButton,icPwm,icLcdin,icLcdout,
                               icLcdcmd,icI2cin_ex,icI2cin_noex,icI2cout_ex,icI2cout_noex,icPollrun,icPollmode,
                               icPollin,icPollout,icPollwait,icOwout,icOwin,icIoterm,icStore,
                               icReserved60,icReserved61,icReserved62,icReserved63,icNumElements} TInstructionCode;

/*Define Directive Types*/
typedef enum TDirectiveType {dtStamp,dtPort,dtPBasic} TDirectiveType;

/*Define Nesting types/modes for IF..THEN..ELSE..ENDIF, FOR..NEXT, DO..LOOP and SELECT CASE.  For IF..THEN, indicates
  whether the IF is a single or multi-line and what portion is currently being parsed (Main/Else).  NE, "no end", means
  don't look for END element.*/
typedef enum TNestingType {ntIFSingleElse,ntIFSingleElseNE,ntIFSingleMain,ntIFSingleMainNE,ntIFMultiElse,ntIFMultiMain,
                           ntFOR,ntDO,ntSELECT} TNestingType;

/*Define PBASIC Operator Codes*/
/*Unary Operators = SQR - SIN, Binary Operators = Hyp - Rev, Conditional Operators = AE - B
  NOTE: EnterExpressionOperator routine relies on there being no more than $1F operators*/
typedef enum TOperatorCode {ocSqr,ocAbs,ocNot,ocNeg,ocDcd,ocNcd,ocCos,ocSin,
                            ocHyp,ocAtn,ocAnd,ocOr,ocXor,ocMin,ocMax,ocAdd,
                            ocSub,ocMum,ocMul,ocMuh,ocMod,ocDiv,ocDig,ocShl,
                            ocShr,ocRev,ocAE,ocBE,ocE,ocNE,ocA,ocB} TOperatorCode;

/*Define Compiler Error Codes} {If these are changed, modify Errors array to match*/
typedef enum TErrorCode {ecS,ecECS,ecETQ,ecUC,ecEHD,ecEBD,ecSETC,ecTME,ecCESD,ecCESB,ecUS,ecUL,ecEAC,ecCDBZ,ecLIOOR,
                         ecLACD,ecEQ,ecLIAD,ecEB,ecEL,ecER,ecELB,ecERB,ecERCB,ecERCBCSMTSAPF,ecSIAD,ecDOSLAP,ecASCBZ,
                         ecOOVS,ecEF,ecSTF,ecECOEOL,ecECEOLOC,ecESEOLOC,ecNMBPBF,ecEC,ecECORB,ecEAV,ecEABV,ecEAVM,
                         ecVIABS,ecEASSVM,ecVMIOOR,ecEACVUOOL,ecEABOOR,ecEACOOLB,ecEITC,ecLOTFFGE,ecLOSNFNLE,ecLOSVE,
                         ecEAL,ecEALVOI,ecEE,ecET,ecETO,ecETM,ecEFN,ecED,ecDD,ecECP,ecUTMSDNF,ecNTT,ecLOSNITSE,ecEMBPBIOC,
                         ecEIMBPBI,ecEALVIOE,ecEALVIOEOL,ecLOSNDLSE,ecLMBPBD,ecWOUCCAABDAL,ecEWUEOLOC,ecEOAWFNADLS,
                         ecIWEI,ecFWN,ecDWL,ecLOSESWLSE,ecEVOW,ecEAWV,ecLIMC,ecPNMBZTF,ecEALVION,ecEALVIOL,ecLOSNSSE,
                         ecECE,ecCMBPBS,ecLOSCSWSSE,ecEALVIOES,ecESMBPBS,ecSWE,ecEGOG,ecCCBLTO,ecIPVNMBTZTF,ecENEDDSON,
                         ecIOICCD,ecECCT,ecCCIWCCEI,ecCCSWCCE,ecCCEMBPBCCI,ecCCEIMBPBCCI,ecISICCD,ecEAUDS,ecLOSNCCICCTSE,
                         ecEACOC,ecUDE,ecECCEI,ecLOSNCCSSE,ecECCCE,ecCCCMBPBCCS,ecCCESMBPBCCS,ecEADRTSOCCE,ecEADRTSOCCES,
                         ecECCE,ecENEDODS,ecESTFPC,ecEACVOW,ecELIMBPBI,ecLOSELISWISE,ecELINAAE,ecNumElements} TErrorCode;

/*Define symbol table structure*/
        struct TSymbolTable
                 {
 /*32 bytes*/    char         Name[SymbolSize+1];
 /*4 bytes*/	   TElementType ElementType;
 /*2 bytes*/	   word         Value;
 /*4 bytes*/	   int          NextRecord;                       /*Next record ID if Symbol hash used more than once.  Also used to indicate undefined non-DEFINE symbol (0) or undefined DEFINE symbol (1) in Symbol variable*/
				         };

/*Define custom symbol structure*/
        struct TCustomSymbolTable
                 {
                 int          Targets;                          /*Or'd pattern represents stamps supporting this symbol. Bit1 = BS1, Bit2 = BS2, etc*/
                 TSymbolTable Symbol;
                 };
  
/*Define undefined symbol table structure*/
        struct TUndefSymbolTable
                 {
 /*32 bytes*/    char         Name[SymbolSize+1];
 /*4 bytes*/     int          NextRecord;                       /*Next record ID if Symbol hash used more than once*/
                 };

/*Define element list structure*/
        struct TElementList
                 {
 /*4 bytes*/     TElementType ElementType;
 /*2 bytes*/ 	   word         Value;
 /*2 bytes*/     word         Start;
 /*1 byte */	   byte         Length;
				         };

/*Define source token crossreference structure*/
        struct TSrcTokReference
                 {
 /*2 bytes*/     word          SrcStart;
 /*2 bytes*/     word          TokStart;
                 };


/*Define Nesting Stack structure for FOR..NEXT, IF..THEN..ELSE..ENDIF, DO..LOOP and SELECT CASE*/
        struct TNestingStack
                 {
                 TNestingType  NestType;                 /*The type (and mode for IF..THENs) of the current nested code block*/
                 word          ElementIdx;               /*The element where the code block started (FOR, IF, DO, SELECT)*/
                 word          ExpIdx;                   /*The element where a SELECT statment's expression started*/
                 TOperatorCode AutoCondOp;               /*The automatic conditional opererator to insert in condition during a SELECT*/
                 word          JumpLabel;                /*The address to jump back to from NEXT or LOOP*/
                 word          SkipLabel;                /*The EEPROM address of a "SkipLabel" address to patch*/
                 word          Exits[MaxExits];          /*A list of EXIT command's "SkipLabel" addresses, or SELECT's GOTO "ExitLabel" address, to patch.  EXIT commands are allowed in FOR and DO loops only*/
                 };

/*Define module compile object code type*/
		typedef byte   TPacketType[int(EEPROMSize/16*18)];
        struct TModuleRec
                 {
 /*1 byte*/						  bool         Succeeded;                  /*Pass or failed on compile*/
 /*4 bytes*/					  char         *Error;                     /*Error message if failed*/
 /*1 byte*/						  bool         DebugFlag;                  /*Indicates there's debug data*/

 /*1 byte*/						  byte         TargetModule;               /*BASIC Stamp Module to compile for. 0=None, 1=BS1, 2=BS2, 3=BS2e, 4=BS2sx, 5=BS2p, 6=BS2pe*/
 /*4 bytes*/					  int          TargetStart;                /*Beginning of $STAMP directive target in source*/
 /*4*7 bytes*/					char         *ProjectFiles[7];           /*Paths and names of related project files, if any*/
 /*4*7 bytes*/					int          ProjectFilesStart[7];       /*Beginning of project file name in source*/

 /*4 bytes*/					  char         *Port;                      /*COM port to download to*/
 /*4 bytes*/					  int          PortStart;                  /*Beginning of port name in source*/

 /*4 bytes*/					  int          LanguageVersion;            /*Version of target PBASIC language. 200 = 2.00, 250 = 2.50, etc*/
 /*4 bytes*/					  int          LanguageStart;              /*Beginning of language version in source*/

 /*4 bytes*/					  int          SourceSize;                 /*Enter source code length here*/
 /*4 bytes*/					  int          ErrorStart;                 /*Beginning of error in source*/
 /*4 bytes*/					  int          ErrorLength;                /*Number of bytes in error selection*/

 /*1*EEPROMSize bytes*/	byte         EEPROM[EEPROMSize];         /*Tokenized data if compile worked*/
 /*1*EEPROMSize bytes*/	byte         EEPROMFlags[EEPROMSize];    /*EEPROM flags, bit 7: 0=unused, 1=used*/
																		                             /*bits 0..6: 0=empty, 1=undef data, 2=def data, 3=program*/

 /*1*4 bytes*/					byte         VarCounts[4];               /*# of.. [0]=bits, [1]=nibbles, [2]=bytes, [3]=words*/
 /*1 byte*/						  byte         PacketCount;                /*# of packets*/
 /*1*(EEPROMSize/16*18) bytes*/ TPacketType  PacketBuffer;       /*packet data*/
                 };



/*Define global variables*/
         TModuleRec        *tzModuleRec;                         /*tzModuleRec is a pointer to an externally accessible structure*/
         char              *tzSource;                            /*tzSource is a pointer to an externally accessible byte array*/
         TSrcTokReference  *tzSrcTokReference;                   /*tzSrcTokReference is a pointer to an externally accessible Source vs. Token Reference array*/
  static TSymbolTable      Symbol;
  static TSymbolTable      Symbol2;
  static TSymbolTable      SymbolTable[SymbolTableSize];
  static int               SymbolVectors[SymbolTableSize];       /*Vectors used for hashing into Symbol Table*/
  static int               SymbolTablePointer;
  static TUndefSymbolTable UndefSymbolTable[SymbolTableSize];
  static int               UndefSymbolVectors[SymbolTableSize];  /*Vectors used for hashing into Undefined Symbol Table.  Used to distinguish between undefined DEFINE'd symbols and undefined DATA, VAR, CON or PIN symbols*/
  static int               UndefSymbolTablePointer;
  static TElementList      ElementList[ElementListSize];
  static word              ElementListIdx;
  static word              ElementListEnd;
  static word              EEPROMPointers[EEPROMSize*2];
  static word              EEPROMIdx;
  static word              GosubCount;
  static word              PatchList[PatchListSize];
  static int               PatchListIdx;
  static TNestingStack     NestingStack[NestingStackSize];
  static byte              NestingStackIdx;                      /*Index of next available nesting stack element*/
  static byte              ForNextCount;                         /*Current count of Nested FOR..NEXT loops*/
  static byte              IfThenCount;                          /*Current count of Nested IF THENs*/
  static byte              DoLoopCount;                          /*Current count of Nested DO..LOOPs*/
  static byte              SelectCount;                          /*Current count of Nested SELECT CASEs*/
  static word              Expression[4][int(ExpressionSize / 16)]; /*4 arrays of (1 word size, N words data)*/
  static byte              ExpressionStack[256];
  static byte              ExpStackTop;
  static byte              ExpStackBottom;
  static byte              StackIdx;                             /*Run-time stack pointer*/
  static byte              ParenCount;
  static int               SrcIdx;                               /*Used by Element Engine*/
  static word              StartOfSymbol;                        /*Used by Element Engine*/
  static byte              CurChar;                              /*Used by Element Engine*/
  static TElementType      ElementType = etUndef;                /*Used by Element Engine*/
  static bool		      	   EndEntered;								           /*Used by Element Engine.  Indicates if End was just entered.*/
  static bool              AllowStampDirective;                  /*Set by Compile routine*/
  static byte              VarBitCount;                          /*# of var bits; used by variable parsing routines*/
  static byte              VarBases[4];                          /*start of.. [0]=bits, [1]=nibbles, [2]=bytes, [3]=words*; used by variable parsing routines*/
  static bool              Lang250;                              /*False = PBASIC 2.00, True = PBASIC 2.50*/
  static int               SrcTokReferenceIdx;

  



/*Define global constants*/
  const int SymbolTableLimit   = SymbolTableSize-SymbolSize-5;

  /*Define array for binary, decimal and hexidecimal range value*/
  const int  BaseValue[bNumElements] = {2,10,16};
  
  /*Define 6-bit Instruction Codes (OpCodes).  Unused instruction codes have no comments.  Each column of this constant
   array contains the codes for a particular Stamp module.  This array is indexed into using the TInstructionCode
   enumerations and the tzModuleRec->TargetModule.

   Note that some Stamps have additional instructions that have been placed in the unused space.  The icDone instruction,
   however, has a different instruction code between certain Stamps.  While this constant array is not the most efficient
   means of managing this nuance, it is used to provide a clear definition of all instruction codes for all the Stamps
   supported by this tokenizer.
   
   Also, tmNone and tmBS1 are not included by the current implementation of this tokenizer.  The code that references
   the InstCode array MUST account for this!*/

  const byte InstCode[icNumElements][tmNumElements-2 /*tmNone and tmBS1 are missing*/] = \
     /*         tmBS2                    tmBS2e                  tmBS2sx                  tmBS2p                   tmBS2pe         */
     /*-----------------------  -----------------------  -----------------------  -----------------------  ------------------------*/
   { {         /*icEnd*/ 0x00,          /*icEnd*/ 0x00,          /*icEnd*/ 0x00,          /*icEnd*/ 0x00,          /*icEnd*/ 0x00},
     {       /*icSleep*/ 0x01,        /*icSleep*/ 0x01,        /*icSleep*/ 0x01,        /*icSleep*/ 0x01,        /*icSleep*/ 0x01},
     {         /*icNap*/ 0x02,          /*icNap*/ 0x02,          /*icNap*/ 0x02,          /*icNap*/ 0x02,          /*icNap*/ 0x02},
     {        /*icStop*/ 0x03,         /*icStop*/ 0x03,         /*icStop*/ 0x03,         /*icStop*/ 0x03,         /*icStop*/ 0x03},
     {      /*icOutput*/ 0x04,       /*icOutput*/ 0x04,       /*icOutput*/ 0x04,       /*icOutput*/ 0x04,       /*icOutput*/ 0x04},
     {        /*icHigh*/ 0x05,         /*icHigh*/ 0x05,         /*icHigh*/ 0x05,         /*icHigh*/ 0x05,         /*icHigh*/ 0x05},
     {      /*icToggle*/ 0x06,       /*icToggle*/ 0x06,       /*icToggle*/ 0x06,       /*icToggle*/ 0x06,       /*icToggle*/ 0x06},
     {         /*icLow*/ 0x07,          /*icLow*/ 0x07,          /*icLow*/ 0x07,          /*icLow*/ 0x07,          /*icLow*/ 0x07},
     {     /*icReverse*/ 0x08,      /*icReverse*/ 0x08,      /*icReverse*/ 0x08,      /*icReverse*/ 0x08,      /*icReverse*/ 0x08},
     {        /*icGoto*/ 0x09,         /*icGoto*/ 0x09,         /*icGoto*/ 0x09,         /*icGoto*/ 0x09,         /*icGoto*/ 0x09},
     {       /*icGosub*/ 0x0A,        /*icGosub*/ 0x0A,        /*icGosub*/ 0x0A,        /*icGosub*/ 0x0A,        /*icGosub*/ 0x0A},
     {      /*icReturn*/ 0x0B,       /*icReturn*/ 0x0B,       /*icReturn*/ 0x0B,       /*icReturn*/ 0x0B,       /*icReturn*/ 0x0B},
     {       /*icInput*/ 0x0C,        /*icInput*/ 0x0C,        /*icInput*/ 0x0C,        /*icInput*/ 0x0C,        /*icInput*/ 0x0C},
     {          /*icIf*/ 0x0D,           /*icIf*/ 0x0D,           /*icIf*/ 0x0D,           /*icIf*/ 0x0D,           /*icIf*/ 0x0D},
     {        /*icNext*/ 0x0E,         /*icNext*/ 0x0E,         /*icNext*/ 0x0E,         /*icNext*/ 0x0E,         /*icNext*/ 0x0E},
     {      /*icBranch*/ 0x0F,       /*icBranch*/ 0x0F,       /*icBranch*/ 0x0F,       /*icBranch*/ 0x0F,       /*icBranch*/ 0x0F},
     {      /*icLookup*/ 0x10,       /*icLookup*/ 0x10,       /*icLookup*/ 0x10,       /*icLookup*/ 0x10,       /*icLookup*/ 0x10},
     {    /*icLookdown*/ 0x11,     /*icLookdown*/ 0x11,     /*icLookdown*/ 0x11,     /*icLookdown*/ 0x11,     /*icLookdown*/ 0x11},
     {      /*icRandom*/ 0x12,       /*icRandom*/ 0x12,       /*icRandom*/ 0x12,       /*icRandom*/ 0x12,       /*icRandom*/ 0x12},
     {        /*icRead*/ 0x13,         /*icRead*/ 0x13,         /*icRead*/ 0x13,         /*icRead*/ 0x13,         /*icRead*/ 0x13},
     {       /*icWrite*/ 0x14,        /*icWrite*/ 0x14,        /*icWrite*/ 0x14,        /*icWrite*/ 0x14,        /*icWrite*/ 0x14},
     {       /*icPause*/ 0x15,        /*icPause*/ 0x15,        /*icPause*/ 0x15,        /*icPause*/ 0x15,        /*icPause*/ 0x15},
     {    /*icFreqout1*/ 0x16,     /*icFreqout1*/ 0x16,     /*icFreqout1*/ 0x16,     /*icFreqout1*/ 0x16,     /*icFreqout1*/ 0x16},
     {    /*icFreqout2*/ 0x17,     /*icFreqout2*/ 0x17,     /*icFreqout2*/ 0x17,     /*icFreqout2*/ 0x17,     /*icFreqout2*/ 0x17},
     {     /*icDtmfout*/ 0x18,      /*icDtmfout*/ 0x18,      /*icDtmfout*/ 0x18,      /*icDtmfout*/ 0x18,      /*icDtmfout*/ 0x18},
     {        /*icXout*/ 0x19,         /*icXout*/ 0x19,         /*icXout*/ 0x19,         /*icXout*/ 0x19,         /*icXout*/ 0x19},
     {        /*icDone*/ 0x1A,         /*icDone*/ 0x1D,         /*icDone*/ 0x1D,         /*icDone*/ 0x1F,         /*icDone*/ 0x1F},
     {              /**/ 0x1B,          /*icGet*/ 0x1A,          /*icGet*/ 0x1A,          /*icGet*/ 0x1A,          /*icGet*/ 0x1A},
     {              /**/ 0x1C,          /*icPut*/ 0x1B,          /*icPut*/ 0x1B,          /*icPut*/ 0x1B,          /*icPut*/ 0x1B},
     {              /**/ 0x1D,          /*icRun*/ 0x1C,          /*icRun*/ 0x1C,          /*icRun*/ 0x1C,          /*icRun*/ 0x1C},
     {              /**/ 0x1E,               /**/ 0x1E,               /**/ 0x1E,       /*icMainio*/ 0x1D,       /*icMainio*/ 0x1D},
     {              /**/ 0x1F,               /**/ 0x1F,               /**/ 0x1F,        /*icAuxio*/ 0x1E,        /*icAuxio*/ 0x1E},
     {/*icSeroutNoFlow*/ 0x20, /*icSeroutNoFlow*/ 0x20, /*icSeroutNoFlow*/ 0x20, /*icSeroutNoFlow*/ 0x20, /*icSeroutNoFlow*/ 0x20},
     {  /*icSeroutFlow*/ 0x21,   /*icSeroutFlow*/ 0x21,   /*icSeroutFlow*/ 0x21,   /*icSeroutFlow*/ 0x21,   /*icSeroutFlow*/ 0x21},
     { /*icSerinNoFlow*/ 0x22,  /*icSerinNoFlow*/ 0x22,  /*icSerinNoFlow*/ 0x22,  /*icSerinNoFlow*/ 0x22,  /*icSerinNoFlow*/ 0x22},
     {   /*icSerinFlow*/ 0x23,    /*icSerinFlow*/ 0x23,    /*icSerinFlow*/ 0x23,    /*icSerinFlow*/ 0x23,    /*icSerinFlow*/ 0x23},
     {     /*icPulsout*/ 0x24,      /*icPulsout*/ 0x24,      /*icPulsout*/ 0x24,      /*icPulsout*/ 0x24,      /*icPulsout*/ 0x24},
     {      /*icPulsin*/ 0x25,       /*icPulsin*/ 0x25,       /*icPulsin*/ 0x25,       /*icPulsin*/ 0x25,       /*icPulsin*/ 0x25},
     {       /*icCount*/ 0x26,        /*icCount*/ 0x26,        /*icCount*/ 0x26,        /*icCount*/ 0x26,        /*icCount*/ 0x26},
     {     /*icShiftin*/ 0x27,      /*icShiftin*/ 0x27,      /*icShiftin*/ 0x27,      /*icShiftin*/ 0x27,      /*icShiftin*/ 0x27},
     {    /*icShiftout*/ 0x28,     /*icShiftout*/ 0x28,     /*icShiftout*/ 0x28,     /*icShiftout*/ 0x28,     /*icShiftout*/ 0x28},
     {      /*icRctime*/ 0x29,       /*icRctime*/ 0x29,       /*icRctime*/ 0x29,       /*icRctime*/ 0x29,       /*icRctime*/ 0x29},
     {      /*icButton*/ 0x2A,       /*icButton*/ 0x2A,       /*icButton*/ 0x2A,       /*icButton*/ 0x2A,       /*icButton*/ 0x2A},
     {         /*icPwm*/ 0x2B,          /*icPwm*/ 0x2B,          /*icPwm*/ 0x2B,          /*icPwm*/ 0x2B,          /*icPwm*/ 0x2B},
     {              /**/ 0x2C,               /**/ 0x2C,               /**/ 0x2C,        /*icLcdin*/ 0x2C,        /*icLcdin*/ 0x2C},
     {              /**/ 0x2D,               /**/ 0x2D,               /**/ 0x2D,       /*icLcdout*/ 0x2D,       /*icLcdout*/ 0x2D},
     {              /**/ 0x2E,               /**/ 0x2E,               /**/ 0x2E,       /*icLcdcmd*/ 0x2E,       /*icLcdcmd*/ 0x2E},
     {              /**/ 0x2F,               /**/ 0x2F,               /**/ 0x2F,     /*icI2cin_ex*/ 0x2F,     /*icI2cin_ex*/ 0x2F},
     {              /**/ 0x30,               /**/ 0x30,               /**/ 0x30,   /*icI2cin_noex*/ 0x30,   /*icI2cin_noex*/ 0x30},
     {              /**/ 0x31,               /**/ 0x31,               /**/ 0x31,    /*icI2cout_ex*/ 0x31,    /*icI2cout_ex*/ 0x31},
     {              /**/ 0x32,               /**/ 0x32,               /**/ 0x32,  /*icI2cout_noex*/ 0x32,  /*icI2cout_noex*/ 0x32},
     {              /**/ 0x33,               /**/ 0x33,               /**/ 0x33,      /*icPollrun*/ 0x33,      /*icPollrun*/ 0x33},
     {              /**/ 0x34,               /**/ 0x34,               /**/ 0x34,     /*icPollmode*/ 0x34,     /*icPollmode*/ 0x34},
     {              /**/ 0x35,               /**/ 0x35,               /**/ 0x35,       /*icPollin*/ 0x35,       /*icPollin*/ 0x35},
     {              /**/ 0x36,               /**/ 0x36,               /**/ 0x36,      /*icPollout*/ 0x36,      /*icPollout*/ 0x36},
     {              /**/ 0x37,               /**/ 0x37,               /**/ 0x37,     /*icPollwait*/ 0x37,     /*icPollwait*/ 0x37},
     {              /**/ 0x38,               /**/ 0x38,               /**/ 0x38,        /*icOwout*/ 0x38,        /*icOwout*/ 0x38},
     {              /**/ 0x39,               /**/ 0x39,               /**/ 0x39,         /*icOwin*/ 0x39,         /*icOwin*/ 0x39},
     {              /**/ 0x3A,               /**/ 0x3A,               /**/ 0x3A,       /*icIoterm*/ 0x3A,       /*icIoterm*/ 0x3A},
     {              /**/ 0x3B,               /**/ 0x3B,               /**/ 0x3B,        /*icStore*/ 0x3B,        /*icStore*/ 0x3B},
     {              /**/ 0x3C,               /**/ 0x3C,               /**/ 0x3C,               /**/ 0x3C,               /**/ 0x3C},
     {              /**/ 0x3D,               /**/ 0x3D,               /**/ 0x3D,               /**/ 0x3D,               /**/ 0x3D},
     {              /**/ 0x3E,               /**/ 0x3E,               /**/ 0x3E,               /**/ 0x3E,               /**/ 0x3E},
     {              /**/ 0x3F,               /**/ 0x3F,               /**/ 0x3F,               /**/ 0x3F,               /**/ 0x3F}};

  /*Define all error messages*/
  /*Note: Error 000 is only used as a "successful" return value for many functions and is not actually returned to the
    calling program*/
  const char *Errors[ecNumElements] 
              = {/*ecS*/              "000-Success",   
                 /*ecECS*/            "101-Expected character(s)",
                 /*ecETQ*/            "102-Expected terminating \"",
                 /*ecUC*/             "103-Unrecognized character",
                 /*ecEHD*/            "104-Expected hex digit",
                 /*ecEBD*/            "105-Expected binary digit",
                 /*ecSETC*/           "106-Symbol exceeds 32 characters",
                 /*ecTME*/            "107-Too many elements",
                 /*ecCESD*/           "108-Constant exceeds 16 digits",
                 /*ecCESB*/           "109-Constant exceeds 16 bits",
                 /*ecUS*/             "110-Undefined symbol",
                 /*ecUL*/             "111-Undefined label",
                 /*ecEAC*/            "112-Expected a constant",
                 /*ecCDBZ*/           "113-Cannot divide by 0",
                 /*ecLIOOR*/          "114-Location is out of range",
                 /*ecLACD*/           "115-Location already contains data",
                 /*ecEQ*/             "116-Expected \'?\'",
                 /*ecLIAD*/           "117-Label is already defined",
                 /*ecEB*/             "118-Expected \'\\'",
                 /*ecEL*/             "119-Expected \'(\'",
                 /*ecER*/             "120-Expected \')\'",
                 /*ecELB*/            "121-Expected \'[\'",
                 /*ecERB*/            "122-Expected \']\'",
                 /*ecERCB*/           "201-Expected \'}\'",
                 /*ecERCBCNSMTSAPF*/  "203-Expected \'}\'.  Can not specify more than 7 additional project files.",
                 /*ecSIAD*/           "123-Symbol is already defined",
                 /*ecDOSLAP*/         "124-Data occupies same location as program",
                 /*ecASCBZ*/          "125-Array size cannot be 0",
                 /*ecOOVS*/           "126-Out of variable space",
                 /*ecEF*/             "127-EEPROM full",
                 /*ecSTF*/            "128-Symbol table full",
                 /*ecECOEOL*/         "129-Expected \':\' or end-of-line",
                 /*ecECEOLOC*/        "130-Expected \',\', end-of-line, or \':\'",
                 /*ecESEOLOC*/        "131-Expected \'STEP\', end-of-line, or \':\'",
                 /*ecNMBPBF*/         "132-\'NEXT\' must be preceded by \'FOR\'",
                 /*ecEC*/             "133-Expected \',\'",
                 /*ecECORB*/          "134-Expected \',\' or \']\'",
                 /*ecEAV*/            "135-Expected a variable",
                 /*ecEABV*/           "136-Expected a byte variable",
                 /*ecEAVM*/           "137-Expected a variable modifier",
                 /*ecVIABS*/          "138-Variable is already bit-size",
                 /*ecEASSVM*/         "139-Expected a smaller-size variable modifier",
                 /*ecVMIOOR*/         "140-Variable modifier is out-of-range",
                 /*ecEACVUOOL*/       "141-Expected a constant, variable, unary operator, or \'(\'",
                 /*ecEABOOR*/         "142-Expected a binary operator or \')\'",
                 /*ecEACOOLB*/        "143-Expected a comparison operator or \'[\'",
                 /*ecEITC*/           "144-Expression is too complex",
                 /*ecLOTFFGE*/        "145-Limit of 255 GOSUBs exceeded",
                 /*ecLOSNFNLE*/       "146-Limit of 16 nested FOR-NEXT loops exceeded",
                 /*ecLOSVE*/          "147-Limit of 6 values exceeded",
                 /*ecEAL*/            "148-Expected a label",
                 /*ecEALVOI*/         "149-Expected a label, variable, or instruction",
                 /*ecEE*/             "150-Expected \'=\'",
                 /*ecET*/             "151-Expected \'THEN\'",
                 /*ecETO*/            "152-Expected \'TO\'",
                 /*ecETM*/            "204-Expected a target module: BS2, BS2E, BS2SX, BS2P, or BS2PE",
                 /*ecEFN*/            "153-Expected a filename",
                 /*ecED*/             "154-Expected a directive",
                 /*ecDD*/             "155-Duplicate directive",
                 /*ecECP*/            "208-Expected COM Port name: COM1, COM2, etc",
                 /*ecUTMSDNF*/        "156-Unknown target module.  $STAMP directive not found",
                 /*ecNTT*/            "157-Nothing to tokenize",
                 /*ecLOSNITSE*/       "158-Limit of 16 nested IF-THEN statements exceeded",
                 /*ecEMBPBIOC*/       "159-\'ELSE\' must be preceded by \'IF\' or \'CASE\'",
                 /*ecEIMBPBI*/        "160-\'ENDIF\' must be preceded by \'IF\'",
                 /*ecEALVIOE*/        "161-Expected a label, variable, instruction, or \'ENDIF\'",
                 /*ecEALVIOEOL*/      "162-Expected a label, variable, instruction, or end-of-line",
                 /*ecLOSNDLSE*/       "163-Limit of 16 nested DO-LOOP statements exceeded",
                 /*ecLMBPBD*/         "164-\'LOOP\' must be preceded by \'DO\'",
                 /*ecWOUCCAABDAL*/    "165-\'WHILE\' or \'UNTIL\' conditions cannot appear after both \'DO\' and \'LOOP\'",
                 /*ecEWUEOLOC*/       "166-Expected \'WHILE\', \'UNTIL\', end-of-line, or \':\'",
                 /*ecEOAWDLS*/        "167-\'EXIT\' only allowed within FOR-NEXT and DO-LOOP structures",
                 /*ecIWEI*/           "168-\'IF\' without \'ENDIF\'",
                 /*ecFWN*/            "169-\'FOR\' without \'NEXT\'",
                 /*ecDWL*/            "170-\'DO\' without \'LOOP\'",
                 /*ecLOSESWLSE*/      "171-Limit of 16 EXIT statements within loop structure exceeded",
                 /*ecEVOW*/           "172-Expected variable or \'WORD\'",
                 /*ecEAWV*/           "173-Expected a word variable",
                 /*ecLIMC*/           "174-Label is missing \':\'",
                 /*ecPNMBZTF*/        "175-Pin number must be 0 to 15",
                 /*ecEALVION*/        "176-Expected a label, variable, instruction, or \'NEXT\'",
                 /*ecEALVIOL*/        "177-Expected a label, variable, instruction, or \'LOOP\'",
                 /*ecLOSNSSE*/        "178-Limit of 16 nested SELECT statements exceeded",
                 /*ecECE*/            "179-Expected \'CASE\'",
                 /*ecCMBPBS*/         "180-\'CASE\' must be preceded by \'SELECT\'",
                 /*ecLOSCSWSSE*/      "181-Limit of 16 CASE statements within SELECT structure exceeded",
                 /*ecEALVIOES*/       "182-Expected a label, variable, instruction, or \'ENDSELECT\'",
                 /*ecESMBPBS*/        "183-\'ENDSELECT\' must be preceded by \'SELECT\'",
                 /*ecSWE*/            "184-\'SELECT\' without \'ENDSELECT\'",
                 /*ecEGOG*/           "185-Expected \'GOTO\' or \'GOSUB\'",
                 /*ecCCBLTO*/         "186-Constant cannot be less than 1",
                 /*ecIPVNMBTZTF*/     "187-Invalid PBASIC version number.  Must be 2.0 or 2.5",
                 /*ecENEDDSON*/       "188-Expected number, editor directive, #DEFINE\'d symbol, or \'-\'",
                 /*ecIOICCD*/         "189-Illegal operator in conditional-compile directive",
                 /*ecECCT*/           "190-Expected #THEN",
                 /*ecCCIWCCEI*/       "191-\'#IF\' without \'#ENDIF\'",
                 /*ecCCSWCCE*/        "192-\'#SELECT\' without \'#ENDSELECT\'",
                 /*ecCCEMBPBCCI*/     "193-\'#ELSE\' must be preceded by \'#IF\'",
                 /*ecCCEIMBPBCCI*/    "194-\'#ENDIF\' must be preceded by \'#IF\'",
                 /*ecISICCD*/         "195-Illegal symbol in conditional-compile directive",
                 /*ecEAUDS*/          "196-Expected a user-defined symbol",
                 /*ecLOSNCCICCTSE*/   "197-Limit of 16 nested #IF-#THEN statements exceeded",
                 /*ecEACOC*/          "198-Expected a character or ASCII value",
                 /*ecUDE*/            "199-",/*User Defined Error Message*/
                 /*ecECCEI*/          "200-Expected \'#ENDIF\'",
                 /*ecLOSNCCSSE*/      "218-Limit of 16 nested #SELECT statements exceeded",
                 /*ecECCCE*/          "219-Expected \'#CASE\'",
                 /*ecCCCMBPBCCS*/     "220-\'#CASE\' must be preceded by \'#SELECT\'",
                 /*ecCCESMBPBCCS*/    "221-\'#ENDSELECT\' must be preceded by \'#SELECT\'",
                 /*ecEADRTSOCCE*/     "222-Expected a declaration, run-time statement, or \'#ENDIF\'",
                 /*ecEADRTSOCCES*/    "223-Expected a declaration, run-time statement, or \'#ENDSELECT\'",
                 /*ecECCE*/           "224-Expected \'#ELSE\'",
                 /*ecENEDODS*/        "225-Expected number, editor directive, or #DEFINE\'d symbol",
                 /*ecESTFPC*/         "226-Expected statements to follow previous \'CASE\'",
                 /*ecEACVOW*/         "227-Expected a constant, variable or \'WORD\'",
                 /*ecELIMBPBI*/       "228-\'ELSEIF\' must be preceded by \'IF\'",
                 /*ecLOSELISWISE*/    "229-Limit of 16 ELSEIF statements within IF structure exceeded",
                 /*ecELINAAE*/        "230-\'ELSEIF\' not allowed after \'ELSE\'"};

  /*Common Symbols are used by all Stamps.  See Custom Symbols for Stamp Module-specific symbols*/
  TSymbolTable CommonSymbols[363] =
                       {{"IN0",         etVariable,       0x0000 /*%00 00000000*/},
                        {"IN1",         etVariable,       0x0001 /*%00 00000001*/},
                        {"IN2",         etVariable,       0x0002 /*%00 00000010*/},
                        {"IN3",         etVariable,       0x0003 /*%00 00000011*/},
                        {"IN4",         etVariable,       0x0004 /*%00 00000100*/},
                        {"IN5",         etVariable,       0x0005 /*%00 00000101*/},
                        {"IN6",         etVariable,       0x0006 /*%00 00000110*/},
                        {"IN7",         etVariable,       0x0007 /*%00 00000111*/},
                        {"IN8",         etVariable,       0x0008 /*%00 00001000*/},
                        {"IN9",         etVariable,       0x0009 /*%00 00001001*/}, /*10*/
                        {"IN10",        etVariable,       0x000A /*%00 00001010*/},
                        {"IN11",        etVariable,       0x000B /*%00 00001011*/},
                        {"IN12",        etVariable,       0x000C /*%00 00001100*/},
                        {"IN13",        etVariable,       0x000D /*%00 00001101*/},
                        {"IN14",        etVariable,       0x000E /*%00 00001110*/},
                        {"IN15",        etVariable,       0x000F /*%00 00001111*/},
                        {"OUT0",        etVariable,       0x0010 /*%00 00010000*/},
                        {"OUT1",        etVariable,       0x0011 /*%00 00010001*/},
                        {"OUT2",        etVariable,       0x0012 /*%00 00010010*/},
                        {"OUT3",        etVariable,       0x0013 /*%00 00010011*/}, /*20*/
                        {"OUT4",        etVariable,       0x0014 /*%00 00010100*/},
                        {"OUT5",        etVariable,       0x0015 /*%00 00010101*/},
                        {"OUT6",        etVariable,       0x0016 /*%00 00010110*/},
                        {"OUT7",        etVariable,       0x0017 /*%00 00010111*/},
                        {"OUT8",        etVariable,       0x0018 /*%00 00011000*/},
                        {"OUT9",        etVariable,       0x0019 /*%00 00011001*/},
                        {"OUT10",       etVariable,       0x001A /*%00 00011010*/},
                        {"OUT11",       etVariable,       0x001B /*%00 00011011*/},
                        {"OUT12",       etVariable,       0x001C /*%00 00011100*/},
                        {"OUT13",       etVariable,       0x001D /*%00 00011101*/}, /*30*/
                        {"OUT14",       etVariable,       0x001E /*%00 00011110*/},
                        {"OUT15",       etVariable,       0x001F /*%00 00011111*/},
                        {"DIR0",        etVariable,       0x0020 /*%00 00100000*/},
                        {"DIR1",        etVariable,       0x0021 /*%00 00100001*/},
                        {"DIR2",        etVariable,       0x0022 /*%00 00100010*/},
                        {"DIR3",        etVariable,       0x0023 /*%00 00100011*/},
                        {"DIR4",        etVariable,       0x0024 /*%00 00100100*/},
                        {"DIR5",        etVariable,       0x0025 /*%00 00100101*/},
                        {"DIR6",        etVariable,       0x0026 /*%00 00100110*/},
                        {"DIR7",        etVariable,       0x0027 /*%00 00100111*/}, /*40*/
                        {"DIR8",        etVariable,       0x0028 /*%00 00101000*/},
                        {"DIR9",        etVariable,       0x0029 /*%00 00101001*/},
                        {"DIR10",       etVariable,       0x002A /*%00 00101010*/},
                        {"DIR11",       etVariable,       0x002B /*%00 00101011*/},
                        {"DIR12",       etVariable,       0x002C /*%00 00101100*/},
                        {"DIR13",       etVariable,       0x002D /*%00 00101101*/},
                        {"DIR14",       etVariable,       0x002E /*%00 00101110*/},
                        {"DIR15",       etVariable,       0x002F /*%00 00101111*/},

                        {"INA",         etVariable,       0x0100 /*%01 xx000000*/},
                        {"INB",         etVariable,       0x0101 /*%01 xx000001*/}, /*50*/
                        {"INC",         etVariable,       0x0102 /*%01 xx000010*/},
                        {"IND",         etVariable,       0x0103 /*%01 xx000011*/},
                        {"OUTA",        etVariable,       0x0104 /*%01 xx000100*/},
                        {"OUTB",        etVariable,       0x0105 /*%01 xx000101*/},
                        {"OUTC",        etVariable,       0x0106 /*%01 xx000110*/},
                        {"OUTD",        etVariable,       0x0107 /*%01 xx000111*/},
                        {"DIRA",        etVariable,       0x0108 /*%01 xx001000*/},
                        {"DIRB",        etVariable,       0x0109 /*%01 xx001001*/},
                        {"DIRC",        etVariable,       0x010A /*%01 xx001010*/},
                        {"DIRD",        etVariable,       0x010B /*%01 xx001011*/}, /*60*/

                        {"INL",         etVariable,       0x0200 /*%10 xxx00000*/},
                        {"INH",         etVariable,       0x0201 /*%10 xxx00001*/},
                        {"OUTL",        etVariable,       0x0202 /*%10 xxx00010*/},
                        {"OUTH",        etVariable,       0x0203 /*%10 xxx00011*/},
                        {"DIRL",        etVariable,       0x0204 /*%10 xxx00100*/},
                        {"DIRH",        etVariable,       0x0205 /*%10 xxx00101*/},
                        {"B0",          etVariable,       0x0206 /*%10 xxx00110*/},
                        {"B1",          etVariable,       0x0207 /*%10 xxx00111*/},
                        {"B2",          etVariable,       0x0208 /*%10 xxx01000*/},
                        {"B3",          etVariable,       0x0209 /*%10 xxx01001*/}, /*70*/
                        {"B4",          etVariable,       0x020A /*%10 xxx01010*/},
                        {"B5",          etVariable,       0x020B /*%10 xxx01011*/},
                        {"B6",          etVariable,       0x020C /*%10 xxx01100*/},
                        {"B7",          etVariable,       0x020D /*%10 xxx01101*/},
                        {"B8",          etVariable,       0x020E /*%10 xxx01110*/},
                        {"B9",          etVariable,       0x020F /*%10 xxx01111*/},
                        {"B10",         etVariable,       0x0210 /*%10 xxx10000*/},
                        {"B11",         etVariable,       0x0211 /*%10 xxx10001*/},
                        {"B12",         etVariable,       0x0212 /*%10 xxx10010*/},
                        {"B13",         etVariable,       0x0213 /*%10 xxx10011*/}, /*80*/
                        {"B14",         etVariable,       0x0214 /*%10 xxx10100*/},
                        {"B15",         etVariable,       0x0215 /*%10 xxx10101*/},
                        {"B16",         etVariable,       0x0216 /*%10 xxx10110*/},
                        {"B17",         etVariable,       0x0217 /*%10 xxx10111*/},
                        {"B18",         etVariable,       0x0218 /*%10 xxx11000*/},
                        {"B19",         etVariable,       0x0219 /*%10 xxx11001*/},
                        {"B20",         etVariable,       0x021A /*%10 xxx11010*/},
                        {"B21",         etVariable,       0x021B /*%10 xxx11011*/},
                        {"B22",         etVariable,       0x021C /*%10 xxx11100*/},
                        {"B23",         etVariable,       0x021D /*%10 xxx11101*/}, /*90*/
                        {"B24",         etVariable,       0x021E /*%10 xxx11110*/},
                        {"B25",         etVariable,       0x021F /*%10 xxx11111*/},

                        {"INS",         etVariable,       0x0300 /*%11 xxxx0000*/},
                        {"OUTS",        etVariable,       0x0301 /*%11 xxxx0001*/},
                        {"DIRS",        etVariable,       0x0302 /*%11 xxxx0010*/},
                        {"W0",          etVariable,       0x0303 /*%11 xxxx0011*/},
                        {"W1",          etVariable,       0x0304 /*%11 xxxx0100*/},
                        {"W2",          etVariable,       0x0305 /*%11 xxxx0101*/},
                        {"W3",          etVariable,       0x0306 /*%11 xxxx0110*/},
                        {"W4",          etVariable,       0x0307 /*%11 xxxx0111*/}, /*100*/
                        {"W5",          etVariable,       0x0308 /*%11 xxxx1000*/},
                        {"W6",          etVariable,       0x0309 /*%11 xxxx1001*/},
                        {"W7",          etVariable,       0x030A /*%11 xxxx1010*/},
                        {"W8",          etVariable,       0x030B /*%11 xxxx1011*/},
                        {"W9",          etVariable,       0x030C /*%11 xxxx1100*/},
                        {"W10",         etVariable,       0x030D /*%11 xxxx1101*/},
                        {"W11",         etVariable,       0x030E /*%11 xxxx1110*/},
                        {"W12",         etVariable,       0x030F /*%11 xxxx1111*/},

                        {"CON",         etCon,            0x0000 /*0,0*/},
                        {"DATA",        etData,           0x0000 /*0,0*/},          /*110*/
                        {"VAR",         etVar,            0x0000 /*0,0*/},

                        {"FOR",         etInstruction,    int(itFor)},
                        {"NEXT",        etInstruction,    int(itNext)},
                        {"GOTO",        etInstruction,    int(itGoto)},
                        {"GOSUB",       etInstruction,    int(itGosub)},
                        {"RETURN",      etInstruction,    int(itReturn)},
                        {"IF",          etInstruction,    int(itIf)},
                        {"BRANCH",      etInstruction,    int(itBranch)},
                        {"LOOKUP",      etInstruction,    int(itLookup)},
                        {"LOOKDOWN",    etInstruction,    int(itLookdown)},         /*120*/
                        {"RANDOM",      etInstruction,    int(itRandom)},
                        {"READ",        etInstruction,    int(itRead)},
                        {"WRITE",       etInstruction,    int(itWrite)},
                        {"PAUSE",       etInstruction,    int(itPause)},
                        {"INPUT",       etInstruction,    int(itInput)},
                        {"OUTPUT",      etInstruction,    int(itOutput)},
                        {"LOW",         etInstruction,    int(itLow)},
                        {"HIGH",        etInstruction,    int(itHigh)},
                        {"TOGGLE",      etInstruction,    int(itToggle)},
                        {"REVERSE",     etInstruction,    int(itReverse)},          /*130*/
                        {"SEROUT",      etInstruction,    int(itSerout)},
                        {"SERIN",       etInstruction,    int(itSerin)},
                        {"PULSOUT",     etInstruction,    int(itPulsout)},
                        {"PULSIN",      etInstruction,    int(itPulsin)},
                        {"COUNT",       etInstruction,    int(itCount)},
                        {"SHIFTOUT",    etInstruction,    int(itShiftout)},
                        {"SHIFTIN",     etInstruction,    int(itShiftin)},
                        {"RCTIME",      etInstruction,    int(itRctime)},
                        {"BUTTON",      etInstruction,    int(itButton)},
                        {"PWM",         etInstruction,    int(itPwm)},              /*140*/
                        {"FREQOUT",     etInstruction,    int(itFreqout)},
                        {"DTMFOUT",     etInstruction,    int(itDtmfout)},
                        {"XOUT",        etInstruction,    int(itXout)},
                        {"DEBUG",       etInstruction,    int(itDebug)},
                        {"STOP",        etInstruction,    int(itStop)},
                        {"NAP",         etInstruction,    int(itNap)},
                        {"SLEEP",       etInstruction,    int(itSleep)},
                        {"END",         etInstruction,    int(itEnd)},

                        {"$STAMP",      etDirective,      int(dtStamp)},
                        {"$PORT",       etDirective,      int(dtPort)},             /*150*/
                        {"$PBASIC",     etDirective,      int(dtPBasic)},

                        {"BS2",         etTargetModule,   int(tmBS2)},
                        {"BS2E",        etTargetModule,   int(tmBS2e)},
                        {"BS2SX",       etTargetModule,   int(tmBS2sx)},
                        {"BS2P",        etTargetModule,   int(tmBS2p)},
                        {"BS2PE",       etTargetModule,   int(tmBS2pe)},

                        {"TO",          etTo,             0x0000 /*0,0*/},
                        {"STEP",        etStep,           0x0000 /*0,0*/},
                        {"THEN",        etThen,           0x0000 /*0,0*/},

                        {"SQR",         etUnaryOp,        int(ocSqr)},              /*160*/
                        {"ABS",         etUnaryOp,        int(ocAbs)},              
                        {"~",           etUnaryOp,        int(ocNot)},              
            /*uses '-'  {"NEG",         etUnaryOp,        int(ocNeg)},*/
                        {"DCD",         etUnaryOp,        int(ocDcd)},
                        {"NCD",         etUnaryOp,        int(ocNcd)},
                        {"COS",         etUnaryOp,        int(ocCos)},
                        {"SIN",         etUnaryOp,        int(ocSin)},
                        {"HYP",         etBinaryOp,       int(ocHyp)},
                        {"ATN",         etBinaryOp,       int(ocAtn)},
                        {"&",           etBinaryOp,       int(ocAnd)},
                        {"|",           etBinaryOp,       int(ocOr)},               /*170*/
                        {"^",           etBinaryOp,       int(ocXor)},              
                        {"MIN",         etBinaryOp,       int(ocMin)},
                        {"MAX",         etBinaryOp,       int(ocMax)},
                        {"+",           etBinaryOp,       int(ocAdd)},
                        {"-",           etBinaryOp,       int(ocSub)},
                        {"*/",          etBinaryOp,       int(ocMum)},
                        {"*",           etBinaryOp,       int(ocMul)},
                        {"**",          etBinaryOp,       int(ocMuh)},
                        {"//",          etBinaryOp,       int(ocMod)},
                        {"/",           etBinaryOp,       int(ocDiv)},              /*180*/
                        {"DIG",         etBinaryOp,       int(ocDig)},              
                        {"<<",          etBinaryOp,       int(ocShl)},
                        {">>",          etBinaryOp,       int(ocShr)},
                        {"REV",         etBinaryOp,       int(ocRev)},
                        {"=>",          etCond1Op,        int(ocAE)},
                        {">=",          etCond1Op,        int(ocAE)},
                        {"<=",          etCond1Op,        int(ocBE)},
                        {"=<",          etCond1Op,        int(ocBE)},
                        {"=",           etCond1Op,        int(ocE)},
                        {"<>",          etCond1Op,        int(ocNE)},               /*190*/
                        {"><",          etCond1Op,        int(ocNE)},               
                        {">",           etCond1Op,        int(ocA)}, 
                        {"<",           etCond1Op,        int(ocB)},
                        {"AND",         etCond2Op,        int(ocAnd)},
                        {"OR",          etCond2Op,        int(ocOr)},
                        {"XOR",         etCond2Op,        int(ocXor)},
                        {"NOT",         etCond3Op,        int(ocNot)},

                        {"BIT",         etVariableAuto,   0x0000 /*0,0*/},
                        {"NIB",         etVariableAuto,   0x0001 /*0,1*/},
                        {"BYTE",        etVariableAuto,   0x0002 /*0,2*/},          /*200*/
                        {"WORD",        etVariableAuto,   0x0003 /*0,3*/},          

                        {"BIT0",        etVariableMod,    0x0000 /*%00,0*/},
                        {"BIT1",        etVariableMod,    0x0001 /*%00,1*/},
                        {"BIT2",        etVariableMod,    0x0002 /*%00,2*/},
                        {"BIT3",        etVariableMod,    0x0003 /*%00,3*/},
                        {"BIT4",        etVariableMod,    0x0004 /*%00,4*/},
                        {"BIT5",        etVariableMod,    0x0005 /*%00,5*/},
                        {"BIT6",        etVariableMod,    0x0006 /*%00,6*/},
                        {"BIT7",        etVariableMod,    0x0007 /*%00,7*/},
                        {"BIT8",        etVariableMod,    0x0008 /*%00,8*/},        /*210*/
                        {"BIT9",        etVariableMod,    0x0009 /*%00,9*/},        
                        {"BIT10",       etVariableMod,    0x000A /*%00,10*/},
                        {"BIT11",       etVariableMod,    0x000B /*%00,11*/},
                        {"BIT12",       etVariableMod,    0x000C /*%00,12*/},
                        {"BIT13",       etVariableMod,    0x000D /*%00,13*/},
                        {"BIT14",       etVariableMod,    0x000E /*%00,14*/},
                        {"BIT15",       etVariableMod,    0x000F /*%00,15*/},
                        {"LOWBIT",      etVariableMod,    0x0000 /*%00,0*/},
                        {"HIGHBIT",     etVariableMod,    0x0080 /*%00,0x80*/},
                        {"NIB0",        etVariableMod,    0x0100 /*%01,0*/},        /*220*/
                        {"NIB1",        etVariableMod,    0x0101 /*%01,1*/},        
                        {"NIB2",        etVariableMod,    0x0102 /*%01,2*/},
                        {"NIB3",        etVariableMod,    0x0103 /*%01,3*/},
                        {"LOWNIB",      etVariableMod,    0x0100 /*%01,0*/},
                        {"HIGHNIB",     etVariableMod,    0x0180 /*%01,0x80*/},
                        {"BYTE0",       etVariableMod,    0x0200 /*%10,0*/},
                        {"BYTE1",       etVariableMod,    0x0201 /*%10,1*/},
                        {"LOWBYTE",     etVariableMod,    0x0200 /*%10,0*/},
                        {"HIGHBYTE",    etVariableMod,    0x0280 /*%10,0x80*/},

                        {"ASC",         etASCIIIO,        0x0000},                  /*230*/
                        {"STR",         etStringIO,       0x0000},                  
                        {"REP",         etRepeatIO,       0x0000},
                        {"SKIP",        etSkipIO,         0x0000},
                        {"WAITSTR",     etWaitStringIO,   0x0000},
                        {"WAIT",        etWaitIO,         0x0000},
                        {"NUM",         etAnyNumberIO,    0x1106},
                        {"SNUM",        etAnyNumberIO,    0x1506},
                        {"DEC",         etNumberIO,       0x01B6},
                        {"DEC1",        etNumberIO,       0x03F6},
                        {"DEC2",        etNumberIO,       0x03E6},                  /*240*/
                        {"DEC3",        etNumberIO,       0x03D6},                  
                        {"DEC4",        etNumberIO,       0x03C6},
                        {"DEC5",        etNumberIO,       0x03B6},
                        {"SDEC",        etNumberIO,       0x05B6},
                        {"SDEC1",       etNumberIO,       0x07F6},
                        {"SDEC2",       etNumberIO,       0x07E6},
                        {"SDEC3",       etNumberIO,       0x07D6},
                        {"SDEC4",       etNumberIO,       0x07C6},
                        {"SDEC5",       etNumberIO,       0x07B6},
                        {"HEX",         etNumberIO,       0x01C0},                  /*250*/
                        {"HEX1",        etNumberIO,       0x03F0},                  
                        {"HEX2",        etNumberIO,       0x03E0},
                        {"HEX3",        etNumberIO,       0x03D0},
                        {"HEX4",        etNumberIO,       0x03C0},
                        {"SHEX",        etNumberIO,       0x05C0},
                        {"SHEX1",       etNumberIO,       0x07F0},
                        {"SHEX2",       etNumberIO,       0x07E0},
                        {"SHEX3",       etNumberIO,       0x07D0},
                        {"SHEX4",       etNumberIO,       0x07C0},
                        {"IHEX",        etNumberIO,       0x09C0},                  /*260*/
                        {"IHEX1",       etNumberIO,       0x0BF0},                  
                        {"IHEX2",       etNumberIO,       0x0BE0},
                        {"IHEX3",       etNumberIO,       0x0BD0},
                        {"IHEX4",       etNumberIO,       0x0BC0},
                        {"ISHEX",       etNumberIO,       0x0DC0},
                        {"ISHEX1",      etNumberIO,       0x0FF0},
                        {"ISHEX2",      etNumberIO,       0x0FE0},
                        {"ISHEX3",      etNumberIO,       0x0FD0},
                        {"ISHEX4",      etNumberIO,       0x0FC0},
                        {"BIN",         etNumberIO,       0x010E},                  /*270*/
                        {"BIN1",        etNumberIO,       0x03FE},                  
                        {"BIN2",        etNumberIO,       0x03EE},
                        {"BIN3",        etNumberIO,       0x03DE},
                        {"BIN4",        etNumberIO,       0x03CE},
                        {"BIN5",        etNumberIO,       0x03BE},
                        {"BIN6",        etNumberIO,       0x03AE},
                        {"BIN7",        etNumberIO,       0x039E},
                        {"BIN8",        etNumberIO,       0x038E},
                        {"BIN9",        etNumberIO,       0x037E},
                        {"BIN10",       etNumberIO,       0x036E},                  /*280*/
                        {"BIN11",       etNumberIO,       0x035E},                  
                        {"BIN12",       etNumberIO,       0x034E},
                        {"BIN13",       etNumberIO,       0x033E},
                        {"BIN14",       etNumberIO,       0x032E},
                        {"BIN15",       etNumberIO,       0x031E},
                        {"BIN16",       etNumberIO,       0x030E},
                        {"SBIN",        etNumberIO,       0x050E},
                        {"SBIN1",       etNumberIO,       0x07FE},
                        {"SBIN2",       etNumberIO,       0x07EE},
                        {"SBIN3",       etNumberIO,       0x07DE},                  /*290*/
                        {"SBIN4",       etNumberIO,       0x07CE},                  
                        {"SBIN5",       etNumberIO,       0x07BE},
                        {"SBIN6",       etNumberIO,       0x07AE},
                        {"SBIN7",       etNumberIO,       0x079E},
                        {"SBIN8",       etNumberIO,       0x078E},
                        {"SBIN9",       etNumberIO,       0x077E},
                        {"SBIN10",      etNumberIO,       0x076E},
                        {"SBIN11",      etNumberIO,       0x075E},
                        {"SBIN12",      etNumberIO,       0x074E},
                        {"SBIN13",      etNumberIO,       0x073E},                  /*300*/
                        {"SBIN14",      etNumberIO,       0x072E},                  
                        {"SBIN15",      etNumberIO,       0x071E},
                        {"SBIN16",      etNumberIO,       0x070E},
                        {"IBIN",        etNumberIO,       0x090E},
                        {"IBIN1",       etNumberIO,       0x0BFE},
                        {"IBIN2",       etNumberIO,       0x0BEE},
                        {"IBIN3",       etNumberIO,       0x0BDE},
                        {"IBIN4",       etNumberIO,       0x0BCE},
                        {"IBIN5",       etNumberIO,       0x0BBE},
                        {"IBIN6",       etNumberIO,       0x0BAE},                  /*310*/
                        {"IBIN7",       etNumberIO,       0x0B9E},                  
                        {"IBIN8",       etNumberIO,       0x0B8E},
                        {"IBIN9",       etNumberIO,       0x0B7E},
                        {"IBIN10",      etNumberIO,       0x0B6E},
                        {"IBIN11",      etNumberIO,       0x0B5E},
                        {"IBIN12",      etNumberIO,       0x0B4E},
                        {"IBIN13",      etNumberIO,       0x0B3E},
                        {"IBIN14",      etNumberIO,       0x0B2E},
                        {"IBIN15",      etNumberIO,       0x0B1E},
                        {"IBIN16",      etNumberIO,       0x0B0E},                  /*320*/
                        {"ISBIN",       etNumberIO,       0x0D0E},                  
                        {"ISBIN1",      etNumberIO,       0x0FFE},
                        {"ISBIN2",      etNumberIO,       0x0FEE},
                        {"ISBIN3",      etNumberIO,       0x0FDE},
                        {"ISBIN4",      etNumberIO,       0x0FCE},
                        {"ISBIN5",      etNumberIO,       0x0FBE},
                        {"ISBIN6",      etNumberIO,       0x0FAE},
                        {"ISBIN7",      etNumberIO,       0x0F9E},
                        {"ISBIN8",      etNumberIO,       0x0F8E},
                        {"ISBIN9",      etNumberIO,       0x0F7E},                  /*330*/
                        {"ISBIN10",     etNumberIO,       0x0F6E},                  
                        {"ISBIN11",     etNumberIO,       0x0F5E},
                        {"ISBIN12",     etNumberIO,       0x0F4E},
                        {"ISBIN13",     etNumberIO,       0x0F3E},
                        {"ISBIN14",     etNumberIO,       0x0F2E},
                        {"ISBIN15",     etNumberIO,       0x0F1E},
                        {"ISBIN16",     etNumberIO,       0x0F0E},

                        {".",           etPeriod,         0x0000 /*0,0*/},
                        {"?",           etQuestion,       0x0000 /*0,0*/},
                        {"\\",          etBackslash,      0x0000 /*0,0*/},          /*340*/
                        {"@",           etAt,             0x0000 /*0,0*/},          
                        {"(",           etLeft,           0x0000 /*0,0*/},
                        {")",           etRight,          0x0000 /*0,0*/},
                        {"[",           etLeftBracket,    0x0000 /*0,0*/},
                        {"]",           etRightBracket,   0x0000 /*0,0*/},

                        {"CLS",         etConstant,       0x0000 /*0,0*/},
                        {"HOME",        etConstant,       0x0001 /*0,1*/},
                        {"BELL",        etConstant,       0x0007 /*0,7*/},
                        {"BKSP",        etConstant,       0x0008 /*0,8*/},
                        {"TAB",         etConstant,       0x0009 /*0,9*/},          /*350*/
                        {"CR",          etConstant,       0x000D /*0,13*/},         

                        {"UNITON",      etConstant,       0x0012 /*%0 xxx10010*/},
                        {"UNITOFF",     etConstant,       0x001A /*%0 xxx11010*/},
                        {"UNITSOFF",    etConstant,       0x001C /*%0 xxx11100*/},
                        {"LIGHTSON",    etConstant,       0x0014 /*%0 xxx10100*/},
                        {"DIM",         etConstant,       0x001E /*%0 xxx11110*/},
                        {"BRIGHT",      etConstant,       0x0016 /*%0 xxx10110*/},

                        {"LSBFIRST",    etConstant,       0x0000 /*%0 xxxxxxx0*/},
                        {"MSBFIRST",    etConstant,       0x0001 /*%0 xxxxxxx1*/},
                        {"MSBPRE",      etConstant,       0x0000 /*%0 xxxxxx00*/},  /*360*/
                        {"LSBPRE",      etConstant,       0x0001 /*%0 xxxxxx01*/},  
                        {"MSBPOST",     etConstant,       0x0002 /*%0 xxxxxx10*/},
                        {"LSBPOST",     etConstant,       0x0003 /*%0 xxxxxx11*/}};

  /*Custom Symbols are those that are either not supported by every Stamp or not supported by every version of the PBASIC
   language syntax.  The Targets field is a bit pattern that defines the module which supports the particular symbol and
   the version of PBASIC.  The bit pattern defines module support from LSB (tmBS1) toward MSB (tmBS2pe) and PBASIC
   version 2.0 (bit 6) to PBASIC version 2.5 (bit 7).  For example, a pattern of $BA, which is %1011 1010, indicates the
   symbol is supported by the BS2, BS2sx, BS2p and BS2pe (read from right to left), but not the BS1 (indicated by 0 in
   bit 0) and not the BS2e (indicated by 0 in bit 2) and in not in version 2.0 (indicated by 0 in bit 6) and in version
   2.5 (indicated by 1 in bit 7).  These symbols are entered into the symbol table by the AdjustSymbols procedure after
   the Target Module and Language Version is identified.*/
  
#define CustomSymbolTableSize 53    /*Size of Custom Symbol Table (used in more than one place)*/
  TCustomSymbolTable CustomSymbols[CustomSymbolTableSize] =
        {{0xFC, /*1111 1100*/ { "GET",        etInstruction,   int(itGet)}},
         {0xFC, /*1111 1100*/ { "PUT",        etInstruction,   int(itPut)}},
         {0xFC, /*1111 1100*/ { "RUN",        etInstruction,   int(itRun)}},
         {0xF0, /*1111 0000*/ { "LCDIN",      etInstruction,   int(itLcdin)}},
         {0xF0, /*1111 0000*/ { "LCDOUT",     etInstruction,   int(itLcdout)}},
         {0xF0, /*1111 0000*/ { "LCDCMD",     etInstruction,   int(itLcdcmd)}},
         {0xF0, /*1111 0000*/ { "I2CIN",      etInstruction,   int(itI2cin)}},
         {0xF0, /*1111 0000*/ { "I2COUT",     etInstruction,   int(itI2cout)}},
         {0xF0, /*1111 0000*/ { "POLLIN",     etInstruction,   int(itPollin)}},
         {0xF0, /*1111 0000*/ { "POLLOUT",    etInstruction,   int(itPollout)}},
         {0xF0, /*1111 0000*/ { "OWIN",       etInstruction,   int(itOwin)}},
         {0xF0, /*1111 0000*/ { "OWOUT",      etInstruction,   int(itOwout)}},
         {0xF0, /*1111 0000*/ { "IOTERM",     etInstruction,   int(itIoterm)}},
         {0xF0, /*1111 0000*/ { "STORE",      etInstruction,   int(itStore)}},
         {0xF0, /*1111 0000*/ { "POLLWAIT",   etInstruction,   int(itPollwait)}},
         {0xF0, /*1111 0000*/ { "POLLRUN",    etInstruction,   int(itPollrun)}},
         {0xF0, /*1111 0000*/ { "MAINIO",     etInstruction,   int(itMainio)}},
         {0xF0, /*1111 0000*/ { "AUXIO",      etInstruction,   int(itAuxio)}},
         {0xF0, /*1111 0000*/ { "POLLMODE",   etInstruction,   int(itPollmode)}},
         {0xF0, /*1111 0000*/ { "SPSTR",      etSpStringIO,    0x0000}},

         {0xBE, /*1011 1110*/ { "PIN",        etPin,           0x0000 /*0,0*/}},
         {0xBE, /*1011 1110*/ { "DO",         etInstruction,   int(itDo)}},
         {0xBE, /*1011 1110*/ { "EXIT",       etInstruction,   int(itExit)}},
         {0xBE, /*1011 1110*/ { "LOOP",       etInstruction,   int(itLoop)}},
         {0xBE, /*1011 1110*/ { "UNTIL",      etUntil,         0x0000 /*0,0*/}},
         {0xBE, /*1011 1110*/ { "WHILE",      etWhile,         0x0000 /*0,0*/}},

         {0xBE, /*1011 1110*/ { "#DEFINE",    etCCDirective,   int(itDefine)}},
         {0xBE, /*1011 1110*/ { "#ERROR",     etCCDirective,   int(itError)}},
         {0xBE, /*1011 1110*/ { "#IF",        etCCDirective,   int(itIf)}},
         {0xBE, /*1011 1110*/ { "#THEN",      etCCThen,        0x0000 /*0,0*/}},
         {0xBE, /*1011 1110*/ { "ELSE",       etInstruction,   int(itElse)}},
         {0xBE, /*1011 1110*/ { "ELSEIF",     etInstruction,   int(itElseIf)}},
         {0xBE, /*1011 1110*/ { "#ELSE",      etCCDirective,   int(itElse)}},
         {0xBE, /*1011 1110*/ { "ENDIF",      etInstruction,   int(itEndIf)}},
         {0xBE, /*1011 1110*/ { "#ENDIF",     etCCDirective,   int(itEndIf)}},
         {0xBE, /*1011 1110*/ { "SELECT",     etInstruction,   int(itSelect)}},
         {0xBE, /*1011 1110*/ { "#SELECT",    etCCDirective,   int(itSelect)}},
         {0xBE, /*1011 1110*/ { "CASE",       etInstruction,   int(itCase)}},
         {0xBE, /*1011 1110*/ { "#CASE",      etCCDirective,   int(itCase)}},
         {0xBE, /*1011 1110*/ { "ENDSELECT",  etInstruction,   int(itEndSelect)}},
         {0xBE, /*1011 1110*/ { "#ENDSELECT", etCCDirective,   int(itEndSelect)}},
         {0xBE, /*1011 1110*/ { "ON",         etInstruction,   int(itOn)}},
         {0xBE, /*1011 1110*/ { "DEBUGIN",    etInstruction,   int(itDebugIn)}},
         {0xBE, /*1011 1110*/ { "CRSRXY",     etConstant,      0x0002 /*2*/ }},
         {0xBE, /*1011 1110*/ { "CRSRLF",     etConstant,      0x0003 /*3*/ }},
         {0xBE, /*1011 1110*/ { "CRSRRT",     etConstant,      0x0004 /*4*/ }},
         {0xBE, /*1011 1110*/ { "CRSRUP",     etConstant,      0x0005 /*5*/ }},
         {0xBE, /*1011 1110*/ { "CRSRDN",     etConstant,      0x0006 /*6*/ }},
         {0xBE, /*1011 1110*/ { "LF",         etConstant,      0x000A /*10*/}},
         {0xBE, /*1011 1110*/ { "CLREOL",     etConstant,      0x000B /*11*/}},
         {0xBE, /*1011 1110*/ { "CLRDN",      etConstant,      0x000C /*12*/}},
         {0xBE, /*1011 1110*/ { "CRSRX",      etConstant,      0x000E /*14*/}},
         {0xBE, /*1011 1110*/ { "CRSRY",      etConstant,      0x000F /*15*/}}};
