# Geo Quiz

地図と国旗で世界の国々を学ぶWebクイズアプリです。React + TypeScriptでWebを先行開発し、将来のAndroid版はCapacitorによるコード共通化を目指します。

**現在の状態:** Issue #1のアプリ基盤と画面プレビュー。国データ・地図・国旗・実際の出題と採点は未実装です。

## クイズの構想

| 出題 | 回答 |
| --- | --- |
| 地図で強調された国 | 国名を入力、または四択 |
| 国旗 | 国名を入力、または四択 |
| 国名 | 地図で国を選択 |
| 国名 | 国旗を四択で選択 |

地域選択、10問制・タイムアタック、2D/3D地図（2Dから実装）、日本語・英語に対応する計画です。詳細は [Issues](https://github.com/naoiw/geo-quiz/issues) を参照してください。

## 公開先（GitHub Pages設定後）

| 環境 | ブランチ | URL |
| --- | --- | --- |
| 本番 | main | https://naoiw.github.io/geo-quiz/ |
| 開発プレビュー | develop | https://naoiw.github.io/geo-quiz/develop/ |

初回はGitHubのSettings → PagesでSourceをGitHub Actionsに設定する必要があります。mainが未リリースの間、本番URLには案内ページのみを表示します。

## 技術スタック

React 19 / TypeScript 5 / Vite 7 / CSS / ESLint / Node.js 26推奨 / GitHub Actions・Pages。将来の2D地図はGeoJSON/TopoJSON等、3DはThree.jsを候補とします。

## 開発方法

~~~bash
git clone https://github.com/naoiw/geo-quiz.git
cd geo-quiz
git switch develop
npm install
npm run dev
~~~

検証:

~~~bash
npm run lint
npm run typecheck
npm run build
npm run preview
~~~

Node.js 22.12以上が必要です。初期段階はlockfile未作成のためnpm installを使用します。依存バージョン確定後はlockfileを追加し、npm ciに切り替える方針です。

## Gitflow運用

- main: 本番リリース済みコード。
- develop: 次期リリースの統合・開発プレビュー。
- feature/*: developから分岐し、PRでdevelopへ統合。
- release/*: developから分岐し、検証後mainへ統合してdevelopへ変更を戻す。
- hotfix/*: mainから分岐し、mainとdevelopの両方へ反映。

featureからmainへの直接マージはしません。

## ディレクトリ

- src/app: アプリの画面構成
- src/components: 共通UI
- src/features/quiz: クイズの題型定義
- src/game-engine: 出題・採点の型と純粋ロジック
- src/country-data: 共通国ID・国名・国旗・地理データ
- src/i18n: 日本語と英語
- docs: 設計・開発・データ・配信の説明

## ドキュメント

- [一覧](docs/README.md)
- [設計](docs/ARCHITECTURE.md)
- [開発・Gitflow](docs/DEVELOPMENT.md)
- [デプロイ](docs/DEPLOYMENT.md)
- [データとライセンス](docs/DATA.md)

## ライセンス

このリポジトリのコードは既存の [Apache License 2.0](LICENSE) で公開されています。地図・国旗等の外部素材のライセンスは採用時に別途確認します。
