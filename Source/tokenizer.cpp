/*************************************************************************************************************************************************/
/* FILE:          tokenizer.cpp                                                                                                                  */
/*                                                                                                                                               */
/* VERSION:       1.30                                                                                                                           */
/*                                                                                                                                               */
/* PURPOSE:       This is the PBASIC Tokenizer source code.  The compiled form of this code (intended to be packaged as a library) accepts a     */
/*                buffer of text containing PBASIC source code and parses and tokenizes it into a memory image to be downloaded and executed by  */
/*                a BASIC Stamp microcontroller.                                                                                                 */
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


/* For Windows .dll release in Microsoft C++:
   Set Project -> Settings
       -> C/C++ 
          -> Category = General
             -> Debug Info = None
             -> Optimization = Minimum Size
             -> Project Options = {remove the "/GZ" switch}
       -> Link
          -> Category = General
             -> Generate Debug Info = unchecked
   Comment DevDebug flag
       -> Find "#define DevDebug", below, and comment it out, ie: "//#define DevDebug"
   Set TokenizerVersion Constant
       -> Find "#define TokenizerVersion...", below, set it to the proper version number
   Comment out extra .dll definitions with a semicolon ';'
       -> In the "tokenizer.def" file, find:
          	GetVariableItems         @9				;Comment this out for release
	        GetSymbolTableItem       @10			;Comment this out for release 
          	GetUndefSymbolTableItem  @11			;Comment this out for release
          	GetElementListItem       @12			;Comment this out for release
          	GetGosubCount		     @13			;Comment this out for release
          and comment out those lines.
   Set the Version attributes on the .dll file with PE Explorer.  

   For Windows .dll debugging in Microsoft C++:
   Set Project -> Settings
       -> C/C++ 
          -> Category = General
             -> Debug Info = Program Database for Edit and Continue
             -> Optimization = Disable (Debug)
             -> Project Options = {add the "/GZ" switch at end, before /c}
       -> Link
          -> Category = General
             -> Generate Debug Info = checked
   Un-Comment DevDebug flag
       -> Find "//#define DevDebug", below, and uncomment it, ie: "#define DevDebug"
   Un-Comment extra .dll definitions
       -> In the "tokenizer.def" file, find:
            ;GetVariableItems         @9			;Comment this out for release
	        ;GetSymbolTableItem       @10			;Comment this out for release 
          	;GetUndefSymbolTableItem  @11			;Comment this out for release
          	;GetElementListItem       @12			;Comment this out for release
          	;GetGosubCount		      @13			;Comment this out for release
          and uncomment those lines.  .

*/


//  #include "stdafx.h"  /* Comment out this line in all NON-WIN32 enviroments*/
#ifdef WIN32
  #include "resource.h"
  #include <initguid.h>
  #include <limits.h>
  #include <ctype.h>    
  #include "tokenizer.h"
  #include "tokenizer_i.c"
#endif
#ifdef LINUX
  #include <unistd.h>
  #include <stdio.h>
  #include <stdint.h>
  #include <string.h>
  #include <dlfcn.h>
  #include <ctype.h>
#endif
#ifdef __APPLE_CC__
  #include <string.h>
  #include <ctype.h>
#endif
#include <stdlib.h>
#include "tokenizertypes.h"  /* Make sure this is the last include! */


#define DevDebug				/*Uncomment this to enable the GetVariableItem, GetSymbolTableItem, GetElementListItem and */
       						/*GetGosubCount routines.  This is only for development support*/

#define TokenizerVersion  130			/*Version of this tokenizer; xyy means version x.yy*/

/*Define forward declarations*/
/*---Published Library Functions---*/
#ifdef __APPLE_CC__
//NOTE: If we ever get the run-time shared library interface working on the Mac, we should be able to uncomment these commented lines
//  #pragma export on         /* Export the following functions when compiling on a Macintosh */

  #if defined(__cplusplus)  /* This wraps the following functions in the c namespace so they don't get*/
    extern "C"              /* changed in the shared library */
    {
  #endif

  STDAPI TestRecAlignment(TModuleRec *Rec);
  uint16_t Version(void);
  #if defined(DevDebug)
    STDAPI GetVariableItems(byte *VBitCount, byte *VBases);
    STDAPI GetSymbolTableItem(TSymbolTable *Sym, int Idx);
    STDAPI GetUndefSymbolTableItem(TUndefSymbolTable *Sym, int Idx);
    STDAPI GetElementListItem(TElementList *Ele, int Idx);
    STDAPI GetGosubCount(void);
  #endif
  STDAPI Compile(TModuleRec *Rec, char *Src, bool DirectivesOnly, bool ParseStampDirective, TSrcTokReference *Ref);
  STDAPI GetReservedWords(TModuleRec *Rec, char *Src);
  
  #if defined(__cplusplus)  /* End of the c namespace */
    }
  #endif

//  #pragma export off        /* End of exported functions when compiling on a Macintosh */  
#endif

/*---Misc---*/
byte       ResWordTypeID(TElementType ElementType);
void       InitializeRec(void);
void       ClearEEPROM(void);
void       ClearSrcTokReference(void);
/*---Expression Engine---(Compiles algebraic expressions)*/
TErrorCode GetReadWrite(bool Write);
TErrorCode GetValueConditional(bool Conditional, bool PinIsConstant, int SplitExpression);
TErrorCode GetExpression(bool Conditional, bool PinIsConstant, int SplitExpression, bool CCDirective);
TErrorCode EnterExpressionConstant(TElementList Element);
TErrorCode EnterExpressionVariable(TElementList Element, bool Write);
TErrorCode EnterExpressionOperator(byte Data);
TErrorCode EnterExpressionBits(byte Bits, word Data);
TErrorCode PushLeft(void);
TErrorCode Push(byte Data);
TErrorCode PopLeft(void);
TErrorCode PopOperators(TElementList *Element);
bool       Pop1Operator(TElementList *Element);
void       CopyExpression(byte SourceNumber, byte DestinationNumber);
TErrorCode EnterExpression(byte ExpNumber, bool Enter1Before);
/*---Symbol Engine---(Builds and searches the Symbol Table)-*/
TErrorCode InitSymbols(void);
TErrorCode AdjustSymbols(void);
TErrorCode EnterSymbol(TSymbolTable Symbol);
TErrorCode EnterUndefSymbol(char *Name);
bool       FindSymbol(TSymbolTable *Symbol);
bool       ModifySymbolValue(const char *Name, word Value);
int        GetSymbolVector(const char *Name);
int        GetUndefSymbolVector(char *Name);
int        CalcSymbolHash(const char *SymbolName);
/*---Element Engine---(Elementizes the source code into the ElementList)-*/
TErrorCode ElementError(bool IncLength, TErrorCode ErrorID);
void       SkipToEnd(void);
TErrorCode GetString(void);
TErrorCode GetNumber(TBase Base, byte DPDigits, word *Result);
TErrorCode GetSymbol(void);
TErrorCode GetFilename(bool Quoted);
TErrorCode GetDirective(void);
TErrorCode EnterElement(TElementType ElementType, word Value, bool IsEnd);
TErrorCode Elementize(bool LastPass);
bool       GetElement(TElementList *Element);
bool       PreviewElement(TElementList *Preview);
void       CancelElements(word Start, word Finish);
void       VoidElements(word Start, word Finish);
void       GetSymbolName(int Start, int Length);
/*---Directive Compilers---(These compile the compile-time items, editor directives and compiler directives)-*/
TErrorCode CompileEditorDirectives(void);
TErrorCode CompileStampDirective(void);
TErrorCode CompilePortDirective(void);
TErrorCode CompilePBasicDirective(void);
TErrorCode CompileCCDirectives(void);
TErrorCode CompileCCIf(void);
TErrorCode CompileCCElse(void);
TErrorCode CompileCCEndIf(void);
TErrorCode CompileCCDefine(void);
TErrorCode CompileCCError(void);
TErrorCode CompileCCSelect(void);
TErrorCode AppendExpression(byte SourceExpression, TOperatorCode AppendOperator);
TErrorCode CompileCCCase(void);
TErrorCode CompileCCEndSelect(void);
TErrorCode CompilePins(bool LastPass);
TErrorCode CompileConstants(bool LastPass);
TErrorCode AssignSymbol(bool *SymbolFlag, word *EEPROMIdx);
TErrorCode EnterData(TElementList *Element, word *EEPROMValue, word *EEPROMIdx, bool WordFlag, bool DefinedFlag, bool LastPass);
TErrorCode CompileData(bool LastPass);
TErrorCode GetModifiers(TElementList *Element);
TErrorCode CompileVar(bool LastPass);
TErrorCode ResolveConstant(bool LastPass, bool CCDefine, bool *Resolved);
TErrorCode GetCCDirectiveExpression(int SplitExpression);
int        GetExpBits(byte Bits, word *BitIdx);
int        RaiseToPower(int Base, int Exponent);
int        ResolveCCDirectiveExpression(void);
/*---Instruction Compilers---(These are the high-level routines that compile actual BASIC Stamp instructions)-*/
TErrorCode CompileInstructions(void);
TErrorCode CompileAuxio(void);
TErrorCode CompileBranch(void);
TErrorCode CompileButton(void);
TErrorCode CompileCase(void);
TErrorCode CompileCount(void);
TErrorCode CompileDebug(void);
TErrorCode CompileDebugIn(void);
TErrorCode CompileDo(void);
TErrorCode CompileDtmfout(void);
TErrorCode CompileElse(void);
TErrorCode CompileEnd(void);
TErrorCode CompileEndIf(void);
TErrorCode CompileEndSelect(void);
TErrorCode CompileExit(void);
TErrorCode CompileFor(void);
TErrorCode CompileFreqout(void);
TErrorCode CompileGet(void);
TErrorCode CompileGosub(void);
TErrorCode CompileGoto(void);
TErrorCode CompileHigh(void);
TErrorCode CompileI2cin(void);
TErrorCode CompileI2cout(void);
TErrorCode CompileIf(bool ElseIf);
TErrorCode CompileInput(void);
TErrorCode CompileIoterm(void);
TErrorCode CompileLcdcmd(void);
TErrorCode CompileLcdin(void);
TErrorCode CompileLcdout(void);
TErrorCode CompileLet(void);
TErrorCode CompileLookdown(void);
TErrorCode CompileLookup(void);
TErrorCode CompileLoop(void);
TErrorCode CompileLow(void);
TErrorCode CompileMainio(void);
TErrorCode CompileNap(void);
TErrorCode CompileNext(void);
TErrorCode CompileOn(void);
TErrorCode CompileOutput(void);
TErrorCode CompileOwin(void);
TErrorCode CompileOwout(void);
TErrorCode CompilePause(void);
TErrorCode CompilePollin(void);
TErrorCode CompilePollmode(void);
TErrorCode CompilePollout(void);
TErrorCode CompilePollrun(void);
TErrorCode CompilePollwait(void);
TErrorCode CompilePulsin(void);
TErrorCode CompilePulsout(void);
TErrorCode CompilePut(void);
TErrorCode CompilePwm(void);
TErrorCode CompileRandom(void);
TErrorCode CompileRctime(void);
TErrorCode CompileRead(void);
TErrorCode CompileReturn(void);
TErrorCode CompileReverse(void);
TErrorCode CompileRun(void);
TErrorCode CompileSelect(void);
TErrorCode GetTimeout(void);
TErrorCode CompileSerin(void);
TErrorCode CompileSerout(void);
TErrorCode CompileShiftin(void);
TErrorCode CompileShiftout(void);
TErrorCode CompileSleep(void);
TErrorCode CompileStop(void);
TErrorCode CompileStore(void);
TErrorCode CompileToggle(void);
TErrorCode CompileWrite(void);
TErrorCode CompileXout(void);
/*---Compiler Routines---(Supporting routines during the compilation process)-*/
TErrorCode GetValue(byte ExpNumber, bool PinIsConstant);
TErrorCode GetRead(byte ExpNumber);
TErrorCode GetWrite(byte ExpNumber);
TErrorCode GetValueEnterExpression(bool Enter1Before, bool PinIsConstant);
TErrorCode GetWriteEnterExpression(void);
TErrorCode EnterOperator(TOperatorCode Operator);
TErrorCode GetEnd(bool *Result);
TErrorCode GetLeft(void);
TErrorCode GetRight(void);
TErrorCode GetLeftBracket(void);
TErrorCode GetRightBracket(void);
TErrorCode GetEqual(void);
TErrorCode GetTO(void);
TErrorCode GetComma(void);
TErrorCode GetQuestion(void);
TErrorCode GetBackslash(void);
TErrorCode CopySymbol(void);
bool       CheckQuestion(void);
bool       CheckBackslash(void);
TErrorCode GetCommaOrBracket(bool *FoundBracket);
TErrorCode GetCommaOrEnd(bool *EndFound);
TErrorCode GetByteVariable(TElementList *Element);
TErrorCode GetUndefinedSymbol(void);
TErrorCode Enter0Code(TInstructionCode Code);
TErrorCode EnterChr(char Character);
TErrorCode EnterText(bool ASCFlag);
TErrorCode CompileInputSequence(void);
TErrorCode CompileOutputSequence(void);
TErrorCode GetAddressEnter(void);
TErrorCode EnterAddress(word Address);
TErrorCode EnterConstant(word Constant, bool Enter1Before);
TErrorCode CountGosubs(void);
int        Lowest(int Value1, int Value2);
TErrorCode NestingError(void);
TErrorCode CCNestingError(void);  
TErrorCode Error(TErrorCode ErrorID);
bool       InBaseRange(char C, TBase Base);
/*---Object Engine---(Generates the EEPROM and PacketBuffer data for successful compilations)-*/
TErrorCode EnterEEPROM(byte Bits, word Data);
void       EnterSrcTokRef(void);
TErrorCode PatchAddress(word SourceAddress);
TErrorCode PatchSkipLabels(bool Exits);
TErrorCode PatchRemainingAddresses(void);
void       PreparePackets(void);


#ifdef WIN32
/*------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------*/
/*                 Start of Windows 32-bit DLL Entry Point Code                 */
/*------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------*/
CComModule _Module;

BEGIN_OBJECT_MAP(ObjectMap)
END_OBJECT_MAP()
/* Implementation of DLL Exports.
   Note: Proxy/Stub Information
         To build a separate proxy/stub DLL, 
         run nmake -f tokenizerps.mk in the project directory.*/

extern "C"
BOOL WINAPI DllMain(HINSTANCE hInstance, DWORD dwReason, LPVOID /*lpReserved*/)
{
    if (dwReason == DLL_PROCESS_ATTACH)
    {
        _Module.Init(ObjectMap, hInstance, &LIBID_TOKENIZERLib);
        DisableThreadLibraryCalls(hInstance);
    }
    else if (dwReason == DLL_PROCESS_DETACH)
        _Module.Term();
    return TRUE;    /* ok */
}

STDAPI DllCanUnloadNow(void)
{ /* Used to determine whether the DLL can be unloaded by OLE*/
  return (_Module.GetLockCount()==0) ? S_OK : S_FALSE;
}

STDAPI DllGetClassObject(REFCLSID rclsid, REFIID riid, LPVOID* ppv)
{ /* Returns a class factory to create an object of the requested type */
  return _Module.GetClassObject(rclsid, riid, ppv);
}

STDAPI DllRegisterServer(void)
{  /* DllRegisterServer - Adds entries to the system registry */
   /* registers object, typelib and all interfaces in typelib */
   return _Module.RegisterServer(TRUE);
}

STDAPI DllUnregisterServer(void)
{  /* DllUnregisterServer - Removes entries from the system registry */
   return _Module.UnregisterServer(TRUE);
}

#endif /*WIN32*/

/*------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------*/
/*                  End of Windows 32-bit DLL Entry Point Code                  */
/*------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------*/



/*------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------*/
/*                             PBASIC Tokenizer Code                            */
/*------------------------------------------------------------------------------*/
/*------------------------------------------------------------------------------*/

//#ifdef __APPLE_CC__
//  #pragma export on       /* Export the following functions when compiling on a Macintosh */
//#endif

#if defined(__cplusplus)  /* This wraps the following functions in the c namespace so they don't get*/
extern "C"                /* changed in the shared library */
{
#endif

STDAPI TestRecAlignment(TModuleRec *Rec)
/*Fill TModuleRec with predefined data.  This is intended to be used only for developers so programmer can check
  alignment of fields within the structure.  For verification, programmer is provided with list of TModuleRec
  elements and exactly what values to expect in each of them after calling this routine. */
{
  int  Idx;
  
  tzModuleRec = Rec; /*Point our ModuleRec variable at 3rd-party structure*/
  /* Set up strings at end of tzModuleRec->PacketBuffer to point all the "char pointers" to*/
  strcpy(((char *)tzModuleRec->PacketBuffer)+sizeof(TPacketType)-18,"4 5 6 7 8 9 10 18"); 
  for (Idx = sizeof(TPacketType)-18+1; Idx < sizeof(TPacketType); Idx+=2){tzModuleRec->PacketBuffer[Idx]=0;if(Idx>(sizeof(TPacketType)-8))Idx++;} /*Add Nulls*/
  /* Set first few elements to be False, Null, True, 2 and 3 */  
  tzModuleRec->Succeeded           							= False;
  tzModuleRec->Error                							= NULL;
  tzModuleRec->DebugFlag			      					= True;
  tzModuleRec->TargetModule			    					= 2;
  tzModuleRec->TargetStart			    					= 3;
  /* Set ProjectFiles to "4" through "10" */
  for (Idx = 0; Idx < 7; Idx++) tzModuleRec->ProjectFiles[Idx] 				= ((char *)tzModuleRec->PacketBuffer)+Idx*2+sizeof(TPacketType)-18;
  /* Set ProjectFilesStart to 11 through 17 */
  tzModuleRec->ProjectFilesStart[0] 							= 11;
  tzModuleRec->ProjectFilesStart[1] 							= 12;
  tzModuleRec->ProjectFilesStart[2] 							= 13;
  tzModuleRec->ProjectFilesStart[3] 							= 14;
  tzModuleRec->ProjectFilesStart[4] 							= 15;
  tzModuleRec->ProjectFilesStart[5] 							= 16;
  tzModuleRec->ProjectFilesStart[6] 							= 17;
  /* Set Port to "18" */
  tzModuleRec->Port					        			= ((char *)tzModuleRec->PacketBuffer)+sizeof(TPacketType)-3;
  /* Set PortStart through ErrorLength to 19, 20, 21, 22, 23 and 24*/
  tzModuleRec->PortStart			      					= 19;
  tzModuleRec->LanguageVersion      							= 20;
  tzModuleRec->LanguageStart		    						= 21;
  tzModuleRec->SourceSize			      					= 22;
  tzModuleRec->ErrorStart			      					= 23;
  tzModuleRec->ErrorLength			    					= 24;
  /* Set all of EEPROM buffer to 25 */
  for (Idx = 0; Idx < EEPROMSize; Idx++) tzModuleRec->EEPROM[Idx] 			= 25;
  /* Set all of EEPROMFlags buffer to 26 */
  for (Idx = 0; Idx < EEPROMSize; Idx++) tzModuleRec->EEPROMFlags[Idx]			= 26;
  /* Set VarCounts through PacketCount to 27 through 31*/
  tzModuleRec->VarCounts[0]			    					= 27;
  tzModuleRec->VarCounts[1]			    					= 28;
  tzModuleRec->VarCounts[2]			    					= 29;
  tzModuleRec->VarCounts[3]			    					= 30;
  tzModuleRec->PacketCount			    					= 31;
  /* Set all of PacketBuffer except last few bytes to 32 */
  for (Idx = 0; Idx < (sizeof(TPacketType)-18); Idx++) tzModuleRec->PacketBuffer[Idx] 	= 32;
  return(True);
}

/*------------------------------------------------------------------------------*/

uint16_t Version(void)
/*Return version number of this tokenizer*/
{
  return(TokenizerVersion);
}

/*------------------------------------------------------------------------------*/

#if defined(DevDebug)
STDAPI GetVariableItems(byte *VBitCount, byte *VBases)
/*Sets VBitCount to VarBitCount and sets elements 0..3 in VBases to VarBases[0..3].  Always returns True.*/
{
  *VBitCount  = VarBitCount;
  *VBases     = VarBases[0];
  *(VBases+1) = VarBases[1];
  *(VBases+2) = VarBases[2];
  *(VBases+3) = VarBases[3];
  return(True);
}

/*------------------------------------------------------------------------------*/

STDAPI GetSymbolTableItem(TSymbolTable *Sym, int Idx)
/*Sets Sym to the SymbolTable element indicated by Idx.  Returns True if successful, false if out of range*/
{
  int CIdx;

  if (Idx < SymbolTablePointer)
	  {/*This is a valid index, return symbol item and true*/
	  Sym->Name[0] = 0;								/*Set Pascal String length*/
	  for (CIdx = 0; CIdx < SymbolSize; CIdx++)					/*Copy symbol name*/
	    {
	    Sym->Name[CIdx+1] = SymbolTable[Idx].Name[CIdx];
	    if (Sym->Name[0] == SymbolTable[Idx].Name[CIdx]) Sym->Name[0] = CIdx;	/*Update Pascal String Length*/
	    }
	  Sym->ElementType = SymbolTable[Idx].ElementType;				/*Copy ElementType*/
	  Sym->Value = SymbolTable[Idx].Value;						/*Copy Value*/
	  Sym->NextRecord = SymbolTable[Idx].NextRecord;				/*Copy NextRecord pointer*/
	  return(True);
	  }
  else /*Index out of range, return false*/
	  return(False);
}

/*------------------------------------------------------------------------------*/

STDAPI GetUndefSymbolTableItem(TUndefSymbolTable *Sym, int Idx)
/*Sets Sym to the UndefSymbolTable element indicated by Idx.  Returns True if successful, false if out of range*/
{
  int CIdx;

  if (Idx < UndefSymbolTablePointer)
	  {/*This is a valid index, return undefined symbol item and true*/
	  Sym->Name[0] = 0;								/*Set Pascal String length*/
	  for (CIdx = 0; CIdx < SymbolSize; CIdx++)					/*Copy symbol name*/
    	{
	    Sym->Name[CIdx+1] = UndefSymbolTable[Idx].Name[CIdx];
	    if (Sym->Name[0] == UndefSymbolTable[Idx].Name[CIdx]) Sym->Name[0] = CIdx;	/*Update Pascal String Length*/
	    }
	    Sym->NextRecord = UndefSymbolTable[Idx].NextRecord;				/*Copy NextRecord pointer*/
	    return(True);
	  }
  else /*Index out of range, return false*/
	  return(False);
}

/*------------------------------------------------------------------------------*/

STDAPI GetElementListItem(TElementList *Ele, int Idx)
/*Sets Ele to the ElementList element indicated by Idx.  Returns True if successful, false if out of range*/
{
  if (Idx < ElementListEnd) 
	{/*Valid index, return pointer and true*/
	Ele->ElementType = ElementList[Idx].ElementType;				/*Copy ElementType*/
	Ele->Value = ElementList[Idx].Value;						/*Copy Value*/
	Ele->Start = ElementList[Idx].Start;						/*Copy Start*/
	Ele->Length = ElementList[Idx].Length;						/*Copy Length*/
	return(True);
	}
  else /*Index out of range, return false*/
	return (False);
}

/*------------------------------------------------------------------------------*/

STDAPI GetGosubCount(void)
/*Returns gosub count*/
{
  return(GosubCount);
}
#endif /* DevDebug */

/*------------------------------------------------------------------------------*/

STDAPI Compile(TModuleRec *Rec, char *Src, bool DirectivesOnly, bool ParseStampDirective, TSrcTokReference *Ref)
/*Compile entire source*/
{
  tzModuleRec = Rec;						     /*Point to external ModuleRec structure*/
  tzSource = Src;                               /*Point to external Source byte array*/
  tzSrcTokReference = Ref;                      /*Point to external Source vs. Token Reference array, if any*/

/*  char src[] = {"PAUSE 1000\nSTOP\0"};*/
/*  strcpy(&tzSource[0],src);*/
/*  tzModuleRec->SourceSize = strlen(&tzSource[0]);*/


  InitializeRec();                              /*Initialize critical tzModuleRec fields*/
  AllowStampDirective = ParseStampDirective;    /*Set flag to parse, or not parse, Stamp Directive*/
  if (AllowStampDirective) tzModuleRec->TargetModule = tmNone;   /*Init target module to None (0)*/
  tzModuleRec->LanguageVersion = 200;           /*Init Language Version*/
  Lang250 = False;

  tzModuleRec->Succeeded = False;				     /*Init to failed status*/

  if (!InitSymbols())                                                /*Initialize symbol table*/
    { /*Initialized all symbols*/
    if (!Elementize(False))                                          /*Elementize editor directives only*/
      { /*Elementized directives successfully*/
      if (!CompileEditorDirectives())                                /*Compile Editor directives*/
        { /*Directives compiled successfully*/
        if (!DirectivesOnly)
          { /*We're to compile entire source, not just directives*/
          if (!AdjustSymbols())                                      /*Adjust symbol table for specified Stamp*/
            { /*Adjusted symbols successfully*/
            if (!Elementize(True))                                   /*Elementize entire source*/
              { /*Elementized source successfully*/
              if (!CompileCCDirectives())                            /*Compile conditional-compile directives*/
                { /*Compiled conditional-compile directives successfully*/
                if (!CompilePins(False))                             /*Try to compile PIN directives*/
                  { /*Tried compiling PIN directives successfully*/
                  if (!CompileConstants(False))                      /*Try to compile CON directives*/
                    { /*Tried Compiling Constants successfully*/
                    if (!CompileData(False))                         /*Try to compile DATA directives*/
                      { /*Tried Compiling Data successfully*/
                      if (!CompileConstants(True))                   /*Compile CON directives*/
                        { /*Compiled Constants successfully*/
                        if (!CompilePins(True))                      /*Compile PIN directives*/
                          { /*Compiled PIN directives successfully*/
                          if (!CompileData(True))                    /*Compile DATA directives*/
                            { /*Compiled Data successfully*/
                            if (!CompileVar(False))                  /*Try to compile VAR directives*/
                              { /*Tried Compiling vars successfully*/
                              if (!CompileVar(True))                 /*Compile VAR directives*/
                                { /*Compiled vars successfully*/
                                if (!CountGosubs())                  /*Count Gosub's*/
                                  { /*Counted Gosubs successfully*/
                                  if (!CompileInstructions())        /*Compile Instructions*/
                                    { /*Compiled Instructions successfully*/
                                    if (!PatchRemainingAddresses())  /*Patch forward code addresses*/
                                      { /*Patched addresses successfully*/
                                      PreparePackets();              /*Prepare download packets*/
                                      tzModuleRec->ErrorStart = 0;   /*Clear Source Start and Source Length*/
                                      tzModuleRec->ErrorLength = 0;
                                      /*If no packets, Error: Nothing to tokenize, otherwise, we've succeeded!*/
                                      if ( (tzModuleRec->PacketCount == 0) && (!DirectivesOnly) ) Error(ecNTT); else tzModuleRec->Succeeded = True;
                                      } /*Patched Addresses*/
                                    } /*Compiled Instructions*/
                                  } /*Counted Gosubs*/
                                } /*Compiled vars*/
                              } /*Tried compiling vars*/
                            } /*Compiled data*/
                          } /*Compiled pins*/
                        } /*Compiled constants*/
                      } /*Tried compiling data*/
                    } /*Tried compiling constants*/
                  } /*Tried compiling PIN directives*/
                } /*Compiled conditional-compile directives*/
              } /*Elementized Source*/
            } /*Adjusted Symbol*/
          }
        else /*Directives only*/
          {
          tzModuleRec->ErrorStart = 0;           /*Clear Source Start and Source Length*/
          tzModuleRec->ErrorLength = 0;
          tzModuleRec->Succeeded = True;         /*Set Succeeded flag*/
          }
        }
      }
    }
  return(tzModuleRec->Succeeded);
}

/*------------------------------------------------------------------------------*/

STDAPI GetReservedWords(TModuleRec *Rec, char *Src)
/*Returns a list of all the reserved words and reserved word types based on the tzModuleRec->LanguageVersion and
tzModuleRec->TargetModule.  The tzModuleRec->LanguageVersion and tzModuleRec->TargetModule fields MUST be set before
calling this routine.

The reserved word list is returned as a series of String/Type pairs in tzModuleRec->Source starting at location 0.
Each reserved word string is null-terminated and the byte following the null is the Type ID. The next String/Type pair
starts on the byte following the previous reserved word's Type ID.  The end of the list of reserved words can be
determined by tzModuleRec->SourceSize or by a null following the last string's Type ID (ie: a null string.).

Returns True if successful, False otherwise.*/
{
  int  SourceIdx;
  int  Idx;

  tzModuleRec = Rec;		           /*Point to external ModuleRec structure*/
  tzSource = Src;                          /*Point to external Source byte array*/

  InitializeRec();                         /*Initialize critical tzModuleRec fields*/
  tzModuleRec->ErrorStart = 0;
  tzModuleRec->ErrorLength = 0;
  tzModuleRec->Succeeded = False;
  if (!((tzModuleRec->LanguageVersion == 200) || (tzModuleRec->LanguageVersion == 250)))
    { /*Invalid version? Error, invalid PBASIC version number.  Must be 2.0 or 2.5*/
    strcpy(&tzSource[MaxSourceSize-1-strlen(Errors[ecIPVNMBTZTF])],Errors[ecIPVNMBTZTF]);
    tzModuleRec->Error = (char *)&(tzSource[MaxSourceSize-1-strlen(Errors[ecIPVNMBTZTF])]);
    }
  else
    { /*Language version okay, continue with symbols*/
    Lang250 = (tzModuleRec->LanguageVersion == 250);
    InitSymbols();                         /*Initialize symbol table (Ignore response, should not fail here)*/
    AdjustSymbols();                       /*Adjust symbols based on LanguageVersion and TargetModule (Ignore response, should not fail here)*/
    SourceIdx = 0;
    for (Idx = 0; Idx < SymbolTablePointer; Idx++)
      { /*For all symbols in SymbolTable...*/
      strcpy(&tzSource[SourceIdx],SymbolTable[Idx].Name);                  /*Store reserved word string*/
      SourceIdx += (int) strlen(SymbolTable[Idx].Name);
      tzSource[SourceIdx] = 0;  /*null-terminate the reserved word string*/
      tzSource[SourceIdx+1] = ResWordTypeID(SymbolTable[Idx].ElementType); /*Store reserved word type*/
      SourceIdx += 2;
      }
    tzSource[SourceIdx] = 0;    /*null-terminate the reserved words list*/
    tzModuleRec->SourceSize = SourceIdx;
    tzModuleRec->Succeeded = True;
    }
  return(tzModuleRec->Succeeded);
}

#if defined(__cplusplus)        /* End of the c namespace */
}
#endif

//#ifdef __APPLE_CC__
//  #pragma export off            /* End of exported functions when compiling on a Macintosh */
//#endif

/*------------------------------------------------------------------------------*/

byte ResWordTypeID(TElementType ElementType)
/*Translate similar types to the common type*/
{
  byte Result;

  Result = (byte)ElementType;                            /*Assume type needs no translation*/

  /*Translate if necessary*/
  switch (ElementType)
    {
    case etCCDirective  :
    case etCCThen       : Result = (byte)etCCDirective;  /*GRW: etCCDirective*/
                          break;
    case etInstruction  :
    case etData         :
    case etStep         :
    case etTo           :
    case etThen         :
    case etWhile        :
    case etUntil        : Result = (byte)etInstruction;  /*GRW: etInstruction*/
                          break;
    case etCon          :
    case etPin          :
    case etVar          : Result = (byte)etCon;          /*GRW: etDeclaration*/
                          break;
    case etVariableAuto : Result = (byte)etVariableAuto; /*GRW: etVariableType*/
                          break;
    case etAnyNumberIO  :
    case etASCIIIO      :
    case etNumberIO     :
    case etRepeatIO     :
    case etSkipIO       :
    case etSpStringIO   :
    case etStringIO     :
    case etWaitIO       :
    case etWaitStringIO : Result = (byte)etAnyNumberIO;  /*GRW: etIOFormatter*/
                          break;
    case etCond1Op      :
    case etCond2Op      :
    case etCond3Op      : Result = (byte)etCond1Op;      /*GRW: etConditionalOp*/
                          break;
    case etLeft         :
    case etRight        : Result = (byte)etLeft;         /*GRW: etParentheses*/
                          break;
    case etLeftBracket  :
    case etRightBracket : Result = (byte)etLeftBracket;  /*GRW: etBrackets*/
                          break;
    default             : break;                         /*All other ElementTypes, no translation*/
    }
  return(Result);
}

/*------------------------------------------------------------------------------*/

void InitializeRec(void)
/*Initialize most critical fields of tzModuleRec*/
{
  int  Idx;

  tzModuleRec->Error = NULL;                    /*Init Error string, Project Files array and TargetModule (if allowed)*/
  for (Idx = 0; Idx <= (sizeof(tzModuleRec->ProjectFiles) / sizeof(char *)); Idx++)
	{
	tzModuleRec->ProjectFiles[Idx] = NULL;
	tzModuleRec->ProjectFilesStart[Idx] = 0;
	}
  tzModuleRec->TargetStart = 0;
  tzModuleRec->Port = NULL;                     /*Init Port number*/
  tzModuleRec->PortStart = 0;
  tzModuleRec->LanguageStart = 0;
  ClearEEPROM();                                /*Clear EEPROM*/
  ClearSrcTokReference();                       /*Clear Source vs Token Cross Reference*/
}

/*------------------------------------------------------------------------------*/

void ClearEEPROM(void)
/*Clear EEPROM byte array (to all 0's)*/
{
  int  Idx;

  for (Idx = 0; Idx < sizeof(tzModuleRec->EEPROM); Idx++) tzModuleRec->EEPROM[Idx] = 0;
  for (Idx = 0; Idx < sizeof(tzModuleRec->EEPROMFlags); Idx++) tzModuleRec->EEPROMFlags[Idx] = 0;
}

/*------------------------------------------------------------------------------*/

void ClearSrcTokReference(void)
/*Clear the source code vs bit token cross reference list and initialize the index*/
{
  int  Idx;

  if (tzSrcTokReference != NULL)
    {
    for (Idx = 0; Idx < SrcTokRefSize; Idx++)
      {
      (tzSrcTokReference+Idx)->SrcStart = 0;
      (tzSrcTokReference+Idx)->TokStart = 0;
      }
    }
  SrcTokReferenceIdx = 0;
}


/*------------------------------------------------------------------------------*/
/*----------------------------- Expression Engine ------------------------------*/
/*------------------------------------------------------------------------------*/

/* Five expression compilations can be performed:

       GetReadWrite(False)                 Variable read expression
       GetReadWrite(True)                  Variable write expression
       GetValueConditional(False,False,0)  Value expression (Pin-types are variables, split expression argument is ignored)
       GetValueConditional(False,True,0)   Value expression (Pin-types are constants, split expression argument is ignored)
       GetValueConditional(True,False,X)   Conditional expression (Pin-type argument is ignored, Pin-types are always constants, (split expression if X<>0)

  The bit-stream result goes into Expression (1 word for size + 31 words for data)
  and may be entered into eeprom via EnterExpression.

  A '0' or '1' must be entered separately to tell the run-time expression
  resolver to terminate or continue.

  StackIdx must be initialized and is adjusted and tested according to operations.

  CopyExpression(SourceNum, DestNum) may be used to buffer out-of-order expressions.*/


//Variable read/write syntax rules:             i.e.  b1.bit0(b0*/$280+n1)
/*
       variable
       variable (value expression)

  Value expression syntax rules:                i.e.  4/(cos b1(b0) atn 127)+1

       Any one of these...     Must be followed by any one of these...
       ------------------------------------------------------------------
       constant                binary operator
       variable*               )
       )                       <end>

       Any one of these...     Must be followed by any one of these...**
       ------------------------------------------------------------------
       unary operator          constant
       binary operator         variable*
       (                       unary operator
                               (

       *  variable may be indexed
       ** initial element of an expression

  Conditional expression rules (additional):    i.e.  var+3/y <= 2+(x*y) or z=1

       This...                 Becomes this...         Treated as...
       ------------------------------------------------------------------
       <start>                 ((
          cond1                 ) cond1 (              binary operator
          cond2                )) cond2 ((             binary operator
       (( cond3                   cond3 ((             unary operator
       <end>                   ))


  Expression compilation process:

       When this is read...    This is done...
       ------------------------------------------------------------------
       constant                It is entered into the buffer...

       variable                It is entered into the buffer...

       variable (index)        Index is entered into the buffer, then
                               variable is entered into the buffer...

       ')'                     A '(' is popped from the operator stack...

                               ...Then, all operators before a '(' or until
                               <empty> are popped from the operator stack
                               and entered into the buffer.

       operator                It is pushed onto the operator stack.

       '('                     It is pushed onto the operator stack.

               Note:   After the first operation command is written, all
                       following commands are preceeded by '1'.*/

