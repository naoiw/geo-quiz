# 開発とGitflow

Node.js 26を推奨。ローカルではNode.js 22.12以上を想定します。

~~~bash
git clone https://github.com/naoiw/geo-quiz.git
cd geo-quiz
git switch develop
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
~~~

## ブランチルール

| ブランチ | 分岐元 | PR先 | 役割 |
| --- | --- | --- | --- |
| main | — | — | 本番 |
| develop | main | — | 次期リリース統合 |
| feature/<issue>-<topic> | develop | develop | 新機能・改修 |
| release/<version> | develop | main、その後developに同期 | リリース |
| hotfix/<topic> | main | mainとdevelop | 緊急修正 |

featureからmainへの直接マージは禁止。開発はIssueを先に用意し、featureブランチからPRを作成してCI成功後にdevelopへ統合します。リリース時のみrelease→mainを行います。

## CIとレビュー

.github/workflows/ci.ymlがmain/developへのPRとpushでlint、型チェック、buildを実行します。デプロイ側もlint/buildの成功後に公開します。

機能追加時はゲームエンジンをReact/DOMへ依存させず、国マスタIDを共通化し、UI文言を翻訳辞書へ追加します。出題・回答とデータ整合性のテストはIssue #17で拡充します。

初期版にlockfileはありません。ネット接続可能な環境で依存を確定し、package-lock.jsonをコミットしてnpm ciに切り替えることを推奨します。
