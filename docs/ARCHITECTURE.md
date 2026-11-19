# アーキテクチャ

## 全体像

React + TypeScript + Vite製の静的Webアプリ。4題型・6回答形式を、**国IDを共通キーとする純粋ゲームエンジン**で扱います。地図・国旗・国名・地域・画面翻訳の追加が採点ロジックを変更しない構成です。Web完成後のAndroid移植はCapacitorを候補としています。

```text
App (モード選択・言語設定・プレビュー)
  ├─ NameQuiz ────────── 地図→国名 / 国旗→国名（入力/四択）
  ├─ NameToMapQuiz ───── 国名→地図（候補選択→確定）
  └─ NameToFlagQuiz ──── 国名→国旗（四択）
         │
         ├─ useQuizSession ─── React/時刻・セッションのアダプタ
         │        └─ game-engine/engine.ts ─── 純粋な状態遷移
         ├─ QuizRuleFields / RegionSelector ── 共通ルール・地域
         ├─ QuizStatus ─────────────────────── 共通進捗・正誤・結果
         ├─ CountryChoiceGrid ─────────────── 国名/国旗四択
         ├─ WorldMap / CountryFlag ─────────── 表示アセット
         └─ i18n + country-data ────────────── 日英UI・国別名称
```

`App` は必要な題型だけをマウントします。選択した題型の設定・回答のドラフトは**各画面ローカル**、セッションの時間制限・採点・遷移は**共通フック**、出題・正誤の規則は**純粋エンジン**が責任を持ちます。

## ディレクトリの責務

| ディレクトリ／ファイル | 内容 |
| --- | --- |
| `src/app/App.tsx` / `App.css` | モード選択、ハッシュ連動、プレビュー、トップ画面 |
| `src/features/quiz/NameQuiz.tsx` | 地図/国旗→国名の統合画面。IME入力と国名四択 |
| `src/features/quiz/NameToMapQuiz.tsx` | 地図のタップ候補・確定操作 |
| `src/features/quiz/NameToFlagQuiz.tsx` | 国旗候補の作成・選択操作 |
| `src/features/quiz/useQuizSession.ts` | 時刻を注入した start/submit/skip/advance/reset、250msの更新、正誤・結果取得 |
| `src/features/quiz/QuizRuleFields.tsx` | ルール・1/2/3/5分の共通設定 |
| `src/features/quiz/QuizStatus.tsx` | 問題番号、スコア、残り時間、レビューと結果 |
| `src/features/quiz/RegionSelector.tsx` | 国マスタに基づく地域件数と候補不足の案内 |
| `src/features/quiz/CountryChoiceGrid.tsx` | 国名・国旗の四択の汎用UI |
| `src/features/quiz/name-choices.ts`, `flag-choices.ts` | 題型別の正解・誤答候補生成。出題地域は固定し、四択の誤答候補を地域内／全世界から選択可能 |
| `src/game-engine/types.ts`, `engine.ts` | Reactに依存しないセッション型と純粋関数 |
| `src/country-data` | 全197件の国ID、名称・別名・読み、所属地域、国旗/ジオメトリID |
| `src/map`, `src/flags` | 2D SVG地図（Natural Earth）とローカル国旗SVG |
| `src/i18n/messages.ts`, `quizMessages.ts`, `useLocale.ts` | 画面文言と表示言語設定・保存 |
| `scripts/sync-flags.mjs` | 必要な国旗197件をローカルアセットとして生成 |

## セッション境界

`game-engine/engine.ts` は `GameConfiguration`、国マスタ、`nowMs`、任意の乱数・配点を受け取り、変更されていない入力から新しい `GameSession` を返します。内部にReact、DOM、ブラウザ時刻取得、タイマー、描画コードはありません。

`useQuizSession(locale)` は、React状態・時刻取得・`setInterval`を所有し、以下を画面に提供します。

- 状態: `session`、`questionCountry`、`review`、`result`、`remainingMs`
- 操作: `startRound(config, durationSeconds)`、`submit(answer)`、`skip()`、`advance()`、`reset()`
- 回答は `asking` 状態のみ、次問は `review` 状態のみ許可。終了したセッションへの重複操作はしない
- 時間制限はエンジンの期限情報に従い250msごとに更新。国ごとのドラフト入力は画面が管理

これにより、新題型では**画面固有の出題表示・回答データと設定だけ**を実装すればよく、タイマーや正誤処理を重複させません。エンジンのAPIは変更していません。[詳細](GAME_ENGINE.md)。

## 地域、言語、表示の分離

- `Country.id` は共通識別子。地域の複数所属・国旗SVG・地図ポリゴンを同一IDで解決する
- 出題地域は全世界か6地域。10問未満の候補では問題数を縮め、四択で不足する場合は開始を無効化する
- 表示言語はja/en。UI文字列と国名/別名/読みを分離し、テキスト回答は現在言語の明示的な名前だけを正解とする
- 2D地図・国旗の描画や将来の3D地球儀は採点に影響しない。国ID判定を共用する
- テキスト入力・スクリーンリーダー、スマホ操作は [UI_UX.md](UI_UX.md) 参照

## テストと今後

`npm test` は純粋エンジン・各題型・197件国マスタ・国旗・地域・言語に加え、セッションコントローラーの重複防止契約（`tests/quiz-refactor.test.mjs`）を検証します。CIはLint／Typecheck／テスト／Buildを必須にします。

実装済み: #3～#13の地図、旗、題型、地域、文字回答、言語、UI統一。今後: 3D地球儀（#19）、Android（#15）、品質・実機検証。現状は2D地図のみで3D切替は未実装です。

## 小国の位置表示

`src/map/location-pin.ts` がズーム倍率と国形状の見かけ上の細さから位置ピンの要否を決めます。`SmallCountryMarker.tsx` は `world-50m.json` の代表点を指す静的マーカーを表示します。強調（黄色）と選択（青色）のみ対象で、出題国を隠す段階の地図回答には正解ピンを描画しません。地図本体の透明タップ判定領域と `onCountrySelect` の入出力は変更しません。`tests/small-country-pins.test.mjs` がズーム、越境島国、表示条件を確認します。詳細は [MAP.md](MAP.md) を参照してください。

## 2D地図の経度ループ

`src/map/world-wrap.ts` が表示位置の360°ラップと緯度方向の制限、描画する世界タイルの選択、選択国・小国のピン座標の補正を担当します。`WorldMap.tsx` は描画対象タイルのみを複製しますが、国ID・選択ハンドラは共有し、キーボードのフォーカス先は表示コピーのうち1つに制限します。世界中心を0°/180°で切り替える設定を増やさず、ユーザーが連続的に好きな位置へ移動できる設計です。テストは `tests/world-wrap.test.mjs`。地図の詳細は [MAP.md](MAP.md) を参照してください。
