import { clientInfo } from "./worker-auth-utils.ts";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(
  req: Request,
  body: Record<string, unknown>,
  expectedAction: string,
): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY")?.trim();
  const allowedHostnames = (Deno.env.get("TURNSTILE_ALLOWED_HOSTNAMES") ?? "")
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
  const token = typeof body.captcha_token === "string" ? body.captcha_token.trim() : "";
  const ip = clientInfo(req).ip;

  // CAPTCHA must fail closed until both sides have been configured.
  if (!secret || allowedHostnames.length === 0 || !token || token.length > 2048 || !ip) {
    return false;
  }

  const form = new URLSearchParams({ secret, response: token });
  form.set("remoteip", ip);

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as {
      success?: boolean;
      action?: string;
      hostname?: string;
    };
    return (
      result.success === true &&
      result.action === expectedAction &&
      typeof result.hostname === "string" &&
      allowedHostnames.includes(result.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}
