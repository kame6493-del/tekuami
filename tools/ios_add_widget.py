"""ios/App/App.xcodeproj にウィジェット拡張(TekuamiWidget)を足す。python tools/ios_add_widget.py
- npx cap sync と tools/patch_ios.py の後に流す。もう入っていれば何もしない(何度流しても同じ)
- 足す物:
  App ターゲット: TekuamiWidgetPlugin.swift / MainViewController.swift / Shared/TekuamiShared.swift、拡張の埋め込み
  TekuamiWidget ターゲット(app-extension, iOS 17): TekuamiWidget.swift / Shared/TekuamiShared.swift / Assets.xcassets
- ID は固定の24桁(7A5D で始まる)。ツギメモの scripts/ios_add_widget.py(Actions でコンパイルが通った物)を写して直した
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PBX = os.path.join(ROOT, "ios", "App", "App.xcodeproj", "project.pbxproj")

APP_TARGET = "504EC3031FED79650016851F"
APP_GROUP = "504EC3061FED79650016851F"
MAIN_GROUP = "504EC2FB1FED79650016851F"
PRODUCTS = "504EC3051FED79650016851F"
APP_SOURCES = "504EC3001FED79650016851F"
PROJECT = "504EC2FC1FED79650016851F"


def i(n):
    return f"7A5D0000000000000000{n:04X}"


F_PLUGIN, F_MAINVC, F_SHARED = i(1), i(2), i(4)
F_WIDGET, F_WINFO, F_WENT, F_ASSETS = i(6), i(8), i(9), i(11)
F_APPEX = i(10)
G_SHARED, G_WIDGET = i(20), i(21)
B_PLUGIN, B_MAINVC, B_SHARED_APP = i(30), i(31), i(32)
B_WIDGET, B_SHARED_W, B_ASSETS = i(34), i(36), i(39)
B_APPEX = i(38)
T_WIDGET = i(40)
P_W_SOURCES, P_W_FRAMEWORKS, P_W_RESOURCES = i(41), i(42), i(43)
P_EMBED = i(44)
CL_WIDGET, C_W_DEBUG, C_W_RELEASE = i(45), i(46), i(47)
PROXY, DEP = i(48), i(49)


def insert_section_items(s, section, text):
    end = f"/* End {section} section */"
    if end in s:
        return s.replace(end, text + end, 1)
    begin_anchor = "/* Begin PBXFrameworksBuildPhase section */"
    block = f"/* Begin {section} section */\n{text}/* End {section} section */\n\n"
    return s.replace(begin_anchor, block + begin_anchor, 1)


def add_to_list(s, owner_id, key, item):
    m = re.search(re.escape(owner_id) + r" (/\*.*?\*/ )?= \{", s)
    if not m:
        raise SystemExit(f"見つからない: {owner_id}")
    k = s.index(f"{key} = (", m.end())
    close = s.index(");", k)
    return s[:close] + f"\t{item},\n\t\t\t" + s[close:]


def widget_settings(debug):
    return f"""				APPLICATION_EXTENSION_API_ONLY = YES;
				ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = "";
				CODE_SIGN_ENTITLEMENTS = TekuamiWidget/TekuamiWidget.entitlements;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;
				INFOPLIST_FILE = TekuamiWidget/Info.plist;
				IPHONEOS_DEPLOYMENT_TARGET = 17.0;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
					"@executable_path/../../Frameworks",
				);
				MARKETING_VERSION = 1.2.0;
				PRODUCT_BUNDLE_IDENTIFIER = jp.tekuami.app.widget;
				PRODUCT_NAME = "$(TARGET_NAME)";
				SKIP_INSTALL = YES;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = "{'DEBUG ' if debug else ''}WIDGET_EXTENSION";
				SWIFT_EMIT_LOC_STRINGS = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = 1;
