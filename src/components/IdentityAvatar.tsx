import { useEffect, useMemo, useState } from "react";

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
export function blobatarUrl(seed: string, size = 96): string {
  const normalized = seed.trim().toLowerCase() || "identity";
  return `https://blobatar.dev/avatar/${encodeURIComponent(normalized)}?size=${size}&background=squircle&gen=1`;
}

export function IdentityAvatar({
  name,
  seed,
  photoUrl,
  className = "h-8 w-8",
  rounded = "rounded-lg",
  alt,
  size = 96,
}: IdentityAvatarProps) {
  const safeName = name?.trim() || "Empresa";
  const avatarSeed = seed?.trim() || safeName;
  const [sourceIndex, setSourceIndex] = useState(isHttpUrl(photoUrl) ? 0 : 1);
  const sources = useMemo(
    () => [isHttpUrl(photoUrl) ? photoUrl!.trim() : null, blobatarUrl(avatarSeed, size)],
    [photoUrl, avatarSeed, size],
  );

  useEffect(() => {
    setSourceIndex(isHttpUrl(photoUrl) ? 0 : 1);
  }, [photoUrl, avatarSeed]);

  const source = sources[sourceIndex];
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
      onError={() => setSourceIndex((current) => current + 1)}
      className={`${className} ${rounded} border border-slate-200 bg-white object-cover`}
    />
  );
}
