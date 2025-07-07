import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Menu from "@/models/Menu"
import jwt from "jsonwebtoken";

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // Get JWT from cookies
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.userId;

    const { items, categories } = await request.json();

    // Upsert menu for this user
    const menu = await Menu.findOneAndUpdate(
      { user: userId },
      { items, categories, user: userId },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, menu });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // Check for public menu fetch by restaurantId
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");
    if (restaurantId) {
      const menu = await Menu.findOne({ user: restaurantId });
      return NextResponse.json({ success: true, menu });
    }

    // Otherwise, require authentication
    const token = request.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.userId;

    const menu = await Menu.findOne({ user: userId });
    return NextResponse.json({ success: true, menu });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}