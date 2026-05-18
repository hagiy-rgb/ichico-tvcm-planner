# CLAUDE.md — ICHICO TVCM Planner

このファイルは Claude Code が本プロジェクトのコンテキストを把握するための指示書です。プロジェクトルートに配置してください。

---

## プロジェクト概要

**プロジェクト名**: ICHICO TVCM Planner（略称 ITP）
**目的**: ICHICO広告営業職向けの、テレビCM出稿シミュレーションSaaS
**ユーザー**: 広告営業職（プランナー以外）。テレビCMのロジックに精通していない前提。ロジック透明性・用語解説が必須。
**市場リファレンス**: スイッチメディア「TVAL」
**保存場所**: `H:\マイドライブ\★生成AI\Claude\テレビCMシミュレーター` 配下にすべて格納する。

詳細仕様は `docs/FSD_v1.1.md`、業界係数の出典は `docs/coefficient_research_report.md` を参照。

---

## 何を作るか（13の機能要件）

1. エリア指定→視聴人口の自動セット
2. 絵柄（出稿パターン）でリーチが変動するロジック
3. リーチ率・リーチ数の両方を表示
4. リーチ単価が最効率になるGRPの提案
5. 放送局選定でリーチが変動するロジック
6. リーチ単価・表示単価（CPM）の可視化
7. CM残存効果を考慮した広告認知率シミュレーション
8. グラフのPNG画像／CSVダウンロード
9. 複数の出稿プランを横並びで比較
10. 過去にCSV出力したシミュレーションをインポートしてグラフ再生成
11. 「曜日・時間区分集計」Excelのオプショナルインポート（高精度モード）
12. 保存機能（Google Drive、企業×案件×プランの階層構造）
13. **絵柄の曜日・時間帯をユーザーがカスタマイズ＋係数チューニング機能**

---

## 技術スタック（厳守）

| 領域 | 採用技術 | 備考 |
|---|---|---|
| フレームワーク | Next.js 14（App Router） | TypeScript 5+ |
| スタイリング | Tailwind CSS + shadcn/ui | |
| グラフ | Recharts | |
| 状態管理 | Zustand | Reduxは使わない |
| ローカル永続化 | Dexie (IndexedDB) | localStorageは使わない |
| クラウド保存 | Google Drive API（drive.file scope） | drive scopeは使わない |
| 認証 | NextAuth.js v5 + Google Provider | |
| CSV処理 | PapaParse | |
| Excel処理 | SheetJS (xlsx) | |
| 画像出力 | html-to-image | html2canvasは使わない |
| 型検証 | Zod | 外部入力（ファイル・API）で必須 |

---

## ディレクトリ構成

```
ichico-tvcm-planner/
├── CLAUDE.md
├── docs/
│   ├── FSD_v1.1.md
│   └── coefficient_research_report.md
├── src/
│   ├── app/
│   │   ├── page.tsx                  # ダッシュボード
│   │   ├── simulate/page.tsx         # シミュレーション画面
│   │   ├── plans/page.tsx            # プラン一覧
│   │   ├── compare/page.tsx          # 比較ビュー
│   │   ├── settings/page.tsx         # 設定（マスタ・係数・絵柄定義の編集）
│   │   └── api/auth/[...nextauth]/route.ts
│   ├── components/
│   │   ├── plan-builder/             # 入力UI
│   │   ├── charts/                   # グラフ
│   │   ├── kpi-cards/                # KPI表示
│   │   ├── dialogs/                  # モーダル
│   │   ├── plan-list/                # プラン一覧UI
│   │   ├── coefficient-tuner/        # 係数チューニングUI
│   │   ├── pattern-editor/           # 絵柄カスタマイズUI
│   │   └── ui/                       # shadcn/ui
│   ├── lib/
│   │   ├── engines/                  # 計算ロジック（純粋関数）
│   │   ├── masters/                  # マスタアクセス
│   │   ├── io/                       # 入出力（CSV/Excel/Drive）
│   │   ├── auth/
│   │   ├── stores/                   # Zustand
│   │   └── utils/
│   ├── types/
│   └── data/
│       ├── master_data.json          # 45エリア×11ターゲット・コスト
│       ├── industry_coefficients.json # 業界係数マスタ（実証データ）
│       ├── pattern_definitions.json  # 絵柄定義（5プリセット）
│       └── station_name_mapping.json # 局名表記マッピング
```

