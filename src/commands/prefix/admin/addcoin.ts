import { EmbedBuilder, Message } from "discord.js";
import { Handler } from "../../../structures/core/Handler";
import CoinModel from "../../../models/Coin";
import { exchangeLoop } from "../../../utils/exchangeLoop";
import { writeFileSync, readFileSync } from "fs";
import path from "path";
import ms from "ms";

export default Handler.CommandHandler({
    cooldown: (manager) => manager.setCooldownTime(ms("5s")),
    data: (builder) =>
        builder
            .setName("addcoin")
            .setAliases("acoin")
            .setAdminOnly(true),
    execute: async (options, message, args) => {
        if (args.length < 7) {
            return await message.reply({
                content: "❌ **Usage:** `addcoin <id> <name> <cost> <percentage> <color> <channel_id> <emoji> [high_limit] [low_limit] [chart_url]`\n" +
                    "**Example:** `addcoin BTC bitcoin 50000 +2.5% #f7931a 1234567890123456789 <:Bitcoin:1064159459460517958> 100000 100 https://chart.url`\n" +
                    "**Note:** Emoji will be automatically added to emojis.json and available immediately"
            });
        }

        const id = args[0].toUpperCase();
        const name = args[1].toLowerCase();
        const cost = parseInt(args[2]);
        const percentage = args[3];
        const color = args[4];
        const channelId = args[5];
        const emoji = args[6];
        const highLimit = parseInt(args[7]) || cost * 2; // Default: 2x launch cost
        const lowLimit = parseInt(args[8]) || Math.floor(cost * 0.1); // Default: 10% of launch cost
        const chartURL = args[9] || null;

        // Validate inputs
        if (isNaN(cost) || cost < 1 || cost > 1000000) {
            return await message.reply({
                content: "❌ **| " + message.author.displayName + "**, Cost must be a number between 1 and 1,000,000!"
            });
        }

        if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
            return await message.reply({
                content: "❌ **| " + message.author.displayName + "**, Invalid color format! Please use hex format like #ffffff"
            });
        }

        if (id.length > 10) {
            return await message.reply({
                content: "❌ **| " + message.author.displayName + "**, Coin ID must be 10 characters or less!"
            });
        }

        if (name.length > 50) {
            return await message.reply({
                content: "❌ **| " + message.author.displayName + "**, Coin name must be 50 characters or less!"
            });
        }

        // Check if coin already exists
        const existingCoin = await CoinModel.findOne({
            $or: [{ id }, { name }]
        });

        if (existingCoin) {
            return await message.reply({
                content: `❌ **| ${message.author.displayName}**, A coin with ID **${id}** or name **${name}** already exists!`
            });
        }

        try {
            // Create new coin
            const newCoin = new CoinModel({
                id,
                name,
                cost,
                percentage,
                bcolor: color,
                launchCost: cost,
                highestValue: cost,
                lowestValue: cost,
                highLimit,
                lowLimit,
                lastValues: [cost],
                lastDates: [],
                chart: chartURL || null,
                channel: channelId,
                cr: ""
            });

            await newCoin.save();

            // Add emoji to emojis.json
            try {
                const emojiPath = path.join(process.cwd(), 'src', 'emojis.json');
                const emojisData = JSON.parse(readFileSync(emojiPath, 'utf-8'));

                // Add to coins section
                if (!emojisData.coins) {
                    emojisData.coins = {};
                }
                emojisData.coins[id] = emoji;

                // Also add to main emojis
                emojisData[name] = emoji;

                // Write back to file
                writeFileSync(emojiPath, JSON.stringify(emojisData, null, 4), 'utf-8');

                console.log(`✅ Added emoji ${emoji} for coin ${id} to emojis.json`);
            } catch (emojiError) {
                console.error('❌ Error adding emoji to emojis.json:', emojiError);
                // Continue with coin creation even if emoji addition fails
            }

            // Add coin to exchange loop
            await exchangeLoop.addCoin(id);

            const embed = new EmbedBuilder()
                .setTitle("✅ Coin Successfully Added!")
                .setColor(color as `#${string}`)
                .addFields(
                    { name: "🆔 ID", value: id, inline: true },
                    { name: "📛 Name", value: name, inline: true },
                    { name: "💰 Price", value: `${options._e("cash")} ${cost.toLocaleString()}`, inline: true },
                    { name: "📊 Percentage", value: percentage, inline: true },
                    { name: "🎨 Color", value: color, inline: true },
                    { name: "😀 Emoji", value: options._e("coins", id) || "🪙", inline: true }
                )
                .setFooter({
                    text: `Added by: ${message.author.username}`,
                    iconURL: message.author.displayAvatarURL()
                })
                .setTimestamp();

            if (chartURL) {
                embed.setImage(chartURL);
            }

            await message.reply({
                embeds: [embed]
            });

        } catch (error) {
            console.error("Error adding coin:", error);
            await message.reply({
                content: `❌ **| ${message.author.displayName}**, An error occurred while adding the coin. Please try again.`
            });
        }
    },
});
