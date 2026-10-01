"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/utils/number-format";
import { sanitizePerCostInput } from "@/lib/utils/per-cost";

type Props = {
  /** ユーザー上書き値（円/GRP）。未設定・0以下はマスタ値を使用 */
  override: number | undefined;
  /** マスタ既定値（整数円。欠損は0） */
  masterValue: number;
  onCommit: (yen: number) => void;
};

/**
 * 局パーコスト入力（円単位の整数のみ）。
 * 入力途中の文字列はローカルに保持し、確定値（整数円）だけをストアへ渡す。
 * 空欄＝上書き解除（マスタ値）で、フォーカスを外すと確定値の表示に戻る。
 */
export function PerCostField({ override, masterValue, onCommit }: Props) {
  const messageId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const committed = override != null && override > 0 ? override : masterValue;
  const display = draft ?? (committed > 0 ? String(committed) : "");
  const draftYen = draft == null ? null : sanitizePerCostInput(draft);
  const effective =
    draftYen == null ? committed : draftYen > 0 ? draftYen : masterValue;
  const invalid = effective <= 0;

  let message: string | null = null;
  if (invalid) {
    message =
      "円単位の整数で入力してください（この局はマスタ単価がないため入力が必要です）";
  } else if (draft != null && draftYen != null && draftYen > 0) {
    if (draft.trim() !== String(draftYen)) {
      message = `円単位の整数で入力（${formatNumber(draftYen)}円として計算）`;
    }
  } else if (draft != null) {
    message = `空欄・0以下はマスタ値 ${formatNumber(masterValue)}円を使用`;
  }

  return (
    <div>
      <div className="mt-1 flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={display}
          placeholder={masterValue > 0 ? String(masterValue) : "例: 4500"}
          invalid={invalid}
          describedBy={message ? messageId : undefined}
          onChange={(v) => {
            setDraft(v);
            onCommit(sanitizePerCostInput(v));
          }}
          onPaste={(event) => {
            event.preventDefault();
            const yen = sanitizePerCostInput(event.clipboardData.getData("text"));
            setDraft(yen > 0 ? String(yen) : "");
            onCommit(yen);
          }}
          onBlur={() => setDraft(null)}
          className="flex-1"
        />
        <span className="shrink-0 text-xs text-slate-500">円/GRP</span>
      </div>
      {message ? (
        <p
          id={messageId}
          className={`mt-1 text-xs ${invalid ? "text-rose-600" : "text-slate-500"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
