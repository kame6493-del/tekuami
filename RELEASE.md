# てくあみ 1.1.0 RELEASE(2026-10-10)— 持ち主の見本に合わせて見た目を作り直し

持ち主の見本 `Downloads\てくあみ編み歩数計UIコラージュ.png`(画面12枚+部品の状態)の仕掛けと見た目に合わせて作り直した。中身(歩数の読み取り・段の計算・持ち越し・箱・課金・プライバシー)は1.0.0のまま活かしている。見本と並べた比較は docs/compare_*.png(一覧は docs/compare_all.png)。

## 変えた画面(見本の番号)
1. スプラッシュ(初回だけ。冬の窓辺・毛糸のかご・眠る猫、下に「はじめる」)
2. ホーム(日付・「次の段まで あと○歩」・窓辺の針に掛かった編みかけ・「○段/○段」と6つに区切った進みのバー・今日/今週の札・下のタブ4つ ホーム/箱/あみもの/毛糸ぶくろ)
3. 1段完成の演出(雲の吹き出し「1段編めました!」+紙ふぶき、「つぎの段へ」「画像で見る」)
4. 編み上がり(木の床・札 模様/編んだ期間/合計歩数・「箱にしまう」「画像で保存」)
5. 箱(木の棚・絞り込み すべて/マフラー/ぼうし/ミトン/くつした/セーター/ひざかけ・編み中の枠・「?」の空き枠)
6. 画像で見る(ポラロイド風。写真の中は木の机と松ぼっくり、下に「てくあみ 歩いて編む歩数計」と日付。1080×1350)
7. 次に編むものを選ぶ(おすすめ・鍵)→ 8. 模様は秘密(毛糸ぶくろがあれば選べる)→ 9. 毛糸の色(見本の8組の名前)
10. 今日の記録(円のゲージ・今週の棒グラフ・今日に星。下に今月・日ごと)
11. 設定(歩数データの取得/1段の歩数/アプリについて/書き込みしません/音なし/広告ありません、下に猫)。CSV 読み込み・センサー切り替え・記録を消す・ポリシーは下の画面に残した
12. 毛糸ぶくろ(買い切り。値段はストアから取った物、取れない時は 480円)
部品の状態: 空の箱・歩けなかった日(眠る猫)・ヘルスケア連携の説明・失敗の画面4種・購入準備中

## 絵
- 編み物は src/art/knit.ts で canvas に描く。表編みの1目を左右2本の脚(ふっくらした米粒形)で、横の丸み・両端の影・撚りの筋・毛羽をつけて1目ずつ描き、色と揺らぎごとに取っておいて並べる。房・ぼんぼん・木の針・針に掛かった目も同じやり方。ミトンとくつしたは2つ組。?art=knit / ?art=items で拡大して確かめた
- 情景・小さな絵は、持ち主の見本から切り出した(tools/crop_ref.py → src/assets/ref/*.webp、54枚・約0.6MB)。文字の載っていた所は文字だけ消し、なめらかに拡大。ホームの窓は、マフラーの所を空と板壁で埋めた。小さな絵は地の色を透明にした
- アイコンは見本に無いので、編み目と同じ描き方で「木の針に掛かったハートの編み地」を描いた(?art=icon、tools/shot_icon.py → tools/make_icons.py)
- 1.0.0 のドット絵(render.ts・sprites.ts・Pixel.tsx)とダークモードは外した(絵本の絵と合わないため)

## 中身の変更
- 1段はどの段も同じ歩数(設定の「1段の歩数」300/500/800/1,000、ふつう500)。段の中の目は歩数に合わせて等分で増える。設定を変えても、編んでいる途中の物は始めたときの歩数のまま(Project.rowSteps)
- 毛糸の色は見本の8組(無料5・毛糸ぶくろ3)、模様は見本の6つ(無料 ハート/雪の結晶/星、毛糸ぶくろ 木の葉/いぬ/北欧風)、編む物は くつした も無料に(見本の選択画面どおり。鍵は セーター・ひざかけ)
- 編んでいる間に「次に編むもの」を選んでおける(AppData.queued)。編み上がって箱にしまうと続けて編みはじめる
- 組み立て: npm run build の最初に dist を空にする(tools/clean.mjs。1.0.0 の dist には古い書き出しが98個たまっていた)

## 確かめたこと(1.1.0)
1. vitest 55件 すべて通過(1段の歩数・段の中の目・持ち越し・予約と1段の歩数の保存・色と模様の数と名前 を足した)
2. npm run build 通過(tsc も)
3. Playwright(tools/e2e.py): 375×667 と 430×932 で スプラッシュ → 模様 → 毛糸の色 → 連携 → 12段編めた演出 → ホーム → 今日の記録 → 設定(歩数データ・1段の歩数・アプリについて・ポリシー)→ 毛糸ぶくろ(買う)→ あみもの選択 → 模様(選ぶ)→ 毛糸の色 → 次に編むものに決める → 空の箱 → 編み上がり → 画像で保存 → 箱にしまう → 箱 → 1枚 → 画像で見る → 箱(6つ+編み中)と絞り込み → 開いたら1段編める → 画像で見る(編みかけ)→ 歩けなかった日 → 失敗の画面4種 → 購入準備中。大きい文字(文字だけ1.3倍)で8画面。58画面すべて通過(横のはみ出し・英語の取り残し・押せる所 40px 以上・絵の読み込み も機械で確認)
4. 画面写真(work/shots/e2e/)を目で見て、小さい画面で主ボタンがタブの下に隠れる所・期間の折り返し・針の目の形・共有画像の地を直した。見本と並べた比較は docs/compare_*.png
5. Android: releases/tekuami-1.1.0-vc2-release.aab(9.4MB)/ 確認用 APK releases/tekuami-1.1.0-vc2-release.apk。1.0.0 と同じ鍵(証明書 SHA256 D4:35:4C:…:00:54 が同じ)、jarsigner -verify 通過、aapt2 で versionCode 2 / versionName 1.1.0・健康の権限は READ_STEPS だけを確認。端末での起動は未確認(エミュレーター無し)
6. iOS: MARKETING_VERSION 1.1.0(tools/patch_ios.py が書く)。アイコンと起動画面を差し替え。ワークフローは触っていない

## ストア素材(1.1.0)
- 画面写真 store/iphone/1〜5(1290×2796)・store/play/1〜5(1080×1920)・フィーチャー store/play/feature_1024x500.png・アイコン store/icon_1024.png / store/play/icon_512.png。値段・「無料」は入れていない
- 1.0.0 の物は store/_v1_backup/ に残した
- 掲載文 store/listing_ja.md を新しい中身に合わせた

## 組み直し(1.1.0)
npm run build → npx cap sync → python tools/patch_android.py(versionCode 2 / 1.1.0)→ python tools/patch_ios.py → powershell -File scripts/build-android.ps1(出力の名前は build.gradle の版から付く)
絵を変えたとき: python tools/crop_ref.py(見本から切り出し)/ python tools/shot_icon.py && python tools/make_icons.py(アイコン)/ python tools/make_store.py(ストア)/ python tools/make_compare.py(比較画像)/ python tools/e2e.py

---

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
