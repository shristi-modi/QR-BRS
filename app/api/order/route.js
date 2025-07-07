import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Order from "@/models/Order";
import CustomerRequest from "@/models/CustomerRequest"; // NEW: import the model
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";

// --- Helper for token ---
function getUserIdFromToken() {
  const token = Cookies.get("token");
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    return decoded.userId;
  } catch {
    return null;
  }
}

// --- ORDER LOGIC (unchanged) ---

export async function POST(request) {
  // If this is a customer request, handle that
  const url = new URL(request.url);
  if (url.searchParams.get("customerRequest") === "1") {
    try {
      const { restaurantId, table, type } = await request.json();
      if (!restaurantId || !table || !type) {
        return NextResponse.json({ success: false, message: "Missing fields" }, { status: 400 });
      }
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
      }
      const customerRequest = await CustomerRequest.create({
        restaurantId,
        table,
        type,
        status: "pending",
        createdAt: new Date(),
      });
      // Optionally: if (global.io) global.io.emit("customer-request:new", customerRequest);
      return NextResponse.json({ success: true, request: customerRequest });
    } catch (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  // --- ORIGINAL ORDER POST ---
  try {
    const { restaurantId, table, items } = await request.json();

    if (!restaurantId || !table || !items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, message: "Missing fields" }, { status: 400 });
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const order = await Order.create({
      restaurant: restaurantId,
      table,
      items,
      status: "pending",
      createdAt: new Date(),
    });

    if (global.io) {
      global.io.emit("order:new", order);
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// --- GET all orders (admin) or customer requests ---
export async function GET(request) {
  const url = new URL(request.url);
  if (url.searchParams.get("customerRequest") === "1") {
    // Handle customer request fetch
    try {
      const restaurantId = url.searchParams.get("restaurantId");
      if (!restaurantId) {
        return NextResponse.json({ success: false, message: "Missing restaurantId" }, { status: 400 });
      }
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
      }
      const requests = await CustomerRequest.find({ restaurantId }).sort({ createdAt: -1 });
      return NextResponse.json({ success: true, requests });
    } catch (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  // --- ORIGINAL ORDER GET ---
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Get token from request cookies (server-side)
    const token = request.cookies.get("token")?.value;
    let restaurantId = null;
    if (token) {
      try {
        const decoded = jwtDecode(token);
        restaurantId = decoded.userId;
      } catch {
        restaurantId = null;
      }
    }

    let query = {};
    if (restaurantId) {
      query.restaurant = restaurantId;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Add this to your route.js
export async function DELETE(request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, message: "Missing id" }, { status: 400 });
    }
    
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Permanent deletion
    const deletedRequest = await CustomerRequest.findByIdAndDelete(id);
    
    if (!deletedRequest) {
      return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


// --- PATCH orders or customer requests ---
export async function PATCH(request) {
  const url = new URL(request.url);
  if (url.searchParams.get("customerRequest") === "1") {
    // Handle customer request PATCH (resolve)
    try {
      const { id } = await request.json();
      if (!id) {
        return NextResponse.json({ success: false, message: "Missing id" }, { status: 400 });
      }
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
      }
      const updated = await CustomerRequest.findByIdAndUpdate(
        id,
        { status: "resolved" },
        { new: true }
      );
      if (!updated) {
        return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, request: updated });
    } catch (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  // --- ORIGINAL ORDER PATCH ---
  try {
    const { ids, status } = await request.json();
    if (!ids || !Array.isArray(ids) || !status) {
      return NextResponse.json({ success: false, message: "Missing ids or status" }, { status: 400 });
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

await Order.updateMany(
  { _id: { $in: ids } },
  { $set: status === "served" ? { status, servedAt: new Date() } : { status } }
);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}