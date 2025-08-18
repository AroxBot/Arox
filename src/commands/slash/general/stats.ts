import os from "os";

import { EmbedBuilder } from "discord.js";
import ms from "ms";

import { Handler } from "@/structures/core/Handler";
import { formatTimesamp } from "@/utils/discord";
import Bot from "@/config/Bot";

export default Handler.SlashCommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("10s")),
  data: (builder) => builder.autoSet("commands", "status"),
  execute: async (options, interaction) => {
    const client = interaction.client;
    const dbPing = await options.bot.database.ping();

    const uptime = formatTimesamp(client.readyTimestamp!, "R");

    const memoryUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
    const cpuUsage = (os.loadavg()[0] / os.cpus().length).toFixed(2);

    const developers = Bot.developers
      .map((devId) => {
        const user = client.users.cache.get(devId);
        return user ? `▪️ **${user.username}**: [${user.username}](https://discord.com/users/${user.id})` : `▪️ <@${devId}>`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setAuthor({ name: options._t("commands.status.messages.title"), iconURL: client.user?.displayAvatarURL() || undefined })
      .setThumbnail(client.user?.displayAvatarURL() || null)
      .setColor(options._c("default"))
      .addFields(
        {
          name: `**🛠️ ${options._t("commands.status.messages.developers")}**`,
          value: developers,
          inline: false
        },
        {
          name: `**🤖 ${options._t("commands.status.messages.bot_info")}**`,
          value: [
            `▪️ **${options._t("commands.status.messages.uptime")}:** ${uptime}`,
            `▪️ **${options._t("commands.status.messages.servers")}:** ${client.guilds.cache.size}`,
            `▪️ **${options._t("commands.status.messages.users")}:** ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`,
            `▪️ **${options._t("commands.status.messages.channels")}:** ${client.channels.cache.size}`,
            `▪️ **${options._t("commands.status.messages.memory")}:** ${memoryUsage}MB`,
            `▪️ **${options._t("commands.status.messages.cpu")}:** ${cpuUsage}%`
          ].join("\n"),
          inline: false
        },
        {
          name: `**⏱️ ${options._t("commands.status.messages.latency")}**`,
          value: [
            `▪️ **${options._t("commands.status.messages.bot_latency")}**: ${client.ws.ping}ms`,
            `▪️ **${options._t("commands.status.messages.message_latency")}**: ${Date.now() - interaction.createdTimestamp}ms`,
            `▪️ **${options._t("commands.status.messages.db_latency")}**: ${dbPing}ms`
          ].join("\n"),
          inline: false
        },
        {
          name: `**🔗 ${options._t("commands.status.messages.links")}**`,
          value: [
            `▪️ [${options._t("commands.status.messages.support")}](${Bot.links.support})`,
            `▪️ [${options._t("commands.status.messages.invite")}](${Bot.links.invite.replace("YOUR_CLIENT_ID", client.user.id)})`,
            `▪️ [${options._t("commands.status.messages.vote")}](${Bot.links.vote.replace("YOUR_CLIENT_ID", client.user.id)})`,
            `▪️ [${options._t("commands.status.messages.website")}](${Bot.links.website})`
          ].join("\n"),
          inline: false
        }
      )
      .setFooter({
        text: `${options._t("embeds.author_user", { user: interaction.user.username })} • ${new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`,
        iconURL: interaction.user.displayAvatarURL()
      });

    await interaction.reply({ embeds: [embed] });
  }
});
