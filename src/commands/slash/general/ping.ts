import { EmbedBuilder } from "discord.js";
import ms from "ms";

import { Handler } from "@/structures/core/Handler";

export default Handler.SlashCommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("5s")),
  data: (builder) => builder.autoSet("commands", "ping"),
  execute: async (options, interaction) => {
    const client = interaction.client;
    const dbPing = await options.bot.database.ping();

    const sent = await interaction.reply({ content: options._t("commands.ping.messages.sending"), fetchReply: true });
    const messageLatency = sent.createdTimestamp - interaction.createdTimestamp;

    const embed = new EmbedBuilder()
      .setTitle(options._t("commands.ping.messages.title"))
      .setColor(options._c("default"))
      .setDescription(
        [
          `> 🏓 **${options._t("commands.ping.messages.bot_latency")}**: ${client.ws.ping}ms`,
          `> 💬 **${options._t("commands.ping.messages.message_latency")}**: ${messageLatency}ms`,
          `> 🌐 **${options._t("commands.ping.messages.db_latency")}**: ${dbPing}ms`
        ].join("\n")
      );

    await interaction.reply({ embeds: [embed] });
  }
});