---

## コアロジック仕様（必読）

### リーチ計算（ポアソン分布モデル）

ファイル: `src/lib/engines/reach-engine.ts`

```
リーチ人数 = 視聴人口 × (1 − POISSON_CDF(F−1, k×GRP))
リーチ率   = リーチ人数 / 視聴人口
```

- F: 有効フリークエンシー閾値（デフォルト6、ユーザー編集可）
- k: CM効果係数（業界マスタ値 × 絵柄補正）
- POISSON_CDF: ポアソン分布の累積分布関数。`src/lib/utils/poisson.ts` に実装

ポアソン分布のCDFはGamma関数で実装。`mathjs` 使用可。大きなλ（>700）でオーバーフローしないよう対数空間で計算。

### 絵柄補正係数

ファイル: `src/lib/engines/creative-pattern-engine.ts`

絵柄は「曜日グループ×時間帯」の集合（`pattern_definitions.json`）。

```
標準モード:   k_effective = k_industry × pattern.default_coefficient_vs_average
高精度モード: k_effective = k_industry × (絵柄選択セルの加重平均視聴率 / 全日加重平均視聴率)
```

絵柄は5プリセット（全日/ヨの字/コの字/逆L/一の字）+ カスタム。**ユーザーが曜日グループ（平日/土日/個別曜日）ごとに時間帯を複数指定して編集できる**。詳細は後述「絵柄カスタマイズ仕様」。

### 局合成リーチ（Sainsbury式）

ファイル: `src/lib/engines/station-engine.ts`

```
Reach_combined = 1 − ∏(1 − Reach_i × √(1−ρ_i))
```

ρ: 局間相関係数。高精度モード時は曜日時間区分データから推定、なければ保守的デフォルト値。

### CM残存効果（Koyck型アドストック）と認知率

ファイル: `src/lib/engines/awareness-engine.ts`

```
Adstock_t = α × GRP_t × pattern_coef + λ × Adstock_(t-1)
認知率_t  = α_awareness × Adstock_t        （線形近似、500-1500GRP帯で有効）
```

- α（即時効果）、λ（残存係数）、α_awareness（認知変換率）はすべて業界マスタから初期値を取得し、**ユーザーが係数チューニングUIで調整可能**
- 時間単位変換: `λ_週 = λ_月^(1/4.345)`、`λ_日 = λ_月^(1/30.4)`。マスタは週次が基準

### 最効率GRP（2方式併設）

ファイル: `src/lib/engines/optimizer.ts`

- 方式A（webコストパリティ法）: テレビCMリーチ単価がweb動画CPM（デフォルト2.3円）と等しくなるGRPを二分探索
- 方式B（限界効率法）: 限界リーチ効率が初期効率の50%まで低下するGRP

UIで両方併記。営業が状況に応じて選択。

### コスト計算

```
出稿総額   = GRP × パーコスト（絵柄別単価を反映）
リーチ単価 = 出稿総額 / リーチ率[%]
CPM        = 出稿総額 / (GRP × 母数(人) / 100,000)
表示単価   = 出稿総額 / (GRP × 母数(人) / 100)
```

---

## 絵柄カスタマイズ仕様（要件13の前半）

### データ構造

```typescript
type CreativePattern = {
  presetName: "全日" | "ヨの字" | "コの字" | "逆L" | "一の字" | "カスタム";
  blocks: Array<{
    weekdayGroup: "WEEKDAY" | "WEEKEND" | "ALL" | "月" | "火" | "水" | "木" | "金" | "土" | "日";
    timeSlots: Array<{ start: string; end: string }>;  // "07:00" 形式、複数指定可
  }>;
};
```

### UI要件（`src/components/pattern-editor/`）

1. 5プリセット（全日/ヨの字/コの字/逆L/一の字）をボタンまたはタブで選択。選ぶと `pattern_definitions.json` の `default_blocks` がセットされる
2. **平日と土日で時間帯が異なるため、曜日グループごとに時間帯を別々に設定できる**。「平日ブロック」「土日ブロック」を分けて表示
3. 各ブロックで時間帯を複数追加・削除できる（「+時間帯を追加」ボタン）
4. 個別曜日指定もできる（平日/土日でなく「水曜だけ」等）
5. プリセットを編集すると presetName が自動で「カスタム」に変わる
6. 視覚的な「絵柄マトリクス」（横=時間帯、縦=曜日）で、塗られているセルが一目でわかるグリッド表示があると望ましい
7. 絵柄を変えるとリーチ・認知率が即座に再計算される

