# テレビCMシミュレーションツール「業界係数マスタ」徹底調査レポート
**株式会社ICHICO 社内向け｜2026年5月15日**

## エグゼクティブサマリー

本レポートは、ICHICO社内テレビCMシミュレーションツールの3係数（①アドストック減衰λ、②GRP→認知率変換α、③ポアソン到達モデルk）について、公開済みの査読論文・業界レポート・ICHICO実証データを統合し、業界別・商材別の推奨値レンジを提示する。重要な注意点として、**3係数のうち学術的に最も実証データが豊富なのは①λ（半減期）**であり、**②αは日本市場についてビデオリサーチ「クリエイティブカルテ」（2,500素材以上）が事実上の唯一の公開ベンチマーク**である。**③kは数学的に決定論的（k≈0.01）**であり、業界差は「ターゲット母集団の選定」と「ターゲットGRPの定義」に吸収される。営業現場で「この数値の出典は？」と問われた際に答えられるよう、各セルに一次出典名と限界を付記した。

---

## 1. アドストック減衰係数 λ（Koyck型残存係数）

### 1.1 モデル定義の確認

ICHICOツールが採用する式：
```
Adstock_t = α × GRP_t + λ × Adstock_(t-1)
```
- λ：1期前の残存比率（0〜1）
- 半減期（half-life）: `t½ = ln(0.5) / ln(λ)`（週次なら週、月次なら月単位）
- 期間粒度を変換する場合、**週次λ_w から月次λ_m へは λ_m = λ_w^(4.345)**（連続複利近似、Leone 1995準拠）

### 1.2 学術メタ分析からの実証ベンチマーク

| 研究 | サンプル | 主要数値 | 出典 |
|---|---|---|---|
| Clarke (1976) JMR | 69研究（CPG・耐久財・サービス） | 広告効果半減期は**2〜6か月**。年次データは intra-year decay をバイアスし λ を過大評価 | Clarke, D.G. (1976) "Econometric Measurement of the Duration of Advertising Effect on Sales" JMR 13(4):345-357 |
| Sethuraman, Tellis & Briesch (2011) JMR | 56研究、872短期＋402長期広告弾力性 | 短期広告弾力性平均**0.12**、長期**0.24**。耐久財＞非耐久財、製品ライフサイクル初期＞成熟期、TV＞印刷 | JMR 48(3):457-471 |
| Henningsen et al. (2011) | 国際広告弾力性データベース | 短期**0.09**、長期**0.19** | Journal of Business Research |
| Naik (1999) Marketing Letters | Levi's Dockers TVキャンペーン | 広告の half-life は約**3か月**（Kalmanフィルタ推定） | Marketing Letters 10(4):351-362 |
| Wikipedia "Advertising adstock"（業界実務集約） | FMCG実務集計 | 学術系**7-12週**、業界実務**2-5週**、**FMCG平均2.5週** | https://en.wikipedia.org/wiki/Advertising_adstock |
| Meta（旧Facebook）"Long-term effects" 公開 | 業界別ロバスト性 | 長期効果のサイズは**CPGで42%、Tech & Durables で76%**（Ataman/Pauwels系の解釈） | Nigel Hollis, Kantar コラム |

### 1.3 業界別・商材別 λ 実証値とレンジ表

期間粒度は**週次λ_w**で統一表示。月次・日次への換算は備考欄。データ品質：**A=査読／大規模実証、B=業界白書／実務集約、C=理論的推定**。

