# てくあみ 1.0.0 RELEASE(2026-10-09)

歩いた分だけ、マフラーがひと目ずつ編み上がっていく歩数計。お金のポイントは無し・広告なし・端末の中だけ。
企画の根拠は docs/01_勝ち組の分析.md と docs/02_企画.md、使いやすさの点検は docs/03_使いやすさ点検.md。

## 何を作ったか
- 土台: Capacitor 8 + React 19 + Vite + TypeScript + vitest
- 画面: 説明2画面 → 編む(今日の歩数・次の段まで・編み物の台)/記録(7日の棒・今月・日ごと)/箱(編み上がった物)/設定/毛糸ぶくろ/次に編む物/プライバシーポリシー
- 絵: すべて手で1マスずつ置いたドット絵(src/art)。編み目1つが 8×6 ドット。編む物6種・模様12種・毛糸の色12組。?art=1 / ?art=stage で見本を拡大して確かめた
- デザインの決まり: src/design/tokens.css(生成りの地+茜1色、文字5段、余白8刻み、角丸2種、ダークモード)
- 歩数: iOS は HealthKit、Android はヘルスコネクト(@capgo/capacitor-health 8.11.8、日ごとの合計を読むだけ)。ヘルスコネクトが無い・歩数が入らない Android は自前の小さなプラグイン StepSensor(android/app/src/main/java/jp/tekuami/app/StepSensorPlugin.java、Java)で端末の歩数センサーを読む
- 権限を断られた・ヘルスコネクトが無い/古い・歩数が0・読めない・この端末では読めない、のそれぞれに一文と次の一手の画面
- ほかのアプリから書き出した歩数(日付と歩数の列がある CSV)の読み込み(記録にだけ並ぶ)
- 課金: RevenueCat。買い切り1つ「毛糸ぶくろ」¥480(商品ID tekuami_yarnbag / entitlement yarnbag)。キーは src/platform/billing.ts の BILLING.keys(空)。空のときは「購入は準備中です」で押せない

## 確かめたこと
1. vitest 48件 すべて通過(編み目の計算・持ち越し・段が戻らない・模様の順番・センサーの日割り・CSV・保存の読み直し・絵の決まり)
2. npm run build 通過(tsc も)
3. Playwright(tools/e2e.py)で dist を開き、初回 → 色を選ぶ → 歩数をつなぐ → 編む → 記録 → 箱(空)→ 設定 → 毛糸ぶくろ → 買う → ポリシー → 編み上がり → 箱にしまう → 次の1枚(セーター・ねこ)→ 箱の1枚 → 箱(7つ)、と失敗の画面4種・購入準備中を、375×667 と 430×932、ライトとダークで通過(75画面)。大きい文字(約1.3倍)も通過。横のはみ出し・英語の取り残し・押せる所の大きさも機械で確認
4. 画面写真(work/shots/e2e/ 79枚)を目で見て、色名の折り返し・箱の絵のはみ出し・小さい画面で操作が隠れる・ボタンの文字の折り返し・台が小さすぎる、を直して撮り直した
5. Android: 署名済み AAB と APK を作成。jarsigner -verify 通過。aapt2 で権限を確認(健康の権限は health.READ_STEPS だけ)。versionCode 1 / versionName 1.0.0 / minSdk 26 / targetSdk 36
   エミュレーターがこの PC に無いので、端末での起動は未確認
6. iOS: npx cap add ios、Info.plist(表示名「てくあみ」・日本語・縦だけ・iPhone だけ・ヘルスケアの説明文)、HealthKit の entitlements、.github/workflows/ios-testflight.yml(push はしていない)

