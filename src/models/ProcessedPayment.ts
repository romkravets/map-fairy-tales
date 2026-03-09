// src/models/ProcessedPayment.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProcessedPayment extends Document {
  orderReference: string;
  processedAt: number;
  userId: string;
  packageId: string;
}

const ProcessedPaymentSchema = new Schema<IProcessedPayment>(
  {
    orderReference: { type: String, required: true, unique: true, index: true },
    processedAt: { type: Number, required: true },
    userId: { type: String, required: true },
    packageId: { type: String, required: true },
  },
  { timestamps: true },
);

const ProcessedPayment: Model<IProcessedPayment> =
  mongoose.models.ProcessedPayment ??
  mongoose.model<IProcessedPayment>("ProcessedPayment", ProcessedPaymentSchema);

export default ProcessedPayment;
