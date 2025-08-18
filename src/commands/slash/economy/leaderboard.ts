import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import ms from "ms";

import { Handler } from "../../../structures/core/Handler";
import UserModel from "../../../models/User";

export default Handler.SlashCommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("10s")),
  data: (builder) => builder.autoSet("commands", "leaderboard").setAdminOnly(false),
  execute: async (options, interaction) => {
    const users = await UserModel.find({ cash: { $gt: 0 } }).sort({ cash: -1 });

    const userRank = users.findIndex((user) => user.userId === interaction.user.id) + 1;
    const userCash = users.find((user) => user.userId === interaction.user.id)?.cash || 0;

    const itemsPerPage = 10;
    const totalPages = Math.ceil(users.length / itemsPerPage);
    let currentPage = 1;

    const generateEmbed = async (page: number) => {
      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const leaderboardSlice = users.slice(start, end);

      const description = await Promise.all(
        leaderboardSlice.map(async (user, index) => {
          const rank = start + index + 1;
          const fetchedUser = await options.bot.client.users.fetch(user.userId).catch(() => null);
          return `${rank}. ${fetchedUser ? fetchedUser.username : "Bilinmeyen Kullanıcı"} - **${user.cash.toLocaleString()}**`;
        })
      );

      const embed = new EmbedBuilder()
        .setTitle(options._t("commands.leaderboard.messages.title"))
        .setColor(options._c("default"))
        .setThumbnail(options._e("cash", "url"))
        .addFields(
          {
            name: options._t("commands.leaderboard.messages.user_info"),
            value: `${options._t("commands.leaderboard.messages.user_balance")} ${userCash.toLocaleString()}\n${options._t("commands.leaderboard.messages.user_rank")} #${userRank || "N/A"}`
          },
          { name: " ", value: " " },
          {
            name: options._t("commands.leaderboard.messages.global_leaderboard"),
            value: description.join("\n") || options._t("commands.leaderboard.messages.no_one_in_leaderboard")
          }
        )
        .setFooter({
          text: options._t("commands.leaderboard.messages.footer", {
            user: interaction.user.username,
            page: page.toString(),
            totalPages: totalPages.toString()
          })
        });

      return embed;
    };

    const generateButtons = (page: number) => {
      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`leaderboard_back_${page}`)
          .setEmoji(options._e("leftArrow"))
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId(`leaderboard_page_${page}`)
          .setLabel(`${page}/${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId(`leaderboard_forward_${page}`)
          .setEmoji(options._e("rightArrow"))
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages)
      );
    };

    const initialEmbed = await generateEmbed(currentPage);
    const initialButtons = generateButtons(currentPage);

    const message = await interaction.reply({
      embeds: [initialEmbed],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(initialButtons.components)],
      fetchReply: true
    });

    const collector = message.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: ms("1m")
    });

    collector.on("collect", async (i) => {
      if (i.customId.startsWith("leaderboard_back")) {
        currentPage--;
      } else if (i.customId.startsWith("leaderboard_forward")) {
        currentPage++;
      }

      const newEmbed = await generateEmbed(currentPage);
      const newButtons = generateButtons(currentPage);

      await i.update({ embeds: [newEmbed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(newButtons.components)] });
    });

    collector.on("end", async () => {
      const disabledButtons = generateButtons(currentPage);
      disabledButtons.components.forEach((c) => c.setDisabled(true));
      await message.edit({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(disabledButtons.components)] }).catch(() => {});
    });
  }
});