## Android
- appId: jp.tekuami.app
- AAB: releases/tekuami-1.0.0-vc1-release.aab(9.3MB。Play Console のブラウザ上限 10MB 未満)/ 確認用 APK: releases/tekuami-1.0.0-vc1-release.apk
- 署名鍵: %LOCALAPPDATA%\TekuamiBuild\signing\tekuami-upload.jks(別名 tekuami-upload)。パスワードは同じフォルダの upload-password.dpapi(このWindowsユーザーだけが復号できる)。PC を替える前にフォルダごと控える。作り直さない
- 組み直し: npm run build → npx cap sync → python tools/patch_android.py → powershell -File scripts/build-android.ps1(一時ドライブ T〜Y の空いている文字を使い、最後に外す)
- Play の申告の回答案: store/play/申告の回答案.md(ヘルスコネクト・健康アプリ・データセーフティ・レーティング)

## iOS(組めるかの不確かさ)
Windows では組めない。GitHub Actions の macOS で組む前提。次が未確認で、失敗する見込みのある所:
- まだ1回も組んでいない。まず compile_only=true(既定)で流し、SPM でプラグイン(@capgo/capacitor-health・RevenueCat)が解決できてコンパイルが通るかを見る
- HealthKit: App ID jp.tekuami.app に HealthKit の Capability が要る。ワークフローはアーカイブの時点から API キーで自動署名する(ニガテ帳の「署名なしでアーカイブ → 書き出しで署名」だと entitlements が抜けるおそれがあるため変えた)。API キーの権限が足りない・自動で Capability が付かないときは、App Store Connect / Developer サイトで App ID を作って HealthKit にチェックを入れてから流す。アーカイブ後に entitlements に healthkit が入っているかを確かめる手順を入れてある
- NSHealthUpdateUsageDescription は書きこまないのに入れている(無いと審査や提出で止まった例があるため)。文は「書きこみません」とそのまま書いた
- アカウントは 4.3(a) の警告付き。ほかの2本(集中記録・ロック画面メモ)と同じ時期にまとめて出さない。見た目・部品は別の決まりで作った(生成り+茜・ドット絵の編み目・下から出る面)
- シークレット4つ(ASC_KEY_ID / ASC_ISSUER_ID / APPLE_TEAM_ID / ASC_KEY_P8_BASE64)はニガテ帳と同じ物を使える見込み
- iOS の組み立てでは tools/patch_ios.py を cap sync の後に流す(ワークフローに入れてある)

## ストア素材(store/)
- アイコン: store/icon_1024.png、store/play/icon_512.png(毛糸玉と2本の針のドット絵。小さく表示しても分かることを 96px で確認)
- 画面写真: store/iphone/1〜5(1290×2796)、store/play/1〜5(1080×1920)、フィーチャー store/play/feature_1024x500.png。値段・「無料」は入れていない
- 掲載文: store/listing_ja.md / プライバシーポリシー: store/privacy.md(アプリ内とヘルスコネクトの説明画面にも同じ中身)/ テスター募集: store/tester_post.txt

## 外部の素材
- 絵・アイコンはすべて自作(手置きのドット絵)。フォントは端末の物を使い、同梱していない
- 画面写真の見出しに使ったフォント: Windows に入っている Noto Sans JP(SIL Open Font License 1.1 https://openfontlicense.org/ 、画像への使用は可)

## 残り
- iOS: Actions で compile_only → 署名して TestFlight(上の不確かさ)
- プライバシーポリシーの公開ページ(ニガテ帳と同じ GitHub Pages の形。push はしていない)と、掲載文のサポート連絡先
- RevenueCat に商品 tekuami_yarnbag と entitlement yarnbag を作り、公開キーを BILLING.keys に入れる。App Store Connect / Play Console に ¥480 の非消耗型を作る
- Play: アプリ作成 → 申告(回答案どおり)→ クローズドテスト(12人×14日)
- 実機での確認(Android 14 以上でヘルスコネクトの権限の画面、センサーへの切り替え、iPhone でヘルスケアの権限)
- 次の版の候補: ホーム画面のウィジェット(勝ち組の選ばれた理由の1つ。初版では入れていない)