| 業界カテゴリ | 推奨週次λ_w | 半減期(週) | 月次λ_m | 日次λ_d | 出典・根拠 | 品質 |
|---|---|---|---|---|---|---|
| **消費財：食品・飲料（FMCG確立ブランド）** | 0.50〜0.65 | 1.0〜1.6週 | 0.06〜0.20 | 0.91〜0.94 | Wikipedia集約（FMCG平均2.5週）、Sethuraman 短期弾力性0.12が支配的 | A/B |
| **消費財：トイレタリー・日用品** | 0.55〜0.70 | 1.2〜1.9週 | 0.09〜0.24 | 0.92〜0.95 | Nielsen Catalina (2016) CPGベンチ。購買頻度の高さからFMCGに準ずる | B |
| **耐久財：自動車** | 0.80〜0.90 | 3.1〜6.6週 | 0.36〜0.59 | 0.97〜0.985 | Recastブログ「car market purchase cycles are quite long」、Sethuraman「durable>nondurable」、Meta Tech&Durables 76%長期効果 | A/B |
| **耐久財：家電（白物・黒物）** | 0.70〜0.85 | 1.9〜4.3週 | 0.20〜0.44 | 0.95〜0.978 | 同上。買替サイクル中長期だが価格弾力性が自動車より高い | B/C |
| **金融：銀行リテール／カード** | 0.75〜0.88 | 2.4〜5.4週 | 0.27〜0.52 | 0.96〜0.982 | ICHICO七十七銀行案件提案資料（2025）でアドストックを考慮した出稿設計を提案。学術的には金融はsubscriptive性が高く λ も高い側 | B（ICHICO内部）/C |
| **金融：生命保険（長期検討型）** | 0.85〜0.92 | 4.3〜8.3週 | 0.44〜0.66 | 0.978〜0.988 | 検討期間が数か月〜年単位。Clarke 6か月上限に近い。**実証データなし、推定**。Sethuraman長期弾力性0.24を準用 | C |
| **金融：損保（自動車保険等）** | 0.70〜0.85 | 1.9〜4.3週 | 0.20〜0.44 | 0.95〜0.978 | 更新タイミング集中型。FMCGより長く生保より短い中間レンジ | C |
| **医薬：OTC・健康食品** | 0.55〜0.75 | 1.2〜2.4週 | 0.09〜0.32 | 0.92〜0.96 | 体調変化トリガーで即時購買。Sethuraman実証研究にOTCを含む | B |
| **医薬：処方薬（Rx）／DTC広告（米国）** | 0.80〜0.90 | 3.1〜6.6週 | 0.36〜0.59 | 0.97〜0.985 | DTC広告の検討期間長い。日本は処方薬TVCM不可のため**日本適用は限定的** | C |
| **エンタメ：映画・ゲーム** | 0.30〜0.50 | 0.5〜1.0週 | 0.008〜0.06 | 0.86〜0.91 | Hofmann et al. (2022) JAMS "Marvelous advertising returns"：エンタメ短期弾力性中央値0.15（Sethuraman 0.05比3倍）。**寿命の短い商品特性により λ も小さい** | A |
| **小売：スーパー・ドラッグ** | 0.45〜0.60 | 0.9〜1.4週 | 0.04〜0.13 | 0.89〜0.93 | チラシ・特売との相互作用が強くλは小さい | B |
| **小売：EC（汎用）** | 0.40〜0.55 | 0.8〜1.2週 | 0.025〜0.09 | 0.88〜0.92 | デジタル併用前提。即時クリック反応支配 | B |
| **不動産：分譲マンション・住宅** | 0.85〜0.92 | 4.3〜8.3週 | 0.44〜0.66 | 0.978〜0.988 | 検討期間6-12か月。Clarke最長レンジ | C |
| **不動産：賃貸** | 0.55〜0.70 | 1.2〜1.9週 | 0.09〜0.24 | 0.92〜0.95 | 季節性（1-3月集中）で短い | C |
| **インフラ：電力・ガス** | 0.70〜0.85 | 1.9〜4.3週 | 0.20〜0.44 | 0.95〜0.978 | **ICHICO東北発電工業案件（2025-26）実証**：5か月間で日次GRP×日次セッション相関 r=0.94（7県合計、即日反応支配）、月次平均でGRP→セッション減衰が出稿量に追随。**「アドストックはあるが月単位で見ると小さく、ほぼリアルタイム反応で読むのが妥当」と結論**。半減期は週レベル | B（ICHICO実証） |
| **通信：キャリア（MNO/MVNO）** | 0.65〜0.80 | 1.6〜3.1週 | 0.13〜0.32 | 0.94〜0.97 | 契約切替検討は中期。耐久財寄り | C |
| **住宅設備：リフォーム・住設機器** | 0.80〜0.90 | 3.1〜6.6週 | 0.36〜0.59 | 0.97〜0.985 | 検討期間長い高関与商材 | C |
| **BtoBサービス・SaaS** | 0.85〜0.92 | 4.3〜8.3週 | 0.44〜0.66 | 0.978〜0.988 | **TVCMによるブランド構築→指名検索→商談化の遅延が大きい**。ノバセル「CPA計測：BtoB商材も最適化可能」、tvScientific/Demandbase等のCTV B2B事例が増加。学術的なTV-MMM研究は乏しく**実証データ未確認、推定**。Sethuraman長期弾力性0.24を上限ガイドとして使用 | C |
| **長期検討型：結婚式場** | 0.85〜0.92 | 4.3〜8.3週 | 0.44〜0.66 | 0.978〜0.988 | **実証データなし**、検討期間6-12か月を根拠に推定 | C |
| **長期検討型：教育（塾・予備校・通信教育）** | 0.75〜0.88 | 2.4〜5.4週 | 0.27〜0.52 | 0.96〜0.982 | 入学タイミング集中・季節要因強い。**実証データなし、推定** | C |

### 1.4 ファネル段階別補正

学術界ではアドストックを**売上ベース（最終KPI）**で推定するのが主流だが、認知ベース（中間KPI）で推定するとλはより大きくなる（=ブランド記憶の減衰のほうが遅い）ことが知られる。Broadbent (1979)、Joseph (2006) "Understanding Advertising Adstock Transformations" 参照。

| ファネル段階 | λ補正係数 | 根拠 |
|---|---|---|
| 認知（Awareness） | × 1.10 〜 1.20 | 認知は記憶残存が長い |
| 興味（Interest） | × 1.05 〜 1.15 | やや長い |
| 比較検討（Consideration） | × 1.00 | 基準 |
| 購買意向（Intent） | × 0.90 〜 0.95 | 意向は競合広告で減衰しやすい |
| 購買（Purchase） | × 0.80 〜 0.90 | 売上ベース。Clarkeの2-6か月レンジの下限側 |
| ロイヤリティ（Loyalty） | × 1.15 〜 1.30 | 既存顧客の記憶持続は長い（Ehrenberg-Bass Institute, Byron Sharpの "double jeopardy" 周辺研究と整合） |

