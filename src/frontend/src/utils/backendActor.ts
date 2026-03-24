import type { Ed25519KeyIdentity } from "@dfinity/identity";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { getSecretParameter } from "./urlParams";

// Cache actor per principal
let cachedActor: backendInterface | null = null;
let cachedPrincipal: string | null = null;

// Track principals successfully registered in this session
const registeredPrincipals = new Set<string>();

/**
 * Creates a fresh actor (no cache) for the given identity.
 */
async function createFreshActor(
  identity?: Ed25519KeyIdentity,
): Promise<backendInterface> {
  if (identity) {
    return createActorWithConfig({ agentOptions: { identity } });
  }
  return createActorWithConfig();
}

/**
 * Returns a backend actor for the given identity, ensuring the principal
 * is registered via _initializeAccessControlWithSecret first.
 *
 * IMPORTANT: This throws on ALL errors so callers can decide whether to retry.
 */
export async function getBackendActor(
  identity?: Ed25519KeyIdentity,
): Promise<backendInterface> {
  const principalStr = identity?.getPrincipal().toString() ?? "anonymous";

  // Use cached actor if same principal and already registered
  if (
    cachedActor &&
    cachedPrincipal === principalStr &&
    (principalStr === "anonymous" || registeredPrincipals.has(principalStr))
  ) {
    return cachedActor;
  }

  // Create a fresh actor
  const actor = await createFreshActor(identity);
  cachedActor = actor;
  cachedPrincipal = principalStr;

  // For non-anonymous identities, register the principal first
  if (identity && principalStr !== "anonymous") {
    if (!registeredPrincipals.has(principalStr)) {
      const adminToken = getSecretParameter("caffeineAdminToken") || "";
      // This will throw on canister errors (stopped, no wasm, etc.)
      // Let the error propagate so the caller can retry with a fresh actor.
      await actor._initializeAccessControlWithSecret(adminToken);
      registeredPrincipals.add(principalStr);
    }
  }

  return actor;
}

/**
 * Clears the cached actor and forces re-registration on next call.
 * Call this on logout or before retrying after a failed call.
 */
export function clearActorCache(): void {
  cachedActor = null;
  cachedPrincipal = null;
  // Do NOT clear registeredPrincipals -- those are registered on the backend
  // and don't need re-registration. Only clear if we suspect the backend restarted.
}

/**
 * Clears actor cache AND forces re-registration on next call.
 * Use this when the backend may have restarted and lost its state.
 */
export function clearActorCacheAndRegistration(): void {
  cachedActor = null;
  cachedPrincipal = null;
  registeredPrincipals.clear();
}
