import ms from "ms";

import { Handler } from "../../../structures/core/Handler";

export default Handler.CommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("10s")),
  data: (builder) => builder.setName("deploycommands").setAliases("deploy").setAdminOnly(true),
  execute: async (options, message) => {
    try {
      await options.bot.registerCommands();
      await message.reply({ content: "Komutlar başarıyla deploy edildi." });
    } catch (error) {
      console.error("Komutları deploy ederken bir hata oluştu:", error);
      await message.reply({ content: "Komutları deploy ederken bir hata oluştu." });
    }
  }
});
