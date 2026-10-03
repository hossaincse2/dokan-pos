; Custom NSIS installer script for Karbar POS
; This adds a custom page to input API Base URL during installation

!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"

; Force kill any running instances and child processes before installing
!macro customInit
  nsExec::Exec `taskkill /f /im "Karbar POS.exe" /t`
!macroend

; Variables
Var Dialog
Var Label
Var ApiUrlText
Var ApiUrl

; Custom page for API URL input
Page custom ApiUrlPage ApiUrlPageLeave

; Function to create the API URL input page
Function ApiUrlPage
  !insertmacro MUI_HEADER_TEXT "API Configuration" "Please enter your API Base URL"
  
  nsDialogs::Create 1018
  Pop $Dialog
  
  ${If} $Dialog == error
    Abort
  ${EndIf}
  
  ; Add label
  ${NSD_CreateLabel} 0 0 100% 24u "Enter the API Base URL for your Karbar POS backend:"
  Pop $Label
  
  ; Add text input with default value
  ${NSD_CreateText} 0 30u 100% 12u "https://admin.karbar.shop"
  Pop $ApiUrlText
  
  ; Add help text
  ${NSD_CreateLabel} 0 50u 100% 40u "This is the server URL where your POS data will be synced.$\r$\n$\r$\nDefault: https://admin.karbar.shop.$\r$\nYou can change this later in Settings."
  Pop $Label
  
  nsDialogs::Show
FunctionEnd

; Function called when leaving the API URL page
Function ApiUrlPageLeave
  ; Get the entered URL
  ${NSD_GetText} $ApiUrlText $ApiUrl
  
  ; Validate URL (basic check)
  ${If} $ApiUrl == ""
    StrCpy $ApiUrl "https://admin.karbar.shop"
  ${EndIf}
  
  ; Save to a temporary file that will be read by the app
  FileOpen $0 "$INSTDIR\api-config.json" w
  FileWrite $0 '{"apiBaseUrl":"$ApiUrl"}'
  FileClose $0
FunctionEnd

; Custom finish page actions
!macro customInstall
  ; Create config file if it doesn't exist
  ${If} ${FileExists} "$INSTDIR\api-config.json"
    ; Config already created by custom page
  ${Else}
    ; Create default config
    FileOpen $0 "$INSTDIR\api-config.json" w
    FileWrite $0 '{"apiBaseUrl":"https://admin.karbar.shop"}'
    FileClose $0
  ${EndIf}
!macroend
