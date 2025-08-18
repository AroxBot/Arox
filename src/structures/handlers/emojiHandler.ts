import { ColorResolvable, parseEmoji, RGBTuple } from "discord.js";
import ms from "ms";
import mustache from "mustache";

import emojis from "@/emojis.json";
import { getJSON } from "@/utils/file";
import { isObject } from "@/utils/utils";
import { Client } from "@/structures/core/Bot";
import { Paths } from "@/types/settings";

type EmojiName = keyof typeof emojis;

export class EmojiHandler {
  private emojiList: Record<string, string> = {};
  private colorList: Record<string, number | RGBTuple> = {};
  interval: NodeJS.Timeout = setInterval(() => {
    this.sync();
  }, ms("1m"));
  constructor(
    private _bot: Client,
    private paths: Paths
  ) {
    this.sync();
  }
  sync() {
    this.emojiList = getJSON(this.paths.emojisPath) as Record<string, string>;
    this.colorList = getJSON(this.paths.colorsPath) as Record<string, number | RGBTuple>;
  }

  _e(name: EmojiName | string, key?: string | "url"): string {
    if (key && key !== "url") {
      const parentObject = this.emojiList[name] as any;
      if (parentObject && typeof parentObject === "object" && parentObject[key]) {
        const emoji = parentObject[key];
        const parsedEmoji = parseEmoji(emoji);
        if (!parsedEmoji || !parsedEmoji.id) return emoji;
        return emoji;
      }
      return "🪙";
    }

    const emoji = this.emojiList[name];
    if (!emoji) return "❓";

    const parsedEmoji = parseEmoji(emoji);
    if (!parsedEmoji || !parsedEmoji.id) return emoji;

    if (key === "url") {
      const extension = parsedEmoji.animated ? "gif" : "png";
      return `https://cdn.discordapp.com/emojis/${parsedEmoji.id}.${extension}`;
    }

    return emoji;
  }
  _c(...args: string[]): number | RGBTuple | ColorResolvable | null {
    const text = mustache.render(`{{${args.join(".")}}}`, this.colorList);
    if (!text || text === args.join(".") || isObject(text)) return null;
    else if (typeof text == "string") {
      return parseColor(text) as number | RGBTuple;
    } else return text;
  }

  putEmoji(text: string): string {
    let newText = text;
    for (const key in this.emojiList) {
      const regex = new RegExp(`\\[\\[${key}\\]\\]`, "g");
      newText = newText.replace(regex, this.emojiList[key]);
    }
    return newText;
  }
}
export function parseColor(input: string | number[]): number[] | undefined | number {
  if (Array.isArray(input)) {
    return input;
  }

  if (typeof input === "string" && input.includes(",")) {
    return input.split(",").map((item) => Number(item.trim()));
  }

  if (typeof input === "string") {
    const num = Number(input.trim());
    return isNaN(num) ? undefined : num;
  }

  return undefined;
}
