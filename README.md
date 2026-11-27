# Geo Quiz

地図・国旗を使って世界の国や地域を学ぶWebクイズ。197か国・地域、4題型・6回答形式、日本語／英語、全世界＋6地域に対応します。

**本番:** https://naoiw.github.io/geo-quiz/　|　[Issues](https://github.com/naoiw/geo-quiz/issues)

## クイズの種類

| 出題 | 回答方式 |
| --- | --- |
| 地図で強調された国 | 国名をテキスト入力／四択 |
| 国旗 | 国名をテキスト入力／四択 |
| 国名 | 地図から選択して確定 |
| 国名 | 4つの国旗から選択 |

トップ画面で題型を選び、**地域・ゲームルールを設定 → 問題 → 正誤確認 → 結果**の順に進みます。プレイ中は大きな紹介ヘッダーやプレビューを隠して問題を優先表示します。10問無制限／10問時間制限あり／タイムアタックを選択できます（スコアと制限時間は暫定）。1回のプレイ中には1題型のみ表示します。途中でモード選択へ戻ると進行状況は破棄されます。

地域は世界全体、アジア、ヨーロッパ、アフリカ、北アメリカ、南アメリカ、オセアニア。ロシアなど複数地域に属する国にも対応し、地域内の国数が少ないときは出題数を調整します。地図→国名・国旗→国名は日本語のひらがな／カタカナ・正式名・別名・読みを受理しますが、曖昧一致や誤字の自動補正は行いません。国名四択・国名→国旗の両方で、誤答候補の抽選範囲を出題地域内／全世界から切り替えられます（出題国の地域は変わりません）。

ヘッダーの「設定 / Settings」で表示言語を切り替えられます。ブラウザの優先言語から初期値を選び、変更はブラウザに保存します。表示名・テキスト正答判定は選択言語に連動します。地図・国旗の単体プレビューは画面下部の折りたたみから利用できます。地図を使うクイズでは **2D地図／3D地球儀をプレイ中に切替可能**で、切替えても問題・点数・時間は維持されます。初期表示は2Dです。2D地図は**左右に何周でもスクロールできる経度方向のループ**に対応しており、太平洋を中心に表示しても切れません。3Dは描画方式の追加段階であり、実機での選択精度と性能検証は継続します。PWAとしてホーム画面への追加に対応し、初回オンライン読み込み後はアプリ本体・国旗・地図を端末にキャッシュする構成です（オフライン実機確認は別途必要）。

## 開発・検証

**技術:** React 19、TypeScript 5、Vite 7、SVG／Three.js（Natural Earth 1:50m）、flag-icons。Node.js 26推奨（必要バージョン: 22.12以上、27未満）。GitHub Pagesを `main` から自動公開します。

```bash
git clone https://github.com/naoiw/geo-quiz.git
cd geo-quiz
npm ci
npm run dev
```

変更後の検証:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` の後処理で `dist/sw.js` を生成します。配信パス `/geo-quiz/` やキャッシュ更新の詳細は [PWA・オフライン仕様](docs/PWA.md) を参照してください。

`npm run dev` / `npm test` / `npm run build` の前処理で `scripts/sync-flags.mjs` が必要な国旗SVGをローカルに配置します。アプリ利用時の国旗CDN依存はありません。`package-lock.json` で依存バージョンを固定し、CI・ローカルとも `npm ci` で再現可能なインストールを行います。依存関係を更新する場合は `npm install` でlockfileを更新してください。

## アーキテクチャ

ゲームエンジンとReactの画面状態を分離しています。4題型の画面は共通コントローラーで出題開始・回答・スキップ・時間計測・次問遷移を処理します。国名テキスト、地図選択、国旗選択、四択候補生成は題型別に扱います。

| 場所 | 責務 |
| --- | --- |
| `src/app` | トップ画面、題型選択、設定、プレビュー |
| `src/features/quiz/useQuizSession.ts` | Reactと純粋ゲームエンジンを接続するセッション・タイマーフック |
| `src/features/quiz/QuizRuleFields.tsx` | 3つのゲームルールと共通の制限時間設定 |
| `src/features/quiz/QuizStatus.tsx` | 進捗、正誤フィードバック、結果表示、フォーカス移動 |
| `src/features/quiz/NameQuiz.tsx` | 地図→国名／国旗→国名の共通画面（入力・四択） |
| `src/features/quiz/NameToMapQuiz.tsx` | 国名→地図。選択・回答確定は独立操作 |
| `src/features/quiz/NameToFlagQuiz.tsx` | 国名→国旗。4択候補と画像表示 |
| `src/features/quiz/RegionSelector.tsx`、`CountryChoiceGrid.tsx` | 地域・四択の共通UI |
| `src/game-engine` | React・DOM非依存の出題・判定・採点・時間制限・結果集計 |
| `src/country-data`、`src/map`、`src/flags` | 197件の国マスタ、経度ループ対応2D世界地図・小国用位置ピン、国旗SVG |
| `src/i18n` | UIの日英翻訳、国名表示言語の設定・保存 |
| `tests` | エンジン・データ・出題形式・画面接続・共通化の回帰テスト |

主要な国データ・国旗・地図の照合に加え、全7地域×6回答形式×3ゲームルール×日英の回帰テストをCIで実施します。ブラウザでの手動確認項目は [品質検証チェックリスト](docs/QA_CHECKLIST.md) にまとめています。

詳細は [設計](docs/ARCHITECTURE.md)、[共通エンジン](docs/GAME_ENGINE.md)、[UI/UX](docs/UI_UX.md) を参照してください。

## GitHub運用・公開

`main` が本番。機能・修正・リファクタリングを短命ブランチで行い、PR → Lint／型チェック／全テスト／ビルド → `main` にマージ → GitHub Pagesで公開します。常設の `develop`／`release` ブランチは使いません。公開URLは https://naoiw.github.io/geo-quiz/ です。

## ドキュメント

- [ドキュメント一覧](docs/README.md)
- [開発手順とGitHub Flow](docs/DEVELOPMENT.md)
- [ゲームエンジンの仕様](docs/GAME_ENGINE.md)
- [地域別プレイ](docs/REGION_PLAY.md)
- [国名入力と表記ゆれ](docs/TEXT_ANSWER.md)
- [日英ローカライズ](docs/LOCALIZATION.md)
- [スマホ・PC UIとアクセシビリティ](docs/UI_UX.md)
- [品質検証チェックリスト](docs/QA_CHECKLIST.md)
- [PWA・オフライン動作](docs/PWA.md)
- [2D世界地図と小国の表示](docs/MAP.md)
- [データ・アセットとライセンス](docs/DATA.md)

## 今後

3D地球儀（Issue #19）は初期版を実装済みで、2D/3D切替も可能です。3Dの実機検証・小国選択精度の最終確認や、ブラウザでの動作確認は継続します。

## ライセンス

```text
Copyright 2026 Naoki

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

アプリのコードは [Apache License 2.0](LICENSE)。国データにはODbL 1.0／Unicode License V3のデータを含み、地図はNatural Earth、国旗はflag-icons（MIT）を使用しています。配布条件と表示クレジットは[データ仕様](docs/DATA.md)・[国旗仕様](docs/FLAGS.md)を参照してください。
