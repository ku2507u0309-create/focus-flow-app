import { Ed25519KeyIdentity } from "@dfinity/identity";
import { useCallback, useEffect, useState } from "react";
import {
  clearActorCache,
  clearActorCacheAndRegistration,
  getBackendActor,
} from "../utils/backendActor";
import {
  createDeterministicIdentity,
  hashPassword,
} from "../utils/deterministicIdentity";

const SESSION_KEY = "focusflow_session_v2";

interface SessionData {
  username: string;
  passwordHash: string;
}

function getSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionData) : null;
  } catch {
    return null;
  }
}

function saveSession(username: string, passwordHash: string): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username, passwordHash }));
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

function validateUsername(username: string): string | null {
  if (!username || username.trim().length === 0) return "Username is required.";
  const trimmed = username.trim();
  if (trimmed.length < 3) return "Username must be at least 3 characters.";
  if (trimmed.length > 30) return "Username must be at most 30 characters.";
  if (/\s/.test(trimmed)) return "Username cannot contain spaces.";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password || password.length === 0) return "Password is required.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  return null;
}

/** Check if an error message indicates a transient backend issue (retry-able) */
function isTransientError(msg: string): boolean {
  return (
    msg.includes("stopped") ||
    msg.includes("IC0508") ||
    msg.includes("starting") ||
    msg.includes("503") ||
    msg.includes("temporarily unavailable") ||
    msg.includes("no wasm") ||
    msg.includes("wasm module") ||
    msg.includes("IC0537") ||
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("timeout") ||
    msg.includes("ECONNREFUSED")
  );
}

