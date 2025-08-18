import ms from "ms";

import { Handler } from "@/structures/core/Handler";
import ProductModel from "@/models/Product";
import { throwError } from "@/utils/discord";

export default Handler.CommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("3s")),
  data: (builder) => builder.setName("addproduct").setAliases("aprod", "addp").setAdminOnly(true),
  execute: async (options, message, args) => {
    // Usage: addproduct <id:number> <type:wallpaper> <nameId:string> <cost:number> [emoji]
    if (args.length < 4) {
      return await throwError(message, options, "Usage: addproduct <id:number> <type:wallpaper> <nameId> <cost:number> [emoji]");
    }

    const idRaw = args[0];
    const typeRaw = (args[1] || "").toLowerCase();
    const nameId = args[2];
    const costRaw = args[3];
    const emoji = args[4] ?? (typeRaw === "wallpaper" ? "🖼️" : "🛒");

    const id = Number(idRaw);
    const cost = Number(costRaw);

    if (!Number.isInteger(id) || id <= 0) {
      return await throwError(message, options, "Invalid id. It must be a positive integer.");
    }
    if (typeRaw !== "wallpaper") {
      return await throwError(message, options, "Invalid type. Currently supported: wallpaper");
    }
    if (!nameId || typeof nameId !== "string") {
      return await throwError(message, options, "Invalid nameId. Provide a non-empty string.");
    }
    if (!Number.isFinite(cost) || cost < 0) {
      return await throwError(message, options, "Invalid cost. It must be a non-negative number.");
    }

    const exists = await ProductModel.findOne({ id }).lean().exec();
    if (exists) {
      return await throwError(message, options, `Product with id ${id} already exists.`);
    }

    await ProductModel.create({
      id,
      type: "wallpaper",
      nameId,
      cost,
      emoji
    });

    await message.reply({
      content: [
        "✅ Product created:",
        `• id: ${id}`,
        `• type: wallpaper`,
        `• nameId: ${nameId}`,
        `• cost: ${cost.toLocaleString()}`,
        `• emoji: ${emoji}`
      ].join("\n")
    });
  }
});
