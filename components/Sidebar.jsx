'use client';

import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  PlusCircle,
  Edit,
  LogOut,
  LayoutDashboard,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [username, setUsername] = useState('');
  const [activePath, setActivePath] = useState('');
  const sidebarRef = useRef(null);

  const router = useRouter();

  useEffect(() => {
    setUsername(localStorage.getItem("username") || "User");
    const savedActive = localStorage.getItem("activeSidebarPath");
    if (savedActive) setActivePath(savedActive);
  }, []);

  // Auto-close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Swipe gesture detection
  useEffect(() => {
    let startX = 0;
    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
    };
    const handleTouchEnd = (e) => {
      const endX = e.changedTouches[0].clientX;
      if (isOpen && startX - endX > 50) {
        setIsOpen(false); // Swipe left to close
      }
    };
    const node = sidebarRef.current;
    if (node) {
      node.addEventListener("touchstart", handleTouchStart);
      node.addEventListener("touchend", handleTouchEnd);
    }
    return () => {
      if (node) {
        node.removeEventListener("touchstart", handleTouchStart);
        node.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [isOpen]);

  const handleLogout = () => {
    Cookies.remove("token");
    localStorage.removeItem("username");
    localStorage.removeItem("activeSidebarPath");
    router.push("/login");
  };

  const handleLinkClick = (href) => {
    setActivePath(href);
    localStorage.setItem("activeSidebarPath", href);
  };

  const navLinks = [
    { href: "/adminDashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { href: "/menuBuilder", label: "Menu Builder", icon: <PlusCircle size={20} /> },
    { href: "/QRGenerator", label: "QR Generator", icon: <Edit size={20} /> },
    { href: "/orderManagement", label: "Order Management", icon: <Calendar size={20} /> },
    { href: "/orderHistory", label: "Order History", icon: <Calendar size={20} /> },
  ];

  const renderLink = (item, index) => {
    const isActive = activePath === item.href;
    return (
      <Link
        key={index}
        href={item.href}
        onClick={() => handleLinkClick(item.href)}
        className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
          isActive
            ? "bg-violet-100 text-violet-700 font-semibold"
            : "text-gray-700 hover:bg-violet-100 hover:text-violet-700"
        }`}
      >
        <div className="text-violet-600 group-hover:scale-110 transition-transform">
          {item.icon}
        </div>
        {isOpen ? (
          <span className="text-sm">{item.label}</span>
        ) : (
          <span className="absolute left-full top-1/2 -translate-y-1/2 ml-3 scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
            {item.label}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Fixed Sidebar */}
      <motion.aside
        ref={sidebarRef}
        initial={{ width: isOpen ? 256 : 80 }}
        animate={{ width: isOpen ? 256 : 80 }}
        transition={{ duration: 0.3 }}
        onClick={() => !isOpen && setIsOpen(true)}
        className="fixed top-0 left-0 h-screen bg-white shadow-xl border-r flex flex-col cursor-pointer z-10"
      >
        {/* Logo Section */}
        <div className="flex items-center p-4 border-b space-x-2">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-2 rounded-xl shadow-md">
            <span className="text-white font-bold">🍉</span>
          </div>
          <AnimatePresence>
            {isOpen && (
              <motion.h1
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="font-bold text-gray-800 text-sm"
              >
                QR-BSR
              </motion.h1>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-3 space-y-1">
          {navLinks.map(renderLink)}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-gradient-to-tr from-blue-500 to-cyan-500 text-white w-9 h-9 flex items-center justify-center rounded-full font-bold shadow-md">
              {username?.[0]?.toUpperCase() || "U"}
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-sm font-medium text-gray-800">{username}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center justify-center gap-2 text-sm py-2 rounded-lg border transition font-medium ${
              isOpen
                ? "text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                : "text-red-600 border-none"
            }`}
          >
            <LogOut size={16} />
            {isOpen && "Logout"}
          </button>

          {/* Hide Sidebar Button */}
          {isOpen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition"
            >
              <ChevronLeft size={16} className="transform rotate-180" />
              <span>Hide Sidebar</span>
            </button>
          )}
        </div>
      </motion.aside>

      {/* Main Content Container */}
      <main
        className={`min-h-screen transition-all duration-300 ${isOpen ? 'ml-[256px]' : 'ml-[80px]'}`}
      >
        {/* Your page content goes here */}
      </main>
    </>
  );
}
