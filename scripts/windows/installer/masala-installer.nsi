; Masala Inventory NSIS installer script (client/server variants)
; Build examples:
;   makensis /DAPP_KIND=server scripts/windows/installer/masala-installer.nsi
;   makensis /DAPP_KIND=client scripts/windows/installer/masala-installer.nsi

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "nsDialogs.nsh"
!define BIN_DIR "${__FILEDIR__}\..\..\..\build\bin"
!define DIST_DIR "${__FILEDIR__}\..\..\..\dist"

!ifndef APP_KIND
!define APP_KIND "server"
!endif

!if "${APP_KIND}" == "server"
  !define APP_NAME "Masala Inventory Server"
  !define APP_EXE "masala_inventory_server.exe"
  !define STARTUP_LINK "MasalaServer.lnk"
  !define FIREWALL_RULE_NAME "Masala Inventory Server"
!else
  !define APP_NAME "Masala Inventory Client"
  !define APP_EXE "masala_inventory_client.exe"
  !define STARTUP_LINK "MasalaClient.lnk"
!endif

Name "${APP_NAME}"
OutFile "${DIST_DIR}\\${APP_NAME} Setup.exe"
InstallDir "$PROGRAMFILES\\Masala Inventory\\${APP_KIND}"
RequestExecutionLevel admin

Var StartOnBootCheckbox
Var StartOnBootState

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
Page custom StartupPageCreate StartupPageLeave
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Function StartupPageCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 20u "Startup behavior"
  Pop $1
  ${NSD_CreateCheckbox} 0 24u 100% 14u "Start automatically when Windows starts"
  Pop $StartOnBootCheckbox
  ${NSD_Check} $StartOnBootCheckbox
  nsDialogs::Show
FunctionEnd

Function StartupPageLeave
  ${NSD_GetState} $StartOnBootCheckbox $StartOnBootState
FunctionEnd

Section "Install"
  SetOutPath "$INSTDIR"
  File "/oname=${APP_EXE}" "${BIN_DIR}\${APP_EXE}"

  !if "${APP_KIND}" == "server"
    ; Required hardening command from story AC/task.
    nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Masala Inventory Server" dir=in action=allow program="$INSTDIR\masala_inventory_server.exe" enable=yes'
    ; Explicit protocol rules to satisfy TCP/UDP traffic allowance.
    nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Masala Inventory Server TCP 8090" dir=in action=allow protocol=TCP localport=8090 program="$INSTDIR\masala_inventory_server.exe" enable=yes'
    nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Masala Inventory Server UDP 8090" dir=in action=allow protocol=UDP localport=8090 program="$INSTDIR\masala_inventory_server.exe" enable=yes'
  !endif

  ${If} $StartOnBootState == ${BST_CHECKED}
    !if "${APP_KIND}" == "server"
      CreateShortCut "$SMPROGRAMS\Startup\MasalaServer.lnk" "$INSTDIR\masala_inventory_server.exe"
    !else
      CreateShortCut "$SMPROGRAMS\Startup\MasalaClient.lnk" "$INSTDIR\masala_inventory_client.exe"
    !endif
  ${Else}
    !if "${APP_KIND}" == "server"
      Delete "$SMPROGRAMS\Startup\MasalaServer.lnk"
    !else
      Delete "$SMPROGRAMS\Startup\MasalaClient.lnk"
    !endif
  ${EndIf}

  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

Section "Uninstall"
  Delete "$SMPROGRAMS\Startup\MasalaClient.lnk"
  Delete "$SMPROGRAMS\Startup\MasalaServer.lnk"

  !if "${APP_KIND}" == "server"
    nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Masala Inventory Server"'
    nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Masala Inventory Server TCP 8090"'
    nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Masala Inventory Server UDP 8090"'
  !endif

  Delete "$INSTDIR\${APP_EXE}"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
SectionEnd