---

## 係数チューニング仕様（要件13の後半）

### 対象係数

| 係数 | 記号 | 役割 | 初期値ソース |
|---|---|---|---|
| アドストック残存係数 | λ | CM残存効果の減衰 | industry_coefficients.json |
| 即時効果係数 | α | 当期GRPのアドストック変換 | デフォルト0.3 |
| 認知変換率 | α_awareness | アドストック→認知率 | industry_coefficients.json |
| CM効果係数 | k | ポアソンモデルの到達 | industry_coefficients.json（原則0.01） |
| 有効フリークエンシー | F | 有効到達の閾値 | デフォルト6 |

### UI要件（`src/components/coefficient-tuner/`）

1. 各係数をスライダー＋数値入力で調整できる
2. **業界カテゴリを選ぶと、`industry_coefficients.json` から推奨値（min/typical/max）が自動セットされる**
3. 各係数の横に「目安値（ノーム値）」を表示する。表示内容:
   - 業界別の min / typical / max レンジ
   - 半減期（λの場合は週数換算）
   - 購買ファネル段階別の補正係数
   - **出典（source）と信頼度ラベル（quality: A/B/C）**
4. 信頼度ラベルの意味:
   - **A**: 査読論文・大規模実証研究
   - **B**: 業界白書・ICHICO自社実証データ
   - **C**: 理論推定（業界購買サイクルからの推定。実証データなし）
5. ユーザーが値を変更すると即座にシミュレーションが再計算される
6. 「推奨値に戻す」ボタンを常設
7. 購買ファネル段階（認知/興味/比較検討/購買意向/購買/ロイヤリティ）を選ぶと、λに補正係数が掛かる

### 重要な原則（ハルシネーション厳禁）

- **`industry_coefficients.json` に記載のない数値を、UIに「目安値」として表示してはならない**
- 信頼度Cの係数を表示する際は「業界購買サイクルからの推定値。出稿後の実データで校正を推奨」という注記を必ず併記する
- 出典名（source）は必ずそのまま表示する。営業がクライアントに「この数値の根拠は？」と聞かれて答えられるようにするため
- 係数の妥当範囲外（例: λ > 0.95）の値が入力されたら警告を表示する

---

## マスタデータ

`src/data/` に4つのJSONを配置（既存Excelおよび調査レポートから抽出済み）。

| ファイル | 内容 |
|---|---|
| `master_data.json` | 45エリア×11ターゲット視聴人口、局別人口、エリア×局×絵柄コスト |
| `industry_coefficients.json` | 19業界の λ/α/k 実証値、ファネル補正、クリエイティブ補正、出典 |
| `pattern_definitions.json` | 絵柄5プリセットの曜日×時間帯定義 |
| `station_name_mapping.json` | 曜日時間区分集計とリーチExcel間の局名表記マッピング |

### 局名マッピング（重要）

曜日・時間区分集計の局名（tbc, ミヤギテレビ, 東日本放送, 仙台放送）と、既存マスタ表記（TBC, MMT, KHB, OX）が異なる。`station_name_mapping.json` で吸収する。

---

## 曜日・時間区分インポート仕様

ファイル: `src/lib/io/dayparts-import.ts`

ビデオリサーチPM Plus出力のExcel形式。実物の構造:
- 複数シート構成（シート名 = ターゲット特性: 世帯/個人全体/男女12区分等）
- 各シート内ブロック型レイアウト（ブロック先頭セルに放送局名）
- ブロック内: 行=時間帯（60分刻み、05:00-28:00）、列=曜日（月火水木金土日+平日平均+週平均）
- セル値=平均視聴率(%)、`*` や `-` は欠損
- A1〜A10付近にメタデータ（地区、期間、サンプル数、時間区分等）

パーサ実装:
1. SheetJSで読み込み、A列上部からメタデータ抽出
2. 各シートでブロック（局名）を検出
3. 時間帯×曜日マトリクスを構造化
4. `station_name_mapping.json` で局名正規化
5. Zodで検証
6. インポートデータはIndexedDBに保存、エリアに紐付け（次回再利用）

エラー時: 形式不正は詳細メッセージ表示、局名マッピング失敗は手動マッピング画面を提示。インポートなしでも標準モードで動作すること。

