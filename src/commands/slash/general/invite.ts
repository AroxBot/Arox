import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import ms from "ms";

import { Handler } from "@/structures/core/Handler";
import Bot from "@/config/Bot";

export default Handler.SlashCommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("5s")),
  data: (builder) => builder.autoSet("commands", "invite"),
  execute: async (options, interaction) => {
    const content = `👋 | ${options._t("commands.invite.messages.description", { user: interaction.user.username })}`;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel(options._t("commands.invite.messages.button"))
        .setStyle(ButtonStyle.Link)
        .setURL(Bot.links.invite.replace("YOUR_CLIENT_ID", interaction.client.user.id))
    );

    await interaction.reply({ content: content, components: [row] });
  }
});
