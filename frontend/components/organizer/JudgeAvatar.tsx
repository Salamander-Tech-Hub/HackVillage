export function JudgeAvatar({ name, complete = false }: { name: string; complete?: boolean }) {
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2);

  return (
    <span className={`judge-avatar${complete ? " judge-avatar-done" : ""}`} aria-hidden="true">
      {initials.toUpperCase()}
    </span>
  );
}
