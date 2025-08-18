import ms from "ms";

import { Handler } from "@/structures/core/Handler";
import ProductManager from "@/structures/handlers/productManager";
import { throwError } from "@/utils/discord";
import { ProductType } from "@/models/Product";

type PatchKey = "cost" | "nameId" | "emoji" | "type";

/**
 * Usage examples:
 * - editproduct 105 cost=2500
 * - editproduct 110 nameId=wallpaper_110_new emoji=🖼️
 * - editproduct 100 type=wallpaper nameId=wallpaper_100 cost=0 emoji=🖼️
 */
export default Handler.CommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("3s")),
  data: (builder) => builder.setName("editproduct").setAliases("eprod", "editp").setAdminOnly(true),
  execute: async (options, message, args) => {
    if (args.length < 2) {
      return await throwError(message, options, "Usage: editproduct <id:number> <key=value> [key=value]...\nKeys: cost, nameId, emoji, type");
    }

    const id = Number(args[0]);
    if (!Number.isInteger(id) || id <= 0) {
      return await throwError(message, options, "Invalid id. It must be a positive integer.");
    }

    const rawPairs = args.slice(1);
    const patch: Partial<Record<PatchKey, any>> = {};

    for (const token of rawPairs) {
      const eqIndex = token.indexOf("=");
      if (eqIndex === -1) {
        return await throwError(message, options, `Invalid pair: '${token}'. Expected key=value`);
      }
      const key = token.slice(0, eqIndex) as PatchKey;
      const value = token.slice(eqIndex + 1);

      if (!["cost", "nameId", "emoji", "type"].includes(key)) {
        return await throwError(message, options, `Invalid key '${key}'. Allowed: cost, nameId, emoji, type`);
      }

      if (key === "cost") {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) return await throwError(message, options, "Invalid cost (must be ≥ 0).");
        patch.cost = n;
      } else if (key === "nameId") {
        if (!value) return await throwError(message, options, "Invalid nameId.");
        patch.nameId = value;
      } else if (key === "emoji") {
        if (!value) return await throwError(message, options, "Invalid emoji.");
        patch.emoji = value;
      } else if (key === "type") {
        const t = value.toLowerCase() as ProductType;
        if (t !== "wallpaper") return await throwError(message, options, "Invalid type. Supported: wallpaper");
        (patch as any).type = t;
      }
    }

    try {
      const pm = new ProductManager(options.bot);
      const before = await pm.getProduct(id);
      if (!before) return await throwError(message, options, `Product with id ${id} was not found.`);

      const after = await pm.editProduct(id, patch as any);
      if (!after) return await throwError(message, options, "Edit failed unexpectedly.");

      const lines: string[] = [];
      if (patch.cost !== undefined) lines.push(`• cost: ${before.cost.toLocaleString()} → ${after.cost.toLocaleString()}`);
      if (patch.nameId !== undefined) lines.push(`• nameId: ${before.nameId} → ${after.nameId}`);
      if (patch.emoji !== undefined) lines.push(`• emoji: ${before.emoji ?? "–"} → ${after.emoji ?? "–"}`);
      if ((patch as any).type !== undefined) lines.push(`• type: ${before.type} → ${after.type}`);

      await message.reply({
        content: ["✅ Product updated:", `id: ${id}`, ...(lines.length ? lines : ["No changes"])].join("\n")
      });
    } catch (e: any) {
      await throwError(message, options, e?.message || "Unknown error.");
    }
  }
});
