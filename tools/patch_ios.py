"""cap add ios の後に流す設定(何度流しても同じ結果)。
- 表示名・日本語・縦向きだけ・iPhone だけ
- ヘルスケアの読み取りの説明文(日本語)と HealthKit の entitlements
- 版 1.0.0
"""
import os
import plistlib

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, '..', 'ios', 'App')

plist_path = os.path.join(APP, 'App', 'Info.plist')
with open(plist_path, 'rb') as f:
    pl = plistlib.load(f)
pl['CFBundleDisplayName'] = 'てくあみ'
pl['CFBundleDevelopmentRegion'] = 'ja'
pl['NSHealthShareUsageDescription'] = 'ヘルスケアの歩数を読んで、歩いた分だけ編み物を進めます。歩数のほかの記録は読まず、外へ送ることもしません。'
# てくあみは書きこまない。HealthKit を使うアプリはこの説明文が無いと審査で止まることがあるので、書きこまないことをそのまま書く
pl['NSHealthUpdateUsageDescription'] = 'てくあみはヘルスケアに書きこみません。歩数を読むだけです。'
pl['UIRequiredDeviceCapabilities'] = ['arm64', 'healthkit']
pl['UISupportedInterfaceOrientations'] = ['UIInterfaceOrientationPortrait']
pl.pop('UISupportedInterfaceOrientations~ipad', None)
pl['ITSAppUsesNonExemptEncryption'] = False
with open(plist_path, 'wb') as f:
    plistlib.dump(pl, f)

ent = {'com.apple.developer.healthkit': True, 'com.apple.developer.healthkit.access': []}
with open(os.path.join(APP, 'App', 'App.entitlements'), 'wb') as f:
    plistlib.dump(ent, f)

pbx_path = os.path.join(APP, 'App.xcodeproj', 'project.pbxproj')
s = open(pbx_path, encoding='utf-8').read()
s = s.replace('TARGETED_DEVICE_FAMILY = "1,2";', 'TARGETED_DEVICE_FAMILY = 1;')
s = s.replace('MARKETING_VERSION = 1.0;', 'MARKETING_VERSION = 1.0.0;')
if 'CODE_SIGN_ENTITLEMENTS' not in s:
    s = s.replace('INFOPLIST_FILE = App/Info.plist;', 'CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n\t\t\t\tINFOPLIST_FILE = App/Info.plist;')
open(pbx_path, 'w', encoding='utf-8', newline='\n').write(s)

export = {
    'method': 'app-store-connect',
    'destination': 'upload',
    'signingStyle': 'automatic',
    'teamID': 'SET_BY_CI',
    'uploadSymbols': True,
    'manageAppVersionAndBuildNumber': False,
}
with open(os.path.join(HERE, '..', 'ios', 'ExportOptions.plist'), 'wb') as f:
    plistlib.dump(export, f)
print('ios ok', s.count('CODE_SIGN_ENTITLEMENTS'))
