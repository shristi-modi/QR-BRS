"use client";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";

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

export default function QRGenerator() {
  const restaurantId = getUserIdFromToken();
  const [table, setTable] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!table) return;
    const url = `${window.location.origin}/customer?restaurant=${restaurantId}&table=${encodeURIComponent(
      table
    )}`;
    setQrUrl(url);
    setCopied(false);
  };

  const handleCopy = () => {
    if (qrUrl) {
      navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById("qr-canvas");
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);

    const canvas = document.createElement("canvas");
    const img = new window.Image();
    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `table-${table}-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    img.src =
      "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(svgString)));
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-tr from-indigo-100 via-white to-indigo-50">
      <Sidebar />
      <main className="flex-grow p-8 flex flex-col justify-center">
        <div className="max-w-3xl w-full mx-auto bg-white rounded-2xl shadow-lg p-8">
          <header className="mb-6">
            <h1 className="text-3xl font-extrabold text-indigo-700 mb-1">QR Generator</h1>
            <p className="text-indigo-500 font-medium">Create QR codes for your tables</p>
          </header>

          <form
            className="flex flex-col sm:flex-row gap-4 sm:items-end"
            onSubmit={handleGenerate}
          >
            <div className="flex-grow">
              <label
                htmlFor="table"
                className="block text-indigo-600 font-semibold mb-2 select-none"
              >
                Table Number / Name
              </label>
              <input
                id="table"
                type="text"
                placeholder="e.g. 1, 2, VIP, Patio-3"
                value={table}
                onChange={(e) => setTable(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg px-6 py-3 shadow-md transition flex items-center justify-center sm:w-44"
            >
              Generate QR
            </button>
          </form>

          {qrUrl && (
            <section className="mt-10 flex flex-col items-center">
              <QRCodeSVG
                id="qr-canvas"
                value={qrUrl}
                size={220}
                bgColor="#fff"
                fgColor="#4f46e5" // Indigo-600
                level="H"
                includeMargin={true}
                className="rounded-xl shadow-lg border border-indigo-300"
              />

              <div className="mt-6 flex gap-4">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg border-2 transition ${
                    copied
                      ? "border-green-500 bg-green-100 text-green-700"
                      : "border-indigo-500 text-indigo-600 hover:bg-indigo-100"
                  }`}
                >
                  <Copy size={20} />
                  {copied ? "Copied!" : "Copy Link"}
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg border-2 border-green-600 text-green-700 hover:bg-green-100 transition"
                >
                  <Download size={20} />
                  Download QR
                </button>
              </div>

              <p className="mt-4 text-center text-sm text-gray-600 break-words max-w-xs sm:max-w-md select-text">
                <span className="font-semibold text-indigo-700">Scan URL:</span> {qrUrl}
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
