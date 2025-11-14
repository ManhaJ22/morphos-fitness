"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { User } from "./userApiCalls";
import { signIn } from "./userApiCalls";

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  update: (updatedFields: Partial<User>) => void;
  isLoading: boolean;
  logout: () => void;
}

export const UserContext = createContext<UserContextType | null>(null);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // On initial load, check for user cookie and attempt to restore session
  useEffect(() => {
    const restoreUserSession = async () => {
      try {
        const userEmail = getCookie("userEmail");
        const authToken = getCookie("authToken");
        
        if (userEmail && authToken) {
          // Parse JWT token to get basic user info
          try {
            const tokenData = parseJwt(authToken);
            if (tokenData && tokenData.email === userEmail) {
              // If token is valid and matches the email, set basic user data
              // You may want to enhance this with more detailed user info
              setUser({
                email: userEmail,
                name: tokenData.name || "",
                // Set default or placeholder values for other required fields
                age: tokenData.age || "",
                height: tokenData.height || "",
                weight: tokenData.weight || "",
                fitnessLevel: tokenData.fitness_level || "beginner",
                workoutDuration: tokenData.workout_duration || "45",
                workoutFrequency: tokenData.workout_frequency || "4",
                fitnessGoals: tokenData.fitness_goals || [],
                equipment: tokenData.available_equipment || []
              });
            } else {
              // Clear invalid cookies
              clearAuthCookies();
            }
          } catch (e) {
            console.error("Error parsing JWT token:", e);
            clearAuthCookies();
          }
        }
      } catch (error) {
        console.error("Failed to restore user session:", error);
        clearAuthCookies();
      } finally {
        setIsLoading(false);
      }
    };

    restoreUserSession();
  }, []);

  // Function to update user fields locally (without API call)
  const update = (updatedFields: Partial<User>) => {
    if (!user) return;
    setUser(prev => prev ? { ...prev, ...updatedFields } : null);
  };

  // Logout function
  const logout = () => {
    setUser(null);
    clearAuthCookies();
  };

  // Helper function to clear auth cookies
  const clearAuthCookies = () => {
    document.cookie = "userEmail=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  };

  // Helper function to parse JWT token
  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("Error parsing JWT:", e);
      return null;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        update,
        isLoading,
        logout
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Custom hook for using the UserContext
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

// Helper function to get a cookie by name
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null; // Handle server-side rendering
  
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}