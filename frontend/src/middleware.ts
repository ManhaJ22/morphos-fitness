// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Get the path of the request
  const path = request.nextUrl.pathname;
  
  // Check for authentication cookie
  const userEmail = request.cookies.get("userEmail")?.value;
  const isAuthenticated = !!userEmail;

  // Define protected routes that require authentication
  const isProtectedRoute = 
    path.startsWith('/homepage') || 
    path.startsWith('/analytics') || 
    path.startsWith('/profile') ||
    path.startsWith('/coach');
    
  // If trying to access protected route and not authenticated
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }
  
  // Allow all other requests to proceed
  return NextResponse.next();
}

// Configure which paths the middleware will run on
export const config = {
  matcher: [
    '/homepage/:path*',
    '/analytics/:path*',
    '/profile/:path*',
    '/coach/:path*'
  ],
};