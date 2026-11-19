# GitHub Pages（GitHub Flow）

- **本番URL:** https://naoiw.github.io/geo-quiz/
- **公開ブランチ:** `main`
- **起動:** `main`へのpush（通常はPRマージ）／手動実行

GitHub PagesはSettings → PagesでBuild and deploymentをGitHub Actionsに設定し、`github-pages` Environmentから`main`のデプロイを許可してください。

## 公開手順

1. `feature/*`から`main`へPRを作成。
2. CIと仕様の動作確認後、`main`へマージ。
3. `.github/workflows/deploy-pages.yml`が`main`のみをチェックアウトし、lintと型チェック込みのビルドを実施。
4. 出力を`/geo-quiz/`向けにGitHub Pagesへ公開。
5. 本番URLで確認する。不具合は`fix/*`で対応する。

旧`/geo-quiz/develop/`プレビューは運用終了です。PR単位のオンラインプレビューが必要になったら、別のプレビュー用ホスティング等を検討してください。**この仕組みではPR自体は自動でプレビュー公開されません。**

## ビルドとパス

~~~bash
npm run build:pages:main
~~~

Viteの`--base=/geo-quiz/`を使用。HTMLの`%BASE_URL%`とアプリ内の`import.meta.env.BASE_URL`を利用しています。独自ドメイン移行時は公開パスに合わせて更新してください。

## Androidとの違い

Webは`main`マージごとに更新します。Android版は移植後、ストア配信用のタグ、バージョン、署名、審査を別途管理し、Webの全更新に同期させません。
