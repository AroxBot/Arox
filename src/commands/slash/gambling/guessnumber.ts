import { ActionRow, ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, ContainerBuilder, MessageFlags } from "discord.js";
import { Handler } from "../../../structures/core/Handler";
import UserModel from "../../../models/User";
import ms from "ms";
import { throwError } from "../../../utils/discord";
import { capitalizeWordsRegex } from "@/utils/utils";

export default Handler.SlashCommandHandler({
    cooldown: (manager) => manager.setCooldownTime(ms("5s")),
    data: (builder, options) => {
        builder.autoSet("commands", "guessnumber");
        builder.addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription(options.getDefaultLocalization("commands.guessnumber.options.amount.description"))
                .setNameLocalizations(options.generateLocalization("commands.guessnumber.options.amount.name"))
                .setDescriptionLocalizations(options.generateLocalization("commands.guessnumber.options.amount.description"))
                .setRequired(true)
        );
        return builder;
    },
    execute: async (options, interaction) => {
        console.log(options._e("gn3"))
        const amount = interaction.options.getInteger("amount", true);
        const user = await UserModel.findOne({ userId: interaction.user.id });

        if (!user || user.cash < amount) {
            return await throwError(interaction, options, options._t("commands.guessnumber.messages.not_enough_money"));
        }

        const content = `${options._t("commands.guessnumber.messages.bet", {
            emoji: options._e("guessNumber"),
            name: interaction.user.displayName,
            amount: amount.toLocaleString()
        })}...\n${options._t("commands.guessnumber.messages.select")}`;

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("guessnumber_1")
                .setEmoji(options._e("gn1"))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("guessnumber_2")
                .setEmoji(options._e("gn2"))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("guessnumber_3")
                .setEmoji(options._e("gn3"))
                .setStyle(ButtonStyle.Secondary)
        );

        const message = await interaction.reply({
            content: content,
            components: [buttons],
        })
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: ms("15s"),
            filter: (i: ButtonInteraction) => i.user.id === interaction.user.id,
        });

        collector.on("collect", async (i) => {
            await i.deferUpdate();
            collector.stop();

            const choice = parseInt(i.customId.split("_")[1] as "1" | "2" | "3")
            const result = Math.floor(Math.random() * 3) + 1;
            const won = result === choice;

            let resultMessage = `${options._t("commands.guessnumber.messages.bet", {
                name: interaction.user.displayName,
                amount: amount.toLocaleString(),
                emoji: options._e("gnSpin")
            })} ${options._t("commands.guessnumber.messages.selected", {
                choice: `${options._e(`gn${choice.toString()}`)}`,
            })}\n${options._t("commands.guessnumber.messages.spin")}`;

            if (won) {
                user.cash += amount * 2;
            } else {
                user.cash -= amount;
            }
            await user.save();

            await interaction.editReply({
                content: resultMessage,
                components: [],
            }).catch(() => { /* Ignore errors */ });
            const status = won ? "Win" : "Lose";

            setTimeout(async () => {
                resultMessage = `${options._t("commands.guessnumber.messages.bet", {
                    name: interaction.user.displayName,
                    amount: amount.toLocaleString(),
                    emoji: options._e(`gn${status}`)
                })} ${options._t("commands.guessnumber.messages.selected", {
                    choice: `${options._e(`gn${choice.toString()}`)}`,
                })}\n${options._t("commands.guessnumber.messages.result", {
                    result: `${options._e(`gn${result.toString()}`)}`,
                })} ${won ? options._t("commands.guessnumber.messages.win", {
                    amount: (amount * 3).toLocaleString(),
                }) : options._t("commands.guessnumber.messages.lose")}`;

                await interaction.editReply({
                    content: resultMessage,
                    components: [],
                }).catch(() => { /* Ignore errors */ });
            }, 3000);
        });

        collector.on("end", async (collected) => {
            if (collected.size !== 0) return;
            const disabledButtons = new ActionRowBuilder<ButtonBuilder>();
            disabledButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId("guessnumber_1")
                    .setEmoji(options._e("gn1"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId("guessnumber_2")
                    .setEmoji(options._e("gn2"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId("guessnumber_3")
                    .setEmoji(options._e("gn3"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
        });
    },
});
