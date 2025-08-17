import chalk from "chalk";
import { Events } from "discord.js";
import ms from "ms";

import { Handler } from "@/structures/core/Handler";
import { exchangeLoop } from "@/utils/exchangeLoop";

export default Handler.EventHandler({
  name: Events.ClientReady,
  once: false,
  handle({ bot }) {
    console.log(`${chalk.green(bot.client.user?.tag)} olarak giriş yaptım.`);
    if (process.env.SHARDING_MANAGER! == "true" && parseInt(`${process.env.SHARDS}`) == 0) {
      bot.cooldownHandler.removeInvalidCooldowns();
      setInterval(() => {
        bot.cooldownHandler.removeInvalidCooldowns();
      }, ms("30m"));
    }
    bot.database.connect();

    // Start exchange loop after database connection
    setTimeout(() => {
      exchangeLoop.start(bot);
    }, 5000); // Wait 5 seconds for database to be ready
  }
});
