import { Schema, model, Document } from "mongoose";

export interface ICooldown extends Document {
  cooldownId: string;
  expiresDate: number;
}

const CooldownSchema = new Schema<ICooldown>({
  cooldownId: { type: String, required: true },
  expiresDate: { type: Number, required: true }
}, { timestamps: true });

export default model<ICooldown>("Cooldown", CooldownSchema);
