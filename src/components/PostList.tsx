import { FormEvent, useState } from "react";
import { Bookmark, FileText, Heart, MessageCircle, Send, Sparkles } from "lucide-react";
import { User } from "../types/auth";
import { CommentItem, Post } from "../types/domain";
import { Avatar, EmptyState, formatDate } from "./common";

export default function PostList(props: {
  posts: Post[];
  loading: boolean;
  authenticated: boolean;
  identity?: User;
  summaries: Record<string, string>;
  activePost?: string;
  comments: Record<string, CommentItem[]>;
  interactionPendingIds: string[];
  onLike: (post: Post) => void;
  onSave: (post: Post) => void;
  onComment: (postId: string) => void;
  onCommentSubmit: (
    event: FormEvent<HTMLFormElement>,
    postId: string,
    parentId?: string,
  ) => Promise<void>;
  onProfile: (user: User) => void;
  onSummarize: (post: Post) => void;
  onEditComment: (postId: string, comment: CommentItem) => void;
  onDeleteComment: (postId: string, comment: CommentItem) => void;
  onRequireAuth: () => void;
}) {
  const [replyTo, setReplyTo] = useState<string | undefined>();
  if (props.loading && !props.posts.length)
    return (
      <div className="loading-state">
        <span className="spinner" />
        <span>Gathering thoughtful ideas…</span>
      </div>
    );
  if (!props.posts.length)
    return (
      <EmptyState
        icon={<FileText size={21} />}
        title="Nothing here yet"
        text="Try another search, or be the first to share a useful idea."
      />
    );
  return (
    <div className="post-list">
      {props.posts.map((post) => (
        <article className="post-card panel" key={post.id}>
          <div className="post-author">
            <button
              className="profile-link"
              onClick={() => props.onProfile(post.author)}
            >
              <Avatar user={post.author} size="sm" />
              <span>
                <strong>{post.author?.fullName || "Discere learner"}</strong>
                <small>
                  @{post.author?.username || "learner"} <i>·</i>{" "}
                  {formatDate(post.createdAt)}
                </small>
              </span>
            </button>
            <div className="author-actions">
              <button
                className="icon-button"
                aria-label="Summarize post"
                onClick={() => props.onSummarize(post)}
                title="Summarize with Discere AI"
              >
                <Sparkles size={17} />
              </button>
            </div>
          </div>
          <div className="post-body">
            <button
              className="post-title-button"
              onClick={() => props.onComment(post.id)}
            >
              <h2>{post.title}</h2>
            </button>
            <p>{post.content}</p>
            {post.media?.length > 0 && (
              <div
                className={`post-media ${post.media.length > 1 ? "multi-media" : ""}`}
              >
                {post.media.map((media) =>
                  media.mediaType === "VIDEO" ? (
                    <video key={media.id} src={media.url} controls />
                  ) : (
                    <img
                      key={media.id}
                      src={media.url}
                      alt={media.altText || "Post attachment"}
                    />
                  ),
                )}
              </div>
            )}
            {post.tags?.length > 0 && (
              <div className="tag-row">
                {post.tags.map((tag) => (
                  <span className="topic-tag" key={tag}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          {props.summaries[post.id] && (
            <div className="summary-snippet">
              <span>
                <Sparkles size={14} /> AI summary
              </span>
              <p>{props.summaries[post.id]}</p>
            </div>
          )}
          <div className="post-actions">
            <button className={post.likedByMe ? "interaction-active" : ""} disabled={props.interactionPendingIds.includes(post.id)} aria-pressed={Boolean(post.likedByMe)} aria-label={post.likedByMe ? "Unlike post" : "Like post"} onClick={() => props.onLike(post)}>
              <Heart size={16} fill={post.likedByMe ? "currentColor" : "none"} />
              <span>{post._count?.likes ?? 0}</span>
              <span className="action-label">{post.likedByMe ? "Appreciated" : "Appreciate"}</span>
            </button>
            <button onClick={() => props.onComment(post.id)}>
              <MessageCircle size={16} />
              <span>{post._count?.comments ?? 0}</span>
              <span className="action-label">Discuss</span>
            </button>
            <button className={post.savedByMe ? "interaction-active" : ""} disabled={props.interactionPendingIds.includes(post.id)} aria-pressed={Boolean(post.savedByMe)} aria-label={post.savedByMe ? "Remove from saved posts" : "Save post"} onClick={() => props.onSave(post)}>
              <Bookmark size={16} fill={post.savedByMe ? "currentColor" : "none"} />
              <span className="action-label">{post.savedByMe ? "Saved" : "Save"}</span>
            </button>
            <button
              className="summarize-mobile"
              onClick={() => props.onSummarize(post)}
            >
              <Sparkles size={16} />
              <span className="action-label">Summarize</span>
            </button>
          </div>
          {props.activePost === post.id && (
            <div className="discussion">
              <div className="discussion-heading">
                <h3>Discussion</h3>
                <span>{props.comments[post.id]?.length || 0} comments</span>
              </div>
              {props.comments[post.id]?.map((comment) => (
                <div className="comment-row" key={comment.id}>
                  <Avatar user={comment.author} size="sm" />
                  <div className="comment-content">
                    <div className="comment-meta">
                      <strong>{comment.author?.fullName || "Learner"}</strong>
                      <small>{formatDate(comment.createdAt)}</small>
                    </div>
                    <p>{comment.content}</p>
                    <div className="comment-tools">
                      <button onClick={() => setReplyTo(comment.id)}>
                        Reply
                      </button>
                      {props.identity?.id === comment.author?.id && (
                        <>
                          <button
                            onClick={() =>
                              props.onEditComment(post.id, comment)
                            }
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              props.onDeleteComment(post.id, comment)
                            }
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                    {comment.replies?.map((reply) => (
                      <div className="reply-row" key={reply.id}>
                        <Avatar user={reply.author} size="sm" />
                        <div>
                          <div className="comment-meta">
                            <strong>
                              {reply.author?.fullName || "Learner"}
                            </strong>
                            <small>{formatDate(reply.createdAt)}</small>
                          </div>
                          <p>{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {props.authenticated ? (
                <form
                  className="comment-form"
                  onSubmit={(event) => {
                    void props
                      .onCommentSubmit(event, post.id, replyTo)
                      .then(() => setReplyTo(undefined));
                  }}
                >
                  <Avatar user={props.identity} size="sm" />
                  <input
                    name="content"
                    required
                    maxLength={5000}
                    placeholder={
                      replyTo ? "Write a reply…" : "Add a thoughtful comment…"
                    }
                  />
                  <button className="button button-primary button-small">
                    <Send size={14} /> {replyTo ? "Reply" : "Comment"}
                  </button>
                  {replyTo && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setReplyTo(undefined)}
                    >
                      Cancel
                    </button>
                  )}
                </form>
              ) : (
                <button
                  className="comment-signin"
                  onClick={props.onRequireAuth}
                >
                  Sign in to join the discussion
                </button>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
