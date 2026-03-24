import { Ed25519KeyIdentity } from "@dfinity/identity";

/**
 * Creates a deterministic Ed25519 identity from username + password.
 * The same credentials always produce the same ICP Principal on any device.
 */
export async function createDeterministicIdentity(
  username: string,
  password: string,
): Promise<Ed25519KeyIdentity> {
  const encoder = new TextEncoder();
  // Combine username (lowercase, trimmed) and password into a unique seed
  const input = encoder.encode(`${username.trim().toLowerCase()}:${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", input);
  const seed = new Uint8Array(hashBuffer);
  return Ed25519KeyIdentity.generate(seed);
}

/**
 * Hashes a password for session storage (not used for identity, just for UI verification).
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
