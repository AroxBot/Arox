import { ApplicationCommandType, UserContextMenuCommandInteraction } from "discord.js";
import ms from "ms";

import { Handler } from "@/structures/core/Handler";
import { balanceLogic } from "@/commands/slash/economy/balance";
import { DefaultCommandOptions } from "@/types/options/command";
import { CooldownBuilder } from "@/structures/classes/CooldownBuilder";
import { CustomContextBuilder } from "@/structures/classes/ContextMenuBuilder";

export default Handler.ContextMenuHandler({
  cooldown: (manager: CooldownBuilder) => manager.setCooldownTime(ms("10s")),
  data: (builder: CustomContextBuilder) => builder.autoSet("commands", "balance").setType(ApplicationCommandType.User),
  execute: async (options: DefaultCommandOptions, interaction: UserContextMenuCommandInteraction) => {
    const targetUser = interaction.targetUser;
    await balanceLogic(options, interaction, targetUser);
  }
});
