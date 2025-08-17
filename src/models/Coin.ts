import { Schema, model, Document } from "mongoose";

export interface ICoin extends Document {
    id: string;
    cost: number;
    name: string;
    percentage: string;
    lastValues: number[];
    lastDates: string[];
    launchCost: number;
    highestValue: number;
    lowestValue: number;
    highLimit: number;
    lowLimit: number;
    bcolor: string;
    cr?: string;
    chart?: string;
    channel?: string;
    message?: string;
    amessage?: string;
}

const CoinSchema = new Schema<ICoin>({
    id: { type: String, required: true, unique: true },
    cost: { type: Number, required: true },
    name: { type: String, required: true },
    percentage: { type: String, required: true },
    lastValues: { type: [Number], default: [] },
    lastDates: { type: [String], default: [] },
    launchCost: { type: Number, required: true },
    highestValue: { type: Number, required: true },
    lowestValue: { type: Number, required: true },
    highLimit: { type: Number, default: 100000 },
    lowLimit: { type: Number, default: 100 },
    bcolor: { type: String, default: '#ffffff' },
    cr: { type: String, default: '' },
    chart: { type: String, default: null },
    channel: { type: String, default: null },
    message: { type: String, default: null },
    amessage: { type: String, default: null }
}, { timestamps: true });

export default model<ICoin>("Coin", CoinSchema);
