import {
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
  ComponentType,
  ChatInputCommandInteraction,
  StringSelectMenuInteraction,
  ButtonInteraction,
  ModalSubmitInteraction
} from "discord.js";
import ms from "ms";

import { capitalizeWordsRegex } from "@/utils/utils";

import { Handler } from "../../../structures/core/Handler";
import UserModel from "../../../models/User";
import CoinModel from "../../../models/Coin";
export default Handler.SlashCommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("3s")),
  data: (builder, options) => {
    builder.autoSet("commands", "exchange");
    return builder;
  },
  execute: async (options, interaction) => {
    const coins = await CoinModel.find();

    if (coins.length === 0) {
      return await interaction.reply({
        content: options._t("commands.exchange.messages.error.no_coins")
      });
    }

    const embed = createExchangeEmbed(options, interaction);
    const row = createExchangeRow(options, coins);

    const message = await interaction.reply({
      embeds: [embed],
      components: [row]
    });

    const selectCollector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300000
    });

    const buttonCollector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000
    });

    selectCollector.on("collect", async (selectInteraction: StringSelectMenuInteraction) => {
      if (selectInteraction.user.id !== interaction.user.id) {
        return await selectInteraction.reply({
          content: options._t("error.noAccess.button"),
          ephemeral: true
        });
      }

      await handleCoinSelection(selectInteraction, options);
    });

    buttonCollector.on("collect", async (buttonInteraction: ButtonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return await buttonInteraction.reply({
          content: options._t("error.noAccess.button"),
          ephemeral: true
        });
      }

      await handleButtonInteraction(buttonInteraction, options, coins, interaction);
    });

    selectCollector.on("end", () => {
      buttonCollector.stop();
    });
  }
});

function createExchangeEmbed(options: any, interaction: ChatInputCommandInteraction): EmbedBuilder {
  return new EmbedBuilder()
    .setAuthor({
      name: options._t("commands.exchange.messages.title"),
      iconURL: interaction.client.user.displayAvatarURL()
    })
    .setThumbnail("https://cdn-icons-png.flaticon.com/512/3310/3310608.png")
    .setColor(options._c("default"))
    .setDescription(options._t("commands.exchange.messages.description"));
}

function createExchangeRow(options: any, coins: any[]): ActionRowBuilder<StringSelectMenuBuilder> {
  const row = new ActionRowBuilder<StringSelectMenuBuilder>();
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("coinsMenu")
    .setDisabled(false)
    .setMaxValues(1)
    .setMinValues(1)
    .setPlaceholder(options._t("commands.exchange.messages.select_coins"));

  for (const coin of coins) {
    const emoji = options._e("coins", coin.id) || "🪙";
    const option = new StringSelectMenuOptionBuilder().setLabel(capitalizeWordsRegex(coin.name)).setValue(coin.id);

    if (emoji !== "🪙") {
      option.setEmoji(emoji);
    }

    selectMenu.addOptions(option);
  }

  row.addComponents(selectMenu);
  return row;
}

async function handleCoinSelection(selectInteraction: StringSelectMenuInteraction, options: any) {
  await selectInteraction.deferUpdate();

  const selectedValue = selectInteraction.values[0];
  const coin = await CoinModel.findOne({ id: selectedValue });

  if (!coin) {
    return await selectInteraction.editReply({
      content: options._t("commands.exchange.messages.error.invalid_option"),
      components: []
    });
  }

  const coinEmoji = options._e("coins", coin.id) || "🪙";
  const previousPrice = coin.lastValues.length > 0 ? coin.lastValues[coin.lastValues.length - 1] : coin.launchCost;

  const embed = new EmbedBuilder()
    .setColor(coin.bcolor as `#${string}`)
    .addFields(
      { name: `📊 ${options._t("commands.exchange.messages.percentage")}`, value: `${coin.percentage}`, inline: true },
      {
        name: `💵 ${options._t("commands.exchange.messages.current_price")}`,
        value: `${options._e("cash")} ${coin.cost.toLocaleString()}`,
        inline: true
      },
      {
        name: `📍 ${options._t("commands.exchange.messages.previous_price")}`,
        value: `${options._e("cash")} ${previousPrice.toLocaleString()}`,
        inline: true
      },
      {
        name: `📤 ${options._t("commands.exchange.messages.launch_cost")}`,
        value: `${options._e("cash")} ${coin.launchCost.toLocaleString()}`,
        inline: true
      },
      {
        name: `📈 ${options._t("commands.exchange.messages.highest_value")}`,
        value: `${options._e("cash")} ${coin.highestValue.toLocaleString()}`,
        inline: true
      },
      {
        name: `📉 ${options._t("commands.exchange.messages.lowest_value")}`,
        value: `${options._e("cash")} ${coin.lowestValue.toLocaleString()}`,
        inline: true
      }
    )
    .setAuthor({
      name: `${capitalizeWordsRegex(coin.name)} (${coin.id.toUpperCase()})`,
      iconURL: options._e(coin.name, "url") || undefined
    })
    .setDescription(options._t("commands.exchange.messages.coin_details"));

  if (coin.chart) {
    embed.setImage(coin.chart);
  }

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setEmoji(options._e("buttonUndo")).setStyle(ButtonStyle.Secondary).setCustomId(`exgeri_${selectInteraction.message.id}`),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Success)
      .setCustomId(`coin_al_${coin.id.toLowerCase()}`)
      .setLabel(options._t("commands.exchange.messages.buy_coin")),
    new ButtonBuilder()
      .setStyle(ButtonStyle.Danger)
      .setCustomId(`coin_sat_${coin.id.toLowerCase()}`)
      .setLabel(options._t("commands.exchange.messages.sell_coin"))
  );

  await selectInteraction.editReply({ embeds: [embed], components: [actionRow] });
}

