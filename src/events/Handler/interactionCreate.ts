import chalk from "chalk";
import { CommandInteraction, Events, Message, MessageFlags } from "discord.js";
import { Handler } from "@/structures/core/Handler";
import { formatTimesamp, throwError } from "@/utils/discord";
import { checkRules, handleRulesAccept } from "@/utils/rulesHelper";

export default Handler.EventHandler({
  name: Events.InteractionCreate,
  once: false,
  async handle(options, interaction) {
    // Handle non-command interactions first
    if (interaction.isButton() && interaction.customId === "accept_rules") {
      const opts = { ...options, locale: options.bot.localeHandler.defaultLocale, _t: (key: string) => key, _e: () => "❓", _c: () => null };
      return await handleRulesAccept(opts, interaction);
    }

    // Only handle command interactions from here
    if (!interaction.isCommand() && !interaction.isContextMenuCommand()) {
      return;
    }

    const locale = await options.bot.localeHandler.getLocale(interaction.user, interaction?.guild);
    const opts = {
      ...options,
      locale,
      _e: options.bot.emojiHandler._e.bind(options.bot.emojiHandler),
      _c: options.bot.emojiHandler._c.bind(options.bot.emojiHandler),
      _t: options.bot.localeHandler._t.bind(options.bot.localeHandler, locale),
    };

    // Get the command first to check if it exists
    const command = interaction.isChatInputCommand()
      ? options.bot.commandHandler.slashCommand.get(interaction.commandName)
      : options.bot.commandHandler.contextMenu.find(
        (cmd) => cmd.data.name === interaction.commandName && cmd.data.type === interaction.commandType
      );

    if (!command) {
      console.error(chalk.redBright(`'${interaction.commandName}' (${interaction.commandId}) was not found.`));
      try {
        await interaction.reply({ content: "Bu komut bulunamadı.", flags: MessageFlags.Ephemeral });
      } catch (e) {
        console.error(`Failed to reply to unknown command:`, e);
      }
      return;
    }

    // Perform checks
    const rulesCheck = await checkRules(opts, interaction);
    if (!rulesCheck.canProceed) {
      return;
    }

    if (command.data.adminOnly && !options.bot.permissions.isAdmin(interaction.user.id)) {
      return await throwError(interaction, opts, opts._t("error", "noAccess", "admin"));
    }

    if (!command.data.allowDM && interaction.channel?.isDMBased()) {
      return await throwError(interaction, opts, opts._t("error", "noAccess", "dm"));
    }

    // Cooldown check
    if (command.cooldown && command.cooldown.enabled) {
      try {
        const cooldownCheck = await options.bot.cooldownHandler.checkCooldown(
          command.data.name,
          command.cooldown,
          interaction.user.id,
          interaction.guild?.id,
          interaction.channel?.id
        );

        if (cooldownCheck.onCooldown) {
          const remainingSeconds = Math.ceil(cooldownCheck.remainingTime / 1000);
          const minutes = Math.floor(remainingSeconds / 60);
          const seconds = remainingSeconds % 60;

          let timeText = "";
          if (minutes > 0) {
            timeText = `${minutes}m ${seconds}s`;
          } else {
            timeText = `${seconds}s`;
          }

          return await throwError(interaction, opts, `⏰ You must wait **${timeText}** before using this command again!`, { emoji: "loading", ephemeral: true });
        }
      } catch (cooldownError) {
        console.error(`Error checking cooldown for command '${interaction.commandName}':`, cooldownError);
        // Continue execution if cooldown check fails
      }
    }

    // Execute command
    try {
      await command.execute(opts, interaction as any);

      // Set cooldown after successful execution
      if (command.cooldown && command.cooldown.enabled) {
        try {
          await options.bot.cooldownHandler.setCooldown(
            command.data.name,
            command.cooldown,
            interaction.user.id,
            interaction.guild?.id,
            interaction.channel?.id
          );
        } catch (cooldownError) {
          console.error(`Error setting cooldown for command '${interaction.commandName}':`, cooldownError);
          // Don't block command execution if cooldown setting fails
        }
      }
    } catch (err) {
      console.error(`Error executing command '${interaction.commandName}':`, err);
      const errorMessage = { content: "Komutu çalıştırırken bir hata oluştu.", ephemeral: true };
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      } catch (followUpError) {
        console.error(`Failed to send error message for command '${interaction.commandName}':`, followUpError);
      }
    }
  },
});
