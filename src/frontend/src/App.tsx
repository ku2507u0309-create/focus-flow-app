import { Toaster } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import Dashboard from "./components/panels/Dashboard";
import LoginPage from "./components/panels/LoginPage";
import AIAgentOverlay from "./components/ui/AIAgentOverlay";
import ExplorerChat from "./components/ui/ExplorerChat";
import { useGamificationStore } from "./lib/gamificationStore";
import { useAgentStore } from "./lib/agentStore";
import { useGetUserSettings, BackgroundType } from "./hooks/useQueries";
import { useMentorPresence } from "./hooks/useMentorPresence";
import { AnimatePresence } from "motion/react";
import { Bot } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:8000/api");

export default function App() {
  const queryClient = useQueryClient();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [username, setUsername] = useState("");
  const [bgStyle, setBgStyle] = useState<React.CSSProperties>({});

  const { data: settings } = useGetUserSettings();

  // Activate Mentor Presence
  useMentorPresence();

  useEffect(() => {
    if (settings) {
      if (settings.backgroundType === BackgroundType.image) {
        setBgStyle({
          backgroundImage: `url(${settings.backgroundValue})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed"
        });
      } else {
        setBgStyle({ background: settings.backgroundValue });
      }
    } else {
      setBgStyle({});
    }
  }, [settings]);

  // Validate existing token on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      // Verify token is still valid against the running server
      fetch(`${API_URL}/user-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) {
            setIsLoggedIn(true);
            const storedUsername = localStorage.getItem("username") || "";
            setUsername(storedUsername);
          } else if (res.status === 401) {
            // Token is invalid/expired — clear it
            localStorage.removeItem("authToken");
            localStorage.removeItem("username");
            setIsLoggedIn(false);
          } else {
            // Other server error (e.g. 500) — assume server issue, but don't log out yet
            // However, we shouldn't necessarily set isLoggedIn(true) here either.
            // Let's be conservative. If we have a token, we can try to proceed.
            setIsLoggedIn(true);
            const storedUsername = localStorage.getItem("username") || "";
            setUsername(storedUsername);
          }
        })
        .catch(() => {
          // Network error/Server unreachable — allow offline with cached token
          setIsLoggedIn(true);
          const storedUsername = localStorage.getItem("username") || "";
          setUsername(storedUsername);
        })
        .finally(() => setIsInitializing(false));
    } else {
      setIsInitializing(false);
    }
  }, []);

  const handleLogin = async (
    loginUsername: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || "Login failed" };
      }

      const data = await response.json();
      localStorage.setItem("authToken", data.access_token);
      localStorage.setItem("username", loginUsername);
      
      // Wipe memory state FIRST, then rehydrate for this specific user
      useGamificationStore.getState().reset();
      useAgentStore.getState().resetMentor();
      useGamificationStore.persist.rehydrate();
      useAgentStore.persist.rehydrate();
      
      setUsername(loginUsername);
      setIsLoggedIn(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  };

  const handleRegister = async (
    regUsername: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          email: `${regUsername}@example.com`,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.detail || "Registration failed" };
      }

      const data = await response.json();
      localStorage.setItem("authToken", data.access_token);
      localStorage.setItem("username", regUsername);
      
      // Wipe memory state FIRST, then rehydrate for this specific user
      useGamificationStore.getState().reset();
      useAgentStore.getState().resetMentor();
      useGamificationStore.persist.rehydrate();
      useAgentStore.persist.rehydrate();

      setUsername(regUsername);
      setIsLoggedIn(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("username");
    
    // Explicitly wipe the state memory so nothing bleeds over
    useGamificationStore.getState().reset();
    useAgentStore.getState().resetMentor();
    useGamificationStore.persist.rehydrate();
    useAgentStore.persist.rehydrate();
    
    setIsLoggedIn(false);
    setUsername("");
    queryClient.clear();
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center cosmic-bg">
        <div className="flex flex-col items-center gap-4 glass-card p-10 rounded-2xl">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center glow-primary">
            <Zap className="w-5 h-5 text-primary" strokeWidth={2.5} />
          </div>
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading FocusFlow…</p>
        </div>
      </div>
    );
  }

  const hasBg = Object.keys(bgStyle).length > 0 && bgStyle.background !== "default";

  return (
    <div className="app-root min-h-screen relative">
      {/* Background layer — always full viewport, behind everything */}
      {hasBg ? (
        <div className="fixed inset-0 -z-10" style={bgStyle} />
      ) : (
        <>
          <div className="saas-gradient pointer-events-none" />
          <div className="fixed inset-0 cosmic-bg -z-10 pointer-events-none" />
        </>
      )}

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(18, 30, 58, 0.95)",
            border: "1px solid rgba(100, 200, 240, 0.2)",
            color: "oklch(0.95 0.01 220)",
          },
        }}
      />

      {!isLoggedIn ? (
        <LoginPage onLogin={handleLogin} onRegister={handleRegister} />
      ) : (
        <Dashboard onLogout={handleLogout} username={username} />
      )}

      <AIAgentOverlay />
    </div>
  );
}
