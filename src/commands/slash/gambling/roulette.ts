import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType } from "discord.js";
import ms from "ms";
import * as converter from "discord-emoji-converter";

import settings from "@/config/Bot";

import { Handler } from "../../../structures/core/Handler";
import UserModel from "../../../models/User";
import { throwError } from "../../../utils/discord";
import { getRandomElements } from "../../../utils/utils";

export default Handler.SlashCommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("5s")),
  data: (builder, options) => {
    builder.autoSet("commands", "roulette");
    builder.addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription(options.getDefaultLocalization("commands.roulette.options.amount.description"))
        .setNameLocalizations(options.generateLocalization("commands.roulette.options.amount.name"))
        .setDescriptionLocalizations(options.generateLocalization("commands.roulette.options.amount.description"))
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

    const content = `${options._t("commands.roulette.messages.bet", {
      emoji: options._e("roulette"),
      name: interaction.user.displayName,
      amount: amount.toLocaleString()
    })}...\n${options._t("commands.roulette.messages.select")}`;

    const colors = ["red", "blue", "yellow", "green", "orange", "purple"];
    const selectedColors = getRandomElements(colors, 4);
    const buttons = new ActionRowBuilder<ButtonBuilder>();
    selectedColors.forEach((color: string) => {
      console.log(color.charAt(0).toUpperCase() + color.slice(1));
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`roulette_${color}`)
          .setEmoji(converter.getEmoji(`${color}_circle`))
          .setStyle(ButtonStyle.Secondary)
      );
    });

    const message = await interaction.reply({
      content: content,
      components: [buttons]
    });
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: ms("15s"),
      filter: (i: ButtonInteraction) => i.user.id === interaction.user.id
    });

    collector.on("collect", async (i) => {
      user = await UserModel.findOne({ userId: interaction.user.id });
      await i.deferUpdate();
      collector.stop();

      if (!user || user.cash < amount) {
        return await throwError(interaction, options, options._t("errors.notEnoughMoney", { currency: settings.currency }));
      }

      const choice = i.customId.split("_")[1];
      const result = colors[Math.floor(Math.random() * colors.length)];
      const won = result === choice;

      if (won) {
        user.cash += amount * colors.length - 1;
      } else {
        user.cash -= amount;
      }
      await user.save();

      let resultMessage = `${options._t("commands.roulette.messages.bet", {
        name: interaction.user.displayName,
        amount: amount.toLocaleString(),
        emoji: options._e("rouletteSpin")
      })} ${options._t("commands.roulette.messages.selected", {
        choice: `${converter.getEmoji(`${choice}_circle`)} ${options._t(`commands.roulette.options.choice.choices.${choice}`)}`
      })}\n${options._t("commands.roulette.messages.spin")}`;
      if (won) {
        user.cash += amount * colors.length;
        await user.save();
      }

      await interaction
        .editReply({
          content: resultMessage,
          components: []
        })
        .catch(() => {
          /* Ignore errors */
        });

      setTimeout(async () => {
        resultMessage = `${options._t("commands.roulette.messages.bet", {
          name: interaction.user.displayName,
          amount: amount.toLocaleString(),
          emoji: options._e(`rouletteLast${result.charAt(0).toUpperCase() + result.slice(1)}` as any)
        })} ${options._t("commands.roulette.messages.selected", {
          choice: `${converter.getEmoji(`${choice}_circle`)} ${options._t(`commands.roulette.options.choice.choices.${choice}`)}`
        })}\n${options._t("commands.roulette.messages.result", {
          result: `${converter.getEmoji(`${result}_circle`)} ${options._t(`commands.roulette.options.choice.choices.${result}`)}`
        })} ${
          won
            ? options._t("commands.roulette.messages.win", {
                amount: (amount * colors.length).toLocaleString()
              })
            : options._t("commands.roulette.messages.lose")
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
      if (collected.size > 0) return;

      const disabledButtons = new ActionRowBuilder<ButtonBuilder>();
      selectedColors.forEach((color: string) => {
        disabledButtons.addComponents(
          new ButtonBuilder()
            .setCustomId(`roulette_${color}`)
            .setEmoji(converter.getEmoji(`${color}_circle`))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );
      });

      await interaction
        .editReply({
          components: [disabledButtons]
        })
        .catch(() => {
          /* Ignore errors */
        });
    });
  }
});
