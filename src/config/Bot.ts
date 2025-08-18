import { GatewayIntentBits, Partials } from "discord.js";

import { BotSettings } from "@/types/settings";

export default {
  name: "Arox",
  prefix: ["a!", "!"],
  admins: ["846119647131598898", "592791390287822848"],
  developers: ["846119647131598898", "592791390287822848"],
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.User, Partials.Channel, Partials.Message],
  links: {
    support: "https://discord.gg/9b6yZ5Z",
    invite: "https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot&permissions=8",
    vote: "https://top.gg/bot/YOUR_CLIENT_ID/vote",
    website: "https://aroxbot.xyz"
  },
  currency: "AX"
} as unknown as BotSettings;
