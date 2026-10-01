export type LogicExplanation = {
  id: string;
  title: string;
  summary: string;
  formula: string;
  notes: string[];
};

export const LOGIC_EXPLANATIONS: Record<string, LogicExplanation> = {
  reach: {
    id: "reach",
    title: "リーチ率の計算",
    summary:
      "視聴者のCM接触回数がポアソン分布に従うと仮定し、有効フリークエンシー以上に接触した人の割合を求めます。",
    formula: "リーチ率 = 1 − POISSON_CDF(F−1, k × 絵柄補正 × GRP)",
    notes: [
      "k（CM効果係数）は industry_coefficients.json の業界別値を使用します。",
      "絵柄補正は pattern_definitions.json の default_coefficient_vs_average です。",
      "表示ラベルは [標準精度] です（業界経験則ベース、誤差±20〜30%目安）。",
    ],
  },
  cpm: {
    id: "cpm",
    title: "CPMの計算",
    summary: "出稿費用をインプレッション数（GRP×人口）で割った指標です。",
    formula: "CPM = 出稿総額 ÷ (GRP × 視聴人口 ÷ 1,000)",
    notes: [
      "出稿総額 = Σ(局GRP × 局パーコスト)（絵柄別の局単価を局GRP配分で加重）。",
      "パーコストは master_data.json の station_cost_master（整数円に四捨五入）または局別の上書き値を使用します。",
    ],
  },
  reachUnitPrice: {
    id: "reachUnitPrice",
    title: "リーチ人数単価の計算",
    summary: "リーチした1人あたりにかかる費用です（web動画との比較に適します）。",
    formula: "リーチ人数単価 [円/人] = 出稿総額 ÷ リーチ人数",
    notes: [
      "web動画のターゲットリーチ単価と比較する主指標です。",
      "リーチ1%あたりの単価 [円/%] = 出稿総額 ÷ リーチ率[%] も併記します。",
      "GRPを増やすと人数単価は一般に下がったあと逓減で再上昇します。",
    ],
  },
  budget: {
    id: "budget",
    title: "出稿総額の計算",
    summary: "局へ按分したGRPと局別パーコストから出稿費用を積み上げます。",
    formula:
      "出稿総額 = Σ(局GRP_i × 局パーコスト_i)、局GRP_i = 総GRP × 配分比率_i（コスト加重: (1/パーコスト_i) ÷ Σ(1/パーコスト)／均等: 1 ÷ 局数／手入力: 指定比率）",
    notes: [
      "表示のパーコストは局GRP配分で加重した平均単価（出稿総額 ÷ 総GRP）です。",
      "宮城エリアのコストは仙台局群（TBC・OX・MMT・KHB等）の局別単価を使用します。",
      "CM秒数は30秒基準でパーコストと実効GRP（リーチ・認知）に反映します（15秒=0.5倍、60秒=2倍）。",
    ],
  },
  optimalGrp: {
    id: "optimalGrp",
    title: "最効率GRPの算出",
    summary:
      "ターゲットのリーチカーブ上の最安リーチ単価に加え、web動画比較・限界効率の2方式で参考GRPを提案します。",
    formula:
      "方式C: min(出稿総額÷リーチ率[%]) on カーブ／方式A（web動画との効率比較）: 出稿総額÷(リーチ人数/1000) ≦ webベンチマーク単価×1000／方式B: d(リーチ)/d(GRP) がピーク値の50%まで低下したGRP",
    notes: [
      "方式A・B・Cとも本計算と同じ局合成リーチ（局GRP按分・CM秒数の実効GRP・dayparts実測k）で評価します。",
      "方式Cはリーチカーブの離散GRP点から選びます。",
      "方式AはTVの「リーチ千人あたりコスト（円/千人）」とweb動画の「千再生あたりコスト（円/千再生）」を同一次元で比較し、TVが web 以下になる最小GRPを返します（探索範囲内で達しない場合は「効率が逆転せず」）。ベンチマークは planning_benchmarks.web_video_cpm_yen（円/1再生）です。",
      "方式Bは1GRP刻みの数値探索です。有効F≥2ではリーチはS字カーブになり限界効率は低GRPでほぼ0のため、GRP=1ではなくピーク値を基準にします。",
    ],
  },
  station: {
    id: "station",
    title: "局合成リーチ（Sainsbury式）",
    summary:
      "各局のリーチを重複補正して合成し、エリア全体のリーチ率とします。",
    formula: "Reach = 1 − ∏(1 − Reach_i × √(1−ρ))",
    notes: [
      "ρ は planning_benchmarks.station_inter_correlation_default から取得します。",
      "GRPは選択局へ按分します（既定: 局パーコストの逆数に比例するコスト加重＝安い局に厚く／均等／手入力も選択可）。局別人口はマスタから推定します。",
      "曜日時間区分インポート時は高精度モードでρを推定（今後拡張）。",
    ],
  },
  displayUnitPrice: {
    id: "displayUnitPrice",
    title: "ターゲット表示単価の計算",
    summary:
      "出稿金額をターゲットののべ表示回数で割った単価です。web広告のインプレッション単価と同義の見方です。",
    formula:
      "ターゲット表示単価 [円/回] = 出稿総額 ÷ ((GRP ÷ 100) × ターゲット人口)",
    notes: [
      "(GRP/100)×ターゲット人口 は、ターゲット母集団に対するのべ接触回数（インプレッション相当）です。",
      "1GRPはターゲット人口の1%分の視聴量に相当するため、のべ表示回数 = GRP × 人口 ÷ 100 となります。",
      "リーチ人数単価（到達した人あたり）とは次元が異なります。表示単価は接触回数ベース、人数単価はユニーク到達ベースです。",
    ],
  },
  reachMaxAllocation: {
    id: "reachMaxAllocation",
    title: "予算内リーチ最大化配分",
    summary:
      "出稿総額を固定したまま、選択局への金額配分を変えて合成リーチ人数が最大になる配分を探索します。既定は実務寄り（最低・最大シェア制約付き）です。",
    formula:
      "予算Bをチャンク分割し、各ステップで限界リーチ増分が最大の局へ投下（貪欲法）。実務寄りは先に全局へ最低シェアを配り、1局あたり上限（既定40%、実行可能性で補正）を超えないよう残りを配分",
    notes: [
      "実務寄り: 各局に均等配分の半分以上を保証し、1局への集中を抑えます（4局なら最低約12.5%、最大約40%）。",
      "理論最大: 制約なしの純粋最大化。安い局に予算が集中し、1〜2局に寄りやすいです。",
      "結果は手入力配分として適用されます。コスト加重・均等への切替も可能です。",
    ],
  },
  awareness: {
    id: "awareness",
    title: "広告認知率の計算",
    summary:
      "Koyck型アドストックでCM効果の残存を積み上げ、飽和式（Michaelis–Menten型）で認知率に変換します。",
    formula:
      "Adstock_t = α × GRP_t × 絵柄補正 + λ × Adstock_(t-1)、認知率[%] = MaxAwareness × Adstock_t ÷ (Adstock_t + K)",
    notes: [
      "λ・α は industry_coefficients.json の業界別値、MaxAwareness（既定30%）・K（既定50）は model_definition.awareness_saturation_default を起点にチューニングできます（FSD §3.8）。",
      "Adstock = K で認知率は MaxAwareness の半分。GRPを積むほど MaxAwareness に漸近し、100%に張り付くことはありません。",
      "認知率 / MaxAwareness が20%未満は立ち上がり域（K の誤差が効きやすい）、80%以上は飽和域（追加GRPの上積みが小さい）として注記します。",
      "絵柄補正はリーチ計算と同じ k 補正係数を Adstock 投入量に適用します。",
      "期間粒度: アドストックは期間（週または月）単位で1ステップ進めます。内部の基準は週次 λ_w で、月次は λ_m = λ_w^4.345（1か月＝4.345週、industry_coefficients.json の period_conversion）に換算します。",
      "月次の当期効果は、月内に均等投下したとみなして α × (1−λ_m) ÷ (4.345 × (1−λ_w)) に補正します（時間集計バイアスの補正）。同じ投下量なら月末時点の Adstock は週次計算と一致し、定常的な認知水準は粒度に依存しません。",
      "制約: 月次では月内の前厚・後厚やフライト（空白週）を表現できません。月内の投下タイミングが重要な場合は週次で計画してください。リーチ（ポアソン）はキャンペーン合計GRPで計算するため粒度の影響を受けません。",
    ],
  },
};
