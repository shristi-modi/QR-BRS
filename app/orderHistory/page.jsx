"use client"
import { useEffect, useState } from "react"
import Sidebar from "@/components/Sidebar"
import { Calendar, Clock, CreditCard, Filter, Receipt, TrendingUp, Users } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const revenueRanges = [
  { label: "Today", value: "day", icon: Clock },
  { label: "This Week", value: "week", icon: Calendar },
  { label: "This Month", value: "month", icon: Calendar },
  { label: "This Year", value: "year", icon: TrendingUp },
]

// Helper functions for filtering by range
function isInRange(date, range) {
  const now = new Date()
  const d = new Date(date)

  if (range === "year") {
    return d.getFullYear() === now.getFullYear()
  }
  if (range === "month") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }
  if (range === "week") {
    const nowCopy = new Date(now)
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
    const weekStart = new Date(nowCopy.setDate(now.getDate() - dayOfWeek))
    weekStart.setHours(0, 0, 0, 0)
    return d >= weekStart && d <= now
  }
  if (range === "day") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }
  return true
}

export default function OrderHistory() {
  const [orders, setOrders] = useState([])
  const [sortOrder, setSortOrder] = useState("latest")
  const [revenueRange, setRevenueRange] = useState("year")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/order")
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) {
          setOrders(data.orders.filter((order) => order.status === "paid"))
        }
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  const sortedOrders = [...orders].sort((a, b) => {
    if (sortOrder === "latest") {
      return new Date(b.createdAt) - new Date(a.createdAt)
    } else {
      return new Date(a.createdAt) - new Date(b.createdAt)
    }
  })

  const filteredOrdersForRevenue = sortedOrders.filter((order) => isInRange(order.createdAt, revenueRange))

  const totalRevenue = filteredOrdersForRevenue.reduce(
    (sum, order) => sum + order.items.reduce((orderSum, item) => orderSum + item.price * item.quantity, 0),
    0,
  )

  const selectedRange = revenueRanges.find((r) => r.value === revenueRange)

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <aside className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-r border-slate-200/60 shadow-xl">
        <Sidebar />
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <Receipt className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Order History
              </h1>
              <p className="text-slate-600 mt-1">Track and manage your restaurant orders</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/70 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-white/20">
            <Filter className="w-5 h-5 text-slate-600" />
            <label htmlFor="sortOrder" className="text-slate-700 font-medium">
              Sort by:
            </label>
            <select
              id="sortOrder"
              className="bg-transparent border-none outline-none text-slate-700 font-medium cursor-pointer"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </motion.div>

        {/* Revenue Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-8 mb-8 shadow-2xl text-white relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8" />
                <h2 className="text-2xl font-bold">Total Revenue</h2>
              </div>

              <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-2xl p-3">
                {selectedRange && <selectedRange.icon className="w-5 h-5" />}
                <select
                  value={revenueRange}
                  onChange={(e) => setRevenueRange(e.target.value)}
                  className="bg-transparent border-none outline-none text-white font-medium cursor-pointer"
                >
                  {revenueRanges.map((r) => (
                    <option key={r.value} value={r.value} className="text-slate-800">
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-5xl font-bold mb-2">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-emerald-100">{filteredOrdersForRevenue.length} orders in selected period</p>
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
        </motion.div>

        {/* Orders Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : sortedOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col justify-center items-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border border-white/20"
          >
            <Receipt className="w-16 h-16 text-slate-400 mb-4" />
            <p className="text-xl text-slate-500 font-medium">No paid orders yet</p>
            <p className="text-slate-400 mt-2">Orders will appear here once customers make payments</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {sortedOrders.map((order, index) => (
                <motion.article
                  key={order._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
                >
                  {/* Header */}
                  <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="w-6 h-6" />
                        <h2 className="text-xl font-bold">Table {order.table}</h2>
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                        <CreditCard className="w-4 h-4 inline mr-1" />
                        <span className="text-sm font-medium">Paid</span>
                      </div>
                    </div>
                  </header>

                  {/* Body */}
                  <section className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Receipt className="w-4 h-4" />
                      <span className="font-mono bg-slate-100 px-2 py-1 rounded-lg text-xs">{order._id.slice(-8)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="w-4 h-4" />
                      <time dateTime={order.createdAt}>
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : ""}
                      </time>
                    </div>

                    {/* Items */}
                    <div className="bg-slate-50/50 rounded-2xl p-4 space-y-3">
                      <h3 className="font-semibold text-slate-700 mb-3">Order Items</h3>
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 border-b border-slate-200/50 last:border-b-0"
                        >
                          <div className="flex-1">
                            <span className="font-medium text-slate-700">{item.name}</span>
                            <span className="text-slate-500 ml-2">×{item.quantity}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-slate-800">
                              ₹{(item.price * item.quantity).toLocaleString()}
                            </div>
                            <div className="text-xs text-slate-500">₹{item.price} each</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Footer */}
                  <footer className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-slate-200/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Total Amount</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        ₹{order.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toLocaleString()}
                      </span>
                    </div>
                  </footer>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}
