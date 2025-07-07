import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  // Allow public routes
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // If no token, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Verify JWT
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));

    // Role-based route protection
    if (pathname.startsWith("/adminDashboard") && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (pathname.startsWith("/menuBuilder") && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (pathname.startsWith("/QRGenerator") && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (pathname.startsWith("/orderManagement") && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (pathname.startsWith("/kitchenDashboard") && payload.role !== "kitchen") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Protect root page: redirect to dashboard based on role
    if (pathname === "/") {
      if (payload.role === "admin") {
        return NextResponse.redirect(new URL("/adminDashboard", request.url));
      }
      if (payload.role === "kitchen") {
        return NextResponse.redirect(new URL("/kitchenDashboard", request.url));
      }
      // Add more roles as needed
      // Or redirect to login if role is not recognized
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Allow access
    return NextResponse.next();
  } catch {
    // Invalid token
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/adminDashboard/:path*",
    "/kitchenDashboard/:path*",
    "/menuBuilder/:path*",
    "/orderManagement/:path*",
    "/QRGenerator/:path*",
    "/"
  ],
};