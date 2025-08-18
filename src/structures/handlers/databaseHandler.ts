import mongoose from "mongoose";

import { Client } from "@/structures/core/Bot";
import { BotSettings } from "@/types/settings";

export class DatabaseHandler {
  constructor(
    private _bot: Client,
    private botConfig: BotSettings
  ) {}

  async connect() {
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI is not defined in your environment variables.");
      process.exit(1);
    }

    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("MongoDB'ye başarıyla bağlanıldı.");
    } catch (error) {
      console.error("MongoDB bağlantı hatası:", error);
      process.exit(1);
    }
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log("MongoDB bağlantısı kesildi.");
  }

  async ping() {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return -1;
    }
    const startTime = Date.now();
    await mongoose.connection.db.admin().ping();
    return Date.now() - startTime;
  }
}
