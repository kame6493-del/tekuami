"""cap add android の後に1回だけ流す設定(minSdk・版・署名・権限の絞り込み)。何度流しても同じ結果になる。"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
AND = os.path.join(HERE, '..', 'android')


def edit(rel, fn):
    p = os.path.join(AND, rel)
    s = open(p, encoding='utf-8').read()
    t = fn(s)
    if t != s:
        open(p, 'w', encoding='utf-8', newline='\n').write(t)
        print('edited', rel)


edit('variables.gradle', lambda s: s.replace('minSdkVersion = 24', 'minSdkVersion = 26'))


VERSION_CODE = 3
VERSION_NAME = '1.2.0'


def gradle(s):
    s = re.sub(r'versionCode \d+', f'versionCode {VERSION_CODE}', s)
    s = re.sub(r'versionName "[^"]*"', f'versionName "{VERSION_NAME}"', s)
    if 'TK_UPLOAD_STORE' not in s:
        s = s.replace(
            """    buildTypes {
        release {
            minifyEnabled false""",
            """    signingConfigs {
        release {
            // 署名鍵はアプリ専用(%LOCALAPPDATA%/TekuamiBuild/signing)。scripts/build-android.ps1 が環境変数で渡す
            if (System.getenv("TK_UPLOAD_STORE")) {
                storeFile file(System.getenv("TK_UPLOAD_STORE"))
                storePassword System.getenv("TK_UPLOAD_PASSWORD")
                keyAlias "tekuami-upload"
                keyPassword System.getenv("TK_UPLOAD_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            if (System.getenv("TK_UPLOAD_STORE")) signingConfig signingConfigs.release
            minifyEnabled false""",
        )
    return s


edit('app/build.gradle', gradle)

# プラグインが宣言する健康データの権限のうち、使わない物を外す(Play のヘルスコネクト申告は「歩数の読み取り」だけにする)
REMOVE = [
    'WRITE_STEPS', 'READ_DISTANCE', 'WRITE_DISTANCE', 'READ_ACTIVE_CALORIES_BURNED', 'WRITE_ACTIVE_CALORIES_BURNED',
    'READ_HEART_RATE', 'WRITE_HEART_RATE', 'READ_WEIGHT', 'WRITE_WEIGHT', 'READ_SLEEP', 'WRITE_SLEEP',
    'READ_RESPIRATORY_RATE', 'WRITE_RESPIRATORY_RATE', 'READ_OXYGEN_SATURATION', 'WRITE_OXYGEN_SATURATION',
    'READ_RESTING_HEART_RATE', 'WRITE_RESTING_HEART_RATE', 'READ_HEART_RATE_VARIABILITY', 'WRITE_HEART_RATE_VARIABILITY',
    'READ_VO2_MAX', 'WRITE_VO2_MAX', 'READ_BLOOD_PRESSURE', 'WRITE_BLOOD_PRESSURE', 'READ_BLOOD_GLUCOSE', 'WRITE_BLOOD_GLUCOSE',
    'READ_BODY_TEMPERATURE', 'WRITE_BODY_TEMPERATURE', 'READ_HEIGHT', 'WRITE_HEIGHT', 'READ_FLOORS_CLIMBED', 'WRITE_FLOORS_CLIMBED',
    'READ_BODY_FAT', 'WRITE_BODY_FAT', 'READ_BASAL_BODY_TEMPERATURE', 'WRITE_BASAL_BODY_TEMPERATURE',
    'READ_BASAL_METABOLIC_RATE', 'WRITE_BASAL_METABOLIC_RATE', 'READ_TOTAL_CALORIES_BURNED', 'WRITE_TOTAL_CALORIES_BURNED',
    'READ_MINDFULNESS', 'WRITE_MINDFULNESS', 'READ_HYDRATION', 'WRITE_HYDRATION', 'READ_NUTRITION', 'WRITE_NUTRITION',
    'READ_EXERCISE', 'READ_HEALTH_DATA_HISTORY', 'READ_HEALTH_DATA_IN_BACKGROUND',
]


def manifest(s):
    if 'xmlns:tools' not in s:
        s = s.replace(
            '<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
            '<manifest xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:tools="http://schemas.android.com/tools">',
        )
    if 'READ_STEPS' not in s:
        lines = '\n'.join(f'    <uses-permission android:name="android.permission.health.{x}" tools:node="remove" />' for x in REMOVE)
        block = f"""
    <!-- ヘルスコネクトは「歩数の読み取り」だけ。プラグインが宣言するほかの健康データの権限は外す(Play の申告と合わせる) -->
    <uses-permission android:name="android.permission.health.READ_STEPS" />
{lines}

    <!-- ヘルスコネクトが使えない端末で、端末の歩数センサーを読むため(使う直前に許可をもらう) -->
    <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
    <uses-feature android:name="android.hardware.sensor.stepcounter" android:required="false" />
</manifest>"""
        s = re.sub(r'\n</manifest>\s*$', block + '\n', s)
    return s


edit('app/src/main/AndroidManifest.xml', manifest)


# 1.2.0: ホーム画面ウィジェット(中・小)。押すとアプリが開くだけ(見るだけ)
WIDGETS = """
        <receiver
            android:name=".TekuamiWidgetProvider"
            android:exported="false"
            android:label="てくあみ">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/tekuami_widget_info" />
        </receiver>
        <receiver
            android:name=".TekuamiSmallWidgetProvider"
            android:exported="false"
            android:label="てくあみ(小)">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/tekuami_widget_small_info" />
        </receiver>
    </application>"""


def widgets(s):
    if 'TekuamiWidgetProvider' in s:
        return s
    return s.replace('    </application>', WIDGETS.lstrip('\n'), 1)


edit('app/src/main/AndroidManifest.xml', widgets)


def activity(s):
    if 'TekuamiWidgetPlugin' in s:
        return s
    return s.replace('registerPlugin(StepSensorPlugin.class);', 'registerPlugin(StepSensorPlugin.class);\n        registerPlugin(TekuamiWidgetPlugin.class);')


edit('app/src/main/java/jp/tekuami/app/MainActivity.java', activity)
