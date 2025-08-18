import ms from "ms";

import { Handler } from "../../../structures/core/Handler";
import CoinModel from "../../../models/Coin";
import { exchangeLoop } from "../../../utils/exchangeLoop";

export default Handler.CommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("3s")),
  data: (builder) => builder.setName("refreshcoin").setAliases("refcoin", "updatecoin").setAdminOnly(true),
  execute: async (options, message, args) => {
    if (args.length < 1) {
      return await message.reply({
        content:
          "❌ **Usage:** `refreshcoin <coin_id>`\n" +
          "**Example:** `refreshcoin BTC`\n" +
          "**Note:** This will manually trigger a price update for the specified coin."
      });
    }

    const coinId = args[0].toUpperCase();

    try {
      const coin = await CoinModel.findOne({ id: coinId });

      if (!coin) {
        return await message.reply({
          content: `❌ **| ${message.author.displayName}**, No coin found with ID **${coinId}**!`
        });
      }

      const success = await exchangeLoop.refreshCoin(coinId);

      if (success) {
        await message.reply({
          content: `✅ **| ${message.author.displayName}**, Coin **${coinId}** has been successfully refreshed! Check its dedicated channel for the update.`
        });
      } else {
        await message.reply({
          content: `❌ **| ${message.author.displayName}**, Failed to refresh coin **${coinId}**. Please try again.`
        });
      }
    } catch (error) {
      console.error("Error refreshing coin:", error);
      await message.reply({
        content: `❌ **| ${message.author.displayName}**, An error occurred while refreshing the coin. Please try again.`
      });
    }
  }
});