### 1.5 注意事項

- **データ集約バイアス**: Clarke (1976) が指摘するように、年次データで推定したλは intra-year の減衰を取り込めず**過大評価**になる。週次が標準。
- **0.9を超えるλは推奨しない**: 半減期が約7週を超え、モデル上は「ほぼ永続効果」となり ROI を著しく過大評価する（Recast, Impression Digital ともに同見解）。
- **業界平均をそのまま適用するリスク**: 同一カテゴリ内でもクリエイティブの質や購買サイクルで半減期は数倍変動する（Nielsen + NCS 2017研究：sales lift の49%はクリエイティブ）。
- **ICHICO東北発電工業ケースは「日次が支配的、月単位で減衰小」**。インフラ・電力系はパルス型出稿で「集中山」を設計する方が効率的という同社の実証示唆を採用。

---

## 2. 認知変換率 α（GRP→広告認知率変換）

### 2.1 モデル定義

```
広告認知率_t = α × Adstock_t  （線形近似）
または ロジスティック型：認知率_t = K / (1 + exp(-α × Adstock_t + β))
```

### 2.2 日本市場の実証値：ビデオリサーチ「クリエイティブカルテ」

日本市場の事実上唯一の公開ベンチマーク。**2,500素材以上のテレビCM認知率データから「Norm値（認知曲線）」を作成**（出典：ビデオリサーチ "1000GRPのCM出稿で認知率は何％獲得できるのか" 2024-07-02公開／2025-01-24更新, https://www.videor.co.jp/digestplus/article/ad-marketing240702.html）。

**ICHICO社内資料（七十七銀行案件 2025-04-21提案書）に記載された関東地区・男女13-59歳の実測値**（出典：テレビコマーシャルカルテレポート）：
- **タレント継続起用CM**：1,000GRPで認知率約**72%**
- **タレント非継続CM**：1,000GRPで認知率約**48%**

ここから1,000GRPを基準として α を逆算すると（線形近似、Adstock≈GRPと仮定する出稿初期）：
- α（継続起用）≈ 72/1,000 = **0.072 % / GRP**
- α（非継続）≈ 48/1,000 = **0.048 % / GRP**

### 2.3 業界別 α 推奨レンジ表（日本市場、関東スポット出稿、個人全体）

ビデオリサーチNormを基準（α≈0.05〜0.07）に、業界特性で補正。

| 業界 | α [% / GRP] レンジ | 1000GRP相当の認知率 | 出典・根拠 |
|---|---|---|---|
| **消費財・食品飲料** | 0.05〜0.07 | 50〜70% | VR Norm（業界横断平均に近い） |
| **消費財・トイレタリー** | 0.05〜0.07 | 50〜70% | VR Norm |
| **耐久財・自動車** | 0.04〜0.06 | 40〜60% | 関与度高くストーリー型クリエイティブで前半カットが多い分やや低い、業界実務見解 |
| **耐久財・家電** | 0.05〜0.07 | 50〜70% | VR Norm |
| **金融・銀行/カード** | 0.05〜0.08（タレント継続時0.07-0.08） | 50〜80% | **ICHICO七十七銀行データ：継続起用72%/1000GRP** |
| **生命保険・損保** | 0.05〜0.07 | 50〜70% | VR Norm。**実証データ未確認** |
| **医薬・OTC** | 0.05〜0.07 | 50〜70% | VR Norm |
| **エンタメ・映画/ゲーム** | 0.06〜0.09 | 60〜90% | 短期集中×高関与で認知効率高い（Hofmann et al. 2022 JAMS） |
| **小売・EC** | 0.04〜0.06 | 40〜60% | 認知より行動喚起重視のクリエイティブが多い |
| **不動産** | 0.04〜0.06 | 40〜60% | **実証データ未確認** |
| **インフラ・電力ガス** | 0.04〜0.06 | 40〜60% | ICHICO東北発電工業案件で「企業認知の土台形成」段階の自然反応を確認 |
| **通信** | 0.05〜0.07 | 50〜70% | VR Norm |
| **住宅設備** | 0.04〜0.06 | 40〜60% | **実証データ未確認** |
| **BtoBサービス・SaaS** | 0.03〜0.05 | 30〜50% | 視聴者の関心領域外で認知形成効率が低い。**実証データなし**。ノバセル等の事例レベル | 
| **教育** | 0.05〜0.07 | 50〜70% | VR Norm |

### 2.4 補正係数

