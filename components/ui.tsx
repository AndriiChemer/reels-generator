/** Small shared UI pieces for the reel editor. */

export function SmallButton({
  children,
  disabled,
  onClick,
  variant = "secondary",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  const className =
    variant === "primary"
      ? "bg-[var(--foreground)] text-white hover:bg-[var(--accent-strong)]"
      : "border border-[var(--border)] bg-white hover:border-[var(--accent)] hover:text-[var(--accent-strong)]";

  return (
    <button
      className={`rounded-md px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function ErrorText({ message }: { message?: string }) {
  return message ? (
    <p aria-live="polite" className="break-words text-sm font-medium text-red-700">
      {message}
    </p>
  ) : null;
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 ${className}`}
    >
      {children}
    </section>
  );
}
