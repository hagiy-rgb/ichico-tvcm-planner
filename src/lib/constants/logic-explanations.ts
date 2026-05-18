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
      "出稿総額 = GRP × パーコスト（絵柄別の局平均単価）。",
      "パーコストは master_data.json の station_cost_master から取得します。",
    ],
  },
  reachUnitPrice: {
    id: "reachUnitPrice",
    title: "リーチ単価の計算",
    summary: "リーチ率1ポイント（1%）を得るのに必要な費用です。",
    formula: "リーチ単価 [円/%] = 出稿総額 ÷ リーチ率 [%]",
    notes: [
      "リーチ率が低いほどリーチ単価は高くなります。",
      "GRPを増やすとリーチ単価は一般に下がる傾向があります（逓減）。",
    ],
  },
  budget: {
    id: "budget",
    title: "出稿総額の計算",
    summary: "GRPとパーコストから出稿費用を見積もります。",
    formula: "出稿総額 = GRP × パーコスト",
    notes: [
      "宮城エリアのコストは仙台局群（TBC・OX・MMT・KHB等）の平均を使用します。",
      "秒数による単価差は今後のフェーズで反映予定です。",
    ],
  },
  optimalGrp: {
    id: "optimalGrp",
    title: "最効率GRPの算出",
    summary:
      "web動画とのコスト比較と、限界リーチ効率の逓減の2方式で、参考となるGRPを提案します。",
    formula:
      "方式A: リーチ単価 ≈ web動画CPM（master_data.json）／方式B: d(リーチ)/d(GRP) が初期値の50%になるGRP",
    notes: [
      "方式Aの web CPM は planning_benchmarks.web_video_cpm_yen から読み込みます。",
      "方式Bはポアソンリーチモデル上の数値探索です。",
      "提案GRPは現在入力中のGRPとは独立です。",
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
      "GRPは選択局に均等配分し、局別人口はマスタから推定します。",
      "曜日時間区分インポート時は高精度モードでρを推定（今後拡張）。",
    ],
  },
  awareness: {
    id: "awareness",
    title: "広告認知率の計算",
    summary:
      "Koyck型アドストックでCM効果の残存を週次で積み上げ、線形近似で認知率に変換します。",
    formula:
      "Adstock_t = α × GRP_t × 絵柄補正 + λ × Adstock_(t-1)、認知率[%] = α_awareness × Adstock_t",
    notes: [
      "λ・α・α_awareness は industry_coefficients.json の業界別値を起点にチューニングできます。",
      "線形近似は合計GRP 500〜1500帯で有効（マスタ global_caveats 参照）。",
      "絵柄補正はリーチ計算と同じ k 補正係数を Adstock 投入量に適用します。",
    ],
  },
};
