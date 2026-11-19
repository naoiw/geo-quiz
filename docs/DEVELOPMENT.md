# 開発とGitHub Flow

geo-quizのWeb版は、1人＋AIで小さく開発し、動作可能な機能を頻繁に公開する方針です。`main`を常に公開可能に保ちます。旧`develop`・`release/*`中心のGitflowから移行します。

## ローカル開発

Node.js 26推奨（最低22.12を想定）。

~~~bash
git clone https://github.com/naoiw/geo-quiz.git
cd geo-quiz
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm test
~~~

## ブランチとIssue

| ブランチ | 分岐元 | PR先 | 用途 |
| --- | --- | --- | --- |
| `main` | — | — | Web本番 |
| `feature/<issue>-<topic>` | main | main | 機能 |
| `fix/<issue>-<topic>` | main | main | 修正 |
| `chore/<issue>-<topic>` | main | main | 設定・文書 |

- Issueを作成し、短命ブランチで実装、PRで`main`へ統合、完了したIssueをClose。
- PRではCI成功とIssueの完了条件を確認する。AIの実装も例外ではない。
- 公開してよい状態でない機能はFeature Flagで無効にするか、明確に「開発予定」と表示する。
- PRマージ後にPagesへ自動公開。公開後の不具合は`fix/*`で修正。
- リリースタグ（例`v0.1.0`）は節目に作成。Webの毎回のデプロイにリリースブランチは不要。
- Android版はWebの安定後、ストア公開を別のバージョン／配信手順で管理（Issue #15）。

## CIと品質確認

`.github/workflows/ci.yml`は`main`向けPRと`main`へのpushでlint・typecheck・buildを実行します。Pages公開ワークフローもlintとビルドに成功した成果物だけを公開します。

確認項目：Issueの完了条件、PC・スマホ表示、日本語/英語、既存機能への影響、未完成機能の公開防止。国マスタの197件の整合性テストはnpm testで実行します。国旗・地図アセットとの照合に加え、共通ゲームエンジンの6種類の題型/回答形式、時間制限、得点、重複防止、地域絞り込みを`tests/game-engine.test.mjs`で検証します。地図→国名クイズでは `tests/map-to-name-quiz.test.mjs` により197国の四択候補（日本語／英語）、6地域での重複防止、小国の表示設定を検証します。国名→国旗は `tests/name-to-flag-quiz.test.mjs` で197件の画像ハッシュ重複、全地域の四択候補、切替可能な誤答候補戦略、共通セッション・採点・制限時間を検証します。ブラウザE2Eと詳細な回答表記ゆれはIssue #17/#10で拡充します。

初期構成はlockfile未生成です。依存固定後に`package-lock.json`を追加し、`npm ci`へ切り替えてください。

旧`develop`ブランチは移行期間の履歴として残る場合がありますが、以後の開発の分岐元にはしません。

国名→地図（#8）の確認では `tests/name-to-map-quiz.test.mjs` で全197か国のポリゴン存在、地域・日英・採点・時間切れと選択確定UXの基本契約を検査します。タッチ操作の実機検証は後続の品質Issueでも継続します。
