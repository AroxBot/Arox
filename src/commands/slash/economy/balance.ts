import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  User as DUser,
  ChatInputCommandInteraction,
  UserContextMenuCommandInteraction
} from "discord.js";
import ms from "ms";

import UserModel, { IUser } from "@/models/User";
import { Handler } from "@/structures/core/Handler";
import { DefaultCommandOptions } from "@/types/options/command";

const generateBalanceEmbed = (options: DefaultCommandOptions, target: DUser, user: IUser) => {
  const thumbEmoji = user.cash > 0 ? "walletFull" : "walletEmpty";
  return new EmbedBuilder()
    .setAuthor({
      name: options._t("commands.balance.messages.success.author", {
        user: target.username
      }),
      iconURL: target.displayAvatarURL()
    })
    .addFields(
      {
        name: `${options._e("walletFull")} ${options._t("commands.balance.messages.success.wallet")}`,
        value: `${options._e("cash")} **${user.cash.toLocaleString(options.locale)}**`
      },
      {
        name: `${options._e("bank")} ${options._t("commands.balance.messages.success.bank")}`,
        value: `${options._e("cash")} **${user.bank.toLocaleString(options.locale)}**`
      },
      {
        name: `:moneybag: ${options._t("commands.balance.messages.success.total")}`,
        value: `${options._e("cash")} **${(user.cash + user.bank).toLocaleString(options.locale)}**`
      }
    )
    .setColor(options._c("default"))
    .setThumbnail(options._e(thumbEmoji, "url"));
};

const generateTransactionsEmbed = (options: DefaultCommandOptions, target: DUser, user: IUser) => {
  const transactions = user.transactions.slice(-10).reverse();
  const description =
    transactions.length > 0
      ? transactions
          .map((t) => {
            const typeKey = t.description === "deposit_all" || t.description === "withdraw_all" ? t.description : t.type;
            const type = options._t(`commands.balance.transaction_types.${typeKey}`);
            const sign = t.type === "deposit" ? "+" : "-";
            return `\`${new Date(t.date).toLocaleDateString(options.locale)}\` ${sign}**${t.amount.toLocaleString(options.locale)}** ${options._e("cash")} - ${type}`;
          })
          .join("\n")
      : options._t("commands.balance.messages.error.noTransactions");

  return new EmbedBuilder()
    .setAuthor({
      name: options._t("commands.balance.messages.history.author", {
        user: target.username
      }),
      iconURL: target.displayAvatarURL()
    })
    .setDescription(description)
    .setColor(options._c("default"))
    .setThumbnail(options._e("history", "url"));
};

async function balanceLogic(
  options: DefaultCommandOptions,
  interaction: ChatInputCommandInteraction | UserContextMenuCommandInteraction,
  targetUser: DUser
) {
  const user = await UserModel.findOneAndUpdate({ userId: targetUser.id }, {}, { upsert: true, new: true });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("balance_select")
    .setPlaceholder(options._t("commands.balance.components.select.placeholder"))
    .addOptions([
      {
        label: options._t("commands.balance.components.select.balance.label"),
        value: "balance",
        default: true,
        emoji: options._e("walletFull")
      },
      {
        label: options._t("commands.balance.components.select.history.label"),
        value: "history",
        emoji: options._e("history")
      }
    ]);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const response = await interaction.reply({
    embeds: [generateBalanceEmbed(options, targetUser, user)],
    components: [row]
  });

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    filter: (i) => i.user.id === interaction.user.id,
    time: ms("5m")
  });

  collector.on("collect", async (i) => {
    const value = i.values[0];

    selectMenu.options.forEach((option) => option.setDefault(option.data.value === value));
    const updatedRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const embed = value === "balance" ? generateBalanceEmbed(options, targetUser, user) : generateTransactionsEmbed(options, targetUser, user);

    await i.update({ embeds: [embed], components: [updatedRow] });
  });

  collector.on("end", async (collected, reason) => {
    if (reason === "time") {
      const disabledMenu = new StringSelectMenuBuilder(selectMenu.toJSON()).setDisabled(true);
      const disabledRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(disabledMenu);
      try {
        await response.edit({ components: [disabledRow] });
      } catch (error: any) {
        if (error.code !== 10008) {
          console.error("Error while disabling components:", error);
        }
      }
    }
  });
}

export default Handler.SlashCommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("5s")),
  data: (builder) => builder.autoSet("commands", "balance"),
  execute: async (options, interaction) => {
    const targetUser = interaction.isChatInputCommand()
      ? interaction.options.getUser("user") || interaction.user
      : (interaction as UserContextMenuCommandInteraction).targetUser;
    await balanceLogic(options, interaction, targetUser);
  }
});

export { balanceLogic };
