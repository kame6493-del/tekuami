# てくあみの Android 公開用ビルド(署名済み AAB と確認用 APK)。powershell -File scripts/build-android.ps1
# 先に npm run build と npx cap sync android(と python tools/patch_android.py)を済ませておく。
# - JDK と SDK は DIAMOND NINE 用に入っている物を読むだけで使う
# - 署名鍵はてくあみ専用。%LOCALAPPDATA%\TekuamiBuild\signing に置き、パスワードは DPAPI(このWindowsユーザーだけが復号できる)で保存
# - 鍵を上書き・作り直ししない。無くしたら Play Console で「アップロード鍵のリセット」を申請することになる
# - プロジェクトのパスに日本語があると Gradle が止まるので、一時ドライブ(subst)で英字のパスに見せる。使ったドライブは最後に外す
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$tools = Join-Path $env:LOCALAPPDATA 'Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\DiamondNineBuild'
if (!(Test-Path "$tools\java")) { $tools = Join-Path $env:LOCALAPPDATA 'DiamondNineBuild' }
$env:JAVA_HOME = (Get-ChildItem "$tools\java" -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME = "$tools\android-sdk"
if (!(Test-Path "$env:JAVA_HOME\bin\java.exe")) { throw 'JDK が見つかりません' }

$secretDir = Join-Path $env:LOCALAPPDATA 'TekuamiBuild\signing'
New-Item -ItemType Directory -Force $secretDir | Out-Null
$store = Join-Path $secretDir 'tekuami-upload.jks'
$passFile = Join-Path $secretDir 'upload-password.dpapi'
if (!(Test-Path $store)) {
  if (Test-Path $passFile) { throw 'パスワードだけ残っていて鍵がありません。鍵を復元してください(作り直さない)' }
  $bytes = New-Object byte[] 36
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $password = [Convert]::ToBase64String($bytes)
  $password | ConvertTo-SecureString -AsPlainText -Force | ConvertFrom-SecureString | Set-Content $passFile
  $env:TK_UPLOAD_PASSWORD = $password
  # keytool は経過をエラー出力に書く(PowerShell 5.1 はそれを失敗として扱う)。別プロセスで起こし、終了コードと鍵ファイルで判定する
  $kt = Start-Process -FilePath "$env:JAVA_HOME\bin\keytool.exe" -ArgumentList '-genkeypair', '-keystore', "`"$store`"", '-storetype', 'JKS', '-alias', 'tekuami-upload', '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000', '-storepass:env', 'TK_UPLOAD_PASSWORD', '-keypass:env', 'TK_UPLOAD_PASSWORD', '-dname', '"CN=Tekuami, O=Tekuami, C=JP"', '-noprompt' -NoNewWindow -Wait -PassThru -RedirectStandardError "$env:TEMP\tk_keytool_err.txt" -RedirectStandardOutput "$env:TEMP\tk_keytool_out.txt"
  $code = $kt.ExitCode
  if ($code -ne 0 -or !(Test-Path $store)) { Remove-Item $passFile -ErrorAction SilentlyContinue; throw '署名鍵を作れませんでした' }
  Write-Output "署名鍵を作りました: $store (PC を替える前に、このフォルダごと安全な場所へ控えてください)"
} else {
  $secure = Get-Content $passFile | ConvertTo-SecureString
  $env:TK_UPLOAD_PASSWORD = [System.Net.NetworkCredential]::new('', $secure).Password
}
$env:TK_UPLOAD_STORE = $store

# 空いているドライブ文字を探す(ほかの作業が使っている文字は避ける)
$drive = $null
foreach ($d in 'T','U','V','W','X','Y') { if (!(Test-Path "${d}:\")) { $drive = "${d}:"; break } }
if (!$drive) { throw '空いているドライブ文字がありません' }
subst $drive (Split-Path $repo -Parent)
try {
  $proj = "$drive\$(Split-Path $repo -Leaf)\android"
  "sdk.dir=$($env:ANDROID_HOME -replace '\\','/')" | Out-File -Encoding ascii "$proj\local.properties"
  $p = Start-Process -FilePath "$proj\gradlew.bat" -ArgumentList ':app:assembleRelease', ':app:bundleRelease', '--no-daemon', '-q' -WorkingDirectory $proj -NoNewWindow -Wait -PassThru -RedirectStandardError "$env:TEMP\tk_release_err.txt"
  if ($p.ExitCode -ne 0) { Get-Content "$env:TEMP\tk_release_err.txt" -Tail 40; throw "Gradle が失敗しました (exit $($p.ExitCode))" }
  $out = Join-Path $repo 'releases'
  New-Item -ItemType Directory -Force $out | Out-Null
  # 版は app/build.gradle から読む(tools/patch_android.py が書く)
  $gradleText = Get-Content "$repo\android\app\build.gradle" -Raw
  $vc = [regex]::Match($gradleText, 'versionCode (\d+)').Groups[1].Value
  $vn = [regex]::Match($gradleText, 'versionName "([^"]+)"').Groups[1].Value
  Copy-Item "$proj\app\build\outputs\bundle\release\app-release.aab" "$out\tekuami-$vn-vc$vc-release.aab" -Force
  Copy-Item "$proj\app\build\outputs\apk\release\app-release.apk" "$out\tekuami-$vn-vc$vc-release.apk" -Force
  Write-Output "出力: $out"
} finally {
  subst $drive /D
  Remove-Item Env:TK_UPLOAD_PASSWORD, Env:TK_UPLOAD_STORE -ErrorAction SilentlyContinue
}
