import { IdentityAvatar } from "@/components/IdentityAvatar";

type WorkerAvatarProps = {
  name: string;
  rut?: string | null;
  photoUrl?: string | null;
  className?: string;
  rounded?: "rounded-lg" | "rounded-full";
};

export function WorkerAvatar({
  name,
  photoUrl,
  className = "h-8 w-8",
  rounded = "rounded-lg",
}: WorkerAvatarProps) {
  return (
    <IdentityAvatar
      name={name}
      photoUrl={photoUrl}
      className={className}
      rounded={rounded}
      alt={`Avatar de ${name || "trabajador"}`}
    />
  );
}
