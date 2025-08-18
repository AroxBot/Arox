import ms from "ms";

import { Handler } from "../../../structures/core/Handler";
import CooldownModel from "../../../models/Cooldown";
import { findCommand, findUser } from "../../../utils/discord";

export default Handler.CommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("0s")),
  data: (builder) => builder.setName("removecooldown").setAliases("rmcd").setAdminOnly(true),
  execute: async (options, message, args) => {
    if (args.length < 2) {
      return await message.reply({ content: "Please provide a user and a command name." });
    }

    const user = await findUser(message, args[0]);
    if (!user) {
      return await message.reply({ content: `User "${args[0]}" not found.` });
    }

    const commandName = args[1].toLowerCase();
    const command = findCommand(options.bot, commandName);

    if (!command) {
      return await message.reply({ content: `Command "${commandName}" not found.` });
    }

    const deleted = await CooldownModel.deleteOne({ userId: user.id, command: command.data.name });

    if (deleted.deletedCount > 0) {
      await message.reply({ content: `Successfully removed cooldown for command \`${command.data.name}\` from user \`${user.username}\`.` });
    } else {
      await message.reply({ content: `User \`${user.username}\` has no active cooldown for command \`${command.data.name}\`.` });
    }
  }
});
