import mongoose from "mongoose";

const CustomerRequestSchema = new mongoose.Schema({
  restaurantId: { type: String, required: true },
  table: { type: String, required: true },
  type: { type: String, enum: ["waiter", "bill"], required: true },
  status: { type: String, enum: ["pending", "resolved"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.CustomerRequest ||
  mongoose.model("CustomerRequest", CustomerRequestSchema);