TErrorCode GetReadWrite(bool Write)
/*Get variable read/write expression.
  Write = True causes a write expression to be retrieved.
  Write = False causes a read expression to be retrieved.*/
{
  TErrorCode    Result;
  TElementList  Element;

  ExpStackTop = 0;                   /*Reset expression stack pointers*/
  ExpStackBottom = 0;
  Expression[0][0] = 0;              /*Reset expression size*/
  GetElement(&Element);              /*Get variable*/
  if (!((Element.ElementType == etVariable) || (Element.ElementType == etPinNumber))) return(Error(ecEAV));            /*Not variable or pin? Error: Expected a Variable*/
  if ((Element.ElementType == etPinNumber) && (Write)) Element.Value = Element.Value + 16;                           /*If PIN type and Write = True, convert to OUTx variable, otherwise it is treated as INx variable*/
  if ((Result = EnterExpressionVariable(Element, Write))) return(Result);   /*Enter variable*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetValueConditional(bool Conditional, bool PinIsConstant, int SplitExpression)
/*Set Condition True if retrieving conditional statement, set Condition False if retrieving Value statement.*/
{
  TErrorCode    Result;

  ExpStackTop = 0;                                                                              /*Reset expression stack pointers*/
  ExpStackBottom = 0;
  Expression[0][0] = 0;                                                                         /*Reset expression size*/
  if ((Result = GetExpression(Conditional,PinIsConstant,SplitExpression,False))) return(Result);  /*Get and enter expression*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetExpression(bool Conditional, bool PinIsConstant, int SplitExpression, bool CCDirective)
/*Get value or conditional expression and enter into Expression. This procedure is re-enterant.
 Conditional = True:  expression is parsed as a conditional expression and if we're in a SELECT CASE block, SplitExpression is
                      used to indicate the starting element of the second half of the split expression.
                      0: Not a Split-Expression Conditional, <> 0: Split-Expression Conditional
                      >0: Split-Expression Conditional and second half of expression begins at element SplitExpression
                      CCDirective = True : expression is considered a constant expression for conditional-compile directives
                      CCDirective = False: expression is considered a run-time expression.
 Conditional = False: expression is parsed as a value expression and PinIsConstant determins how to evaluate PinNumber
                      elements.
                      PinIsConstant = True:  PinNumber elements are evaluated as constants (equal to a pin number).
                      PinIsConstant = False: PinNumber elements are evaluated as variables (equal to INx).
                      CCDirective must be False.*/
{
  typedef enum TExpressionState {esValue, esLeft, esOperator, esConditional, esConstVar, esPop, esEndCondition, esEndValue, esDone} TExpressionState;
   
  TErrorCode        Result;
  byte              OldParenCount;
  byte              OldExpStackTop;
  byte              OldExpStackBottom;
  TElementList      Element;
  TExpressionState  State;

  OldParenCount = ParenCount;           /*Save '(' counter and expression stack pointers*/
  OldExpStackTop = ExpStackTop;
  OldExpStackBottom = ExpStackBottom;
  ParenCount = 0;                       /*Reset '(' counter*/
  ExpStackBottom = ExpStackTop;         /*Set bottom stack pointer*/
  if (!Conditional) State = esValue; else State = esConditional;
  while (State != esDone)
    { /*While not done*/
    switch (State)
      {
      case esConditional : /*Conditional*/
                           if ((Result = PushLeft())) return(Result);   /*Push '('*/
                           do
                             {
                             if ((Result = PushLeft())) return(Result); /*Push '('*/
                             GetElement(&Element);                    /*Get next element*/
                             }
                           while (Element.ElementType == etLeft);     /*Keep pushing '(' for all '('s found*/
                           if (Element.ElementType == etCond3Op)
                             { /*Cond3 unary operator*/
                             if (SplitExpression != 0) return(Error(ecEACVUOOL)); /*SplitExpression? "NOT" is unacceptable.  Error, expected a Constant, Variable, Unary Operator or '('*/
                             ExpStackTop -= 2;                        /*Decrement StackTop, ie: Pop '('*/
                             ParenCount -= 2;                         /*Decrement '(' counter*/
                             if ((Result = Push((byte)Element.Value))) return(Result); /*Push Cond3*/
                             } /*Cond3 unary operator*/
                           else
                             { /*Start of value*/
                             ElementListIdx--;                        /*Back up to previous element*/
                             State = esValue;
                             } /*Start of value*/
                           break;
      case esLeft        : /*Left '('*/
                           Element.Value = 0x80;                      /*Push '('*/
                           ParenCount++;                              /*increment '(' counter*/
                           State = esOperator;
                           break;
      case esOperator    : /*Operator*/
                           if ((Result = Push((byte)Element.Value))) return(Result);   /*Push operator*/
                           State = esValue;
                           break;
      case esValue       : /*Value*/
                           GetElement(&Element);                      /*after unary, binary, '(', constant, variable, unary*/
                           switch (Element.ElementType)
                             {
                             case etUndef        : if (!CCDirective) return(Error(ecUS));                /*Error: Undefined Symbol*/
                                                   if (Symbol.NextRecord == 1) return(Error(ecISICCD));  /*Error, Illegal symbol in conditional-compile directive*/
                                                   Element.ElementType = etConstant;                     /*Must be undefined symbol in CCDirective, substitute a constant of 0*/
                                                   Element.Value = 0;
                                                   State = esConstVar;
                                                   break;
                             case etConstant     :
                             case etVariable     :
                             case etPinNumber    : State = esConstVar;   /*Constant, Variable or PinNumber*/
                                                   break;
                             case etCCConstant   : if (!CCDirective)
                                                     return(Error(ecEACVUOOL)); /*Error, expected a Constant, Variable, Unary Operator or Label*/
                                                   else
                                                     State = esConstVar; /*Define*/
                                                   break;
                             case etDirective    :
                             case etTargetModule : if (CCDirective) State = esConstVar; else return(Error(ecEACVUOOL));  /*Error, expected a Constant, Variable, Unary Operator or '('*/
                                                   break;
                             case etUnaryOp      : if (!CCDirective) State = esOperator; else return(Error(ecIOICCD));   /*Unary Operator.  If CCDirective, error, illegal operator in conditional-compile directive*/
                                                   break;
                             case etBinaryOp     : /*'-' as 'neg' unary operator?*/
                                                   if (Element.Value != ocSub) 
                                                     if (!CCDirective) return(Error(ecEACVUOOL)); else return(Error(ecENEDDSON)); /*Error, expected a Constant, Variable, Unary Operator or '('  --OR--  Error, expected number, editor directive, DEFINE'd symbol or '-'*/
                                                   Element.Value = ocNeg;
                                                   State = esOperator;
                                                   break;
                             case etLeft         : State = esLeft;       /*'('*/
                                                   break;
                             default             : if (!CCDirective)
                                                     return(Error(ecEACVUOOL));/*Error, expected a Constant, Variable, Unary Operator or Label*/
                                                   else
                                                     return(Error(ecENEDDSON));/*Error, expected number, editor directive, DEFINE'd symbol or '-'*/
                             } /*Case*/
                           break;
      case esConstVar    : /*Constant or Variable*/
                           /*Enter Constant, Variable, PinNumber (treated as constant if PinIsConstant = True, or as INx if PinIsConstant = False) Directive or Define (treated as constant)*/
                           if ( (Element.ElementType == etConstant) ||
                                ((Element.ElementType == etPinNumber) && (PinIsConstant)) ||
                                (((Element.ElementType == etDirective) || (Element.ElementType == etTargetModule)) && (CCDirective)) ||
                                ((Element.ElementType == etCCConstant) && (CCDirective)) ) { if ((Result = EnterExpressionConstant(Element))) return(Result); } else if ((Result = EnterExpressionVariable(Element,False))) return(Result); 
                           State = esPop;
                           break;
      case esPop         : /*Pop and enter any operators*/
                           if ((Result = PopOperators(&Element))) return(Result);
                           GetElement(&Element);                    /*after constant or variable, expect ')', binary, <end>*/
                           if ( (SplitExpression > 0) && (ElementListIdx == SplitExpression+1) )
                             { /*Start of second half of split expression, check for conditional operator*/
                             if (Element.ElementType != etCond1Op)
                               {   /*SELECT's CASE has no leading conditional, use AutoInsert*/
                               --ElementListIdx;
                               Element.ElementType = etCond1Op;
                               Element.Value = (word)NestingStack[NestingStackIdx-1].AutoCondOp;
                               }
                             else  /*SELECT's CASE has leading conditional*/
                               if (NestingStack[NestingStackIdx-1].AutoCondOp != ocE) return(Error(ecEACVUOOL)); /*AutoInsert not '='? Error, expected a constant, variable, unary operator or '('*/
                             SplitExpression = -1;                  /*Clear condition to disallow duplicate AutoInserts*/
                             } 
                           switch (Element.ElementType)
                             {
                             case etUndef      : return(Error(ecUS));  /*Error: Undefined Symbol*/
                                                 break;
                             case etCond1Op    : /*Cond1 binary operator*/
                                                 if (!Conditional) return(Error(ecEABOOR)); /*if not conditional, Error: Expected A Binary Operator or ')'*/
                                                 if ((Result = PopLeft())) return(Result);    /*Do ')'*/
                                                 if ((Result = Push((byte)Element.Value))) return(Result); /*Push cond1 binary operator*/
                                                 State = esLeft;           /*Push '('*/
                                                 break;
                             case etCond2Op    : /*Cond2 binary operator*/
                                                 if ( (!Conditional) || (SplitExpression != 0) ) return(Error(ecEABOOR)); /*if not conditional, Error: Expected A Binary Operator or ')'*/
                                                 if ((Result = PopLeft())) return(Result);    /*Do '(' twice*/
                                                 if ((Result = PopLeft())) return(Result);
                                                 if ((Result = Push((byte)Element.Value))) return(Result); /*Push cond2 binary operator*/
                                                 State = esConditional;
                                                 break;
                             case etBinaryOp   : if ( (CCDirective) && (IllegalCCDirectiveOperator(Element.Value)) ) return(Error(ecIOICCD)); /*Illegal operator in conditional-compile directive*/
                                                 State = esOperator;
                                                 break;
                             case etRight      : /*'('*/
                                                 if ( (Conditional) && (ParenCount == 2) ) State = esEndCondition; /*Conditional and 2 '(' on stack? Then End*/
                                                 if (State != esEndCondition)
                                                   { /*Must not be conditional, or could be conditional but not 2 '(' on stack*/
                                                   ParenCount--;  /*Decrement '(' counter*/
                                                   /*Pop '(' from expression stack, if not empty, pop operators, else we're done*/
                                                   if (Pop1Operator(&Element)) State = esPop; else State = esDone;
                                                   }
                                                 break;
                             case etConstant   :
                             case etVariable   :
                             case etUnaryOp    :
                             case etLeft       : return(Error(ecEABOOR));    /*Error: Expected A Binary Operator or ')'*/
                             default           : /*End of expression*/
                                                 if (SplitExpression < 1) /*Normal condition or value*/
                                                   {
                                                   if (!Conditional) State = esEndValue; else State = esEndCondition;
                                                   }
                                                 else                     /*SELECT condition, move to second half of split expression*/
                                                   ElementListIdx = SplitExpression;
                                                 break;
                             } /*Switch*/
                           break;
      case esEndCondition: /*End of condition*/
                           if ((Result = PopLeft())) return(Result);  /*Pop '(' at least twice*/
                           if ((Result = PopLeft())) return(Result);
                           if (ExpStackTop == ExpStackBottom) 
                             State = esDone;          /*If stack empty, we're done*/
                           else
                             return(Error(ecEABOOR)); /*else, Error: Expected A Binary Operator or ')'*/
                           break;
      case esEndValue    : /*End of value*/
                           if (ExpStackTop == ExpStackBottom)
                             State = esDone;          /*If stack empty, we're done*/
                           else
                             return(Error(ecEABOOR)); /*else, Error: Expected A Binary Operator or ')'*/
                           break;
      case esDone        : /*We're done*/
                           break;
      } /*Switch*/
    }  /*While not done*/
  ElementListIdx--;                   /*Done, back up one element*/
  ParenCount = OldParenCount;         /*Restore '(' counter and expression stack pointers*/
  ExpStackTop = OldExpStackTop;
  ExpStackBottom = OldExpStackBottom;
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode EnterExpressionConstant(TElementList Element)
/*Enter constant in Element.Value into Expression*/
{
  TErrorCode  Result;
  byte        BitCount;   /*Number of bits - 1 of constant*/
  word        Bit;        /*2^n value of current bit*/

  /*Determine Value's number of bits - 1 (from leftmost "1" in binary pattern*/
  BitCount = 15;
  Bit      = 32768;
  while ( (Bit > 1) && ((Element.Value & Bit) == 0) )
    {
    BitCount--;
    Bit /= 2;
    }
  if ((Result = EnterExpressionOperator(0x20 | BitCount))) return(Result);  /*Enter constant operator (%100000 or'd with BitCount*/
  if ( (Element.Value == 0) || (Element.Value == (Element.Value & Bit)) )
    { /*if Value is 2^n or 0, shift left 1 bit and set LSB to 0 (if 2^n) or 1 (if 0)*/
    /*Note, the following commented code appears unnecessary. Removed 1/30/02*/
    Element.Value = (Element.Value == 0) ? 1 : 0;
    BitCount = 0;
    }
  if ((Result = EnterExpressionBits(BitCount+1, Element.Value))) return(Result);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode EnterExpressionVariable(TElementList Element, bool Write)
/*Enter variable in Value into Expression (may be indexed).*/
{
  TErrorCode    Result;
  TElementList  Preview;

  if ((Result = GetModifiers(&Element))) return(Result);
  PreviewElement(&Preview);
  if (Preview.ElementType == etLeft)
    { /*'(' follows, we're indexed*/
    ElementListIdx++;
    if ((Result = PushLeft())) return(Result);                        /*Limit re-entrancy*/
    if ((Result = GetExpression(False,True,0,False))) return(Result); /*Get index expression*/
    ExpStackTop--;                                                  /*Decrement expression stackpointer, limit re-entrancy*/
    if ((Result = GetRight())) return(Result);                        /*Get ending ')'*/
    /*Enter variable operator*/
    Element.Value = Element.Value | 0x400;                          /*Set index bit (%000100 00000000)*/
    }
  /*We're either direct addressing or done processing indexed addressing*/
  if (Write) Element.Value = Element.Value | 0x0800;   /*Set write bit (%001000 00000000)*/
  /*Enter Read/Write, Indexed/NonIndexed variable operator*/
  if ((Result = EnterExpressionOperator( ((Element.Value & 0xFF00) | 0x0030) | (Element.Value >> 8) ))) return(Result);
  /*Enter variable address*/
  Element.Value = Element.Value & 0x03FF;  /*Strip "index" and "write" bits (if any)*/
  if ((Element.Value & 0x0F00) == 0) Element.Value = (Element.Value & 0x00FF) | 0x0F00;  /*Calculate size via type*/
  Element.Value = Element.Value ^ 0x0700;                                                /*This completes the calculation*/
  if ((Result = EnterExpressionBits(Element.Value >> 8, Element.Value))) return(Result);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode EnterExpressionOperator(byte Data)
/*Enter 6-bit operator in Data into Expression.  If not first operator, '1' will
preceed 6-bit code.  StackIdx is tested and updated according to operator.*/
{
  TErrorCode  Result;

  if ( (Data == ocSqr) || (Data == ocAtn) )   /*Operator is SQR or ATN, check for headroom*/
    if (StackIdx == 8) return(Error(ecEITC)); /*Error: Expression Is Too Complex*/
  if (Data > ocSin) 
    { /*Not unary operator*/
    if (Data > 0x1F)
      { /*Not binary/conditional operator*/
      if (Data <= 0x33)
        { /*Is a constant read or direct read*/
        if (StackIdx == 8)
          return(Error(ecEITC)); /*Error: Expression Is Too Complex*/
        else
          StackIdx++;            /*Stack up*/
        } /*Is a constant read or direct read*/
      /*If Indexed Write (ie: not indexed read or direct write), stack down*/
      if (Data > 0x3B) StackIdx--;
      } /*Not binary/conditional operator*/
    else
      StackIdx--;  /*Stack down*/
    } /*Not unary operator*/
  /*Enter Expression Bits (7 bits if not first operator, 6 bits if first operator. Also, set bit 6 in case of 7-bits*/
  if ((Result = EnterExpressionBits(7-((Expression[0][0] == 0)?1:0), Data | 0x40))) return(Result);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode EnterExpressionBits(byte Bits, word Data)
/*Enter Bits bits of Data into Expression*/
{
  byte ShiftFactor;

  Data = Data << (16-Bits); /*MSB-justify data (to truncate off left side)*/
  while (Bits > 0)
    { /*While more bits to insert*/
    ShiftFactor = Expression[0][0] & 15;               /*Calculate bit offset*/
    if (ShiftFactor == 0) Expression[0][Expression[0][0] / /*div*/ 16 + 1] = 0; /*If new Expression word, clear it to 0*/
    /*Enter the expression data (shifting current data left*/
    Expression[0][Expression[0][0] / /*div*/ 16 + 1] = (Expression[0][Expression[0][0] / /*div*/ 16 + 1] << Lowest(16-ShiftFactor,Bits)) | (Data >> (16-Lowest(16-ShiftFactor,Bits)));
    Data = Data << (16-ShiftFactor);                   /*Adjust Data in anticipation for next Expression word*/
    Expression[0][0] += Lowest(Bits,16-ShiftFactor);   /*Adjust Expression Index according to how many bits actually written*/
    if (Expression[0][0] == ExpressionSize-16) return(Error(ecEITC)); /*If Expression array full, Error: Expression Is Too Complex*/
    Bits -= Lowest(16-ShiftFactor,Bits);               /*Decrement Bits counter appropriately*/
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode PushLeft(void)
/*Push '(' onto ExpressionStack.  ExpStackTop incremented*/
{
  TErrorCode  Result;

  ParenCount++;                             /*Increment '(' counter*/
  if ((Result = Push(0x80))) return(Result);  /*Push '('*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode Push(byte Data)
/*Push Data onto ExpressionStack.  ExpStackTop incremented*/
{
  if (ExpStackTop == 255) return(Error(ecEITC));    /*Out of stack space?  Error: Expression Is Too Complex*/
  ExpStackTop++;                                    /*Increment Stack Top pointer*/
  ExpressionStack[ExpStackTop-1] = Data;
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode PopLeft(void)
/*Pop '(' then pop and enter operators from ExpressionStack into Expression before '('
or until empty.*/
{
  TErrorCode    Result;
  TElementList  Element;

  ExpStackTop--;                                            /*Decrement expression stack top (Pop '(')*/
  ParenCount--;                                             /*Decrement '(' counter*/
  if ((Result = PopOperators(&Element))) return(Result);      /*Pop and enter any operators*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode PopOperators(TElementList *Element)
/*Pop and enter operators from ExpressionStack into Expression before a '(' or until
empty.*/
{
  TErrorCode      Result;
  bool            PopResult;

  PopResult = Pop1Operator(Element);
  while ( PopResult && (Element->Value != 0x80) )
    {
    if ((Result = EnterExpressionOperator((byte)Element->Value))) return(Result);
    PopResult = Pop1Operator(Element);
    }
  ExpStackTop += (PopResult && (Element->Value == 0x80)) ? 1 : 0; /*Increment Stack Top, keep '(' on stack, if '(' found*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

bool Pop1Operator(TElementList *Element)
/*Pop operator from ExpressionStack into Element.Value.  ExpStackTop adjusted
and compared to ExpStackBottom.  Returns true if value popped, false if stack empty.*/
{
  bool       Result;

  Result = False;               /*Assume false*/
  if (ExpStackTop > ExpStackBottom)
    { /*Stack is not empty*/
    ExpStackTop--;
    Element->Value = ExpressionStack[ExpStackTop];
    Result = True;
    }
  return(Result);
}

/*------------------------------------------------------------------------------*/

void CopyExpression(byte SourceNumber, byte DestinationNumber)
/*Copy expression from Expression[SourceNumber,...] to Expression[DestinationNumber,...].
SourceNumber and DestinationNumber must be 0 to 3*/
{
  int   Idx;

  for (Idx = 0; Idx <= (ExpressionSize / /*div*/ 16) - 1; Idx++) Expression[DestinationNumber][Idx] = Expression[SourceNumber][Idx];
}

/*------------------------------------------------------------------------------*/

TErrorCode EnterExpression(byte ExpNumber, bool Enter1Before)
/*Enter expression(ExpNumber) into EEPROM.  Preceede expression with a 1 if
Enter1Before is true. ExpNumber should be 0 to 3*/
{
  TErrorCode  Result;
  int         Idx;

  if (Enter1Before) { if ((Result = EnterEEPROM(1,1))) return(Result); }
  Idx = 0;
  while (Idx < Expression[ExpNumber][0])
    { /*for all bits in expression...*/
    if ((Result = EnterEEPROM(Lowest(16,Expression[ExpNumber][0]-Idx),Expression[ExpNumber][Idx / /*div*/ 16 + 1]))) return(Result);
    Idx += Lowest(16,Expression[ExpNumber][0]-Idx);
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/
/*------------------------------- Symbol Engine --------------------------------*/
/*------------------------------------------------------------------------------*/

TErrorCode InitSymbols(void)
/*Clear all vectors (SymbolVector and UndefSymbolVector array and SymbolTable.NextRecord and
UndefSymbolTable.NextRecord) to -1, clear SymbolTablePointer and UndefSymbolTablePointer to 0,
and insert all automatic symbols into SymbolTable.*/
{
  int         Idx;
  TErrorCode  Result;

  /*Clear All Vectors*/
  for (Idx = 0; Idx < SymbolTableSize; Idx++)
    {
    SymbolVectors[Idx] = -1;
    SymbolTable[Idx].NextRecord = -1;
    UndefSymbolVectors[Idx] = -1;
    UndefSymbolTable[Idx].NextRecord = -1;
    }
  SymbolTablePointer = 0;
  UndefSymbolTablePointer = 0;
  /*Enter automatic common symbols*/
  for (Idx = 0; Idx < (sizeof(CommonSymbols)/sizeof(TSymbolTable)); Idx++) if ((Result = EnterSymbol(CommonSymbols[Idx]))) return(Result);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode AdjustSymbols(void)
/*Add additional automatic symbols into symbol table for designated target module and PBASIC Language version.*/
{
  int         Idx;
  word        LangMask;
  const  int  Target[tmNumElements] = {0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20};
  TErrorCode  Result;

  if ( !((tzModuleRec->TargetModule >= (byte)tmBS2) && (tzModuleRec->TargetModule < tmNumElements)) )
    { /*Error, Unknown target module*/
    tzModuleRec->ErrorStart = 0;
    tzModuleRec->ErrorLength = 0;
    return(Error(ecUTMSDNF));
    }        
  LangMask = 0x40 << (Lang250 ? 1 : 0);  /*Determine language version mask*/
  /*Enter automatic symbols for designated target module and PBASIC Language version*/
  for (Idx = 0; Idx <= CustomSymbolTableSize; Idx++)
    if ( (CustomSymbols[Idx].Targets & (Target[tzModuleRec->TargetModule] | LangMask)) == (Target[tzModuleRec->TargetModule] | LangMask)) if ((Result = EnterSymbol(CustomSymbols[Idx].Symbol))) return(Result);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode EnterSymbol(TSymbolTable Symbol)
/*Enter symbol into next available location in SymbolTable*/
{
  int Vector;

  if (SymbolTablePointer >= SymbolTableSize) return(Error(ecSTF));
  Vector = CalcSymbolHash(Symbol.Name);
  if (SymbolVectors[Vector] == -1)  /*If this hash is unused, set it to next record in SymbolTable*/
    SymbolVectors[Vector] = SymbolTablePointer;
  else
    {                               /*If hash is used, move to first record, find end of chain and add new record*/
    Vector = SymbolVectors[Vector];
    while (SymbolTable[Vector].NextRecord > -1) Vector = SymbolTable[Vector].NextRecord; /*chain to the last record*/
    SymbolTable[Vector].NextRecord = SymbolTablePointer;
    }
  strcpy(SymbolTable[SymbolTablePointer].Name, Symbol.Name);
  SymbolTable[SymbolTablePointer].ElementType = Symbol.ElementType;
  SymbolTable[SymbolTablePointer].Value = Symbol.Value;
  SymbolTablePointer++;
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode EnterUndefSymbol(char *Name)
/*Enter undefined symbol into next available location in UndefSymbolTable.  The Undefined Symbol Table is used to record
 undefined symbol names that are DATA, VAR, CON or PIN types so they can be distinguished from un-DEFINE'd symbols in the
 GetExpression routine while parsing Conditional Compile Directive expressions.*/
{
  int  Vector;

  if (UndefSymbolTablePointer >= SymbolTableSize) return(Error(ecSTF));
  Vector = CalcSymbolHash(Name);
  if (UndefSymbolVectors[Vector] == -1) /*If this hash is unused, set it to next record in UndefSymbolTable*/
    UndefSymbolVectors[Vector] = UndefSymbolTablePointer;
  else
    {                               /*If hash is used, move to first record, find end of chain and add new record*/
    Vector = UndefSymbolVectors[Vector];
    while (UndefSymbolTable[Vector].NextRecord > -1) Vector = UndefSymbolTable[Vector].NextRecord; /*chain to the last record*/
    UndefSymbolTable[Vector].NextRecord = UndefSymbolTablePointer;
    }
  strcpy(UndefSymbolTable[UndefSymbolTablePointer].Name, Name);
  UndefSymbolTablePointer++;
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

bool FindSymbol(TSymbolTable *Symbol)
/*Find Symbol.Name in SymbolTable.  Returns true if successful and sets Symbol.ElementType and Symbol.Value.
  Returns false if not found and Symbol.ElementType = etUndef and Symbol.Value = 0;*/
{
  int  Vector;
  bool Result;

  /*Initialize to false*/
  Result = False;
  Symbol->ElementType = etUndef;
  Symbol->Value = 0;
  Symbol->NextRecord = 0; /*Indicates undefined DEFINE symbol (if symbol not found in symbol table)*/
  /*Look for symbol and return its type and value if found*/
  Vector = GetSymbolVector(Symbol->Name);
  if (Vector > -1)
    {  /*Found symbol, retrieve ElementType and Value*/
    Symbol->ElementType = SymbolTable[Vector].ElementType;
    Symbol->Value = SymbolTable[Vector].Value;
    Result = True;
    }
  else /*Symbol not found, check Undefined Symbol Table*/
    Symbol->NextRecord = (GetUndefSymbolVector(Symbol->Name) > -1 ? 1 : 0); /*NextRecord = 1 indicates undefined non-DEFINE symbol*/
  return(Result);
}

/*------------------------------------------------------------------------------*/

bool ModifySymbolValue(const char *Name, word Value)
/*Find Name in SymbolTable and modify its value.  Returns true if successful.
Returns false if not found;*/
{
  int  Vector;

  Vector = GetSymbolVector(Name);
  if (Vector > -1) SymbolTable[Vector].Value = Value; /*Symbol found?  Modify symbol table's .Value for this symbol*/
  return (Vector > -1);
}

/*------------------------------------------------------------------------------*/

int GetSymbolVector(const char *Name)
/*Find vector (element number) of Symbol.Name in SymbolTable.  Returns value >= 0 if successful
Returns -1 if fails.*/
{
  int  Result;

  Result = SymbolVectors[CalcSymbolHash(Name)];
  /*Search until symbols match or end of branch found*/
                          
  while ((Result > -1) && (strcmp(SymbolTable[Result].Name,Name) != 0)) Result = SymbolTable[Result].NextRecord;
  return(Result);
}

/*------------------------------------------------------------------------------*/

int GetUndefSymbolVector(char *Name)
/*Find vector (element number) of Symbol.Name in UndefSymbolTable.  Returns value >= 0 if successful.
Returns -1 if fails.*/
{
  int  Result;

  Result = UndefSymbolVectors[CalcSymbolHash(Name)];
  /*Search until symbols match or end of branch found*/
  while ((Result > -1) && (strcmp(UndefSymbolTable[Result].Name,Name) != 0)) Result = UndefSymbolTable[Result].NextRecord;
  return(Result);
}

/*------------------------------------------------------------------------------*/

int CalcSymbolHash(const char *SymbolName)
/*Calculate additive hash from characters within Symbol (truncated to SymbolTableSize-1).  This becomes
the vector index of the SymbolVector array.*/
{
  int Idx;
  int Hash;

  Hash = 0;
  for (Idx = 0; *(SymbolName+Idx) != 0; Idx++) Hash = Hash + *(SymbolName+Idx);
  return(Hash & (SymbolTableSize-1));
}

/*------------------------------------------------------------------------------*/
/*----------------------------- Elementize Engine ------------------------------*/
/*------------------------------------------------------------------------------*/

TErrorCode ElementError(bool IncLength, TErrorCode ErrorID)
/*Set source pointers and then raise error.  This is done because element engine
  is otherwise too low-level to produce correct error output in normal fashion.*/
{
  tzModuleRec->ErrorStart = StartOfSymbol;
  tzModuleRec->ErrorLength = SrcIdx - StartOfSymbol + (IncLength ? 1 : 0);
  return(Error(ErrorID));
}

/*------------------------------------------------------------------------------*/

TErrorCode EnterElement(TElementType ElementType, word Value, bool IsEnd)
/*Enter element record into list.*/
{
  if (IsEnd) if (EndEntered) return(ecS); else ElementType = etEnd;
  if (ElementListIdx == ElementListSize) return(ElementError(False, ecTME));
  /*Enter Element into list*/
  ElementList[ElementListIdx].ElementType = ElementType;
  ElementList[ElementListIdx].Value = Value;
  ElementList[ElementListIdx].Start = StartOfSymbol;
  ElementList[ElementListIdx].Length = SrcIdx-StartOfSymbol;
  ElementListIdx++;
  /*Set End-Record-Entered flag appropriately to avoid two EndRecords next to each other*/
  EndEntered = IsEnd;  /*Set false so as not to skip adjacent End if Comma appeared previously*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

void SkipToEnd(void)
/*Skip to beginning of next line*/
{
  while (tzSource[SrcIdx] != ETX) SrcIdx++;
  SrcIdx++;
}

/*------------------------------------------------------------------------------*/

TErrorCode GetString(void)
/*Elementize string constant into comma separated elements (etConstants)*/
{
  TErrorCode  Result;
  word        Value;

  if (tzSource[SrcIdx] == '"') return(ElementError(True, ecECS));    /*If empty string, error*/
  while (tzSource[SrcIdx] != '"')
    { /*while not at end of string...*/
    if (tzSource[SrcIdx] == ETX) return(ElementError(False, ecETQ)); /*If unterminated string, error*/
    Value = tzSource[SrcIdx];                                        /*Get character*/
    SrcIdx++;
    if ((Result = EnterElement(etConstant,Value,False))) return(Result);          /*Enter character as etConstant element*/
    if (tzSource[SrcIdx] != '"')
      {  /*If not at end of string, enter etComma element*/
      StartOfSymbol = SrcIdx;
      SrcIdx++;    /*Increment just for comma element*/
      if ((Result = EnterElement(etComma,0,False))) return(Result);
      SrcIdx--;    /*Decrement back to original*/
      }
    }
  SrcIdx++;
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetNumber(TBase Base, byte DPDigits, word *Result)
/*Convert numeric text to word-sized value.  DPDigits causes this routine to accept a decimal point in the number, or not.
  If DPDigits is >0, decimal point is accepted; the resulting number contains all the digits, but no decimal point, and is
  right-padded with as many 0s as it takes to fill DPDigits digits to the right of the decimal point (ie: DPDigits = 2
  means resulting number must have at least 2 fractional digits).*/
{
  int   Value;   /*The value-accumulator*/
  byte  Count;   /*The total character count (backwards from 17 to 0)*/
  byte  FCount;  /*The total fractional digit count*/

  if (Base != bDecimal)
    { /*if not decimal, it was preceeded by an indicator, so let's get the first numeric character*/
    CurChar = toupper(tzSource[SrcIdx]);  /*Force character to upper-case*/
    SrcIdx++;
    }
  if (!InBaseRange(CurChar,Base)) /*If first char not in range, "expected Binary digit" or "expected Hexadecimal digit"*/
    {
    StartOfSymbol++; /*increment start pointer to point to first digit char, not % or $*/
    if (Base == bBinary) return(ElementError(False, ecEBD)); else return(ElementError(False, ecEHD));
    }
  Value = 0;
  Count = 16+1; /*Set count to allow a maximum of 16 digits*/
  FCount = 0;   /*Set decimal digit count to 0*/
  while ( ( (InBaseRange(CurChar,Base)) || ((DPDigits > 0) && (CurChar == '.')) ) && ((Value & 0xFFFF0000) == 0) && (Count > 0) )
    {  /*If character within range, convert to decimal number and multiply/accumulate*/
    if (CurChar != '.')
      {  /*not a decimal point, accumulate into Value*/
      CurChar = (InBaseRange(CurChar,bDecimal) ? CurChar-'0' : CurChar-'A'+10);
      Value = Value * BaseValue[Base] + CurChar;
      }
    if ((CurChar == '.') || (FCount > 0)) FCount++;       /*Inc Fractional Digit count if '.' or digit after '.'*/
    if ((FCount > 0) && (Value == 0)) return(ElementError(False,ecCCBLTO)); /*Decimal point found but integer portion is 0? Error, constant cannot be less than 1*/
    CurChar = toupper(tzSource[SrcIdx]);
    SrcIdx++;
    Count--;
    }
  if (FCount == 0) FCount = 1;                                                         /*Increment FCount if no decimal point found*/
  while (FCount < DPDigits+1) {Value = Value * BaseValue[Base]; FCount++; }            /*{Right-pad value with 0s up to AcceptDP digits*/
  /*If Value fits in 16 bits then decrement SrcIdx (to point at first non-digit char), else Error: Constant Exceedes 16 Bits*/
  if ((Value & 0xFFFF0000) == 0) SrcIdx--; else return(ElementError(False, ecCESB));
  /*If more than 16 digits found, Error: Constant Exceedes 16 digits*/
  if (Count == 0) return(ElementError(False, ecCESD));
  *Result = (word)Value;
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetSymbol(void)
/*Retrieve symbol, check if in symbol table and enter element record for it.
    Default (no symbol found in table) -> Element Type = etUndef, Value = 0
    Otherwise (symbol is in table)     -> Element Type = Symbol's Type, Value = Symbol's value*/
{
  int         Count;
  TErrorCode  Result;

  Count = SymbolSize;
  Symbol.Name[0] = toupper(CurChar);                             /*Save first character*/
  Symbol.Name[1] = '\0';
  while ((Count > 0) && ( (IsSymbolChar(tzSource[SrcIdx])) ))
    {  /*While more symbol characters and haven't exceeded max symbol size...*/
    Symbol.Name[SymbolSize-Count+1] = toupper(tzSource[SrcIdx]);
    Symbol.Name[SymbolSize-Count+2] = '\0';
    SrcIdx++;
    Count--;
    }
  if (Count == 0) return(ElementError(False, ecSETC));            /*If greater than SymbolSize, Error*/
  FindSymbol(&Symbol); /*Retrieve type and value from symbol table (if it already exists)*/
  if ((Result = EnterElement(Symbol.ElementType,Symbol.Value,False))) return(Result);
  if ( ((Symbol.ElementType == etData) || (Symbol.ElementType == etVar) || (Symbol.ElementType == etCon) || (Symbol.ElementType == etPin) ) && (ElementListIdx-2 > -1) && (ElementList[ElementListIdx-2].ElementType == etUndef) )
    { /*Found DATA, VAR, CON or PIN directive with undefined symbol before it, store previous symbol in Undefined Symbol Table for distinguishing between a un-DEFINE'd symbol and these types*/
    GetSymbolName(ElementList[ElementListIdx-2].Start,ElementList[ElementListIdx-2].Length);
    if ((Result = EnterUndefSymbol(&Symbol.Name[0]))) return(Result);
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetFilename(bool Quoted)
/*Retrieve filename.  Used for $STAMP directive.  Quoted should be true when a quoted string is expected.*/
  {
  TErrorCode  Result;

  StartOfSymbol = SrcIdx;
  if (!Quoted) /*Found a non-quoted file name and path, back off Start Of Symbol*/
    StartOfSymbol--;
  else         /*We've found a quoted file name and path*/
    if (tzSource[SrcIdx] == '"') return(ElementError(True, ecECS)); /*If empty string, Error: Expected characters*/
  /*Find end of filename*/
  while (IsFilePathChar(tzSource[SrcIdx],Quoted)) SrcIdx++;
  if (Quoted && (tzSource[SrcIdx] != '"')) return(ElementError(False, ecETQ)); /*If unterminated string, Error: Expected terminating quote*/
  if ((Result = EnterElement(etFileName,0,False))) return(Result);
  SrcIdx += (Quoted ? 1 : 0);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetDirective(void)
/*Looks for '{$' on comment line. (Note: Whitespace is allowed).  Skips to end of line after directive is parsed or
  if no directive detected.*/
{
  TErrorCode  Result;
  byte        Directive;
  word        Number;

  while ((SrcIdx < tzModuleRec->SourceSize) && ((tzSource[SrcIdx] == 9) || (tzSource[SrcIdx] == ' '))) SrcIdx++; /*Skip whitespace*/
  SrcIdx++;
  if (tzSource[SrcIdx-1] == '{')
    {  /*May be beginning of a directive*/
    while ((SrcIdx < tzModuleRec->SourceSize) && ((tzSource[SrcIdx] == 9) || (tzSource[SrcIdx] == ' '))) SrcIdx++; /*Skip whitespace*/
    if (tzSource[SrcIdx] == '$')
      {  /*Must be directive*/
      Directive = 1;
      while ((Directive > 0) && (SrcIdx <= tzModuleRec->SourceSize))
        {
        /*Skip*/
        StartOfSymbol = SrcIdx;
        CurChar = tzSource[SrcIdx];
        SrcIdx++;
        switch (CurChar)
          {
        /*End Of Line*/       case ETX         : if ((Result = EnterElement(ElementType,0,True))) return(Result); else Directive = 0; break;
        /*Null,Tab or Space*/ case 0:
                              case 9:
                              case 32          : break; /*do nothing, skip it*/
        /*Comma*/             case ','         : if ((Result = EnterElement(etComma,0,False))) return(Result); break;
        /*End or directive?*/ case '}'         : if ((Result = EnterElement(etRightCurlyBrace,0,False))) return(Result); else {SkipToEnd(); Directive = 0;} break;
        /*Filename?*/         case '"'         : if ((Result = GetFilename(True))) return(Result); break;
        /*Directive?*/        case '$'         : if ((Result = GetSymbol())) return(Result);
                                                 Directive++;
                                                 if (Symbol.ElementType != etDirective) return(ElementError(False,ecED)); /*Error: Expected Directive*/
                                                 break;
        /*Decimal*/           case '0':case '1':case '2':case '3':case '4':
                              case '5':case '6':case '7':case '8':case '9':
                                                 if ((Result = GetNumber(bDecimal,2,&Number))) return(Result);
                                                 if ((Result = EnterElement(etConstant,Number,False))) return(Result);
                                                 break;
        /*Other char */       default          :  
        /*could be...*/       if (IsSymbolChar(CurChar) && (Directive < 3))
        /*symbol,*/             {  /*Must be symbol*/
                                if ((Result = GetSymbol())) return(Result);
                                Directive++;
                                }
                              else
        /*filename or*/         if (IsFilePathChar(CurChar,False) && !(Directive < 3))
                                  {
                                  if ((Result = GetFilename(False))) return(Result);
                                  }
                                else
        /*unrecognized char*/     return(ElementError(False,ecUC));
                              break;
          } /*Switch*/
        }  /*While SrcIdx <= tzModuleRec->SourceSize*/
      }  /*Must be directive*/
    else
      {
      SrcIdx++;
      SkipToEnd(); /*Not directive, skip to end of line*/
      }
    }
  else /*Not directive, skip to end of line*/
    SkipToEnd();
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode Elementize(bool LastPass)
/*Elementize source (parse source items into elements array).
 If LastPass = False, we elementize editor directives: $STAMP, $PORT, etc
 If LastPass = True,  we elementize entire source code, excluding editor directives*/
{
  #define IsNotSourceChar(C)     ( ( ((C) >= 0) && ((C) <= 8) ) ||     /* Null - Backspace */ \
                                   ( ((C) >= 10) && ((C) <= 31) ) )    /* LineFeed - Unit Separator */
  #define IsSymbolStartChar(C)   ( ((C) == '_') ||                     /* _    */ \
                                 ( ((C) >= 'A') && ((C) <= 'Z') ) ||   /* A..Z */ \
                                 ( ((C) >= 'a') && ((C) <= 'z') ) )    /* a..z */

  TErrorCode  Result;
  word        Number;

  /*If there is source to parse, convert all chars besides 0 (Null), 9 (Tab) and 32 - 126 (' ' to '~') to 3 (ETX)*/
  if ((tzModuleRec->SourceSize > 0) && (!LastPass)) 
    for (SrcIdx = 0; SrcIdx < tzModuleRec->SourceSize; SrcIdx++) if (IsNotSourceChar(tzSource[SrcIdx])) tzSource[SrcIdx] = ETX;
	tzSource[tzModuleRec->SourceSize] = ETX;     /*Terminate source with ETX (End of Text)*/
  SrcIdx = 0;                                  /*Set index back to source start*/
  ElementListIdx = 0;                          /*Init Element List Pointer and Element List End Pointer*/
  ElementListEnd = 0;
  EndEntered = True;                           /*Initialize End-Record-Entered flag*/
  /*Next Element*/
  while (SrcIdx < tzModuleRec->SourceSize)
    {
    /*Skip*/
    StartOfSymbol = SrcIdx;
    CurChar = tzSource[SrcIdx];
    SrcIdx++;
    if (LastPass) /*If "last pass" then elementize all source, excluding editor directives*/
      switch (CurChar)
        {
        /*End Of Line*/       case ETX              : if((Result = EnterElement(ElementType,0,True))) return(Result); break;  /*Hard-End*/
        /*Null,Tab or Space*/ case 0:
                              case 9:
                              case 32               : break; /*do nothing, skip it*/
        /*Comma*/             case ','              : if((Result = EnterElement(etComma,0,False))) return(Result); /*Comma, may be multi-line list*/
                                                      EndEntered = Lang250;                                      /*if PBASIC version 2.5, skip End if it appears next*/
                                                      break;
        /*Colon*/             case ':'              : EndEntered = False;
                                                      if((Result = EnterElement(ElementType,1,True))) return(Result);         /*Soft-End*/
                                                      break;
        /*Remark*/            case '\''             : if((Result = EnterElement(ElementType,0,True))) return(Result);
                                                      SkipToEnd(); /*Skip to beginning of next line*/
                                                      break;
        /*String?*/           case '"'              : if ((Result = GetString())) return(Result); break;
        /*Binary*/            case '%'              : if ((Result = GetNumber(bBinary,0,&Number))) return(Result);
                                                      if ((Result = EnterElement(etConstant,Number,False))) return(Result);
                                                      break;
        /*Dir or Hex*/        case '$'              : if ((Result = GetSymbol())) return(Result);  /*Directive or Hex value. Look for Directive first.*/
                                                      if ( !(Lang250) || (Symbol.ElementType == etUndef) )
                                                        {                                /*Not PBASIC 2.5 or Directive?...*/
                                                        ElementListIdx--;                /*Remove invalid Element*/
                                                        SrcIdx = StartOfSymbol+1;        /*Back up and get Hex value*/
                                                        if ((Result = GetNumber(bHexadecimal,0,&Number))) return(Result);
                                                        if ((Result = EnterElement(etConstant,Number,False))) return(Result);
                                                        }
                                                      break;
        /*Decimal*/           case '0':case '1':case '2':case '3':case '4':
                              case '5':case '6':case '7':case '8':case '9':
                                                      if ((Result = GetNumber(bDecimal,0,&Number))) return(Result);
                                                      if ((Result = EnterElement(etConstant,Number,False))) return(Result);
                                                      break;                                  
        /*Cond-Comp Dir?*/    case '#'              : if (!Lang250) return(ElementError(False,ecUC)); /*Conditional-Compile directive?  Not PBASIC 2.5?, Error, unrecognized character*/
                                                      if ((Result = GetSymbol())) return(Result);
                                                      if (Symbol.ElementType == etUndef) return(ElementError(False,ecED));
                                                      break;
        /*Symbol char or*/    default :
        /*other char*/        if (IsSymbolStartChar(CurChar))
                                {
                                if ((Result = GetSymbol())) return(Result);
                                }
        /*could be operator*/else  /*Operator? Could be 1 or 2 characters*/
                               {  
                               Symbol.Name[0] = CurChar;                                /*Save first character*/
                               Symbol.Name[1] = 0;  /*! Need this?*/
                               Symbol.Name[2] = 0;  /*! Need this?*/
                               while ((tzSource[SrcIdx] == 9) || \
                                      (tzSource[SrcIdx] == 32)) SrcIdx++;    /*Skip any tabs or spaces*/
                               if (tzSource[SrcIdx] > 0)                     /*If not nil, save second character*/
                                 {
                                 Symbol.Name[1] = tzSource[SrcIdx];
                                 SrcIdx++;
                                 if (FindSymbol(&Symbol))                               /*See if valid 2-character operator*/
                                   {
                                   if ((Result = EnterElement(Symbol.ElementType,Symbol.Value,False))) return(Result);
                                   } 
                                 else
                                   {                                                    /*Not valid operator... prepare to*/
                                   SrcIdx = StartOfSymbol+1;                            /*search for 1 character operator*/
                                   Symbol.Name[1] = 0;
                                   }
                                 }
                               if (strlen(Symbol.Name) < 2)                             /*If operator not 2-characters,*/
                                 if (FindSymbol(&Symbol))                               /*See if valid 1-character operator*/
                                   {
                                   if ((Result = EnterElement(Symbol.ElementType,Symbol.Value,False))) return(Result);
                                   }
                                 else
                                   return(ElementError(False, ecUC));    /*Error, unrecognized character*/
                               }
        } /*Switch*/
    else /*This is the first pass, elementize editor directives only*/
      if (CurChar == '\'')
        { /*Check comment lines for editor directives*/
        if ((Result = EnterElement(ElementType,0,True))) return(Result);
        if ((Result = GetDirective())) return(Result);
        }
    } /*While SrcIdx < tzModuleRec->SourceSize*/
  if ( (EndEntered) && (ElementListIdx-1 >= 0) && (ElementList[ElementListIdx-1].ElementType != etEnd) )
    { /*Last element may have been a comma, adjust pointers and enter End*/
    StartOfSymbol = ElementList[ElementListIdx-1].Start+ElementList[ElementListIdx-1].Length+1;
    SrcIdx = StartOfSymbol+1;
    EndEntered = False;
    if ((Result = EnterElement(ElementType,0,True))) return(Result);
    }
  /*Enter final End element*/
  if ((Result = EnterElement(ElementType,0,True))) return(Result);
  ElementListEnd = ElementListIdx;
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

bool GetElement(TElementList *Element)
/*Retrieve element at ElementListIdx and update element if it is undefined.  Returns element values in Element.
 Returns True if successful, False if not found.*/
{
  bool Result;

  /*Initialize to false*/
  Result = False;
  Element->ElementType = etEnd;
  while (ElementListIdx < ElementListEnd)
	{ /*While not at end of Element List...*/
    if (ElementList[ElementListIdx].ElementType != etCancel)
      { /*This element is not cancelled, retrieve it*/
      Element->ElementType = ElementList[ElementListIdx].ElementType;
      Element->Value = ElementList[ElementListIdx].Value;
      Element->Start = ElementList[ElementListIdx].Start;
      Element->Length = ElementList[ElementListIdx].Length;
      ElementListIdx++; /*Point at next element*/
      Result = True;
      break;
      }
    else
      ElementListIdx++; /*Skip to next element*/
    } /*While*/
  if (Element->ElementType == etUndef)
    { /*Undefined type, let's look in the symbol table*/
    GetSymbolName(Element->Start,Element->Length);  /*Load and find symbol*/
    FindSymbol(&Symbol);
    Element->ElementType = Symbol.ElementType;      /*Store type and value in current element (whether we found it or not)*/
    Element->Value = Symbol.Value;
    Result = True;
    }
  /*Set ErrorStart and ErrorLength in case of error*/
  tzModuleRec->ErrorStart = Element->Start;
  tzModuleRec->ErrorLength = Element->Length;
  return(Result);
}

/*------------------------------------------------------------------------------*/

bool PreviewElement(TElementList *Preview)
/*Preview next element (don't change index)*/
{
  int  CurrentStart;
  int  CurrentLength;
  bool Result;

  CurrentStart = tzModuleRec->ErrorStart;
  CurrentLength = tzModuleRec->ErrorLength;
  Result = GetElement(Preview);
  ElementListIdx--;
  tzModuleRec->ErrorStart = CurrentStart;
  tzModuleRec->ErrorLength = CurrentLength;
  return(Result);
}

/*------------------------------------------------------------------------------*/

void CancelElements(word Start, word Finish)
/*Cancel elements from start to finish*/
{
  int Idx;

  for (Idx = Start; Idx <= Finish; Idx++) ElementList[Idx].ElementType = etCancel;
}

/*------------------------------------------------------------------------------*/

void VoidElements(word Start, word Finish)
/*Cancel elements from start to finish and if element at Finish+1 is End and first non-cancelled element before Start is
 End, cancel the element at Finish+1 also.*/
{
  int  Idx;

  CancelElements(Start,Finish);
  if ( (Finish+1 < ElementListEnd) && (ElementList[Finish+1].ElementType == etEnd))
    {   /*Next element is End, cancel if preceding non-cancelled element is also etEnd*/
    Idx = Start-1;
    while ( (Idx > -1) && (ElementList[Idx].ElementType == etCancel) ) Idx--;
    if ( (Idx == -1) || ((Idx > -1) && (ElementList[Idx].ElementType == etEnd)) ) CancelElements(Finish+1,Finish+1);
    }
}

/*------------------------------------------------------------------------------*/

void GetSymbolName(int Start, int Length)
/*Retrieve symbol name from source starting at Start and ending at Length-1.  Sets Symbol equal to name.*/
{
  int  Idx;

  Symbol.Name[0] = 0;
  for (Idx = 0; Idx < Length; Idx++) *(Symbol.Name+Idx) = toupper(tzSource[Start+Idx]);
  *(Symbol.Name+Length) = (char)NULL;
}

/*------------------------------------------------------------------------------*/
/*----------------------------- Directive Compilers ----------------------------*/
/*------------------------------------------------------------------------------*/

TErrorCode CompileEditorDirectives(void)
/*Compile all editor directives*/
{
  TErrorCode  Result;
  char        *PortNum;

  if ((Result = CompileStampDirective())) return(Result);
  if ((Result = CompilePortDirective())) return(Result);
  if ((Result = CompilePBasicDirective())) return(Result);
  /*Modify directive symbols to reflect target module, port number and language version number*/
  ModifySymbolValue("$STAMP",tzModuleRec->TargetModule);
  /*Make temp buffer for Port Number string, then discard at end*/
  if (tzModuleRec->Port == NULL)
    ModifySymbolValue("$PORT",65535);
  else
    {
    PortNum = (char *)malloc(4);
    strncpy(PortNum,tzModuleRec->Port+3,3);
    ModifySymbolValue("$PORT",atoi(PortNum));
    free(PortNum);
    }
  ModifySymbolValue("$PBASIC",tzModuleRec->LanguageVersion);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileStampDirective(void)
/*Compile $Stamp directive to determine target module to compile for.*/
{
  word          StartOfLine;
  TElementList  Element;
  byte          ProgCount;

  ElementListIdx = 0;
		  
  ProgCount = 0;
  while (GetElement(&Element))
    { /*While not at end of elements...*/
    if (Element.ElementType == etDirective)
      { /*Found a directive*/
      if ((TDirectiveType)Element.Value == dtStamp)
        { /*Found $Stamp directive*/
        StartOfLine = ElementListIdx-1;
        if (!AllowStampDirective)
          { /*This tokenizer is not allowed to process $STAMP directive, just cancel the elements and exit*/
          ElementListIdx--;
          do
            {
            GetElement(&Element);
            CancelElements(ElementListIdx-1,ElementListIdx-1);
            }
          while (Element.ElementType != etEnd);
          return(ecS);
          }
        if (tzModuleRec->TargetModule != tmNone) return(Error(ecDD)); /*Already set?  Error: Duplicate Directive*/ //! No need for type conversion to TTargetModule???
        GetElement(&Element);
        if (Element.ElementType != etTargetModule) return(Error(ecETM)); /*Not target module? Error, Expected Target Module*/
        tzModuleRec->TargetModule = (byte) Element.Value;        /*Enter target module*/
        tzModuleRec->TargetStart = tzModuleRec->ErrorStart;     /*Record starting character for target module*/
        if (IsMultiFileCapable((TTargetModule)Element.Value))
          {  /*Look for optional programs*/
          while ( (GetElement(&Element)) && (Element.ElementType == etComma) )
            { /*Found comma, look for filename*/
            if (ProgCount > 6) return(Error(ecERCBCSMTSAPF)); /*Too many files? Error: Expected right curly bracket.  Can not specify more than 7 additional project files*/
            GetElement(&Element);
            if (Element.ElementType != etFileName) return(Error(ecEFN)); /*Not filename? Error: Expected Filename*/
            tzModuleRec->ProjectFiles[ProgCount] = &tzSource[Element.Start];
            tzSource[Element.Start+Element.Length] = 0;
            tzModuleRec->ProjectFilesStart[ProgCount] = tzModuleRec->ErrorStart;
            ProgCount++;
            }
          }
        else
          GetElement(&Element);
        if (Element.ElementType != etRightCurlyBrace) return(Error(ecERCB)); /*Error: Expected right curly brace*/
        CancelElements(StartOfLine,ElementListIdx);  /*Note, we'll cancel up to next element (should be etEnd)*/
        } /*Found $Stamp directive*/
      } /*Found a directive*/
    } /*While*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompilePortDirective(void)
/*Compile $Port directive to determine target serial port to download to.*/
{
  word          StartOfLine;
  TElementList  Element;
  int           Idx;
  const char    PortName[] = {'C','O','M'};

  ElementListIdx = 0;
  while (GetElement(&Element))
    { /*While not at end of elements...*/
    if (Element.ElementType == etDirective)
      { /*Found a directive*/
      if (Element.Value == dtPort)
        { /*Found $Port directive*/
        StartOfLine = ElementListIdx-1;
        if (tzModuleRec->Port != NULL) return(Error(ecDD));  /*Already set?  Error: Duplicate Directive*/
        GetElement(&Element);
        if ( (Element.ElementType != etUndef) || (Element.Length < 4) ) return(Error(ecECP)); /*Not undef or right length? Error, Expected COM Port, COM1, COM2, etc*/
        /*Verify symbol starts with 'COM'*/
        for (Idx = Element.Start; Idx <= Element.Start+2; Idx++)
          if (toupper(tzSource[Idx]) != PortName[Idx-Element.Start]) return(Error(ecECP)); /*Error, Expected COM Port, COM1, COM2, etc*/
        /*Verify ends with number*/
        for (Idx = Element.Start+3; Idx < Element.Start+Element.Length; Idx++)
          if ( !IsDigitChar(tzSource[Idx]) ) return(Error(ecECP)); /*Error, Expected COM Port, COM1, COM2, etc*/
        /*Enter target port*/
        tzModuleRec->Port = &tzSource[Element.Start];
        tzSource[Element.Start+Element.Length] = 0;
        tzModuleRec->PortStart = tzModuleRec->ErrorStart;  /*Record starting character for port name*/
        GetElement(&Element);
        if (Element.ElementType != etRightCurlyBrace) return(Error(ecERCB)); /*Error: Expected right curly brace*/
        CancelElements(StartOfLine,ElementListIdx); /*Note, we'll cancel up to next element (should be etEnd)*/
        } /*Found $Port directive*/
      } /*Found a directive*/
    } /*While*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompilePBasicDirective(void)
/*Compile $PBASIC directive to determine target PBASIC Language version to use.*/
{
  word          StartOfLine;
  TElementList  Element;

  ElementListIdx = 0;
  while (GetElement(&Element))
    {  /*While not at end of elements...*/
    if (Element.ElementType == etDirective)
      {  /*Found a directive*/
      if (Element.Value == dtPBasic)
        { /*Found $PBASIC directive*/
        StartOfLine = ElementListIdx-1;
        if (tzModuleRec->LanguageStart != 0) return(Error(ecDD));     /*Already set?  Error: Duplicate Directive*/
        GetElement(&Element);
        if (Element.ElementType != etConstant) return(Error(ecEAC)); /*Not constant? Error, Expected constant*/
        if ( !((Element.Value == 200) || (Element.Value == 250)) ) return(Error(ecIPVNMBTZTF)); /*Invalid version? Error, invalid PBASIC version number.  Must be 2.0 or 2.5*/
        /*Enter version information*/
        Lang250 = (Element.Value == 250);
        tzModuleRec->LanguageVersion = Element.Value;
        tzModuleRec->LanguageStart = tzModuleRec->ErrorStart;         /*Record starting character for version number*/
        tzSource[Element.Start+Element.Length] = 0;
        GetElement(&Element);
        if (Element.ElementType != etRightCurlyBrace) return(Error(ecERCB)); /*Error: Expected right curly brace*/
        CancelElements(StartOfLine,ElementListIdx); /*Note, we'll cancel up to next element (should be etEnd)*/
        } /*Found $PBASIC directive*/
      } /*Found a directive*/
    } /*While*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileCCDirectives(void)
/*Compile conditional-compile directives (#IF, #THEN, #ELSE, #ENDIF, #DEFINE, #ERROR, #SELECT, #CASE, #ENDSELECT) to
 determine which portions of PBASIC code to ignore.  This routine MUST be run after Elementize(True) to cancel out
 unnecessary elements.

 Note: NestingStack is used to maintain nesting status.
       NestingStack.JumpLabel contains Cancel status: 0 = no-cancel, 1 = cancel, 2 = cancel-all

     {Fix use of ecET error message}

     {Tokenized Source Code Element indicators?}*/
{
  TElementList   Element;
  TErrorCode     Result;

  ElementListIdx = 0;
  NestingStackIdx = 0;
  IfThenCount = 0;
  SelectCount = 0;
  while (GetElement(&Element))
    { /*While not at end of elements...*/
    if (Element.ElementType == etCCDirective)
      {  /*Found a conditional-compile directive*/
      switch (Element.Value)
        {
        case itDefine    : if ((Result = CompileCCDefine())) return(Result);
                           break;
        case itError     : if ((Result = CompileCCError())) return(Result);
                           break;
        case itIf        : if ((Result = CompileCCIf())) return(Result);
                           break;
        case itElse      : if ((Result = CompileCCElse())) return(Result);
                           break;
        case itEndIf     : if ((Result = CompileCCEndIf())) return(Result);
                           break;
        case itSelect    : if ((Result = CompileCCSelect())) return(Result);
                           break;
        case itCase      : if ((Result = CompileCCCase())) return(Result);
                           break;
        case itEndSelect : if ((Result = CompileCCEndSelect())) return(Result);
                           break;
        }
      }  /*Found a conditional-compile directive*/
    } /*While*/
  /*Verify all multi-line code blocks were ended properly*/
  if (Lang250 && (NestingStackIdx > 0))
    {  /*Still a nested code block on the stack, Error*/
    /*Set ErrorStart and ErrorLength for error*/
    tzModuleRec->ErrorStart = ElementList[NestingStack[NestingStackIdx-1].ElementIdx].Start;
    tzModuleRec->ErrorLength = ElementList[NestingStack[NestingStackIdx-1].ElementIdx].Length;
    switch (NestingStack[NestingStackIdx-1].NestType)
      {
      case ntIFMultiElse :
      case ntIFMultiMain : return(Error(ecCCIWCCEI)); /*Error, #IF without #ENDIF*/
                           break;
      case ntSELECT      : return(Error(ecCCSWCCE));  /*Error, #SELECT without #ENDSELECT*/
                           break;
      default            : break;                     /*No other cases need handling*/ 
      }
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/


TErrorCode CompileCCIf(void)
/*Conditional-Compile Directive #IF..#THEN
  Syntax: #IF condition(s) #THEN statement(s) {#ELSE statement(s)} #ENDIF
  NOTE: NestingStack is used to keep track of current portion (Main/Else), cancel/non-cancel status and potential nesting.
        #IF..#THEN statement need not be followed by an End.*/
{

  TElementList  Element;
  TErrorCode    Result;

  if (IfThenCount == IfThenStackSize) return(Error(ecLOSNCCICCTSE));        /*Index out of range? Error, Limit of 16 Nested #If-#Then Statements Exceeded*/
  NestingStack[NestingStackIdx].NestType = ntIFMultiMain;                   /*Push If..Then mode (MultiMain) on stack*/
  NestingStack[NestingStackIdx].ElementIdx = ElementListIdx-1;              /*Save start of #IF on stack, in case of error*/
  StackIdx = 0;
  if ((Result = GetCCDirectiveExpression(0))) return(Result);               /*Get conditional expression into expression 0*/
  GetElement(&Element);                                                     /*Get next element, should be 'THEN'*/
  if (Element.ElementType != etCCThen) return(Error(ecECCT));               /*Not 'THEN'? Error, Expected THEN*/
  VoidElements(NestingStack[NestingStackIdx].ElementIdx,ElementListIdx-1);  /*Cancel all of #IF..#THEN and duplicate End, if any*/
  NestingStack[NestingStackIdx].JumpLabel = (!(ResolveCCDirectiveExpression() != 0) ? 1 : 0); /*Save condition state on stack; 0=no-cancel; 1=cancel lines*/
  NestingStack[NestingStackIdx].SkipLabel = ElementListIdx;                 /*Save start of no-cancel or cancel element*/
  NestingStackIdx++;                                                        /*Finish "push"*/
  IfThenCount++;
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/


TErrorCode CompileCCElse(void)
/*Conditional-Compile Directive #ELSE
  Syntax: #IF..#THEN /../ #ELSE /../ #ENDIF
  Note: #ELSE statements need not be followed by an End.*/
{
  if (IfThenCount == 0) return(Error(ecCCEMBPBCCI)); /*No #IF's? Error, #ELSE must be preceeded by #IF*/
  if (NestingStack[NestingStackIdx-1].NestType > ntIFMultiMain) return(CCNestingError());/*Not in #IF..#THEN nest? Display proper error*/
  if (NestingStack[NestingStackIdx-1].NestType != ntIFMultiMain) return(Error(ecECCEI)); /*Duplicate #ELSE? Error, Expected '#ENDIF'*/
  NestingStack[NestingStackIdx-1].NestType = (TNestingType)(((byte)NestingStack[NestingStackIdx-1].NestType)-1);  /*Move to "#ELSE" mode*/
  /*Adjust start of cancel element based on no-cancel/cancel status*/
  if (NestingStack[NestingStackIdx-1].JumpLabel == 0) NestingStack[NestingStackIdx-1].SkipLabel = ElementListIdx-1;
  VoidElements(NestingStack[NestingStackIdx-1].SkipLabel,ElementListIdx-1);   /*Cancel appropriate elements, including #ELSE and End, if any*/
  NestingStack[NestingStackIdx-1].JumpLabel = NestingStack[NestingStackIdx-1].JumpLabel ^ 1; /*Invert cancel status*/
  NestingStack[NestingStackIdx-1].SkipLabel = ElementListIdx;                /*Save start of no-cancel or cancel element*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileCCEndIf(void)
/*Conditional-Compile Directive #ENDIF
  Syntax: #IF..#THEN /../ #ELSE /../ #ENDIF.
  NOTE: #ENDIF statements need not be followed by an End.*/
{
  if (IfThenCount == 0) return(Error(ecCCEIMBPBCCI)); /*No #IF's? Error, #ENDIF must be preceeded by #IF*/
  if (NestingStack[NestingStackIdx-1].NestType > ntIFMultiMain) return(CCNestingError());/*Not in #IF..#THEN nest? Display proper error*/
  /*Adjust start of cancel element based on no-cancel/cancel status*/
  if (NestingStack[NestingStackIdx-1].JumpLabel == 0) NestingStack[NestingStackIdx-1].SkipLabel = ElementListIdx-1;
  VoidElements(NestingStack[NestingStackIdx-1].SkipLabel,ElementListIdx-1);              /*Cancel appropriate elements, including #ENDIF and End, if any*/
  NestingStackIdx--;                                                                     /*Pop the stack*/
  IfThenCount--;
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileCCDefine(void)
/*Conditional-Compile Directive #DEFINE
  Syntax: #DEFINE symbol {= value}
  NOTE: value can be a constant expression, though only numbers, operators, DEFINE'd values and "compile pre-defined"
       constants are allowed.
       Note: #DEFINE statements must be followed by an End*/
{
  TElementList  Element;
  word          StartOfLine;
  bool          Redefine;
  bool          SoftEnd;
  TErrorCode    Result;

  if ( (NestingStackIdx == 0) || (NestingStack[NestingStackIdx-1].JumpLabel == 0) )
    {  /*Not nested in a CCDirective or not "canceling"*/
    StartOfLine = ElementListIdx-1;
    GetElement(&Element);
    if ( (Element.ElementType == etUndef) && (Symbol.NextRecord == 1) ) return(Error(ecSIAD));  /*Undefined non-DEFINE'd (DATA, VAR, CON or PIN) symbol? Error, Symbol is already defined*/
    if ( (Element.ElementType != etUndef) && (Element.ElementType != etCCConstant) ) return(Error(ecEAUDS)); /*Not undefined and not DEFINE'd symbol? Error, expected a user-defined symbol*/
    if ((Result = CopySymbol())) return(Result);         /*Copy Symbol to Symbol2*/
    Redefine = (Symbol2.ElementType == etCCConstant);  /*Remember if it is an existing DEFINE'd symbol*/
    PreviewElement(&Element);
    if (Element.ElementType != etEnd)
      {   /*CCDefine may have indicated value*/
      if ((Result = GetEqual())) return(Result);
      if ((Result = GetCCDirectiveExpression(0))) return(Result);                               /*Get conditional expression into expression 0*/
      Symbol2.Value = ResolveCCDirectiveExpression();
      }
    else  /*CCDefine has unindicated value, set to -1*/
      Symbol2.Value = 65535;
    Symbol2.ElementType = etCCConstant;                /*Set type to etCCConstant*/
    if (!Redefine) { if ((Result = EnterSymbol(Symbol2))) return(Result); } else ModifySymbolValue(Symbol2.Name,Symbol2.Value);    /*Enter or redefine symbol*/
    if ((Result = GetEnd(&SoftEnd))) return(Result);     /*Verify End*/
    CancelElements(StartOfLine,ElementListIdx-1);
    }
  else    /*Nested in CCDirective and "canceling"*/
    while ( (GetElement(&Element)) && (Element.ElementType != etEnd) );                         /*Skip to end of line*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/


TErrorCode CompileCCError(void)
/*Conditional-Compile Directive #ERROR
  Syntax: #ERROR "string"
  Note: #ERROR statements must be followed by an End*/
{
  TElementList  Element;
  word          StartOfError;
  char          *ErrorString;
  int           Idx;

  ErrorString = (char *)malloc(1024);
  if ( (NestingStackIdx == 0) || (NestingStack[NestingStackIdx-1].JumpLabel == 0) )
    {  /*Not nested in a CCDirective or not "canceling"*/
    StartOfError = tzModuleRec->ErrorStart;
    strcpy(ErrorString,Errors[ecUDE]);                /*Initialize Error String to start of User-Defined-Error*/
    Idx = (int) strlen(ErrorString);
    while (GetElement(&Element))
      {  /*while more of error string*/
      if (Element.ElementType != etConstant) { free(ErrorString); return(Error(ecEACOC)); } /*Error, expected a character or constant*/
      *(ErrorString+Idx++) = (char)Element.Value; /*Append next character to error string*/
      GetElement(&Element);
      if ( (Element.ElementType != etComma) && (Element.ElementType != etEnd) ) { free(ErrorString); return(Error(ecECEOLOC)); } /*Error, expected comma, eol or colon*/
      if (Element.ElementType == etEnd) break;
      }
    *(ErrorString+Idx) = 0;
    tzModuleRec->ErrorLength = tzModuleRec->ErrorStart+tzModuleRec->ErrorLength-1-StartOfError;
    tzModuleRec->ErrorStart = StartOfError;
    /*Set tzModuleRec to error string and raise exception.  Copy the error string to the upper tzModuleRec.Source
     buffer, then point the tzModuleRec.Error pointer there.*/
    strcpy(&tzSource[MaxSourceSize-1-strlen(ErrorString)],ErrorString);
    tzModuleRec->Error = &tzSource[MaxSourceSize-1-strlen(ErrorString)];
    free(ErrorString);
    return(ecUDE);
    }
  else  /*Nested in CCDirective and "canceling"*/
    while ((GetElement(&Element)) && (Element.ElementType != etEnd));    /*Skip to end of line*/
  free(ErrorString);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/


TErrorCode CompileCCSelect(void)
/*Syntax: #SELECT expression /../ #CASE { (condition(s)|#ELSE) }{:} /../ #ENDSELECT
  NOTE: The NestingStack is used to keep track of potential nesting as well as:
        .ElementIdx = Start of #SELECT (in case of error as well as cancel-pointer)
        .JumpLabel  = Cancel Status (0 = no-cancel, 1 = cancel, 2 = cancel all)
        .SkipLabel  = End-of-cancel, indicates end of 1st cancel section
        .ExpIdx     = Start of split expression
        .Exits[0]   = Start of 2nd cancel section.
  ALSO NOTE: #SELECT expression must be followed by an End.*/
{
  TElementList  Element;
  TErrorCode    Result;
  bool          Resolved;

  if (SelectCount == SelectStackSize) return(Error(ecLOSNCCSSE));     /*Index out of range? Error, Limit of 16 Nested #SELECT Statements Exceeded*/
  NestingStack[NestingStackIdx].NestType = ntSELECT;                  /*Set type to SELECT*/
  NestingStack[NestingStackIdx].ElementIdx = ElementListIdx-1;        /*Save start of "SELECT" on stack*/
  NestingStack[NestingStackIdx].ExpIdx = ElementListIdx;              /*Store start of expression*/
  NestingStack[NestingStackIdx].JumpLabel = 1;                        /*Set JumpLabel to indicate Cancel (first section)*/
  NestingStack[NestingStackIdx].Exits[0] = 0;                         /*Clear start of 2nd-cancel pointer*/
  NestingStackIdx++;                                                  /*Finish stack "push"*/
  SelectCount++;
  StackIdx = 0;
  if ((Result = ResolveConstant(True,True,&Resolved))) return(Result);/*Get expression, just to verify it is a valid "value" expression*/
  GetElement(&Element);                                               /*Get next element, should be End*/
  if (Element.ElementType != etEnd) return(Error(ecECOEOL));          /*Not End? Error, expected ':' or end-of-line*/
  GetElement(&Element);                                               /*Get next element, should be '#CASE'*/
  if ( !((Element.ElementType == etCCDirective) && (Element.Value == itCase)) ) return(Error(ecECCCE)); /*Not '#CASE'?  Error, Expected '#CASE'*/
  ElementListIdx--;                                                   /*Move back to '#CASE'*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode AppendExpression(byte SourceExpression, TOperatorCode AppendOperator)
/*Append SourceExpression and AppendOperator to expression 0.  Used by CompileCCCase and CompileCase.*/
{
  byte        Idx;
  TErrorCode  Result;

  if ((Result = EnterExpressionBits(1,1))) return(Result);                /*Enter 1 (Continue bit) into Expression*/
  Idx = 0;
  while (Idx < Expression[SourceExpression][0]) 
    {  /*While more bits from expression SourceExpression to append to expression 0...*/
    if ((Result = EnterExpressionBits(Lowest(16,Expression[SourceExpression][0]-Idx),Expression[SourceExpression][(Idx / 16)+1]))) return(Result);
    Idx += Lowest(16,Expression[SourceExpression][0]-Idx+1);
    }
  if ((Result = EnterExpressionOperator(AppendOperator))) return(Result); /*Append designated operator*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileCCCase(void)
/*Syntax: #SELECT expression /../ #CASE { (condition(s)|#ELSE) }{:} /../ #ENDSELECT
  NOTE: #CASE condition(s) must be followed by and End.*/
{
  TElementList  Element;
  int           TempIdx;
  bool          ProcessOr;
  bool          CaseElse;
  TErrorCode    Result;

  if (SelectCount == 0) return(Error(ecCCCMBPBCCS)); /*No #SELECTs? Error, #CASE must be preceeded by #SELECT*/
  if (NestingStack[NestingStackIdx-1].NestType != ntSELECT) return(CCNestingError()); /*Not in #SELECT #CASE nest? Display proper error}*/
  if (NestingStack[NestingStackIdx-1].JumpLabel == 0)
    {  /*Previous #CASE was not cancelled, mark start of 2nd cancel and set to 'cancel all' mode*/
    NestingStack[NestingStackIdx-1].Exits[0] = ElementListIdx-1;  /*Set Exits[0] to point start of 2nd cancel element at this '#CASE'*/
    NestingStack[NestingStackIdx-1].JumpLabel = 2;                /*Set JumpLabel cancel status to 2: 'cancel all'*/
    }
  ProcessOr = False;
  TempIdx = 0;
  GetElement(&Element);
  if ( (Element.ElementType == etInstruction) && (Element.Value == itElse) ) return(Error(ecECCE)); /*Found 'ELSE'? Error, Expected '#ELSE'*/
  CaseElse = ((Element.ElementType == etCCDirective) && (Element.Value == itElse));
  if (!CaseElse)
    {  /*Not #CASE #ELSE, must be #CASE conditional*/
    ElementListIdx--;                            /*Back up to start of condition*/
    do /*Get expression and conditional*/
      {
      TempIdx = ElementListIdx;                  /*Look ahead for comma, 'TO' or End to decide if we expect a single conditional or range*/
      while ( (GetElement(&Element)) && !((Element.ElementType == etComma) || (Element.ElementType == etTo) || (Element.ElementType == etEnd)) );
      ElementListIdx = TempIdx;                                         /*Restore ElementListIdx (keep in TempIdx for split-condition in GetExpression)*/
      ElementListIdx = NestingStack[NestingStackIdx-1].ExpIdx;          /*Move to start of #SELECT's expression*/
      if (Element.ElementType == etTo)
        {  /*Found range condition (# TO #)*/
        /*Get range-begin expression*/
        NestingStack[NestingStackIdx-1].AutoCondOp = ocAE;              /*Set AutoInsert '>='*/
        if ((Result = GetCCDirectiveExpression(TempIdx))) return(Result); /*Get split conditional expression*/
        CopyExpression(0,1);                                            /*Copy range-begin to expression 1*/
        /*Get 'TO'*/
        if ((Result = GetTO())) return(Result);
        /*Get range-end expression*/ 
        TempIdx = ElementListIdx;                                       /*Save start of second condition (for split-condition in GetExpression)*/
        ElementListIdx = NestingStack[NestingStackIdx-1].ExpIdx;        /*Move back to start of #SELECT's expression*/
        NestingStack[NestingStackIdx-1].AutoCondOp = ocBE;              /*Set AutoInsert '<='*/
        if ((Result = GetCCDirectiveExpression(TempIdx))) return(Result); /*Get split conditional expression*/
        CopyExpression(0,2);                                            /*Copy range-end to expression 2*/
        CopyExpression(1,0);                                            /*Copy expression 1 (range-begin) back to expression 0*/
        /*Append range-end to expression followed by AND operator to expression 0*/
        if ((Result = AppendExpression(2,ocAnd))) return(Result);
        }  /*Found range condition (# TO #)*/
      else
        {  /*Not range, must be single condition*/
        NestingStack[NestingStackIdx-1].AutoCondOp = ocE;               /*Set AutoInsert '=' if necessary*/
        if ((Result = GetCCDirectiveExpression(TempIdx))) return(Result); /*Get split conditional expression*/
        }
      if (ProcessOr)
        {  /*Append this expression to the previous one followed by OR operator*/
        CopyExpression(0,1);                                            /*Save current expression*/
        CopyExpression(3,0);                                            /*Restore previous expression*/
        if ((Result = AppendExpression(1,ocOr))) return(Result);          /*Append current followed by OR operator*/
        }
      GetElement(&Element);                                             /*Get next element, should be comma or end*/
      if (Element.ElementType == etComma)
        {  /*Multiple conditions ('OR' needed), save expression for later*/
        CopyExpression(0,3);                                            /*Save current expression for later*/
        ProcessOr = True;                                               /*Set flag to insert OR*/
        }
      }
    while (Element.ElementType == etComma);
    if (Element.ElementType != etEnd) return(Error(ecECEOLOC));         /*Not End? Error, expected ',', end-of-line or ':'*/
    ElementListIdx--;
    }  /*#CASE conditional*/
  if ( (NestingStack[NestingStackIdx-1].JumpLabel == 1) && ((ResolveCCDirectiveExpression() != 0) || (CaseElse)) )
    {  /*If last mode was cancel and this #CASE's condition is True...*/
    if (GetElement(&Element) && (Element.ElementType != etEnd)) ElementListIdx--;  /*Adjust for optional End*/
    NestingStack[NestingStackIdx-1].SkipLabel = ElementListIdx-1;       /*Set SkipLabel to point end of cancel to current position*/
    NestingStack[NestingStackIdx-1].JumpLabel = 0;                      /*Set to no-cancel mode*/
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/


TErrorCode CompileCCEndSelect(void)
/*Syntax: #SELECT expression /../ #CASE { (condition(s)|#ELSE) }{:} /../ #ENDSELECT
  Note: #ENDSELECT need not be followed by an End*/
{
  if (SelectCount == 0) return(Error(ecCCESMBPBCCS)); /*No #SELECTs? Error, #ENDSELECT must be preceeded by #SELECT*/
  if (NestingStack[NestingStackIdx-1].NestType != ntSELECT) return(CCNestingError()); /*Not in #SELECT nest? Display proper error*/
  /*Adjust start of 2nd cancel element based on no-cancel/cancel status*/
  if (NestingStack[NestingStackIdx-1].JumpLabel == 0) NestingStack[NestingStackIdx-1].Exits[0] = ElementListIdx-1;
  if (NestingStack[NestingStackIdx-1].Exits[0] > 0)
    {  /*If two sections to cancel...*/
    VoidElements(NestingStack[NestingStackIdx-1].ElementIdx,NestingStack[NestingStackIdx-1].SkipLabel);  /*Cancel first elements plus End, if any*/
    VoidElements(NestingStack[NestingStackIdx-1].Exits[0],ElementListIdx-1);                             /*Cancel second elements plus End, if any*/
    }
  else
    VoidElements(NestingStack[NestingStackIdx-1].ElementIdx,ElementListIdx-1);                           /*Cancel all elements plus End, if any*/
  NestingStackIdx--;                       /*Pop the stack*/
  SelectCount--;
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/


TErrorCode CompilePins(bool LastPass)
/*Compile PIN directives.  These are resolved as constants, but are called etPinNumber and
 treated as a constant or a variable of the form INx or OUTx based on the context of the
 reference.
 If LastPass = false, we "try" to compile them (compiled 'PIN' lines are canceled)
 If LastPass = true,  we compile (all remaining 'PIN' lines are compiled and canceled)*/
{
  word          StartOfLine;
  TElementList  Element;
  word          StartOfConstant;
  bool          Resolved;
  bool          SoftEnd;
  TErrorCode    Result;

  ElementListIdx = 0;
  StartOfLine = 0;
  while (GetElement(&Element))
  {  /*While not at end of elements...*/
    /*Already got first element, but we need second element now*/
    GetElement(&Element);
    if (Element.ElementType == etPin)
      {  /*Found 'PIN' directive*/
      /*Go back and retrieve undefined symbol*/
      ElementListIdx = StartOfLine;
      if ((Result = GetUndefinedSymbol())) return(Result);
      ElementListIdx++;               /*skip past 'PIN'*/
      PreviewElement(&Element);        /*Preview start of constant and save Start in case of range error*/
      StartOfConstant = Element.Start;
      if ((Result = ResolveConstant(LastPass,False,&Resolved))) return(Result);
      if (Resolved)
        {  /*Constant resolved, enter symbol*/
        if (Symbol2.Value > 15)       /*By now, Value is twos-compliment, so > 15 covers < 0 as well*/
          {  /*Pin # out of range? Error, Pin number must be 0 to 15*/
          ElementListIdx--;           /*Back up and*/
          GetElement(&Element);        /*get next element to determine end of constant expression*/
          tzModuleRec->ErrorStart = StartOfConstant;
          tzModuleRec->ErrorLength = Element.Start-StartOfConstant+Element.Length;
          return(Error(ecPNMBZTF));
          }
        Symbol2.ElementType = etPinNumber; /*Change type to pin number*/
        if ((Result = EnterSymbol(Symbol2))) return(Result);
        if ((Result = GetEnd(&SoftEnd))) return(Result);
        CancelElements(StartOfLine,ElementListIdx-1);
        }
      else /*Constant unresolved, just verify end of line*/
        if ((Result = GetEnd(&SoftEnd))) return(Result);
      }
    else
      {  /*Not 'PIN' directive, skip to end of line*/
      while ( (Element.ElementType != etEnd) && GetElement(&Element) );
      }
    StartOfLine = ElementListIdx;
    }  /*While*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileConstants(bool LastPass)
/*Compile CON directives.
 If LastPass = false, we "try" to compile them (compiled 'CON' lines are canceled)
 If LastPass = true,  we compile (all remaining 'CON' lines are compiled and canceled)*/
{
  TErrorCode    Result;
  word          StartOfLine;
  TElementList  Element;
  bool          Resolved;
  bool          SoftEnd;
  
  ElementListIdx = 0;
  StartOfLine = 0;
  while (GetElement(&Element))
    { /*While not at end of elements...*/
    /*Already got first element, but we need second element now*/
    GetElement(&Element);
    if (Element.ElementType == etCon)
      { /*Found 'CON' directive*/
      /*Go back and retrieve undefined symbol*/
      ElementListIdx = StartOfLine;
      if ((Result = GetUndefinedSymbol())) return(Result);
      ElementListIdx++; /*skip past 'CON'*/
      if ((Result = ResolveConstant(LastPass, False, &Resolved))) return(Result);
      if (Resolved)
        { /*Constant resolved, enter symbol*/
        if ((Result = EnterSymbol(Symbol2))) return(Result);
        if ((Result = GetEnd(&SoftEnd))) return(Result);
        CancelElements(StartOfLine,ElementListIdx-1);
        }
      else /*Constant unresolved, just verify end of line*/
        if ((Result = GetEnd(&SoftEnd))) return(Result);
      }
    else
      { /*Not 'CON' directive, skip to end of line*/
      while ((Element.ElementType != etEnd) && GetElement(&Element));
      }
    StartOfLine = ElementListIdx;
    } /*While*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode AssignSymbol(bool *SymbolFlag, word *EEPROMIdx)
/*Set Symbol to current EEPROM Data pointer location*/
{
  TErrorCode  Result;

  if (*SymbolFlag)
    { /*Symbol exists*/
    Symbol2.ElementType = etConstant;
    Symbol2.Value = *EEPROMIdx;
    if ((Result = EnterSymbol(Symbol2))) return(Result);
    *SymbolFlag = False;
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode EnterData(TElementList *Element, word *EEPROMValue, word *EEPROMIdx, bool WordFlag, bool DefinedFlag, bool LastPass)
/*Enter Data into EEPROM at EEPROMIdx*/
{
  byte    Idx;
  byte    Value;
    
  Value = (byte) *EEPROMValue; /*Get low-byte*/
  for (Idx = 0; Idx <= (WordFlag?1:0); Idx++)
    { /*For both low-byte and high-byte, enter them in EEPROM*/
    if (*EEPROMIdx >= EEPROMSize) return(Error(ecLIOOR)); /*Error if index is out of EEPROM range*/
    if (LastPass)
      { /*Enter data only if last pass*/
      if ((tzModuleRec->EEPROMFlags[*EEPROMIdx] & 3) > 0) return(Error(ecLACD)); /*Error if location already contains data*/
      tzModuleRec->EEPROMFlags[*EEPROMIdx] = 1+(DefinedFlag?1:0); /*Set location's flags to indicate Defined or Undefined data*/
      tzModuleRec->EEPROM[*EEPROMIdx] = Value;
      EEPROMPointers[(*EEPROMIdx)*2] = Element->Start;
      EEPROMPointers[(*EEPROMIdx)*2+1] = Element->Length;
      }
    (*EEPROMIdx)++;
    Value = (*EEPROMValue) >> 8; /*Shift high-byte into low-byte position (in case a word is defined)*/
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileData(bool LastPass)
/*Compile data directives.
 If LastPass = false, we "try" to compile them (all 'DATA' symbols are compiled and canceled)
 If LastPass = true,  we compile (all 'DATA' lines are compiled and canceled)*/
{
  TErrorCode    Result;
  word          EEPROMIdx;
  word          StartOfLine;
  TElementList  Element;
  TElementList  Preview;
  bool          SymbolFlag;
  bool          DefinedFlag;
  bool          WordFlag;
  bool          Resolved;
  word          Idx;
  word          EEPROMValue;

  EEPROMIdx = 0;
  ElementListIdx = 0;
  StartOfLine = ElementListIdx;
  while (GetElement(&Element))
    { /*While more elements (ie: more lines to process)...*/
    SymbolFlag = False;
    if (Element.ElementType != etData)
      { /*Not 'DATA' but element may be symbol, check for 'DATA' in second element*/
      GetElement(&Element);
      if (Element.ElementType == etData)
        { /*Found 'DATA' element, assign symbol that preceeded it*/
        ElementListIdx = StartOfLine;
        if ((Result = GetUndefinedSymbol())) return(Result);
        CancelElements(StartOfLine,ElementListIdx-1);
        ElementListIdx++; /*Skip past 'DATA' element*/
        SymbolFlag = True;
        } /*Found 'DATA'*/
      } /*Not 'DATA'*/
    if (Element.ElementType == etData)
      { /*Definitely found 'DATA' line*/
      GetElement(&Element); /*Get 1st element of first term*/
      if (Element.ElementType == etEnd)
        { /*If at end of line, assign the symbol (if any) and cancel elements*/
        if ((Result = AssignSymbol(&SymbolFlag,&EEPROMIdx))) return(Result);
        CancelElements(StartOfLine,ElementListIdx-1);  /* //! Note StartOfLine never updated from above (slight inefficiency here)*/
        }
      else
        { /*If not end of line*/
        do
          { /*More elements on line...*/
          if (Element.ElementType == etAt)
            { /*Found '@'*/
            if ((Result = ResolveConstant(True,False,&Resolved))) return(Result);
            EEPROMIdx = Symbol2.Value;
            if (EEPROMIdx >= EEPROMSize) return(Error(ecLIOOR)); /*Error if index is out of EEPROM range*/
            if ((Result = AssignSymbol(&SymbolFlag,&EEPROMIdx))) return(Result);
            GetElement(&Element);
            if (Element.ElementType != etComma)
              { /*If not comma, check for invalid element or end of line and cancel elements appropriately*/
              if (Element.ElementType != etEnd) return(Error(ecECEOLOC)); /*Error, expected comma, eol or colon*/
              if (LastPass) CancelElements(StartOfLine,ElementListIdx-1);
              break;
              }
            } /*Found '@'*/
          else
            { /*If no '@' (ie: data not redirected to new location)*/
            if ((Result = AssignSymbol(&SymbolFlag,&EEPROMIdx))) return(Result);
            DefinedFlag = False;
            WordFlag = False;
            EEPROMValue = 0;
            if (Element.ElementType == etVariableAuto)
              { /*May have found 'WORD'*/
              if (Element.Value == 3)
                { /*Found 'WORD'*/
                WordFlag = True;
                GetElement(&Element);
                }
              }
            if (Element.ElementType != etLeft)
              { /*Not undefined repetitive data*/
              ElementListIdx--;
              if ((Result = ResolveConstant(LastPass,False,&Resolved))) return(Result);
              EEPROMValue = Symbol2.Value;
              DefinedFlag = True;
              PreviewElement(&Preview);
              if (Preview.ElementType != etLeft)
                { /*Not defined repetitive data*/
                if ((Result = EnterData(&Element,&EEPROMValue,&EEPROMIdx,WordFlag,DefinedFlag,LastPass))) return(Result);
                GetElement(&Element);
                if (Element.ElementType == etComma)
                  { /*Comma found, continue with line*/
                  GetElement(&Element);
                  continue;
                  }
                else
                  { /*If not comma, check for invalid element or end of line and cancel elements appropriately*/
                  if (Element.ElementType != etEnd) return(Error(ecECEOLOC)); /*Error, expected constant, eol or colon*/
                  if (LastPass) CancelElements(StartOfLine,ElementListIdx-1);
                  break;
                  }
                }  /*Not defined repetitive data*/
              ElementListIdx++;
              } /*Not undefined repetitive data*/
            if ((Result = ResolveConstant(True,False,&Resolved))) return(Result);
            /*Repeat defined or undefined data*/
            for (Idx = 1; Idx <= Symbol2.Value; Idx++) if ((Result = EnterData(&Element,&EEPROMValue,&EEPROMIdx,WordFlag,DefinedFlag,LastPass))) return(Result);
            if ((Result = GetRight())) return(Result); /*Get and verify ')'*/
            GetElement(&Element);
            if (Element.ElementType != etComma)
              { /*If not comma, check for invalid element or end of line and cancel elements appropriately*/
              if (Element.ElementType != etEnd) return(Error(ecECEOLOC)); /*Error, expected constant, eol or colon*/
              if (LastPass) CancelElements(StartOfLine,ElementListIdx-1);
              break;
              }
            } /*If no '@' (ie: data not redirected to new location)*/
          GetElement(&Element); /*Get 1st element of next term*/
          }
        while (True); /*While more elements on line*/
        } /*If not eol*/
      } /*Definitely found 'DATA' line*/
    /*Skip to end of line*/
    while ( (Element.ElementType != etEnd) && GetElement(&Element) );
    StartOfLine = ElementListIdx;
    } /*While more elements*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetModifiers(TElementList *Element)
/*Get modifiers and modify Element's Code/Size (stored in .Value as Size in highbyte and Code in lowbyte)*/
{
  TElementList  SavedElement;
  TElementList  Preview;
  byte          Size;
  byte          Code;

  SavedElement = *Element;         /*Save current Element*/
  while ( (PreviewElement(&Preview)) && (Preview.ElementType == etPeriod) )
    {  /*While there is a modifier...*/
    Size = Element->Value >> 8;     /*Extract Size*/
    Code = Element->Value & 0xFF;   /*Extract Code*/
    ElementListIdx++;              /*Skip period*/
    if (Size == 0 /*%00*/) return(Error(ecVIABS));     /*If already bit-sized, Error: Variable Is Already Bit Sized*/
    GetElement(Element);                               /*Get modifier into .Value (highbyte=size, lowbyte=code)*/
    if (Element->ElementType != etVariableMod) return(Error(ecEAVM));     /*If not a modifer, Error: Expected A Variable Modifier*/
    if (Size <= (Element->Value >> 8)) return(Error(ecEASSVM));           /*If new size larger than original size, Error: Expected A Smaller Sized Variable Modifier*/
    Size = Size-(Element->Value >> 8)+( (Element->Value >> 8) == 0 ? 1 : 0);   /*Get number of shifts into Size and add 1 if new size is a bit (ie: %00)*/
    /*Shift variable code*/
    SavedElement.Value = ((Code << 8) + 1) << Size; /*Reconstruct as Code:Size with size set to 1 and shift entire*/
    SavedElement.Value--;                           /*value by actual Size, then decrement by 1*/
    /*If "HIGH"-type modifier, set modifier to maximum*/
    if ( (Element->Value & 0x80) == 0x80 ) Element->Value = (Element->Value & 0xFF00) + (SavedElement.Value & 0xFF);
    /*If modifier > maximum, Error: Variable Modifier Is Out Of Range*/
    if ( (Element->Value & 0xFF) > (SavedElement.Value & 0xFF) ) return(Error(ecVMIOOR));
    Element->Value = (Element->Value & 0xFF00) + ((Element->Value & 0xFF) + (SavedElement.Value >> 8));
    } /*While there is a modifier*/
  Symbol2.ElementType = SavedElement.ElementType;
  Element->ElementType = SavedElement.ElementType;
  Symbol2.Value = Element->Value;
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileVar(bool LastPass)
/*Compile var directives.
 If LastPass = false, we "try" to compile them (compiled 'VAR' lines are canceled, autos counted)
 If LastPass = true,  we compile (all remaining 'VAR' lines are compiled and canceled)*/
{
  TErrorCode    Result;
  bool          Resolved;
  bool          SoftEnd;
  int           Idx;
  byte          Temp;
  word          ArraySize;
  word          StartOfLine;
  TElementList  Element;
  TElementList  Preview;
  const byte    Shifts[] = {2,1,1,0};
  const byte    Bits[]   = {1,4,8,16};

  if (!LastPass)
    { /*'Try to' compile*/
      /*Clear VarBitCount and VarCounts*/
      VarBitCount = 0;
      for (Idx = 0; Idx <= 3; Idx++) tzModuleRec->VarCounts[Idx] = 0;
    }
  else
    { /*Compile*/
    /*Calculate initial VAR register bases*/
    Temp = 3; /*First user-available word address*/
    for (Idx = 0; Idx <= 3; Idx++)
      {
      VarBases[3-Idx] = Temp << Shifts[3-Idx];
      Temp = (Temp << Shifts[3-Idx]) + tzModuleRec->VarCounts[3-Idx];
      }
    }
  ElementListIdx = 0; /*Reset element list idx*/
  StartOfLine = ElementListIdx;

  while (GetElement(&Element))
    { /*While more lines to process*/
    GetElement(&Element); /*Got first element, now check second*/
    if (Element.ElementType == etVar)
      { /*Found a VAR declaration*/
      ElementListIdx = StartOfLine;
      if ((Result = GetUndefinedSymbol())) return(Result);  /*Get undefined symbol*/
      ElementListIdx++; /*Skip past 'VAR'*/
      GetElement(&Element);
      if (Element.ElementType == etVariableAuto)
        { /*Found BIT, NIB, BYTE or WORD*/
        PreviewElement(&Preview);
        ArraySize = 1;
        if (Preview.ElementType == etLeft)
          { /*Found '(' (ie: Array)*/
          ElementListIdx++; /*Skip past '('*/
          if ((Result = ResolveConstant(True,False,&Resolved))) return(Result);
          ArraySize = Symbol2.Value;
          if (ArraySize == 0) return(Error(ecASCBZ)); /*Error, Array Size Cannot Be Zero*/
          }
        if (!LastPass)
          { /*'try to' compile (update counts and verify space available)*/
          if (ArraySize > 255) return(Error(ecOOVS));               /*Array too big, Error: Out of Variable Space*/
          tzModuleRec->VarCounts[Element.Value] += ArraySize;       /*Update var counts*/
          ArraySize *= Bits[Element.Value];                         /*Adjust size to actual number of bits*/
          if (ArraySize > 255) return(Error(ecOOVS));               /*Too big, Error: Out of Variable Space*/
          if ((VarBitCount+ArraySize) > 255) return(Error(ecOOVS)); /*Error: Out of Variable Space*/
          VarBitCount += ArraySize;                                 /*Update bit counter*/
          if (VarBitCount > 256-(3*16)) return(Error(ecOOVS));      /*Error: Out of Variable Space*/
          if (Preview.ElementType == etLeft) {if ((Result = GetRight())) return(Result);} /*Finish index processing if necessary*/
          if ((Result = GetEnd(&SoftEnd))) return(Result);
          Element.ElementType = etEnd; /*Prime for next line*/
          }
        else
          { /*compile (automatically assign VAR to register base position)*/
          Symbol2.ElementType = etVariable;
          Symbol2.Value = (Element.Value << 8) + VarBases[Element.Value];
          VarBases[Element.Value] += ArraySize;
          /*Enter Symbol, verify end of line and cancel elements*/
          if ((Result = EnterSymbol(Symbol2))) return(Result);
          if (Preview.ElementType == etLeft) {if ((Result = GetRight())) return(Result);} /*Finish index processing if necessary*/
          if ((Result = GetEnd(&SoftEnd))) return(Result);
          CancelElements(StartOfLine,ElementListIdx-1);
          Element.ElementType = etEnd; /*Prime for next line*/
          }
        } /*Found BIT, NIB, BYTE or WORD*/
      else
        {  /*Not BIT, NIB, BYTE or WORD, should be variable*/
        if (Element.ElementType == etVariable)
          { /*Found a variable name*/
          /*Get Modifiers, enter symbol, verify end of line and cancel elements*/
          if ((Result = GetModifiers(&Element))) return(Result);
          if ((Result = EnterSymbol(Symbol2))) return(Result);
          if ((Result = GetEnd(&SoftEnd))) return(Result);
          CancelElements(StartOfLine,ElementListIdx-1);
          Element.ElementType = etEnd; /*Prime for next line*/
          }
        else
          { /*Not a variable, may be unknown so far*/
          if (Element.ElementType != etUndef) return(Error(ecEAV)); /*Not unresolved var? Error, Expected a Variable*/
          /*Must be unknown variable*/
          if (LastPass) return(Error(ecUS)); /*If still unknown on last pass, Error, Unrecognized Symbol*/
          Element.Value = (3 << 8) + (Element.Value & 0xFF);  /*Set size (highbyte) to Word so there are not size errors*/
          if ((Result = GetModifiers(&Element))) return(Result);
          if ((Result = GetEnd(&SoftEnd))) return(Result);
          Element.ElementType = etEnd; /*Prime for next line*/
          }
        }
      } /*Found a VAR declaration*/
    /*Skip to end of line*/
    while ( (Element.ElementType != etEnd) && GetElement(&Element) );
    StartOfLine = ElementListIdx;
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode ResolveConstant(bool LastPass, bool CCDefine, bool *Resolved)
/*Resolve constant expression. Set LastPass = False to "try to" resolve, set it =
 True to fail if constant not yet resolved.  Set CCDefine = True if resolving
 a #SELECT expression.  Returns true if resolved, false otherwise.*/
{
  TElementList  Element;
  TElementList  Preview;
  TOperatorCode Operation;
  word          Value;
  bool          NFlag;   /*Negative flag*/
  bool          URFlag;  /*Unresolved flag*/

  NFlag = False;
  URFlag = False;
  Value = 0;
  Preview.Value = (word) ocAdd; /*Prime for first operation (add constant to 0)*/
  ElementListIdx--;             /*Prime index (Back up by 1)*/

  do
    {
    Operation = (TOperatorCode) Preview.Value; /*Get desired operation*/
    ElementListIdx++;                          /*Skip operator*/
    GetElement(&Element);                      /*Get next element*/
    if (Element.ElementType == etBinaryOp)
      { /*Binary Operator*/
      if (Element.Value != (word) ocSub) if (!CCDefine) return(Error(ecEAC)); else Error(ecENEDDSON); /*Not neg?, "Expected a Constant", or if CCDefine, "expected a number, editor directive, DEFINE's symbol or '-'"*/
      NFlag = True; /*if neg, set flag and get next element*/
      GetElement(&Element);
      }
    if ( !((Element.ElementType == etConstant) || (Element.ElementType == etPinNumber) || ((CCDefine && (Element.ElementType == etCCConstant)) || (Element.ElementType == etDirective) || (Element.ElementType == etTargetModule))) )
      { /*Not of type "constant" or "pin number" or "DEFINE'd symbol in #DEFINE expression" or editor directive (like $STAMP) or TargetModule (like BS2)*/
      if (!CCDefine)
        {                                      /*Normal constant expression...*/
        if (Element.ElementType != etUndef) return(Error(ecEAC)); /*Error if not undefined*/
        if (LastPass) return(Error(ecUS)); /*If not resolved by now, error: Undefined Symbol*/
        Element.Value = 1; /*Undefined, set value to 1 in case of ocDiv operation*/
        URFlag = True;     /*Set unresolved flag*/
        }
      else
        {                                      /*CCDefine constant expression...*/
        if (Element.ElementType != etUndef) return(Error(ecENEDODS)); /*Error if not undefined, expected a number, editor directive or DEFINE'd symbol.*/
        if (Symbol.NextRecord == 1) return(Error(ecISICCD));          /*Error, Illegal symbol in conditional-compile directive*/
        Element.Value = 0;                     /*Must be undefined symbol in CCDefine expression, substitute a constant of 0*/
        }
      }
    if (NFlag) Element.Value = -Element.Value; /*Negate value if needed*/
    NFlag = False;
    if ((Operation == ocShl) || (Operation == ocShr)) Element.Value = Lowest(Element.Value,16); /*If SHL or SHR, limit shifts to 16*/
    /*Perform requested algebraic operation*/
    switch (Operation)
      {
      case ocShl: Value = Value << Element.Value; break;
      case ocShr: Value = Value >> Element.Value; break;
      case ocAnd: Value = Value & Element.Value; break;
      case ocOr : Value = Value | Element.Value; break;
      case ocXor: Value = Value ^ Element.Value; break;
      case ocAdd: Value = Value + Element.Value; break;
      case ocSub: Value = Value - Element.Value; break;
      case ocMul: Value = Value * Element.Value; break;
      case ocDiv: if (Element.Value > 0) Value = Value / Element.Value; else return(Error(ecCDBZ)); break; /*Error, cannot divide by zero*/
      default   : break; /*No other operations allowed*/
      }
    /*Preview next element*/
    PreviewElement(&Preview);
    }
  while ( (Preview.ElementType == etBinaryOp) && (IsConstantOperatorCode(Preview.Value)) );
  /*Complete Symbol2*/
  Symbol2.ElementType = etConstant;
  Symbol2.Value = Value;
  *Resolved = !URFlag;
  return(ecS); /*Return success*/
}


/*------------------------------------------------------------------------------*/

TErrorCode GetCCDirectiveExpression(int SplitExpression)
/*Get CCDirective Expression into expression 0*/
{
  TErrorCode  Result;

  ExpStackTop = 0;                                                                  /*Reset expression stack pointers*/
  ExpStackBottom = 0;
  Expression[0][0] = 0;                                                             /*Reset expression size*/
  StackIdx = 0;                                                                     /*Reset stack*/
  if ((Result = GetExpression(True, False, SplitExpression, True))) return(Result);   /*Get expression*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

int GetExpBits(byte Bits, word *BitIdx)
/*Extract bits from expression 0, starting with BitIdx bit (from the left).  Bits is the number of bits to retrieve.
  This routine is used by ResolveCCDirectiveExpression.*/
{
  int  Result;

  Result = 0;
  while ((Bits > 0) && (*BitIdx < Expression[0][0]))
    {
    Result = (Result << 1) + ((Expression[0][*BitIdx / 16 + 1] >> (Lowest(15,(Expression[0][0]-(*BitIdx / 16)*16-1))-(*BitIdx % 16))) & 1);
    Bits--;
    (*BitIdx)++;
    }
  return(Result);
}

/*------------------------------------------------------------------------------*/

int RaiseToPower(int Base, int Exponent)
/*This routine is used by ResolveCCDirectiveExpression.*/
{
  int  Result;

  Result = 1;
  while (Exponent > 0)
    {
    Result = Result * Base;
    Exponent--;
    }
  return(Result);
}

/*------------------------------------------------------------------------------*/

int ResolveCCDirectiveExpression(void)
/*Resolve conditional-compile directive expression in expression 0.  Returns actual expression value*/
{
  word  BitIdx;
  int   Stack[8];
  byte  Idx;

  /*Parse and evaluate expression 0*/
  Idx = 0;
  BitIdx = 0;
  while (BitIdx < (word)Expression[0][0])
    {
    Stack[Idx] = GetExpBits(6,&BitIdx);           /*Get next item*/
    if ((Stack[Idx] & 0x20) == 0x20)
      {  /*Found Constant, finish constant calculation/retrieval*/
      if (GetExpBits(1,&BitIdx) == 0)             /*calculate power of 2 constant*/
        Stack[Idx] = RaiseToPower(2,Stack[Idx] & 0xF);
      else                      /*Get remaining bits (if any) and formulate constant*/
        if ((Stack[Idx] & 0xF) > 0) Stack[Idx] = (1 << (Stack[Idx] & 0xF)) + GetExpBits(Stack[Idx] & 0xF, &BitIdx); else Stack[Idx] = 0;
      }
    else
      {  /*Found Operator, perform operation*/
      switch (Stack[Idx])
        {
        case ocAdd: Stack[Idx-2] = (Stack[Idx-2] + Stack[Idx-1]) & 0xFFFF;        /*# + #*/
                    break;
        case ocSub: Stack[Idx-2] = (Stack[Idx-2] - Stack[Idx-1]) & 0xFFFF;        /*# - #*/
                    break;
        case ocMul: Stack[Idx-2] = (Stack[Idx-2] * Stack[Idx-1]) & 0xFFFF;        /*# * #*/
                    break;
        case ocDiv: Stack[Idx-2] = (Stack[Idx-2] / Stack[Idx-1]) & 0xFFFF;        /*# / #*/
                    break;
        case ocShl: Stack[Idx-2] = (Stack[Idx-2] << Stack[Idx-1]) & 0xFFFF;       /*# << #*/
                    break;
        case ocShr: Stack[Idx-2] = (Stack[Idx-2] >> Stack[Idx-1]) & 0xFFFF;       /*# >> #*/
                    break;
        case ocAnd: Stack[Idx-2] = (Stack[Idx-2] & Stack[Idx-1]) & 0xFFFF;        /*# AND #  --or-- # & #*/
                    break;
        case ocOr : Stack[Idx-2] = (Stack[Idx-2] | Stack[Idx-1]) & 0xFFFF;        /*# OR #   --or-- # | #*/
                    break;
        case ocXor: Stack[Idx-2] = (Stack[Idx-2] ^ Stack[Idx-1]) & 0xFFFF;        /*# XOR #  --or-- # ^ #*/
                    break;
        case ocAE : Stack[Idx-2] = ((Stack[Idx-2] >= Stack[Idx-1]) ? 0xFFFF : 0); /*# >= #*/
                    break;
        case ocBE : Stack[Idx-2] = ((Stack[Idx-2] <= Stack[Idx-1]) ? 0xFFFF : 0); /*# <= #*/
                    break;
        case ocE  : Stack[Idx-2] = ((Stack[Idx-2] == Stack[Idx-1]) ? 0xFFFF : 0); /*# = #*/
                    break;
        case ocNE : Stack[Idx-2] = ((Stack[Idx-2] != Stack[Idx-1]) ? 0xFFFF : 0); /*# <> #*/
                    break;
        case ocA  : Stack[Idx-2] = ((Stack[Idx-2] > Stack[Idx-1])  ? 0xFFFF : 0); /*# > #*/
                    break;
        case ocB  : Stack[Idx-2] = ((Stack[Idx-2] < Stack[Idx-1])  ? 0xFFFF : 0); /*# < #*/
                    break;
        case ocNeg: Stack[Idx-1] = -(Stack[Idx-1]) & 0xFFFF;                      /*-#*/
                    Idx++;                                   /*Adjust stack index for unary operator*/
                    break;
        case ocNot: Stack[Idx-1] = Stack[Idx-1] ^ 0xFFFF;                         /*NOT #*/
                    Idx++;                                   /*Adjust stack index for unary operator*/
                    break;
        }  /*case*/
      Idx -= 2;                                              /*Decrement stack index (finish pop)*/
      }  /*found operator*/
    GetExpBits(1,&BitIdx);                                   /*Get "continue" bit*/
    Idx++;                                                   /*Increment stack index (finish push)*/
    }
  return(Stack[0]);
}

/*------------------------------------------------------------------------------*/
/*---------------------------- Instruction Compilers ---------------------------*/
/*------------------------------------------------------------------------------*/

TErrorCode CompileInstructions(void)
{
  TErrorCode    Result;
  bool          StartFlag;
  bool          SoftEnd;
  TElementList  Element;

  /*Reset pointers and counters*/
  ElementListIdx = 0;
  PatchListIdx = 0;
  NestingStackIdx = 0;
  ForNextCount = 0;
  IfThenCount = 0;
  DoLoopCount = 0;
  SelectCount = 0;
  tzModuleRec->DebugFlag = False;
  EEPROMIdx = (GosubCount+1)*14;
  GosubCount = 0;
  StartFlag = False;
  /*Get first element of line and decode*/
  while (GetElement(&Element))
    { /*While more elements to process...*/
    if (Element.ElementType == etAddress) return(Error(ecLIAD)); /*Label?, Error: Label Is Already Defined*/
    if (Element.ElementType == etUndef)
      { /*Undefined address? Enter Label Symbol*/
      if ((Result = CopySymbol())) return(Result);
      Symbol2.ElementType = etAddress;
      Symbol2.Value = EEPROMIdx;
      if ((Result = EnterSymbol(Symbol2))) return(Result);
      /*If PBASIC Version 2.5, check for ':' after label.*/
      if (Lang250 && PreviewElement(&Element) && ((Element.ElementType != etEnd) || ((Element.ElementType == etEnd) && (Element.Value == 0))) ) return(Error(ecLIMC)); /*Hard End or not End at all?, Error, Label is missing ':'*/
      }
    else
      { /*Not Undefined object*/
      if (!StartFlag)
        { /*If first address, enter start address*/
        if ((Result = PatchAddress(0))) return(Result);
        StartFlag = True;
        }
      EnterSrcTokRef(); /*Enter Source vs. Token Cross Reference*/
      if ((Element.ElementType == etVariable) || (Element.ElementType == etPinNumber))
        { /*Variable Assignment (or PinNumber, variable, assignment), compile it*/
        ElementListIdx--;
        if ((Result = CompileLet())) return(Result);
        }
      else
        { /*May be Instruction*/
        if (Element.ElementType != etInstruction) return(Error(ecEALVOI)); /*Not Instruction?, Error: Expected a Label, Variable or Instruction*/
        /*Compile Instruction*/
        switch (Element.Value)
          {
          case itAuxio:    if ((Result = CompileAuxio())) return(Result); break;
          case itBranch:   if ((Result = CompileBranch())) return(Result); break;
          case itButton:   if ((Result = CompileButton())) return(Result); break;
          case itCase:     if ((Result = CompileCase())) return(Result); break;
          case itCount:    if ((Result = CompileCount())) return(Result); break;
          case itDebug:    if ((Result = CompileDebug())) return(Result); break;
          case itDebugIn:  if ((Result = CompileDebugIn())) return(Result); break;
          case itDo:       if ((Result = CompileDo())) return(Result); break;
          case itDtmfout:  if ((Result = CompileDtmfout())) return(Result); break;
          case itElse:     if ((Result = CompileElse())) return(Result); break;
          case itEnd:      if ((Result = CompileEnd())) return(Result); break;
          case itEndIf:    if ((Result = CompileEndIf())) return(Result); break;
          case itEndSelect:if ((Result = CompileEndSelect())) return(Result); break;
          case itExit:     if ((Result = CompileExit())) return(Result); break;
          case itFor:      if ((Result = CompileFor())) return(Result); break;
          case itFreqout:  if ((Result = CompileFreqout())) return(Result); break;
          case itGet:      if ((Result = CompileGet())) return(Result); break;
          case itGosub:    if ((Result = CompileGosub())) return(Result); break;
          case itGoto:     if ((Result = CompileGoto())) return(Result); break;
          case itHigh:     if ((Result = CompileHigh())) return(Result); break;
          case itI2cin:    if ((Result = CompileI2cin())) return(Result); break;
          case itI2cout:   if ((Result = CompileI2cout())) return(Result); break;
          case itIf:
          case itElseIf:   if ((Result = CompileIf(Element.Value == itElseIf))) return(Result); break;
          case itInput:    if ((Result = CompileInput())) return(Result); break;
          case itIoterm:   if ((Result = CompileIoterm())) return(Result); break;
          case itLcdcmd:   if ((Result = CompileLcdcmd())) return(Result); break;
          case itLcdin:    if ((Result = CompileLcdin())) return(Result); break;
          case itLcdout:   if ((Result = CompileLcdout())) return(Result); break;
          case itLookdown: if ((Result = CompileLookdown())) return(Result); break;
          case itLookup:   if ((Result = CompileLookup())) return(Result); break;
          case itLoop:     if ((Result = CompileLoop())) return(Result); break;
          case itLow:      if ((Result = CompileLow())) return(Result); break;
          case itMainio:   if ((Result = CompileMainio())) return(Result); break;
          case itNap:      if ((Result = CompileNap())) return(Result); break;
          case itNext:     if ((Result = CompileNext())) return(Result); break;
          case itOn:       if ((Result = CompileOn())) return(Result); break;
          case itOutput:   if ((Result = CompileOutput())) return(Result); break;
          case itOwin:     if ((Result = CompileOwin())) return(Result); break;
          case itOwout:    if ((Result = CompileOwout())) return(Result); break;
          case itPause:    if ((Result = CompilePause())) return(Result); break;
          case itPollin:   if ((Result = CompilePollin())) return(Result); break;
          case itPollmode: if ((Result = CompilePollmode())) return(Result); break;
          case itPollout:  if ((Result = CompilePollout())) return(Result); break;
          case itPollrun:  if ((Result = CompilePollrun())) return(Result); break;
          case itPollwait: if ((Result = CompilePollwait())) return(Result); break;
          case itPulsin:   if ((Result = CompilePulsin())) return(Result); break;
          case itPulsout:  if ((Result = CompilePulsout())) return(Result); break;
          case itPut:      if ((Result = CompilePut())) return(Result); break;
          case itPwm:      if ((Result = CompilePwm())) return(Result); break;
          case itRandom:   if ((Result = CompileRandom())) return(Result); break;
          case itRctime:   if ((Result = CompileRctime())) return(Result); break;
          case itRead:     if ((Result = CompileRead())) return(Result); break;
          case itReturn:   if ((Result = CompileReturn())) return(Result); break;
          case itReverse:  if ((Result = CompileReverse())) return(Result); break;
          case itRun:      if ((Result = CompileRun())) return(Result); break;
          case itSelect:   if ((Result = CompileSelect())) return(Result); break;
          case itSerin:    if ((Result = CompileSerin())) return(Result); break;
          case itSerout:   if ((Result = CompileSerout())) return(Result); break;
          case itShiftin:  if ((Result = CompileShiftin())) return(Result); break;
          case itShiftout: if ((Result = CompileShiftout())) return(Result); break;
          case itSleep:    if ((Result = CompileSleep())) return(Result); break;
          case itStop:     if ((Result = CompileStop())) return(Result); break;
          case itStore:    if ((Result = CompileStore())) return(Result); break;
          case itToggle:   if ((Result = CompileToggle())) return(Result); break;
          case itWrite:    if ((Result = CompileWrite())) return(Result); break;
          case itXout:     if ((Result = CompileXout())) return(Result); break;
          } /*Case*/
        }
      }  /*Defined address*/
      if ((IfThenCount == 0) || !(NestingStack[NestingStackIdx-1].NestType < ntIFMultiElse))
        {
        if ((Result = GetEnd(&SoftEnd))) return(Result); /*Not in single-line IF..THEN code block, get END element*/
        }
      else
        {  /*We're in single-line IF..THEN*/
        if ( (NestingStack[NestingStackIdx-1].NestType == ntIFSingleMain) || (NestingStack[NestingStackIdx-1].NestType == ntIFSingleElse) )
          {  /*Single main-part (look for Colon (Soft End), EOL (Hard End) or ELSE) or Single else-part (look for Colon (Soft End), EOL (Hard End)*/
          PreviewElement(&Element);
          /*If in main-part, check for ELSE or End.  If we're in else-part, just get End*/
          if ( (NestingStack[NestingStackIdx-1].NestType == ntIFSingleElse) ||
               ((Element.ElementType != etInstruction) || ((Element.Value != itElse) && (Element.Value != itElseIf))) )
            {
            if ((Result = GetEnd(&SoftEnd))) return(Result);
            if (!SoftEnd)
              {  /*Hard End, Patch the SkipLabel, Pop the stack and finish IF..THEN*/
              if (NestingStack[NestingStackIdx-1].Exits[0] > 0) if ((Result = PatchSkipLabels(True))) return(Result); /*Process ELSEIF's ExitLabels, if any*/
              if ((Result = PatchSkipLabels(False))) return(Result);
              NestingStackIdx--;
              IfThenCount--;
              }
            }
          }
        else    /*Starting Single Main or Else-Part, there's no End element here*/
          {
          if ( (NestingStack[NestingStackIdx-1].NestType == ntIFSingleMainNE) || (NestingStack[NestingStackIdx-1].NestType == ntIFSingleElseNE) ) NestingStack[NestingStackIdx-1].NestType = (TNestingType)(((byte)NestingStack[NestingStackIdx-1].NestType)-1);
          }
        }
    }  /*While more elements to process...*/
  if (StartFlag) { if ((Result = Enter0Code(icEnd))) return(Result);} /*If at least some instructions, enter 'END'*/
  /*Verify all multi-line code blocks were ended properly*/
  if ((Lang250) && (NestingStackIdx > 0))
    {  /*Still a nested code block on the stack, Error*/
    ElementListIdx = NestingStack[NestingStackIdx-1].ElementIdx;
    GetElement(&Element);
    switch (NestingStack[NestingStackIdx-1].NestType)
      {
      case ntIFSingleElse  :
      case ntIFSingleMain  :
      case ntIFMultiElse   :
      case ntIFMultiMain   : return(Error(ecIWEI)); /*Error, IF without ENDIF*/
      case ntFOR           : return(Error(ecFWN));  /*Error, FOR without NEXT*/
      case ntDO            : return(Error(ecDWL));  /*Error, DO without LOOP*/
      case ntSELECT        : return(Error(ecSWE));  /*Error, SELECT without ENDSELECT*/
      default              : break;                 /*No other case allowed*/
      }
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileAuxio(void)
/*Syntax: AUXIO*/
{
  TErrorCode    Result;

  if ((Result = Enter0Code(icAuxio))) return(Result);               /*Enter 0 followed by 6-bit 'AUXIO' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileBranch(void)
/*Syntax: BRANCH index,[address0,address1,..addressN]*/
{
  TErrorCode    Result;
  bool          FoundBracket;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get index value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icBranch))) return(Result);                /*Enter 0 followed by 6-bit 'BRANCH' instruction code into EEPROM*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  if ((Result = GetLeftBracket())) return(Result);                    /*Get '['*/
  do
    {
    if ((Result = GetAddressEnter())) return(Result);                 /*Get destination address and enter into EEPROM*/
    if ((Result = GetCommaOrBracket(&FoundBracket))) return(Result);
    }
  while (!FoundBracket);                                            /*Repeat until bracket or error found*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileButton(void)
/*Syntax: BUTTON pin, state, delay, rate, bytevariable, targetstate, address*/
{
  TErrorCode  Result;
  int         OldElementListIdx;

  StackIdx = 5;
  if ((Result = GetValue(1,True))) return(Result);                    /*Get pin value into expression 1*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get state value and enter 1 followed by the value into EEPROM*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  StackIdx = 1;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get delay value and enter 1 followed by the value into EEPROM*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  StackIdx = 2;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get rate value and enter 1 followed by the value into EEPROM*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  OldElementListIdx = ElementListIdx;                                 /*Save current element position*/
  StackIdx = 4;
  if ((Result = GetRead(2))) return(Result);                          /*Get bytevariable 'read' into expression 2*/
  ElementListIdx = OldElementListIdx;                                 /*'back up' to previous element position*/
  StackIdx = 1;
  if ((Result = GetWrite(3))) return(Result);                         /*Get bytevariable 'write' into expression 3*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  StackIdx = 3;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get targetstate value and enter 1 followed by the value into EEPROM*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  if ((Result = EnterExpression(2,True))) return(Result);             /*Enter 1 followed by expression 2 (bytevariable 'read') into EEPROM*/
  if ((Result = EnterExpression(1,True))) return(Result);             /*Enter 1 followed by expression 1 (pin value) into EEPROM*/
  if ((Result = Enter0Code(icButton))) return(Result);                /*Enter 0 followed by 6-bit 'BUTTON' instruction code into EEPROM*/
  if ((Result = EnterExpression(3,False))) return(Result);            /*Enter expression 3 (bytevariable 'write') into EEPROM*/
  if ((Result = EnterEEPROM(1,0))) return(Result);                    /*Enter 0 into EEPROM*/
  if ((Result = GetAddressEnter())) return(Result);                   /*Get destination address and enter into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileCase(void)
/*Syntax: SELECT expression /../ CASE { (condition(s)|ELSE) }{:} /../ ENDSELECT
  NOTE: See CompileSelect for implementation examples. */
{
  TElementList  Element;
  int           TempIdx;
  bool          ProcessOr;
  TErrorCode    Result;

  StackIdx = 0;
  if (SelectCount == 0) return(Error(ecCMBPBS));                 /*No SELECTs? Error, CASE must be preceeded by SELECT*/
  if (NestingStack[NestingStackIdx-1].NestType != ntSELECT) return(NestingError()); /*Not in SELECT CASE nest? Display proper error*/
  if (NestingStack[NestingStackIdx-1].SkipLabel > 0)
    {  /*Not the first CASE condition in statement?  Insert GOTO ExitLabel (for previous CASE) and patch last SkipLabel address*/
    if (NestingStack[NestingStackIdx-1].SkipLabel == EEPROMIdx-14) return(Error(ecESTFPC)); /*No statements before this CASE? Error, Expected statements to follow previous 'CASE'*/
    if ((Result = Enter0Code(icGoto))) return(Result);           /*Insert GOTO to ExitLabel (or JumpLabel) part*/
    /*End previous case with a GOTO ExitLabel*/
    TempIdx = 0;                                                 /*Look for stack space in nesting structure's EXIT stack*/
    while ( (TempIdx < MaxExits-1) && (NestingStack[NestingStackIdx-1].Exits[TempIdx] != 0) ) TempIdx++; /*Find next available exit slot*/
    if (TempIdx == MaxExits-1) return(Error(ecLOSCSWSSE));       /*Too many Exits? Error, Limit of 16 CASE statements within SELECT structure exceeded*/
    NestingStack[NestingStackIdx-1].Exits[TempIdx] = EEPROMIdx;  /*Store GOTO's ExitLabel for future patching*/
    EEPROMIdx += 14;                                             /*Reserve space in EEPROM for GOTO's ExitLabel*/
    if ((Result = PatchSkipLabels(False))) return(Result);       /*Patch SkipLabel*/
    }

  ProcessOr = False;
  TempIdx = 0;
  if ( GetElement(&Element) && !((Element.ElementType == etInstruction) && (Element.Value == itElse)) )
    {  /*Not CASE ELSE, must be CASE conditional*/
    ElementListIdx--;                            /*Back up to start of condition*/
    do  /*Get expression and conditional*/
      {
      TempIdx = ElementListIdx;                  /*Look ahead for comma, 'TO' or End to decide if we expect a single conditional or range*/
      while ( GetElement(&Element) && !((Element.ElementType == etComma) || (Element.ElementType == etTo) || (Element.ElementType == etEnd)) );
      ElementListIdx = TempIdx;                                                 /*Restore ElementListIdx (keep in TempIdx for split-condition in GetExpression)*/
      ElementListIdx = NestingStack[NestingStackIdx-1].ExpIdx;                  /*Move to start of SELECT's expression*/
      if (Element.ElementType == etTo)
        {  /*Found range condition (# TO #)*/
        /*Get range-begin expression*/
        NestingStack[NestingStackIdx-1].AutoCondOp = ocAE;                      /*Set AutoInsert '>='*/
        if ((Result = GetValueConditional(True,False,TempIdx))) return(Result); /*Get split coditional expression*/
        CopyExpression(0,1);                                                    /*Copy range-begin to expression 1*/
        /*Get 'TO'*/
        if ((Result = GetTO())) return(Result);
        /*Get range-end expression*/
        TempIdx = ElementListIdx;                                               /*Save start of second condition (for split-condition in GetExpression)*/
        ElementListIdx = NestingStack[NestingStackIdx-1].ExpIdx;                /*Move back to start of SELECT's expression*/
        NestingStack[NestingStackIdx-1].AutoCondOp = ocBE;                      /*Set AutoInsert '<='*/
        if ((Result = GetValueConditional(True,False,TempIdx))) return(Result); /*Get split coditional expression*/
        CopyExpression(0,2);                                                    /*Copy range-end to expression 2*/
        CopyExpression(1,0);                                                    /*Copy expression 1 (range-begin) back to expression 0*/
        /*Append range-end to expression followed by AND operator to expression 0*/
        if ((Result = AppendExpression(2,ocAnd))) return(Result);
        }  /*Found range condition (# TO #)*/
      else
        {  /*Not range, must be single condition*/
        NestingStack[NestingStackIdx-1].AutoCondOp = ocE;                       /*Set AutoInsert '=' if necessary*/
        if ((Result = GetValueConditional(True,False,TempIdx))) return(Result); /*Get split coditional expression*/
        }
      if (ProcessOr)
        {  /*Append this expression to the previous one followed by OR operator*/
        CopyExpression(0,1);                                                    /*Save current expression*/
        CopyExpression(3,0);                                                    /*Restore previous expression*/
        if ((Result = AppendExpression(1,ocOr))) return(Result);                /*Append current followed by OR operator*/
        }
      GetElement(&Element);                                                     /*Get next element, should be comma or end*/
      if (Element.ElementType == etComma)
        {  /*Multiple conditions ('OR' needed), save expression for later*/
        CopyExpression(0,3);                                                    /*Save current expression for later*/
        ProcessOr = True;                                                       /*Set flag to insert OR*/
        }
      }
    while (Element.ElementType == etComma);
    if (Element.ElementType != etEnd) return(Error(ecECEOLOC));                 /*Not End? Error, expected ',', end-of-line or ':'*/
    ElementListIdx--;
    if ((Result = EnterExpression(0,True))) return(Result);                     /*Enter 1 followed by expression 0 (the condition) into EEPROM*/
    if ((Result = Enter0Code(icIf))) return(Result);                            /*Enter 0 followed by 6-bit 'IF' instruction code into EEPROM*/
    TempIdx = EEPROMIdx;                                                        /*Save "JumpLabel" EEPROM address for patching in a moment*/
    EEPROMIdx += 14;                                                            /*Reserve space in EEPROM for JumpLabel*/
    if ((Result = Enter0Code(icGoto))) return(Result);                          /*Insert GOTO to SkipLabel part*/
    NestingStack[NestingStackIdx-1].SkipLabel = EEPROMIdx;                      /*Store GOTO's SkipLabel on stack*/
    EEPROMIdx += 14;                                                            /*Reserve space in EEPROM for GOTO's SkipLabel*/
    }  /*CASE conditional*/
  if (TempIdx > 0) if ((Result = PatchAddress(TempIdx))) return(Result);        /*Patch JumpLabel if necessary (ie: not CASE ELSE)*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileCount(void)
/*Syntax: COUNT pin, milliseconds, variable*/
{
  TErrorCode    Result;

  StackIdx = 1;
  if ((Result = GetValue(1,True))) return(Result);                    /*Get pin value into expression 1*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get milliseconds value and enter 1 followed by the value into EEPROM*/
  if ((Result = EnterExpression(1,True))) return(Result);             /*Enter 1 followed by expression 1 (pin value) into EEPROM*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  if ((Result = Enter0Code(icCount))) return(Result);                 /*Enter 0 followed by 6-bit 'COUNT' instruction code into EEPROM*/
  if ((Result = GetWriteEnterExpression())) return(Result);           /*Get variable 'write' and enter into EEPROM followed by a 0*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileDebug(void)
/*Syntax: DEBUG outdata*/
{
  TErrorCode    Result;

  tzModuleRec->DebugFlag = True;
  if ( (tzModuleRec->TargetModule == tmBS2) || (tzModuleRec->TargetModule == tmBS2e) || (tzModuleRec->TargetModule == tmBS2pe) )
    {
    if ((Result = EnterConstant(104-20,True))) return(Result);      /*Enter 1 followed by baudmode for 9600 on BS2, BS2e or BS2pe into EEPROM*/
    }
  else
    if ((Result = EnterConstant(260-20,True))) return(Result);      /*Enter 1 followed by baudmode for 9600 on BS2sx or BS2p into EEPROM*/
  if ((Result = EnterConstant(16,True))) return(Result);            /*Enter 1 followed by 16 into (pin number) EEPROM*/
  if ((Result = Enter0Code(icSeroutNoFlow))) return(Result);        /*Enter 0 followed by 6-bit 'SEROUT w/o Flow' instruction code into EEPROM*/
  if ((Result = CompileOutputSequence())) return(Result);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileDebugIn(void)
/*Syntax: DEBUGIN indata*/
{
  TErrorCode  Result;

  tzModuleRec->DebugFlag = True;
  if ((Result = EnterConstant(1,True))) return(Result);            /*Enter 1 followed by 1 into EEPROM*/
  if ( (tzModuleRec->TargetModule == tmBS2) || (tzModuleRec->TargetModule == tmBS2e) || (tzModuleRec->TargetModule == tmBS2pe) )
    {
    if ((Result = EnterConstant(104-20,True))) return(Result);     /*Enter 1 followed by baudmode for 9600 on BS2, BS2e or BS2pe into EEPROM*/
    }
  else
    {
    if ((Result = EnterConstant(260-20,True))) return(Result);     /*Enter 1 followed by baudmode for 9600 on BS2sx or BS2p into EEPROM*/
    }
  if ((Result = EnterConstant(16,True))) return(Result);           /*Enter 1 followed by 16 (pin number) into EEPROM*/
  if ((Result = Enter0Code(icSerinNoFlow))) return(Result);        /*Enter 0 followed by 6-bit 'SERIN w/o Flow' instruction code into EEPROM*/
  if ((Result = CompileInputSequence())) return(Result);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileDo(void)
/*Syntax: DO {{WHILE | UNTIL} condition} /../ LOOP {{WHILE | UNTIL} condition}
  NOTE: a DO..LOOP may contain no conditions, making it an endless loop
  NOTE: The NestingStack is used to keep track of addresses to jump to or patch and potential nesting.

  NOTE: The BS2 through BS2pe do not have DO..LOOP implemented in firmware.
        To achieve a DO..LOOP, the command is translated by CompileDo, CompileLoop into the following
        (The actual source isn't modified, however the result is effectively equal to the following
        translation in source code):

        EXAMPLE:                                                  TRANSLATES TO:
        DO                                                        JumpLabel:
          instruction(s)                                            instruction(s)
        LOOP                                                      GOTO JumpLabel
 
        DO WHILE condition(s)                                     JumpLabel:
          instruction(s)                                          IF condition(s) THEN MainLabel
        LOOP                                                        GOTO SkipLabel
                                                                  MainLabel:
                                                                    instruction(s)
                                                                    GOTO JumpLabel
                                                                  SkipLabel:

        DO UNTIL condition(s)                                     JumpLabel:
          instruction(s)                                          IF condition(s) THEN SkipLabel
        LOOP                                                        instruction(s)
                                                                    GOTO JumpLabel
                                                                  SkipLabel:
 
        DO                                                        JumpLabel:
          instruction(s)                                            instruction(s)
        LOOP WHILE condition(s)                                   IF condition(s) THEN JumpLabel
                                                                  SkipLabel:

        DO                                                        JumpLabel:
          instruction(s)                                            instruction(s)
        LOOP UNTIL condition(s)                                   IF condition(s) THEN SkipLabel
                                                                    GOTO JumpLabel
                                                                  SkipLabel:
                                                                  */

{
  TElementList  Element;
  int           Idx;
  int           MainPartLabel;
  TErrorCode    Result;

  if (DoLoopCount == DoLoopStackSize) return(Error(ecLOSNDLSE));        /*Index out of range? Error, Limit of 16 Nested DO-LOOP Statements Exceeded*/
  NestingStack[NestingStackIdx].NestType = ntDO;                        /*Set type to DO*/
  NestingStack[NestingStackIdx].ElementIdx = ElementListIdx-1;          /*Save element list index on stack*/
  NestingStack[NestingStackIdx].JumpLabel = EEPROMIdx;                  /*Save JumpLabel on the stack*/
  NestingStack[NestingStackIdx].SkipLabel = 0;                          /*Reset SkipLabel*/
  for (Idx = 0; Idx < MaxExits; Idx++) NestingStack[NestingStackIdx].Exits[Idx] = 0; /*Reset Exits stack*/
  NestingStackIdx++;                                                    /*Finish stack "push"*/
  DoLoopCount++;
  PreviewElement(&Element);                                             /*Preview next element, may be End, WHILE or UNTIL*/
  if (Element.ElementType != etEnd)
    {  /*No End after DO, should be WHILE or UNTIL condition*/
    GetElement(&Element);                                               /*Get WHILE or UNTIL*/
    if ( !((Element.ElementType == etWhile) || (Element.ElementType == etUntil)) ) return(Error(ecEWUEOLOC)); /*Not WHILE or UNTIL? Error, Expected 'WHILE', 'UNTIL', end-of-line, or ':'*/
    /*WHILE or UNTIL condition found*/
    StackIdx = 0;
    if ((Result = GetValueConditional(True,False,0))) return(Result);   /*Get conditional expression*/
    if ((Result = EnterExpression(0,True))) return(Result);             /*Enter 1 followed by expression 0 (the condition) into EEPROM*/
    if ((Result = Enter0Code(icIf))) return(Result);                    /*Enter 0 followed by 6-bit 'IF' instruction code into EEPROM*/
    if (Element.ElementType == etUntil)
      {                                                                 /*If UNTIL condition...*/
      NestingStack[NestingStackIdx-1].SkipLabel = EEPROMIdx;            /*Store SkipLabel address on stack*/
      EEPROMIdx += 14;                                                  /*Reserve space in EEPROM for skiplabel address*/
      }
    else
      {                                                                 /*If WHILE condition...*/
      MainPartLabel = EEPROMIdx;                                        /*Remember MainLabel for patching in a moment*/
      EEPROMIdx += 14;                                                  /*Reserve space in EEPROM for MainLabel*/
      if ((Result = Enter0Code(icGoto))) return(Result);                /*Insert GOTO to SkipLabel part*/
      NestingStack[NestingStackIdx-1].SkipLabel = EEPROMIdx;            /*Store GOTO's SkipLabel on stack*/
      EEPROMIdx += 14;                                                  /*Reserve space in EEPROM for GOTO's SkipLabel*/
      if ((Result = PatchAddress(MainPartLabel))) return(Result);       /*Patch MainPartLabel*/
      }
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileDtmfout(void)
/*Syntax: DTMFOUT pin, {OnMilliseconds, OffMilliseconds,} [key0, key1,...keyN]*/
{
  TErrorCode    Result;
  TElementList  Preview;
  bool          FoundBracket;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,True))) return(Result);     /*Get pin value and enter 1 followed by the value into EEPROM*/
  if ((Result = GetComma())) return(Result);                             /*Get ','*/
  PreviewElement(&Preview);                                              /*Check for default on/off time*/
  if (Preview.ElementType == etLeftBracket)
    { /*Left bracket (ie: Default on/off time)*/
    if ((Result = EnterConstant(50,True))) return(Result);               /*Enter 1 followed by default off time into EEPROM*/
    if ((Result = EnterConstant(200,True))) return(Result);              /*Enter 1 followed by default on time into EEPROM*/
    }   /*Left bracket (ie: Default on/off time)*/
  else
    { /*No left bracket (ie: Non-default on/off time)*/
    StackIdx = 2;
    if ((Result = GetValue(1,False))) return(Result);                    /*Get OnMilliseconds argument*/
    if ((Result = GetComma())) return(Result);                           /*Get ','*/
    StackIdx = 1;
    if ((Result = GetValueEnterExpression(True,False))) return(Result);  /*Get OffMilliseconds and enter 1 followed by the value into EEPROM*/
    if ((Result = GetComma())) return(Result);                           /*Get ','*/
    if ((Result = EnterExpression(1,True))) return(Result);              /*Enter 1 followed by OnMilliseconds value into EEPROM*/
    }  /*No left bracket (ie: Non-default on/off time)*/
  if ((Result = Enter0Code(icDtmfout))) return(Result);                  /*Enter 0 followed by 6-bit 'DTMFOUT' instruction code into EEPROM*/
  if ((Result = GetLeftBracket())) return(Result);                       /*Get '['*/
  do
    {
    StackIdx = 3;
    if ((Result = GetValueEnterExpression(False,False))) return(Result); /*Get next value and enter into EEPROM*/
    if ((Result = EnterEEPROM(1,0))) return(Result);                     /*Enter 0 into EEPROM*/
    if ((Result = GetCommaOrBracket(&FoundBracket))) return(Result);
    }
  while (!FoundBracket);                                                 /*Repeat until bracket or error found*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileElse(void)
/*Syntax: IF..THEN..{ELSEIF..}..ELSE --or-- IF..THEN /../ {ELSEIF /../..} {ELSE /../} ENDIF
  NOTE: See CompileIF for implementation examples*/
{
  TErrorCode  Result;

  if (IfThenCount == 0) return(Error(ecEMBPBIOC)); /*No IF's? Error, ELSE must be preceeded by IF or CASE*/
  if (NestingStack[NestingStackIdx-1].NestType > ntIFMultiMain) return(NestingError()); /*Not in IF..THEN nest? Display proper error*/
  if ( !((NestingStack[NestingStackIdx-1].NestType == ntIFSingleMain) || (NestingStack[NestingStackIdx-1].NestType == ntIFMultiMain)) )
    if (NestingStack[NestingStackIdx-1].NestType < ntIFMultiElse) return(Error(ecEALVIOEOL)); else return(Error(ecEALVIOE)); /*Duplicate ELSE? Error, Expected a label, variable, instruction or end-of-line, OR, Error, Expected a label, variable, instruction or ENDIF*/
  if ((Result = Enter0Code(icGoto))) return(Result);           /*Insert GOTO so previous "main-part" skips ELSE part*/
  EEPROMIdx += 14;                                             /*Reserve space in EEPROM for GOTO's SkipLabel*/
  if ((Result = PatchSkipLabels(False))) return(Result);       /*Patch IF..THEN's SkipLabel*/
  NestingStack[NestingStackIdx-1].SkipLabel = EEPROMIdx-14;    /*Store GOTO's SkipLabel on stack and set Mode*/
  NestingStack[NestingStackIdx-1].NestType = NestingStack[NestingStackIdx-1].NestType = (TNestingType)(((byte)NestingStack[NestingStackIdx-1].NestType)-1); /*Move to "ELSE" mode*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileEnd(void)
/*Syntax: END*/
{
  TErrorCode  Result;

  if ((Result = Enter0Code(icEnd))) return(Result);                 /*Enter 0 followed by 6-bit 'END' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileEndIf(void)
/*Syntax: IF..THEN /../ {ELSEIF /../..} {ELSE /../} ENDIF
  Patch the SkipLabel and Finish IF..THEN.
  NOTE: See CompileIF for implementation examples.*/
{
  TErrorCode  Result;

  if (IfThenCount == 0) return(Error(ecEIMBPBI)); /*No IF's? Error, ENDIF must be preceeded by IF*/
  if (NestingStack[NestingStackIdx-1].NestType > ntIFMultiMain) return(NestingError());                   /*Not in IF..THEN nest? Display proper error*/
  if (NestingStack[NestingStackIdx-1].Exits[0] > 0) if ((Result = PatchSkipLabels(True))) return(Result); /*Process ELSEIF's ExitLabels, if any*/
  if ((Result = PatchSkipLabels(False))) return(Result);
  NestingStackIdx--;                              /*Pop the stack*/
  IfThenCount--;
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileEndSelect(void)
/*Syntax: SELECT expression /../ CASE { (condition(s)|ELSE) }{:} /../ ENDSELECT
  NOTE: See CompileSelect for implementation examples. */
{
  TErrorCode  Result;

  if (SelectCount == 0) return(Error(ecESMBPBS)); /*No SELECTs? Error, ENDSELECT must be preceeded by SELECT*/
  if (NestingStack[NestingStackIdx-1].NestType != ntSELECT) return(NestingError()); /*Not in SELECT nest? Display proper error*/
  if (NestingStack[NestingStackIdx-1].SkipLabel == EEPROMIdx-14) return(Error(ecESTFPC)); /*No statements before this ENDSELECT? Error, Expected statements to follow previous 'CASE'*/
  if ((Result = PatchSkipLabels(False))) return(Result);                            /*Patch last SkipLabel*/
  if ((Result = PatchSkipLabels(True))) return(Result);                             /*Patch any ExitLabels*/
  NestingStackIdx--;                                                                /*Pop the stack*/
  SelectCount--;
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileExit(void)
/*Syntax: EXIT
 NOTE: EXIT can only appear within a DO..LOOP or FOR..NEXT loop*/
{
  int         Idx;
  int         StackIdx;
  TErrorCode  Result;

  if ( (ForNextCount == 0) && (DoLoopCount == 0) ) return(Error(ecEOAWFNADLS));  /*No FOR..NEXT or DO..LOOP? Error, EXIT only allowed within FOR..NEXT and DO..LOOP structures*/
  /*Search stack backwards for first loop structure*/
  StackIdx = NestingStackIdx-1;
  while ( (StackIdx > 0) && ((NestingStack[StackIdx].NestType != ntDO) && (NestingStack[StackIdx].NestType != ntFOR)) ) StackIdx--;
  Idx = 0;                                                /*Look for stack space in loop structure*/
  while ( (Idx < MaxExits) && (NestingStack[StackIdx].Exits[Idx] != 0) ) Idx++;  /*Find next available exit slot*/
  if (Idx == MaxExits) return(Error(ecLOSESWLSE));        /*Too many Exits? Error, Limit of 16 EXIT statements within loop structure exceeded*/
  if ((Result = Enter0Code(icGoto))) return(Result);      /*Insert GOTO to jump to SkipLabel*/
  NestingStack[StackIdx].Exits[Idx] = EEPROMIdx;          /*Store SkipLabel address in NestingStack's Exits stack*/
  EEPROMIdx += 14;                                        /*Reserve space in EEPROM for skiplabel address*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileFor(void)
/*Syntax: FOR variable = value1 to value2 {STEP value3}*/
{
  TElementList  Element;
  int           Idx;
  TErrorCode    Result;

  if (ForNextCount == ForNextStackSize) return(Error(ecLOSNFNLE));                   /*Too many? Error: Limit of 16 Nested FOR-NEXT Loops Exceeded*/
  NestingStack[NestingStackIdx].NestType = ntFOR;                                    /*Set type to FOR*/
  NestingStack[NestingStackIdx].ElementIdx = ElementListIdx-1;                       /*Save starting element*/
  for (Idx = 0; Idx < MaxExits; Idx++) NestingStack[NestingStackIdx].Exits[Idx] = 0; /*Reset Exits stack*/
  if ((Result = CompileLet())) return(Result);                                       /*Get variable and value1*/
  NestingStack[NestingStackIdx].JumpLabel = EEPROMIdx;                               /*Remember JumpLabel*/
  NestingStackIdx++;                                                                 /*Finish stack "push"*/
  ForNextCount++;
  if ((Result = GetTO())) return(Result);                                            /*Get 'TO'*/
  StackIdx = 0;
  if ((Result = GetValueConditional(False,False,0))) return(Result);                 /*Get value2 into expression 0.  Just parsing, we don't care about the values here*/
  GetElement(&Element);
  if (Element.ElementType != etEnd)
    {
    if (Element.ElementType != etStep) return(Error(ecESEOLOC));                     /*Not STEP? Error: Expected 'STEP', end-of-line, or ':'*/
    StackIdx = 0;
    if ((Result = GetValueConditional(False,False,0))) return(Result);               /*Get value3 into expression 0.  Just parsing, we don't care about the values here*/
    }
  else
    ElementListIdx--;
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileFreqout(void)
/*Syntax: FREQOUT pin, duration, frequency1 {,frequency2}*/
{
  TErrorCode    Result;
  TElementList  Preview;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,True))) return(Result);    /*Get pin value and enter 1 followed by the value into EEPROM*/
  if ((Result = GetComma())) return(Result);                            /*Get ','*/
  StackIdx = 1;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);   /*Get duration value and enter 1 followed by the value into EEPROM*/
  if ((Result = GetComma())) return(Result);                            /*Get ','*/
  StackIdx = 2;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);   /*Get frequency1 value and enter 1 followed by the value into EEPROM*/
  PreviewElement(&Preview);                                             /*Check for optional frequency2 argument*/
  if (Preview.ElementType == etComma)
    { /*Found comma, must be Frequency2 argument*/
    ElementListIdx++;                                                   /*Skip to next element*/
    StackIdx = 3;
    if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get frequency2 value and enter 1 followed by the value into EEPROM*/
    if ((Result = Enter0Code(icFreqout2))) return(Result);              /*Enter 0 followed by 6-bit 'Freqout_2' instruction code into EEPROM*/
    } /*Found comma, must be Frequency2 argument*/
  else
    if ((Result = Enter0Code(icFreqout1))) return(Result);              /*Enter 0 followed by 6-bit 'Freqout_1' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileGet(void)
/*Syntax: GET location, {WORD} variable {,{WORD} variable...*/
{
  TElementList  Element;
  int           Temp;                     /*Element where value starts*/
  int           PrevElement;              /*Temporary elementlistidx holder*/
  int           Idx;                      /*Location offset*/
  TErrorCode    Result;

  Temp = 0;                               /*Assume classic syntax*/
  Idx = 0;
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);     /*Get location value and enter 1 followed by the value into EEPROM*/
  CopyExpression(0,1);                                                    /*Save location expression for later use*/
  if ((Result = Enter0Code(icGet))) return(Result);                       /*Enter 0 followed by 6-bit 'GET' instruction code into EEPROM*/
  if ((Result = GetComma())) return(Result);                              /*Get ','*/
  do
    {
    if ( (Lang250) && (PreviewElement(&Element)) && (Element.ElementType == etVariableAuto) )
      {  /*if PBASIC version 2.5, could be optional WORD switch*/
      GetElement(&Element);                                               /*Get the optional switch element*/
      if (Element.Value != 0x0003) return(Error(ecEVOW));                 /*Not WORD? Error, Expected variable or 'WORD'*/
      Temp = ElementListIdx;                                              /*WORD switch, save start of variable*/
      }
    /*Finish classic syntax*/
    StackIdx = 1;
    if ((Result = GetWriteEnterExpression())) return(Result);             /*Get variable 'write' and enter into EEPROM followed by a 0*/
    if (Temp > 0)
      {  /*Enhanced WORD Syntax*/
      /*Verify word-sized variable. (Already verified it is proper variable reference from GetWriteEnterExpression)*/
      PrevElement = ElementListIdx;                                       /*Save current ElementListIdx*/
      ElementListIdx = Temp;                                              /*Reset to start of variable*/
      if ( GetElement(&Element) && ((Element.Value & 0x0F00) != 0x0300) ) return(Error(ecEAWV)); /*Not word-variable? Error, expected a word variable*/
      Temp = Element.Start;                                               /*Save start of variable in source*/
      if ( GetElement(&Element) && (Element.ElementType == etPeriod) )
        {  /*If modifier follows, select entire variable.modifier and Error, expected a word variable*/
        GetElement(&Element);
        tzModuleRec->ErrorStart = Temp;
        tzModuleRec->ErrorLength = Element.Start-Temp+Element.Length;
        return(Error(ecEAWV));
        }
      ElementListIdx = PrevElement;                                       /*Reset to end of command*/
      /*All okay, enter a second GET command of the form: GET location+1, variable.highbyte*/
      CopyExpression(0,2);                                                /*Save variable expression for later use*/
      CopyExpression(1,0);                                                /*Copy location expression back to expression 0*/
      Idx++;                                                              /*Increment location offset*/
      Element.Value = Idx;                                                /*Set .Value to Idx (for location+Idx)*/
      if ((Result = EnterExpressionConstant(Element))) return(Result);    /*Enter Idx into expression*/
      if ((Result = EnterExpressionOperator(ocAdd))) return(Result);      /*Enter Add operator into expression*/
      if ((Result = EnterExpression(0,True))) return(Result);             /*Enter 1 followed by expression 1 (location+1) into EEPROM*/
      if ((Result = Enter0Code(icGet))) return(Result);                   /*Enter 0 followed by 6-bit 'GET' instruction code into EEPROM*/
      /*Patch Variable expression to be Variable.HIGHBYTE or Variable(x) expression to be Variable.HIGHBYTE((x)*2)*/
      /*First, extract the variable from the end of the expression.  Note: we know it will be a 10 bit item because it is verified as a WORD variable, which is 4 header bits, 2 type bits and 4 address bits*/
      CopyExpression(2,0);                                                /*Copy variable expression back to expression 0*/
      Temp = Expression[0][(Expression[0][0]-10) / 16 + 1] & ((1 << (16-((Expression[0][0]-10) % 16)))-1);
      if (16-((Expression[0][0]-10) % 16) < 10) Temp = (Temp << (10-(16-((Expression[0][0]-10) % 16)))) + Expression[0][(Expression[0][0] / 16)+1];
      /*Remove extracted variable from expression*/
      Expression[0][(Expression[0][0]-10) / 16 + 1] = Expression[0][(Expression[0][0]-10) / 16 + 1] >> (16-((Expression[0][0]-10) % 16));
      Expression[0][0] = Expression[0][0] - 10;
      if (Expression[0][0] > 0)
        {  /*Must have been an indexed variable; patch the index to be (index)*2*/
        if ((Result = EnterExpressionBits(7,0x42))) return(Result);       /*Enter constant "2" (in it's native form) into expression*/
        if ((Result = EnterExpressionOperator(ocMul))) return(Result);    /*Enter Multiply operator into expression*/
        if ((Result = EnterExpressionBits(1,1))) return(Result);          /*Enter 1 (in anticipation of variable to follow)*/
        }
      /*Convert variable to .HIGHBYTE by changing it to byte-type and adjusting register offset to x*2+1*/
      if ((Result = EnterExpressionBits(11,(((Temp & 0x3E0) << 1) + ((Temp & 0xF)*2+1))))) return(Result); /*Enter adjusted variable*/
      if ((Result = EnterExpression(0,False))) return(Result);            /*Enter expression 0 into EEPROM.  These two lines are the remaining steps normally handled by GetWriteEnterExpression.*/
      if ((Result = EnterEEPROM(1,0))) return(Result);                    /*Enter 0 bit into EEPROM*/
      }  /*Enhanced WORD Syntax*/
    Idx++;                                                                /*Increment location offset*/
    Temp = 0;                                                             /*Reset to assume classic syntax*/
    if (Lang250) PreviewElement(&Element); else Element.ElementType = etEnd;  /*Preview next element for end or optional comma (,)*/
    if (Element.ElementType == etComma)
      {
      CopyExpression(1,0);                                                /*Copy location expression back to expression 0*/
      Element.Value = Idx;                                                /*Set .Value to Idx (for location+Idx)*/
      if ((Result = EnterExpressionConstant(Element))) return(Result);    /*Enter Idx into expression*/
      if ((Result = EnterExpressionOperator(ocAdd))) return(Result);      /*Enter Add operator into expression*/
      if ((Result = EnterExpression(0,True))) return(Result);             /*Enter 1 followed by expression 1 (location+Idx) into EEPROM*/
      if ((Result = Enter0Code(icGet))) return(Result);                   /*Enter 0 followed by 6-bit 'GET' instruction code into EEPROM*/
      if ((Result = GetComma())) return(Result);                          /*Get ','*/
      }
    }
  while (Element.ElementType == etComma);
  if (Element.ElementType != etEnd)                                       /*Not End? Error, expected ',' or end-of-line or ':'*/
    {
    GetElement(&Element);
    return(Error(ecECEOLOC));
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileGosub(void)
/*Syntax: GOSUB address*/
{
  TErrorCode  Result;
  
  if ((Result = Enter0Code(icGosub))) return(Result);               /*Enter 0 followed by 6-bit 'GOSUB' instruction code into EEPROM*/
  GosubCount++;                                                     /*Increment Gosub Count (Gosub ID) and enter 8-bit ID value into EEPROM*/
  if ((Result = EnterEEPROM(8,GosubCount))) return(Result);
  if ((Result = GetAddressEnter())) return(Result);                 /*Get address and enter into EEPROM*/
  if ((Result = PatchAddress(GosubCount*14))) return(Result);       /*Patch 'return' table slot in EEPROM with address following GOSUB*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileGoto(void)
/*Syntax: GOTO address*/
{
  TErrorCode  Result;

  if ((Result = Enter0Code(icGoto))) return(Result);                /*Enter 0 followed by 6-bit 'GOTO' instruction code into EEPROM*/
  if ((Result = GetAddressEnter())) return(Result);                 /*Get address and enter into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileHigh(void)
/*Syntax: HIGH pin*/
{
  TErrorCode    Result;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,True))) return(Result);/*Get pin value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icHigh))) return(Result);                /*Enter 0 followed by 6-bit 'HIGH' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileI2cin(void)
/*Syntax: I2CIN pin, slaveid, {address {\lowaddress} ,} [inputdata]*/
/*Modified 4/2/02 to support optional address feature in BS2p firmware v1.3 (and BS2pe firmware v1.0)*/
{
  TErrorCode    Result;
  bool          Low;
  TElementList  Preview;

  Low = False;
  StackIdx = 3;
  if ((Result = GetValue(1,True))) return(Result);                  /*Get pin value into expression 1*/
  if ((Result = GetComma())) return(Result);                        /*Get ','*/
  StackIdx = 2;
  if ((Result = GetValue(2,False))) return(Result);                 /*Get slaveid value into expression 2*/
  if ((Result = GetComma())) return(Result);                        /*Get ','*/
  PreviewElement(&Preview);                                         /*Check for optional address*/
  if (Preview.ElementType != etLeftBracket)
    { /*Not left bracket (ie: must be address*/
    StackIdx = 1;
    if ((Result = GetValue(3,False))) return(Result);               /*Get address value into expression 3*/
    if (CheckBackslash())                                           /*Check for optional '\' (lowaddress)*/
      { /*Backslash found*/
      StackIdx = 0;
      if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get lowaddress value and enter 1 followed by the value into EEPROM*/
      Low = True;                                                   /*Set low address flag*/
      } /*Backslash found*/
    if ((Result = GetComma())) return(Result);                      /*Get ','*/
    if ((Result = EnterExpression(3,True))) return(Result);         /*Enter 1 followed by expression 3 (address) into EEPROM*/
    if ((Result = EnterExpression(2,True))) return(Result);         /*Enter 1 followed by expression 2 (slaveid) into EEPROM*/
    } /*address specified*/
  else
    { /*address not specified, enter slaveid in place of address field and 0 for slaveid field*/
    if ((Result = EnterExpression(2,True))) return(Result);         /*Enter 1 followed by expression 2 (slaveid) into EEPROM*/
    if ((Result = EnterConstant(0,True))) return(Result);           /*Enter 1 followed by 0 (value indicating "no address specified") into EEPROM)*/
    } /*address not specified*/
  if ((Result = EnterExpression(1,True))) return(Result);           /*Enter 1 followed by expression 1 (pin) into EEPROM*/
  if (Low)
    {
    if ((Result = Enter0Code(icI2cin_ex))) return(Result);          /*Enter 0 followed by 6-bit 'I2CIN w/Extended Address' instruction code into EEPROM*/
    }
  else
    if ((Result = Enter0Code(icI2cin_noex))) return(Result);        /*Enter 0 followed by 6-bit 'I2CIN w/o Extended Address' instruction code into EEPROM*/
  if ((Result = GetLeftBracket())) return(Result);                  /*Get '['*/
  if ((Result = CompileInputSequence())) return(Result);
  if ((Result = GetRightBracket())) return(Result);                 /*Get ']'*/
  return(ecS); /*Return success*/
}


/*------------------------------------------------------------------------------*/

TErrorCode CompileI2cout(void)
/*Syntax: I2COUT pin, slaveid, {address {\lowaddress} ,} [outputdata]*/
/*Modified 4/2/02 to support optional address feature in BS2p firmware v1.3 (and BS2p firmware v1.0)*/
{
  TErrorCode    Result;
  bool          Low;
  TElementList  Preview;

  Low = False;
  StackIdx = 3;
  if ((Result = GetValue(1,True))) return(Result);                  /*Get pin value into expression 1*/
  if ((Result = GetComma())) return(Result);                        /*Get ','*/
  StackIdx = 2;
  if ((Result = GetValue(2,False))) return(Result);                 /*Get slaveid value into expression 2*/
  if ((Result = GetComma())) return(Result);                        /*Get ','*/
  PreviewElement(&Preview);                                         /*Check for optional address*/
  if (Preview.ElementType != etLeftBracket)
    { /*Not left bracket (ie: must be address*/
    StackIdx = 1;
    if ((Result = GetValue(3,False))) return(Result);               /*Get address value into expression 3*/
    if (CheckBackslash())                                           /*Check for optional '\' (lowaddress)*/
      { /*Backslash found*/
        StackIdx = 0;
        if ((Result = GetValueEnterExpression(True,False))) return(Result);/*Get lowaddress value and enter 1 followed by the value into EEPROM*/
        Low = True;                                                 /*Set low address flag*/
      } /*Backslash found*/
    if ((Result = GetComma())) return(Result);                      /*Get ','*/
    if ((Result = EnterExpression(3,True))) return(Result);         /*Enter 1 followed by expression 3 (address) into EEPROM*/
    if ((Result = EnterExpression(2,True))) return(Result);         /*Enter 1 followed by expression 2 (slaveid) into EEPROM*/
    } /*address specified*/
  else
    { /*address not specified, enter slaveid in place of address field and 0 for slaveid field*/
    if ((Result = EnterExpression(2,True))) return(Result);         /*Enter 1 followed by expression 2 (slaveid) into EEPROM*/
    if ((Result = EnterConstant(0,True))) return(Result);           /*Enter 1 followed by 0 (value indicating "no address specified") into EEPROM)*/
    } /*address not specified*/
  if ((Result = EnterExpression(1,True))) return(Result);           /*Enter 1 followed by expression 1 (pin) into EEPROM*/
  if (Low)
    {
    if ((Result = Enter0Code(icI2cout_ex))) return(Result);         /*Enter 0 followed by 6-bit 'I2COUT w/Extended Address' instruction code into EEPROM*/
    }
  else
    if ((Result = Enter0Code(icI2cout_noex))) return(Result);       /*Enter 0 followed by 6-bit 'I2COUT w/o Extended Address' instruction code into EEPROM*/
  if ((Result = GetLeftBracket())) return(Result);                  /*Get '['*/
  if ((Result = CompileOutputSequence())) return(Result);
  if ((Result = GetRightBracket())) return(Result);                 /*Get ']'*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileIf(bool ElseIf)
/*Syntax: IF condition(s) THEN address
   --OR-- IF condition(s) THEN statement(s) {ELSE statement(s)}
   --OR-- IF condition(s) THEN / statement(s) {/ ELSEIF / statement(s)...} {/ ELSE / statement(s)} / ENDIF
 NOTE: NestingStack is used only for Enhanced IF..THENs to keep track of current portion (Main/Else) and potential nesting.

 NOTE: The BS2 through BS2pe only have the classic syntax implemented in firmware (IF condition(s) THEN address).
       To achieve the enhanced syntax, the command is translated by CompileIF, CompileElse, CompileEndIf and the
       end of the CompileInstructions main loop into the following (The actual source isn't modified, however the result
       is effectively equal to the following translation in source code):

       EXAMPLE:                                                  TRANSLATES TO:
       IF condition(s) THEN address                              IF condition(s) THEN address    [CLASSIC, NO TRANSLATION]

       IF condition(s) THEN GOTO address                         IF condition(s) THEN address    [CONVERTED TO CLASSIC]

       IF condition(s) THEN instruction(s)                       IF condition(s) THEN MainLabel
                                                                   GOTO SkipLabel
                                                                 MainLabel:
                                                                   instruction(s)
                                                                 SkipLabel:

       IF condition(s) THEN instruction(s) ELSE instructions(s)  IF condition(s) THEN MainLabel
                                                                   GOTO SkipLabel
                                                                 MainLabel:
                                                                   instruction(s)                [MAIN PART]
                                                                   GOTO SkipLabel2
                                                                 SkipLabel:
                                                                   instructions(s)               [ELSE PART]
                                                                 SkipLabel2:

       IF condition(s) THEN instruction(s) ELSEIF condition(s) THEN instruction(s)
                                                                 IF condition(s) THEN MainLabel
                                                                   GOTO SkipLabel
                                                                 MainLabel:
                                                                   instruction(s)                [MAIN PART]
                                                                   GOTO ExitLabel
                                                                 SkipLabel:
                                                                 IF condition(s) THEN Main2Label
                                                                   GOTO SkipLabel2
                                                                 Main2Label:
                                                                   instructions(s)               [MAIN2 PART]
                                                                 SkipLabel2:
                                                                 ExitLabel:

       IF condition(s) THEN instruction(s) ELSEIF condition(s) THEN instruction(s) ELSE instruction(s)
                                                                 IF condition(s) THEN MainLabel
                                                                   GOTO SkipLabel
                                                                 MainLabel:
                                                                   instruction(s)                [MAIN PART]
                                                                   GOTO ExitLabel
                                                                 SkipLabel:
                                                                 IF condition(s) THEN Main2Label
                                                                   GOTO SkipLabel2
                                                                 Main2Label:
                                                                   instructions(s)               [MAIN2 PART]
                                                                   GOTO ExitLabel
                                                                 SkipLabel2:
                                                                   instructions(s)               [ELSE PART]
                                                                 SkipLabel3:
                                                                 ExitLabel

       IF condition(s) THEN                                      IF condition(s) THEN MainLabel
         instruction(s)                                            GOTO SkipLabel
       ENDIF                                                     MainLabel:
                                                                   instruction(s)
                                                                 SkipLabel:

       IF condition(s) THEN                                      IF condition(s) THEN MainLabel
         instruction(s)                                            GOTO SkipLabel
       ELSE                                                      MainLabel:
         instruction(s)                                            instruction(s)                [MAIN PART]
       ENDIF                                                       GOTO SkipLabel2
                                                                 SkipLabel:
                                                                   instructions(s)               [ELSE PART]
                                                                 SkipLabel2:

       IF condition(s) THEN                                      IF condition(s) THEN MainLabel
         instruction(s)                                            GOTO SkipLabel
       ELSEIF condition(s) THEN                                  MainLabel:
         instruction(s)                                            instruction(s)                [MAIN PART]
       ENDIF                                                       GOTO ExitLabel
                                                                 SkipLabel:
                                                                 IF condition(s) THEN Main2Label
                                                                   GOTO SkipLabel2
                                                                 Main2Label:
                                                                   instructions(s)               [MAIN2 PART]
                                                                 SkipLabel2:
                                                                 ExitLabel:

       IF condition(s) THEN                                      IF condition(s) THEN MainLabel
         instruction(s)                                            GOTO SkipLabel
       ELSEIF condition(s) THEN                                  MainLabel:
         instruction(s)                                            instruction(s)                [MAIN PART]
       ELSE                                                        GOTO ExitLabel
         instruction(s)                                          SkipLabel:
       ENDIF                                                     IF condition(s) THEN Main2Label
                                                                   GOTO SkipLabel2
                                                                 Main2Label:
                                                                   instructions(s)               [MAIN2 PART]
                                                                   GOTO SkipLabel3
                                                                 SkipLabel2:
                                                                   instructions(s)               [ELSE PART]
                                                                 SkipLabel3:
                                                                 ExitLabel:                                */
{
  TElementList  Element;
  TElementList  Element2;
  bool          Enhanced;
  int           TempIdx;
  int           MainPartLabel;
  TErrorCode    Result;

  Enhanced = Lang250;                                             /*Assume enhanced IF..THEN if PBASIC version 2.5*/
  if (!ElseIf)
    {  /*This is an 'IF' statement*/
    if (IfThenCount == IfThenStackSize) return(Error(ecLOSNITSE));/*Index out of range? Error, Limit of 16 Nested If-Then Statements Exceeded*/
    NestingStack[NestingStackIdx].ElementIdx = ElementListIdx-1;  /*Save element list index on stack, in case this is enhanced IF*/
    /*Determine if this is a classic IF..THEN or an enhanced IF...THEN*/
    TempIdx = ElementListIdx;              /*Save element position*/
    while (GetElement(&Element) && (Element.ElementType != etThen) && (Element.ElementType != etEnd)); /*Scan to Then or End element*/
    GetElement(&Element2);
    if ( (Element.ElementType == etThen) && ( ((Element2.ElementType == etAddress) || (Element2.ElementType == etUndef)) ||
                                              (((Element2.ElementType == etInstruction) && (Element2.Value == itGoto)) && GetElement(&Element2) && GetElement(&Element2) && (Element2.ElementType == etEnd)) ) ) Enhanced = False;   /*Classic IF..THEN or an IF..THEN GOTO (close enough)*/
    ElementListIdx = TempIdx;              /*Restore element position*/
    }
  else
    {  /*This is an 'ELSEIF' statement*/
    if (IfThenCount == 0) return(Error(ecELIMBPBI)); /*No IF's? Error, ELSEIF must be preceeded by IF*/
    TempIdx = 0;                                     /*Look for stack space in nesting structure's EXIT stack*/
    while ( (TempIdx < MaxExits) && (NestingStack[NestingStackIdx-1].Exits[TempIdx] != 0) ) TempIdx++; /*Find next available exit slot*/
    if (TempIdx == MaxExits) return(Error(ecLOSELISWISE)); /*Too many Exits? Error, Limit of 16 ELSEIF statements within IF structure exceeded*/
    if (NestingStack[NestingStackIdx-1].NestType > ntIFMultiMain) return(NestingError()); /*Not in IF..THEN nest? Display proper error*/
    if (NestingStack[NestingStackIdx-1].NestType == ntIFMultiElse) return(Error(ecELINAAE));  /*ELSEIF after ELSE? Error, ELSEIF not allowed after ELSE*/
    if ((Result = Enter0Code(icGoto))) return(Result);              /*Insert GOTO so previous "main-part" exits to ENDIF part*/
    EEPROMIdx += 14;                                                /*Reserve space in EEPROM for GOTO's ExitLabel*/
    if ((Result = PatchSkipLabels(False))) return(Result);          /*Patch IF..THEN's SkipLabel*/
    NestingStack[NestingStackIdx-1].Exits[TempIdx] = EEPROMIdx-14;  /*Store GOTO's ExitLabel on stack and set Mode*/
    NestingStackIdx--;                                              /*Decrement NestingStackIdx so rest of routine will preserve current stack information*/
    IfThenCount--;                                                  /*Decrement IfThenCount so rest of routine will preserve current stack information*/
    }
  /*Parse rest of IF..THEN*/
  StackIdx = 0;
  if ((Result = GetValueConditional(True,False,0))) return(Result); /*Get conditional expression*/
  if ((Result = EnterExpression(0,True))) return(Result);           /*Enter 1 followed by expression 0 (the condition) into EEPROM*/
  if ((Result = Enter0Code(icIf))) return(Result);                  /*Enter 0 followed by 6-bit 'IF' instruction code into EEPROM*/
  GetElement(&Element);                                             /*Get next element, should be 'THEN'*/
  if (Element.ElementType != etThen) return(Error(ecET));           /*Not 'THEN'? Error, Expected THEN*/
  if (!Enhanced)
    {  /*Classic (or near classic) IF..THEN, get destination address and enter into EEPROM*/
    if (Lang250)
      {  /*If PBASIC version 2.5 then check for THEN GOTO...*/
      PreviewElement(&Element);  /*Check for THEN GOTO...*/
      if ( (Element.ElementType == etInstruction) && (Element.Value == itGoto) ) ElementListIdx++;  /*Skip GOTO, if necessary*/
      }
    if ((Result = GetAddressEnter())) return(Result);               /*Get address and enter into EEPROM*/
    }
  else
    {  /*Enhanced IF..THEN*/
    if (!ElseIf)
      {  /*This is an 'IF' statement*/
      PreviewElement(&Element);
      /*Push If..Then mode (MultiMain or SingleMain-No-End) on stack*/
      if (Element.ElementType == etEnd) NestingStack[NestingStackIdx].NestType = ntIFMultiMain; else NestingStack[NestingStackIdx].NestType = ntIFSingleMainNE;
      }
    else    /*This is an 'ELSEIF' statement, maintain single-line status if necessary*/
      if (NestingStack[NestingStackIdx].NestType == ntIFSingleMain) NestingStack[NestingStackIdx].NestType = ntIFSingleMainNE;
    /*Insert MainLabel and Goto SkipLabel*/
    MainPartLabel = EEPROMIdx;                                      /*Remember MainLabel for patching in a moment*/
    EEPROMIdx += 14;                                                /*Reserve space in EEPROM for MainLabel*/
    if ((Result = Enter0Code(icGoto))) return(Result);              /*Insert GOTO to ELSE part*/
    NestingStack[NestingStackIdx].SkipLabel = EEPROMIdx;            /*Store GOTO's SkipLabel on stack*/
    EEPROMIdx += 14;                                                /*Reserve space in EEPROM for GOTO's SkipLabel*/
    if ((Result = PatchAddress(MainPartLabel))) return(Result);     /*Patch MainPartLabel*/
    if (!ElseIf)
      for (TempIdx = 0; TempIdx < MaxExits; TempIdx++) NestingStack[NestingStackIdx].Exits[TempIdx] = 0; /*If this is an IF statement, clear ELSEIF's Exit stack*/
    /*Finish "push"*/
    NestingStackIdx++;
    IfThenCount++;
    }  /*End of Enhanced IF..THEN*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileInput(void)
/*Syntax: INPUT pin*/
{
  TErrorCode    Result;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,True))) return(Result);  /*Get pin value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icInput))) return(Result);                 /*Enter 0 followed by 6-bit 'INPUT' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileIoterm(void)
/*Syntax: IOTERM bank*/
{
  TErrorCode    Result;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get bank value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icIoterm))) return(Result);                /*Enter 0 followed by 6-bit 'IOTERM' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileLcdcmd(void)
/*Syntax: LCDCMD pin,command*/
{
  TErrorCode    Result;

  StackIdx = 1;
  if ((Result = GetValue(1,True))) return(Result);                    /*Get pin value into expression 1*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get command value and enter 1 followed by the value into EEPROM*/
  if ((Result = EnterExpression(1,True))) return(Result);             /*Enter 1 followed by expression 1 (pin) into EEPROM*/
  if ((Result = Enter0Code(icLcdcmd))) return(Result);                /*Enter 0 followed by 6-bit 'LCDCMD' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileLcdin(void)
/*Syntax: LCDIN pin,command,[inputdata]*/
{
  TErrorCode    Result;

  StackIdx = 1;
  if ((Result = GetValue(1,True))) return(Result);                    /*Get pin value into expression 1*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get command value and enter 1 followed by the value into EEPROM*/
  if ((Result = EnterExpression(1,True))) return(Result);             /*Enter 1 followed by expression 1 (pin) into EEPROM*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  if ((Result = Enter0Code(icLcdin))) return(Result);                 /*Enter 0 followed by 6-bit 'LCDIN' instruction code into EEPROM*/
  if ((Result = GetLeftBracket())) return(Result);                    /*Get '['*/
  if ((Result = CompileInputSequence())) return(Result);
  if ((Result = GetRightBracket())) return(Result);                   /*Get ']'*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileLcdout(void)
/*Syntax: LCDOUT pin,command,[outputdata]*/
{
  TErrorCode    Result;

  StackIdx = 1;
  if ((Result = GetValue(1,True))) return(Result);                    /*Get pin value into expression 1*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get command value and enter 1 followed by the value into EEPROM*/
  if ((Result = EnterExpression(1,True))) return(Result);             /*Enter 1 followed by expression 1 (pin) into EEPROM*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  if ((Result = Enter0Code(icLcdout))) return(Result);                /*Enter 0 followed by 6-bit 'LCDOUT' instruction code into EEPROM*/
  if ((Result = GetLeftBracket())) return(Result);                    /*Get '['*/
  if ((Result = CompileOutputSequence())) return(Result);
  if ((Result = GetRightBracket())) return(Result);                   /*Get ']'*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileLet(void)
/*Syntax: variable = expression*/
{
  TErrorCode  Result;

  StackIdx = 1;
  if ((Result = GetWrite(1))) return(Result);                         /*Get Variable Write expression into Expression 1*/
  if ((Result = GetEqual())) return(Result);                          /*Get '='*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get value and enter 1 followed by the value into EEPROM*/
  if ((Result = EnterExpression(1,True))) return(Result);             /*Enter the Variable Write expression into EEPROM*/
  if ((Result = Enter0Code(icDone))) return(Result);                  /*Enter 0 followed by 6-bit 'Done' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileLookdown(void)
/*Syntax: LOOKDOWN target, {??} [value0, value1,...valueN], variable*/
{
  TErrorCode    Result;
  TElementList  Element;
  bool          FoundBracket;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get target value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icLookdown))) return(Result);              /*Enter 0 followed by 6-bit 'LOOKDOWN' instruction code into EEPROM*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  GetElement(&Element);                                               /*Get next element*/
  if (Element.ElementType != etCond1Op)
    { /*not cond1 operator*/
    if (Element.ElementType != etLeftBracket) return(Error(ecEACOOLB)); /*Not left bracket? Error: Expected a comparison operator or ''[''*/
    ElementListIdx--;
    Element.Value = ocE;                                              /*If left bracket, we'll defaut to '=' operator*/
    }
  if ((Result = EnterEEPROM(3,Element.Value))) return(Result);
  if ((Result = GetLeftBracket())) return(Result);                    /*Get '['*/
  do
    {
    StackIdx = 3;
    if ((Result = GetValueEnterExpression(False,False))) return(Result); /*Get next value and enter into EEPROM*/
    if ((Result = EnterEEPROM(1,0))) return(Result);                  /*Enter 0 into EEPROM*/
    if ((Result = GetCommaOrBracket(&FoundBracket))) return(Result);
    }
  while (!FoundBracket);                                              /*Repeat until bracket or error found*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  StackIdx = 1;
  if ((Result = GetWriteEnterExpression())) return(Result);           /*Get variable 'write' and enter into EEPROM followed by a 0*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileLookup(void)
/*Syntax: LOOKUP index, [value0, value1,...valueN], variable*/
{
  TErrorCode    Result;
  bool          FoundBracket;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get index value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icLookup))) return(Result);                /*Enter 0 followed by 6-bit 'LOOKUP' instruction code into EEPROM*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  if ((Result = GetLeftBracket())) return(Result);                    /*Get '['*/
  do
    {
    StackIdx = 2;
    if ((Result = GetValueEnterExpression(False,False))) return(Result); /*Get next value and enter into EEPROM*/
    if ((Result = EnterEEPROM(1,0))) return(Result);                  /*Enter 0 into EEPROM*/
    if ((Result = GetCommaOrBracket(&FoundBracket))) return(Result);
    }
  while (!FoundBracket);                                              /*Repeat until bracket or error found*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  StackIdx = 1;
  if ((Result = GetWriteEnterExpression())) return(Result);           /*Get variable 'write' and enter into EEPROM followed by a 0*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileLoop(void)
/*Syntax: DO {{WHILE | UNTIL} condition} /../ LOOP {{WHILE | UNTIL} condition}
  NOTE: a DO..LOOP may contain no conditions, making it an endless loop
  NOTE: See CompileDo for implementation examples.*/
{
  TElementList  Element;
  word          SkipLabel;
  TErrorCode    Result;

  if (DoLoopCount == 0) return(Error(ecLMBPBD));                               /*No DO..LOOP? Error, LOOP must be preceeded by DO*/
  if (NestingStack[NestingStackIdx-1].NestType != ntDO) return(NestingError());/*Not in DO..LOOP nest? Display proper error*/
  PreviewElement(&Element);                                                    /*Preview next element, may be End, WHILE or UNTIL*/
  if (Element.ElementType == etEnd)
    {  /*End found, insert GOTO JumpLabel and possibly patch the SkipLabel*/
    if ((Result = Enter0Code(icGoto))) return(Result);                         /*Insert GOTO to jump back to DO*/
    if ((Result = EnterAddress(NestingStack[NestingStackIdx-1].JumpLabel))) return(Result); /*Insert JumpLabel's address*/
    /*Patch SkipLabel if necessary*/
    if (NestingStack[NestingStackIdx-1].SkipLabel != 0) if ((Result = PatchAddress(NestingStack[NestingStackIdx-1].SkipLabel))) return(Result);
    }
  else
    {  /*Not End, must be WHILE or UNTIL*/
    GetElement(&Element);                                                      /*Get WHILE or UNTIL*/
    if (!((Element.ElementType == etWhile) || (Element.ElementType == etUntil)) ) return(Error(ecEWUEOLOC)); /*Not WHILE or UNTIL? Error, Expected 'WHILE', 'UNTIL', end-of-line, or ':'*/
    /*WHILE or UNTIL condition found*/
    if (NestingStack[NestingStackIdx-1].SkipLabel != 0) return(Error(ecWOUCCAABDAL)); /*SkipLabel defined? Error, WHILE or UNTIL conditions cannot appear after both DO and LOOP*/
    StackIdx = 0;
    if ((Result = GetValueConditional(True,False,0))) return(Result);          /*Get conditional expression*/
    if ((Result = EnterExpression(0,True))) return(Result);                    /*Enter 1 followed by expression 0 (the condition) into EEPROM*/
    if ((Result = Enter0Code(icIf))) return(Result);                           /*Enter 0 followed by 6-bit 'IF' instruction code into EEPROM*/
    if (Element.ElementType == etWhile)                                        /*If WHILE condition...*/
      {
      if ((Result = EnterAddress(NestingStack[NestingStackIdx-1].JumpLabel))) return(Result);/*Insert JumpLabel's address*/
      }
    else
      {                                                                        /*If UNTIL condition...*/
      SkipLabel = EEPROMIdx;                                                   /*Remember SkipLabel for patching in a moment*/
      EEPROMIdx += 14;                                                         /*Reserve space in EEPROM for SkipLabel*/
      if ((Result = Enter0Code(icGoto))) return(Result);                       /*Insert GOTO to JumpLabel part*/
      if ((Result = EnterAddress(NestingStack[NestingStackIdx-1].JumpLabel))) return(Result); /*Insert JumpLabel's address*/
      if ((Result = PatchAddress(SkipLabel))) return(Result);                  /*Patch SkipLabel*/
      }
    }
  if ((Result = PatchSkipLabels(True))) return(Result);                        /*Patch any EXIT SkipLabels*/
  NestingStackIdx--;                                                           /*Pop the stack*/
  DoLoopCount--;
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileLow(void)
/*Syntax: LOW pin*/
{
  TErrorCode    Result;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,True))) return(Result);     /*Get pin value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icLow))) return(Result);                      /*Enter 0 followed by 6-bit 'LOW' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileMainio(void)
/*Syntax: MAINIO*/
{
  TErrorCode    Result;

  if ((Result = Enter0Code(icMainio))) return(Result);                   /*Enter 0 followed by 6-bit 'MAINIO' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileNap(void)
/*{Syntax: Nap period*/
{
  TErrorCode    Result;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);    /*Get period value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icNap))) return(Result);                      /*Enter 0 followed by 6-bit 'NAP' instruction code into EEPROM*/
  if ((Result = EnterAddress(EEPROMIdx+14))) return(Result);             /*Enter next address into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileNext(void)
/*Syntax: NEXT*/
{
  TErrorCode    Result;
  TElementList  Element;
  int           OldElementListIdx1;
  int           OldElementListIdx2;

  if (ForNextCount == 0) return(Error(ecNMBPBF)); /*Too many nexts? Error: 'NEXT' must be preceeded by 'FOR'*/
  if (NestingStack[NestingStackIdx-1].NestType != ntFOR) return(NestingError()); /*Not in FOR..NEXT nest? Display proper error*/
  OldElementListIdx1 = ElementListIdx;               /*Save Element List Idx*/
  ElementListIdx = NestingStack[NestingStackIdx-1].ElementIdx+1;
  OldElementListIdx2 = ElementListIdx;               /*Save Element List Idx*/
  StackIdx = 2;
  if ((Result = GetRead(1))) return(Result);         /*Get variable 'read' into expression 1*/
  ElementListIdx = OldElementListIdx2;               /*Restore previous Element List Idx*/
  StackIdx = 3;
  if ((Result = GetWrite(2))) return(Result);        /*Get variable 'write' into expression 2*/
  ElementListIdx++;                                  /*Skip '='*/
  StackIdx = 1;
  if ((Result = GetValue(3,False))) return(Result);  /*Get start value into expression 3*/
  ElementListIdx++;                                  /*Skip 'TO'*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get end value and enter 1 followed by the value into EEPROM*/
  if ((Result = EnterExpression(3,True))) return(Result);       /*Enter 1 followed by expression 3 (start value) into EEPROM*/
  if ((Result = Enter0Code(icNext))) return(Result);            /*Enter 0 followed by 6-bit 'NEXT' instruction code into EEPROM*/
  if ((Result = EnterExpression(1,False))) return(Result);      /*Enter 0 followed by expression 1 (variable 'read' value) into EEPROM*/
  GetElement(&Element);
  if (Element.ElementType != etEnd)
    { /*Not end, must be STEP*/
    StackIdx = 3;
    if ((Result = GetValueEnterExpression(True,False))) return(Result);/*Get step value and enter 1 followed by the value into EEPROM*/
    } /*Not end, must be STEP*/
  else /*Found end*/
    if ((Result = EnterConstant(1,True))) return(Result);       /*End found, enter 1 followed by default step of 1*/
  if ((Result = EnterEEPROM(1,0))) return(Result);              /*Enter 0 into EEPROM*/
  if ((Result = EnterExpression(2,False))) return(Result);      /*Enter 0 followed by expression 2 (variable 'write' value) into EEPROM*/
  if ((Result = EnterEEPROM(1,0))) return(Result);              /*Enter 0 into EEPROM*/
  if ((Result = EnterAddress(NestingStack[NestingStackIdx-1].JumpLabel))) return(Result);/*Enter destination address (start of loop) into EEPROM*/
  if ((Result = PatchSkipLabels(True))) return(Result);         /*Patch any EXIT SkipLabels*/
  NestingStackIdx--;                                            /*Pop the stack*/
  ForNextCount--;
  ElementListIdx = OldElementListIdx1;                          /*Restore previous element list idx*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileOn(void)
/*Syntax: ON index (GOTO|GOSUB) label {, label...}
  NOTE: The BS2 through BS2pe do not have ON..GOTO or ON..GOSUB implemented in firmware.
        To achieve an ON..GOTO or ON..GOSUB, the command is translated into the following (The actual source isn't
        modified, however the result is effectively equal to the following translation in source code):

        EXAMPLE:                                                  TRANSLATES TO:
        ON expression GOTO label1, label2, label3                 BRANCH expression[label1, label2, label3]
 
        ON expression GOSUB label1, label2, label3                GOSUB JumpLabel  {See "return address" below}
                                                                  JumpLabel:
                                                                  BRANCH expression[label1, label2, label3]
                                                                  RETURN
                                                                  "return address" of GOSUB is manually set here      */
{
  TElementList  Element;
  bool          OnGosub;                                        /*True if ON..GOSUB, false if ON..GOTO*/
  TErrorCode    Result;
  bool          EndFound;

  StackIdx = 0;
  OnGosub = False;
  if ((Result = GetValueConditional(False, False, 0))) return(Result); /*Get index value into expression 0*/
  GetElement(&Element);                                       /*Verify 'GOTO' or 'GOSUB'*/
  if ( !( (Element.ElementType == etInstruction) && ((Element.Value == itGoto) || (Element.Value == itGosub)) ) ) return(Error(ecEGOG)); /*Not 'GOTO' or 'GOSUB'?  Error, expected 'GOTO' or 'GOSUB'*/
  if (Element.Value == itGosub)
    {  /*ON idx GOSUB...*/
    OnGosub = True;                                             /*Set ON..GOSUB flag*/
    if ((Result = Enter0Code(icGosub))) return(Result);         /*Enter 0 followed by 6-bit 'GOSUB' instruction code into EEPROM*/
    GosubCount++;                                               /*Increment Gosub Count (Gosub ID) and enter 8-bit ID value into EEPROM*/
    if ((Result = EnterEEPROM(8,GosubCount))) return(Result);
    if ((Result = EnterAddress(EEPROMIdx+14))) return(Result);  /*Enter next address (BRANCH command) as address to GOSUB to*/
    }
  if ((Result = EnterExpression(0,True))) return(Result);       /*Enter 1 followed by expression 0 (index value) into EEPROM*/
  if ((Result = Enter0Code(icBranch))) return(Result);          /*Enter 0 followed by 6-bit 'BRANCH' instruction code into EEPROM*/
  do
    {
    if ((Result = GetAddressEnter())) return(Result);           /*Get destination address(es) and enter into EEPROM*/
    if ((Result = GetCommaOrEnd(&EndFound))) return(Result); 
    }
  while (!EndFound);                                            /*Repeat until End or error found*/
  ElementListIdx--;
  if (OnGosub)
    {  /*Finish ON idx GOSUB*/
    if ((Result = Enter0Code(icReturn))) return(Result);        /*Enter 0 followed by 6-bit 'RETURN' instruction code into EEPROM*/
    if ((Result = PatchAddress(GosubCount*14))) return(Result); /*Patch return table slot in EEPROM with address following RETURN command*/
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileOutput(void)
/*Syntax: OUTPUT pin*/
{
  TErrorCode    Result;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,True))) return(Result); /*Get pin value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icOutput))) return(Result);               /*Enter 0 followed by 6-bit 'OUTPUT' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileOwin(void)
/*Syntax: OWIN pin, mode, [inputdata]*/
{
  TErrorCode    Result;

  StackIdx = 1;
  if ((Result = GetValue(1,True))) return(Result);                   /*Get pin value into expression 1*/
  if ((Result = GetComma())) return(Result);                         /*Get ','*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);/*Get mode value and enter 1 followed by the value into EEPROM*/
  if ((Result = EnterExpression(1,True))) return(Result);            /*Enter 1 followed by expression 1 (pin) into EEPROM*/
  if ((Result = GetComma())) return(Result);                         /*Get ','*/
  if ((Result = Enter0Code(icOwin))) return(Result);                 /*Enter 0 followed by 6-bit 'OWIN' instruction code into EEPROM*/
  if ((Result = GetLeftBracket())) return(Result);                   /*Get '['*/
  if ((Result = CompileInputSequence())) return(Result);
  if ((Result = GetRightBracket())) return(Result);                  /*Get ']'*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileOwout(void)
/*Syntax: OWOUT pin, mode, [outputdata]*/
{
  TErrorCode    Result;

  StackIdx = 1;
  if ((Result = GetValue(1,True))) return(Result);                   /*Get pin value into expression 1*/
  if ((Result = GetComma())) return(Result);                         /*Get ','*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);/*Get mode value and enter 1 followed by the value into EEPROM*/
  if ((Result = EnterExpression(1,True))) return(Result);            /*Enter 1 followed by expression 1 (pin) into EEPROM*/
  if ((Result = GetComma())) return(Result);                         /*Get ','*/
  if ((Result = Enter0Code(icOwout))) return(Result);                /*Enter 0 followed by 6-bit 'OWOUT' instruction code into EEPROM*/
  if ((Result = GetLeftBracket())) return(Result);                   /*Get '['*/
  if ((Result = CompileOutputSequence())) return(Result);
  if ((Result = GetRightBracket())) return(Result);                  /*Get ']'*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompilePause(void)
/*Syntax: PAUSE milliseconds*/
{
  TErrorCode    Result;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);/*Get pin value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icPause))) return(Result);                /*Enter 0 followed by 6-bit 'PAUSE' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompilePollin(void)
/*Syntax: POLLIN pin, state*/
{
  TErrorCode    Result;

  StackIdx = 1;
  if ((Result = GetValue(1,True))) return(Result);                   /*Get pin value into expression 1*/
  if ((Result = GetComma())) return(Result);                         /*Get ','*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);/*Get state value and enter 1 followed by the value into EEPROM*/
  if ((Result = EnterExpression(1,True))) return(Result);            /*Enter 1 followed by expression 1 (pin value) into EEPROM*/
  if ((Result = Enter0Code(icPollin))) return(Result);               /*Enter 0 followed by 6-bit 'POLLIN' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompilePollmode(void)
/*Syntax: POLLMODE mode*/
{
  TErrorCode    Result;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);/*Get state value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icPollmode))) return(Result);             /*Enter 0 followed by 6-bit 'POLLMODE' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompilePollout(void)
/*Syntax: POLLOUT pin, state*/
{
  TErrorCode    Result;

  StackIdx = 1;
  if ((Result = GetValue(1,True))) return(Result);                   /*Get pin value into expression 1*/
  if ((Result = GetComma())) return(Result);                         /*Get ','*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);/*Get state value and enter 1 followed by the value into EEPROM*/
  if ((Result = EnterExpression(1,True))) return(Result);            /*Enter 1 followed by expression 1 (pin value) into EEPROM*/
  if ((Result = Enter0Code(icPollout))) return(Result);              /*Enter 0 followed by 6-bit 'POLLOUT' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompilePollrun(void)
/*Syntax: POLLRUN SlotNumber*/
{
  TErrorCode    Result;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);/*Get slot number value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icPollrun))) return(Result);              /*Enter 0 followed by 6-bit 'POLLRUN' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompilePollwait(void)
/*Syntax: POLLWAIT period*/
{
  TErrorCode    Result;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);/*Get period value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icPollwait))) return(Result);             /*Enter 0 followed by 6-bit 'POLLWAIT' instruction code into EEPROM*/
  if ((Result = EnterAddress(EEPROMIdx+14))) return(Result);         /*Enter next address into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompilePulsin(void)
/*Syntax: PULSIN pin, state, variable*/
{
  TErrorCode    Result;

  StackIdx = 1;
  if ((Result = GetValue(1,True))) return(Result);                   /*Get pin value into expression 1*/
  if ((Result = GetComma())) return(Result);                         /*Get ','*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);/*Get state value and enter 1 followed by the value into EEPROM*/
  if ((Result = EnterExpression(1,True))) return(Result);            /*Enter 1 followed by expression 1 (pin value) into EEPROM*/
  if ((Result = GetComma())) return(Result);                         /*Get ','*/
  if ((Result = Enter0Code(icPulsin))) return(Result);               /*Enter 0 followed by 6-bit 'PULSIN' instruction code into EEPROM*/
  if ((Result = GetWriteEnterExpression())) return(Result);          /*Get variable 'write' and enter into EEPROM followed by a 0*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompilePulsout(void)
/*Syntax: PULSOUT pin, milliseconds*/
{
  TErrorCode    Result;

  StackIdx = 1;
  if ((Result = GetValue(1,True))) return(Result);                   /*Get pin value into expression 1*/
  if ((Result = GetComma())) return(Result);                         /*Get ','*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);/*Get milliseconds value and enter 1 followed by the value into EEPROM*/
  if ((Result = EnterExpression(1,True))) return(Result);            /*Enter 1 followed by expression 1 (pin value) into EEPROM*/
  if ((Result = Enter0Code(icPulsout))) return(Result);              /*Enter 0 followed by 6-bit 'PULSOUT' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompilePut(void)
/*Syntax: PUT location, {WORD} value {,{WORD} value...}*/
{
  TElementList  Element;
  int           ValueStart;           /*Element where value starts*/
  int           Idx;                  /*Location offset*/
  TErrorCode    Result;

  ValueStart = 0;                                                      /*Assume classic syntax*/
  Idx = 0;
  StackIdx = 0;
  if ((Result = GetValue(1,False))) return(Result);                    /*Get location value into expression 1*/
  do
    {
    if ((Result = GetComma())) return(Result);                         /*Get ','*/
    if ( (Lang250) && (PreviewElement(&Element)) && (Element.ElementType == etVariableAuto) )
      {  /*if PBASIC version 2.5, could be optional WORD switch*/
      GetElement(&Element);                                            /*Get the optional switch element*/
      if (Element.Value != 0x0003) return(Error(ecEACVOW));            /*Not WORD? Error, Expected a constant, variable or 'WORD'*/
      /*Enhanced syntax*/
      ValueStart = ElementListIdx;                                     /*Remember start of value and that we're using enhanced syntax*/
      }
    /*Patch location to be location+Idx, if Idx > 0*/
    CopyExpression(1,0);                                               /*Copy location expression to expression 0*/
    if (Idx > 0)
      {
      Element.Value = Idx;                                             /*Set .Value to Idx (for location+Idx)*/
      if ((Result = EnterExpressionConstant(Element))) return(Result); /*Enter Idx into expression*/
      if ((Result = EnterExpressionOperator(ocAdd))) return(Result);   /*Enter Add operator into expression*/
      }
    if ((Result = EnterExpression(0,True))) return(Result);            /*Enter 1 followed by expression 0 (location value) into EEPROM*/
    /*Finish PUT tokens*/
    StackIdx = 1;
    if ((Result = GetValueEnterExpression(True,False))) return(Result);/*Get value and enter 1 followed by the value into EEPROM*/
    CopyExpression(0,2);                                               /*Save value expression in expression 2, for potential re-use later*/
    if ((Result = Enter0Code(icPut))) return(Result);                  /*Enter 0 followed by 6-bit 'PUT' instruction code into EEPROM*/
    if (ValueStart > 0)
      {  /*Enhanced Syntax, enter a second PUT command of the form: PUT location+1, value >> 8*/
      /*Patch location to be: location+Idx*/  
      CopyExpression(1,0);                                             /*Copy location expression to expression 0*/
      Idx++;                                                           /*Increment location offset*/
      Element.Value = Idx;                                             /*Set .Value to Idx (for location+Idx)*/
      if ((Result = EnterExpressionConstant(Element))) return(Result); /*Enter Idx into expression*/
      if ((Result = EnterExpressionOperator(ocAdd))) return(Result);   /*Enter Add operator into expression*/
      if ((Result = EnterExpression(0,True))) return(Result);          /*Enter 1 followed by expression 0 (location value) into EEPROM*/
      /*Patch value to be: value >> 8*/
      CopyExpression(2,0);                                             /*Copy value expression to expression 0*/
      Element.Value = 8;                                               /*Set .Value to 8 (for value >> 8)*/
      if ((Result = EnterExpressionConstant(Element))) return(Result); /*Enter 8 into expression*/
      if ((Result = EnterExpressionOperator(ocShr))) return(Result);   /*Enter Shr operator into expression*/
      if ((Result = EnterExpression(0,True))) return(Result);          /*Enter 1 followed by expression 0 (value >> 8) into EEPROM*/
      if ((Result = Enter0Code(icPut))) return(Result);                /*Enter 0 followed by 6-bit 'PUT' instruction code into EEPROM*/
      }
    Idx++;                                                             /*Increment location offset*/
    ValueStart = 0;                                                    /*Reset to assume classic syntax*/
    if (Lang250) PreviewElement(&Element); else Element.ElementType = etEnd; /*Preview next element for optional comma (,)*/
    }
  while (Element.ElementType == etComma);
  if (Element.ElementType != etEnd)                                    /*Not End? Error, expected ',' or end-of-line or ':'*/
    {
    GetElement(&Element);
    return(Error(ecECEOLOC));
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompilePwm(void)
/*Syntax: PWM pin, duty, cycles*/
{
  TErrorCode    Result;

  StackIdx = 2;
  if ((Result = GetValue(1,True))) return(Result);                     /*Get pin value into expression 1*/
  if ((Result = GetComma())) return(Result);                           /*Get ','*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);  /*Get duty value and enter 1 followed by the value into EEPROM*/
  if ((Result = GetComma())) return(Result);                           /*Get ','*/
  StackIdx = 1;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);  /*Get cycles value and enter 1 followed by the value into EEPROM*/
  if ((Result = EnterExpression(1,True))) return(Result);              /*Enter 1 followed by expression 1 (pin value) into EEPROM*/
  if ((Result = Enter0Code(icPwm))) return(Result);                    /*Enter 0 followed by 6-bit 'PWM' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileRandom(void)
/*Syntax: RANDOM variable*/
{
  TErrorCode    Result;
  word          OldElementListIdx;

  OldElementListIdx = ElementListIdx;
  StackIdx = 0;
  if ((Result = GetReadWrite(False))) return(Result);
  if ((Result = EnterExpression(0,True))) return(Result);              /*Enter 1 followed by expression 0 (variable 'read') into EEPROM*/
  if ((Result = Enter0Code(icRandom))) return(Result);                 /*Enter 0 followed by 6-bit 'RANDOM' instruction code into EEPROM*/
  ElementListIdx = OldElementListIdx;
  StackIdx = 1;
  if ((Result = GetWriteEnterExpression())) return(Result);            /*Get variable 'write' and enter into EEPROM followed by a 0*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileRctime(void)
/*Syntax: RCTIME pin, state, variable*/
{
  TErrorCode    Result;

  StackIdx = 1;
  if ((Result = GetValue(1,True))) return(Result);                     /*Get pin value into expression 1*/
  if ((Result = GetComma())) return(Result);                           /*Get ','*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);  /*Get state value and enter 1 followed by the value into EEPROM*/
  if ((Result = EnterExpression(1,True))) return(Result);              /*Enter 1 followed by expression 1 (pin value) into EEPROM*/
  if ((Result = GetComma())) return(Result);                           /*Get ','*/
  if ((Result = Enter0Code(icRctime))) return(Result);                 /*Enter 0 followed by 6-bit 'RCTIME' instruction code into EEPROM*/
  if ((Result = GetWriteEnterExpression())) return(Result);            /*Get variable 'write' and enter into EEPROM followed by a 0*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileRead(void)
/*Syntax: READ location, {WORD} variable {,{WORD} variable...*/
{
  TElementList  Element;
  int           Temp;                     /*Element where value starts*/
  int           PrevElement;              /*Temporary elementlistidx holder*/
  int           Idx;                      /*Location offset*/
  TErrorCode    Result;

  Temp = 0;                                                            /*Assume classic syntax*/
  Idx = 0;
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result);  /*Get location value and enter 1 followed by the value into EEPROM*/
  CopyExpression(0,1);                                                 /*Save location expression for later use*/
  if ((Result = Enter0Code(icRead))) return(Result);                   /*Enter 0 followed by 6-bit 'READ' instruction code into EEPROM*/
  if ((Result = GetComma())) return(Result);                           /*Get ','*/
  do
    {
    if ((Result = EnterAddress(EEPROMIdx+14))) return(Result);         /*Enter next address into EEPROM*/
    if ( (Lang250) && (PreviewElement(&Element)) && (Element.ElementType == etVariableAuto) )
      {  /*if PBASIC version 2.5, could be optional WORD switch*/
      GetElement(&Element);                                            /*Get the optional switch element*/
      if (Element.Value != 0x0003) return(Error(ecEVOW));              /*Not WORD? Error, Expected variable or 'WORD'*/
      Temp = ElementListIdx;                                           /*WORD switch, save start of variable*/
      }
    /*Finish classic syntax*/
    StackIdx = 1;
    if ((Result = GetWriteEnterExpression())) return(Result);          /*Get variable 'write' and enter into EEPROM followed by a 0*/
    if (Temp > 0)
      {  /*Enhanced WORD Syntax*/
      /*Verify word-sized variable. (Already verified it is proper variable reference from GetWriteEnterExpression)*/
      PrevElement = ElementListIdx;                                    /*Save current ElementListIdx*/
      ElementListIdx = Temp;                                           /*Reset to start of variable*/
      if ( GetElement(&Element) && ((Element.Value & 0x0F00) != 0x0300) ) return(Error(ecEAWV)); /*Not word-variable? Error, expected a word variable*/
      Temp = Element.Start;                                            /*Save start of variable in source*/
      if ( GetElement(&Element) && (Element.ElementType == etPeriod) )
        {  /*If modifier follows, select entire variable.modifier and Error, expected a word variable*/
        GetElement(&Element);
        tzModuleRec->ErrorStart = Temp;
        tzModuleRec->ErrorLength = Element.Start-Temp+Element.Length;
        return(Error(ecEAWV));
        }
      ElementListIdx = PrevElement;                                    /*Reset to end of command*/
      /*All okay, enter a second READ command of the form: READ location+1, variable.highbyte*/
      CopyExpression(0,2);                                             /*Save variable expression for later use*/
      CopyExpression(1,0);                                             /*Copy location expression back to expression 0*/
      Idx++;                                                           /*Increment location offset*/
      Element.Value = Idx;                                             /*Set .Value to Idx (for location+Idx)*/
      if ((Result = EnterExpressionConstant(Element))) return(Result); /*Enter Idx into expression*/
      if ((Result = EnterExpressionOperator(ocAdd))) return(Result);   /*Enter Add operator into expression*/
      if ((Result = EnterExpression(0,True))) return(Result);          /*Enter 1 followed by expression 1 (location+1) into EEPROM*/
      if ((Result = Enter0Code(icRead))) return(Result);               /*Enter 0 followed by 6-bit 'READ' instruction code into EEPROM*/
      if ((Result = EnterAddress(EEPROMIdx+14))) return(Result);       /*Enter next address into EEPROM*/

      /*Patch Variable expression to be Variable.HIGHBYTE or Variable(x) expression to be Variable.HIGHBYTE((x)*2)*/
      /*First, extract the variable from the end of the expression.  Note: we know it will be a 10 bit item because it is verified as a WORD variable, which is 4 header bits, 2 type bits and 4 address bits*/
      CopyExpression(2,0);                                             /*Copy variable expression back to expression 0*/
      Temp = Expression[0][(Expression[0][0]-10) / 16 + 1] & ((1 << (16-((Expression[0][0]-10) % 16)))-1);
      if (16-((Expression[0][0]-10) % 16) < 10) Temp = (Temp << (10-(16-((Expression[0][0]-10) % 16)))) + Expression[0][(Expression[0][0] / 16)+1];
      /*Remove extracted variable from expression*/
      Expression[0][(Expression[0][0]-10) / 16 + 1] = Expression[0][(Expression[0][0]-10) / 16 + 1] >> (16-((Expression[0][0]-10) % 16));
      Expression[0][0] = Expression[0][0] - 10;
      if (Expression[0][0] > 0)
        {  /*Must have been an indexed variable; patch the index to be (index)*2*/
        if ((Result = EnterExpressionBits(7,0x42))) return(Result);    /*Enter constant "2" (in it's native form) into expression*/
        if ((Result = EnterExpressionOperator(ocMul))) return(Result); /*Enter Multiply operator into expression*/
        if ((Result = EnterExpressionBits(1,1))) return(Result);       /*Enter 1 (in anticipation of variable to follow)*/
        }
      /*Convert variable to .HIGHBYTE by changing it to byte-type and adjusting register offset to x*2+1*/
      if ((Result = EnterExpressionBits(11,(((Temp & 0x3E0) << 1) + ((Temp & 0xF)*2+1))))) return(Result); /*Enter adjusted variable*/
      if ((Result = EnterExpression(0,False))) return(Result);         /*Enter expression 0 into EEPROM.  These two lines are the remaining steps normally handled by GetWriteEnterExpression.*/
      if ((Result = EnterEEPROM(1,0))) return(Result);                 /*Enter 0 bit into EEPROM*/
      }  /*Enhanced WORD Syntax*/
    Idx++;                                                             /*Increment location offset*/
    Temp = 0;                                                          /*Reset to assume classic syntax*/
    if (Lang250) PreviewElement(&Element); else Element.ElementType = etEnd;  /*Preview next element for end or optional comma (,)*/
    if (Element.ElementType == etComma)
      {
      CopyExpression(1,0);                                             /*Copy location expression back to expression 0*/
      Element.Value = Idx;                                             /*Set .Value to Idx (for location+Idx)*/
      if ((Result = EnterExpressionConstant(Element))) return(Result); /*Enter Idx into expression*/
      if ((Result = EnterExpressionOperator(ocAdd))) return(Result);   /*Enter Add operator into expression*/
      if ((Result = EnterExpression(0,True))) return(Result);          /*Enter 1 followed by expression 1 (location+Idx) into EEPROM*/
      if ((Result = Enter0Code(icRead))) return(Result);               /*Enter 0 followed by 6-bit 'READ' instruction code into EEPROM*/
      if ((Result = GetComma())) return(Result);                       /*Get ','*/
      }
    }
  while (Element.ElementType == etComma);
  if (Element.ElementType != etEnd)                                    /*Not End? Error, expected ',' or end-of-line or ':'*/
    {
    GetElement(&Element);
    return(Error(ecECEOLOC));
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileReturn(void)
/*Syntax: RETURN*/
{
  TErrorCode  Result;

  if ((Result = Enter0Code(icReturn))) return(Result);                 /*Enter 0 followed by 6-bit 'RETURN' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileReverse(void)
/*Syntax: REVERSE pin*/
{
  TErrorCode    Result;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,True))) return(Result);  /*Get pin value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icReverse))) return(Result);               /*Enter 0 followed by 6-bit 'REVERSE' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileRun(void)
/*Syntax: RUN SlotNumber*/
{
  TErrorCode    Result;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get slot number value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icRun))) return(Result);                   /*Enter 0 followed by 6-bit 'RUN' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileSelect(void)
/*Syntax: SELECT expression /../ CASE { (condition(s)|ELSE) }{:} /../ ENDSELECT
  NOTE: The NestingStack is used to keep track of addresses to patch, the element starting the expression, default
  conditional operators and potential nesting.

  NOTE: The BS2 through BS2pe do not have SELECT CASE implemented in firmware.
        To achieve a SELECT CASE, the command is translated by CompileSelect, CompileCase and CompileEndSelect into the
        following (The actual source isn't modified, however the result is effectively equal to the following translation
        in source code):

        EXAMPLE:                                                  TRANSLATES TO:
        SELECT expression                                         IF expression condition1 THEN JumpLabel1
          CASE  condition1               : statement(s)             GOTO SkipLabel1
          CASE  condition2, condition3   : statement(s)           JumpLabel1:
          CASE  condition4 TO condition5 : statement(s)             statement(s)
          CASE  ELSE                     : statement(s)             GOTO ExitLabel
        ENDSELECT                                                 SkipLabel1:
                                                                  IF expression condition2 OR expression condition3 THEN JumpLabel2
                                                                    GOTO SkipLabel2
                                                                  JumpLabel2:
                                                                    statement(s)
                                                                    GOTO ExitLabel
                                                                  SkipLabel2:
                                                                  IF expression >= condition4 AND expression <= condition5 THEN JumpLabel3
                                                                    GOTO SkipLabel3
                                                                  JumpLabel3:
                                                                    statement(s)
                                                                    GOTO ExitLabel
                                                                  SkipLabel3:
                                                                    statement(s)
                                                                  ExitLabel:        */
{
  TElementList  Element;
  int           Idx;
  TErrorCode    Result;

  if (SelectCount == SelectStackSize) return(Error(ecLOSNSSE));      /*Index out of range? Error, Limit of 16 Nested SELECT Statements Exceeded*/
  NestingStack[NestingStackIdx].NestType = ntSELECT;                 /*Set type to SELECT*/
  NestingStack[NestingStackIdx].ElementIdx = ElementListIdx-1;       /*Save element list index on stack (start of "SELECT")*/
  NestingStack[NestingStackIdx].ExpIdx = ElementListIdx;             /*Store start of expression*/
  NestingStack[NestingStackIdx].SkipLabel = 0;                       /*Reset SkipLabel*/
  for (Idx = 0; Idx < MaxExits; Idx++) NestingStack[NestingStackIdx].Exits[Idx] = 0; /*Reset Exits stack*/
  NestingStackIdx++;                                                 /*Finish stack "push"*/
  SelectCount++;
  StackIdx = 0;
  if ((Result = GetValueConditional(False,False,0))) return(Result); /*Get expression, just to verify it is a valid "value" expression*/
  GetElement(&Element);                                              /*Get next element, should be End*/
  if (Element.ElementType != etEnd) return(Error(ecECOEOL));         /*Not End? Error, expected ':' or end-of-line*/
  GetElement(&Element);                                              /*Get next element, should be 'CASE'*/
  if ( !((Element.ElementType == etInstruction) && (Element.Value == itCase)) ) return(Error(ecECE)); /*Not 'CASE'?  Error, Expected 'CASE'*/
  ElementListIdx -= 2;                                               /*Move back to End*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetTimeout(void)
/*Get Timeout and Timeout Label for SERIN command*/
{
  TErrorCode    Result;

  StackIdx = 2;
  if ((Result = GetValueConditional(False,False,0))) return(Result); /*Get timeout value into expression 0*/
  if ((Result = GetComma())) return(Result);                         /*Get ','*/
  if ((Result = EnterEEPROM(8,0xDD))) return(Result);                /*Enter 1 and 15-bit constant read command (%11011101)*/
  if ((Result = GetAddressEnter())) return(Result);                  /*Get destination address (14-bits) and enter into EEPROM*/
  if ((Result = GetComma())) return(Result);                         /*Get ','*/
  if ((Result = EnterExpression(0,True))) return(Result);            /*Enter 1 followed by expression 0 (Timeout value) into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileSerin(void)
/*Syntax: SERIN dpin\fpin, baudmode, {plabel,} {timeout, tlabel,} [indata]*/
{
  TErrorCode    Result;
  bool          Flow;
  TElementList  Preview;

  Flow = False;
  StackIdx = 4;
  if ((Result = GetValue(1,True))) return(Result);                    /*Get dpin value into expression 1*/
  if (CheckBackslash())                                               /*Check for optional '\' (fpin)*/
    { /*Backslash found*/
    StackIdx = 5;
    if ((Result = GetValue(2,True))) return(Result);                  /*Get fpin value into expression 2*/
    Flow = True;                                                      /*Set flow flag*/
    } /*Backslash found*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  StackIdx = 3;
  if ((Result = GetValue(3,False))) return(Result);                   /*Get baudmode value into expression 3*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  PreviewElement(&Preview);
  if (Preview.ElementType != etLeftBracket) 
    { /*No left bracket, must be parity label or timeout next*/
    if ( (Preview.ElementType == etAddress) | (Preview.ElementType == etUndef) )
      { /*Address or undefined, must be parity label*/
      if ((Result = EnterEEPROM(8,0xDD))) return(Result);             /*Enter 1 and 15-bit constant read command (%11011101)*/
      if ((Result = GetAddressEnter())) return(Result);               /*Get destination address (14-bits) and enter into EEPROM*/
      if ((Result = GetComma())) return(Result);                      /*Get ','*/
      PreviewElement(&Preview);
      if (Preview.ElementType == etLeftBracket)
        { /*Found '[' after parity label, null tlabel and timeout*/
        if ((Result = EnterConstant(0,True))) return(Result);         /*Enter 1 followed by 0 into EEPROM}*/
        if ((Result = EnterConstant(1,True))) return(Result);         /*Enter 1 followed by 1 into EEPROM}*/
        }
      else  /*No '[' after parity label, must be timeout}*/
        if ((Result = GetTimeout())) return(Result);
      } /*Address or undefined, must be parity label*/
    else  /*Not address or undefined, must be timeout value*/
      if ((Result = GetTimeout())) return(Result);
    }  /*No left bracket, must be parity label or timeout next*/
  else
    { /*Left bracket found, must be no parity label and no timeout*/
    if ((Result = EnterConstant(1,True))) return(Result);             /*Enter 1 followed by 1 into EEPROM*/
    }
  if ((Result = EnterExpression(3,True))) return(Result);             /*Enter 1 followed by expression 3 (baudmode) into EEPROM*/
  if ((Result = EnterExpression(1,True))) return(Result);             /*Enter 1 followed by expression 1 (dpin) into EEPROM*/
  if (Flow)
    { /*Flow mode*/
    if ((Result = EnterExpression(2,True))) return(Result);           /*If flow mode, enter 1 followed by expression 2 (fpin) into EEPROM*/
    if ((Result = Enter0Code(icSerinFlow))) return(Result);           /*Enter 0 followed by 6-bit 'SERIN W/FLOW' instruction code into EEPROM*/
    } /*Flow mode*/
  else
    if ((Result = Enter0Code(icSerinNoFlow))) return(Result);         /*Enter 0 followed by 6-bit 'SERIN W/O FLOW' instruction code into EEPROM*/
  if ((Result = GetLeftBracket())) return(Result);                    /*Get '['*/
  if ((Result = CompileInputSequence())) return(Result);
  if ((Result = GetRightBracket())) return(Result);                   /*Get ']'*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileSerout(void)
/*Syntax: SEROUT dpin, baudmode, {pace,} [outdata]*/
/*        SEROUT dpin\fpin, baudmode, {timeout, tlabel,} [outdata]*/
{
  TErrorCode    Result;
  bool          Flow;
  TElementList  Preview;

  Flow = False;
  StackIdx = 3;
  if ((Result = GetValue(1,True))) return(Result);                    /*Get dpin value into expression 1*/
  if (CheckBackslash())                                               /*Check for optional '\' (fpin)*/
    { /*Backslash found*/
    StackIdx = 4;
    if ((Result = GetValue(2,True))) return(Result);                  /*Get fpin value into expression 2*/
    Flow = True;                                                      /*Set flow flag*/
    } /*Backslash found*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  StackIdx = 2;
  if ((Result = GetValue(3,False))) return(Result);                   /*Get baudmode value into expression 3*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  PreviewElement(&Preview);
  if (Preview.ElementType != etLeftBracket)
    { /*No left bracket, must be pace or timeout next*/
    StackIdx = 1;
    if ((Result = GetValueConditional(False,False,0))) return(Result);/*Get pace or timeout value*/
    if ((Result = GetComma())) return(Result);                        /*Get ','*/
    if (Flow)
      { /*Flow mode*/
      if ((Result = EnterEEPROM(8,0xDD))) return(Result);             /*Enter 1 and 15-bit constant read command (%11011101)*/
      if ((Result = GetAddressEnter())) return(Result);               /*Get destination address (14-bits) and enter into EEPROM*/
      if ((Result = GetComma())) return(Result);                      /*Get ','*/
      } /*Flow mode*/
    if ((Result = EnterExpression(0,True))) return(Result);           /*Enter 1 followed by expression 0 (pace or timeout) into EEPROM*/
    } /*No left bracket, must be pace or timeout next*/
  if ((Result = EnterExpression(3,True))) return(Result);             /*Enter 1 followed by expression 3 (baudmode) into EEPROM*/
  if ((Result = EnterExpression(1,True))) return(Result);             /*Enter 1 followed by expression 1 (dpin) into EEPROM*/
  if (Flow)
    { /*Flow mode*/
    if ((Result = EnterExpression(2,True))) return(Result);           /*If flow mode, enter 1 followed by expression 2 (fpin) into EEPROM*/
    if ((Result = Enter0Code(icSeroutFlow))) return(Result);          /*Enter 0 followed by 6-bit 'SEROUT W/FLOW' instruction code into EEPROM*/
    } /*Flow mode*/
  else
    if ((Result = Enter0Code(icSeroutNoFlow))) return(Result);        /*Enter 0 followed by 6-bit 'SEROUT W/O FLOW' instruction code into EEPROM*/
  if ((Result = GetLeftBracket())) return(Result);                    /*Get '['*/
  if ((Result = CompileOutputSequence())) return(Result);
  if ((Result = GetRightBracket())) return(Result);                   /*Get ']'*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileShiftin(void)
/*Syntax: SHIFTIN dpin, cpin, mode, [variable{\bits},...]*/
{
  TErrorCode    Result;
  bool          FoundBracket;

  StackIdx = 1;
  if ((Result = GetValue(1,True))) return(Result);                    /*Get dpin value into expression 1*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  StackIdx = 2;
  if ((Result = GetValue(2,True))) return(Result);                    /*Get cpin value into expression 2*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get mode value and enter 1 followed by the value into EEPROM*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  if ((Result = EnterExpression(1,True))) return(Result);             /*Enter 1 followed by expression 1 (dpin) into EEPROM*/
  if ((Result = EnterExpression(2,True))) return(Result);             /*Enter 1 followed by expression 2 (cpin) into EEPROM*/
  if ((Result = Enter0Code(icShiftin))) return(Result);               /*Enter 0 followed by 6-bit 'SHIFTIN' instruction code into EEPROM*/
  if ((Result = GetLeftBracket())) return(Result);                    /*Get '['*/
  do
    {
    StackIdx = 5;
    if ((Result = GetWrite(1))) return(Result);                       /*Get Variable Write expression (receive variable) into Expression 1*/
    if (CheckBackslash())                                             /*Check for optional '\' (bits)*/
      { /*Backslash found*/
      StackIdx = 3;
      if ((Result = GetValueEnterExpression(False,False))) return(Result);/*Get bits value and enter into EEPROM*/
      } /*Backslash found*/
    else    /*Backslash not found*/
      if ((Result = EnterConstant(8,False))) return(Result);          /*Enter 8 (default bits) into EEPROM*/
    if ((Result = EnterConstant(0,True))) return(Result);             /*Enter 1 followed by 0 into EEPROM*/
    if ((Result = EnterEEPROM(1,0))) return(Result);                  /*Enter 0 into EEPROM*/
    if ((Result = EnterExpression(1,False))) return(Result);          /*Enter expression 1 (Receive variable 'write') into EEPROM*/
    if ((Result = EnterEEPROM(1,0))) return(Result);                  /*Enter 0 into EEPROM*/
    if ((Result = GetCommaOrBracket(&FoundBracket))) return(Result);
    }
  while (!FoundBracket);                                            /*Repeat until bracket or error found*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileShiftout(void)
/*Syntax: SHIFTOUT dpin, cpin, mode, [value{\bits},...]*/
{
  TErrorCode    Result;
  bool          FoundBracket;

  StackIdx = 1;
  if ((Result = GetValue(1,True))) return(Result);                    /*Get dpin value into expression 1*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  StackIdx = 2;
  if ((Result = GetValue(2,True))) return(Result);                    /*Get cpin value into expression 2*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get mode value and enter 1 followed by the value into EEPROM*/
  if ((Result = GetComma())) return(Result);                          /*Get ','*/
  if ((Result = EnterExpression(1,True))) return(Result);             /*Enter 1 followed by expression 1 (dpin) into EEPROM*/
  if ((Result = EnterExpression(2,True))) return(Result);             /*Enter 1 followed by expression 2 (cpin) into EEPROM*/
  if ((Result = Enter0Code(icShiftout))) return(Result);              /*Enter 0 followed by 6-bit 'SHIFTOUT' instruction code into EEPROM*/
  if ((Result = GetLeftBracket())) return(Result);                    /*Get '['*/
  do
    {
    StackIdx = 4;
    if ((Result = GetValue(1,False))) return(Result);                 /*Get value (to transmit) into expression 1*/
    if (CheckBackslash())                                             /*Check for optional '\' (bits)*/
      { /*Backslash found*/
      StackIdx = 3;
      if ((Result = GetValueEnterExpression(False,False))) return(Result);/*Get bits value and enter into EEPROM*/
      } /*Backslash found*/
    else    /*Backslash not found*/
      if ((Result = EnterConstant(8,False))) return(Result);          /*Enter 8 (default bits) into EEPROM*/
    if ((Result = EnterExpression(1,True))) return(Result);           /*Enter 1 followed by expression 1 (value to trasmit) into EEPROM*/
    if ((Result = EnterEEPROM(1,0))) return(Result);                  /*Enter 0 into EEPROM*/
    if ((Result = GetCommaOrBracket(&FoundBracket))) return(Result);
    } 
  while (!FoundBracket);                                              /*Repeat until bracket or error found*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileSleep(void)
/*Syntax: SLEEP period*/
{
  TErrorCode    Result;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get period value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icSleep))) return(Result);                 /*Enter 0 followed by 6-bit 'SLEEP' instruction code into EEPROM*/
  if ((Result = EnterAddress(EEPROMIdx+14))) return(Result);          /*Enter next address into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileStop(void)
/*Syntax: STOP*/
{
  TErrorCode  Result;

  if ((Result = Enter0Code(icStop))) return(Result);                  /*Enter 0 followed by 6-bit 'STOP' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileStore(void)
/*Syntax: STORE slotnumber*/
{
  TErrorCode  Result;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,False))) return(Result); /*Get slot number value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icStore))) return(Result);                 /*Enter 0 followed by 6-bit 'STORE' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileToggle(void)
/*Syntax: TOGGLE pin*/
{
  TErrorCode    Result;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,True))) return(Result);  /*Get pin value and enter 1 followed by the value into EEPROM*/
  if ((Result = Enter0Code(icToggle))) return(Result);                /*Enter 0 followed by 6-bit 'TOGGLE' instruction code into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileWrite(void)
/*Syntax: WRITE location, {WORD} value {,{WORD} value...}*/
{
  TElementList  Element;
  int           ValueStart;           /*Element where value starts*/
  int           Idx;                  /*Location offset*/
  TErrorCode    Result;
                  
  ValueStart = 0;                                                              /*Assume classic syntax*/
  Idx = 0;
  StackIdx = 1;
  if ((Result = GetValue(1,False))) return(Result);                            /*Get location value into expression 1*/
  do
    {
    if ((Result = GetComma())) return(Result);                                 /*Get ','*/
    if ( (Lang250) && (PreviewElement(&Element)) && (Element.ElementType == etVariableAuto) )
      {  /*if PBASIC version 2.5, could be optional WORD switch*/
      GetElement(&Element);                                                    /*Get the optional switch element*/
      if (Element.Value != 0x0003) return(Error(ecEACVOW));                    /*Not WORD? Error, Expected a constant, variable or 'WORD'*/
      /*Enhanced syntax*/
      ValueStart = ElementListIdx;                                             /*Remember start of value and that we're using enhanced syntax*/
      }
    /*Finish classic syntax*/
    StackIdx = 0;
    if ((Result = GetValueEnterExpression(True,False))) return(Result);        /*Get value value and enter 1 followed by the value into EEPROM*/
    CopyExpression(0,2);                                                       /*Save value expression in expression 2, for potential re-use later*/
    /*Patch location to be location+Idx, if Idx > 0*/
    CopyExpression(1,0);                                                       /*Copy location expression to expression 0*/
    if (Idx > 0)
      {
      Element.Value = Idx;                                                     /*Set .Value to Idx (for location+Idx)*/
      if ((Result = EnterExpressionConstant(Element))) return(Result);         /*Enter Idx into expression*/
      if ((Result = EnterExpressionOperator(ocAdd))) return(Result);           /*Enter Add operator into expression*/
      }
    if ((Result = EnterExpression(0,True))) return(Result);                    /*Enter 1 followed by expression 0 (location value) into EEPROM*/
    if ((Result = Enter0Code(icWrite))) return(Result);                        /*Enter 0 followed by 6-bit 'WRITE' instruction code into EEPROM*/
    if ((Result = EnterAddress(EEPROMIdx+14))) return(Result);                 /*Enter next address into EEPROM*/
    if (ValueStart > 0)
      {  /*Enhanced Syntax, enter a second WRITE command of the form: WRITE location+1, value >> 8*/
      /*Patch value to be: value >> 8*/
      CopyExpression(2,0);                                                     /*Copy value expression to expression 0*/
      Element.Value = 8;                                                       /*Set .Value to 8 (for value >> 8)*/
      if ((Result = EnterExpressionConstant(Element))) return(Result);         /*Enter 8 into expression*/
      if ((Result = EnterExpressionOperator(ocShr))) return(Result);           /*Enter Shr operator into expression*/
      if ((Result = EnterExpression(0,True))) return(Result);                  /*Enter 1 followed by expression 0 (value >> 8) into EEPROM*/
      /*Patch location to be: location+Idx*/
      CopyExpression(1,0);                                                     /*Copy location expression to expression 0*/
      Idx++;                                                                   /*Increment location offset*/
      Element.Value = Idx;                                                     /*Set .Value to Idx (for location+Idx)*/
      if ((Result = EnterExpressionConstant(Element))) return(Result);         /*Enter Idx into expression*/
      if ((Result = EnterExpressionOperator(ocAdd))) return(Result);           /*Enter Add operator into expression*/
      if ((Result = EnterExpression(0,True))) return(Result);                  /*Enter 1 followed by expression 0 (location value) into EEPROM*/
      if ((Result = Enter0Code(icWrite))) return(Result);                      /*Enter 0 followed by 6-bit 'WRITE' instruction code into EEPROM*/
      if ((Result = EnterAddress(EEPROMIdx+14))) return(Result);               /*Enter next address into EEPROM*/
      }
    Idx++;                                                                     /*Increment location offset*/
    ValueStart = 0;                                                            /*Reset to assume classic syntax*/
    if (Lang250) PreviewElement(&Element); else Element.ElementType = etEnd;   /*Preview next element for optional comma (,)*/
    } 
  while (Element.ElementType == etComma);
  if (Element.ElementType != etEnd)                                            /*Not End? Error, expected ',' or end-of-line or ':'*/
    {
    GetElement(&Element);
    return(Error(ecECEOLOC));
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileXout(void)
/*Syntax: XOUT mpin, zpin, [house\keyorcommand{\cycles},...]*/
{
  TErrorCode    Result;
  bool          FoundBracket;

  StackIdx = 0;
  if ((Result = GetValueEnterExpression(True,True))) return(Result);     /*Get mpin value and enter 1 followed by the value into EEPROM*/
  if ((Result = GetComma())) return(Result);                             /*Get ','*/
  StackIdx = 1;
  if ((Result = GetValueEnterExpression(True,True))) return(Result);     /*Get zpin value and enter 1 followed by the value into EEPROM*/
  if ((Result = GetComma())) return(Result);                             /*Get ','*/
  if ((Result = Enter0Code(icXout))) return(Result);                     /*Enter 0 followed by 6-bit 'XOUT' instruction code into EEPROM*/
  if ((Result = GetLeftBracket())) return(Result);                       /*Get '['*/
  do
    {
    StackIdx = 2;
    if ((Result = GetValueEnterExpression(False,False))) return(Result); /*Get house value and enter into EEPROM*/
    if ((Result = GetBackslash())) return(Result);                       /*Get '\'*/
    if ((Result = EnterConstant(16,True))) return(Result);               /*Enter 1 followed by 16 into EEPROM*/
    if ((Result = EnterOperator(ocMod))) return(Result);                 /*Enter 1 followed by Modulus operator code into EEPROM*/
    StackIdx = 3;
    if ((Result = GetValueEnterExpression(True,False))) return(Result);  /*Get key or command value and enter 1 followed by the value into EEPROM*/
    if ((Result = EnterConstant(16,True))) return(Result);               /*Enter 1 followed by 16 into EEPROM*/
    if ((Result = EnterOperator(ocMul))) return(Result);                 /*Enter 1 followed by Multiply operator code into EEPROM*/
    if ((Result = EnterOperator(ocAdd))) return(Result);                 /*Enter 1 followed by Addition operator code into EEPROM*/
    if (CheckBackslash())                                                /*Check for optional '\' (cycles)*/
      { /*Backslash found*/
      StackIdx = 3;
      if ((Result = GetValueEnterExpression(True,False))) return(Result);/*Get cycles value and enter 1 followed by the value into EEPROM*/
      } /*Backslash found*/
    else    /*Backslash not found*/
      if ((Result = EnterConstant(2,True))) return(Result);              /*Enter 1 followed by 2 (default cycles) into EEPROM*/
    if ((Result = EnterOperator(ocNot))) return(Result);                 /*Enter 1 followed by Not operator code into EEPROM*/
    if ((Result = EnterEEPROM(1,0))) return(Result);                     /*Enter 0 into EEPROM*/
    if ((Result = GetCommaOrBracket(&FoundBracket))) return(Result);
    }
  while (!FoundBracket);                                                 /*Repeat until bracket or error found*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/
/*------------------------------ Compiler Routines -----------------------------*/
/*------------------------------------------------------------------------------*/

TErrorCode GetValue(byte ExpNumber, bool PinIsConstant)
/*Get value into Expression 1 to 3*/
{
  TErrorCode    Result;

  if ((Result = GetValueConditional(False,PinIsConstant,0))) return(Result);
  CopyExpression(0,ExpNumber);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetRead(byte ExpNumber)
/*Get read into Expression 1 to 3*/
{
  TErrorCode    Result;

  if ((Result = GetReadWrite(False))) return(Result);
  CopyExpression(0,ExpNumber);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetWrite(byte ExpNumber)
/*Get write into Expression 1 to 3*/
{
  TErrorCode  Result;

  if ((Result = GetReadWrite(True))) return(Result);
  CopyExpression(0,ExpNumber);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetValueEnterExpression(bool Enter1Before, bool PinIsConstant)
/*Get value and enter expression.  If Enter1Before is True, a 1 is entered preceeding
the expression*/
{
  TErrorCode  Result;

  if ((Result = GetValueConditional(False,PinIsConstant,0))) return(Result);
  if ((Result = EnterExpression(0,Enter1Before))) return(Result);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetWriteEnterExpression(void)
/*Get write and enter expression followed by 0.*/
{
  TErrorCode    Result;

  if ((Result = GetReadWrite(True))) return(Result);
  if ((Result = EnterExpression(0,False))) return(Result);
  if ((Result = EnterEEPROM(1,0))) return(Result);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode EnterOperator(TOperatorCode Operator)
/*Enter 1 followed by 6-bit operator code*/
{
  TErrorCode    Result;

  if ((Result = EnterEEPROM(1,1))) return(Result);
  if ((Result = EnterEEPROM(6,(byte)Operator))) return(Result);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetEnd(bool *Result)
/*Verify next element is an End of Line (or colon).  Returns False in Result if Hard End (End of Line),
  returns True in Result if Soft End (colon).*/
{
  TElementList  Element;

  GetElement(&Element);  /*If next element is not End, Error: Expected Constant or End Of Line*/
  if (Element.ElementType != etEnd) return(Error(ecECOEOL));
  *Result = (Element.Value ? True : False);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetLeft(void)
/*Verify next element is a '('*/
{
  TElementList  Element;

  GetElement(&Element);  /*If next element is not '(', Error: Expected Left Parenthesis*/
  if (Element.ElementType != etLeft) return(Error(ecEL));
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetRight(void)
/*Verify next element is a ')'*/
{
  TElementList  Element;

  GetElement(&Element);  /*If next element is not ')', Error: Expected Right Parenthesis*/
  if (Element.ElementType != etRight) return(Error(ecER));
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetLeftBracket(void)
/*Verify next element is a '['*/
{
  TElementList  Element;

  GetElement(&Element);  /*If next element is not '[', Error: Expected Left Bracket*/
  if (Element.ElementType != etLeftBracket) return(Error(ecELB));
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetRightBracket(void)
/*Verify next element is a ']'*/
{
  TElementList  Element;

  GetElement(&Element);  /*If next element is not ']', Error: Expected Right Bracket*/
  if (Element.ElementType != etRightBracket) return(Error(ecERB));
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetEqual(void)
/*Verify next element is an equal sign '='*/
{
  TElementList  Element;

  GetElement(&Element);  /*If next element is not '=', Error: Expected Equal*/
  if ( !((Element.ElementType == etCond1Op) && (Element.Value == (word)ocE)) ) return(Error(ecEE));
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetTO(void)
/*Verify next element is 'TO'*/
{
  TElementList  Element;

  GetElement(&Element);  /*If next element is not 'TO', Error: Expected 'TO'*/
  if (Element.ElementType != etTo) return(Error(ecETO));
   return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetComma(void)
/*Verify next element is a comma ','*/
{
  TElementList  Element;

  GetElement(&Element);  /*If next element is not ',', Error: Expected Comma*/
  if (Element.ElementType != etComma) return(Error(ecEC));
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetQuestion(void)
/*Get and verify question*/
{
  TElementList  Element;

  GetElement(&Element);
  if (Element.ElementType != etQuestion) return(Error(ecEQ)); /*No '?' Error: Expected '?'*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetBackslash(void)
/*Get and verify backslash*/
{
  TElementList  Element;

  GetElement(&Element);
  if (Element.ElementType != etBackslash) return(Error(ecEB)); /*Not backslash? Error: Expected Backslash*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CopySymbol(void)
/*Copy Symbol to Symbol2 and check Symbol Table for space*/
{
  Symbol2 = Symbol;
  if (SymbolTablePointer >= SymbolTableSize) return(Error(ecSTF));
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

bool CheckQuestion(void)
/*Check for question mark '?'.  Returns True if found and skipped, False if not found
and not skipped*/
{
  TElementList  Preview;

  PreviewElement(&Preview);
  ElementListIdx += ((Preview.ElementType == etQuestion) ? 1 : 0);
  return(Preview.ElementType == etQuestion);
}

/*------------------------------------------------------------------------------*/

bool CheckBackslash(void)
/*Check for backslash '\'.  Returns True if found and skipped, False if not found
and not skipped*/
{
  TElementList  Preview;

  PreviewElement(&Preview);
  ElementListIdx += ((Preview.ElementType == etBackslash) ? 1 : 0);
  return(Preview.ElementType == etBackslash);
}

/*------------------------------------------------------------------------------*/

TErrorCode GetCommaOrBracket(bool *FoundBracket)
/*Get comma ',' or right bracket ']' and enter 1 or 0 into EEPROM.  Returns False
if comma found (1 entered) or True if bracket found (0 entered)*/
{
  TErrorCode    Result;
  TElementList  Element;

  *FoundBracket = False;      /*Assume false (comma)*/
  GetElement(&Element);       /*Get next element*/
  if (Element.ElementType == etComma)
    {
    if ((Result = EnterEEPROM(1,1))) return(Result);  /*Comma found, enter 1 in EEPROM*/
    }
  else
    {   /*Not comma*/
    if (Element.ElementType != etRightBracket) return(Error(ecECORB)); /*Not ']' either? Error: Expected Comma Or Right Bracket*/
    if ((Result = EnterEEPROM(1,0))) return(Result); /*Right bracket found, enter 0 in EEPROM*/
    *FoundBracket = True;
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetCommaOrEnd(bool *EndFound)
/*Get comma ',' or end ':' (or eol) and enter 1 or 0 into EEPROM.  Returns False
if comma found (1 entered) or True if end found (0 entered)*/
{

  TElementList  Element;
  TErrorCode    Result;

  *EndFound = False;                                                   /*Assume false (comma)*/
  GetElement(&Element);                                                /*Get next element*/
  if (Element.ElementType == etComma)
    {
    if ((Result = EnterEEPROM(1,1))) return(Result);                   /*Comma found, enter 1 in EEPROM*/
    }
  else
    {  /*Not comma*/
    if ( !(Element.ElementType == etEnd) ) return(Error(ecECEOLOC));   /*Not End? Error: Expected Comma, end-of-line or ':'*/
    if ((Result = EnterEEPROM(1,0))) return(Result);                   /*Right bracket found, enter 0 in EEPROM*/
    *EndFound = True;
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetByteVariable(TElementList *Element)
/*Get and verify a byte variable*/
{
  GetElement(Element);                     /*String, get byte variable*/
  if ( (Element->ElementType != etVariable) | ((Element->Value & 0x0200) != 0x0200) ) return(Error(ecEABV));  /*Not byte variable? Error: Expected a Byte Variable*/
  Element->Value = Element->Value & 0xFF;
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetUndefinedSymbol(void)
/*Retrieve undefined symbol and store in Symbol2*/
{
  TErrorCode    Result;
  TElementList  Element;

  GetElement(&Element);
  /*If symbol undefined, copy it to symbol table, else Error: Symbol Is Already Defined*/
  if (Element.ElementType == etUndef) { if ((Result = CopySymbol())) return(Result); } else return(Error(ecSIAD));
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode Enter0Code(TInstructionCode Code)
/*Enter 0 and 6-bit instruction code into EEPROM*/
{
  TErrorCode  Result;

  if ((Result = EnterEEPROM(7,(word)(InstCode[Code][tzModuleRec->TargetModule-2])))) return(Result);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileInputSequence(void)
/*Compile input sequence for instructions like SERIN*/
{
  typedef enum TInputState {osCheck, osSPString, osString, osSkip, osWaitString, osWait, osNumber, osNext, osDone} TInputState;

  TErrorCode      Result;
  TElementList    Element;
  TElementList    Preview;
  TInputState     State;
  int             OldElementListIdx[7]; /*Note: element 6 is used to store final ElementListIdx*/
  byte            Count;
  byte            TotalCount;

  State = osCheck;
  while (State != osDone)
    { /*While not done*/
    switch (State)
      {
      case osCheck       : /*Check for input type*/
                           GetElement(&Element);
                           switch (Element.ElementType)
                             {
                             case etStringIO     : State = osString; break;
                             case etSpStringIO   : State = osSPString; break;
                             case etSkipIO       : State = osSkip; break;
                             case etWaitStringIO : State = osWaitString; break;
                             case etWaitIO       : State = osWait; break;
                             case etAnyNumberIO  :
                             case etNumberIO     : State = osNumber; break;
                             default             : /*Normal, just enter byte*/
                                                   ElementListIdx--;
                                                   if ((Result = EnterEEPROM(1,0))) return(Result);                  /*Enter 0 into EEPROM*/
                                                   StackIdx = 1;
                                                   if ((Result = GetWriteEnterExpression())) return(Result);         /*Get variable 'write' and enter into EEPROM followed by a 0*/
                                                   State = osNext;
                             } /*Case*/
                           break;
      case osString      : /*STR bytevar \L{\E}*/
                           if ((Result = EnterEEPROM(1,1))) return(Result);                              /*Enter 1 into EEPROM*/
                           if ((Result = GetByteVariable(&Element))) return(Result);
                           if ((Result = GetBackslash())) return(Result);
                           StackIdx = 2;
                           if ((Result = GetValue(1,False))) return(Result);                             /*Get length value into expression 1*/
                           if (CheckBackslash())
                             { /*Backslash found*/                                                       /*Must be "STR Bytevar\L\E"*/
                             StackIdx = 0;
                             if ((Result = GetValueEnterExpression(False,False))) return(Result);        /*Get end character value and enter into EEPROM*/
                             if ((Result = EnterEEPROM(1,1))) return(Result);                            /*Enter 1 into EEPROM*/
                             Element.Value = Element.Value | 0x0200;
                             }
                           if ((Result = EnterConstant(Element.Value,False))) return(Result);            /*Enter value into EEPROM*/
                           if ((Result = EnterExpression(1,True))) return(Result);                       /*Enter 1 followed by expression 1 (length value) into EEPROM*/
                           if ((Result = EnterEEPROM(1,0))) return(Result);                              /*Enter 0 into EEPROM*/
                           State = osNext;
                           break;
      case osSPString    : /*SPSTR L*/
                           if ((Result = EnterConstant(0x1000,True))) return(Result);                    /*Enter 1 followed by $1000 into EEPROM*/
                           StackIdx = 1;
                           if ((Result = GetValueEnterExpression(True,False))) return(Result);           /*Get length value and enter 1 followed by the value into EEPROM*/
                           if ((Result = EnterEEPROM(1,0))) return(Result);                              /*Enter 0 into EEPROM*/
                           State = osNext;
                           break;
      case osSkip        : /*SKIP L*/
                           if ((Result = EnterConstant(0x0400,True))) return(Result);                    /*Enter 1 followed by $0400 into EEPROM*/
                           StackIdx = 1;
                           if ((Result = GetValueEnterExpression(True,False))) return(Result);           /*Get count value and enter 1 followed by the value into EEPROM*/
                           if ((Result = EnterEEPROM(1,0))) return(Result);                              /*Enter 0 into EEPROM*/
                           State = osNext;
                           break;
      case osWaitString  : /*WAITSTR bytevar {\L}*/
                           if ((Result = GetByteVariable(&Element))) return(Result);                     /*Get byte variable*/
                           if (!CheckBackslash())
                             { /*No Backslash found*/
                             if ((Result = EnterConstant((Element.Value & 0xFF) | 0x0800,True))) return(Result); /*Enter 1 followed by byte variable or'd with $0800 into EEPROM*/
                             if ((Result = EnterConstant(32,True))) return(Result);                      /*Enter 1 followed by 32 into EEPROM*/
                             } /*No Backslash found*/
                           else
                             { /*Backslash found, get length value*/
                             if ((Result = EnterConstant((Element.Value & 0xFF) | 0x0A00,True))) return(Result);/*Enter 1 followed by byte variable or'd with $0A00 into EEPROM*/
                             StackIdx = 1;
                             if ((Result = GetValueEnterExpression(True,False))) return(Result);         /*Get length value and enter 1 followed by the value into EEPROM*/
                             }
                           if ((Result = EnterEEPROM(1,0))) return(Result);                              /*Enter 0 into EEPROM*/
                           State = osNext;
                           break;
      case osWait        : /*WAIT (up to six characters)*/
                           if ((Result = EnterEEPROM(1,1))) return(Result);                              /*Enter 1 into EEPROM*/
                           if ((Result = GetLeft())) return(Result);                                     /*Get '('*/
                           Count = 0;
                           do
                             {
                             OldElementListIdx[Count] = ElementListIdx;
                             StackIdx = 5-Count;
                             if ((Result = GetValueConditional(False,False,0))) return(Result);          /*Get value*/
                             Count++;
                             GetElement(&Element);
                             }
                           while ( (Element.ElementType == etComma) && (Count != 6) );
                           if ( (Count == 6) & (Element.ElementType == etComma) ) return(Error(ecLOSVE)); /*Error: Limit of 6 Values Exceeded*/
                           ElementListIdx--;
                           if ((Result = GetRight())) return(Result);                                    /*Get ')'*/
                           TotalCount = Count;
                           OldElementListIdx[6] = ElementListIdx;
                           do
                             {
                             ElementListIdx = OldElementListIdx[Count-1];
                             StackIdx = 0;
                             if ((Result = GetValueEnterExpression(False,False))) return(Result);        /*Get length value and enter into EEPROM*/
                             if ((Result = EnterEEPROM(1,1))) return(Result);                            /*Enter 1 into EEPROM*/
                             Count--;
                             }
                          while (Count != 0);
                          ElementListIdx = OldElementListIdx[6];
                          if ((Result = EnterConstant(0x0C44,False))) return(Result);                    /*Enter 1 followed by $0C44 into EEPROM*/
                          if ((Result = EnterConstant(TotalCount,True))) return(Result);                 /*Enter 1 followed by Total Count of elements into EEPROM*/
                          if ((Result = EnterEEPROM(1,0))) return(Result);                               /*Enter 0 into EEPROM*/
                          State = osNext;
                          break;
      case osNumber     : /*Number*/
                          if ((Result = EnterConstant(Element.Value,True))) return(Result);              /*Enter 1 followed by value into EEPROM*/
                          if ((Result = EnterConstant(0,True))) return(Result);                          /*Enter 0 constant into EEPROM*/
                          if ((Result = EnterEEPROM(1,0))) return(Result);                               /*Enter 0 into EEPROM*/
                          StackIdx = 1;
                          if ((Result = GetWriteEnterExpression())) return(Result);                      /*Get variable 'write' and enter into EEPROM followed by a 0*/
                          State = osNext;
                          break;
      case osNext       : /*Wrap Up*/
                          PreviewElement(&Preview);                                                      /*Check for ','*/
                          if (Preview.ElementType == etComma)
                            { /*Found comma*/
                            ElementListIdx++;                                                            /*Skip ','*/
                            if ((Result = EnterEEPROM(1,1))) return(Result);                             /*Enter 1 into EEPROM*/
                            State = osCheck;                                                             /*Loop to check again*/
                            } /*Found comma*/
                          else
                            State = osDone;                                                              /*Otherwise, we're done*/
                          break;
      case osDone       : break;                                                                         /*Done*/
      } /*Case*/
    } /*While not done*/
  if ((Result = EnterEEPROM(1,0))) return(Result);                                                       /*Enter 0 into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode EnterChr(char Character)
/*Enter Character Constant followed by a 0 and a 1*/
{
  TErrorCode      Result;

  if ((Result = EnterConstant((word)Character,False))) return(Result);
  if ((Result = EnterEEPROM(1,0))) return(Result);
  if ((Result = EnterEEPROM(1,1))) return(Result);
  return(ecS); /*Return success*/ 
}

/*------------------------------------------------------------------------------*/

TErrorCode EnterText(bool ASCFlag)
/*Enter Expression Text for CompileOutputSequence*/
{
  TErrorCode      Result;
  TElementList    TextElement;
  int             OldErrorStart;
  int             OldElementListIdx;
  int             Idx;

  GetElement(&TextElement);
  OldErrorStart = tzModuleRec->ErrorStart;                                 /*Save current source start*/
  ElementListIdx--;
  OldElementListIdx = ElementListIdx;                                      /*Save current Element List Idx*/
  StackIdx = 0;
  if ((Result = GetValueConditional(False,False,0))) return(Result);       /*Get value*/
  ElementListIdx--;
  GetElement(&TextElement);
  ElementListIdx = OldElementListIdx;                                      /*Restore Element List Idx*/
  /*Enter all characters in current expression*/
  for (Idx = OldErrorStart; Idx < tzModuleRec->ErrorStart+tzModuleRec->ErrorLength; Idx++) 
    if ((Result = EnterChr((char)tzSource[Idx]))) return(Result);
  /*Follow text with ' = '*/
  if ((Result = EnterChr(' '))) return(Result);
  if ((Result = EnterChr('='))) return(Result);
  if ((Result = EnterChr(' '))) return(Result);
  if (ASCFlag) { if ((Result = EnterChr('"'))) return(Result); }           /*If ASCII, enter '"' at end*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CompileOutputSequence(void)
/*Compile output sequence for instructions like SEROUT and DEBUG*/
{
  typedef enum TOutputState {osCheck, osASCII, osASCII2, osString, osRepeat, osNumber, osQuestion, osNext, osDone} TOutputState;
  
  TErrorCode    Result;
  bool          ASCFlag, ExpFlag;
  TElementList  Element;
  TElementList  Preview;
  TOutputState  State;

  State = osCheck;
  while (State != osDone)
    { /*While not done*/
    switch (State)
      {
      case osCheck       : /*Check for output type*/
                           ASCFlag = False;                 /*Reset flags*/
                           ExpFlag = False;
                           GetElement(&Element);
                           switch (Element.ElementType)
                             {
                             case etASCIIIO  : State = osASCII; break;
                             case etStringIO : State = osString; break;
                             case etRepeatIO : State = osRepeat; break;
                             case etNumberIO : State = osNumber; break;
                             case etQuestion : State = osQuestion; break;
                             default         : /*Normal, just enter byte*/
                                               ElementListIdx--;
                                               State = osASCII2;
                             }
                           break;
      case osASCII       : /*'ASC'*/
                           if ((Result = GetQuestion())) return(Result);
                           ExpFlag = True;
                           ASCFlag = True;
                           if ((Result = EnterText(ASCFlag))) return(Result);
                           State = osASCII2;
                           break;
      case osASCII2      : /*Rest of 'ASC'*/
                           StackIdx = 1;
                           if ((Result = GetValueEnterExpression(False,False))) return(Result);  /*Get value and enter into EEPROM*/
                           if ((Result = EnterEEPROM(1,0))) return(Result);                      /*Enter 0 into EEPROM*/
                           State = osNext;
                           break;
      case osString      : /*'STR'*/
                           if (CheckQuestion())
                             { /*Found '?'*/
                             ExpFlag = True;
                             ASCFlag = True;
                             if ((Result = EnterText(ASCFlag))) return(Result);
                             } /*Found '?'*/
                           if ((Result = GetByteVariable(&Element))) return(Result);
                           if (!CheckBackslash())
                             { /*No backslash*/                                                   /*Must be "STR Bytevar"*/
                             if ((Result = EnterConstant(Element.Value | 0x0200,False))) return(Result); /*Enter ByteVar or'd with $0200 into EEPROM*/
                             if ((Result = EnterConstant(32,True))) return(Result);               /*Enter 1 followed by 32 into EEPROM*/
                             }
                           else
                             { /*Backslash found*/                                                /*Must be "STR Bytevar\length"*/
                             if ((Result = EnterConstant(Element.Value,False))) return(Result);   /*Enter ByteVar into EEPROM*/
                             StackIdx = 1;
                             if ((Result = GetValueEnterExpression(True,False))) return(Result);   /*Get length value and enter 1 followed by the value into EEPROM*/
                             }
                           if ((Result = EnterEEPROM(1,0))) return(Result);                       /*Enter 0 into EEPROM*/
                           State = osNext;
                           break;
      case osRepeat      : /*REP*/                                                                /*REP value\count*/
                           StackIdx = 0;
                           if ((Result = GetValueEnterExpression(False,False))) return(Result);   /*Get value and enter into EEPROM*/
                           if ((Result = EnterConstant(0x0400,True))) return(Result);             /*Enter 1 followed by $0400 into EEPROM*/
                           if ((Result = GetBackslash())) return(Result);
                           StackIdx = 2;
                           if ((Result = GetValueEnterExpression(True,False))) return(Result);    /*Get count value and enter 1 followed by the value into EEPROM*/
                           if ((Result = EnterEEPROM(1,0))) return(Result);                       /*Enter 0 into EEPROM*/
                           State = osNext;
                           break;
      case osNumber      : /*Number*/
                           if (CheckQuestion())                                                   /*Check '?'*/
                             { /*Found '?'*/
                             ExpFlag = True;
                             if ((Result = EnterText(ASCFlag))) return(Result);
                             } /*Found '?'*/
                           if (ExpFlag)
                             { /*Hex or Bin*/
                             if ((Element.Value & 0x000F) != 0x0006) Element.Value = Element.Value | 0x0800;
                             }
                           if ((Result = EnterConstant(Element.Value,False))) return(Result);     /*Enter formatter into EEPROM*/
                           StackIdx = 1;
                           if ((Result = GetValueEnterExpression(True,False))) return(Result);    /*Get value and enter 1 followed by the value into EEPROM*/
                           if ((Result = EnterEEPROM(1,0))) return(Result);                       /*Enter 0 into EEPROM*/
                           State = osNext;
                           break;
      case osQuestion    : /*?*/
                           ExpFlag = True;
                           if ((Result = EnterText(ASCFlag))) return(Result);
                           if ((Result = EnterConstant(0x01B6,False))) return(Result);            /*Enter $01B6 into EEPROM*/
                           StackIdx = 1;
                           if ((Result = GetValueEnterExpression(True,False))) return(Result);    /*Get value and enter 1 followed by the value into EEPROM*/
                           if ((Result = EnterEEPROM(1,0))) return(Result);                       /*Enter 0 into EEPROM*/
                           State = osNext;
                           break;
      case osNext        : /*Wrap Up*/
                           if (ASCFlag)
                             { /*ASCII Mode*/
                             if ((Result = EnterConstant((word)'"',True))) return(Result);        /*Enter 1 followed by '"' into EEPROM*/
                             if ((Result = EnterEEPROM(1,0))) return(Result);                     /*Enter 0 into EEPROM*/
                             } /*ASCII Mode*/
                           if (ExpFlag)
                             { /*Exp Mode*/
                             if ((Result = EnterConstant(13,True))) return(Result);               /*Enter 1 followed by 13 into EEPROM*/
                             if ((Result = EnterEEPROM(1,0))) return(Result);                     /*Enter 0 into EEPROM*/
                             } /*Exp Mode*/
                           PreviewElement(&Preview);                                              /*Check for ','*/
                           if (Preview.ElementType == etComma)
                             { /*Found comma*/
                             ElementListIdx++;                                                    /*Skip ','*/
                             if ((Result = EnterEEPROM(1,1))) return(Result);                     /*Enter 1 into EEPROM*/
                             State = osCheck;                                                     /*Loop to check again*/
                             } /*Found comma*/
                           else
                             State = osDone;                                                      /*Otherwise, we're done*/
                           break;
      case osDone        : break;                                                                 /*Done*/
      } /*Case*/
    } /*While not done*/
  if ((Result = EnterEEPROM(1,0))) return(Result);                                                /*Enter 0 into EEPROM*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode GetAddressEnter(void)
/*Get address and enter into EEPROM.  If undefined, store it in the PatchList*/
{
  TErrorCode    Result;
  TElementList  Element;

  GetElement(&Element);
  if (Element.ElementType == etAddress)
    {
    if ((Result = EnterAddress(Element.Value))) return(Result);
    }
  else
    {
    if (Element.ElementType != etUndef) return(Error(ecEAL)); /*Not Undefined? Error: Expected a label*/
    /*Undefined, store in PatchList to resolve later*/
    PatchList[PatchListIdx] = ElementListIdx-1;
    PatchList[PatchListIdx+1] = EEPROMIdx;
    PatchListIdx += 2;
    EEPROMIdx += 14;
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode EnterAddress(word Address)
/*Insert Address into EEPROM (14-bit address)*/
{
  TErrorCode  Result;

  if ((Result = EnterEEPROM(3,Address))) return(Result);
  if ((Result = EnterEEPROM(11,Address / /*div*/ 8))) return(Result);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode EnterConstant(word Constant, bool Enter1Before)
/*Enter Constant into EEPROM preceded by 1 if Enter1Before is true.*/
{
  TErrorCode      Result;
  TElementList    Element;

  StackIdx = 0;
  Expression[0][0] = 0;
  Element.Value = Constant;
  if ((Result = EnterExpressionConstant(Element))) return(Result);
  if ((Result = EnterExpression(0, Enter1Before))) return(Result);
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CountGosubs(void)
/*Count GOSUB instructions.  This routine only counts the occurances of GOSUB, it does not validate
 the instruction in any way other than to limit the maximum number of GOSUBS to 255*/
{
  TElementList   Element;
 
  ElementListIdx = 0;
  GosubCount = 0;
  while (GetElement(&Element))
    { /*While more lines to process...*/
    if (Element.ElementType == etInstruction)
      { /*Found instruction*/
      if (Element.Value == itGosub) GosubCount++;
      if (GosubCount > 255) return(Error(ecLOTFFGE)); /*If > 255 GOSUBs, Error: Limit of 255 GOSUBs exceeded*/
      }
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

int Lowest(int Value1, int Value2)
/*This function returns the lowest of the two values*/
{
  if (Value1 < Value2) return(Value1); else return(Value2);
}

/*------------------------------------------------------------------------------*/

TErrorCode NestingError(void)
/*Display the appropriate error message when the end of a code-block is found before the end of a deeper nested block*/
{
  switch (NestingStack[NestingStackIdx-1].NestType)
    {
    case ntIFSingleElse  :
    case ntIFSingleMain  :
    case ntIFMultiElse   :
    case ntIFMultiMain   : return(Error(ecEALVIOE)); /*Error, expected a label, variable, instruction or 'ENDIF'*/
    case ntFOR           : return(Error(ecEALVION)); /*Error, expected a label, variable, instruction or 'NEXT'*/
    case ntDO            : return(Error(ecEALVIOL)); /*Error, expected a label, variable, instruction or 'LOOP'*/
    case ntSELECT        : return(Error(ecEALVIOES));/*Error, expected a label, variable, instruction or 'ENDSELECT'*/
    default              : break;                    /*No other cases allowed*/
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode CCNestingError(void)  
/*Display the appropriate error message when the end of a conditional-compile code-block is found before the end
  of a deeper nested block*/
{
  switch (NestingStack[NestingStackIdx-1].NestType)
    {
    case ntIFMultiElse   :
    case ntIFMultiMain   : return(Error(ecEADRTSOCCE)); /*Error, expected a declaration, run-time statement or '#ENDIF'*/
    case ntSELECT        : return(Error(ecEADRTSOCCES));/*Error, expected a declaration, run-time statement or '#ENDSELECT'*/
    default              : break;                       /*No other cases allowed*/
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode Error(TErrorCode ErrorID)
/*Set tzModuleRec to error string and raise exception.  This routine copies the error string to the upper tzModuleRec->PacketBuffer,
 then points the tzModuleRec->Error pointer there.*/
{
  strcpy((char *)&(tzModuleRec->PacketBuffer[sizeof(TPacketType)-1-strlen(Errors[ErrorID])]),Errors[ErrorID]);
  tzModuleRec->Error = (char *)&(tzModuleRec->PacketBuffer[sizeof(TPacketType)-1-strlen(Errors[ErrorID])]);
  return(ErrorID);
}

/*------------------------------------------------------------------------------*/

bool InBaseRange(char C, TBase Base)
{ /*Determine if character (C) is in the base-range of base.  Returns True if in base-range, False otherwise.
    Automatically takes care of lower case characters.
    Assumes the ASCII character set.*/
  C = toupper(C);
  switch (Base)
    {
    case bBinary     : return ((C >= '0') && (C <= '1'));
                       break;
    case bDecimal    : return ((C >= '0') && (C <= '9'));
                       break;
    default /*hex*/  : return (((C >= '0') && (C <= '9')) || ((C >= 'A') && (C <= 'F')));
                       break;
    }
}

/*------------------------------------------------------------------------------*/
/*------------------------------- Object Engine --------------------------------*/
/*------------------------------------------------------------------------------*/

TErrorCode EnterEEPROM(byte Bits, word Data)
/*Enter EEPROM program data (reversed addressing)*/
/*Bits = # of bits to enter (1 to 16), Data = data to enter.  Note that EEPROMIdx is updated
when this procedure exits.  This procedure will properly span data across the 8-bit boundaries
of the EEPROM buffer.*/
{
  byte  ShiftFactor;
  int   Temp;

  if (EEPROMIdx + Bits > EEPROMSize*8) return(Error(ecEF)); /*Error: EEPROM Full*/
  Data = Data << (16-Bits); /*MSB-justify data*/
   while (Bits > 0)
    { /*While more bits to insert*/
    ShiftFactor = EEPROMIdx & 7;
    Temp = tzModuleRec->EEPROMFlags[2047-(EEPROMIdx / /*div*/ 8)] & 3;
    if ( (Temp == 1) || (Temp == 2) )
      { /*Error: Data Occupies Same Location As Program*/
      tzModuleRec->ErrorStart = EEPROMPointers[EEPROMIdx * 4];     /*Retrieve Source Start and Length from DATA's EEPROM Pointers*/
      tzModuleRec->ErrorLength = EEPROMPointers[EEPROMIdx * 4 + 1];
      return(Error(ecDOSLAP));
      }
    /*All is well, enter the program data and set the flags*/
    tzModuleRec->EEPROM[2047-(EEPROMIdx / /*div*/ 8)] = tzModuleRec->EEPROM[2047-(EEPROMIdx / /*div*/ 8)] | (Data >> (8+ShiftFactor));
    tzModuleRec->EEPROMFlags[2047-(EEPROMIdx / /*div*/ 8)] = tzModuleRec->EEPROMFlags[2047-(EEPROMIdx / /*div*/ 8)] | 3;
    Data = Data << (8-ShiftFactor);          /*Adjust Data in anticipation for next EEPROM byte*/
    EEPROMIdx += Lowest(Bits,8-ShiftFactor); /*Adjust EEPROM Index according to how many bits actually written*/
    Bits -= Lowest(8-ShiftFactor,Bits);      /*Decrement Bits counter appropriately*/
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

void EnterSrcTokRef(void)
/*Enter new Source Code vs. Bit Token Cross Reference item.*/
{
  TElementList  Element;

  if (tzSrcTokReference != NULL)
    {
    if (SrcTokReferenceIdx > SrcTokRefSize-1) return; /*Abort list entry if list is full (No error generated)*/
    ElementListIdx--;
    GetElement(&Element);
    (tzSrcTokReference+SrcTokReferenceIdx)->SrcStart = Element.Start;
    (tzSrcTokReference+SrcTokReferenceIdx)->TokStart = EEPROMIdx;
    SrcTokReferenceIdx++;
    }
}

/*------------------------------------------------------------------------------*/

TErrorCode PatchAddress(word SourceAddress)
/*Patch SourceAddress in EEPROM with current EEPROM address (EEPROMIdx).  EEPROMIdx is preserved.  Used to fill in address
 fields of GOTO, GOSUB, etc that referenced forward addresses (addresses not known at the time item was compiled)*/
{
  word        TempIdx;
  TErrorCode  Result;

  TempIdx = EEPROMIdx;    /*Save current EEPROMIdx*/
  EEPROMIdx = SourceAddress;
  if ((Result = EnterAddress(TempIdx))) return(Result);
  EEPROMIdx = TempIdx;    /*Restore current EEPROMIdx*/
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode PatchSkipLabels(bool Exits)
/*For the current nested code block, patch the SkipLabel (if Exits = False) or all the EXIT SkipLabels (if Exits = True)*/
{
  int         Idx;
  TErrorCode  Result;

  if (Exits)
    {  /*Patch all EXIT SkipLabels in this current code block*/
    Idx = 0;
    while ( (Idx < MaxExits) && (NestingStack[NestingStackIdx-1].Exits[Idx] != 0) )
      {
      if ((Result = PatchAddress(NestingStack[NestingStackIdx-1].Exits[Idx]))) return(Result);
      Idx++;
      }
    }
  else
    {
    if (NestingStack[NestingStackIdx-1].SkipLabel > 0)
      {  /*If there's a skip label to patch */
      if ((Result = PatchAddress(NestingStack[NestingStackIdx-1].SkipLabel))) return(Result);
      NestingStack[NestingStackIdx-1].SkipLabel = 0;
      }
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

TErrorCode PatchRemainingAddresses(void)
{
  int           Idx;
  TElementList  Element;
  TErrorCode    Result;

  Idx = 0;
  while (Idx < PatchListIdx-1)
    { /*For all patch list items to process...*/
    ElementListIdx = PatchList[Idx];
    EEPROMIdx = PatchList[Idx+1];
    Idx += 2;
    GetElement(&Element);
    if (Element.ElementType == etUndef) return(Error(ecUL)); /*If still undefined, Error: Undefined Label*/
    if ((Result = EnterAddress(Element.Value))) return(Result);
    }
  return(ecS); /*Return success*/
}

/*------------------------------------------------------------------------------*/

void PreparePackets(void)
/*Prepare download packets*/
{
  byte    Flags;
  int     Idx;
  int     BuffSize;
  byte    Checksum;

  EEPROMIdx = 0;
  tzModuleRec->PacketCount = 0;
  BuffSize = 0;
  do
    {
    Flags = 0;
    for (Idx = 0; Idx <= 15; Idx++) Flags = Flags | tzModuleRec->EEPROMFlags[EEPROMIdx+Idx];          /*Look through 16-byte block for used areas*/
    if ((Flags & 0x02) == 0x02)
      { /*Data present*/
      Checksum = (EEPROMIdx / 16) + 0x80;                                                             /*Prime the Checksum*/
      tzModuleRec->PacketBuffer[BuffSize] = Checksum;                                                 /*Store block number at start of packet*/
      BuffSize++;
      for (Idx = 0; Idx <= 15; Idx++)
        {
        tzModuleRec->EEPROMFlags[EEPROMIdx+Idx] = tzModuleRec->EEPROMFlags[EEPROMIdx+Idx] | 0x80;     /*Set Download bit in flags*/
        Checksum += tzModuleRec->EEPROM[EEPROMIdx+Idx];                                               /*Update checksum*/
        tzModuleRec->PacketBuffer[BuffSize] = tzModuleRec->EEPROM[EEPROMIdx+Idx];                     /*Enter EEPROM value into packet*/
        BuffSize++;
        }
      tzModuleRec->PacketBuffer[BuffSize] = (Checksum ^ 0xFF) + 1;                                    /*Enter Checksum into packet*/
      BuffSize++;
      tzModuleRec->PacketCount++;
      } /*Data present*/
    EEPROMIdx += 16;                                                                                  /*Move to next 16-byte block*/
    }
  while (EEPROMIdx != EEPROMSize);                                                                    /*Repeat until all 2K is explored*/
}
