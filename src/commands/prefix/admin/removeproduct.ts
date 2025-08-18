import ms from "ms";

import { Handler } from "@/structures/core/Handler";
import ProductManager from "@/structures/handlers/productManager";
import { throwError } from "@/utils/discord";

/**
 * Usage examples:
 * - removeproduct 105
 * - rmprod 110
 * - delproduct 100
 */
export default Handler.CommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("3s")),
  data: (builder) => builder.setName("removeproduct").setAliases("rmprod", "delproduct", "remp").setAdminOnly(true),
  execute: async (options, message, args) => {
    if (args.length < 1) {
      return await throwError(message, options, "Usage: removeproduct <id:number>");
    }

    const id = Number(args[0]);
    if (!Number.isInteger(id) || id <= 0) {
      return await throwError(message, options, "Invalid id. It must be a positive integer.");
    }

    try {
      const pm = new ProductManager(options.bot);
      const existed = await pm.deleteProduct(id);
      if (!existed) {
        return await throwError(message, options, `Product with id ${id} was not found.`);
      }

      await message.reply({
        content: `✅ Product removed: id ${id}`
      });
    } catch (e: any) {
      await throwError(message, options, e?.message || "Unknown error.");
    }
  }
});
