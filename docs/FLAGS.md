# 国旗アセット（Issue #4）

## データの選定

- 素材：[`flag-icons`](https://github.com/lipis/flag-icons) **v7.6.0**（npmから取得するバージョンを固定）
- 配布元：[v7.6.0の4:3 SVG](https://github.com/lipis/flag-icons/tree/v7.6.0/flags/4x3)
- ライセンス：MIT License。原文を [data/licenses/FLAG-ICONS-MIT.txt](../data/licenses/FLAG-ICONS-MIT.txt) に収録
- 197件の国・地域マスタすべての `flagId` に対応するSVGを、このバージョンで確認済み（TW/台湾とXK/コソボを含む）

## アセット生成と使用

国旗SVGは開発時の `node_modules/flag-icons/flags/4x3` から生成します。国マスタにある197件のみを `public/flags/<flagId小文字>.svg` にコピーし、ライセンスも `public/flags/LICENSE.txt` として出力します。生成ディレクトリはGit管理外です。ブラウザで利用する際には `dist/flags` に静的ファイルとして同梱されるため、CDNや外部APIへの通信は不要です。

```bash
npm install
npm run sync:flags
npm test
npm run build
```

`npm run dev`・`npm test`・`npm run build` 実行前に同期スクリプトが自動で呼ばれます。国マスタと素材の不整合や欠損があれば同期処理が失敗します。テストでは197件の実ファイル、SVG構造、ライセンスの同梱を確認します。

表示コンポーネントは `src/flags/CountryFlag.tsx`。国マスタの `flagId` と表示言語を受け取り、`import.meta.env.BASE_URL` を経由して配信パスを組み立てます。クイズでは代替テキストを中立的な「問題の国旗」に差し替えて正解名の漏洩を避けます。GitHub Pagesの `/geo-quiz/` と将来の相対配信を区別できます。プレビュー画面から197件すべてを選択できます。

## 旗の表示・注意点

- **4:3比率に統一されたSVG**を採用。画像自体は切り抜かず、`object-fit: contain` で表示します。これは国旗の正式な縦横比を完全再現する方式ではありません（ネパールなど形の異なる国旗も含む）。厳密な寸法や図柄が必要になった場合は出典を再評価します。
- 国旗画像は国IDから一対一で引けますが、見た目が似ている国旗・同一に見える国旗があります。四択の誤答候補を作る際は、視認性と重複を別途検査します（Issue #9）。
- 旗の図柄は各国・地域のシンボルであり、国や地域によって利用上の慣例・規制が存在することがあります。MITライセンスの記載は、各図柄の国家シンボルとしての権利状況を保証するものではありません。
- 国旗を出題対象にするのは国マスタ197件のみ。属領・自治州・地域旗などの追加素材は出題対象外です。

## 後続作業

国旗→国名の出題・判定はIssue #7で実装済みです。国名→国旗四択は#9で実装済みです。地域絞り込みの拡充は#11、詳しい整合性・正誤テストは#17で実施します。