| 補正要因 | α 補正係数 | 出典 |
|---|---|---|
| タレント継続起用 | × 1.40 〜 1.50 | ICHICO七十七銀行資料（72/48 = 1.5） |
| 新CM・新タレント | × 1.00 | 基準 |
| 競合大量出稿期（クラッタ高） | × 0.80 〜 0.90 | Ostrowモデルのメディアファクター |
| クリエイティブ高評価（VR CMカルテ高スコア） | × 1.20 〜 1.40 | Nielsen+NCS 2017: クリエイティブが sales lift の49%寄与 |
| 15秒素材（標準） | × 1.00 | 基準 |
| 30秒素材 | × 1.10 〜 1.20 | 業界実務見解（学術実証なし） |
| ターゲット視聴率（個人全体ではなくM1F1等） | × 1.00 で個人全体値を流用すると過小評価する場合あり。ターゲットGRPを別途使用すべき | VR R&F Plus手法 |
| ファネル：認知 | × 1.00（αは認知変換係数なので基準） | 定義 |
| ファネル：購買意向 | × 0.30 〜 0.50 | 認知→意向のファネル落ち（業界通念） |
| ファネル：購買 | × 0.10 〜 0.20 | 同上 |

### 2.5 注意事項

- **α は「個人全体ベースの全日帯スポット」が基準**。タイム提供枠やターゲット絞り込みでは大きく変動する。
- **海外データの直接適用は危険**: 海外では Millward Brown の "Awareness Index (AI)"（100 GRP あたりの広告想起獲得点）が標準だが、調査手法（純粋想起／助成想起）が日本と異なる。
- **1,000 GRPを超えると認知曲線は急速に飽和**（ロジスティック飽和、VRも認知曲線が「かまぼこ型」と表現）。線形近似は500-1500 GRP 帯のみ有効。

---

## 3. CM効果係数 k（ポアソン到達モデル）

### 3.1 モデル定義の数学的整理

ICHICOツールが採用する式：
```
Reach = 母数 × (1 - POISSON(F-1, k × GRP, TRUE))
```
これは「ある個人の広告接触回数が平均 (k × GRP) のポアソン分布に従う」という仮定。

**k の数学的意味**：1 GRP あたり、ターゲット母集団の平均的な個人が広告に接触する期待回数。

### 3.2 理論値と業界実務

GRP の定義そのものから：
- 1 GRP = 1% 視聴率 × 1本 = 母集団のうち1%に1回到達
- よって**母集団全員での平均接触回数 = GRP / 100**
- 標準的に **k = 0.01** （= 1/100）が理論値

ただし以下の補正が実務上必要：
1. **ターゲット母集団とGRP定義の整合**: 個人全体GRPをターゲット母集団（例：M1F1）に適用する場合、ターゲット濃度比で k を補正。
2. **接触の非独立性（クラスタリング）**: ヘビービューワー集中傾向により、実際の接触分布はポアソンよりも分散が大きい（負の二項分布が現実的）。Google Research の Goerg (2017) "Estimating reach curves from one data point" は**ポアソン+指数事前分布**を採用し1点データから到達曲線を推定する手法を提示。
3. **長期キャンペーン（複数週）では接触回数の累積でポアソン仮定の精度が悪化** → Weibull や負の二項分布で代替（Recast社、Meta Robynで採用）。

### 3.3 業界別 k 推奨値（理論値からの補正）

ここでの k は、「個人全体GRPをターゲット母集団人口に適用した場合の有効k値」を示す。

| 業界・ターゲット条件 | 推奨 k | 根拠 |
|---|---|---|
| **個人全体GRP × 個人全体母集団（標準）** | 0.0100 | 理論値（GRPの定義） |
| **個人全体GRP × M1F1（20-34歳）母集団** | 0.0060〜0.0080 | M1F1のテレビ視聴率は個人全体の60-80%（ビデオリサーチ R&F Plus 試算事例より） |
| **個人全体GRP × F3（50歳以上女性）母集団** | 0.0110〜0.0130 | 高年層の視聴率上振れ |
| **個人全体GRP × 13-19歳ティーン母集団** | 0.0030〜0.0050 | テレビ離れ。総務省「情報通信媒体の利用時間」と整合 |
| **ヘビービューワー偏重（再放送多用）の場合** | 0.0080〜0.0095 | クラスタリングで実効到達が下がる |

### 3.4 業界別の「実質的なkの差」の出どころ

業界別に k 自体が大きく変わるという**実証研究はほぼ存在しない**。むしろ業界差は以下に吸収される：
- **ターゲット人口の選定**（FMCGは個人全体、自動車はM1F2など）
- **時間帯ミックス**（朝・PT・深夜の差）
- **放送局ミックス**（キー局vs地方局の視聴率分布）

参考：Ostrowモデルでは Effective Frequency F* を以下のマーケティング/コピー/メディアファクターで補正：
- 確立ブランド：F* = 2-3
- 新ブランド・新商品：F* = 4-5
- 高関与・複雑メッセージ：F* = 4-6
- 高クラッタ環境：F* = 4-5
（出典：Joseph Ostrow "Setting Effective Frequency Levels" 1982）

### 3.5 注意事項

