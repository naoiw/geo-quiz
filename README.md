# Geo Quiz

地図と国旗で世界の国々を学ぶWebクイズアプリです。React + TypeScriptでWebを先行開発し、将来のAndroid版はCapacitorによるコード共通化を目指します。

**現在の状態:** 197件の国・地域マスタ、2D世界地図、国旗SVG・プレビュー、共通ゲームエンジンを実装済み。**4題型すべてがプレイ可能**です。地図・国旗からの国名回答は入力式／四択式、国名→地図は地図選択、国名→国旗は四択の国旗選択に対応しています。

## クイズの構想

| 出題 | 回答 |
| --- | --- |
| 地図で強調された国 | 国名を入力、または四択 |
| 国旗 | 国名を入力、または四択 |
| 国名 | 地図で国を選択 |
| 国名 | 国旗を四択で選択 |

4題型は、地域選択（全世界／6地域）、10問無制限・時間制限あり・タイムアタック、日英切替、答え合わせと結果表示に対応します。国名→地図はタップで候補を選んだあと確定する方式です。国名→国旗は、同じ出題地域／全世界から誤答国旗を抽出する方式を切り替えられます。制限時間・配点は暫定値です。3D地図は今後追加します。詳細は [Issues](https://github.com/naoiw/geo-quiz/issues) を参照してください。

## Web版の公開先

- **本番:** https://naoiw.github.io/geo-quiz/
- 公開ブランチ: `main`。PRをマージするとGitHub Actionsで自動公開します。
- 旧`develop`プレビュー（`/geo-quiz/develop/`）は終了。PRごとのオンラインプレビューは今後必要に応じて検討します。
- 4題型すべてがトップ画面からプレイできます。今後は入力・四択UIの品質向上や3D地球儀を進めます。

## 技術スタック

React 19 / TypeScript 5 / Vite 7 / CSS / ESLint / Node.js 26推奨 / GitHub Actions・Pages。2D地図はNatural Earth 1:50mのSVG描画、国旗はflag-icons v7.6.0のSVGを採用し、将来の3DはThree.jsを候補とします。

## 開発方法

~~~bash
git clone https://github.com/naoiw/geo-quiz.git
cd geo-quiz
npm install
npm run dev
~~~

検証:

~~~bash
npm run lint
npm run typecheck
npm run build
npm test
npm run preview
~~~

Node.js 22.12以上が必要です。国旗SVG197件はnpm installで導入したflag-iconsから`npm run dev`/`npm test`/`npm run build` 時に自動生成され、`public/flags`から配信されます。CDNへの常時接続は不要です。初期段階はlockfile未作成のためnpm installを使用します。依存バージョン確定後はlockfileを追加し、npm ciに切り替える方針です。

## GitHub Flow運用（Web版）

1. Issueごとに`main`から`feature/<issue>-<topic>`ブランチ（不具合は`fix/*`）を作成。
2. AIが実装し、`main`にPRを作成してCI・レビュー・必要な動作確認を実施。
3. 問題なければ`main`へマージし、Issueをクローズ。GitHub Pagesへ即時自動公開。
4. 未完成機能はFeature Flagなどで無効にして`main`を常に公開可能に保つ。
5. 重要な節目でバージョンタグを付ける。Webでは`release/*`や常設`develop`は不要。

## Android版（将来）

Web版が主要4題型・スマホUI・日英対応・データ整合性・テスト・性能面で十分安定した段階で移植を検討します（[Issue #15](https://github.com/naoiw/geo-quiz/issues/15)）。CapacitorでUI/ゲーム/データを共通化する方針ですが、Androidのストア申請・バージョン管理・公開サイクルはWebから独立させます。

## ディレクトリ

- src/app: アプリの画面構成
- src/components: 共通UI
- src/features/quiz: クイズの題型定義
- src/game-engine: 6題型/回答形式・3つの進行ルールを共通で処理する純粋ロジック
- src/country-data: 197件の国マスタ、共通ID・日英名・論理アセットID
- src/map: Natural Earthの2D世界地図、国ID対応、選択/ズーム/パン
- src/flags: 国旗SVGを国IDから表示
- src/features/quiz/NameQuiz.tsx: 地図・国旗→国名の共通画面（入力／四択・タイマー・結果）
- src/features/quiz/MapToNameQuiz.tsx / FlagToNameQuiz.tsx: 国名回答題型の軽量エントリ
- src/features/quiz/NameToMapQuiz.tsx: 2D地図から国を選択して回答するクイズ
- src/features/quiz/NameToFlagQuiz.tsx: 4枚の国旗から正解を選ぶクイズ
- src/features/quiz/CountryChoiceGrid.tsx: 国名／国旗の四択ボタン共通部品
- src/features/quiz/flag-choices.ts: 国旗四択の候補生成と誤答抽出範囲・アルゴリズム切替
- src/features/quiz/name-choices.ts: 地図・国旗クイズに再利用できる国名四択候補生成
- scripts/sync-flags.mjs: ビルド時に197件の国旗をローカル生成
- src/i18n: 日本語と英語
- docs: 設計・開発・データ・配信の説明

## ドキュメント

- [一覧](docs/README.md)
- [設計](docs/ARCHITECTURE.md)
- [開発・GitHub Flow](docs/DEVELOPMENT.md)
- [デプロイ](docs/DEPLOYMENT.md)
- [データとライセンス](docs/DATA.md)
- [2D地図の設計・操作](docs/MAP.md)
- [国旗アセット・利用条件](docs/FLAGS.md)
- [ゲームエンジンの仕様とテスト](docs/GAME_ENGINE.md)
- [地図 → 国名クイズ](docs/MAP_TO_NAME_QUIZ.md)
- [国旗 → 国名クイズ](docs/FLAG_TO_NAME_QUIZ.md)
- [国名 → 地図クイズ](docs/NAME_TO_MAP_QUIZ.md)
- [国名 → 国旗クイズ](docs/NAME_TO_FLAG_QUIZ.md)

## ライセンス

このリポジトリのコードは既存の [Apache License 2.0](LICENSE) で公開されています。国マスタにはODbL 1.0とUnicode License V3のデータを含みます。詳しくは[データ仕様](docs/DATA.md)を参照してください。地図の境界はパブリックドメインのNatural Earthを使用しています。国旗素材はflag-icons（MIT License）から取得し、配布時もライセンスを同梱しています。詳細は[国旗アセット](docs/FLAGS.md)を参照してください。
