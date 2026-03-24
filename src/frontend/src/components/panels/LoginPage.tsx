import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckSquare,
  Eye,
  EyeOff,
  Loader2,
  Target,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { getDailyQuote } from "../../utils/quotes";

const features = [
  { icon: CheckSquare, label: "Weekly Tasks", desc: "Track & complete goals" },
  { icon: Calendar, label: "Daily Schedule", desc: "Repeatable templates" },
  { icon: Target, label: "Target Tracking", desc: "Measure your progress" },
  { icon: BookOpen, label: "Daily Journal", desc: "Reflect & grow daily" },
];

interface LoginPageProps {
  onLogin: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onRegister: (
    username: string,
    password: string,
    confirmPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

export default function LoginPage({ onLogin, onRegister }: LoginPageProps) {
  const quote = getDailyQuote();

  // Sign In state
  const [signInUsername, setSignInUsername] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Register state
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError("");
    setSignInLoading(true);
    try {
      const result = await onLogin(signInUsername, signInPassword);
      if (!result.success) {
        setSignInError(result.error ?? "Sign in failed.");
      }
    } finally {
      setSignInLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (regPassword !== regConfirm) {
      setRegError("Passwords do not match.");
      return;
    }
    setRegLoading(true);
    try {
      const result = await onRegister(regUsername, regPassword, regConfirm);
      if (!result.success) {
        setRegError(result.error ?? "Registration failed.");
      }
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left — branding */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden md:flex flex-col gap-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center glow-primary">
                <Zap className="w-5 h-5 text-primary" strokeWidth={2.5} />
              </div>
              <div>
                <span className="text-[11px] text-primary/55 font-semibold uppercase tracking-[0.12em] block">
                  Personal productivity
                </span>
                <span className="text-xl font-bold tracking-tight text-foreground leading-none">
                  FocusFlow
                </span>
              </div>
            </div>
            <h1 className="text-[2.25rem] font-bold leading-tight tracking-tight text-foreground mb-3">
              Your personal
              <span className="block text-primary">command center.</span>
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Tasks, habits, journaling, reminders — everything you need to stay
              sharp and build momentum, every single day.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                className="glass-card p-4"
              >
                <f.icon className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-semibold text-foreground">
                  {f.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              &ldquo;{quote}&rdquo;
            </p>
          </div>
        </motion.div>

        {/* Right — auth card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <div className="glass-card-strong p-8 flex flex-col gap-5">
            {/* Mobile logo */}
            <div className="flex md:hidden items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground">
                FocusFlow
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                Welcome
              </h2>
              <p className="text-muted-foreground text-sm">
                Sign in to your account or create a new one to get started.
              </p>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="w-full mb-4">
                <TabsTrigger
                  data-ocid="auth.tab.signin"
                  value="signin"
                  className="flex-1"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  data-ocid="auth.tab.register"
                  value="register"
                  className="flex-1"
                >
                  New Account
                </TabsTrigger>
              </TabsList>

              {/* ── Sign In Tab ── */}
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="signin-username" className="text-sm">
                      Username
                    </Label>
                    <Input
                      id="signin-username"
                      data-ocid="auth.username_input"
                      type="text"
                      placeholder="Enter your username"
                      value={signInUsername}
                      onChange={(e) => {
                        setSignInUsername(e.target.value);
                        setSignInError("");
                      }}
                      autoComplete="username"
                      autoFocus
                      disabled={signInLoading}
                      className="h-11"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="signin-password" className="text-sm">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        data-ocid="auth.password_input"
                        type={showSignInPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={signInPassword}
                        onChange={(e) => {
                          setSignInPassword(e.target.value);
                          setSignInError("");
                        }}
                        autoComplete="current-password"
                        disabled={signInLoading}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        tabIndex={-1}
                        aria-label={
                          showSignInPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showSignInPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {signInError && (
                    <div
                      data-ocid="auth.error_state"
                      role="alert"
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/25 text-sm text-destructive"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {signInError}
                    </div>
                  )}

                  <Button
                    data-ocid="auth.submit_button"
                    type="submit"
                    disabled={signInLoading}
                    className="w-full h-11 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 glow-primary transition-all duration-200 mt-1"
                  >
                    {signInLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* ── New Account Tab ── */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reg-username" className="text-sm">
                      Username
                    </Label>
                    <Input
                      id="reg-username"
                      data-ocid="auth.username_input"
                      type="text"
                      placeholder="Choose a username (3–30 chars)"
                      value={regUsername}
                      onChange={(e) => {
                        setRegUsername(e.target.value);
                        setRegError("");
                      }}
                      autoComplete="username"
                      disabled={regLoading}
                      className="h-11"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reg-password" className="text-sm">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        data-ocid="auth.password_input"
                        type={showRegPassword ? "text" : "password"}
                        placeholder="At least 6 characters"
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          setRegError("");
                        }}
                        autoComplete="new-password"
                        disabled={regLoading}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        tabIndex={-1}
                        aria-label={
                          showRegPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showRegPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reg-confirm" className="text-sm">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="reg-confirm"
                        data-ocid="auth.confirm_password_input"
                        type={showRegConfirm ? "text" : "password"}
                        placeholder="Repeat your password"
                        value={regConfirm}
                        onChange={(e) => {
                          setRegConfirm(e.target.value);
                          setRegError("");
                        }}
                        autoComplete="new-password"
                        disabled={regLoading}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        tabIndex={-1}
                        aria-label={
                          showRegConfirm ? "Hide password" : "Show password"
                        }
                      >
                        {showRegConfirm ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {regError && (
                    <div
                      data-ocid="auth.error_state"
                      role="alert"
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/25 text-sm text-destructive"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {regError}
                    </div>
                  )}

                  <Button
                    data-ocid="auth.submit_button"
                    type="submit"
                    disabled={regLoading}
                    className="w-full h-11 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 glow-primary transition-all duration-200 mt-1"
                  >
                    {regLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
