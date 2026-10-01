# ICHICO TVCM Planner（テレビCMシミュレーター）

ローカルテレビCM出稿のリーチ・認知率・コスト効率を、エリア・ターゲット・絵柄（出稿パターン）・GRP などの条件からシミュレーションする Next.js アプリケーションです。

## 主な機能

- **リーチシミュレーション**: ポアソン分布モデル + Sainsbury式の局合成でエリア内リーチ率・リーチ人数を推計
- **リーチカーブ**: GRP（または出稿金額）に対するリーチとリーチ単価（円/%）のカーブ表示。最安リーチ単価となるGRPをハイライト
- **認知率推移**: Koyck型アドストック + 飽和式（MaxAwareness × Adstock / (Adstock + K)）による期間別の広告認知率
- **週/月プランニング**: 期間粒度の切替、期間別GRP、月次は λ_m = λ_w^4.345 で残存効果を換算
- **最効率GRPの目安**: 方式A（webコストパリティ）／方式B（限界効率法）／方式C（カーブ上の最安リーチ単価）。サマリー先頭に現状 vs 方式C の判定を表示
- **感度分析**: OAT（One-at-a-time）による Tornado / Waterfall と洞察の提示（主計算のあとに遅延計算）
- **曜日時間区分インポート**: Excelの視聴率実測データから絵柄補正係数を高精度化
- **プラン保存・比較・エクスポート**: IndexedDB への保存、最大4プランの比較（先頭プラン基準のKPI差分）、CSV/PNG出力、Google Drive 連携

## セットアップ

```bash
npm install
npm run dev
```

`http://localhost:3000/simulate` にアクセスします。

Google Drive 連携を使う場合は `.env.local` に Google OAuth のクレデンシャル（`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `AUTH_SECRET` または `NEXTAUTH_SECRET`）を設定してください。トークン期限切れ時は自動更新し、失敗時は再ログインを求めます。

## テスト・ビルド

```bash
npm test        # vitest（単体テスト）
npm run build   # 本番ビルド
npm run lint    # ESLint
```

## ディレクトリ構成（抜粋）

```
src/
  app/                    # Next.js App Router（/simulate, /plans, /compare 等）
  components/
    charts/               # Recharts ベースのチャート群（shared/ に共通部品）
    simulate/             # シミュレーション画面（条件入力・結果パネル）
    plans/, compare/      # 保存プラン一覧・比較
  lib/
    engines/              # 計算エンジン（reach / awareness / cost / optimizer / sensitivity 等）
    stores/               # Zustand ストア（simulation / plan / dayparts）
    masters/              # マスタデータ参照（人口・局・コスト・絵柄）
    io/                   # CSVエクスポート/インポート、Excel取込
    constants/            # モデル定数・ロジック解説文
  data/                   # master_data.json ほかマスタ
  types/                  # 型定義（単位規約は JSDoc に明記）
docs/
  FSD_v1.1.md             # モデル仕様（Functional Spec）
```

## 単位の規約

- `reachRate` は内部では **小数 (0–1)**。表示層でのみ ×100 して % 表記
- `awarenessRate` は **百分率 (0–100)**
- `reachUnitPrice` は **円/リーチ率1%**、`cpm` は **円/1,000インプレッション**
- CSVエクスポートは `reachRateDecimal` / `reachRatePercent` のように単位をキー名で明示（format_version 1.2）

## モデルの前提・限界

- リーチはポアソン分布 + 業界係数（経験則ベース、誤差±20〜30%目安）
- 局合成は Sainsbury 式 + 固定局間相関（ρ=0.35）。GRPは選択局へ **コスト加重按分（既定・安い局に厚く）**／均等／手入力。出稿総額は Σ(局GRP × 局パーコスト)
- 認知率は飽和式。出稿を積むほど MaxAwareness に近づき、立ち上がり域・飽和域を注記する
- 詳細は `docs/FSD_v1.1.md` を参照
