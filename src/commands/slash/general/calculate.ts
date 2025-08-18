import ms from "ms";
import evaluate from "math-expression-evaluator";

import { Handler } from "@/structures/core/Handler";
import { throwError } from "@/utils/discord";

export default Handler.SlashCommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("5s")),
  data: (builder: any, options: any) =>
    builder
      .autoSet("commands", "calculate")
      .addStringOption((option: any) =>
        option
          .setName(options.getDefaultLocalization("commands", "calculate.options.expression.name"))
          .setDescription(options.getDefaultLocalization("commands", "calculate.options.expression.description"))
          .setNameLocalizations(options.generateLocalization("commands", "calculate.options.expression.name"))
          .setDescriptionLocalizations(options.generateLocalization("commands", "calculate.options.expression.description"))
          .setRequired(true)
      ),
  execute: async (options, interaction) => {
    const expressionName = options.bot.localeHandler.getDefaultLocalization("commands", "calculate.options.expression.name");
    const expression = interaction.options.getString(expressionName, true);

    try {
      const result = new (evaluate as any)().eval(expression);
      const content = `🧮 | ${options._t("commands.calculate.messages.success", { user: interaction.user.username, result })}`;

      await interaction.reply({ content });
    } catch (error) {
      return await throwError(interaction, options, options._t("commands.calculate.messages.error"));
    }
  }
});
