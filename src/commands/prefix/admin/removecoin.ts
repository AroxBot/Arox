import { EmbedBuilder, Message } from "discord.js";
import { Handler } from "../../../structures/core/Handler";
import CoinModel from "../../../models/Coin";
import { exchangeLoop } from "../../../utils/exchangeLoop";
import ms from "ms";

export default Handler.CommandHandler({
    cooldown: (manager) => manager.setCooldownTime(ms("5s")),
    data: (builder) =>
        builder
            .setName("removecoin")
            .setAliases("rcoin", "deletecoin")
            .setAdminOnly(true),
    execute: async (options, message, args) => {
        if (args.length < 1) {
            return await message.reply({
                content: "❌ **Usage:** `removecoin <coin_id>`\n" +
                    "**Example:** `removecoin BTC`\n" +
                    "**Note:** This will permanently delete the coin from database and stop its price updates."
            });
        }

        const coinId = args[0].toUpperCase();

        try {
            // Find the coin
            const coin = await CoinModel.findOne({ id: coinId });

            if (!coin) {
                return await message.reply({
                    content: `❌ **| ${message.author.displayName}**, No coin found with ID **${coinId}**!`
                });
            }

            // Remove from exchange loop first
            exchangeLoop.removeCoin(coinId);

            // Delete messages from channel if they exist
            if (coin.channel) {
                try {
                    const channel = await message.client.channels.fetch(coin.channel);
                    if (channel && channel.isTextBased()) {
                        if (coin.message) {
                            const msg = await channel.messages.fetch(coin.message).catch(() => null);
                            if (msg) await msg.delete().catch(() => { });
                        }
                        if (coin.amessage) {
                            const amsg = await channel.messages.fetch(coin.amessage).catch(() => null);
                            if (amsg) await amsg.delete().catch(() => { });
                        }
                    }
                } catch (error) {
                    console.error(`❌ Error cleaning up messages for ${coinId}:`, error);
                }
            }

            // Store coin info for confirmation message
            const coinInfo = {
                id: coin.id,
                name: coin.name,
                cost: coin.cost,
                color: coin.bcolor
            };

            // Delete from database
            await CoinModel.findOneAndDelete({ id: coinId });

            const embed = new EmbedBuilder()
                .setTitle("🗑️ Coin Successfully Removed!")
                .setColor(coinInfo.color as `#${string}`)
                .addFields(
                    { name: "🆔 Removed ID", value: coinInfo.id, inline: true },
                    { name: "📛 Removed Name", value: coinInfo.name, inline: true },
                    { name: "💰 Last Price", value: `${options._e("cash")} ${coinInfo.cost.toLocaleString()}`, inline: true },
                    { name: "⚠️ Status", value: "Permanently deleted from database", inline: false },
                    { name: "🔄 Exchange Loop", value: "Removed from price updates", inline: false }
                )
                .setFooter({
                    text: `Removed by: ${message.author.username}`,
                    iconURL: message.author.displayAvatarURL()
                })
                .setTimestamp();

            await message.reply({
                embeds: [embed]
            });

            console.log(`🗑️ Coin ${coinId} (${coinInfo.name}) was removed by ${message.author.tag}`);

        } catch (error) {
            console.error("Error removing coin:", error);
            await message.reply({
                content: `❌ **| ${message.author.displayName}**, An error occurred while removing the coin. Please try again.`
            });
        }
    },
});