interface AuthState {
  username: string | null;
  identity: Ed25519KeyIdentity | null;
  isInitializing: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    username: null,
    identity: null,
    isInitializing: true,
  });

  // On mount, restore session from localStorage
  useEffect(() => {
    const session = getSession();
    if (!session) {
      setState({ username: null, identity: null, isInitializing: false });
      return;
    }

    // Try to restore the identity from sessionStorage (same browser session)
    (async () => {
      try {
        const identityJsonStr = sessionStorage.getItem(
          "focusflow_identity_json",
        );
        const storedPrincipal = sessionStorage.getItem(
          "focusflow_identity_principal",
        );
        if (identityJsonStr && storedPrincipal) {
          const parsed = JSON.parse(identityJsonStr) as [string, string];
          const identity = Ed25519KeyIdentity.fromParsedJson(parsed);
          const principalFromIdentity = identity.getPrincipal().toString();

          if (storedPrincipal === principalFromIdentity) {
            setState({
              username: session.username,
              identity,
              isInitializing: false,
            });
            return;
          }
        }
      } catch {
        // ignore
      }

      // No valid session -- user must log in again
      clearSession();
      setState({ username: null, identity: null, isInitializing: false });
    })();
  }, []);

  const isAuthenticated = state.username !== null && state.identity !== null;

  /**
   * LOGIN flow:
   * 1. Create deterministic identity from credentials
   * 2. Register identity with backend (_initializeAccessControlWithSecret)
   * 3. Check if user profile exists (getCallerUserProfile)
   * 4. If no profile found, return "account not found" error
   */
  const login = useCallback(
    async (
      inputUsername: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      const usernameError = validateUsername(inputUsername);
      if (usernameError) return { success: false, error: usernameError };

      const passwordError = validatePassword(password);
      if (passwordError) return { success: false, error: passwordError };

      const trimmed = inputUsername.trim().toLowerCase();

      const MAX_RETRIES = 6;
      let lastError = "Login failed. Please try again.";

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          // Always clear both cache AND registration on retry so we get a fresh start
          if (attempt > 0) {
            clearActorCacheAndRegistration();
            const delay = Math.min(1500 * attempt, 10000);
            await new Promise((r) => setTimeout(r, delay));
          }

          // Step 1: create deterministic identity
          const identity = await createDeterministicIdentity(trimmed, password);

          // Step 2: getBackendActor registers the identity first, then returns actor
          // If canister is stopped/unavailable, this throws and we retry
          const actor = await getBackendActor(identity);

          // Step 3: check if user profile exists
          // getCallerUserProfile requires registration (done in step 2)
          const profile = await actor.getCallerUserProfile();

          if (!profile) {
            // Profile not found = wrong credentials or account doesn't exist
            return {
              success: false,
              error:
                "No account found. Please check your credentials or create a new account.",
            };
          }

          // Step 4: save session
          const pHash = await hashPassword(password);
          saveSession(profile.username, pHash);

          const identityJSON = identity.toJSON();
          sessionStorage.setItem(
            "focusflow_identity_json",
            JSON.stringify(identityJSON),
          );
          sessionStorage.setItem(
            "focusflow_identity_principal",
            identity.getPrincipal().toString(),
          );

          setState({
            username: profile.username,
            identity,
            isInitializing: false,
          });
          return { success: true };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);

          if (isTransientError(msg)) {
            lastError =
              attempt < MAX_RETRIES - 1
                ? `Connecting to backend... (attempt ${attempt + 1})`
                : "Backend is temporarily unavailable. Please try again in a moment.";
            // Will retry -- delay handled at top of loop
          } else if (
            msg.includes("not registered") ||
            msg.includes("User is not registered") ||
            msg.includes("Unauthorized")
          ) {
            // This means _initializeAccessControlWithSecret didn't actually register us
            // (backend may have just restarted and lost in-memory state)
            lastError =
              attempt < MAX_RETRIES - 1
                ? `Re-connecting... (attempt ${attempt + 1})`
                : "Backend is temporarily unavailable. Please try again in a moment.";
            // Force full re-registration on next attempt
            clearActorCacheAndRegistration();
          } else {
            lastError = `Login failed: ${msg}`;
            if (attempt >= MAX_RETRIES - 1) break;
          }
        }
      }

      return { success: false, error: lastError };
    },
    [],
  );

  /**
   * REGISTER flow:
   * 1. Create deterministic identity from credentials
   * 2. Register identity with backend (_initializeAccessControlWithSecret)
   * 3. Check if account already exists (getCallerUserProfile)
   * 4. Create the user profile (saveCallerUserProfile)
   */
  const register = useCallback(
    async (
      inputUsername: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      const usernameError = validateUsername(inputUsername);
      if (usernameError) return { success: false, error: usernameError };

      const passwordError = validatePassword(password);
      if (passwordError) return { success: false, error: passwordError };

      const trimmed = inputUsername.trim().toLowerCase();

      const MAX_RETRIES = 6;
      let lastError = "Registration failed. Please try again.";

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          // Always clear both cache AND registration on retry
          if (attempt > 0) {
            clearActorCacheAndRegistration();
            const delay = Math.min(1500 * attempt, 10000);
            await new Promise((r) => setTimeout(r, delay));
          }

          // Step 1: create deterministic identity
          const identity = await createDeterministicIdentity(trimmed, password);

          // Step 2: getBackendActor registers the identity first, then returns actor
          const actor = await getBackendActor(identity);

          // Step 3: check if account already exists
          const existing = await actor.getCallerUserProfile();
          if (existing) {
            return {
              success: false,
              error:
                "An account with these credentials already exists. Please sign in.",
            };
          }

          // Step 4: create profile
          await actor.saveCallerUserProfile({
            username: trimmed,
            email: "",
          });

          // Save session
          const pHash = await hashPassword(password);
          saveSession(trimmed, pHash);

          const identityJSON = identity.toJSON();
          sessionStorage.setItem(
            "focusflow_identity_json",
            JSON.stringify(identityJSON),
          );
          sessionStorage.setItem(
            "focusflow_identity_principal",
            identity.getPrincipal().toString(),
          );

          setState({ username: trimmed, identity, isInitializing: false });
          return { success: true };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);

          if (isTransientError(msg)) {
            lastError =
              attempt < MAX_RETRIES - 1
                ? `Connecting to backend... (attempt ${attempt + 1})`
                : "Backend is temporarily unavailable. Please try again in a moment.";
          } else if (
            msg.includes("not registered") ||
            msg.includes("User is not registered") ||
            msg.includes("Unauthorized")
          ) {
            lastError =
              attempt < MAX_RETRIES - 1
                ? `Re-connecting... (attempt ${attempt + 1})`
                : "Backend is temporarily unavailable. Please try again in a moment.";
            clearActorCacheAndRegistration();
          } else {
            lastError = `Registration failed: ${msg}`;
            if (attempt >= MAX_RETRIES - 1) break;
          }
        }
      }

      return { success: false, error: lastError };
    },
    [],
  );

  const logout = useCallback(() => {
    clearSession();
    clearActorCache();
    sessionStorage.removeItem("focusflow_identity_json");
    sessionStorage.removeItem("focusflow_identity_principal");
    setState({ username: null, identity: null, isInitializing: false });
  }, []);

  return {
    username: state.username,
    identity: state.identity,
    isAuthenticated,
    isInitializing: state.isInitializing,
    login,
    register,
    logout,
  };
}
