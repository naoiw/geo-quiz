# 共通ゲームエンジン（Issue #5）

## 目的と構成

`src/game-engine/types.ts` は共通の型を、`src/game-engine/engine.ts` はReact・DOM・地図・国旗描画に依存しないロジックを定義します。ゲームエンジンは純粋関数のままとし、画面遷移・四択候補生成・タイマー制御はUI層が担当します。最初の題型はIssue #6で接続済み（[MAP_TO_NAME_QUIZ.md](MAP_TO_NAME_QUIZ.md)）。

**題型と回答形式（6バリエーション）**

| 題型 | 入力方式 |
| --- | --- |
| map-to-name（地図→国名） | text / multiple-choice |
| flag-to-name（国旗→国名） | text / multiple-choice |
| name-to-map（国名→地図） | map |
| name-to-flag（国名→国旗） | flag |

`GameConfiguration` は `quizKind`（題型）、`answerFormat`（入力形式）、`sessionRule`（進行ルール）、`regionId`（地域またはnull）を独立に保持します。使えない組み合わせは開始時に例外を送出します。国マスタは外部から渡すため、マスタや表示言語の追加にゲームロジックの修正は不要です。

## 進行ルール

| `sessionRule` | 出題数 | 時間制限 |
| --- | --- | --- |
| `ten-untimed` | 10問 | なし |
| `ten-timed` | 10問 | 必須の `durationMs` |
| `time-attack` | 時間切れまで繰り返す | 必須の `durationMs` |

- 時間制限の具体的な秒数は未決定です。画面側から正の整数ミリ秒を渡します。時間無制限に渡してはいけません。
- 時間の取得・タイマー管理は画面側。エンジンは渡された `nowMs` のみ参照し、`Date.now()` や `setTimeout()` を呼びません。
- 1ラウンド内の同一国は出題しません。タイムアタックは候補をすべて使い切ると再シャッフルし、可能な限り直前の国が連続しないようにします。
- 回答後は必ず `review` 状態を挟みます。この間にUIで正誤を示し、`advanceSession()` で次問へ進みます。
- 10問制では10問目のレビュー終了で `completed`、時間切れで `timeout`。正答処理は期限以降に追加されません。
- `skipQuestion()` は共通エンジンに用意していますが、プレイヤーにスキップ操作を提供するかは未決定です。

## 状態遷移

```text
startSession (asking)
  ├─ submitAnswer / skipQuestion → review
  │    └─ advanceSession → asking（次問） / finished（10問完了）
  └─ tickSession → finished（時間切れ）
review
  └─ tickSession → finished（時間切れ）
finished → getResult（スコアと履歴の取得）
```

進行状態は `GameSession` として保持し、各関数は入力オブジェクトを書き換えず新しいセッションを返します。回答履歴には国ID、解答方法、正誤、獲得点、回答時刻を記録します。回答の再送は `review` で拒否します。

## 判定と得点

- `judgeAnswer()` で表示言語 `ja` / `en` に応じた国名と別名を照合します。国IDの選択形式は国IDの完全一致です。
- テキストはUnicode NFKC、前後空白の除去、連続空白の統一、英字の大文字小文字の無視を行います。曖昧一致は行わず、別名は国マスタに明記されたもののみ受理します。日本語の読み・表記ゆれ・IME対応の拡充はIssue #10。
- `ScoringPolicy` で `correct`、`incorrect`、`skipped` の整数ポイントを設定可能です。**正答100点、誤答0点、スキップ0点は暫定のデフォルト値**であり、最終仕様ではありません。誤答減点も負数で設定できます。
- `getResult()` は終了理由・正答数・誤答数・スキップ数・正答率（スキップを除く回答数を分母）・スコア・経過時間・履歴を返します。ランキングへの保存や画面の描画は行いません。

## 呼び出し例

```ts
import { countries } from "../country-data";
import { startSession, submitAnswer, advanceSession, getResult } from "../game-engine/engine";

const config = {
  quizKind: "name-to-map",
  answerFormat: "map",
  sessionRule: "ten-untimed",
  regionId: "asia",
} as const;

let session = startSession(config, countries, { nowMs: Date.now() });
// UIは session.currentQuestion.countryId に対応する国名を表示する。
session = submitAnswer(session, { format: "map", countryId: "JP" }, "ja", Date.now());
// session.lastReview による正誤表示を終えてから進める。
session = advanceSession(session, Date.now());
if (session.status === "finished") {
  const result = getResult(session);
  // result.score, result.correct, result.history などを結果画面に渡す。
}
```

`random` に乱数関数を注入すると出題順を再現できます。 `tests/game-engine.test.mjs` は国マスタ197件を使い、Nodeの標準テストランナーと既存のTypeScriptを使って6バリエーション、3進行ルール、時間境界、再出題、地域、言語、採点、無効入力を検証します。

## 未決定・後続

制限時間、最終得点配分、スキップのUX、結果保存・ランキングは未決定です。これらを決定する前でもセッションや採点方針を差し替えられる実装にしています。地図→国名（#6）と国旗→国名（#7）の出題・回答・結果画面は共通の `NameQuiz.tsx` で実装済みです。残りの題型は#8/#9、画面共通化は#13/#18、表記ゆれ改善は#10、地域選択の拡充は#11で対応します。
