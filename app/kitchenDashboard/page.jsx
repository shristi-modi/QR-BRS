"use client";
import { useEffect, useState } from "react";
import SidebarKitchen from "@/components/SidebarKitchen";
import { motion } from "framer-motion";
import { FaUtensils, FaPlusCircle, FaCheckCircle, FaRegSadTear } from "react-icons/fa";
import io from "socket.io-client";

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [filterType, setFilterType] = useState("table");
  const [selectedTable, setSelectedTable] = useState("");

  // Fetch orders and menu on mount
  useEffect(() => {
    fetch("/api/order")
      .then(res => res.json())
      .then(data => {
        setOrders((data.orders || []).filter(o => o.status === "pending" || o.status === "served"));
      });

    fetch("/api/menu")
      .then(res => res.json())
      .then(data => {
        setMenu(data.menu?.items || []);
      });
  }, []);

  //socket
  useEffect(() => {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
  
    socket.on("order:new", (order) => {
      setOrders((prev) => [order, ...prev]);
    });
  
    return () => {
      socket.disconnect();
    };
  }, []);

  // Map item names to categories for grouping
  const nameToCategory = {};
  menu.forEach(item => {
    nameToCategory[item.name] = item.category || "Other";
  });

  // Group orders by table
  const ordersByTable = orders.reduce((acc, order) => {
    acc[order.table] = acc[order.table] || [];
    acc[order.table].push(order);
    return acc;
  }, {});

  // Separate main and add-on orders
  const mainOrders = [];
  const addOnOrders = [];
  Object.entries(ordersByTable).forEach(([table, tableOrders]) => {
    const pendingOrders = tableOrders.filter(o => o.status === "pending" || o.status === "served");
    if (pendingOrders.length > 0) {
      const mainOrder = pendingOrders.reduce((oldest, curr) =>
        new Date(curr.createdAt) < new Date(oldest.createdAt) ? curr : oldest
      );
      mainOrders.push(mainOrder);

      tableOrders
        .filter(o => o.status === "pending" && o._id !== mainOrder._id)
        .forEach(o => addOnOrders.push(o));
    }
  });

  // Group items by category for quantity view
  function getCategoryWiseItems(orderList) {
    const itemMap = {};
    orderList.forEach(order => {
      order.items.forEach(item => {
        const cat = nameToCategory[item.name] || "Other";
        if (!itemMap[cat]) itemMap[cat] = {};
        if (!itemMap[cat][item.name]) itemMap[cat][item.name] = 0;
        itemMap[cat][item.name] += item.quantity;
      });
    });
    return Object.entries(itemMap).map(([cat, items]) => ({
      category: cat,
      items: Object.entries(items).map(([name, qty]) => ({ name, qty })),
    }));
  }

  // Mark an order as served
  const markAsServed = async (orderId) => {
    await fetch("/api/order", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [orderId], status: "served" }),
    });
    setOrders(orders => orders.map(o =>
      o._id === orderId ? { ...o, status: "served" } : o
    ));
  };

  // Filtering logic
  const filteredMainOrders = filterType === "table" && selectedTable
    ? mainOrders.filter(o => o.table === selectedTable)
    : mainOrders;

  const filteredAddOnOrders = filterType === "table" && selectedTable
    ? addOnOrders.filter(o => o.table === selectedTable)
    : addOnOrders;

  const allTables = Object.keys(ordersByTable);

  // --- Render ---
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <SidebarKitchen />
      <main className="flex-1 p-8 overflow-auto">
        <motion.h1
          className="text-4xl font-extrabold text-gray-800 mb-10 flex items-center gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <FaUtensils className="text-blue-500" />
          Kitchen Dashboard
        </motion.h1>

        {/* Filters */}
        <section className="flex flex-wrap items-center gap-4 mb-10">
          <label className="text-lg font-medium text-gray-700">Filter:</label>
          <select
            className="px-4 py-2 rounded-lg border shadow-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={filterType}
            onChange={e => {
              setFilterType(e.target.value);
              setSelectedTable("");
            }}
            aria-label="Filter Type"
          >
            <option value="table">Table Wise</option>
            <option value="quantity">Net Quantity</option>
          </select>

          {filterType === "table" && (
            <select
              className="px-4 py-2 rounded-lg border shadow-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
              value={selectedTable}
              onChange={e => setSelectedTable(e.target.value)}
              aria-label="Select Table"
            >
              <option value="">All Tables</option>
              {allTables.map(table => (
                <option key={table} value={table}>{table}</option>
              ))}
            </select>
          )}
        </section>

        {/* Orders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Main Orders */}
          <OrderSection
            icon={<FaUtensils className="text-2xl text-blue-400" />}
            title="Main Orders"
            color="from-blue-100 to-blue-50"
            filterType={filterType}
            orders={filteredMainOrders.filter(o => o.status === "pending")}
            renderOrderCards={renderOrderCards}
            renderCategoryView={renderCategoryView}
            getCategoryWiseItems={getCategoryWiseItems}
            markAsServed={markAsServed}
            nameToCategory={nameToCategory}
          />

          {/* Add-on Orders */}
          <OrderSection
            icon={<FaPlusCircle className="text-2xl text-purple-400" />}
            title="Add-On Orders"
            color="from-purple-100 to-purple-50"
            filterType={filterType}
            orders={filteredAddOnOrders.filter(o => o.status === "pending")}
            renderOrderCards={renderOrderCards}
            renderCategoryView={renderCategoryView}
            getCategoryWiseItems={getCategoryWiseItems}
            markAsServed={markAsServed}
            nameToCategory={nameToCategory}
          />
        </div>
      </main>
    </div>
  );

  // --- Helper Components ---

  function OrderSection({
    icon, title, color, filterType, orders,
    renderOrderCards, renderCategoryView, getCategoryWiseItems, ...rest
  }) {
    return (
      <section
        className={`rounded-2xl shadow-lg bg-gradient-to-br ${color} p-6 border border-gray-200`}
      >
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
        </div>
        <hr className="mb-4 border-gray-200" />
        {filterType === "quantity"
          ? renderCategoryView(getCategoryWiseItems(orders))
          : renderOrderCards(orders, rest)}
      </section>
    );
  }

  // --- Render Order Cards ---
  function renderOrderCards(orderList, { markAsServed, nameToCategory }) {
    if (orderList.length === 0)
      return (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <FaRegSadTear className="text-3xl mb-2" />
          <span className="italic">No orders found.</span>
        </div>
      );

    return orderList.map(order => (
      <motion.div
        key={order._id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.03, boxShadow: "0 6px 24px rgba(0,0,0,0.08)" }}
        className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-5 transition-all"
      >
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm text-gray-700 font-medium">
            <span className="text-blue-600 font-semibold">Table {order.table}</span>
            <span className="mx-2 text-gray-300">|</span>
            <span className="text-xs text-gray-400">ID: {order._id.slice(-6)}</span>
          </div>
          <button
            onClick={() => markAsServed(order._id)}
            aria-label="Mark as Served"
            className="flex items-center gap-2 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white text-sm px-4 py-1.5 rounded-lg shadow transition focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <FaCheckCircle className="text-lg" />
            Served
          </button>
        </div>
        <ul className="text-sm text-gray-700 space-y-1">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <span className="font-semibold">{item.name}</span>
              <span className="text-xs text-gray-500">({item.quantity})</span>
              <span className="text-xs text-gray-400 ml-2">[{nameToCategory[item.name]}]</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-400 mt-3">
          Placed at: <span className="font-mono">{new Date(order.createdAt).toLocaleString()}</span>
        </p>
      </motion.div>
    ));
  }

  // --- Render Category View ---
  function renderCategoryView(categories) {
    if (!categories.length)
      return (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <FaRegSadTear className="text-3xl mb-2" />
          <span className="italic">No items to show.</span>
        </div>
      );

    return categories.map(cat => (
      <motion.div
        key={cat.category}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-100 rounded-lg p-4 mb-4 shadow-sm"
      >
        <h4 className="text-md font-semibold text-gray-800 mb-2">{cat.category}</h4>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          {cat.items.map(item => (
            <li key={item.name}>
              {item.name}: <span className="font-bold">{item.qty}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    ));
  }
}
