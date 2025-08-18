import CooldownModel from "@/models/Cooldown";
import { Client } from "@/structures/core/Bot";
import { CooldownSettings } from "@/types/settings";

export enum CooldownType {
  USER = "user",
  GUILD = "guild",
  CHANNEL = "channel",
  GLOBAL = "global"
}

export interface CooldownOptions {
  cooldownTime: number;
  saveDatabase: boolean;
  enabled: boolean;
  type: CooldownType;
}

export class CooldownHandler {
  private databaseCleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private bot: Client,
    private options: CooldownSettings
  ) {
    this.startDatabaseCleanup();
  }

  /**
   * Start automatic database cleanup every 30 minutes
   */
  private startDatabaseCleanup(): void {
    this.databaseCleanupInterval = setInterval(
      () => {
        this.removeInvalidCooldowns();
      },
      30 * 60 * 1000
    );

    this.removeInvalidCooldowns();
  }

  /**
   * Create unique key for cooldown
   */
  private createKey(commandName: string, type: CooldownType, targetId: string): string {
    return `${commandName}:${type}:${targetId}`;
  }

  /**
   * Get target ID based on cooldown type
   */
  private getTargetId(type: CooldownType, userId?: string, guildId?: string, channelId?: string): string {
    switch (type) {
      case CooldownType.USER:
        return userId || "unknown";
      case CooldownType.GUILD:
        return guildId || "global";
      case CooldownType.CHANNEL:
        return channelId || "global";
      case CooldownType.GLOBAL:
        return "global";
      default:
        return userId || "unknown";
    }
  }

  /**
   * Check if command is on cooldown (database-only)
   */
  public async checkCooldown(
    commandName: string,
    options: CooldownOptions,
    userId: string,
    guildId?: string,
    channelId?: string
  ): Promise<{ onCooldown: boolean; remainingTime: number; options: CooldownOptions }> {
    if (!options?.enabled) {
      return {
        onCooldown: false,
        remainingTime: 0,
        options: options || ({} as CooldownOptions)
      };
    }

    const targetId = this.getTargetId(options.type, userId, guildId, channelId);
    const key = this.createKey(commandName, options.type, targetId);
    const now = Date.now();

    try {
      const cooldown = await CooldownModel.findOne({ cooldownId: key });

      if (cooldown && cooldown.expiresDate > now) {
        return {
          onCooldown: true,
          remainingTime: cooldown.expiresDate - now,
          options
        };
      }

      if (cooldown && cooldown.expiresDate <= now) {
        await CooldownModel.deleteOne({ cooldownId: key });
      }

      return {
        onCooldown: false,
        remainingTime: 0,
        options
      };
    } catch (error) {
      console.error("Error checking cooldown from database:", error);
      return {
        onCooldown: false,
        remainingTime: 0,
        options
      };
    }
  }

  /**
   * Set cooldown for command (database-only)
   */
  public async setCooldown(commandName: string, options: CooldownOptions, userId: string, guildId?: string, channelId?: string): Promise<void> {
    if (!options.enabled) return;

    const targetId = this.getTargetId(options.type, userId, guildId, channelId);
    const key = this.createKey(commandName, options.type, targetId);
    const expiresAt = Date.now() + options.cooldownTime;

    try {
      await CooldownModel.findOneAndUpdate(
        { cooldownId: key },
        {
          cooldownId: key,
          expiresDate: expiresAt
        },
        { upsert: true }
      );
    } catch (error) {
      console.error("Error setting cooldown in database:", error);
    }
  }

  /**
   * Reset specific cooldown (database-only)
   */
  public async resetCooldown(commandName: string, options: CooldownOptions, userId: string, guildId?: string, channelId?: string): Promise<void> {
    const targetId = this.getTargetId(options.type, userId, guildId, channelId);
    const key = this.createKey(commandName, options.type, targetId);

    try {
      await CooldownModel.deleteOne({ cooldownId: key });
    } catch (error) {
      console.error("Error removing cooldown from database:", error);
    }
  }

  /**
   * Remove all expired cooldowns from database
   */
  public async removeInvalidCooldowns(): Promise<void> {
    try {
      const now = Date.now();
      const result = await CooldownModel.deleteMany({
        expiresDate: { $lte: now }
      });

      if (result.deletedCount > 0) {
        console.log(`Cleaned up ${result.deletedCount} expired cooldowns from database`);
      }
    } catch (error) {
      console.error("Error cleaning up expired cooldowns:", error);
    }
  }

  /**
   * Get remaining cooldown time (database-only)
   */
  public async getRemainingTime(commandName: string, type: CooldownType, targetId: string): Promise<number> {
    try {
      const key = this.createKey(commandName, type, targetId);
      const cooldown = await CooldownModel.findOne({ cooldownId: key });

      if (!cooldown) return 0;

      const remaining = cooldown.expiresDate - Date.now();
      return remaining > 0 ? remaining : 0;
    } catch (error) {
      console.error("Error getting remaining time from database:", error);
      return 0;
    }
  }

  /**
   * Get total active cooldowns (database-only)
   */
  public async getActiveCooldownCount(): Promise<number> {
    try {
      const now = Date.now();
      const count = await CooldownModel.countDocuments({
        expiresDate: { $gt: now }
      });
      return count;
    } catch (error) {
      console.error("Error getting active cooldown count from database:", error);
      return 0;
    }
  }

  /**
   * Cleanup on shutdown
   */
  public destroy(): void {
    if (this.databaseCleanupInterval) {
      clearInterval(this.databaseCleanupInterval);
      this.databaseCleanupInterval = null;
    }
  }
}
