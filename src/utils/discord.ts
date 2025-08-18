import { Interaction, Message, User, MessageFlags } from "discord.js";

import { DefaultCommandOptions } from "@/types/options/command";
import { CommandData } from "@/types/data/command";

export function getUser(interaction: Interaction | Message | User): User {
  if (interaction instanceof User) return interaction;
  return (interaction as Message).author ?? (interaction as Interaction).user;
}
export function getUserOrClientAvatar(interaction: Interaction | Message | User): string | undefined {
  const user = getUser(interaction);
  let userAvatar = user.avatarURL({ extension: "webp" });
  if (userAvatar) return userAvatar;
  userAvatar = user.displayAvatarURL({ extension: "webp" });
  if (userAvatar) return userAvatar;
  userAvatar = interaction.client.user.avatarURL({ extension: "webp" });
  if (userAvatar) return userAvatar;
  userAvatar = interaction.client.user.displayAvatarURL({ extension: "webp" });
  if (userAvatar) return userAvatar;
}
/**
 * d => 03/05/2023
 
 * D => March 5, 2023

 * t => 2:22 PM

 * T => 2:22:00 PM

 * f => March 5, 2023 2:22 PM

 * F => Sunday, March 5, 2023 2:22 PM

 * R => A minute ago
 */
export type TIMESTAMP_TYPE = "d" | "D" | "t" | "T" | "f" | "F" | "R";
export function formatTimesamp(timestamp: number, type: TIMESTAMP_TYPE) {
  return `<t:${Math.floor(timestamp / 1000)}${type ? `:${type}` : ""}>`;
}

export async function throwError(
  interactionOrMessage: Interaction | Message,
  options: DefaultCommandOptions,
  content: string,
  errorOptions: { deleteIn?: number; ephemeral?: boolean; emoji?: string } = {}
) {
  const { deleteIn, ephemeral = true, emoji = "error" } = errorOptions;
  const user = getUser(interactionOrMessage);

  const messagePayload: any = {
    content: `${options._e(emoji as any)} **| ${user.displayName}**, ${content}`
  };

  if (interactionOrMessage instanceof Message) {
    const sentMessage = await interactionOrMessage.reply(messagePayload);
    if (deleteIn) {
      setTimeout(() => sentMessage.delete().catch(() => {}), deleteIn);
    }
    return;
  }

  if (!interactionOrMessage.isRepliable()) return;

  if (ephemeral) {
    messagePayload.flags = MessageFlags.Ephemeral;
  }

  let sentMessage;
  try {
    if (interactionOrMessage.deferred || interactionOrMessage.replied) {
      sentMessage = await interactionOrMessage.editReply(messagePayload);
    } else {
      sentMessage = await interactionOrMessage.reply(messagePayload);
    }
  } catch (error) {
    sentMessage = await interactionOrMessage.followUp(messagePayload);
  }

  if (deleteIn && sentMessage instanceof Message) {
    setTimeout(() => {
      sentMessage.delete().catch(() => {});
    }, deleteIn);
  }
}

export async function findUser(message: Message, arg: string): Promise<User | undefined> {
  if (message.mentions.users.size > 0) {
    return message.mentions.users.first();
  }
  if (/\d{17,19}/.test(arg)) {
    try {
      return await message.client.users.fetch(arg);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function findCommand(bot: any, commandName: string): CommandData | undefined {
  return bot.commandHandler.prefixCommand.get(commandName) || bot.commandHandler.slashCommand.get(commandName);
}
