import { toPng } from "html-to-image";
import { sanitizeFilename } from "@/lib/io/export";
import { downloadBlob } from "@/lib/utils/download";

export async function exportElementToPng(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
  });
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  downloadBlob(blob, `${sanitizeFilename(filename)}.png`);
}
