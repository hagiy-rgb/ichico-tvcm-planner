/**
 * html-to-image の型（node_modules 未インストール時の IDE 用）。
 * ローカルで npm install 済みの場合はパッケージ同梱の型が優先されます。
 */
declare module "html-to-image" {
  export type HtmlToImageOptions = {
    cacheBust?: boolean;
    pixelRatio?: number;
    backgroundColor?: string;
    width?: number;
    height?: number;
    quality?: number;
    filter?: (node: HTMLElement) => boolean;
  };

  export function toPng(
    node: HTMLElement,
    options?: HtmlToImageOptions,
  ): Promise<string>;

  export function toSvg(
    node: HTMLElement,
    options?: HtmlToImageOptions,
  ): Promise<string>;

  export function toJpeg(
    node: HTMLElement,
    options?: HtmlToImageOptions,
  ): Promise<string>;

  export function toBlob(
    node: HTMLElement,
    options?: HtmlToImageOptions,
  ): Promise<Blob | null>;
}