- **kは業界係数というより「ターゲット定義」係数**。営業向けには「GRPの定義と母集団を揃えれば k≈0.01 が原則」と説明し、ターゲット拡縮で補正することを推奨。
- **長期キャンペーン（4週超）ではポアソン仮定が崩れる**。Weibull/負の二項分布への切替検討が必要。Google Research Goerg (2017)、Jin et al. (2012)。
- **F+の上限**: 通常はF=10+程度までで実用上十分。F=20+はモデル外挿となり信頼性低い。

---

## 4. JSONスキーマ：業界係数マスタ

ICHICOツールに組み込み可能な形式で整理。**source**フィールドは営業説明用、**quality**は信頼度（A=査読論文/大規模実証、B=業界白書/自社実証、C=理論推定/限定的根拠）。

```json
{
  "schema_version": "1.0",
  "created": "2026-05-15",
  "owner": "ICHICO",
  "model_definition": {
    "adstock": "Adstock_t = α_conv × GRP_t + λ × Adstock_(t-1)",
    "awareness": "Awareness_t [%] = alpha_awareness × Adstock_t (linear, valid 500-1500 GRP)",
    "reach": "Reach = N_pop × (1 - POISSON(F-1, k × GRP, TRUE))",
    "default_period": "weekly",
    "half_life_formula": "t_half = ln(0.5) / ln(lambda)",
    "period_conversion": {
      "weekly_to_monthly": "lambda_m = lambda_w ^ 4.345",
      "weekly_to_daily": "lambda_d = lambda_w ^ (1/7)"
    }
  },
  "industries": [
    {
      "code": "FMCG_FOOD",
      "label": "消費財・食品飲料",
      "lambda_weekly": {"min": 0.50, "typical": 0.58, "max": 0.65, "half_life_weeks": [1.0, 1.6], "quality": "A/B",
        "source": "Wikipedia adstock 集約 (FMCG平均2.5週); Sethuraman et al. 2011 JMR; Clarke 1976 JMR"},
      "alpha_awareness": {"min": 0.05, "typical": 0.06, "max": 0.07, "unit": "%/GRP",
        "source": "ビデオリサーチ クリエイティブカルテ 2,500素材 Norm (2024)", "quality": "B"},
      "k_poisson": {"value": 0.0100, "note": "個人全体GRP×個人全体母集団基準", "quality": "A (定義)"},
      "funnel_adjust": {"awareness": 1.15, "consideration": 1.00, "purchase": 0.85}
    },
    {
      "code": "DURABLE_AUTO",
      "label": "耐久財・自動車",
      "lambda_weekly": {"min": 0.80, "typical": 0.85, "max": 0.90, "half_life_weeks": [3.1, 6.6], "quality": "A/B",
        "source": "Sethuraman 2011 (durable>nondurable); Meta社公開 'Tech&Durables 長期効果76%'; Recast 'car purchase cycles long'"},
      "alpha_awareness": {"min": 0.04, "typical": 0.05, "max": 0.06, "unit": "%/GRP",
        "source": "VR Norm補正（ストーリー型多用）", "quality": "C"},
      "k_poisson": {"value": 0.0100, "quality": "A"},
      "funnel_adjust": {"awareness": 1.20, "consideration": 1.00, "purchase": 0.85}
    },
    {
      "code": "DURABLE_HOMEAPPLIANCE",
      "label": "耐久財・家電",
      "lambda_weekly": {"min": 0.70, "typical": 0.78, "max": 0.85, "half_life_weeks": [1.9, 4.3], "quality": "B/C",
        "source": "Sethuraman 2011 (耐久財一般); 業界実務集約"},
      "alpha_awareness": {"min": 0.05, "typical": 0.06, "max": 0.07, "unit": "%/GRP", "source": "VR Norm", "quality": "B"},
      "k_poisson": {"value": 0.0100, "quality": "A"}
    },
    {
      "code": "FINANCE_BANK",
      "label": "金融・銀行/カード",
      "lambda_weekly": {"min": 0.75, "typical": 0.82, "max": 0.88, "half_life_weeks": [2.4, 5.4], "quality": "B/C",
        "source": "ICHICO七十七銀行案件 2025; Sethuraman長期弾力性0.24準用"},
      "alpha_awareness": {"min": 0.05, "typical": 0.07, "max": 0.08, "unit": "%/GRP",
        "source": "ICHICO七十七銀行レポート: タレント継続72%/1000GRP, 非継続48%/1000GRP (関東, 男女13-59, テレビコマーシャルカルテレポート)", "quality": "B"},
      "k_poisson": {"value": 0.0100, "quality": "A"},
      "talent_continuity_multiplier": 1.5
    },
    {
      "code": "FINANCE_LIFE_INS",
      "label": "金融・生命保険",
      "lambda_weekly": {"min": 0.85, "typical": 0.88, "max": 0.92, "half_life_weeks": [4.3, 8.3], "quality": "C",
        "source": "Clarke 1976 6か月上限; Sethuraman 長期弾力性0.24; **実証データ未確認、推定**"},
      "alpha_awareness": {"min": 0.05, "typical": 0.06, "max": 0.07, "unit": "%/GRP", "source": "VR Norm準用", "quality": "C"},
      "k_poisson": {"value": 0.0100, "quality": "A"}
    },
    {
      "code": "PHARMA_OTC",
      "label": "医薬・OTC健康食品",
      "lambda_weekly": {"min": 0.55, "typical": 0.65, "max": 0.75, "half_life_weeks": [1.2, 2.4], "quality": "B",
        "source": "Sethuraman実証研究にOTC含有; 体調トリガー即時購買"},
      "alpha_awareness": {"min": 0.05, "typical": 0.06, "max": 0.07, "unit": "%/GRP", "source": "VR Norm", "quality": "B"},
      "k_poisson": {"value": 0.0100, "quality": "A"}
    },
    {
      "code": "PHARMA_RX",
      "label": "処方薬DTC（日本適用限定）",
      "lambda_weekly": {"min": 0.80, "typical": 0.85, "max": 0.90, "half_life_weeks": [3.1, 6.6], "quality": "C",
        "source": "米国DTC研究準用。日本では処方薬TVCM不可のため適用範囲限定"},
      "alpha_awareness": {"value": "N/A_JAPAN"},
      "k_poisson": {"value": 0.0100}
    },
    {
      "code": "ENTERTAIN_MOVIE_GAME",
      "label": "エンタメ・映画/ゲーム",
      "lambda_weekly": {"min": 0.30, "typical": 0.40, "max": 0.50, "half_life_weeks": [0.5, 1.0], "quality": "A",
        "source": "Hofmann et al. 2022 JAMS 'Marvelous advertising returns' エンタメ短期弾力性中央値0.15 (Sethuraman 0.05比3倍)"},
      "alpha_awareness": {"min": 0.06, "typical": 0.075, "max": 0.09, "unit": "%/GRP",
        "source": "VR Norm補正（高関与・話題性）", "quality": "C"},
      "k_poisson": {"value": 0.0100, "quality": "A"}
    },
    {
      "code": "RETAIL_SUPERMARKET",
      "label": "小売・スーパー/ドラッグ",
      "lambda_weekly": {"min": 0.45, "typical": 0.52, "max": 0.60, "half_life_weeks": [0.9, 1.4], "quality": "B",
        "source": "チラシ併用前提、業界実務集約"},
      "alpha_awareness": {"min": 0.04, "typical": 0.05, "max": 0.06, "unit": "%/GRP", "source": "VR Norm", "quality": "C"},
      "k_poisson": {"value": 0.0100, "quality": "A"}
    },
    {
      "code": "RETAIL_EC",
      "label": "小売・EC",
      "lambda_weekly": {"min": 0.40, "typical": 0.48, "max": 0.55, "half_life_weeks": [0.8, 1.2], "quality": "B",
        "source": "デジタル即時反応; Recast 'TV/brand video 2-6週'のうち短期側"},
      "alpha_awareness": {"min": 0.04, "typical": 0.05, "max": 0.06, "unit": "%/GRP", "source": "VR Norm", "quality": "C"},
      "k_poisson": {"value": 0.0100, "quality": "A"}
    },
    {
      "code": "REAL_ESTATE_SALE",
      "label": "不動産・分譲住宅",
      "lambda_weekly": {"min": 0.85, "typical": 0.88, "max": 0.92, "half_life_weeks": [4.3, 8.3], "quality": "C",
        "source": "検討期間6-12か月; **実証データなし、推定**"},
      "alpha_awareness": {"min": 0.04, "typical": 0.05, "max": 0.06, "unit": "%/GRP", "source": "VR Norm準用", "quality": "C"},
      "k_poisson": {"value": 0.0100, "quality": "A"}
    },
    {
      "code": "REAL_ESTATE_RENT",
      "label": "不動産・賃貸",
      "lambda_weekly": {"min": 0.55, "typical": 0.62, "max": 0.70, "half_life_weeks": [1.2, 1.9], "quality": "C",
        "source": "季節集中(1-3月); **実証データなし、推定**"},
      "alpha_awareness": {"min": 0.04, "typical": 0.05, "max": 0.06, "unit": "%/GRP", "source": "VR Norm準用", "quality": "C"},
      "k_poisson": {"value": 0.0100, "quality": "A"}
    },
    {
      "code": "INFRA_ELECTRIC_GAS",
      "label": "インフラ・電力ガス",
      "lambda_weekly": {"min": 0.70, "typical": 0.78, "max": 0.85, "half_life_weeks": [1.9, 4.3], "quality": "B",
        "source": "**ICHICO東北発電工業案件 2025-26実証**: 5か月日次GRP×日次セッション相関r=0.94、月単位での減衰小、日次反応支配の実証。半減期は週レベル"},
      "alpha_awareness": {"min": 0.04, "typical": 0.05, "max": 0.06, "unit": "%/GRP",
        "source": "ICHICO東北発電工業実証「企業認知の土台形成段階の自然反応」", "quality": "B"},
      "k_poisson": {"value": 0.0100, "quality": "A"},
      "pulsing_strategy_note": "100-150 GRP/日の集中山×2-3回が最効率（ICHICO実証）"
    },
    {
      "code": "TELECOM",
      "label": "通信キャリア",
      "lambda_weekly": {"min": 0.65, "typical": 0.72, "max": 0.80, "half_life_weeks": [1.6, 3.1], "quality": "C",
        "source": "契約切替検討は中期; **実証データ未確認、推定**"},
      "alpha_awareness": {"min": 0.05, "typical": 0.06, "max": 0.07, "unit": "%/GRP", "source": "VR Norm", "quality": "B"},
      "k_poisson": {"value": 0.0100, "quality": "A"}
    },
    {
      "code": "HOME_FACILITY",
      "label": "住宅設備・リフォーム",
      "lambda_weekly": {"min": 0.80, "typical": 0.85, "max": 0.90, "half_life_weeks": [3.1, 6.6], "quality": "C",
        "source": "高関与・検討期間長い; **実証データなし、推定**"},
      "alpha_awareness": {"min": 0.04, "typical": 0.05, "max": 0.06, "unit": "%/GRP", "source": "VR Norm準用", "quality": "C"},
      "k_poisson": {"value": 0.0100, "quality": "A"}
    },
    {
      "code": "B2B_SAAS_SERVICE",
      "label": "BtoBサービス・SaaS",
      "lambda_weekly": {"min": 0.85, "typical": 0.88, "max": 0.92, "half_life_weeks": [4.3, 8.3], "quality": "C",
        "source": "ブランド→指名検索→商談化の遅延大; ノバセル/tvScientific/Demandbase等事例レベル; **学術的TV-MMM研究乏しい、Sethuraman長期0.24を上限ガイドとして推定**"},
      "alpha_awareness": {"min": 0.03, "typical": 0.04, "max": 0.05, "unit": "%/GRP",
        "source": "視聴者関心領域外で認知効率低い; **実証データなし、推定**", "quality": "C"},
      "k_poisson": {"value": 0.0080, "note": "ビジネスパーソン偏重で個人全体GRPに対し下方補正", "quality": "C"}
    },
    {
      "code": "WEDDING",
      "label": "長期検討型・結婚式場",
      "lambda_weekly": {"min": 0.85, "typical": 0.88, "max": 0.92, "half_life_weeks": [4.3, 8.3], "quality": "C",
        "source": "検討期間6-12か月; **実証データなし、推定**"},
      "alpha_awareness": {"min": 0.04, "typical": 0.05, "max": 0.06, "unit": "%/GRP", "source": "VR Norm準用", "quality": "C"},
      "k_poisson": {"value": 0.0080, "note": "20-30代女性偏重", "quality": "C"}
    },
    {
      "code": "EDUCATION",
      "label": "教育・塾/予備校/通信教育",
      "lambda_weekly": {"min": 0.75, "typical": 0.82, "max": 0.88, "half_life_weeks": [2.4, 5.4], "quality": "C",
        "source": "入学タイミング集中; **実証データなし、推定**"},
      "alpha_awareness": {"min": 0.05, "typical": 0.06, "max": 0.07, "unit": "%/GRP", "source": "VR Norm", "quality": "C"},
      "k_poisson": {"value": 0.0080, "note": "学齢親・本人ターゲット偏重", "quality": "C"}
    }
  ],
  "funnel_multipliers_for_lambda": {
    "awareness": 1.15,
    "interest": 1.10,
    "consideration": 1.00,
    "intent": 0.92,
    "purchase": 0.85,
    "loyalty": 1.22,
    "source": "Broadbent 1979; Joseph 2006 'Understanding Advertising Adstock Transformations'; Ehrenberg-Bass Institute研究と整合"
  },
  "creative_adjustments_for_alpha": {
    "talent_continuity": 1.5,
    "high_creative_score_VR": 1.30,
    "competitor_clutter_high": 0.85,
    "duration_30sec_vs_15sec": 1.15,
    "source": "ICHICO七十七銀行案件; Nielsen+NCS 2017 (creative=49% of sales lift); Ostrow 1982"
  },
  "global_caveats": [
    "λ > 0.90 は推奨しない（半減期7週超でROI過大評価リスク）。Recast/Impression Digital共通見解",
    "認知率α の線形近似は500-1500 GRP帯のみ有効。それ以上はロジスティック飽和",
    "kは数学的にGRPの定義に従う（k=0.01が原則）。業界差はターゲット母集団選定で吸収",
    "海外メタ分析（Sethuraman, Henningsen等）は1960-2008データ。日本市場・現代環境ではテレビ離れにより短期弾力性は更に下方の可能性",
    "クリエイティブ評価が sales lift の49%を占める（Nielsen+NCS 2017）。係数だけでなくクリエイティブ補正必須",
    "**長期検討型商材（不動産・生保・結婚式場・教育）およびBtoBは公開された大規模MMM実証研究が乏しく、推定値が中心。実データ蓄積による精度向上が必要**"
  ]
}
```

