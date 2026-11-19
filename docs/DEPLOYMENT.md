# GitHub Pages

| ブランチ | URL |
| --- | --- |
| main | https://naoiw.github.io/geo-quiz/ |
| develop | https://naoiw.github.io/geo-quiz/develop/ |

GitHub Pagesはリポジトリごとに一つのサイトです。Deploy GitHub Pagesワークフローがmain/developを別々のbase pathでビルドし、同じアーティファクトに統合します。

## 初期設定

1. リポジトリのSettings → Pagesを開く。
2. Build and deployment → SourceをGitHub Actionsへ変更する。
3. developへのpush後、ActionsのDeploy GitHub Pagesの成功を確認する。
4. /geo-quiz/develop/を開く。

GitHub側の権限・Pages設定が未完了なら、このファイルの追加だけではデプロイされません。

## Gitflowとの対応

feature/*の更新は公開せず、developへのマージでプレビューを更新します。mainへの公開はrelease/*からのマージ時です。mainにまだアプリがない期間は本番ルートに案内ページを出します。

## base path

Viteビルドでは以下のパスを使います。

~~~bash
npm run build:pages:main
npm run build:pages:develop
~~~

faviconはBASE_URL、アプリのホームリンクはimport.meta.env.BASE_URLを使用し、サブディレクトリでも動作するようにします。独自ドメイン移行時はこのbase pathと公開設定を見直してください。
