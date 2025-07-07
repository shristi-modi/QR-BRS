
"use client"
import { useEffect, useState } from "react"
import { Printer, CheckCircle, PlusCircle, X, Clock, Users, DollarSign, ShoppingBag } from "lucide-react"
import Sidebar from "@/components/Sidebar"
import { jwtDecode } from "jwt-decode"
import Cookies from "js-cookie"
import io from "socket.io-client"

// Helper to extract user ID
function getUserIdFromToken() {
  const token = Cookies.get("token")
  if (!token) return null
  try {
    const decoded = jwtDecode(token)
    return decoded.userId
  } catch {
    return null
  }
}

// ---- COMPONENTS ----
function CustomerRequestBar({ requests, onResolve }) {
  return (
    <div className="w-full flex flex-col items-center mt-8 mb-8">
      <div className="w-full max-w-4xl rounded-2xl shadow-xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 overflow-hidden h-50">
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-400 px-8 py-5">
          <div className="flex items-center text-white">
            <div className="bg-white/20 rounded-full p-2 mr-4">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Customer Requests</h2>
              <p className="text-orange-100 text-sm">Active service requests from tables</p>
            </div>
            {requests.filter((r) => r.status === "pending").length > 0 && (
              <div className="ml-auto bg-white text-blue-500 rounded-full px-3 py-1 text-sm font-bold">
                {requests.filter((r) => r.status === "pending").length} pending
              </div>
            )}
          </div>
        </div>
        {/* Only the list is scrollable */}
        <div className="p-6 h-full">
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-600 font-medium">All caught up! No active requests.</p>
              <p className="text-gray-400 text-sm">Customer requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-2" style={{ maxHeight: '13.5rem' }}>
              {requests
                .filter((r) => r.status === "pending")
                .map((r) => (
                  <div
                    key={r._id || r.id}
                    className="flex items-center justify-between bg-white rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-center">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold mr-4">
                        {r.table}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">Table {r.table}</p>
                        <p className="text-sm text-gray-600">
                          {r.type === "waiter" ? "🙋‍♂️ Calling for Waiter" : "💳 Requesting Bill"}
                        </p>
                      </div>
                    </div>
                    <button
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-2 rounded-full font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
                      onClick={() => onResolve(r._id || r.id)}
                    >
                      Resolve
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OrderFormModal({
  menu,
  selectedTable,
  setSelectedTable,
  selectedItems,
  setSelectedItems,
  onClose,
  onConfirm,
}) {
  const currentItem = selectedItems._currentItem || ""
  const currentQty = selectedItems._currentQty || 1
  const list = selectedItems.list || []

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 relative">
          <button
            aria-label="Close modal"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors bg-white/20 rounded-full p-2 hover:bg-white/30"
          >
            <X size={20} />
          </button>
          <div className="flex items-center text-white">
            <div className="bg-white/20 rounded-full p-3 mr-4">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h2 id="modal-title" className="text-2xl font-bold">
                Place New Order
              </h2>
              <p className="text-indigo-100">Add items to create a new order</p>
            </div>
          </div>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Table Input */}
          <div className="mb-8">
            <label className="block mb-3 font-semibold text-gray-800 text-lg">Table Information</label>
            <input
              type="text"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-lg"
              placeholder="Enter table name or number (e.g., T1, 12, VIP-A)"
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
            />
          </div>

          {/* Item Selector */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-8">
            <h3 className="font-semibold text-gray-800 text-lg mb-4">Add Items</h3>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-grow min-w-[250px]">
                <label className="block text-sm font-medium text-gray-600 mb-2">Select Item</label>
                <select
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                  value={currentItem}
                  onChange={(e) =>
                    setSelectedItems((prev) => ({
                      ...prev,
                      _currentItem: e.target.value,
                      _currentQty: 1,
                    }))
                  }
                >
                  <option value="">Choose an item...</option>
                  {menu.map((item, idx) => (
                    <option key={idx} value={item.name}>
                      {item.name} - ₹{item.price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-600 mb-2">Quantity</label>
                <div className="flex items-center bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button
                    disabled={!currentItem}
                    onClick={() =>
                      setSelectedItems((prev) => ({
                        ...prev,
                        _currentQty: Math.max(1, currentQty - 1),
                      }))
                    }
                    className="disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 transition-colors"
                  >
                    −
                  </button>
                  <span className="font-bold text-lg px-6 py-3 min-w-[60px] text-center bg-white">{currentQty}</span>
                  <button
                    disabled={!currentItem}
                    onClick={() =>
                      setSelectedItems((prev) => ({
                        ...prev,
                        _currentQty: currentQty + 1,
                      }))
                    }
                    className="disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                disabled={!currentItem}
                onClick={() => {
                  const menuItem = menu.find((i) => i.name === currentItem)
                  if (!menuItem) return
                  const filtered = list.filter((i) => i.name !== currentItem)
                  setSelectedItems({
                    list: [...filtered, { name: currentItem, price: menuItem.price, quantity: currentQty }],
                    _currentItem: "",
                    _currentQty: 1,
                  })
                }}
                className="disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl px-6 py-3 font-semibold transition-all transform hover:scale-105 shadow-lg"
              >
                Add Item
              </button>
            </div>
          </div>

          {/* Order Preview */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-800 text-lg mb-4">Order Summary</h3>
            {list.length > 0 ? (
              <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-80">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold text-gray-800">Item</th>
                        <th className="px-6 py-4 text-center font-semibold text-gray-800">Qty</th>
                        <th className="px-6 py-4 text-right font-semibold text-gray-800">Price</th>
                        <th className="px-6 py-4 text-right font-semibold text-gray-800">Subtotal</th>
                        <th className="px-6 py-4 text-center font-semibold text-gray-800">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-100 hover:bg-indigo-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-800">{item.name}</td>
                          <td className="px-6 py-4 text-center text-gray-600">{item.quantity}</td>
                          <td className="px-6 py-4 text-right text-gray-600">₹{item.price}</td>
                          <td className="px-6 py-4 text-right font-semibold text-gray-800">
                            ₹{item.price * item.quantity}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() =>
                                setSelectedItems((prev) => ({
                                  ...prev,
                                  list: prev.list.filter((i) => i.name !== item.name),
                                }))
                              }
                              className="text-red-500 hover:text-red-700 font-semibold bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
                              aria-label={`Remove ${item.name}`}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-indigo-50 to-purple-50">
                      <tr>
                        <td colSpan="3" className="px-6 py-4 text-right font-bold text-gray-800 text-lg">
                          Total Amount:
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-indigo-600 text-xl">
                          ₹{list.reduce((sum, item) => sum + item.price * item.quantity, 0)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No items added yet</p>
                <p className="text-gray-400 text-sm">Select items from the menu above</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!selectedTable || list.length === 0}
              onClick={() => onConfirm(selectedTable, list)}
              className="disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              Confirm Order
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- MAIN PAGE ----
export default function OrderManagement() {
  const [orders, setOrders] = useState([])
  const [menu, setMenu] = useState([])
  const [selectedTable, setSelectedTable] = useState("")
  const [selectedItems, setSelectedItems] = useState({})
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [customerRequests, setCustomerRequests] = useState([])
  const restaurantId = getUserIdFromToken()

  // Fetch orders and menu
  useEffect(() => {
    const fetchData = async () => {
      const [orderRes, menuRes] = await Promise.all([fetch("/api/order"), fetch("/api/menu")])
      const orderData = await orderRes.json()
      const menuData = await menuRes.json()
      setOrders(orderData.orders || [])
      setMenu(menuData.menu?.items || [])
    }
    fetchData()
  }, [])

  // Poll for customer requests
  useEffect(() => {
    let interval
    const fetchRequests = async () => {
      if (!restaurantId) return
      const res = await fetch(`/api/order?restaurantId=${restaurantId}&customerRequest=1`)
      const data = await res.json()
      setCustomerRequests(data.requests || [])
    }
    fetchRequests()
    interval = setInterval(fetchRequests, 5000)
    return () => clearInterval(interval)
  }, [restaurantId])

  // Socket for real-time orders
  useEffect(() => {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000"
    const socket = io(SOCKET_URL, { transports: ["websocket"] })
    socket.on("order:new", (order) => {
      setOrders((prev) => [order, ...prev])
    })
    return () => {
      socket.disconnect()
    }
  }, [])

  // Handlers
  const handleResolveRequest = async (requestId) => {
    await fetch("/api/order", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: requestId }),
    })
    setCustomerRequests((prev) => prev.filter((r) => (r._id || r.id) !== requestId))
  }

  const handlePlaceOrder = async (table, items) => {
    if (!table || !items?.length) return alert("Select table and items")
    await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, table, items }),
    })
    setSelectedTable("")
    setSelectedItems({})
    setShowOrderForm(false)
    const res = await fetch("/api/order")
    const data = await res.json()
    setOrders(data.orders || [])
  }

  const handleMarkAsPaid = async (table, unpaidOrders) => {
    const ids = unpaidOrders.map((o) => o._id)
    await fetch("/api/order", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status: "paid" }),
    })
    setOrders((prev) => prev.map((o) => (ids.includes(o._id) ? { ...o, status: "paid" } : o)))
  }

  const handlePrint = (table, unpaidOrders) => {
    const allItems = unpaidOrders.flatMap((o) => o.items)
    const combinedItems = Object.values(
      allItems.reduce((acc, i) => {
        acc[i.name] = acc[i.name] ? { ...acc[i.name], quantity: acc[i.name].quantity + i.quantity } : { ...i }
        return acc
      }, {}),
    )
    const total = combinedItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

    const printWindow = window.open("", "_blank")
    printWindow.document.write(`
      <html>
      <head><title>Bill - Table ${table}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; background: #f8fafc; }
        .container { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h2 { color: #1e293b; margin-bottom: 20px; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
        th { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600; }
        .total { font-weight: bold; background: #f1f5f9; }
        .status { text-align: center; margin-top: 20px; padding: 10px; background: #fef3c7; border-radius: 8px; }
      </style></head>
      <body>
        <div class="container">
          <h2>🧾 Bill - Table ${table}</h2>
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
            </thead>
            <tbody>
              ${combinedItems
                .map(
                  (i) => `
                <tr>
                  <td>${i.name}</td>
                  <td>${i.quantity}</td>
                  <td>₹${i.price}</td>
                  <td>₹${i.price * i.quantity}</td>
                </tr>`,
                )
                .join("")}
              <tr class="total">
                <td colspan="3">Total Amount</td>
                <td>₹${total}</td>
              </tr>
            </tbody>
          </table>
          <div class="status">
            <strong>Status: Unpaid</strong>
          </div>
        </div>
      </body></html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  // Unpaid Orders by Table
  const unpaidOrdersByTable = orders
    .filter((o) => o.status !== "paid")
    .reduce((acc, o) => {
      acc[o.table] = acc[o.table] || []
      acc[o.table].push(o)
      return acc
    }, {})

  // Calculate stats
  const totalTables = Object.keys(unpaidOrdersByTable).length
  const totalRevenue = Object.values(unpaidOrdersByTable)
    .flat()
    .reduce((sum, order) => sum + order.items.reduce((orderSum, item) => orderSum + item.price * item.quantity, 0), 0)

  // ---- RENDER ----
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <main className="flex-grow p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Order Management
              </h1>
              <p className="text-gray-600 text-lg">Manage your restaurant orders and customer requests</p>
            </div>
            <button
              onClick={() => {
                setShowOrderForm(true)
                setSelectedTable("")
                setSelectedItems({})
              }}
              className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-2xl shadow-lg transition-all transform hover:scale-105 font-semibold"
            >
              <PlusCircle size={22} />
              New Order
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Active Tables</p>
                  <p className="text-3xl font-bold text-gray-800">{totalTables}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Pending Requests</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {customerRequests.filter((r) => r.status === "pending").length}
                  </p>
                </div>
                <div className="bg-orange-100 rounded-full p-3">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-800">₹{totalRevenue}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Request Bar */}
        <CustomerRequestBar requests={customerRequests} onResolve={handleResolveRequest} />

        {/* Orders Section */}
        {Object.keys(unpaidOrdersByTable).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-lg border border-gray-100">
            <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full p-8 mb-6">
              <ShoppingBag className="w-16 h-16 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Active Orders</h3>
            <p className="text-gray-600 text-lg mb-6">All orders have been completed and paid</p>
            <button
              onClick={() => {
                setShowOrderForm(true)
                setSelectedTable("")
                setSelectedItems({})
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105"
            >
              <PlusCircle size={20} />
              Create First Order
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {Object.entries(unpaidOrdersByTable).map(([table, tableOrders]) => (
              <div
                key={table}
                className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="bg-white/20 rounded-full p-2 mr-3">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Table {table}</h3>
                        <p className="text-indigo-100 text-sm">{tableOrders.length} order(s)</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedTable(table)
                          setSelectedItems({})
                          setShowOrderForm(true)
                        }}
                        className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-xl text-sm flex items-center gap-1 transition-all font-medium"
                        aria-label={`Add order to table ${table}`}
                      >
                        <PlusCircle size={16} />
                        Add
                      </button>
                      <button
                        onClick={() => handleMarkAsPaid(table, tableOrders)}
                        className="bg-white text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-xl text-sm flex items-center gap-1 transition-all font-medium"
                        aria-label={`Mark orders for table ${table} as paid`}
                      >
                        <CheckCircle size={16} />
                        Paid
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6">
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {tableOrders.map((order) => (
                      <div key={order._id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs text-gray-500 font-medium">Order #{order._id.slice(-6)}</span>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              order.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {order.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                              <span className="text-gray-700 font-medium">
                                {item.name} × {item.quantity}
                              </span>
                              <span className="font-bold text-gray-800">₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Total Amount</p>
                      <p className="text-2xl font-bold text-gray-800">
                        ₹{tableOrders.flatMap((o) => o.items).reduce((sum, i) => sum + i.price * i.quantity, 0)}
                      </p>
                    </div>
                    <button
                      onClick={() => handlePrint(table, tableOrders)}
                      className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
                      aria-label={`Print bill for table ${table}`}
                    >
                      <Printer size={18} />
                      Print Bill
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order Form Modal */}
        {showOrderForm && (
          <OrderFormModal
            menu={menu}
            selectedTable={selectedTable}
            setSelectedTable={setSelectedTable}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            onClose={() => setShowOrderForm(false)}
            onConfirm={handlePlaceOrder}
          />
        )}
      </main>
    </div>
  )
}