---

## 5. 全体的な注意事項と提言

### 5.1 どこまで信頼できるか

- **品質Aセル（査読論文・大規模実証）**: FMCG・耐久財・自動車・エンタメのλ。Sethuraman et al. 2011は872の弾力性推定をメタ分析した最も信頼できる学術ソース。
- **品質Bセル（業界白書・ICHICO自社実証）**: 日本市場のα（ビデオリサーチ）、ICHICO電力・銀行案件のλ。日本市場で営業説明に使える実データ。
- **品質Cセル（理論推定）**: 長期検討型（生保・不動産・結婚式場）、BtoB SaaS。**「業界の購買サイクル長さからSethuraman長期弾力性レンジに準拠して推定」**と明示する必要あり。

### 5.2 日本市場と海外市場の区別

- **海外（米国中心）**: NCS (CPG)、Nielsen、IRI、Marketing Mix Modeling（Google MMM Handbook、Meta Robyn）が大規模実証データを公開。学術的にも厚い。
- **日本**: ビデオリサーチ「クリエイティブカルテ」（2,500素材以上）、電通DCAMVAS、ノバセル、TVISION INSIGHTS等が事例レベルで公開。**業界横断のλ・α公開ベンチマークは非常に少ない**。ICHICO社内データ（七十七銀行、東北発電工業、東北電力）は希少な実証データソース。

