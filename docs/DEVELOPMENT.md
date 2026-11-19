# 開発手順・GitHub Flow

## ローカル実行

Node.js 26推奨。利用可能バージョンは `package.json` の `engines.node`（22.12以上・27未満）を参照。

```bash
git clone https://github.com/naoiw/geo-quiz.git
cd geo-quiz
npm ci
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

開発・テスト・ビルド時には `scripts/sync-flags.mjs` が `flag-icons` のSVGを197件抽出します。ビルド後には `scripts/build-service-worker.mjs` が `dist` の全配信資産からバージョン付き `sw.js` を生成します（PWAは本番/プレビュー時だけ登録）。`public/flags` は生成物です。CDNを使わずGitHub Pagesで配信します。依存関係は `package-lock.json` に固定し、ローカルもCIも `npm ci` で同じ解決結果を使用します。依存の追加・更新時は `npm install` でlockfileを再生成し、`package.json` とセットでコミットします。

## ブランチ・PR

`main` を常に公開可能に保つGitHub Flowを採用します。通常は `feature/<issue>-...`、不具合は `fix/...`、整理・既存仕様維持は `refactor/...`、文書のみは `chore/...` の短命ブランチを `main` から作成し、PRで変更を統合します。常設 `develop`／`release` は不要。

- PR作成後にLint・型チェック・自動テスト・本番ビルドを実行する
- 完了条件を満たし、テストがすべて成功した変更を `main` に統合
- `main` へのpushで GitHub Actions `Deploy GitHub Pages` が公開
- PRマージ後に`main`のCIとPagesワークフローの成功を確認する
- Web版の節目にタグを付ける。AndroidはGoogle Playの審査・署名・バージョン管理を伴う別の公開サイクルで管理

## 対象プラットフォームとAndroid展開

- **PC Web**：GitHub Pages上のブラウザ版を維持し、PCの主要ブラウザで確認する。
- **Androidアプリ**：Capacitor 8を第一候補に、同じReact/TypeScript・国データ・ゲームエンジンを同梱してGoogle Playで公開する。現段階ではAndroidプロジェクトと署名済みAABは未作成。
- **スマホの一般ブラウザ**：正式な動作保証対象ではない。既存のレスポンシブ対応は削除せず、AndroidのWebView内UIで再利用する。
- Androidでは2D/3D描画、タップ・ピンチ、IME、端末戻る、状態復帰、オフライン動作を検証する。PWAのService Workerはブラウザ配信用であり、Androidにはアセットをアプリに内包する方式を優先する。
- Play Store公開の前提（アプリID、target SDK、Android App Bundle、署名、ストア情報・プライバシー申告・テスト）は [ANDROID.md](ANDROID.md) を参照。

## コードの追加・変更

`src/game-engine/engine.ts` はReact、DOM、`Date.now()`、タイマーへ依存させない。問題数、正誤、履歴、スコアは純粋関数として検証します。

各題型の画面 `NameQuiz`／`NameToMapQuiz`／`NameToFlagQuiz` では `useQuizSession(locale)` を必ず経由してセッションを操作します。タイマー、回答提出・スキップ・次問・終了処理を画面内に複製しないでください。国名入力時のIME、地図の選択→確定、国旗候補の生成はそれぞれの画面で管理します。

ルール・制限時間の選択は `QuizRuleFields`、地域は `RegionSelector`、進捗/正誤/結果は `QuizStatus`、国名・国旗の四択は `CountryChoiceGrid` を再利用します。画面文言は `src/i18n/messages.ts`／`quizMessages.ts` に、受理する国名・読みは国マスタへ登録します。

新しい題型ではまずエンジン型、対応可能な回答形式と候補不足時の規則を定義し、次に独立した候補生成とUIを追加します。ゲームエンジン、コントローラー、画面の責務を跨がせないことが保守性の基本です。

## テストの担当

| テスト | 対象 |
| --- | --- |
| `tests/game-engine.test.mjs` | 6回答形式、進行ルール、スコア、時間境界、重複防止 |
| `tests/quality-matrix.test.mjs` | 全7地域×6回答形式×日英×3ルールの完走・採点・候補整合性、197件の国旗・地図データ照合 |
| `tests/pwa.test.mjs` | Manifest、PWA登録条件、プリキャッシュ生成と更新用ハッシュの整合性 |
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

GitHub Actionsで静的/ロジック検証および全題型・全地域の回帰マトリクスは確認できますが、PCブラウザとAndroidアプリのIME・タップ・縦横表示・スクリーンリーダー実機テストは別途必要です。実機で確認すべき手順・結果の記録方法は [QA_CHECKLIST.md](QA_CHECKLIST.md) に記載しています（品質Issue #17等）。2D/3D切替は3D地球儀（#19）実装後に確認します。
