import { ButtonBuilder, ButtonStyle, MessageFlags, SeparatorSpacingSize, StringSelectMenuBuilder } from "discord.js";
import { ContainerBuilder } from "@discordjs/builders";
import ms from "ms";

import { Handler } from "@/structures/core/Handler";
import { PRODUCT_TYPES } from "@/config/Products";
import ProductManager from "@/structures/handlers/productManager";
import UserModel from "@/models/User";
import { IProduct, ProductType } from "@/models/Product";
import { capitalizeWordsRegex } from "@/utils/utils";

const PAGE_SIZE = 5;

function nameForProduct(options: any, product: IProduct) {
  const key = `products.names.${product.nameId}`;
  const translated = options._t(key);
  if (!translated || translated === key) {
    if (product.type === "wallpaper") return `Wallpaper #${product.id}`;
    return `Product #${product.id}`;
  }
  return translated;
}

function pageRange(page: number) {
  const start = page * PAGE_SIZE + 1;
  const end = start + PAGE_SIZE - 1;
  return { start, end };
}

export default Handler.SlashCommandHandler({
  cooldown: (m) => m.setCooldownTime(ms("5s")),
  data: (b) => b.autoSet("commands", "market"),
  execute: async (options, interaction) => {
    const userId = interaction.user.id;
    let user = await UserModel.findOneAndUpdate({ userId }, {}, { upsert: true, new: true });

    const productManager = new ProductManager(options.bot);

    let typeSelect = new StringSelectMenuBuilder()
      .setCustomId("market_type")
      .setPlaceholder(options._t("commands.market.components.select.placeholder"))
      .addOptions(
        Object.values(PRODUCT_TYPES).map((meta) => ({
          label: options._t(meta.labelKey) || meta.type.charAt(0).toUpperCase() + meta.type.slice(1),
          description: options._t(meta.descriptionKey) || `Browse ${meta.type} products`,
          value: meta.type,
          emoji: meta.emoji
        }))
      );

    const intro = new ContainerBuilder()
      .addTextDisplayComponents(
        (t) => t.setContent(options._t("commands.market.messages.title")),
        (t) => t.setContent(options._t("commands.market.messages.pick_type"))
      )
      .addActionRowComponents((row) => row.setComponents(typeSelect));

    const msg = await interaction.reply({
      components: [intro.toJSON()],
      flags: MessageFlags.IsComponentsV2,
      fetchReply: true
    });

    let currentType: ProductType | null = null;
    let page = 0;

    const render = async (ptype: ProductType, pageIndex: number) => {
      const { start, end } = pageRange(pageIndex);

      const [items, nextItems] = await Promise.all([
        productManager.getProducts(start, end, ptype),
        productManager.getProducts(end + 1, end + PAGE_SIZE, ptype)
      ]);

      const prevBtn = new ButtonBuilder()
        .setCustomId("market_prev")
        .setStyle(ButtonStyle.Secondary)
        .setLabel(options._t("commands.market.components.buttons.prev"))
        .setDisabled(pageIndex === 0);

      const nextBtn = new ButtonBuilder()
        .setCustomId("market_next")
        .setStyle(ButtonStyle.Secondary)
        .setLabel(options._t("commands.market.components.buttons.next"))
        .setDisabled(!nextItems || nextItems.length === 0);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          (t) =>
            t.setContent(
              `${options._e("logo")} ${capitalizeWordsRegex(options._t("commands.market.name"))} | ${options._t("commands.market.author." + ptype)}`
            ),
          (t) =>
            t.setContent(
              `</${options._t("commands", "backgrounds", "name")}:1406932997436866563> — ${options._t("commands.market.desc.backgrounds")}`
            )
        )
        .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Large));

      typeSelect = new StringSelectMenuBuilder()
        .setCustomId("market_type")
        .setPlaceholder(options._t("commands.market.components.select.placeholder"))
        .addOptions(
          Object.values(PRODUCT_TYPES).map((meta) => ({
            label: options._t(meta.labelKey) || meta.type.charAt(0).toUpperCase() + meta.type.slice(1),
            description: options._t(meta.descriptionKey) || `Browse ${meta.type} products`,
            value: meta.type,
            emoji: meta.emoji,
            default: meta.type === currentType
          }))
        );
      container.addSeparatorComponents((s) => s);
      container.addActionRowComponents((row) => row.setComponents(typeSelect));

      if (!items || items.length === 0) {
        container.addTextDisplayComponents((t) => t.setContent(options._t("commands.market.messages.empty_type")));
      } else {
        items.forEach((p, idx) => {
          if (!p || p.id == 100) return;
          const name = nameForProduct(options, p);
          const priceLine = `${options._t("commands.market.messages.section.price")}: ${options._e("cash")} **${p.cost.toLocaleString(options.locale)}**`;
          const typeEmoji = PRODUCT_TYPES[p.type as ProductType]?.emoji ?? "🛒";
          const displayEmoji = p.emoji && p.emoji.trim() !== "" ? p.emoji : typeEmoji;

          container
            .addSectionComponents((section) =>
              section
                .addTextDisplayComponents(
                  (td) => td.setContent(`${displayEmoji} ${name} • ID: ${p.id}`),
                  (td) => td.setContent(priceLine)
                )
                .setButtonAccessory((btn) =>
                  btn.setCustomId(`market_buy_${p.id}`).setLabel(options._t("commands.market.components.buttons.buy")).setStyle(ButtonStyle.Success)
                )
            )
            .addSeparatorComponents((s) => s);
        });
      }

      container.addActionRowComponents((row) => row.setComponents(prevBtn, nextBtn));

      return { components: [container.toJSON()] as any[] };
    };

    const collector = msg.createMessageComponentCollector({
      time: ms("10m"),
      filter: (i) => i.user.id === userId
    });

    collector.on("collect", async (i) => {
      try {
        if (i.isStringSelectMenu() && i.customId === "market_type") {
          currentType = i.values[0] as ProductType;
          page = 0;
          const payload = await render(currentType, page);
          return i.update({
            components: payload.components,
            flags: MessageFlags.IsComponentsV2
          });
        }

        if (!currentType) {
          return i.reply({
            content: options._t("commands.market.messages.error.no_type"),
            flags: MessageFlags.Ephemeral
          });
        }

        if (i.isButton()) {
          if (i.customId === "market_prev") {
            page = Math.max(0, page - 1);
            const payload = await render(currentType, page);
            return i.update({ components: payload.components, flags: MessageFlags.IsComponentsV2 });
          }
          if (i.customId === "market_next") {
            page = page + 1;
            const payload = await render(currentType, page);
            return i.update({ components: payload.components, flags: MessageFlags.IsComponentsV2 });
          }

          if (i.customId.startsWith("market_buy_")) {
            user = await UserModel.findOneAndUpdate({ userId }, {}, { upsert: true, new: true });
            const id = Number(i.customId.split("_").pop());
            const products = await productManager.getProducts(1, Number.MAX_SAFE_INTEGER, currentType);
            const product = products.find((p) => p.id === id);

            if (!product) {
              return i.reply({
                content: options._t("commands.market.messages.error.product_missing"),
                flags: MessageFlags.Ephemeral
              });
            }

            if (user.cash < product.cost) {
              console.log(product.cost);
              return i.reply({
                content: options._t("error.notEnoughMoney", { currency: options._e("cash") }),
                flags: MessageFlags.Ephemeral
              });
            }

            if (currentType === "wallpaper") {
              if (!Array.isArray(user.backgroundsOwned)) user.backgroundsOwned = [];
              if (user.backgroundsOwned.includes(product.id)) {
                return i.reply({
                  content: options._t("commands.market.messages.error.already_owned"),
                  flags: MessageFlags.Ephemeral
                });
              }
              user.backgroundsOwned.push(product.id);
            }

            user.cash -= product.cost;
            await user.save();

            const pname = nameForProduct(options, product);
            await i.reply({
              content: options._t("commands.market.messages.success.bought") + `${pname} (${product.id})`,
              flags: MessageFlags.Ephemeral
            });
          }
        }
      } catch (err) {
        console.error("market collector error:", err);
        try {
          await i.reply({ content: "Bir hata oluştu.", flags: MessageFlags.Ephemeral });
        } catch {}
      }
    });

    collector.on("end", async () => {
      try {
        await msg.edit({ components: [] });
      } catch {}
    });
  }
});
