import { IdentityAvatar, blobatarUrl } from "@/components/IdentityAvatar";

// eslint-disable-next-line react-refresh/only-export-components -- mixed component and stable API export is intentional here
export { blobatarUrl };

type WorkerAvatarProps = {
  name: string;
  rut?: string | null;
  photoUrl?: string | null;
  className?: string;
  rounded?: "rounded-lg" | "rounded-full";
};

export function WorkerAvatar({
  name,
  rut,
  photoUrl,
  className = "h-8 w-8",
  rounded = "rounded-lg",
}: WorkerAvatarProps) {
  return (
    <IdentityAvatar
      name={name}
      seed={`${name}-${rut ?? ""}`}
      photoUrl={photoUrl}
      className={className}
      rounded={rounded}
      alt={`Avatar de ${name || "trabajador"}`}
    />
  );
}
