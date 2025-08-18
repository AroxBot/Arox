import { CooldownOptions, CooldownType } from "@/structures/handlers/cooldownHandler";

export class CooldownBuilder {
  public options: CooldownOptions;
  private defaultCooldown = require("@/config/Cooldown");
  constructor(options?: Partial<CooldownOptions>) {
    if (options) {
      this.options = { ...this.defaultCooldown, ...options };
    } else {
      this.options = { ...this.defaultCooldown };
    }
  }

  setCooldownType(type: CooldownType) {
    this.options.type = type;
    return this;
  }

  setCooldownTime(time: number) {
    if (time === 0) {
      this.options.enabled = false;
      this.options.cooldownTime = 0;
      return this;
    }

    if (time > this.defaultCooldown.invalidSession) {
      throw new Error(`Cooldown time (${time}ms) cannot be more than the invalid session time (${this.defaultCooldown.invalidSession}ms).`);
    }

    this.options.cooldownTime = time;
    this.options.enabled = true;
    return this;
  }

  setEnabled(enabled?: boolean) {
    this.options.enabled = enabled !== undefined ? enabled : !this.options.enabled;
    return this;
  }

  saveDatabase(enabled?: boolean) {
    this.options.saveDatabase = enabled !== undefined ? enabled : !this.options.saveDatabase;
    return this;
  }

  toJSON() {
    return { ...this.options };
  }
}
