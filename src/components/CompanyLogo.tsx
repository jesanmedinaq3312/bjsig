import { IdentityAvatar } from "@/components/IdentityAvatar";

type CompanyLogoProps = {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
};

export function CompanyLogo({
  src,
  alt,
  className = "h-10 w-auto max-w-[220px]",
  fallbackClassName = "h-10 w-10",
}: CompanyLogoProps) {
  const companyName = alt.replace(/\s+logo\s*$/i, "").trim() || "Empresa";
  return (
    <IdentityAvatar
      name={companyName}
      seed={companyName}
      photoUrl={src}
      className={src ? className : fallbackClassName}
      rounded="rounded-xl"
      alt={alt}
      size={96}
    />
  );
}
