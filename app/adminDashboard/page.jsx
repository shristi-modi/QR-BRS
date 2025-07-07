"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
);

function getDateString(date) {
  return date.toISOString().split("T")[0];
}
function getHourString(date) {
  return date.getHours() + ":00";
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [stats, setStats] = useState({
    todaySales: 0,
    weekSales: 0,
    monthSales: 0,
    numOrders: 0,
    avgOrderValue: 0,
    topItem: null,
    leastItems: [],
    activeTables: 0,
    peakHour: null,
    salesByDay: [],
    salesByHour: [],
    catMap: {},
    orderVolume: [],
    avgPrepTime: 0,
    avgScaledPrepTime: 0,
    avgOrderSize: 0,
    topCombos: [],
    itemAnalytics: [],
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/order").then((res) => res.json()),
      fetch("/api/menu").then((res) => res.json()),
    ]).then(([orderData, menuData]) => {
      const paidOrders = (orderData.orders || []).filter(
        (o) => o.status === "paid"
      );
      const menuItems = menuData.menu?.items || [];
      setOrders(paidOrders);
      setMenu(menuItems);

      // --- KPIs ---
      const now = new Date();
      const todayStr = getDateString(now);
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekStr = getDateString(weekStart);
      const monthStr =
        now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");

      let todaySales = 0,
        weekSales = 0,
        monthSales = 0,
        numOrders = paidOrders.length;
      let totalValue = 0,
        totalItems = 0,
        tableSet = new Set(),
        orderSizes = [];
      let itemMap = {},
        comboMap = {},
        dayMap = {},
        hourMap = {},
        catMap = {};

      paidOrders.forEach((order) => {
        const orderDate = new Date(order.createdAt);
        const orderDay = getDateString(orderDate);
        const orderHour = getHourString(orderDate);
        const orderMonth =
          orderDate.getFullYear() +
          "-" +
          String(orderDate.getMonth() + 1).padStart(2, "0");
        const orderValue = order.items.reduce(
          (s, i) => s + i.price * i.quantity,
          0
        );

        // Sales by day/hour
        dayMap[orderDay] = (dayMap[orderDay] || 0) + orderValue;
        hourMap[orderHour] = (hourMap[orderHour] || 0) + orderValue;

        // Sales by category (optional)
        order.items.forEach((i) => {
          const cat =
            menuItems.find((m) => m.name === i.name)?.category || "Other";
          catMap[cat] = (catMap[cat] || 0) + i.price * i.quantity;
        });

        // KPIs
        if (orderDay === todayStr) todaySales += orderValue;
        if (orderDay >= weekStr) weekSales += orderValue;
        if (orderMonth === monthStr) monthSales += orderValue;
        totalValue += orderValue;
        tableSet.add(order.table);
        orderSizes.push(order.items.reduce((s, i) => s + i.quantity, 0));

        // Items sold
        order.items.forEach((i) => {
          itemMap[i.name] = (itemMap[i.name] || 0) + i.quantity;
          totalItems += i.quantity;
        });

        // Combos (sorted item names as key)
        const comboKey = order.items
          .map((i) => i.name)
          .sort()
          .join("+");
        if (comboKey) comboMap[comboKey] = (comboMap[comboKey] || 0) + 1;
      });

      // Top/least items
      const sortedItems = Object.entries(itemMap).sort((a, b) => b[1] - a[1]);
      const topItem = sortedItems[0]
        ? { name: sortedItems[0][0], qty: sortedItems[0][1] }
        : null;
      const leastItems = sortedItems
        .slice(-3)
        .map(([name, qty]) => ({ name, qty }));

      // Peak hour
      const peakHour =
        Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      // Top combos
      const topCombos = Object.entries(comboMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([combo, count]) => ({ combo, count }));

      // Item/category analytics
      const itemAnalytics = sortedItems.map(([name, qty]) => ({
        name,
        qty,
        category: menuItems.find((m) => m.name === name)?.category || "Other",
      }));

      // --- Average Preparation Time Calculations ---
      // Calculate average preparation time (in minutes) using servedAt and createdAt
      const prepTimes = paidOrders
        .filter((order) => order.servedAt && order.createdAt)
        .map(
          (order) =>
            (new Date(order.servedAt) - new Date(order.createdAt)) / 60000
        );

      // Calculate average scaled preparation time (as if every order value is ₹500)
      const scaledPrepTimes = paidOrders
        .filter(
          (order) =>
            order.servedAt &&
            order.createdAt &&
            order.items &&
            order.items.length > 0
        )
        .map((order) => {
          const orderValue = order.items.reduce(
            (s, i) => s + i.price * i.quantity,
            0
          );
          if (orderValue === 0) return null;
          const prepTime =
            (new Date(order.servedAt) - new Date(order.createdAt)) / 60000;
          return prepTime * (500 / orderValue);
        })
        .filter(Boolean);

      const avgPrepTime = prepTimes.length
        ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length)
        : 0;

      const avgScaledPrepTime = scaledPrepTimes.length
        ? Math.round(
            scaledPrepTimes.reduce((a, b) => a + b, 0) / scaledPrepTimes.length
          )
        : 0;

      setStats({
        todaySales,
        weekSales,
        monthSales,
        numOrders,
        avgOrderValue: numOrders ? Math.round(totalValue / numOrders) : 0,
        topItem,
        leastItems,
        activeTables: tableSet.size,
        peakHour,
        salesByDay: Object.entries(dayMap).map(([d, v]) => ({
          day: d,
          value: v,
        })),
        salesByHour: Object.entries(hourMap).map(([h, v]) => ({
          hour: h,
          value: v,
        })),
        catMap,
        orderVolume: Object.entries(dayMap).map(([d, v]) => ({
          day: d,
          value: v,
        })),
        avgPrepTime,
        avgScaledPrepTime,
        avgOrderSize: orderSizes.length
          ? Math.round(
              orderSizes.reduce((a, b) => a + b, 0) / orderSizes.length
            )
          : 0,
        topCombos,
        itemAnalytics,
      });
    });
  }, []);

  // Chart Data
  const lineData = {
    labels: stats.salesByDay.map((d) => d.day),
    datasets: [
      {
        label: "Sales by Day",
        data: stats.salesByDay.map((d) => d.value),
        fill: true,
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.1)",
        tension: 0.4,
        pointBackgroundColor: "#6366f1",
      },
    ],
  };

  const barData = {
    labels: stats.salesByHour.map((h) => h.hour),
    datasets: [
      {
        label: "Sales by Hour",
        data: stats.salesByHour.map((h) => h.value),
        backgroundColor: "rgba(16, 185, 129, .7)",
        borderRadius: 8,
        barPercentage: 0.7,
        categoryPercentage: 0.7,
      },
    ],
  };

  const pieData = {
    labels: Object.keys(stats.catMap),
    datasets: [
      {
        label: "Category Revenue",
        data: Object.values(stats.catMap),
        backgroundColor: [
          "#6366f1",
          "#10b981",
          "#f59e42",
          "#f43f5e",
          "#a21caf",
          "#fbbf24",
          "#60a5fa",
          "#f472b6",
        ],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  // Gradient header and animated card shadow classes
  const glassCard =
    "bg-white/80 rounded-2xl shadow-xl backdrop-blur-lg border border-white/80 hover:shadow-2xl transition-shadow duration-300";

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-fuchsia-50 to-indigo-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight mb-2 bg-gradient-to-r from-indigo-500 via-fuchsia-600 to-indigo-400 bg-clip-text text-transparent drop-shadow-lg">
            Admin Dashboard
          </h1>
          <p className="text-lg text-gray-500">
            Monitor and analyze your restaurant's performance at a glance.
          </p>
        </div>
        {/* Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className={`${glassCard} p-6 flex flex-col items-start`}>
            <span className="bg-gradient-to-r from-green-400 to-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold mb-4 shadow">
              Today
            </span>
            <h6 className="uppercase text-xs font-bold opacity-80 tracking-wider">
              Total Sales
            </h6>
            <h3 className="text-3xl font-extrabold mt-2 mb-1 text-green-700 tracking-tight drop-shadow">
              ₹{stats.todaySales}
            </h3>
            <div className="text-xs text-gray-500 mt-1">
              <span className="mr-2">
                Week: <span className="font-bold">₹{stats.weekSales}</span>
              </span>
              <span>
                Month: <span className="font-bold">₹{stats.monthSales}</span>
              </span>
            </div>
          </div>
          <div className={`${glassCard} p-6 flex flex-col items-start`}>
            <span className="bg-gradient-to-r from-blue-400 to-indigo-500 text-white px-3 py-1 rounded-full text-sm font-semibold mb-4 shadow">
              Orders
            </span>
            <h6 className="uppercase text-xs font-bold opacity-80 tracking-wider">
              Orders Placed
            </h6>
            <h3 className="text-3xl font-extrabold mt-2 mb-1 text-blue-700 tracking-tight drop-shadow">
              {stats.numOrders}
            </h3>
            <div className="text-xs text-gray-500 mt-1">
              Avg. Order Value:{" "}
              <span className="font-bold">₹{stats.avgOrderValue}</span>
            </div>
          </div>
          <div className={`${glassCard} p-6 flex flex-col items-start`}>
            <span className="bg-gradient-to-r from-fuchsia-400 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-semibold mb-4 shadow">
              Top
            </span>
            <h6 className="uppercase text-xs font-bold opacity-80 tracking-wider">
              Top-Selling Item
            </h6>
            <h3 className="text-3xl font-extrabold mt-2 mb-1 text-pink-700 tracking-tight drop-shadow">
              {stats.topItem
                ? `${stats.topItem.name} (${stats.topItem.qty})`
                : "N/A"}
            </h3>
            <div className="text-xs text-gray-500 mt-1">
              Least:{" "}
              <span className="font-bold">
                {stats.leastItems.map((i) => i.name).join(", ") || "N/A"}
              </span>
            </div>
          </div>
          <div className={`${glassCard} p-6 flex flex-col items-start`}>
            <span className="bg-gradient-to-r from-yellow-300 to-orange-400 text-gray-900 px-3 py-1 rounded-full text-sm font-semibold mb-4 shadow">
              Activity
            </span>
            <h6 className="uppercase text-xs font-bold opacity-80 tracking-wider">
              Active Tables
            </h6>
            <h3 className="text-3xl font-extrabold mt-2 mb-1 text-yellow-600 tracking-tight drop-shadow">
              {stats.activeTables}
            </h3>
            <div className="text-xs text-gray-500 mt-1">
              Peak Hour:{" "}
              <span className="font-bold">{stats.peakHour || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown & Order Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className={`${glassCard} p-6`}>
            <h6 className="text-lg font-bold text-indigo-700 mb-4 flex items-center">
              <span className="mr-2">📈</span> Sales by Day
            </h6>
            <Line
              data={lineData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  tooltip: { mode: "index", intersect: false },
                },
                scales: {
                  x: { grid: { color: "#f3f4f6" } },
                  y: { grid: { color: "#f3f4f6" } },
                },
              }}
            />
          </div>
          <div className={`${glassCard} p-6`}>
            <h6 className="text-lg font-bold text-emerald-700 mb-4 flex items-center">
              <span className="mr-2">⏰</span> Sales by Hour
            </h6>
            <Bar
              data={barData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  tooltip: { mode: "index", intersect: false },
                },
                scales: {
                  x: { grid: { color: "#f3f4f6" } },
                  y: { grid: { color: "#f3f4f6" } },
                },
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className={`${glassCard} p-6 flex flex-col items-center`}>
            <h6 className="text-lg font-bold text-indigo-700 mb-4 flex items-center">
              <span className="mr-2">🧾</span> Category-wise Revenue
            </h6>
            <div className="w-full h-[320px] md:w-[400px] md:h-[400px] flex items-center justify-center">
              <Pie
                data={pieData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: { color: "#374151", font: { size: 14 } },
                    },
                    tooltip: {
                      enabled: true,
                      backgroundColor: "#fff",
                      titleColor: "#333",
                      bodyColor: "#333",
                    },
                  },
                }}
              />
            </div>
          </div>
          <div className={`${glassCard} p-6`}>
            <h6 className="text-lg font-bold text-fuchsia-700 mb-4 flex items-center">
              <span className="mr-2">🍱</span> Top Combos
            </h6>
            <ul className="list-inside space-y-2 text-gray-700 font-medium">
              {stats.topCombos.length === 0 ? (
                <li className="text-gray-400">No data</li>
              ) : (
                stats.topCombos.map((combo, idx) => (
                  <li key={idx} className="flex items-center">
                    <span className="mr-2 rounded bg-fuchsia-200 text-fuchsia-700 px-2 py-0.5 font-semibold">
                      {combo.combo}
                    </span>
                    <span className="ml-auto font-bold text-fuchsia-700">
                      ({combo.count})
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Advanced Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className={`${glassCard} p-6 flex flex-col justify-between`}>
            <div>
              <h6 className="text-lg font-bold text-emerald-700 mb-4 flex items-center">
                <span className="mr-2">⏳</span>Average Preparation Time
              </h6>
              <h3 className="text-3xl font-extrabold mt-2 mb-1 text-emerald-700 tracking-tight drop-shadow">
                {stats.avgPrepTime} min
              </h3>
              <div className="text-xs text-gray-500 mt-1">
                Avg. Order Size:{" "}
                <span className="font-bold">{stats.avgOrderSize}</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                <span className="font-bold text-indigo-700">
                  Avg. Prep Time (scaled to ₹500):{" "}
                </span>
                <span className="font-bold">{stats.avgScaledPrepTime} min</span>
              </div>
            </div>
          </div>
          <div className={`${glassCard} p-6`}>
            <h6 className="text-lg font-bold text-indigo-700 mb-2">
              Top-Selling Items
            </h6>
            <ul className="list-inside space-y-1 text-gray-700 font-medium">
              {stats.itemAnalytics.slice(0, 3).map((item, idx) => (
                <li key={idx}>
                  {item.name}{" "}
                  <span className="text-xs font-bold text-indigo-600">
                    ({item.qty})
                  </span>
                </li>
              ))}
            </ul>
            <h6 className="text-lg font-bold text-pink-700 mt-6 mb-2">
              Least-Selling Items
            </h6>
            <ul className="list-inside space-y-1 text-gray-700 font-medium">
              {stats.itemAnalytics.slice(-3).map((item, idx) => (
                <li key={idx}>
                  {item.name}{" "}
                  <span className="text-xs font-bold text-pink-600">
                    ({item.qty})
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className={`${glassCard} p-6`}>
            <h6 className="text-lg font-bold text-blue-700 mb-4">
              Item-wise Analytics
            </h6>
            <div className="overflow-y-auto max-h-44 custom-scrollbar">
              <table className="min-w-full text-sm text-left border-separate border-spacing-y-1">
                <thead>
                  <tr>
                    <th className="font-bold py-1 px-2 bg-indigo-50 rounded-l">
                      Item
                    </th>
                    <th className="font-bold py-1 px-2 bg-indigo-50">
                      Category
                    </th>
                    <th className="font-bold py-1 px-2 bg-indigo-50 rounded-r">
                      Sold
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.itemAnalytics.map((item, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50 rounded-lg">
                      <td className="py-1 px-2">{item.name}</td>
                      <td className="py-1 px-2">{item.category}</td>
                      <td className="py-1 px-2">{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      
        {/* Custom Scrollbar for overflow-y */}
        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #c7d2fe;
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
        `}</style>
      </main>
    </div>
  );
}
