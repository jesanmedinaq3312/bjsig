export const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};:,.?";
export const PASSWORD_POLICY_MESSAGE =
  "La contraseña debe tener al menos 8 caracteres e incluir minúscula, mayúscula, número y símbolo permitido.";

export function meetsPasswordPolicy(value: string): boolean {
  return (
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    [...value].some((character) => PASSWORD_SYMBOLS.includes(character))
  );
}