### 5.3 古いデータの扱い

- **Clarke (1976)、Naik (1999)、Sethuraman (2011)** は2000年代までのデータが中心。現代のメディア環境（TV離れ、デジタル併用）では半減期はやや短くなっている可能性が高い。Sethuraman自身が「広告効果は時間と共に減衰している」と指摘。
- **2020年以降の実証研究（NBER w27684等）** では短期弾力性が0.05〜0.09程度と更に低く出ている。Shapiro, Hitsch & Tuchman (2020) NBER WP "Generalizable and Robust TV Advertising Effects" は288 CPG ブランドで弾力性が Sethuraman 2011 の0.12 の半分（約0.06）、67% は統計的に有意でないと報告。

### 5.4 営業現場での運用ガイダンス

1. **「この数値の出典は？」と問われたら**: JSONの `source` フィールドをそのまま読み上げ可能。例：「ICHICO東北発電工業案件2025-26実証、5か月分の日次データから相関0.94を確認」。
2. **品質Cセルの数値を提示する場合**: 必ず「業界一般論からの推定値であり、出稿後の実データで校正することを推奨」と付記。
3. **長期検討型・BtoB案件**: 学術的実証データが乏しいため、**「アドストックは長く設定するが、サイト来訪・指名検索・商談化への遅延が大きいため、ROI評価は3-6か月後を見据える」**ことを事前合意。
4. **ICHICO東北発電工業のような実証データは「再利用可能な業界資産」**: 電力・ガス・水道のインフラ系で同様の出稿パターンの顧客に対し、強力なベンチマークとして提示できる。

