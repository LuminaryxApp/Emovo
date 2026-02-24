import { cn } from "@/lib/cn";

const SIZES = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
  "2xl": "h-20 w-20 text-xl",
  "3xl": "h-24 w-24 text-2xl",
};

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: keyof typeof SIZES;
  className?: string;
}

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  if (src) {
    const imgSrc = src.startsWith("data:") ? src : `data:image/jpeg;base64,${src}`;
    return (
      <img
        src={imgSrc}
        alt={name || "Avatar"}
        className={cn("rounded-full object-cover", SIZES[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-brand-green font-semibold text-white",
        SIZES[size],
        className,
      )}
    >
      {initials}
    </div>
  );
}
