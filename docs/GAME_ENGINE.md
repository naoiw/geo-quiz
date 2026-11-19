# 共通ゲームエンジン（Issue #5）

## 目的と構成

`src/game-engine/types.ts` は共通の型を、`src/game-engine/engine.ts` はReact・DOM・地図・国旗描画に依存しないロジックを定義します。ゲームエンジンは純粋関数のままとします。Reactのセッション/タイマー状態は `src/features/quiz/useQuizSession.ts`、ゲームルール/制限時間のUIは `QuizRuleFields.tsx`、四択候補生成は題型別のヘルパーが担当します。最初の題型はIssue #6で接続済み（[MAP_TO_NAME_QUIZ.md](MAP_TO_NAME_QUIZ.md)）。

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
- 10問制では対象地域が10か国以上なら10問、4〜9か国等の小地域では対象国数まで自動短縮します。終了判定は `GameSession.questionLimit` で行い、完了は `completed`、時間切れは `timeout`。期限後の正答は記録されません。
- `skipQuestion()` は共通エンジンと各題型のUIで使用でき、回答確定後のレビューを経て次問に進みます。

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
- テキストはUnicode NFKC、前後空白の除去、連続空白の統一、英字の大文字小文字の無視を行います。曖昧一致は行わず、別名は国マスタに明記されたもののみ受理します。日本語の読み・表記ゆれ・IME対応はIssue #10で実装済み（[TEXT_ANSWER.md](TEXT_ANSWER.md)）。
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

制限時間・最終得点配分、結果保存・ランキングは未決定です。これらを決定する前でもセッションや採点方針を差し替えられる実装にしています。4題型すべてを実装済み（#6～#9）。地域選択（#11）は `regionIds` の包含判定を用い、越境国は複数地域で出題可能、同一地域内では重複しません。将来の小地域は10問制の出題数を安全に短縮し、国名四択は4件未満の候補を明示的に拒否します（[REGION_PLAY.md](REGION_PLAY.md)）。地図→国名と国旗→国名は `NameQuiz.tsx`、国名→地図は `NameToMapQuiz.tsx`、国名→国旗は `NameToFlagQuiz.tsx` から共通エンジンを利用します。四択のボタン部品は `CountryChoiceGrid.tsx` で共有し、出題候補生成は国名／国旗で独立しています。画面共通化の仕上げは#13/#18、表記ゆれ改善は#10で実装済み、地域選択の拡充は#11で対応します。

## 国名テキスト入力
正答判定は getAcceptedTextAnswers() が国マスタの表示名・別名・読みを言語別に正規化した一覧で行います。normalizeTextAnswer() はNFKC、空白、限定的な記号、英字大小、ひらがな／カタカナを統一します。読み仮名は自動推測せず、国別登録のもののみ採用。UIから独立して両国名回答題型に共通適用します。詳しくは [TEXT_ANSWER.md](TEXT_ANSWER.md)。


## React画面への接続（現行リファクタリング）

`src/features/quiz/useQuizSession.ts` は純粋エンジンをReactへ接続する**唯一のセッション管理フック**です。`startRound(config, durationSeconds)`、`submit(answer)`、`skip()`、`advance()`、`reset()`を各題型へ提供し、現在の問題・レビュー・結果・残り時間も返します。時間制限があるときだけ250msごとに`tickSession()`を呼びます。時計の所有者はフックであり、エンジンは常に外部からの時刻値のみで動作します。

各題型は `QuizRuleFields` からルールと時間を選び、`RegionSelector` で対象地域を定めます。回答形式固有のドラフト（IME入力中のテキスト、地図の選択候補、国旗の四択候補）は画面だけが保持し、セッションの状態遷移は重複実装しません。新規UIは `tests/quiz-refactor.test.mjs` と `tests/quiz-ui.test.mjs` の契約も検証します。出題と採点の純粋APIは変更していません。
