import { EmbedBuilder } from "discord.js";
import { Handler } from "../../../structures/core/Handler";
import UserModel from "../../../models/User";

function getMillisecondsUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // Set to the next day's midnight
    return midnight.getTime() - now.getTime();
}

export default Handler.SlashCommandHandler({
    cooldown: (manager) => manager.setCooldownTime(getMillisecondsUntilMidnight()),
    data: (builder, options) => {
        builder.autoSet("commands", "daily");
        return builder;
    },
    execute: async (options, interaction) => {
        const user = interaction.user;
        const randomAmount = Math.floor(Math.random() * (500 - 100 + 1)) + 100;

        await UserModel.updateOne({ userId: user.id }, { $inc: { cash: randomAmount } }, { upsert: true });

        const successEmbed = new EmbedBuilder()
            .setAuthor({ name: options._t("commands.daily.messages.success.author", { user: user.username }) })
            .setDescription(options._t("commands.daily.messages.success.description", { amount: randomAmount.toLocaleString() }))
            .setColor(options._c("success"))
            .setThumbnail(user.displayAvatarURL());

        await interaction.reply({ embeds: [successEmbed] });
    },
});
