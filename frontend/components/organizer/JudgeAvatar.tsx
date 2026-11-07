export function JudgeAvatar({ name, complete }: { name: string; complete: boolean }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className={`judge-avatar${complete ? " judge-avatar-done" : ""}`} aria-hidden="true">
      {initials || "J"}
    </span>
  );
}
