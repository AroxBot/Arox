import { Schema, model, Document } from "mongoose";

import { AllowedLocale } from "@/structures/handlers/localeHandler";

export interface ITransaction {
  type: string;
  amount: number;
  date: Date;
  description?: string;
}

export interface IUser extends Document {
  userId: string;
  language?: AllowedLocale;
  cash: number;
  bank: number;
  clover: number;
  transactions: ITransaction[];
  rulesAccepted: boolean;
  coins: Map<string, number>;
}

const UserSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true, unique: true },
    language: { type: String },
    cash: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    clover: { type: Number, default: 0 },
    transactions: {
      type: [
        {
          type: { type: String, required: true },
          amount: { type: Number, required: true },
          date: { type: Date, default: Date.now },
          description: { type: String }
        }
      ],
      default: []
    },
    rulesAccepted: { type: Boolean, default: false },
    coins: { type: Map, of: Number, default: new Map() }
  },
  { timestamps: true }
);

export default model<IUser>("User", UserSchema);
