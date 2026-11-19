# 出題国・地域マスタ仕様（Issue #2）

## 対象範囲

src/country-data/countries.json に197件の国・地域データを収録しています。

| 分類 | 件数 | 内容 |
| --- | ---: | --- |
| 国連加盟国 | 193 | un-member |
| 国連非加盟オブザーバー | 2 | PS（パレスチナ）、VA（聖座・バチカン） |
| 追加出題対象 | 2 | TW（台湾）、XK（コソボ） |
| **合計** | **197** | |

「台湾・コソボなど」の追加対象は今後個別に検討します。香港・マカオ・属領などはこの197件に含めません。ここでの分類はゲームの出題範囲を定義するものであり、国際法上の地位や政治的立場を示すものではありません。

## データ構造

| フィールド | 用途 |
| --- | --- |
| id | 内部キー。国名・国旗・地図で共通 |
| classification | un-member / observer / additional |
| isoAlpha2 / isoAlpha3 | ISOコード。未割当の場合はnull |
| names.ja / names.en | 日本語・英語の表示名 |
| aliases.ja / aliases.en | 通称・別表記。Issue #10で見直し |
| regionIds | 地域選択用のID配列 |
| flagId / geometryId | 国旗と国境の論理ID |

XKはUnicode CLDRで使用される慣用コードですが、ISO 3166-1の正式な割当ではないため、内部IDをXK、isoAlpha2とisoAlpha3をnullにしています。

flagId、geometryIdは国IDと同じ論理キーです。地図ポリゴンはIssue #3でNatural Earth由来のデータと全197件の対応を実装済みです。国旗画像はIssue #4で別途実装します。国旗のファイル欠落検証は#17に残します。

## 地域区分

最初の地域はアフリカ54、アジア48、ヨーロッパ46、北アメリカ23、南アメリカ12、オセアニア14です。初期時点で各国は1つの地域に属します。

元データのAmericasのうちSouth Americaを南アメリカ、それ以外のCaribbean、Central America、Northern Americaを北アメリカに割り当てます。例としてロシアはヨーロッパ、トルコとジョージアはアジア、キプロスはヨーロッパです。越境国の複数地域所属はIssue #11で設計し、regionIdsの複数登録で対応可能にします。

## データソースと権利条件

この国マスタには、以下の第三者データに由来する情報が含まれます。コード自体のApache License 2.0が国マスタの再利用条件を置き換えるわけではありません。

- 国名以外のコード・国連加盟フラグ・地域：mledoze/countries（ODbL 1.0）。取得元リビジョン 5d15c0ff8c87ef2f1f8e944093522d4b2de2dd5b。
- 日本語・英語名：Unicode CLDR JSON（Unicode License V3）。取得元リビジョン 7d2b9cb11cec08f4d333ad73209deb3df0711c3b。
- mledoze側ではVAに国連加盟フラグが立っていますが、国連の非加盟オブザーバー分類に合わせ、本アプリでobserverに修正しています。
- 正確な正式国名、政治的呼称、受理する通称や別名は、クイズのUXとして別途見直します。

元データ：
- https://github.com/mledoze/countries
- https://github.com/unicode-org/cldr-json
- https://www.un.org/en/about-us/non-member-states

取得時点のライセンス本文は data/licenses/ODbL-1.0.txt と data/licenses/UNICODE-LICENSE-V3.txt に収録しています。国マスタはODbL 1.0に基づく派生データベースとして扱い、必要な表示・ライセンス条件を維持します。広告収益化やAndroid同梱に際しても、この条件を確認します。

地図ポリゴンはパブリックドメインのNatural Earth 1:50mデータから軽量化したSVGパスを同梱しています（詳細：[MAP.md](MAP.md)）。国旗画像は未収録のため採用時に利用条件を確認します。

## 品質検証

npm test で197件の内訳、ID/論理アセットキーの重複、日英の名称欠落、地域コード、ISO例外、越境例、別名配列を検査します。CIとPages公開時のビルドにも組み込みます。

検証対象はマスタの内部整合性のみです。地図の197件すべての対応はtests/world-map.test.mjsで検証します。国旗ファイルの実在チェックはアセットを追加した段階で行います。
