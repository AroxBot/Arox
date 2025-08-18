import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} from "discord.js";
import ms from "ms";

import settings from "@/config/Bot";
import UserModel from "@/models/User";
import { Handler } from "@/structures/core/Handler";
import { CustomEmbed } from "@/structures/classes/CustomEmbed";
import { throwError } from "@/utils/discord";

export default Handler.SlashCommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("10s")),
  data: (builder) => builder.autoSet("commands", "bank"),
  execute: async (options, interaction) => {
    const user = await UserModel.findOneAndUpdate({ userId: interaction.user.id }, {}, { upsert: true, new: true });

    const generateEmbed = () =>
      new EmbedBuilder()
        .setAuthor({
          name: options._t("commands.bank.messages.success.author", {
            user: interaction.user.displayName
          }),
          iconURL: interaction.user.displayAvatarURL()
        })
        .setDescription(
          `${options._e("bank")} **${options._t("commands.bank.messages.success.bank")}** \`${interaction.user.username}\`\n\n${options._e("blank")} ${options._e("cash")} **${user.bank.toLocaleString()}**`
        )
        .setColor(options._c("default"))
        .setThumbnail(options._e("bank", "url"))
        .setFooter({
          text: options._t("commands.bank.messages.success.footer")
        });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`bank_select`)
      .setPlaceholder(options._t("commands.bank.components.select.placeholder"))
      .addOptions(
        {
          label: options._t("commands.bank.components.select.deposit.label"),
          description: options._t("commands.bank.components.select.deposit.description"),
          value: "deposit",
          emoji: options._e("cash")
        },
        {
          label: options._t("commands.bank.components.select.withdraw.label"),
          description: options._t("commands.bank.components.select.withdraw.description"),
          value: "withdraw",
          emoji: options._e("cash")
        }
      );

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`bank_deposit_all`)
        .setEmoji(options._e("bank_deposit"))
        .setLabel(options._t("commands.bank.components.buttons.depositAll"))
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`bank_withdraw_all`)
        .setEmoji(options._e("bank_withdraw"))
        .setLabel(options._t("commands.bank.components.buttons.withdrawAll"))
        .setStyle(ButtonStyle.Success)
    );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const response = await interaction.reply({
      embeds: [generateEmbed()],
      components: [row, buttons]
    });

    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: ms("5m")
    });

    collector.on("collect", async (i) => {
      const user = await UserModel.findOne({ userId: i.user.id });
      if (!user) return;

      if (i.isStringSelectMenu()) {
        const value = i.values[0];

        if (value === "deposit") {
          if (user.cash <= 0) {
            return await throwError(i, options, options._t("commands.bank.messages.error.noCash"));
          }
        } else if (value === "withdraw") {
          if (user.bank <= 0) {
            return await throwError(i, options, options._t("commands.bank.messages.error.noBank"));
          }
        }

        const modal = new ModalBuilder().setCustomId(`${value}_modal`).setTitle(options._t("commands.bank.modals", value, "title"));

        const amountInput = new TextInputBuilder()
          .setCustomId("amount")
          .setLabel(options._t("commands.bank.modals", value, "label"))
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        if (value === "deposit") {
          amountInput.setMaxLength(user.cash.toString().length);
        } else if (value === "withdraw") {
          amountInput.setMaxLength(user.bank.toString().length);
        }

        const modalRow = new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput);
        modal.addComponents(modalRow);
        await i.showModal(modal);

        const submitted = await i
          .awaitModalSubmit({
            time: 60000,
            filter: (modalInteraction) => modalInteraction.user.id === i.user.id
          })
          .catch(() => null);

        if (submitted) {
          const amount = parseInt(submitted.fields.getTextInputValue("amount"));

          if (isNaN(amount) || amount <= 0) {
            return await throwError(submitted, options, options._t("commands.bank.messages.error.invalidAmount"));
          }

          const embed = new CustomEmbed(options, submitted).successEmbed();

          if (submitted.customId.startsWith("deposit")) {
            if (user.cash < amount) {
              return await throwError(submitted, options, options._t("commands.bank.messages.error.notEnoughCash", { currency: settings.currency }));
            }
            user.cash -= amount;
            user.bank += amount;
            user.transactions.push({ type: "deposit", amount, date: new Date() });
            await user.save();
            embed.setDescription(options._t("commands.bank.messages.success.deposit", { amount: amount.toLocaleString() }));
            await submitted.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          } else if (submitted.customId.startsWith("withdraw")) {
            if (user.bank < amount) {
              return await throwError(submitted, options, options._t("commands.bank.messages.error.notEnoughBank", { currency: settings.currency }));
            }
            user.bank -= amount;
            user.cash += amount;
            user.transactions.push({ type: "withdraw", amount, date: new Date() });
            await user.save();
            embed.setDescription(options._t("commands.bank.messages.success.withdraw", { amount: amount.toLocaleString() }));
            await submitted.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
          }
        }
      } else if (i.isButton()) {
        if (i.customId === "bank_deposit_all") {
          if (user.cash <= 0) {
            return await throwError(i, options, options._t("commands.bank.messages.error.noCash"));
          }
          const embed = new CustomEmbed(options, i).successEmbed();
          embed.setDescription(options._t("commands.bank.messages.success.depositAll", { amount: user.cash.toLocaleString() }));
          user.transactions.push({ type: "deposit", amount: user.cash, date: new Date(), description: "deposit_all" });
          user.bank += user.cash;
          user.cash = 0;
          await user.save();
          await i.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } else if (i.customId === "bank_withdraw_all") {
          if (user.bank <= 0) {
            return await throwError(i, options, options._t("commands.bank.messages.error.noBank"));
          }
          const embed = new CustomEmbed(options, i).successEmbed();
          embed.setDescription(options._t("commands.bank.messages.success.withdrawAll", { amount: user.bank.toLocaleString() }));
          user.transactions.push({ type: "withdraw", amount: user.bank, date: new Date(), description: "withdraw_all" });
          user.cash += user.bank;
          user.bank = 0;
          await user.save();
          await i.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
      }
    });

    collector.on("end", async () => {
      const disabledSelectMenu = new StringSelectMenuBuilder(selectMenu.toJSON()).setDisabled(true);
      const disabledButtons = buttons.components.map((button) => new ButtonBuilder(button.toJSON()).setDisabled(true));

      const disabledRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(disabledSelectMenu);
      const disabledButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(disabledButtons);

      try {
        await response.edit({ components: [disabledRow, disabledButtonRow] });
      } catch (error) {}
    });
  }
});