"""


def main():
    s = open(PBX, encoding="utf-8").read()
    if T_WIDGET in s:
        print("もう入っています")
        return

    s = insert_section_items(s, "PBXBuildFile", "".join([
        f"\t\t{B_PLUGIN} /* TekuamiWidgetPlugin.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {F_PLUGIN} /* TekuamiWidgetPlugin.swift */; }};\n",
        f"\t\t{B_MAINVC} /* MainViewController.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {F_MAINVC} /* MainViewController.swift */; }};\n",
        f"\t\t{B_SHARED_APP} /* TekuamiShared.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {F_SHARED} /* TekuamiShared.swift */; }};\n",
        f"\t\t{B_WIDGET} /* TekuamiWidget.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {F_WIDGET} /* TekuamiWidget.swift */; }};\n",
        f"\t\t{B_SHARED_W} /* TekuamiShared.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {F_SHARED} /* TekuamiShared.swift */; }};\n",
        f"\t\t{B_ASSETS} /* Assets.xcassets in Resources */ = {{isa = PBXBuildFile; fileRef = {F_ASSETS} /* Assets.xcassets */; }};\n",
        f"\t\t{B_APPEX} /* TekuamiWidget.appex in Embed Foundation Extensions */ = {{isa = PBXBuildFile; fileRef = {F_APPEX} /* TekuamiWidget.appex */; settings = {{ATTRIBUTES = (RemoveHeadersOnCopy, ); }}; }};\n",
    ]))

    s = insert_section_items(s, "PBXFileReference", "".join([
        f"\t\t{F_PLUGIN} /* TekuamiWidgetPlugin.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = TekuamiWidgetPlugin.swift; sourceTree = \"<group>\"; }};\n",
        f"\t\t{F_MAINVC} /* MainViewController.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = MainViewController.swift; sourceTree = \"<group>\"; }};\n",
        f"\t\t{F_SHARED} /* TekuamiShared.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = TekuamiShared.swift; sourceTree = \"<group>\"; }};\n",
        f"\t\t{F_WIDGET} /* TekuamiWidget.swift */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = TekuamiWidget.swift; sourceTree = \"<group>\"; }};\n",
        f"\t\t{F_WINFO} /* Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = \"<group>\"; }};\n",
        f"\t\t{F_WENT} /* TekuamiWidget.entitlements */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = TekuamiWidget.entitlements; sourceTree = \"<group>\"; }};\n",
        f"\t\t{F_ASSETS} /* Assets.xcassets */ = {{isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = \"<group>\"; }};\n",
        f"\t\t{F_APPEX} /* TekuamiWidget.appex */ = {{isa = PBXFileReference; explicitFileType = \"wrapper.app-extension\"; includeInIndex = 0; path = TekuamiWidget.appex; sourceTree = BUILT_PRODUCTS_DIR; }};\n",
    ]))

    s = insert_section_items(s, "PBXFrameworksBuildPhase",
        f"\t\t{P_W_FRAMEWORKS} /* Frameworks */ = {{\n\t\t\tisa = PBXFrameworksBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t}};\n")

    s = insert_section_items(s, "PBXCopyFilesBuildPhase",
        f"\t\t{P_EMBED} /* Embed Foundation Extensions */ = {{\n\t\t\tisa = PBXCopyFilesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tdstPath = \"\";\n\t\t\tdstSubfolderSpec = 13;\n\t\t\tfiles = (\n\t\t\t\t{B_APPEX} /* TekuamiWidget.appex in Embed Foundation Extensions */,\n\t\t\t);\n\t\t\tname = \"Embed Foundation Extensions\";\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t}};\n")

    s = insert_section_items(s, "PBXGroup", "".join([
        f"\t\t{G_SHARED} /* Shared */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\t{F_SHARED} /* TekuamiShared.swift */,\n\t\t\t);\n\t\t\tpath = Shared;\n\t\t\tsourceTree = \"<group>\";\n\t\t}};\n",
        f"\t\t{G_WIDGET} /* TekuamiWidget */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\t{F_WIDGET} /* TekuamiWidget.swift */,\n\t\t\t\t{F_ASSETS} /* Assets.xcassets */,\n\t\t\t\t{F_WINFO} /* Info.plist */,\n\t\t\t\t{F_WENT} /* TekuamiWidget.entitlements */,\n\t\t\t);\n\t\t\tpath = TekuamiWidget;\n\t\t\tsourceTree = \"<group>\";\n\t\t}};\n",
    ]))
    s = add_to_list(s, MAIN_GROUP, "children", f"{G_SHARED} /* Shared */")
    s = add_to_list(s, MAIN_GROUP, "children", f"{G_WIDGET} /* TekuamiWidget */")
    s = add_to_list(s, PRODUCTS, "children", f"{F_APPEX} /* TekuamiWidget.appex */")
    s = add_to_list(s, APP_GROUP, "children", f"{F_PLUGIN} /* TekuamiWidgetPlugin.swift */")
    s = add_to_list(s, APP_GROUP, "children", f"{F_MAINVC} /* MainViewController.swift */")

    s = insert_section_items(s, "PBXNativeTarget",
        f"\t\t{T_WIDGET} /* TekuamiWidget */ = {{\n\t\t\tisa = PBXNativeTarget;\n\t\t\tbuildConfigurationList = {CL_WIDGET} /* Build configuration list for PBXNativeTarget \"TekuamiWidget\" */;\n\t\t\tbuildPhases = (\n\t\t\t\t{P_W_SOURCES} /* Sources */,\n\t\t\t\t{P_W_FRAMEWORKS} /* Frameworks */,\n\t\t\t\t{P_W_RESOURCES} /* Resources */,\n\t\t\t);\n\t\t\tbuildRules = (\n\t\t\t);\n\t\t\tdependencies = (\n\t\t\t);\n\t\t\tname = TekuamiWidget;\n\t\t\tproductName = TekuamiWidget;\n\t\t\tproductReference = {F_APPEX} /* TekuamiWidget.appex */;\n\t\t\tproductType = \"com.apple.product-type.app-extension\";\n\t\t}};\n")
    s = add_to_list(s, APP_TARGET, "buildPhases", f"{P_EMBED} /* Embed Foundation Extensions */")
    s = add_to_list(s, APP_TARGET, "dependencies", f"{DEP} /* PBXTargetDependency */")
    s = add_to_list(s, PROJECT, "targets", f"{T_WIDGET} /* TekuamiWidget */")
    s = s.replace(
        "\t\t\t\t\t504EC3031FED79650016851F = {\n",
        f"\t\t\t\t\t{T_WIDGET} = {{\n\t\t\t\t\t\tCreatedOnToolsVersion = 16.0;\n\t\t\t\t\t}};\n\t\t\t\t\t504EC3031FED79650016851F = {{\n", 1)

    s = insert_section_items(s, "PBXContainerItemProxy",
        f"\t\t{PROXY} /* PBXContainerItemProxy */ = {{\n\t\t\tisa = PBXContainerItemProxy;\n\t\t\tcontainerPortal = {PROJECT} /* Project object */;\n\t\t\tproxyType = 1;\n\t\t\tremoteGlobalIDString = {T_WIDGET};\n\t\t\tremoteInfo = TekuamiWidget;\n\t\t}};\n")
    s = insert_section_items(s, "PBXTargetDependency",
        f"\t\t{DEP} /* PBXTargetDependency */ = {{\n\t\t\tisa = PBXTargetDependency;\n\t\t\ttarget = {T_WIDGET} /* TekuamiWidget */;\n\t\t\ttargetProxy = {PROXY} /* PBXContainerItemProxy */;\n\t\t}};\n")

    s = insert_section_items(s, "PBXResourcesBuildPhase",
        f"\t\t{P_W_RESOURCES} /* Resources */ = {{\n\t\t\tisa = PBXResourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t\t{B_ASSETS} /* Assets.xcassets in Resources */,\n\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t}};\n")
    s = insert_section_items(s, "PBXSourcesBuildPhase",
        f"\t\t{P_W_SOURCES} /* Sources */ = {{\n\t\t\tisa = PBXSourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n"
        f"\t\t\t\t{B_WIDGET} /* TekuamiWidget.swift in Sources */,\n\t\t\t\t{B_SHARED_W} /* TekuamiShared.swift in Sources */,\n"
        f"\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t}};\n")
    for b, name in [(B_PLUGIN, "TekuamiWidgetPlugin.swift"), (B_MAINVC, "MainViewController.swift"), (B_SHARED_APP, "TekuamiShared.swift")]:
        s = add_to_list(s, APP_SOURCES, "files", f"{b} /* {name} in Sources */")

    s = insert_section_items(s, "XCBuildConfiguration",
        f"\t\t{C_W_DEBUG} /* Debug */ = {{\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = {{\n{widget_settings(True)}\t\t\t}};\n\t\t\tname = Debug;\n\t\t}};\n"
        f"\t\t{C_W_RELEASE} /* Release */ = {{\n\t\t\tisa = XCBuildConfiguration;\n\t\t\tbuildSettings = {{\n{widget_settings(False)}\t\t\t}};\n\t\t\tname = Release;\n\t\t}};\n")
    s = insert_section_items(s, "XCConfigurationList",
        f"\t\t{CL_WIDGET} /* Build configuration list for PBXNativeTarget \"TekuamiWidget\" */ = {{\n\t\t\tisa = XCConfigurationList;\n\t\t\tbuildConfigurations = (\n\t\t\t\t{C_W_DEBUG} /* Debug */,\n\t\t\t\t{C_W_RELEASE} /* Release */,\n\t\t\t);\n\t\t\tdefaultConfigurationIsVisible = 0;\n\t\t\tdefaultConfigurationName = Release;\n\t\t}};\n")

    open(PBX, "w", encoding="utf-8", newline="\n").write(s)
    print("ウィジェット拡張を足しました")


if __name__ == "__main__":
    sys.exit(main())
