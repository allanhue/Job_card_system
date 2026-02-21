"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: any;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  loading: boolean;
  refreshUser: (strict?: boolean) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const clearAuth = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("page");
    setUser(null);
  }, []);

  const refreshUser = useCallback(async (strict = true) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return false;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
      if (!res.ok) {
        if (strict && (res.status === 401 || res.status === 403)) {
          clearAuth();
        }
        return false;
      }
      const data = await res.json();
      localStorage.setItem("user", JSON.stringify(data));
      setUser(data);
      return true;
    } catch {
      return false;
    }
  }, [clearAuth]);

  useEffect(() => {
    // Check for stored auth data on mount and validate token
    let isMounted = true;
    const init = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      
      if (!token) {
        if (storedUser) {
          clearAuth();
        }
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error("Error parsing stored user data:", error);
          clearAuth();
          if (isMounted) {
            setLoading(false);
          }
          return;
        }
      }
      await refreshUser(true);
      if (isMounted) {
        setLoading(false);
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [clearAuth, refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch (error) {
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    router.push("/?page=login");
  }, [clearAuth, router]);

  const value = { user, login, logout, loading, refreshUser };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
