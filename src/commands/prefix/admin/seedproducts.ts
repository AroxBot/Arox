import ms from "ms";

import { Handler } from "@/structures/core/Handler";
import ProductModel from "@/models/Product";

export default Handler.CommandHandler({
  cooldown: (m) => m.setCooldownTime(ms("5s")),
  data: (b) => b.setName("seedproducts").setAdminOnly(true),
  execute: async (options, message, args) => {
    const isAdmin = options.bot.permissions.isAdmin(message.author.id);
    if (!isAdmin) {
      return message.reply("❌ **| " + message.author.displayName + "**, Unauthorized access!");
    }

    const items = [
      { id: 100, type: "wallpaper" as const, nameId: "wallpaper_100", cost: 1000 },
      { id: 101, type: "wallpaper" as const, nameId: "wallpaper_101", cost: 1000 },
      { id: 102, type: "wallpaper" as const, nameId: "wallpaper_102", cost: 1000 },
      { id: 103, type: "wallpaper" as const, nameId: "wallpaper_103", cost: 1000 },
      { id: 104, type: "wallpaper" as const, nameId: "wallpaper_104", cost: 1000 },
      { id: 105, type: "wallpaper" as const, nameId: "wallpaper_105", cost: 1500 },
      { id: 106, type: "wallpaper" as const, nameId: "wallpaper_106", cost: 1000 },
      { id: 107, type: "wallpaper" as const, nameId: "wallpaper_107", cost: 1000 },
      { id: 108, type: "wallpaper" as const, nameId: "wallpaper_108", cost: 1000 },
      { id: 109, type: "wallpaper" as const, nameId: "wallpaper_109", cost: 1000 },
      { id: 110, type: "wallpaper" as const, nameId: "wallpaper_110", cost: 2000 }
    ];

    try {
      const results = await Promise.all(items.map((it) => ProductModel.updateOne({ id: it.id }, { $set: it }, { upsert: true })));

      const summary: string[] = [];
      let created = 0;
      let updated = 0;

      results.forEach((res: any, i) => {
        const made = res?.upsertedId ? "created" : "updated";
        if (res?.upsertedId) created++;
        else updated++;
        summary.push(`${items[i].id} (${items[i].nameId}) - ${made}`);
      });

      return message.reply(
        [
          "✅ **| " + message.author.displayName + "**, Seeding completed successfully!",
          "```",
          ...summary,
          `\nSummary: created=${created}, updated=${updated}`,
          "```"
        ].join("\n")
      );
    } catch (error) {
      console.error("Error seeding products:", error);
      return message.reply("❌ **| " + message.author.displayName + "**, An error occurred while seeding products.");
    }
  }
});
