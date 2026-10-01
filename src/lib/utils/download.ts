export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Excel が日本語を正しく開くよう UTF-8 BOM 付きで保存する */
export function downloadText(
  content: string,
  filename: string,
  mimeType = "text/plain;charset=utf-8",
): void {
  const withBom =
    mimeType.includes("csv") && !content.startsWith("\uFEFF")
      ? `\uFEFF${content}`
      : content;
  const blob = new Blob([withBom], { type: mimeType });
  downloadBlob(blob, filename);
}
