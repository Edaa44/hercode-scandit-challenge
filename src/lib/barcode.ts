// Decoupled barcode processing. Camera and manual entry both call
// `processBarcode` — when we later wire SparkScan or any other scanner, it
// just calls the same function with `source: "camera"`.

import productsData from "@/data/products.json";
import { findProductByBarcode } from "@/lib/catalog";
import type { Product } from "@/lib/types";

export type BarcodeSource = "manual" | "camera";

export type BarcodeResult =
  | { ok: true; product: Product; code: string; source: BarcodeSource }
  | { ok: false; reason: "empty" | "not-found"; code: string; source: BarcodeSource };

const ALL_PRODUCTS = productsData as unknown as Product[];

/** Normalise raw input from a keyboard or scanner — strip spaces, etc. */
export function normaliseBarcode(raw: string): string {
  return String(raw ?? "").replace(/\s+/g, "").trim();
}

/**
 * Single entry point for ANY barcode workflow.
 * The future camera scanner just calls this with `source: "camera"`.
 */
export function processBarcode(
  raw: string,
  opts: { source?: BarcodeSource } = {},
): BarcodeResult {
  const source = opts.source ?? "manual";
  const code = normaliseBarcode(raw);
  if (!code) return { ok: false, reason: "empty", code, source };
  const product = findProductByBarcode(ALL_PRODUCTS, code);
  if (!product) return { ok: false, reason: "not-found", code, source };
  return { ok: true, product, code, source };
}

export function allProducts(): Product[] {
  return ALL_PRODUCTS;
}
