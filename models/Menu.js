import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema({
  name: String,
  category: String,
  veg: String,
  spice: String,
  price: String,
  description: String,
  photo: String,
});

const MenuSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
  categories: [{ name: String }],
  items: [ItemSchema],
});

export default mongoose.models.Menu || mongoose.model("Menu", MenuSchema);