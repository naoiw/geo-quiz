# ドキュメント一覧

## 設計・開発

- [ARCHITECTURE.md](ARCHITECTURE.md) — 4題型共通のレイヤ構成、Reactフックと純粋エンジンの責務分離
- [DEVELOPMENT.md](DEVELOPMENT.md) — 開発環境、GitHub Flow、品質確認、テスト構成
- [DEPLOYMENT.md](DEPLOYMENT.md) — mainからGitHub Pagesへのデプロイ
- [PWA.md](PWA.md) — ホーム画面への追加、オフラインキャッシュ、更新と動作確認
- [ANDROID.md](ANDROID.md) — PC Web／Androidアプリの対象範囲とGoogle Play公開ロードマップ
- [GAME_ENGINE.md](GAME_ENGINE.md) — 4題型/6回答形式、セッション状態、時間・採点・結果

## UI・ゲーム仕様

- [UI_UX.md](UI_UX.md) — モード選択、共通進捗・正誤・結果、スマホ/PC・アクセシビリティ
- [QA_CHECKLIST.md](QA_CHECKLIST.md) — 自動回帰テストの対象とPCブラウザ・Androidアプリでの手動検証表
- [REGION_PLAY.md](REGION_PLAY.md) — 地域別出題、越境国、小地域での問題数
- [LOCALIZATION.md](LOCALIZATION.md) — 日英の言語設定・翻訳
- [TEXT_ANSWER.md](TEXT_ANSWER.md) — 国名入力の読み仮名・別名・表記ゆれ・IME
- [MAP_TO_NAME_QUIZ.md](MAP_TO_NAME_QUIZ.md) — 地図→国名
- [FLAG_TO_NAME_QUIZ.md](FLAG_TO_NAME_QUIZ.md) — 国旗→国名
- [NAME_TO_MAP_QUIZ.md](NAME_TO_MAP_QUIZ.md) — 国名→地図
- [NAME_TO_FLAG_QUIZ.md](NAME_TO_FLAG_QUIZ.md) — 国名→国旗

## データ・アセット

- [DATA.md](DATA.md) — 197か国・地域のマスタ、ライセンス
- [MAP.md](MAP.md) — 2D地図のSVG描画・操作・出典
- [FLAGS.md](FLAGS.md) — 国旗SVG生成、表示、ライセンス

共通のセッション処理は `src/features/quiz/useQuizSession.ts`、ルール設定は `QuizRuleFields.tsx`、共通結果UIは `QuizStatus.tsx` を参照してください。
