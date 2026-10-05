import { FormEvent, useState } from "react";
import { Post } from "../types/domain";

type PostEdits = { title: string; content: string; tags: string[] };

export default function MyPostsList({
  posts,
  loading,
  onSave,
  onDelete,
}: {
  posts: Post[];
  loading: boolean;
  onSave: (post: Post, updates: PostEdits) => Promise<Post | undefined>;
  onDelete: (post: Post) => void;
}) {
  const [editingId, setEditingId] = useState<string>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  function startEditing(post: Post) {
    setEditingId(post.id);
    setTitle(post.title);
    setContent(post.content);
    setTags((post.tags || []).join(", "));
  }

  async function submit(event: FormEvent<HTMLFormElement>, post: Post) {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await onSave(post, {
        title,
        content,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      });
      if (updated) setEditingId(undefined);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="empty-inline">Loading your posts…</div>;
  if (!posts.length) return <div className="empty-inline">You haven’t published any posts yet.</div>;

  return <div className="my-posts-list">{posts.map((post) => <article className="my-post-row" key={post.id}>
    {editingId === post.id ? <form className="my-post-edit" onSubmit={(event) => void submit(event, post)}>
      <label>Title<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>Content<textarea required maxLength={50000} rows={5} value={content} onChange={(event) => setContent(event.target.value)} /></label>
      <label>Tags<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Separate tags with commas" /></label>
      <div className="my-post-actions"><button className="button button-primary button-small" disabled={saving}>{saving ? "Saving…" : "Save"}</button><button className="button button-quiet button-small" type="button" onClick={() => setEditingId(undefined)}>Cancel</button></div>
    </form> : <>
      <div className="my-post-copy"><strong>{post.title}</strong><p>{post.content}</p>{post.tags?.length > 0 && <div className="tag-row">{post.tags.map((tag) => <span className="topic-tag" key={tag}>#{tag}</span>)}</div>}</div>
      <div className="my-post-actions"><button className="button button-quiet button-small" onClick={() => startEditing(post)}>Edit</button><button className="button button-quiet button-small danger-text" onClick={() => onDelete(post)}>Delete</button></div>
    </>}
  </article>)}</div>;
}
