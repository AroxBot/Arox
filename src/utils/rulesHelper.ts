import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ButtonInteraction, Interaction } from "discord.js";
import { InteractionEditReplyOptions } from "discord.js";

import UserModel from "@/models/User";
import { DefaultCommandOptions } from "@/types/options/command";
import { CustomEmbed } from "@/structures/classes/CustomEmbed";

interface RulesCheckResult {
  canProceed: boolean;
  reply?: InteractionEditReplyOptions;
}

/**
 * Checks if the user has accepted the rules.
 * @param options The command options.
 * @param interaction The interaction to check.
 * @returns An object indicating if the user can proceed and an optional reply payload.
 */
export async function checkRules(options: DefaultCommandOptions, interaction: Interaction): Promise<RulesCheckResult> {
  if (!interaction.isCommand() && !interaction.isContextMenuCommand()) {
    return { canProceed: true };
  }

  const user = await UserModel.findOneAndUpdate({ userId: interaction.user.id }, {}, { upsert: true, new: true });

  if (!user.rulesAccepted) {
    const embed = new EmbedBuilder()
      .setTitle(options._t("rules.title"))
      .setDescription(options._t("rules.description"))
      .setColor(options._c("default"))
      .setThumbnail(interaction.client.user?.displayAvatarURL() || null)
      .setFooter({ text: options._t("rules.footer") });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("accept_rules")
        .setLabel(options._t("rules.button"))
        .setStyle(ButtonStyle.Success)
        .setEmoji(options._e("accept"))
    );

    return {
      canProceed: false,
      reply: {
        embeds: [embed],
        components: [row]
      }
    };
  }

  return { canProceed: true };
}

/**
 * Handles the button interaction for accepting the rules.
 * @param options The command options.
 * @param interaction The button interaction.
 */
export async function handleRulesAccept(options: DefaultCommandOptions, interaction: ButtonInteraction) {
  await UserModel.updateOne({ userId: interaction.user.id }, { rulesAccepted: true }, { upsert: true });

  const embed = new CustomEmbed(options, interaction).successEmbed().setDescription(options._t("rules.accepted"));

  try {
    await interaction.update({ embeds: [embed], components: [] });
  } catch (error) {
    console.error("Failed to update rules acceptance interaction:", error);
    await interaction.followUp({ embeds: [embed], ephemeral: true });
  }
}
