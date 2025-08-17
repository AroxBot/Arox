import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { Handler } from "../../../structures/core/Handler";
import UserModel from "../../../models/User";
import ms from "ms";
import { throwError } from "../../../utils/discord";

export default Handler.SlashCommandHandler({
    cooldown: (manager) => manager.setCooldownTime(ms("10s")),
    data: (builder, options) => {
        builder.autoSet("commands", "transfer");
        builder.addUserOption(option =>
            option
                .setName("user")
                .setDescription(options.getDefaultLocalization("commands.transfer.options.user.description"))
                .setNameLocalizations(options.generateLocalization("commands.transfer.options.user.name"))
                .setDescriptionLocalizations(options.generateLocalization("commands.transfer.options.user.description"))
                .setRequired(true)
        );
        builder.addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription(options.getDefaultLocalization("commands.transfer.options.amount.description"))
                .setNameLocalizations(options.generateLocalization("commands.transfer.options.amount.name"))
                .setDescriptionLocalizations(options.generateLocalization("commands.transfer.options.amount.description"))
                .setRequired(true)
                .setMinValue(1)
        );
        return builder;
    },
    execute: async (options, interaction) => {
        const recipient = interaction.options.getUser("user", true);
        const amount = interaction.options.getInteger("amount", true);
        const sender = interaction.user;

        if (recipient.id === sender.id) {
            return await throwError(interaction, options, options._t("commands.transfer.messages.error.self_transfer"));
        }

        if (recipient.bot) {
            return await throwError(interaction, options, options._t("commands.transfer.messages.error.bot_transfer"));
        }

        const senderData = await UserModel.findOne({ userId: sender.id });

        if (!senderData || senderData.cash < amount) {
            return await throwError(interaction, options, options._t("commands.transfer.messages.error.not_enough_money"));
        }

        const confirmationEmbed = new EmbedBuilder()
            .setAuthor({ name: options._t("commands.transfer.messages.confirmation.author", { user: recipient.displayName }) })
            .setDescription(
                options._t("commands.transfer.messages.confirmation.description", { sender: sender.toString(), recipient: recipient.toString(), amount: amount.toLocaleString() }) + "\n\n" +
                "• " + options._t("commands.transfer.messages.confirmation.approve_instruction") + "\n" +
                "• " + options._t("commands.transfer.messages.confirmation.decline_instruction") + "\n\n" +
                "⚠️ | **" + options._t("commands.transfer.messages.confirmation.warning_title") + "**: *" + options._t("commands.transfer.messages.confirmation.warning_body") + "*"
            )
            .setColor(options._c("default"))
            .setFooter({ text: options._t("commands.transfer.messages.confirmation.footer", { user: sender.displayName }), iconURL: sender.displayAvatarURL() });

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId("approve")
                .setLabel(options._t("commands.transfer.components.buttons.approve"))
                .setStyle(ButtonStyle.Success)
                .setEmoji(options._e('accept')),
            new ButtonBuilder()
                .setCustomId("decline")
                .setLabel(options._t("commands.transfer.components.buttons.decline"))
                .setStyle(ButtonStyle.Danger)
                .setEmoji(options._e('decline'))
        );

        const message = await interaction.reply({ embeds: [confirmationEmbed], components: [buttons], fetchReply: true });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: ms("30s"),
            filter: (i: ButtonInteraction) => i.user.id === sender.id,
        });

        collector.on("collect", async (i) => {
            await i.deferUpdate();
            collector.stop();

            if (i.customId === "approve") {
                const senderAfterCollect = await UserModel.findOne({ userId: sender.id });
                if (!senderAfterCollect || senderAfterCollect.cash < amount) {
                    return await interaction.editReply({ content: options._t("commands.transfer.messages.error.not_enough_money_after_confirm"), embeds: [], components: [] });
                }

                await UserModel.updateOne({ userId: sender.id }, { $inc: { cash: -amount } });
                await UserModel.updateOne({ userId: recipient.id }, { $inc: { cash: amount } }, { upsert: true });

                await interaction.editReply({ content: options._t("commands.transfer.messages.success", { sender: sender.toString(), recipient: recipient.toString(), amount: amount.toLocaleString() }), embeds: [], components: [] });
            } else {
                const cancelledEmbed = EmbedBuilder.from(confirmationEmbed).setColor(options._c("error"));
                await interaction.editReply({ content: options._t("commands.transfer.messages.cancelled"), embeds: [cancelledEmbed], components: [] });
            }
        });

        collector.on("end", async (collected) => {
            if (collected.size === 0) {
                const timeoutEmbed = EmbedBuilder.from(confirmationEmbed).setColor(options._c("error"));
                await interaction.editReply({ content: options._t("commands.transfer.messages.timeout"), embeds: [timeoutEmbed], components: [] });
            }
        });
    },
});