async function handleButtonInteraction(
  buttonInteraction: ButtonInteraction,
  options: any,
  coins: any[],
  originalInteraction: ChatInputCommandInteraction
) {
  if (buttonInteraction.customId.startsWith("exgeri_")) {
    await buttonInteraction.deferUpdate();
    const embed = createExchangeEmbed(options, originalInteraction);
    const row = createExchangeRow(options, coins);

    await buttonInteraction.editReply({
      embeds: [embed],
      components: [row]
    });
  } else if (buttonInteraction.customId.startsWith("coin_")) {
    const split = buttonInteraction.customId.split("_");
    const coinId = split[2];
    const action = split[1];

    const coin = await CoinModel.findOne({ id: coinId.toUpperCase() });
    if (!coin) return;

    const modal = new ModalBuilder()
      .setCustomId(`mikmodal_${coinId}_${action}`)
      .setTitle(options._t("commands.exchange.messages.amount_modal_title"))
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("miktar")
            .setLabel(
              action === "al" ? options._t("commands.exchange.messages.buy_amount_label") : options._t("commands.exchange.messages.sell_amount_label")
            )
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(3)
        )
      );

    await buttonInteraction.showModal(modal);

    try {
      const modalInteraction = await buttonInteraction.awaitModalSubmit({ time: 60000 });
      await handleModalSubmission(modalInteraction, options, coin, action);
    } catch (error) {}
  }
}

async function handleModalSubmission(modalInteraction: ModalSubmitInteraction, options: any, coin: any, action: string) {
  const userId = modalInteraction.user.id;
  const user = await UserModel.findOneAndUpdate({ userId }, {}, { upsert: true, new: true });

  let amount = parseInt(modalInteraction.fields.getTextInputValue("miktar"));
  amount = isNaN(amount) || amount < 1 ? 1 : amount;

  if (amount > 100) {
    return await modalInteraction.reply({
      content: `${options._e("red")} **| ${modalInteraction.user.displayName}**, ${options._t("commands.exchange.messages.error.max_limit")}`,
      ephemeral: true
    });
  }

  const coinCost = coin.cost;
  const totalCost = Math.floor(coinCost * amount);
  const coinEmoji = options._e("coins", coin.id) || "🪙";
  const userCoins = user.coins.get(coin.name) || 0;

  if (action === "al") {
    if (user.cash < totalCost) {
      return await modalInteraction.reply({
        content: `${options._e("red")} **| ${modalInteraction.user.displayName}**, ${options._t("commands.exchange.messages.error.not_enough_cash", {
          amount: amount.toLocaleString(),
          coinEmoji,
          coinName: capitalizeWordsRegex(coin.name)
        })}`,
        ephemeral: true
      });
    }

    user.cash -= totalCost;
    user.coins.set(coin.name, userCoins + amount);
    await user.save();

    return await modalInteraction.reply({
      content: options._t("commands.exchange.messages.success.buy", {
        coinEmoji,
        user: modalInteraction.user.displayName,
        cost: totalCost.toLocaleString(),
        amount: amount.toLocaleString(),
        coinName: capitalizeWordsRegex(coin.name)
      })
    });
  } else if (action === "sat") {
    if (userCoins < amount) {
      return await modalInteraction.reply({
        content: `${options._e("red")} **| ${modalInteraction.user.displayName}**, ${options._t("commands.exchange.messages.error.not_enough_coins")}`,
        ephemeral: true
      });
    }

    user.cash += totalCost;
    user.coins.set(coin.name, userCoins - amount);
    await user.save();

    return await modalInteraction.reply({
      content: options._t("commands.exchange.messages.success.sell", {
        coinEmoji,
        user: modalInteraction.user.displayName,
        amount: amount.toLocaleString(),
        coinName: capitalizeWordsRegex(coin.name),
        cost: totalCost.toLocaleString()
      })
    });
  }
}
