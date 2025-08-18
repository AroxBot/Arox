import { Locale } from "discord.js";

import { ProductType } from "@/models/Product";

export type ProductTypeMeta = {
  type: ProductType;
  emoji: string;
  labelKey: string;
  descriptionKey: string;
};

export const PRODUCT_TYPES: Record<ProductType, ProductTypeMeta> = {
  wallpaper: {
    type: "wallpaper",
    emoji: "<:Background:1119357991116873848>",
    labelKey: "products.types.wallpaper.label",
    descriptionKey: "products.types.wallpaper.description"
  }
};

export function translateOrFallback(
  translate: (locale: Locale, ...args: (string | Record<string, any>)[]) => string,
  locale: Locale,
  key: string,
  fallback: string
): string {
  const value = translate(locale, key);
  return !value || value === key ? fallback : value;
}
