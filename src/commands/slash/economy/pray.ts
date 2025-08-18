import ms from "ms";

import { Handler } from "../../../structures/core/Handler";
import User from "../../../models/User";

export default Handler.SlashCommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("20s")),
  data: (builder) => builder.autoSet("commands", "pray"),
  execute: async (options, interaction) => {
    const user = await User.findOne({ userId: interaction.user.id });

    if (!user) {
      await User.create({ userId: interaction.user.id, clover: 1 });
    } else {
      user.clover += 1;
      await user.save();
    }

    await interaction.reply(
      options._t("commands.pray.messages.success", {
        clover: (user ? user.clover : 1).toString(),
        username: interaction.user.displayName
      })
    );
  }
});
