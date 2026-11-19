# GitHub Pages

## Web本番

https://naoiw.github.io/geo-quiz/

mainへのマージでGitHub Pagesへ自動公開するGitHub Flowを採用します。旧developプレビューは今後の更新対象ではありません。

## 公開手順

1. featureブランチからmainへのPRを作成する。
2. CIでlint、typecheck、buildを実行し、変更を確認する。
3. mainへマージする。
4. Deploy GitHub Pagesがmainを/geo-quiz/向けにビルド・公開する。
5. Actionsの成功とWeb本番の表示を確認する。

リポジトリのSettings → Pages → Build and deployment → SourceはGitHub Actionsを使用。github-pages Environmentでmainのデプロイを許可します。

## ビルド

    npm run build:pages

Viteのbase pathは/geo-quiz/です。faviconは%BASE_URL%、アプリのホームリンクはimport.meta.env.BASE_URLを使っています。dist/をPagesにアップロードします。

## PRプレビュー

PR専用のオンラインプレビューは現時点では未実装です。CIとローカルの npm run dev で検証してください。必要になれば別Issueで仕組みを整備します。恒久的なdevelopブランチは使用しません。

## Androidと独自ドメイン

独自ドメイン移行時はbase pathとPages設定を修正します（Issue #16）。Android版はWeb品質が安定してから検討し、ストアのバージョン・署名・審査はWeb公開とは別に管理します（Issue #15）。