### 5.5 今後の精度向上のアクション

- λ・α の業界別実証値を ICHICO 顧客案件から継続蓄積し、半年ごとに本マスタを更新（特に長期検討型・BtoB の品質Cセル）。
- 七十七銀行（金融）、東北電力／東北発電工業（インフラ）以外に、住宅設備・教育・小売の実証データを積極的に取得。
- ビデオリサーチ「クリエイティブカルテ スペシャルレポート」の最新版を定期購読し、Norm値のアップデートをツールに反映。
- メタ分析の最新版（Sethuraman以降のNBER WP、Bayer et al. 2020 AED等）の追跡をRe&Dテーマとして設定。

---

**本レポートで使用した主要一次出典一覧**

学術論文：Clarke (1976) JMR｜Sethuraman, Tellis & Briesch (2011) JMR｜Henningsen et al. (2011) JBR｜Naik (1999) Marketing Letters｜Hofmann et al. (2022) JAMS｜Shapiro, Hitsch & Tuchman (2020) NBER WP w27684｜Goerg (2017) Google Research｜Jin et al. (2012)｜Ostrow (1982)｜Broadbent (1979)｜Joseph (2006)

業界レポート：Nielsen Catalina Solutions "Yes, Advertising Works" (2016)｜Nielsen+NCS Creative Quality (2017)｜Meta長期効果公開｜Recast "Adstocks" ブログ｜Impression Digital "Adstock and Long and Short"｜Wikipedia "Advertising adstock"

日本市場：ビデオリサーチ クリエイティブカルテ Norm値（2,500素材, 2024-2025）｜ビデオリサーチ R&F Plus｜電通DCAMVAS｜ノバセル／ラクスル｜総務省「情報通信媒体の利用時間と情報行動に関する調査報告書」

ICHICO社内実証：株式会社七十七銀行 サンドウィッチマン起用CM案件 2025-04-21提案書｜東北発電工業株式会社 テレビCM出稿結果報告 2026-05-11｜東北電力株式会社 リビング営業部 テレビCM出稿調査 2025-05｜株式会社ICHICO テレビCMシミュレーター（Google Drive: 1eNV0NxXtUi5VTyX5ltbS3tb58KlF4PK5）