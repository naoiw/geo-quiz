# Geo Quiz

地図と国旗で世界の国々を学ぶWebクイズアプリです。Web版はGitHub Flowで継続的に公開し、Web版が安定した段階でAndroidアプリへの展開を検討します。

**現在の状態:** React/TypeScriptの初期画面を実装済み。実際の国データ、地図、国旗、出題・採点機能は未実装です。

## クイズの構想

| 出題 | 回答 |
| --- | --- |
| 強調表示された国の地図 | 国名を入力、または四択 |
| 国旗 | 国名を入力、または四択 |
| 国名 | 地図で国を選択 |
| 国名 | 国旗を四択で選択 |

地域選択、10問制・タイムアタック、2D/3D地図（まず2D）、日本語・英語に対応する予定です。詳細は[Issues](https://github.com/naoiw/geo-quiz/issues)を参照してください。

## Web版の公開先

https://naoiw.github.io/geo-quiz/

mainにマージされた変更をGitHub Pagesへ自動公開します。未完成の機能は開発予定として表示するか、無効化しておきます。以前のdevelopプレビューは更新を終了します。

## 技術スタック

React 19 / TypeScript 5 / Vite 7 / CSS / ESLint / GitHub Actions / GitHub Pages。Node.js 26推奨。地図はGeoJSON/TopoJSONによる2D表示を先に実装し、将来的にThree.js等で3D表示を追加します。

## ローカル開発

    git clone https://github.com/naoiw/geo-quiz.git
    cd geo-quiz
    npm install
    npm run dev

検証は npm run lint、npm run typecheck、npm run build を実行してください。Node.jsは22.12以降を想定します。現在はpackage-lock.jsonがないため、依存を確定後に追加してCIをnpm ciへ移行する予定です。

## GitHub Flow

1. Issueを作成し、mainからfeature/issue-N-topicを分岐。
2. 変更を実装・確認し、main向けPull Requestを作成。
3. CIと差分を確認し、公開可能ならmainにマージ。
4. mainへのpushでGitHub Pagesへ自動公開。
5. デプロイ・必要な動作確認が完了したらIssueをクローズ。

developやreleaseブランチは通常使いません。大きな節目でタグを作成します。**PR専用オンラインプレビューは現状未実装です**。必要なら後から導入します。

## Android版の位置づけ

Web版の基本機能、モバイルUI、出題品質が安定してから着手します（[Issue #15](https://github.com/naoiw/geo-quiz/issues/15)）。CapacitorによるWebコード再利用を第一候補とします。ストア向けビルド、署名、審査、バージョン管理はWebの継続公開とは分けて扱います。

## ディレクトリ

- src/app: アプリの画面構成
- src/components: 共通UI
- src/features/quiz: クイズの題型定義
- src/game-engine: 出題・採点の型と純粋ロジック
- src/country-data: 共通国ID・国名・国旗・地理データ
- src/i18n: 日本語と英語
- docs: 設計・開発・データ・配信

## ドキュメント

- [一覧](docs/README.md)
- [設計](docs/ARCHITECTURE.md)
- [開発・GitHub Flow](docs/DEVELOPMENT.md)
- [デプロイ](docs/DEPLOYMENT.md)
- [データとライセンス](docs/DATA.md)

## ライセンス

このリポジトリのソースコードは既存の[Apache License 2.0](LICENSE)です。地図・国旗等の外部データの利用条件は別途確認します。
