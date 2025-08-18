import { Schema, model, Document } from "mongoose";

import { AllowedLocale } from "@/structures/handlers/localeHandler";

export interface IGuild extends Document {
  guildId: string;
  language?: AllowedLocale;
}

const GuildSchema = new Schema<IGuild>(
  {
    guildId: { type: String, required: true, unique: true },
    language: { type: String }
  },
  { timestamps: true }
);

export default model<IGuild>("Guild", GuildSchema);