---

## Google Drive保存

### 認証

NextAuth.js + Google Provider、スコープ `drive.file`（アプリ作成ファイルのみアクセス、最小権限）。

### ファイル構造

```
Google Drive
└── ICHICO_TV_Planner/
    ├── _index.json                    # 全プランのメタデータ一覧
    ├── _dayparts/                     # インポート済み曜日時間区分データ
    ├── <企業名>/
    │   └── <案件名>/
    │       ├── _project_meta.json     # 担当者等のメタデータ
    │       └── <プラン名>.json
```

### データモデル（階層構造）

```typescript
type Client = { id: string; name: string; createdAt: string; projects: Project[] };
type Project = { id: string; clientId: string; name: string; contactPerson: string; createdAt: string; plans: Plan[] };
type Plan = {
  id: string; projectId: string; name: string; memo: string; savedAt: string;
  area: string;
  period: { unit: "month"|"week"|"day"; count: number };
  grpSchedule: Array<{ period: number; grp: number }>;
  creativePattern: CreativePattern;          // 絵柄（カスタマイズ可能）
  creativeLength: 15 | 30 | 60;
  selectedStations: string[];
  targets: TargetSegment[];
  industry: string;
  funnelStage: "awareness"|"interest"|"consideration"|"intent"|"purchase"|"loyalty";
  coefficients: {                            // 係数（チューニング可能）
    lambda: number; alpha: number; alphaAwareness: number;
    cmCoefficient: number; effectiveFrequency: number;
  };
  perCost: number;
  daypartsDataRef?: string;
  results?: PlanResults;
};
```

### 保存ダイアログ

入力項目: 担当者、企業名、案件名、プラン名、メモ。保存日は自動。同じ企業名×案件名は自動的に同一案件フォルダにまとめる。

### プラン一覧画面

カード形式。各カードに主要KPI（GRP・リーチ率・予算）を表示。アクション: 編集・複製・削除・比較に追加・CSV出力。検索フィルタ: 担当者・企業名・案件名・期間。

### 同期戦略

起動時にDriveの `_index.json` をIndexedDBにキャッシュ。編集中はIndexedDBにリアルタイム保存。明示保存時にDriveアップロード。オフラインでも動作、復帰時に自動同期。

---

## 営業向けUX（重要）

ユーザーはテレビCMのロジックに精通していない。以下を必須とする。

1. **ロジック透明化の3層構造**: KPIカードに数字＋一言説明、ホバーで計算式、「なぜ?」ボタンで詳細モーダル
2. **専門用語ヘルプ**: GRP、リーチ、フリークエンシー、アドストック、CPM、絵柄等すべてに[?]アイコン、クリックで解説
3. **精度ラベル**: 各出力に「標準精度（±20-30%）」「高精度（±10-15%）」「実勢値（±5-10%）」を表示
4. **入力プリセット**: エリア選択時に典型プランを提示
5. **不確実性の明示**: 「シミュレーション値です。実出稿結果との誤差を想定」を注記
6. **前提条件の明示**: 各シミュレーション結果に、使用した係数・絵柄・前提を併記

---

## コーディング規約

1. `src/lib/engines/` は純粋関数で実装（副作用は呼び出し側）。単体テスト必須
2. すべての関数に明示的な戻り値型。`any` 禁止
3. 外部入力（API・ファイル・ユーザー入力）はZodで検証
4. エラーメッセージは営業向けの平易な日本語。技術詳細はconsole.error
5. 営業向けUIは日本語表記（CPM等の定着略語を除く）
6. engines/ の計算結果は既存Excelの計算結果と照合してテスト

---

## やってはいけないこと

1. localStorageでの永続化（IndexedDB/Driveのみ）
2. drive scopeでの認証（drive.fileのみ）
3. 業界係数・絵柄定義のハードコード（JSONから読み込む）
4. `industry_coefficients.json` にない数値を「目安値」として表示する（ハルシネーション禁止）
5. 信頼度Cの係数を注記なしで提示する
6. ポアソン分布の近似なし素朴実装（大λで精度劣化）

---

## 開発の進め方

`docs/FSD_v1.1.md` のフェーズ計画と、キックオフプロンプトの指示に従う。各ステップで動作確認しながら進める。実装中の判断分岐（業界係数のデフォルト選択、UIデザイン等）で迷ったら、コードを書く前に萩さんに確認する。
