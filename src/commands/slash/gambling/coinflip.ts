import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, ContainerBuilder, MessageFlags } from "discord.js";
import ms from "ms";

import settings from "@/config/Bot";

import { Handler } from "../../../structures/core/Handler";
import UserModel from "../../../models/User";
import { throwError } from "../../../utils/discord";

export default Handler.SlashCommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("5s")),
  data: (builder, options) => {
    builder.autoSet("commands", "coinflip");
    builder.addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription(options.getDefaultLocalization("commands.coinflip.options.amount.description"))
        .setNameLocalizations(options.generateLocalization("commands.coinflip.options.amount.name"))
        .setDescriptionLocalizations(options.generateLocalization("commands.coinflip.options.amount.description"))
        .setRequired(true)
    );
    return builder;
  },
  execute: async (options, interaction) => {
    const amount = interaction.options.getInteger("amount", true);
    let user = await UserModel.findOne({ userId: interaction.user.id });

    if (!user || user.cash < amount) {
      return await throwError(interaction, options, options._t("errors.notEnoughMoney", { currency: settings.currency }));
    }

    const content = `${options._t("commands.coinflip.messages.bet", {
      emoji: options._e("tails"),
      name: interaction.user.displayName,
      amount: amount.toLocaleString()
    })}...\n${options._t("commands.coinflip.messages.select")}`;

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("coinflip_heads")
        .setEmoji(options._e("heads"))
        .setStyle(ButtonStyle.Secondary)
        .setLabel(options._t("commands.coinflip.options.choice.choices.heads")),
      new ButtonBuilder()
        .setCustomId("coinflip_tails")
        .setEmoji(options._e("tails"))
        .setStyle(ButtonStyle.Secondary)
        .setLabel(options._t("commands.coinflip.options.choice.choices.tails"))
    );

    const message = await interaction.reply({
      content: content,
      components: [buttons],
      fetchReply: true
    });
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: ms("15s"),
      filter: (i: ButtonInteraction) => i.user.id === interaction.user.id
    });

    collector.on("collect", async (i) => {
      await i.deferUpdate();
      collector.stop();
      user = await UserModel.findOne({ userId: interaction.user.id });

      if (!user || user.cash < amount) {
        return await throwError(interaction, options, options._t("errors.notEnoughMoney", { currency: settings.currency }));
      }
      const choice = i.customId.split("_")[1] as "heads" | "tails";
      const result = Math.random() < 0.5 ? "heads" : "tails";
      const won = result === choice;

      let resultMessage = `${options._t("commands.coinflip.messages.bet", {
        name: interaction.user.displayName,
        amount: amount.toLocaleString(),
        emoji: options._e("coinflip")
      })} ${options._t("commands.coinflip.messages.selected", {
        choice: options._t(`commands.coinflip.options.choice.choices.${choice}`).toLowerCase()
      })}\n${options._t("commands.coinflip.messages.spin")}`;

      if (won) {
        user.cash += amount;
      } else {
        user.cash -= amount;
      }
      await user.save();

      await interaction
        .editReply({
          content: resultMessage,
          components: []
        })
        .catch(() => {
          /* Ignore errors */
        });

      setTimeout(async () => {
        resultMessage = `${options._t("commands.coinflip.messages.bet", {
          name: interaction.user.displayName,
          amount: amount.toLocaleString(),
          emoji: options._e(result)
        })} ${options._t("commands.coinflip.messages.selected", {
          choice: options._t(`commands.coinflip.options.choice.choices.${choice}`).toLowerCase()
        })}\n${options._t("commands.coinflip.messages.result", {
          result: options._t(`commands.coinflip.options.choice.choices.${result}`).toLowerCase()
        })} ${
          won
            ? options._t("commands.coinflip.messages.win", {
                amount: (amount * 2).toLocaleString()
              })
            : options._t("commands.coinflip.messages.lose")
        }`;

        await interaction
          .editReply({
            content: resultMessage,
            components: []
          })
          .catch(() => {
            /* Ignore errors */
          });
      }, 1500);
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        const timeoutContainer = new ContainerBuilder().addTextDisplayComponents((d) =>
          d.setContent(options._t("commands.coinflip.messages.timeout"))
        );
        await interaction.editReply({ components: [timeoutContainer], flags: MessageFlags.IsComponentsV2 });
      }
    });
  }
});
