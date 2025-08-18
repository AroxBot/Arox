import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import ms from "ms";

import { Handler } from "@/structures/core/Handler";
import ProductModel from "@/models/Product";
import UserModel from "@/models/User";

const BG_URL = (id: number) => `https://arox.vercel.app/backgrounds/${id}.jpg`;

export default Handler.SlashCommandHandler({
  cooldown: (m) => m.setCooldownTime(ms("5s")),
  data: (b) => b.autoSet("commands", "backgrounds"),
  execute: async (options, interaction) => {
    const userId = interaction.user.id;

    const user = await UserModel.findOneAndUpdate({ userId }, {}, { upsert: true, new: true });

    let mutated = false;
    if (!Array.isArray(user.backgroundsOwned)) {
      user.backgroundsOwned = [];
      mutated = true;
    }
    if (!user.backgroundsOwned.includes(100)) {
      user.backgroundsOwned.push(100);
      mutated = true;
    }
    if (user.selectedBackgroundId === undefined || user.selectedBackgroundId === null) {
      user.selectedBackgroundId = 100;
      mutated = true;
    }
    if (mutated) {
      await user.save();
    }

    let allWallpapers = await ProductModel.find({ type: "wallpaper" }).sort({ id: 1 });
    if (!allWallpapers.find((p: any) => p.id === 100)) {
      allWallpapers = ([{ id: 100, type: "wallpaper", nameId: "wallpaper_100", cost: 0, emoji: "🖼️" }] as any[]).concat(allWallpapers as any);
    }

    const ownedIds = Array.isArray(user.backgroundsOwned) ? user.backgroundsOwned : [];
    const wallpapers = allWallpapers.filter((p: any) => ownedIds.includes(p.id));

    if (!wallpapers.length) {
      return interaction.reply({
        fetchReply: true,
        content: options._t("commands.backgrounds.messages.error.no_owned"),
        ephemeral: true
      });
    }

    let index = 0;
    if (typeof user.selectedBackgroundId === "number") {
      const found = wallpapers.findIndex((p) => p.id === user.selectedBackgroundId);
      if (found >= 0) index = found;
    }

    const build = (idx: number) => {
      const product = wallpapers[idx];
      const owned = user.backgroundsOwned?.includes(product.id) ?? false;
      const using = user.selectedBackgroundId === product.id;

      const title = options._t("commands.backgrounds.messages.title");
      const footer = options._t("commands.backgrounds.messages.footer", {
        page: (idx + 1).toString(),
        total: wallpapers.length.toString()
      });

      const nameKey = `products.names.${product.nameId}`;
      const name = options._t(nameKey);
      const priceLine = `${options._t("commands.market.messages.section.price")}: ${options._e("cash")} **${product.cost.toLocaleString(options.locale)}**`;
      const ownedLine = owned
        ? `• ${options._t("commands.backgrounds.messages.status.owned")}${using ? ` • ${options._t("commands.backgrounds.messages.status.using")}` : ""}`
        : `• ${options._t("commands.backgrounds.messages.status.notOwned")}`;

      const embed = new EmbedBuilder()
        .setColor(options._c("default"))
        .setTitle(title)
        .setDescription([`**${name}** (ID: ${product.id})`, priceLine, ownedLine].join("\n"))
        .setImage(BG_URL(product.id));

      const prev = new ButtonBuilder()
        .setCustomId("bg_prev")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(options._e("leftArrow"))
        .setLabel(options._t("commands.backgrounds.components.buttons.prev"))
        .setDisabled(idx === 0);

      const use = new ButtonBuilder()
        .setCustomId(`bg_use_${product.id}`)
        .setStyle(ButtonStyle.Success)
        .setLabel(options._t("commands.backgrounds.components.buttons.use"))
        .setDisabled(!owned || using);

      const next = new ButtonBuilder()
        .setCustomId("bg_next")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(options._e("rightArrow"))
        .setLabel(options._t("commands.backgrounds.components.buttons.next"))
        .setDisabled(idx === wallpapers.length - 1);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(prev, use, next);
      return { embed, components: [row] };
    };

    const payload = build(index);
    const msg = await interaction.reply({ fetchReply: true, embeds: [payload.embed], components: payload.components });

    const collector = msg.createMessageComponentCollector({
      time: ms("5m"),
      filter: (i) => i.user.id === userId
    });

    collector.on("collect", async (i) => {
      if (i.customId === "bg_prev") {
        index = Math.max(0, index - 1);
        const upd = build(index);
        return i.update({ embeds: [upd.embed], components: upd.components });
      }
      if (i.customId === "bg_next") {
        index = Math.min(wallpapers.length - 1, index + 1);
        const upd = build(index);
        return i.update({ embeds: [upd.embed], components: upd.components });
      }
      if (i.customId.startsWith("bg_use_")) {
        const id = Number(i.customId.split("_").pop());
        const owned = user.backgroundsOwned?.includes(id);
        if (!owned) {
          return i.reply({
            content: options._t("commands.backgrounds.messages.error.not_owned"),
            ephemeral: true
          });
        }
        if (user.selectedBackgroundId === id) {
          return i.reply({
            content: options._t("commands.backgrounds.messages.error.already_using"),
            ephemeral: true
          });
        }

        user.selectedBackgroundId = id;
        await user.save();

        const upd = build(index);
        await i.update({ embeds: [upd.embed], components: upd.components });
        try {
          await i.followUp({
            content: options._t("commands.backgrounds.messages.success.used", { id: id.toString() }),
            ephemeral: true
          });
        } catch {}
      }
    });

    collector.on("end", async () => {
      try {
        const disabledRow = (msg.components[0]?.toJSON?.() as any) ?? null;
        if (disabledRow) {
          const prev = ButtonBuilder.from(disabledRow.components[0]).setDisabled(true);
          const use = ButtonBuilder.from(disabledRow.components[1]).setDisabled(true);
          const next = ButtonBuilder.from(disabledRow.components[2]).setDisabled(true);
          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(prev, use, next);
          await msg.edit({ components: [row] });
        }
      } catch {}
    });
  }
});
