"use client";
import { useEffect, useState } from "react";
import SidebarKitchen from "@/components/SidebarKitchen";
import { motion } from "framer-motion";
import { FaCheckCircle, FaTable, FaReceipt, FaRegSadTear } from "react-icons/fa";

export default function ServedHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/order")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch orders");
        return res.json();
      })
      .then(data => {
        if (data.orders) {
          setOrders(data.orders.filter(order => order.status === "served"));
        } else {
          setOrders([]);
        }
        setError("");
      })
      .catch(err => {
        setError("Could not load served orders. Please try again.");
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-indigo-50 via-blue-50 to-blue-100">
      <SidebarKitchen />
      <main className="flex-1 p-8 overflow-auto">
        <motion.h1
          className="text-4xl font-extrabold mb-10 text-blue-900 tracking-tight flex items-center gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <FaReceipt className="text-blue-600" />
          Served Orders History
        </motion.h1>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-80 text-blue-400 animate-pulse">
            <FaTable className="text-6xl mb-4" />
            <h4 className="text-2xl font-semibold">Loading served orders...</h4>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-80 text-red-400">
            <FaRegSadTear className="text-6xl mb-4" />
            <h4 className="text-2xl font-semibold">{error}</h4>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && orders.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center h-80 text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <FaRegSadTear className="text-6xl mb-4" />
            <h4 className="text-2xl font-semibold">No served orders yet.</h4>
            <p className="mt-2 text-md text-gray-500">Once you serve orders, they'll appear here for your records.</p>
          </motion.div>
        )}

        {/* Served Orders List */}
        {!loading && !error && orders.length > 0 && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.1,
                }
              }
            }}
          >
            {orders.map(order => (
              <motion.div
                key={order._id ?? Math.random()}
                className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-blue-100/60 flex flex-col"
                whileHover={{ y: -4, scale: 1.025 }}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white px-6 py-4 rounded-t-3xl flex items-center justify-between">
                  <h5 className="text-lg font-bold flex items-center gap-2">
                    <FaTable className="text-xl" />
                    Table: <span className="ml-1">{order.table ?? "N/A"}</span>
                  </h5>
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-green-500/90 text-white rounded-full shadow">
                    <FaCheckCircle className="text-white" />
                    Served
                  </span>
                </div>
                <div className="p-5 space-y-4 flex-1 flex flex-col">
                  <div className="flex items-center justify-between text-gray-600 text-sm">
                    <span>
                      Order ID:{" "}
                      <span className="font-mono font-medium text-blue-900">
                        {order._id?.slice(-6) ?? "N/A"}
                      </span>
                    </span>
                    <span className="text-xs text-gray-400">
                      {order.createdAt && !isNaN(new Date(order.createdAt))
                        ? new Date(order.createdAt).toLocaleString()
                        : ""}
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-gray-100 bg-blue-50/40">
                    <table className="min-w-full text-sm text-left text-gray-700">
                      <thead className="bg-blue-50 text-blue-700">
                        <tr>
                          <th scope="col" className="pr-4 py-2 font-semibold">Item</th>
                          <th scope="col" className="pr-4 py-2 font-semibold">Qty</th>
                          <th scope="col" className="pr-4 py-2 font-semibold">Price</th>
                          <th scope="col" className="py-2 font-semibold">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items?.length > 0 ? (
                          order.items.map((item, idx) => (
                            <tr
                              key={item._id ?? `${item.name}-${idx}`}
                              className="border-b last:border-b-0 hover:bg-blue-50/40 transition"
                            >
                              <td className="pr-4 py-2">{item.name ?? "Unnamed"}</td>
                              <td className="pr-4 py-2">{item.quantity ?? 0}</td>
                              <td className="pr-4 py-2">₹{item.price ?? 0}</td>
                              <td className="py-2 font-semibold text-blue-800">
                                ₹{(item.price ?? 0) * (item.quantity ?? 0)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-2 text-center text-gray-400 italic">
                              No items in this order.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <span className="text-lg font-bold text-blue-800">
                      Total: ₹
                      {order.items?.reduce(
                        (sum, item) =>
                          sum + (item.price ?? 0) * (item.quantity ?? 0),
                        0
                      ) ?? 0}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
