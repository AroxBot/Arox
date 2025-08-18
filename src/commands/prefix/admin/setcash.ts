import { EmbedBuilder } from "discord.js";
import ms from "ms";

import { Handler } from "@/structures/core/Handler";
import UserModel from "@/models/User";
import { throwError } from "@/utils/discord";

export default Handler.CommandHandler({
  cooldown: (manager) => manager.setCooldownTime(ms("3s")),
  data: (builder) => builder.setName("setcash").setAliases("setmoney").setAdminOnly(true),
  execute: async (options, message, args) => {
    const targetUser = message.mentions.users.first() || (await options.bot.client.users.fetch(args[0]).catch(() => null));
    if (!targetUser) {
      return await throwError(message, options, "Please specify a user.");
    }

    const amountStr = args[0];
    console.log(args);
    if (!amountStr) {
      return await throwError(message, options, "Please specify an amount.");
    }

    const userData = await UserModel.findOneAndUpdate({ userId: targetUser.id }, {}, { upsert: true, new: true });

    const oldCash = userData.cash;
    let newCash: number;
    let operation: "set" | "added" | "removed";

    if (amountStr.startsWith("+")) {
      const amount = parseInt(amountStr.substring(1));
      if (isNaN(amount) || amount <= 0) {
        return await throwError(message, options, "Please enter a valid amount.");
      }
      newCash = userData.cash + amount;
      operation = "added";
    } else if (amountStr.startsWith("-")) {
      const amount = parseInt(amountStr.substring(1));
      if (isNaN(amount) || amount <= 0) {
        return await throwError(message, options, "Please enter a valid amount.");
      }
      newCash = userData.cash - amount;
      operation = "removed";
    } else {
      const amount = parseInt(amountStr);
      if (isNaN(amount) || amount < 0) {
        return await throwError(message, options, "Please enter a valid amount.");
      }
      newCash = amount;
      operation = "set";
    }

    userData.cash = newCash;
    await userData.save();

    const amountText = (operation !== "set" ? Math.abs(newCash - oldCash) : newCash).toLocaleString();

    const messages = {
      author: `User ${targetUser.username}'s Arox Cash amount has been updated.`,
      set: `User ${targetUser.username}'s ${options._e("cash")} amount has been **set to ${amountText}**.`,
      added: `User ${targetUser.username}'s ${options._e("cash")} amount has been **increased by ${amountText}**.`,
      removed: `User ${targetUser.username}'s ${options._e("cash")} amount has been **decreased by ${amountText}**.`,
      change: "Change"
    };

    const embed = new EmbedBuilder()
      .setAuthor({ name: messages.author, iconURL: targetUser.displayAvatarURL() || undefined })
      .setDescription(
        [
          `💰 | ${messages[operation]}`,
          `**${messages.change}:**`,
          `> ${options._e("cash")} ${oldCash.toLocaleString()} → ${options._e("cash")} ${newCash.toLocaleString()}`
        ].join("\n")
      )
      .setColor(operation === "added" ? options._c("success") : operation === "removed" ? options._c("error") : options._c("default"))
      .setFooter({
        text: `By: ${message.author.username} • ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
        iconURL: message.author.displayAvatarURL() || undefined
      });

    await message.reply({ embeds: [embed] });
  }
});
