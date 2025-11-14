"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/backend/userApiCalls";
import { useUser } from "@/backend/userProvider";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { setUser } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Attempt to sign in
      const response = await signIn(email, password);
      
      if (!response || response.status !== 200) {
        setError("Invalid email or password. Please try again.");
        setIsLoading(false);
        return;
      }
      
      // Extract user data from the response
      // Assuming the sign-in endpoint returns user data in response.data.user
      // Adjust this according to your API's actual response structure
      const userData = response.data.user || response.data;
      
      if (!userData) {
        setError("Authentication successful, but failed to load user data.");
        setIsLoading(false);
        return;
      }
      
      // Store user email in cookie and set user in context
      document.cookie = `userEmail=${email}; path=/; max-age=604800`; // 7 days expiry
      
      // Store JWT token if one is provided
      if (response.data.token) {
        document.cookie = `authToken=${response.data.token}; path=/; max-age=604800`; // 7 days expiry
      }
      
      // Set user in context
      setUser(userData);
      
      // Redirect to homepage
      router.push("/homepage");
    } catch (error) {
      console.error("Sign in error:", error);
      setError("An error occurred during sign in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-2">
          Sign in
        </h1>
        <p className="text-gray-400">
          Enter your credentials to access your account.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-md text-red-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label 
            htmlFor="email" 
            className="block text-sm font-medium text-gray-700 dark:text-indigo-300 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-gray-700 dark:text-indigo-300"
            >
              Password
            </label>
            <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Forgot password?
            </a>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full px-4 py-3 rounded-md font-medium transition-colors ${
            isLoading
              ? "bg-indigo-700 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-gray-400">
          Need an account?{" "}
          <Link 
            href="/auth/signup" 
            className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
          >
            Sign up here
          </Link>
        </p>
      </div>

      <div className="mt-8 pt-8 border-t border-gray-800">
        <p className="text-xs text-center text-gray-500">
          By signing in, you agree to our{" "}
          <a href="#" className="text-indigo-400 hover:text-indigo-300">Terms of Service</a>
          {" "}and{" "}
          <a href="#" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}