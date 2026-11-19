# 開発手順・GitHub Flow

## ローカル実行

Node.js 26推奨。利用可能バージョンは `package.json` の `engines.node`（22.12以上・27未満）を参照。

```bash
git clone https://github.com/naoiw/geo-quiz.git
cd geo-quiz
npm install
npm run dev
```

本番同等の確認:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run build:pages:main
npm run preview
```

開発・テスト・ビルド時には `scripts/sync-flags.mjs` が `flag-icons` のSVGを197件抽出します。`public/flags` は生成物です。CDNを使わずGitHub Pagesで配信します。lockfileは現時点で未導入なので `npm install` を使用。導入後にCIを `npm ci` へ切替予定です。

## ブランチ・PR

`main` を常に公開可能に保つGitHub Flowを採用します。通常は `feature/<issue>-...`、不具合は `fix/...`、整理・既存仕様維持は `refactor/...`、文書のみは `chore/...` の短命ブランチを `main` から作成し、PRで変更を統合します。常設 `develop`／`release` は不要。

- PR作成後にLint・型チェック・自動テスト・本番ビルドを実行する
- 完了条件を満たし、テストがすべて成功した変更を `main` に統合
- `main` へのpushで GitHub Actions `Deploy GitHub Pages` が公開
- PRマージ後に`main`のCIとPagesワークフローの成功を確認する
- Web版の節目にタグを付ける。AndroidはWeb版の安定後に別の公開サイクルで管理

## コードの追加・変更

`src/game-engine/engine.ts` はReact、DOM、`Date.now()`、タイマーへ依存させない。問題数、正誤、履歴、スコアは純粋関数として検証します。

各題型の画面 `NameQuiz`／`NameToMapQuiz`／`NameToFlagQuiz` では `useQuizSession(locale)` を必ず経由してセッションを操作します。タイマー、回答提出・スキップ・次問・終了処理を画面内に複製しないでください。国名入力時のIME、地図の選択→確定、国旗候補の生成はそれぞれの画面で管理します。

ルール・制限時間の選択は `QuizRuleFields`、地域は `RegionSelector`、進捗/正誤/結果は `QuizStatus`、国名・国旗の四択は `CountryChoiceGrid` を再利用します。画面文言は `src/i18n/messages.ts`／`quizMessages.ts` に、受理する国名・読みは国マスタへ登録します。

新しい題型ではまずエンジン型、対応可能な回答形式と候補不足時の規則を定義し、次に独立した候補生成とUIを追加します。ゲームエンジン、コントローラー、画面の責務を跨がせないことが保守性の基本です。

## テストの担当

| テスト | 対象 |
| --- | --- |
| `tests/game-engine.test.mjs` | 6回答形式、進行ルール、スコア、時間境界、重複防止 |
| `tests/quiz-refactor.test.mjs` | 共通セッション、ルール設定、題型固有の操作を維持する構成契約 |
| `tests/quiz-ui.test.mjs` | モード導線、共通結果UI、フォーカス、地図のキーボード操作 |
| `tests/regions.test.mjs` | 全7選択地域×6回答形式、越境国、候補不足 |
| `tests/text-answer.test.mjs` | 197件の日英名称・別名・読みと厳密一致・IME |
| `tests/i18n.test.mjs` | 言語の初期値/保存、辞書、国名判定と言語連動 |
| `tests/map-to-name-quiz.test.mjs`、`flag-to-name-quiz.test.mjs` | 入力/四択と出題アセット |
| `tests/name-to-map-quiz.test.mjs`、`name-to-flag-quiz.test.mjs` | 地図選択/国旗選択の候補、進行、採点 |
| `tests/country-master.test.mjs`、`flag-assets.test.mjs`、`world-map.test.mjs` | データの対応・SVGアセット/地図 |

既存テストには実装の配線関係を静的に検証するものがあります。共通化で責務を移動した場合は旧コードの文字列を再導入せず、**新しい所有箇所と画面側の呼び出し**をそれぞれ検査するよう更新してください。

## 未実施の確認

GitHub Actionsの静的/ロジック検証は行えますが、Android/iOS/PCのブラウザごとのIME・タップ・縦横表示・スクリーンリーダー実機テストは別途必要です（品質Issue #17等）。2D/3D切替は3D地球儀（#19）実装後に確認します。
