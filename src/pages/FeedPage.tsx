import { Dispatch, SetStateAction } from "react";
import { Activity, Compass, Plus, Search, Sparkles } from "lucide-react";
import { User } from "../types/auth";
import { CommentItem, Post, View } from "../types/domain";
import PostList from "../components/PostList";
import { Avatar } from "../components/common";
type Props = {
  view: View; profile?: User; posts: Post[]; loading: boolean; refreshing: boolean; authenticated: boolean; identity?: User; summaries: Record<string,string>; activePost?: string; comments: Record<string,CommentItem[]>; query: string; setQuery: Dispatch<SetStateAction<string>>; semantic: boolean; setSemantic: Dispatch<SetStateAction<boolean>>; searchTab: "posts" | "users"; setSearchTab: (tab: "posts" | "users") => void; userSearchResults: User[]; searchingUsers: boolean; loadUserSearch: () => Promise<void>; followingUserIds: string[]; followPendingIds: string[]; onFollow: (user: User) => void; setAuthOpen: (open: boolean) => void; setComposerOpen: (open: boolean) => void; setView: (view: View) => void; loadFeed: (refresh?: boolean) => Promise<void>; toggleLike: (post: Post) => void; toggleSave: (post: Post) => void; loadComments: (postId: string) => void; sendComment: (event: React.FormEvent<HTMLFormElement>, postId: string, parentId?: string) => Promise<void>; loadProfile: (userId: string) => void; summarize: (post: Post) => void; editComment: (postId: string, comment: CommentItem) => void; deleteComment: (postId: string, comment: CommentItem) => void;
};
export default function FeedPage(props: Props) {
  const { view, profile, posts, loading, refreshing, authenticated, identity, summaries, activePost, comments, query, setQuery, semantic, setSemantic, searchTab, setSearchTab, userSearchResults, searchingUsers, loadUserSearch, followingUserIds, followPendingIds, onFollow, setAuthOpen, setComposerOpen, setView, loadFeed, toggleLike, toggleSave, loadComments, sendComment, loadProfile, summarize, editComment, deleteComment } = props;
  return (<>
{view === "feed" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    A little knowledge grows when shared
                  </p>
                  <h1>Your learning feed</h1>
                  <p className="subheading">
                    Ideas and conversations from the people you learn with.
                  </p>
                </div>
                <button
                  className="button button-primary create-post-btn"
                  onClick={() =>
                    authenticated ? setComposerOpen(true) : setAuthOpen(true)
                  }
                >
                  <Plus size={17} /> Share an idea
                </button>
              </div>
              <div className="feed-tools">
                <div className="segmented">
                  <button className="selected">
                    <Activity size={15} /> For you
                  </button>
                  <button onClick={() => setView("discover")}>
                    <Compass size={15} /> Latest
                  </button>
                </div>
                <button
                  className="icon-button"
                  onClick={() => void loadFeed(true)}
                  aria-label="Refresh feed"
                >
                  <Activity size={16} />
                </button>
              </div>
              <PostList
                posts={posts}
                loading={loading || refreshing}
                authenticated={authenticated}
                identity={authenticated ? identity : undefined}
                summaries={summaries}
                activePost={activePost}
                comments={comments}
                onLike={toggleLike}
                onSave={toggleSave}
                onComment={loadComments}
                onCommentSubmit={sendComment}
                onProfile={(user) => void loadProfile(user.id)}
                onSummarize={summarize}
                onEditComment={editComment}
                onDeleteComment={deleteComment}
                onRequireAuth={() => setAuthOpen(true)}
              />
            </>
          )}

          {view === "discover" && !profile && (
            <>
              <div className="page-heading"><div><p className="eyebrow">Follow a question somewhere interesting</p><h1>Explore ideas</h1><p className="subheading">Search the community’s shared notes and discussions.</p></div></div>
              <div className="search-panel panel">
                <div className="search-tabs" role="tablist" aria-label="Search type">
                  <button className={searchTab === "posts" ? "selected" : ""} role="tab" aria-selected={searchTab === "posts"} onClick={() => setSearchTab("posts")}>Posts</button>
                  <button className={searchTab === "users" ? "selected" : ""} role="tab" aria-selected={searchTab === "users"} onClick={() => setSearchTab("users")}>Users</button>
                </div>
                <div className="large-search"><Search size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (searchTab === "users") void loadUserSearch(); else void loadFeed(true); } }} placeholder={searchTab === "users" ? "Search by username" : "What are you curious about?"} /><button className="button button-primary" onClick={() => searchTab === "users" ? void loadUserSearch() : void loadFeed(true)}>Search</button></div>
                {searchTab === "posts" && <div className="search-options"><span>Search across posts</span><button className={`toggle-chip ${semantic ? "toggle-on" : ""}`} onClick={() => { if (!authenticated && !semantic) { setAuthOpen(true); return; } setSemantic(!semantic); }}><Sparkles size={14} /> Semantic search</button><span className="muted">{semantic ? "Meaning-based results" : "Keywords and tags"}</span></div>}
              </div>
              {searchTab === "users" ? <section className="user-search-list">
                {searchingUsers ? <div className="empty-inline">Searching users…</div> : query.trim().length < 2 ? <div className="empty-inline">Enter at least two characters to search usernames.</div> : userSearchResults.length ? userSearchResults.map((user) => <article className="user-search-row" key={user.id}><button className="user-search-profile" onClick={() => loadProfile(user.id)}><Avatar user={user} size="md" /><span><strong>{user.fullName}</strong><small>@{user.username || "learner"}</small></span></button>{user.id !== identity?.id && <button className={`button button-small ${followingUserIds.includes(user.id) ? "button-quiet" : "button-secondary"}`} disabled={followPendingIds.includes(user.id)} onClick={() => onFollow(user)}>{followingUserIds.includes(user.id) ? "Unfollow" : "Follow"}</button>}</article>) : <div className="empty-inline">No users match that username.</div>}
              </section> : <><div className="section-heading"><h2>{query ? `Results for “${query}”` : "Recent posts"}</h2><span className="muted">{posts.length} posts</span></div><PostList posts={posts} loading={loading} authenticated={authenticated} identity={authenticated ? identity : undefined} summaries={summaries} activePost={activePost} comments={comments} onLike={toggleLike} onSave={toggleSave} onComment={loadComments} onCommentSubmit={sendComment} onProfile={(user) => loadProfile(user.id)} onSummarize={summarize} onEditComment={editComment} onDeleteComment={deleteComment} onRequireAuth={() => setAuthOpen(true)} /></>}
            </>
          )}
          {view === "profile" && profile && <PostList posts={posts} loading={loading} authenticated={authenticated} identity={authenticated ? identity : undefined} summaries={summaries} activePost={activePost} comments={comments} onLike={toggleLike} onSave={toggleSave} onComment={loadComments} onCommentSubmit={sendComment} onProfile={(user) => loadProfile(user.id)} onSummarize={summarize} onEditComment={editComment} onDeleteComment={deleteComment} onRequireAuth={() => setAuthOpen(true)} />}

  </>);
}
