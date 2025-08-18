import { Schema, model, Document } from "mongoose";

export type ProductType = "wallpaper";

export interface IProduct extends Document {
  id: number;
  type: ProductType;
  nameId: string;
  cost: number;
  emoji?: string;
}

const ProductSchema = new Schema<IProduct>(
  {
    id: { type: Number, required: true, unique: true, index: true },
    type: { type: String, required: true, enum: ["wallpaper"], index: true },
    nameId: { type: String, required: true },
    cost: { type: Number, required: true, min: 0 },
    emoji: { type: String }
  },
  { timestamps: true }
);

export default model<IProduct>("Product", ProductSchema);
