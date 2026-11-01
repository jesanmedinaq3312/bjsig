// Matches the sign-in service policy: lowercase, uppercase, digit and symbol.
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{};:,.?";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

export function meetsPasswordPolicy(pw: string): boolean {
  return (
    pw.length >= 8 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /\d/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

export const PASSWORD_POLICY_MESSAGE =
  "La contraseña debe tener al menos 8 caracteres e incluir minúscula, mayúscula, número y símbolo.";

function pick(set: string): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return set[buf[0] % set.length];
}

export function generateTemporaryPassword(length = 16): string {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < length) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
