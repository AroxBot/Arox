import { ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, ComponentType } from "discord.js";
import ms from "ms";

import { Handler } from "@/structures/core/Handler";
import UserModel from "@/models/User";
import { AllowedLocale } from "@/structures/handlers/localeHandler";

export default Handler.SlashCommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("10s")),
  data: (builder) => builder.autoSet("commands", "language"),
  execute: async (options, interaction) => {
    const user = await UserModel.findOne({ userId: interaction.user.id });
    const currentLocale = user?.language || options.bot.localeHandler.defaultLocale;

    const embed = new EmbedBuilder()
      .setTitle(options._t("commands.language.messages.title"))
      .setDescription(options._t("commands.language.messages.description"))
      .addFields({
        name: options._t("commands.language.messages.current_language"),
        value: `${options.bot.localeHandler.getFlag(currentLocale)} ${options.bot.localeHandler.getName(currentLocale)}`
      })
      .setColor(options._c("default"))
      .setFooter({
        text: `${interaction.user.username} • ${new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`,
        iconURL: interaction.user.displayAvatarURL()
      });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("language_select")
      .setPlaceholder(options._t("commands.language.components.select.placeholder"))
      .addOptions(
        options.bot.localeHandler.allowedLocales.map((locale) => ({
          label: options.bot.localeHandler.getName(locale),
          value: locale,
          emoji: options.bot.localeHandler.getFlag(locale),
          default: currentLocale === locale
        }))
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const response = await interaction.reply({ embeds: [embed], components: [row] });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: (i) => i.user.id === interaction.user.id,
      time: ms("5m")
    });

    collector.on("collect", async (i) => {
      const newLocale = i.values[0] as AllowedLocale;

      await UserModel.updateOne({ userId: i.user.id }, { language: newLocale }, { upsert: true });

      const newT = options.bot.localeHandler._t.bind(options.bot.localeHandler, newLocale);

      const updatedEmbed = new EmbedBuilder()
        .setTitle(newT("commands.language.messages.title"))
        .setDescription(newT("commands.language.messages.description"))
        .addFields({
          name: newT("commands.language.messages.current_language"),
          value: `${options.bot.localeHandler.getFlag(newLocale)} ${options.bot.localeHandler.getName(newLocale)}`
        })
        .setColor(options._c("success"))
        .setFooter({
          text: `${i.user.username} • ${new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`,
          iconURL: i.user.displayAvatarURL()
        });

      selectMenu.options.forEach((option) => option.setDefault(option.data.value === newLocale));
      const updatedRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      await i.update({ embeds: [updatedEmbed], components: [updatedRow] });
    });

    collector.on("end", async () => {
      const disabledMenu = new StringSelectMenuBuilder(selectMenu.toJSON()).setDisabled(true);
      const disabledRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(disabledMenu);
      try {
        await response.edit({ components: [disabledRow] });
      } catch (error) {
        // Ignore
      }
    });
  }
});
