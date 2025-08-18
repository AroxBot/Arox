import { BitFieldResolvable, GatewayIntentsString, Partials } from "discord.js";

import { CooldownOptions } from "@/structures/handlers/cooldownHandler";
import { AllowedLocale } from "@/structures/handlers/localeHandler";

export interface CooldownSettings extends CooldownOptions {
  invalidSession: number;
}
export type BotSettings = {
  name: string;
  prefix: string | string[];
  admins: string[];
  developers: string[];
  intents: BitFieldResolvable<GatewayIntentsString, number>;
  partials?: Partials[];
  links: {
    support: string;
    invite: string;
    vote: string;
    website: string;
  };
  currency: string;
};
export type Paths = {
  eventsPath: string;
  prefixCommandsPath: string;
  slashCommandsPath: string;
  contextMenusPath: string;
  localesPath: string;
  emojisPath: string;
  colorsPath: string;
};
export type extendPaths = {
  rootPath: string;
  commandsPath: string;
};
export type LocaleSettings = {
  defaultLocale: AllowedLocale;
  allowedLocales: AllowedLocale[];
};
