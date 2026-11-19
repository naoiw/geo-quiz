# Androidアプリ・Google Play公開計画（Issue #15）

## 対象とゴール

- **PC Web版**：`main` のGitHub Pages配信を維持し、PCブラウザを正式なサポート対象とする。
- **Androidアプリ版**：Google Playで一般公開できる状態を目標とする。Capacitor 8による既存React/TypeScriptアプリの再利用を第一候補とする。
- **スマホのWebブラウザ**：Chrome/Safari等でのWeb版の動作保証は不要。ただし、AndroidアプリはWebViewを使うため、狭い画面への対応・タッチ・ソフトキーボードの検証は必須。
- iOS版は今回の対象外。Androidを公開後、必要なら別Issueで検討する。

**現在地（2026-11-20）**：Web版の4題型・6回答形式、日本語/英語、2D/3D表示は実装済み。Androidネイティブプロジェクト、署名済みAAB、Play Console公開は未実施。Play Store公開済みとは扱わない。

## 共通化方針

```text
React / TypeScript / Vite
  ├─ game-engine, country-data, i18n ── 完全共有
  ├─ クイズUI、2D SVG地図、3D Three.js、国旗 ── 原則共有
  ├─ PCブラウザ → GitHub Pages（/geo-quiz/）
  └─ Android → Capacitor WebView + 同梱静的アセット → Android App Bundle
```

- 出題・採点・制限時間・国ID・国データをAndroid専用コードに複製しない。
- Androidではビルド成果物をアプリに同梱する。初回ネットワークアクセスを必須にしない。ブラウザPWA用Service WorkerはAndroid向けビルドで登録しない構成にする。
- Viteの公開用 `base=/geo-quiz/` と、Android内部用の相対アセットURLを分ける。国旗や3Dチャンクがネイティブ環境でも取得できることを確認する。
- 設定のlocalStorageは使い続けられるが、アプリ更新後の保存状態とAndroidのデータ削除時の挙動を確認する。
- Android専用の対応は戻るボタン、ステータスバーとセーフエリア、アプリアイコン、ライフサイクル、オフライン検証、リリース署名に限定する。Web版をスマホブラウザ向けに最適化し直すことは目的にしない。

## 開発フェーズ

1. **基盤**：Capacitor 8依存・設定とAndroidネイティブプロジェクトを追加する。公開前に重複しないアプリIDを決定する。依存のlockfileとAndroid Gradle Wrapperもリポジトリ管理する。
2. **ビルドと起動**：`npm ci` → Android用Viteビルド → `npx cap sync android` → Android Studio/GradleでデバッグAPKをビルドし、エミュレータで起動する。署名鍵・Play Console資格情報をコミットしない。
3. **ゲーム機能**：4題型・6回答形式、地域選択、3ルール、日英入力/IME、2D/3D切替、音声や権限の有無に依存しないオフライン起動を検証する。国名→地図で回答前に正解位置を表示しない。
4. **Androidらしい操作**：システム戻る、ソフトキーボード、画面回転、バックグラウンド復帰、ステータスバー・ナビゲーションバー・セーフエリア、低性能端末での3Dフォールバックを確認する。
5. **リリース準備**：アプリID・versionCode/versionName、Play App Signing/アップロード鍵、Android App Bundle（AAB）、アプリアイコン・スクリーンショット、プライバシーポリシー、Data safety・年齢層・コンテンツの申告を整備する。
6. **配布**：内部テスト → 必要なクローズドテスト → 本番申請。Play Consoleの審査やアカウント操作はGoogle Playデベロッパーアカウント所有者が実施する。WebとAndroidは独立した公開サイクルにする。

## 2026年11月時点のGoogle Play要件（提出時に再確認）

- **target API**：2026年8月31日以降の新規アプリ・更新は原則Android 16 / API 36以上。Capacitor 8はAPI 36を対象にできる。
- **16KBメモリページ**：使用するネイティブライブラリやAndroidビルドの対応を確認する。
- **配布形式と署名**：Google Playには署名したAndroid App Bundle（AAB）とPlay App Signingを使用する。
- **新しい個人デベロッパーアカウント**：2023年11月13日以降に作成した場合、原則12人以上が14日連続でオプトインするクローズドテスト等、本番アクセス条件を満たす必要がある。
- **プライバシー**：個人情報を収集しない場合も、アプリ内とストアのプライバシーポリシー、Data safetyなどの正確な申告が必要。広告・解析SDKの導入前に再点検する。

公式資料：
- [Androidのtarget API要件](https://developer.android.com/google/play/requirements/target-sdk)
- [Capacitor Android / v8](https://capacitorjs.com/docs/android)
- [16KBページサイズ](https://developer.android.com/guide/practices/page-sizes)
- [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)
- [個人デベロッパーアカウントのテスト](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Play審査時の申告](https://support.google.com/googleplay/android-developer/answer/9859455)

## リリース判定

- [ ] Androidのネイティブプロジェクトがリポジトリにあり、再現可能なデバッグビルドができる
- [ ] Androidエミュレータ/実機で4題型・6形式、2D/3D、日本語IME、オフラインを確認する
- [ ] CIでWeb回帰検証に加えてAndroidビルド・AAB作成を確認する
- [ ] 正式なアプリID、アプリ名、アイコン、バージョンの管理方針を確定する
- [ ] AABの署名、Play Console申告、必要なテストを完了する
- [ ] Google Playの本番トラックにリリースできる

チェックリストは [QA_CHECKLIST.md](QA_CHECKLIST.md) に記録し、実機未検証は成功として扱わない。Issue #15 はPlay公開工程が完了するまで継続管理する。
