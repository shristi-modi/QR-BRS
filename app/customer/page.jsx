"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CustomerPageInner() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get("restaurant");
  const table = searchParams.get("table");

  const [menu, setMenu] = useState(null);
  const [cart, setCart] = useState([]);
  const [reorderCart, setReorderCart] = useState([]);
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasMainOrder, setHasMainOrder] = useState(false);
  const [unpaidOrders, setUnpaidOrders] = useState([]);
  const [billLoading, setBillLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);

  // NEW: Track pending customer requests for this table
  const [customerRequests, setCustomerRequests] = useState([]);

  // Always check backend for main order state and fetch unpaid orders
  const fetchOrderState = async () => {
    if (restaurantId && table) {
      // Fetch all unpaid orders (pending or served) for this table
      const ordersRes = await fetch(`/api/order`);
      let unpaidOrdersArr = [];
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        unpaidOrdersArr = (ordersData.orders || []).filter(
          order => order.table === table && (order.status !== "paid")
        );
      }
      setUnpaidOrders(unpaidOrdersArr);

      if (unpaidOrdersArr.length > 0) {
        // Main order is the first unpaid order (oldest)
        const mainOrder = unpaidOrdersArr.reduce((oldest, curr) =>
          new Date(curr.createdAt) < new Date(oldest.createdAt) ? curr : oldest
        );
        setOrderId(mainOrder.id || mainOrder._id);
        setHasMainOrder(true);
      } else {
        setOrderId(null);
        setHasMainOrder(false);
      }
    }
  };

  // Fetch pending customer requests for this table
  const fetchCustomerRequests = async () => {
    if (restaurantId && table) {
      const res = await fetch(
        `/api/order?customerRequest=1&restaurantId=${restaurantId}&table=${table}`
      );
      const data = await res.json();
      setCustomerRequests((data.requests || []).filter(r => r.status === "pending"));
    }
  };

  // Fetch menu and order state, and poll for requests
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      if (restaurantId && table) {
        const menuRes = await fetch(`/api/menu?restaurantId=${restaurantId}`);
        const menuData = await menuRes.json();
        setMenu(menuData.menu);
        await fetchOrderState();
        await fetchCustomerRequests();
      }
      setLoading(false);
    }
    fetchData();

    // Poll for pending requests every 4 seconds
    const interval = setInterval(() => {
      fetchCustomerRequests();
    }, 4000);
    return () => clearInterval(interval);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, table]);

  // Only allow Add to Cart if there is NO main order
  const addToCart = (item) => {
    if (hasMainOrder) return;
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.name === item.name);
      if (existing) {
        return prevCart.map((i) =>
          i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  // Only allow Reorder if there IS a main order
  const addToReorderCart = (item) => {
    if (!hasMainOrder) return;
    setReorderCart((prev) => {
      const found = prev.find((i) => i.name === item.name);
      if (found) {
        return prev.map((i) =>
          i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (item) => {
    setCart((prevCart) =>
      prevCart
        .map((i) =>
          i.name === item.name ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromReorderCart = (item) => {
    setReorderCart((prev) =>
      prev
        .map((i) =>
          i.name === item.name ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  // Place order logic:
  // - If NO main order: send cart as main order (POST)
  // - If main order exists: send reorderCart as reorder (PUT)
  const placeOrder = async () => {
    if (!hasMainOrder) {
      // Place main order
      if (cart.length === 0) return;
      const payload = {
        restaurantId,
        table,
        items: cart,
      };
      await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setCart([]);
      setReorderCart([]);
      await fetchOrderState();
      alert("Order placed!");
    } else {
      // Place reorder (only reorderCart)
      if (reorderCart.length === 0) return;
      const payload = {
        restaurantId,
        table,
        items: reorderCart,
      };
      await fetch(`/api/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setReorderCart([]);
      await fetchOrderState();
      alert("Reorder placed!");
    }
  };

  // Unified cart logic
  const cartItems = hasMainOrder ? reorderCart : cart;
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartHeading = hasMainOrder ? "Your Re-order" : "Your Order";
  const cartEmptyText = hasMainOrder ? "No items in re-order." : "No items in cart.";

  // Bill calculation for all unpaid orders of this table
  const billItems = [];
  let billTotal = 0;
  unpaidOrders.forEach(order => {
    order.items.forEach(item => {
      const found = billItems.find(i => i.name === item.name && i.price === item.price);
      if (found) {
        found.quantity += item.quantity;
        found.total += item.price * item.quantity;
      } else {
        billItems.push({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
        });
      }
      billTotal += item.price * item.quantity;
    });
  });

  // --- NEW: Prevent repeated requests until resolved ---
  const hasPendingWaiterRequest = customerRequests.some(r => r.type === "waiter");
  const hasPendingBillRequest = customerRequests.some(r => r.type === "bill");

  // Call for bill handler (API triggers staff notification)
  const handleCallForBill = async () => {
    setBillLoading(true);
    try {
      await fetch("/api/order?customerRequest=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          table,
          type: "bill",
        }),
      });
      alert("Staff has been notified. Please wait for your bill.");
      await fetchCustomerRequests();
    } catch {
      alert("Failed to send request. Please try again.");
    }
    setBillLoading(false);
  };

  // Call for waiter handler (API triggers staff notification)
  const handleCallForWaiter = async () => {
    setRequestLoading(true);
    try {
      await fetch("/api/order?customerRequest=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          table,
          type: "waiter",
        }),
      });
      alert("Waiter is coming to your table.");
      await fetchCustomerRequests();
    } catch {
      alert("Failed to send request. Please try again.");
    }
    setRequestLoading(false);
  };

  // Pay Online handler (dummy)
  const handlePayOnline = async () => {
    setBillLoading(true);
    setTimeout(() => {
      setBillLoading(false);
      alert("Redirecting to payment gateway...");
    }, 1200);
  };

  if (!restaurantId || !table) {
    return (
      <div className="max-w-lg mx-auto py-10 text-center text-red-600 font-semibold">
        Invalid QR code.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-6 text-center">Menu</h2>
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></span>
          <span className="ml-3 text-lg">Loading menu...</span>
        </div>
      ) : menu ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {menu.items.map((item, idx) => (
              <div className="bg-white rounded-xl shadow-md hover:shadow-xl overflow-hidden flex flex-col" key={idx}>
                {item.photo && (
                  <img src={item.photo} alt={item.name} className="w-full h-44 object-cover" />
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <h5 className="text-xl font-semibold mb-1">{item.name}</h5>
                  <p className="text-gray-600 text-sm mb-2 flex-1">{item.description}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      item.veg === "veg" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {item.veg === "veg" ? "Veg" : "Non-Veg"}
                    </span>
                    <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800 font-semibold">
                      {item.spice}
                    </span>
                  </div>
                  <div className="text-lg font-bold mb-3">₹{item.price}</div>
                  <div className="flex gap-2 mt-auto">
                    <button
                      className={`flex-1 ${hasMainOrder ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"} font-semibold py-2 rounded transition`}
                      onClick={() => addToCart(item)}
                      disabled={hasMainOrder}
                    >
                      Add to Cart
                    </button>
                    <button
                      className={`flex-1 ${!hasMainOrder ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 text-white"} font-semibold py-2 rounded transition`}
                      onClick={() => addToReorderCart(item)}
                      disabled={!hasMainOrder}
                    >
                      Reorder
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Unified Cart Section */}
          <hr className="my-8" />
          <h4 className="text-2xl font-bold mb-4">{cartHeading}</h4>
          {cartItems.length === 0 ? (
            <div className="text-gray-500 mb-6">{cartEmptyText}</div>
          ) : (
            <ul className="mb-6 space-y-3">
              {cartItems.map((item, idx) => (
                <li
                  key={idx}
                  className={`flex items-center justify-between ${
                    hasMainOrder ? "bg-purple-50" : "bg-gray-50"
                  } rounded px-4 py-2 shadow-sm`}
                >
                  <span className="font-medium">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-lg font-bold"
                      onClick={() =>
                        hasMainOrder
                          ? removeFromReorderCart(item)
                          : removeFromCart(item)
                      }
                    >
                      −
                    </button>
                    <span
                      className={`font-semibold ${
                        hasMainOrder ? "text-purple-700" : "text-blue-700"
                      }`}
                    >
                      {item.quantity}
                    </span>
                    <button
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-lg font-bold"
                      onClick={() =>
                        hasMainOrder
                          ? addToReorderCart(item)
                          : addToCart(item)
                      }
                    >
                      +
                    </button>
                  </div>
                  <span className="text-gray-700 font-semibold">
                    ₹{item.price * item.quantity}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Total and Order Button */}
          <div className="flex justify-end items-center mb-6">
            <span className="text-xl font-bold mr-2">Total:</span>
            <span className="text-2xl text-green-700 font-bold">₹{cartTotal}</span>
          </div>

          <button
            className={`w-full py-3 rounded font-bold text-white transition ${
              cartItems.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
            disabled={cartItems.length === 0}
            onClick={placeOrder}
          >
            {!hasMainOrder ? "Place Order" : "Reorder"}
          </button>

          {/* Bill Section */}
          <hr className="my-8" />
          <h4 className="text-2xl font-bold mb-4 text-center">Current Bill</h4>
          {unpaidOrders.length === 0 ? (
            <div className="text-gray-500 mb-6 text-center">No unpaid orders yet.</div>
          ) : (
            <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-6 mb-8">
              <table className="w-full mb-4">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Item</th>
                    <th className="text-center py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {billItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1">{item.name}</td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right">₹{item.price}</td>
                      <td className="py-1 text-right">₹{item.total}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t">
                    <td colSpan={3} className="text-right font-bold py-2">Grand Total:</td>
                    <td className="text-right font-bold py-2 text-green-700">₹{billTotal}</td>
                  </tr>
                </tfoot>
              </table>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <button
                  className="flex-1 py-3 rounded font-bold text-white bg-orange-500 hover:bg-orange-600 transition"
                  onClick={handleCallForBill}
                  disabled={billLoading || hasPendingBillRequest}
                >
                  {hasPendingBillRequest
                    ? "Bill Requested"
                    : billLoading
                    ? "Calling Staff..."
                    : "Call for Bill"}
                </button>
                <button
                  className="flex-1 py-3 rounded font-bold text-white bg-gray-800 hover:bg-gray-900 transition"
                  onClick={handleCallForWaiter}
                  disabled={requestLoading || hasPendingWaiterRequest}
                >
                  {hasPendingWaiterRequest
                    ? "Waiter Requested"
                    : requestLoading
                    ? "Requesting..."
                    : "Call Waiter"}
                </button>
                {/* <button
                  className="flex-1 py-3 rounded font-bold text-white bg-blue-600 hover:bg-blue-700 transition"
                  onClick={handlePayOnline}
                  disabled={billLoading}
                >
                  {billLoading ? "Processing..." : "Pay Online"}
                </button> */}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-red-600 font-semibold">Menu not found.</div>
      )}
    </div>
  );
}

export default function CustomerPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-40">Loading...</div>}>
      <CustomerPageInner />
    </Suspense>
  );
}