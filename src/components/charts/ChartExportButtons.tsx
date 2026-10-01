"use client";

import { Button } from "@/components/ui/button";
import { exportElementToPng } from "@/lib/io/image-export";
import { downloadText } from "@/lib/utils/download";

type Props = {
  elementId: string;
  filename: string;
  csv: string;
};

export function ChartExportButtons({ elementId, filename, csv }: Props) {
  const exportPng = async () => {
    const el = document.getElementById(elementId);
    if (!el) return;
    await exportElementToPng(el, filename);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => void exportPng()}>
        PNG
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          downloadText(csv, `${filename}.csv`, "text/csv;charset=utf-8")
        }
      >
        CSV
      </Button>
    </div>
  );
}
