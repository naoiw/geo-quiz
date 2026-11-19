# 開発とGitHub Flow

2026-11-19に個人 + AIによる短い開発サイクルに合わせてGitflowからGitHub Flowへの移行を決定。Webアプリは完了した機能を随時mainへ統合して公開します。

## 開発環境

Node.js 26推奨。ローカルは22.12以降を想定。

    git clone https://github.com/naoiw/geo-quiz.git
    cd geo-quiz
    npm install
    npm run dev
    npm run lint
    npm run typecheck
    npm run build

## ブランチ運用

| ブランチ | 分岐元 | PR先 | 役割 |
| --- | --- | --- | --- |
| main | — | — | 常に公開可能なWeb版 |
| feature/issue-N-topic | main | main | Issueごとの機能追加 |
| fix/issue-N-topic | main | main | 不具合修正 |

developおよびreleaseブランチは常設しません。旧developプレビューは更新を終了します。Web版の意味のある節目にはタグを付けます。

## Issueから公開まで

1. Issueに目的、完了条件を記載。
2. mainから短命のfeatureブランチを作成する。
3. 実装・静的検証・必要なテストを実施。
4. main向けPRを作成し、CI成功と差分を確認。
5. 未完成の新機能は非表示または無効化し、mainが公開可能なことを確認。
6. PRをmainへマージし、Pagesデプロイを確認。
7. 必要な本番動作確認が済んだらIssueをクローズする。

IssueのクローズはAndroidの公開とは連動しません。PRごとのWeb公開前プレビューURLは現時点で未用意です。CI、ローカル動作確認を利用します。

## 品質管理

.github/workflows/ci.ymlはmainへのPRとmainへのpushでlint、型チェック、ビルドを実行します。出題・判定のテストはIssue #17で拡充します。

- game-engineはReact、DOMへ依存させない。
- 国名、国旗、地図は共通の国IDで参照する。
- 日本語・英語のUI文言はi18nで管理する。
- 4つの題型と入力/四択、ゲーム進行ルールを分離する。
- 実装途中の画面をプレイ可能として見せない。

初期構成にはpackage-lock.jsonがありません。依存を固定した後にnpm ciへ変更します。

## Androidへの展開

基本クイズの完成、スマホ操作性、出題品質、パフォーマンスなどを確認してからAndroid着手を判断します（Issue #15）。CapacitorでWeb UI・ロジックをできる限り共有する想定です。ストア公開にはWebとは別に実機検証、署名、審査、バージョン管理を行います。
