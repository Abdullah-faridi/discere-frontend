import { useMemo, useState } from "react";
import { Shield, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, EmptyState } from "../components/common";
import { User } from "../types/auth";

type Props = {
  mode: "admin" | "moderator";
  users: User[];
  loading: boolean;
  onSetRole?: (user: User, role: string) => void;
  onToggleBan?: (user: User, action: "ban" | "unban") => void;
};

const PAGE_SIZE = 10;

export default function AccessPanel({ mode, users, loading, onSetRole, onToggleBan }: Props) {
  const [page, setPage] = useState(1);
  const isAdmin = mode === "admin";
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const pageUsers = useMemo(() => users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [users, page]);
  const bannedCount = users.filter((user) => user.isBanned).length;
  const moderatorsCount = users.filter((user) => user.role === "MODERATOR").length;
  const adminsCount = users.filter((user) => user.role === "ADMIN").length;

  return (
    <section className="access-panel">
      <header className="page-heading access-heading">
        <div>
          <p className="eyebrow">{isAdmin ? "Administration" : "Community stewardship"}</p>
          <h1>{isAdmin ? "Admin Panel" : "Moderator Panel"}</h1>
          <p className="subheading">{isAdmin ? "Manage member access and account status." : "Review member accounts and community status."}</p>
        </div>
        {isAdmin ? <ShieldCheck size={24} className="accent-icon" /> : <Shield size={24} className="accent-icon" />}
      </header>

      <div className="access-summary" aria-label="Member overview">
        <div><span>Total members</span><strong>{users.length}</strong></div>
        <div><span>Active accounts</span><strong>{users.length - bannedCount}</strong></div>
        {isAdmin && <div><span>Moderators</span><strong>{moderatorsCount}</strong></div>}
        {isAdmin && <div><span>Administrators</span><strong>{adminsCount}</strong></div>}
        {!isAdmin && <div><span>Banned accounts</span><strong>{bannedCount}</strong></div>}
      </div>

      <div className="access-section-heading">
        <div><h2>{isAdmin ? "Member access" : "Member directory"}</h2><p>{users.length} accounts</p></div>
      </div>

      {loading ? <div className="empty-inline">Loading members…</div> : users.length === 0 ? (
        <EmptyState icon={<Shield size={21} />} title="No members found" text="There are no member accounts to display." />
      ) : (
        <>
          <div className="access-table-wrap">
            <table className="access-table">
              <thead><tr><th scope="col">Member</th><th scope="col">Role</th><th scope="col">Account</th>{isAdmin && <th scope="col">Actions</th>}</tr></thead>
              <tbody>
                {pageUsers.map((user) => (
                  <tr key={user.id}>
                    <td><div className="access-member"><Avatar user={user} size="sm" /><span><strong>{user.fullName}</strong><small>@{user.username || "learner"}</small></span></div></td>
                    <td><span className="access-role">{user.role || "USER"}</span></td>
                    <td><span className={`access-status ${user.isBanned ? "is-banned" : ""}`}>{user.isBanned ? "Banned" : "Active"}</span></td>
                    {isAdmin && <td><div className="access-actions">
                      <select aria-label={`Change role for ${user.fullName}`} value={user.role || "USER"} onChange={(event) => onSetRole?.(user, event.target.value)}>
                        <option value="USER">User</option><option value="MODERATOR">Moderator</option><option value="ADMIN">Admin</option>
                      </select>
                      <button className={`button button-small ${user.isBanned ? "button-secondary" : "button-danger"}`} type="button" onClick={() => onToggleBan?.(user, user.isBanned ? "unban" : "ban")}>{user.isBanned ? "Restore" : "Ban"}</button>
                    </div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="access-pagination"><span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, users.length)} of {users.length}</span><div><button className="icon-button" type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={18} /></button><span>Page {page} of {totalPages}</span><button className="icon-button" type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}><ChevronRight size={18} /></button></div></footer>
        </>
      )}
    </section>
  );
}
