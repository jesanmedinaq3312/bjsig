import { z } from "zod";

export const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return (
        (parsed.protocol === "https:" || parsed.protocol === "http:") && Boolean(parsed.hostname)
      );
    } catch {
      return false;
    }
  }, "Ingresa una URL http(s) válida.");

export const optionalHttpUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || httpUrlSchema.safeParse(value).success,
    "Ingresa una URL http(s) válida o deja el campo vacío.",
  );

export function isHttpUrl(value: string): boolean {
  return httpUrlSchema.safeParse(value).success;
}

export function isOptionalHttpUrl(value: string): boolean {
  return optionalHttpUrlSchema.safeParse(value).success;
}
