import { ReactNode } from "react";
import { User } from "../types/auth";
import { API_BASE } from "../services/api";

function profileImageUrl(url: string) {
  if (/^https?:\/\//i.test(url) || /^(data:|blob:|\/\/)/i.test(url)) return url;
  return `${API_BASE}/${url.replace(/^\/+/, "")}`;
}

function initials(name = "Discere") {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function Avatar({
  user,
  size = "md",
}: {
  user?: User;
  size?: "sm" | "md" | "lg";
}) {
  return user?.profileImageURL ? (
    <img
      className={`avatar avatar-${size}`}
      src={profileImageUrl(user.profileImageURL)}
      alt=""
    />
  ) : (
    <span className={`avatar avatar-${size} avatar-fallback`}>
      {initials(user?.fullName || user?.username)}
    </span>
  );
}

export function formatDate(date?: string) {
  if (!date) return "Just now";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(value);
}


export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="empty-state panel">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
