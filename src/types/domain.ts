import { User } from "./auth";

export type View =
  | "feed"
  | "discover"
  | "rooms"
  | "study"
  | "summarize"
  | "notifications"
  | "account"
  | "profile"
  | "admin"
  | "moderator";
export type Media = {
  id: string;
  url: string;
  mediaType: "IMAGE" | "VIDEO";
  altText?: string;
  order: number;
};
export type Post = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  author: User;
  media: Media[];
  _count?: { likes: number; comments: number };
  likedByMe?: boolean;
  savedByMe?: boolean;
  scoreBreakdown?: string;
};
export type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  author: User;
  replies?: CommentItem[];
};
export type Room = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: "PUBLIC" | "PRIVATE";
  creator?: User;
  _count?: { members: number; messages?: number };
  room?: Room;
};
export type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  sender: User;
  senderId?: string;
};
export type Notice = {
  id: string;
  type: string;
  createdAt: string;
  readAt?: string | null;
  actor?: User;
  entityId?: string;
};
export type JobResult = {
  jobId: string;
  state: string;
  postId?: string;
  result?: {
    answer?: string;
    summary?: string;
    relatedPosts?: Post[];
    post?: Post;
    imageCount?: number;
  } | null;
  failedReason?: string;
};
