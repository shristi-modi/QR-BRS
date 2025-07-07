import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  table: { type: String, required: true },
  items: [
    {
      name: String,
      quantity: Number,
      price: String,
      // add other fields as needed
    }
  ],
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now },
  servedAt: { type: Date },
});

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);