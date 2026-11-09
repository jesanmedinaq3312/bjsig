import { useEffect, useState } from "react";
import { SUPABASE_URL } from "@/lib/supabaseConfig";

type IdentityAvatarProps = {
  name?: string | null;
  seed?: string | null;
  photoUrl?: string | null;
  className?: string;
  rounded?: string;
  alt?: string;
  size?: number;
};

// eslint-disable-next-line react-refresh/only-export-components -- mixed component and stable API export is intentional here
export function getAvatarInitials(name: string | null | undefined): string {
  return (
    (name ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- mixed component and stable API export is intentional here
export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// eslint-disable-next-line react-refresh/only-export-components -- mixed component and stable API export is intentional here
export function isFirstPartyImageUrl(value: string | null | undefined): boolean {
  if (!isHttpUrl(value)) return false;
  try {
    const imageUrl = new URL(value!.trim());
    const storageUrl = new URL(SUPABASE_URL);
    return (
      (typeof window !== "undefined" && imageUrl.origin === window.location.origin) ||
      imageUrl.origin === storageUrl.origin
    );
  } catch {
    return false;
  }
}

export function IdentityAvatar({
  name,
  photoUrl,
  className = "h-8 w-8",
  rounded = "rounded-lg",
  alt,
}: IdentityAvatarProps) {
  const safeName = name?.trim() || "Empresa";
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  const source = !imageFailed && isFirstPartyImageUrl(photoUrl) ? photoUrl!.trim() : null;
  if (!source) {
    return (
      <span
        role="img"
        aria-label={alt ?? safeName}
        className={`${className} ${rounded} inline-flex items-center justify-center border border-slate-200 bg-slate-100 text-xs font-bold text-slate-600`}
      >
        {getAvatarInitials(safeName)}
      </span>
    );
  }

  return (
    <img
      src={source}
      alt={alt ?? `Avatar de ${safeName}`}
      onError={() => setImageFailed(true)}
      className={`${className} ${rounded} border border-slate-200 bg-white object-cover`}
    />
  );
}
