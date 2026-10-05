import { Activity, Bell, LogIn } from "lucide-react";
import { Notice } from "../types/domain";
import { Avatar, EmptyState, formatDate } from "../components/common";
type Props = { authenticated: boolean; setAuthOpen: (open: boolean) => void; loadNotifications: () => Promise<void>; notices: Notice[]; markRead: (notice: Notice) => void };
function notificationText(type: string) { const labels: Record<string,string> = { LIKE:"appreciated your post", COMMENT:"joined the discussion on your post", FOLLOW:"started following you", BAN:"an account action was applied", UNBAN:"an account action was updated", like:"appreciated your post", comment:"joined the discussion on your post", follow:"started following you" }; return labels[type] || "shared an update with you"; }

export default function NotificationsPage(props: Props) {
  const { authenticated, setAuthOpen, loadNotifications, notices, markRead } = props;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const groups = [
    { label: "Today", items: notices.filter((notice) => new Date(notice.createdAt).getTime() >= startOfToday) },
    { label: "This week", items: notices.filter((notice) => new Date(notice.createdAt).getTime() < startOfToday) },
  ].filter((group) => group.items.length > 0);
  return (
<>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">Keep up with your learning circle</p>
                  <h1>Notifications</h1>
                  <p className="subheading">
                    Updates about follows, discussion, and your account.
                  </p>
                </div>
                <button
                  className="icon-button"
                  onClick={() => void loadNotifications()}
                  aria-label="Refresh"
                >
                  <Activity size={16} />
                </button>
              </div>
              {!authenticated && (
                <div className="soft-notice">
                  <LogIn size={16} />
                  <span>Sign in to view your notifications.</span>
                  <button
                    className="text-button"
                    onClick={() => setAuthOpen(true)}
                  >
                    Sign in
                  </button>
                </div>
              )}
              <div className="notice-list">
                {groups.map((group) => <section className="notice-group" key={group.label}><h2>{group.label}</h2>{group.items.map((notice) => (
                  <article
                    key={notice.id}
                    className={`notice-row panel ${notice.readAt ? "read" : "unread"}`}
                  >
                    <button className="notice-main" onClick={() => void markRead(notice)}>
                      <Avatar user={notice.actor} size="sm" />
                      <div className="notice-copy">
                        <strong>{notice.actor?.fullName || "Discere"}</strong>
                        <span>{notificationText(notice.type)}</span>
                        <small>{formatDate(notice.createdAt)}</small>
                      </div>
                    </button>
                    {!notice.readAt && <button className="text-button notice-mark-read" onClick={() => void markRead(notice)}>Mark as read</button>}
                    {!notice.readAt && <span className="unread-dot" aria-label="Unread" />}
                  </article>
                ))}</section>)}
                {authenticated && !notices.length && (
                  <EmptyState
                    icon={<Bell size={21} />}
                    title="You’re all caught up"
                    text="New activity from your learning community will appear here."
                  />
                )}
              </div>
            </>
  );
}
