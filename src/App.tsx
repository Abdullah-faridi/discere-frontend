import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useDiscereSocket } from "./hooks/useDiscereSocket";
import { AuthResponse, User } from "./types/auth";
import { ChatMessage, CommentItem, JobResult, Notice, Post, Room, View } from "./types/domain";
import { Avatar } from "./components/common";
import AuthDialog from "./components/AuthDialog";
import FeedPage from "./pages/FeedPage";
import RoomChat from "./components/RoomChat";
import StudyPage from "./pages/StudyPage";
import NotificationsPage from "./pages/NotificationsPage";
import AccountPage from "./pages/AccountPage";
import AccessPanel from "./pages/AccessPanel";
import {
  Activity,
  ArrowLeft,
  Bell,
  Check,
  CircleHelp,
  FileText,
  Compass,
  Hash,
  ImagePlus,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { api, json } from "./services/api";
import { normalizeAiJob } from "./utils/aiJobs";

const navItems: { id: View; label: string; icon: typeof Activity }[] = [
  { id: "feed", label: "Feed", icon: Activity },
  { id: "discover", label: "Explore / Search", icon: Compass },
  { id: "rooms", label: "Study Rooms / Chat", icon: Users },
  { id: "study", label: "Ask AI", icon: Sparkles },
  { id: "notifications", label: "Notifications", icon: Bell },
];

function AppContent() {
  const [view, setView] = useState<View>(() => window.location.pathname === "/admin" ? "admin" : window.location.pathname === "/moderator" ? "moderator" : "feed");
  const { user: identity, accessToken, authenticated, loading: authLoading, establishSession, setUser, signOut: clearAuthSession } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [profilePostsLoading, setProfilePostsLoading] = useState(false);
  const [myPostsLoading, setMyPostsLoading] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [joinedRoomIds, setJoinedRoomIds] = useState<string[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [comments, setComments] = useState<Record<string, CommentItem[]>>({});
  const [activeRoom, setActiveRoom] = useState<Room | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [roomMembers, setRoomMembers] = useState<User[]>([]);
  const [activePost, setActivePost] = useState<string | undefined>();
  const [profile, setProfile] = useState<User | undefined>();
  const profileLoadSequence = useRef(0);
  const [profileLists, setProfileLists] = useState<{
    followers: Array<{ follower: User }>;
    following: Array<{ following: User }>;
  }>({ followers: [], following: [] });
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);
  const [followPendingIds, setFollowPendingIds] = useState<string[]>([]);
  const [relationModal, setRelationModal] = useState<"followers" | "following">();
  const [searchTab, setSearchTab] = useState<"posts" | "users">("posts");
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [semantic, setSemantic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    content: "",
    tags: "",
  });
  const [roomForm, setRoomForm] = useState({
    name: "",
    description: "",
    type: "PUBLIC",
  });
  const [busy, setBusy] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiJob, setAiJob] = useState<JobResult | undefined>();
  const [aiWaiting, setAiWaiting] = useState(false);
  const [summaryByPost, setSummaryByPost] = useState<Record<string, string>>(
    {},
  );
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [mobileNav, setMobileNav] = useState(false);

  const signedUserKnown = Boolean(identity?.id);
  const trendingTags = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((post) => post.tags?.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [posts]);
  const unreadCount = useMemo(
    () => notices.filter((item) => !item.readAt).length,
    [notices],
  );

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!authenticated) return;
    const result = await api<{ notifications: Notice[] }>("/notifications");
    setNotices(result.notifications || []);
  }, [authenticated]);

  const loadFeed = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        if (query.trim()) {
          const path = semantic
            ? `/posts/search/semantic?q=${encodeURIComponent(query.trim())}`
            : `/posts/search?q=${encodeURIComponent(query.trim())}`;
          const result = await api<{ posts: Post[]; total?: number }>(path);
          setPosts(result.posts || []);
        } else if (view === "discover") {
          const result = await api<{ posts: { posts: Post[] } }>(
            "/posts?limit=30",
          );
          setPosts(result.posts?.posts || []);
        } else if (authenticated) {
          const result = await api<{ feed: Post[] }>(
            "/posts/feed?page=1&limit=30",
          );
          setPosts(result.feed || []);
        } else {
          const result = await api<{ posts: { posts: Post[] } }>(
            "/posts?limit=30",
          );
          setPosts(result.posts?.posts || []);
        }
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Could not load posts",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authenticated, query, semantic, view],
  );

  const fetchPostsForUser = useCallback(async (userId: string) => {
    const matching: Post[] = [];
    let cursor: string | undefined;
    const seenCursors = new Set<string>();
    while (true) {
      const params = new URLSearchParams({ limit: "50" });
      if (cursor) params.set("cursor", cursor);
      const result = await api<{ posts: { posts: Post[]; hasMore: boolean; nextCursor?: string | null } }>(`/user/${userId}/posts?${params.toString()}`);
      matching.push(...(result.posts.posts || []));
      const nextCursor = result.posts.nextCursor || undefined;
      if (!result.posts.hasMore || !nextCursor || seenCursors.has(nextCursor)) break;
      seenCursors.add(nextCursor);
      cursor = nextCursor;
    }
    return matching;
  }, []);

  const loadCurrentFollowing = useCallback(async () => {
    if (!authenticated || !identity?.id) return [] as string[];
    const result = await api<Array<{ following: User }>>(`/user/${identity.id}/following`);
    const ids = result.map((entry) => entry.following.id);
    setFollowingUserIds(ids);
    return ids;
  }, [authenticated, identity?.id]);

  const loadUserSearch = useCallback(async () => {
    const term = query.trim();
    if (term.length < 2) {
      setUserSearchResults([]);
      setSearchingUsers(false);
      return;
    }
    setSearchingUsers(true);
    try {
      const result = await api<{ users: User[] }>(`/user/search?q=${encodeURIComponent(term)}`);
      setUserSearchResults(result.users || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not search users");
    } finally {
      setSearchingUsers(false);
    }
  }, [query]);

  const loadRooms = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError("");
    try {
      const [publicResult, mineResult] = await Promise.all([
        api<{ rooms: Room[] }>("/room/"),
        api<{ rooms: Room[] }>("/room/me"),
      ]);
      const mine = (mineResult.rooms || []).map((entry) => entry.room || entry);
      setJoinedRoomIds(mine.map((room) => room.id));
      const merged = new Map<string, Room>();
      [...(publicResult.rooms || []), ...mine].forEach((room) =>
        merged.set(room.id, room),
      );
      setRooms(Array.from(merged.values()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load rooms");
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  const openRoom = useCallback(async (room: Room) => {
    setActiveRoom(room);
    setMessages([]);
    try {
      const [messageResult, memberResult] = await Promise.all([
        api<{ messages: ChatMessage[]; hasMore: boolean }>(
          `/room/${room.id}/messages?limit=50`,
        ),
        api<{ members: Array<{ user: User }> }>(`/room/${room.id}/members`),
      ]);
      setMessages(messageResult.messages || []);
      setHasMoreMessages(messageResult.hasMore || false);
      setRoomMembers((memberResult.members || []).map((member) => member.user));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open room");
    }
  }, []);

  const loadProfile = useCallback(
    async (userId: string) => {
      const requestId = ++profileLoadSequence.current;
      setView("profile");
      setProfile(undefined);
      setProfilePosts([]);
      setProfilePostsLoading(true);
      setProfileLists({ followers: [], following: [] });
      try {
        const profileRequest = api<User>(`/user/${userId}`);
        const postsRequest = fetchPostsForUser(userId);
        const [result, userPosts] = await Promise.all([profileRequest, postsRequest]);
        if (requestId !== profileLoadSequence.current) return;
        setProfile(result);
        setProfilePosts(userPosts);
        if (authenticated) {
          const [followers, following] = await Promise.all([
            api<Array<{ follower: User }>>(`/user/${userId}/followers`),
            api<Array<{ following: User }>>(`/user/${userId}/following`),
          ]);
          await loadCurrentFollowing();
          if (requestId !== profileLoadSequence.current) return;
          setProfileLists({ followers, following });
        }
      } catch (cause) {
        if (requestId === profileLoadSequence.current) setError(cause instanceof Error ? cause.message : "Could not load profile");
      } finally {
        if (requestId === profileLoadSequence.current) setProfilePostsLoading(false);
      }
    },
    [authenticated, fetchPostsForUser, loadCurrentFollowing],
  );

  useEffect(() => {
    if (view === "feed" || view === "summarize" || (view === "discover" && searchTab === "posts")) void loadFeed();
    if (view === "discover" && searchTab === "users") void loadUserSearch();
    if (view === "rooms") void loadRooms();
    if (view === "notifications")
      void loadNotifications().catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load notifications",
        ),
      );
    if (view === "account" && identity?.id) {
      setMyPostsLoading(true);
      void fetchPostsForUser(identity.id).then(setMyPosts).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load your posts")).finally(() => setMyPostsLoading(false));
      api<User>(`/user/${identity.id}`)
        .then((user) => {
          setUser(user);
          setProfileForm({
            fullName: user.fullName || "",
            email: user.email || "",
            password: "",
          });
        })
        .catch((cause) =>
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load your account",
          ),
        );
    }
    if ((view === "admin" || view === "moderator") && authenticated && !authLoading && ((view === "admin" && isAdmin) || (view === "moderator" && isModerator))) {
      setAdminUsersLoading(true);
      api<User[]>("/admin/users")
        .then(setAdminUsers)
        .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load members"))
        .finally(() => setAdminUsersLoading(false));
    }
  }, [
    view,
    loadFeed,
    loadRooms,
    loadNotifications,
    authenticated,
    authLoading,
    identity?.role,
    identity?.id,
    searchTab,
    loadUserSearch,
    fetchPostsForUser,
  ]);

  useEffect(() => {
    const onPopState = () => setView(window.location.pathname === "/admin" ? "admin" : window.location.pathname === "/moderator" ? "moderator" : "feed");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (view === "admin" && identity?.role !== "ADMIN") setView(identity?.role === "MODERATOR" ? "moderator" : "feed");
    if (view === "moderator" && identity?.role !== "MODERATOR") setView(identity?.role === "ADMIN" ? "admin" : "feed");
  }, [view, authLoading, identity?.role]);

  useEffect(() => {
    const targetPath = view === "admin" ? "/admin" : view === "moderator" ? "/moderator" : "/";
    if (window.location.pathname !== targetPath) window.history.pushState({}, "", targetPath);
  }, [view]);

  useEffect(() => {
    if (authenticated && identity?.id) void loadCurrentFollowing().catch(() => undefined);
    else setFollowingUserIds([]);
  }, [authenticated, identity?.id, loadCurrentFollowing]);

  const { socketRef, socketState, socketError, onlineUserIds } = useDiscereSocket({
    accessToken,
    authenticated,
    activeRoomId: activeRoom?.id,
    notify,
    loadNotifications,
    setMessages,
    setHasMoreMessages,
    setTypingNames,
    setAiWaiting,
    setAiJob,
    setSummaryByPost,
  });

  useEffect(() => {
    if (!aiWaiting || !aiJob?.jobId) return;
    let cancelled = false;
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      let finished = false;
      try {
        const status = await api<{
          jobId: string;
          state: string;
          result?: unknown;
          failedReason?: string;
        }>(`/ai/jobs/${encodeURIComponent(aiJob.jobId)}`);
        if (cancelled) return;
        const result = normalizeAiJob(status);
        if (["completed", "failed"].includes(result.state)) {
          finished = true;
          setAiJob(result);
          setAiWaiting(false);
          if (result.state === "failed") {
            const message = result.failedReason || "The AI request failed. Please try again.";
            setError(message);
            notify(message);
          } else if (aiJob.postId) {
            const postId = result.postId || aiJob.postId || result.result?.post?.id;
            const summary = result.result?.summary?.trim();
            if (summary && postId) {
              setSummaryByPost((current) => ({ ...current, [postId]: summary }));
              notify("Summary is ready");
            } else {
              setError("The AI job completed without returning summary text.");
            }
          }
        }
      } catch (cause) {
        if (attempts > 60) {
          finished = true;
          setAiWaiting(false);
          setError(cause instanceof Error ? cause.message : "Could not retrieve the AI job result.");
        }
      }
      if (!finished && attempts > 60) {
        setAiWaiting(false);
        setError("The AI job is still pending. Check that the backend worker is running.");
      }
    }, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [aiWaiting, aiJob?.jobId, notify]);

  async function handleSignedIn(auth: AuthResponse) {
    await establishSession(auth);
    setView("feed");
    notify("You’re signed in. Welcome back.");
  }

  async function signOut() {
    try { await clearAuthSession(); } catch {}
    setRooms([]);
    setJoinedRoomIds([]);
    setMessages([]);
    setRoomMembers([]);
    setActiveRoom(undefined);
    setNotices([]);
    setProfile(undefined);
    setProfileLists({ followers: [], following: [] });
    setAdminUsers([]);
    setView("feed");
    notify("Signed out");
  }

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    try {
      const body = new FormData();
      body.set("title", createForm.title);
      body.set("content", createForm.content);
      body.set(
        "tags",
        JSON.stringify(
          createForm.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      );
      Array.from(
        formElement.querySelector<HTMLInputElement>('input[type="file"]')
          ?.files || [],
      ).forEach((file) => body.append("media", file));
      await api("/posts/createPost", { method: "POST", body });
      setComposerOpen(false);
      setCreateForm({ title: "", content: "", tags: "" });
      notify("Your post is live");
      await loadFeed(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create post",
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadComments(postId: string) {
    if (activePost === postId) {
      setActivePost(undefined);
      return;
    }
    setActivePost(postId);
    if (comments[postId]) return;
    try {
      const result = await api<{ result: { comments: CommentItem[] } }>(
        `/posts/${postId}/comments?page=1&limit=20`,
      );
      setComments((current) => ({
        ...current,
        [postId]: result.result.comments || [],
      }));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load discussion",
      );
    }
  }

  async function sendComment(
    event: FormEvent<HTMLFormElement>,
    postId: string,
    parentId?: string,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const content = String(form.get("content") || "");
    try {
      await api(
        `/posts/${postId}/comments`,
        json({ content, ...(parentId ? { parentId } : {}) }),
      );
      const result = await api<{ result: { comments: CommentItem[] } }>(
        `/posts/${postId}/comments?page=1&limit=20`,
      );
      setComments((current) => ({
        ...current,
        [postId]: result.result.comments || [],
      }));
      formElement.reset();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not send comment",
      );
    }
  }

  async function toggleLike(post: Post) {
    if (!authenticated) {
      setAuthOpen(true);
      return;
    }
    try {
      await api(`/posts/${post.id}/like`, json({}));
      await loadFeed(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update like",
      );
    }
  }

  async function toggleSave(post: Post) {
    if (!authenticated) {
      setAuthOpen(true);
      return;
    }
    try {
      await api(`/posts/${post.id}/save-post`, json({}));
      notify("Saved posts updated");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save post");
    }
  }

  async function createRoom(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/room/", json(roomForm));
      setShowCreateRoom(false);
      setRoomForm({ name: "", description: "", type: "PUBLIC" });
      await loadRooms();
      notify("Study room created");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create room",
      );
    }
  }

  async function joinRoom(room: Room) {
    try {
      await api(`/room/${room.id}/join`, json({}));
      setJoinedRoomIds((current) =>
        current.includes(room.id) ? current : [...current, room.id],
      );
      await loadRooms();
      notify(`Joined ${room.name}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not join room");
    }
  }

  async function leaveRoom(room: Room) {
    try {
      await api(`/room/${room.id}/leave`, json({}));
      setJoinedRoomIds((current) => current.filter((id) => id !== room.id));
      if (activeRoom?.id === room.id) setActiveRoom(undefined);
      await loadRooms();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not leave room");
    }
  }

  async function deleteRoom(room: Room) {
    if (!window.confirm(`Delete “${room.name}” and its messages?`)) return;
    try {
      await api(`/room/${room.id}`, { method: "DELETE" });
      setActiveRoom(undefined);
      await loadRooms();
      notify("Study room deleted");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not delete room",
      );
    }
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const content = new FormData(form).get("message");
    if (
      typeof content !== "string" ||
      !activeRoom ||
      !socketRef.current?.connected
    )
      return;
    socketRef.current.emit("send_message", { roomId: activeRoom.id, content });
    form.reset();
  }

  function deleteMessage(message: ChatMessage) {
    if (!activeRoom || !message.id) return;
    socketRef.current?.emit("delete_message", {
      messageId: message.id,
      roomId: activeRoom.id,
    });
  }

  function editMessage(message: ChatMessage, content: string) {
    if (!activeRoom || !message.id || !content.trim()) return;
    socketRef.current?.emit("edit_message", {
      messageId: message.id,
      roomId: activeRoom.id,
      content: content.trim(),
    });
  }

  function loadMoreMessages() {
    if (!activeRoom || !messages.length) return;
    socketRef.current?.emit("load_more_messages", {
      roomId: activeRoom.id,
      cursor: messages[0].createdAt,
    });
  }

  async function askQuestion(event: FormEvent) {
    event.preventDefault();
    if (!authenticated) {
      setAuthOpen(true);
      return;
    }
    setAiWaiting(true);
    setAiJob(undefined);
    try {
      const result = await api<{ jobId: string }>(
        "/ai/ask",
        json({ question: aiQuestion }),
      );
      setAiJob({ jobId: result.jobId, state: "waiting" });
      setAiQuestion("");
    } catch (cause) {
      setAiWaiting(false);
      setError(
        cause instanceof Error ? cause.message : "Could not send question",
      );
    }
  }

  async function summarize(post: Post) {
    if (!authenticated) {
      setAuthOpen(true);
      return;
    }
    setAiWaiting(true);
    setAiJob(undefined);
    try {
      const result = await api<{ jobId: string }>(
        `/ai/summarize/${post.id}`,
        json({}),
      );
      setAiJob({ jobId: result.jobId, state: "waiting", postId: post.id });
      setError("");
      notify("Summary is being prepared");
    } catch (cause) {
      setAiWaiting(false);
      setError(
        cause instanceof Error ? cause.message : "Could not summarize post",
      );
    }
  }

  async function markRead(notice: Notice) {
    if (notice.readAt) return;
    try {
      await api(`/notifications/${notice.id}/read`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      setNotices((current) =>
        current.map((item) =>
          item.id === notice.id
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update notification",
      );
    }
  }

  async function followUser(user: User) {
    if (!authenticated) {
      setAuthOpen(true);
      return;
    }
    const following = followingUserIds.includes(user.id);
    if (followPendingIds.includes(user.id)) return;
    setFollowPendingIds((current) => [...current, user.id]);
    try {
      await api(`/user/${user.id}/follow`, following ? { method: "DELETE" } : json({}));
      setFollowingUserIds((current) => following
        ? current.filter((id) => id !== user.id)
        : current.includes(user.id) ? current : [...current, user.id]);
      if (profile?.id === user.id && identity) {
        setProfileLists((current) => ({
          ...current,
          followers: following
            ? current.followers.filter((entry) => entry.follower.id !== identity.id)
            : current.followers.some((entry) => entry.follower.id === identity.id)
              ? current.followers
              : [...current.followers, { follower: identity }],
        }));
      }
      notify(following ? "You unfollowed this learner" : "You are now following this learner");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update follow");
    } finally {
      setFollowPendingIds((current) => current.filter((id) => id !== user.id));
    }
  }

  function openRelationModal(type: "followers" | "following") {
    if (!authenticated) {
      setAuthOpen(true);
      return;
    }
    setRelationModal(type);
  }

  async function editComment(postId: string, comment: CommentItem) {
    const content = window.prompt("Edit your comment", comment.content);
    if (content === null) return;
    try {
      await api(`/comments/${comment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      });
      const result = await api<{ result: { comments: CommentItem[] } }>(
        `/posts/${postId}/comments?page=1&limit=20`,
      );
      setComments((current) => ({
        ...current,
        [postId]: result.result.comments || [],
      }));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not edit comment",
      );
    }
  }

  async function deleteComment(postId: string, comment: CommentItem) {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await api(`/comments/${comment.id}`, { method: "DELETE" });
      const result = await api<{ result: { comments: CommentItem[] } }>(
        `/posts/${postId}/comments?page=1&limit=20`,
      );
      setComments((current) => ({
        ...current,
        [postId]: result.result.comments || [],
      }));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not delete comment",
      );
    }
  }

  async function updateAccount(event: FormEvent) {
    event.preventDefault();
    if (!identity?.id) return;
    const patch: Record<string, string> = {
      fullName: profileForm.fullName,
      email: profileForm.email,
    };
    if (profileForm.password) patch.password = profileForm.password;
    try {
      const user = await api<User>(`/user/${identity.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      const next = { ...identity, ...user };
      setUser(next);
      setProfileForm((current) => ({ ...current, password: "" }));
      setProfileEditing(false);
      notify("Account details updated");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update account",
      );
    }
  }

  async function editPost(post: Post, updates: { title: string; content: string; tags: string[] }): Promise<Post | undefined> {
    try {
      const result = await api<{ post: Post }>(`/posts/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      const updated = { ...post, ...result.post };
      setMyPosts((current) => current.map((item) => item.id === post.id ? updated : item));
      setProfilePosts((current) => current.map((item) => item.id === post.id ? updated : item));
      setPosts((current) => current.map((item) => item.id === post.id ? updated : item));
      notify("Post updated");
      return updated;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not edit post");
      return undefined;
    }
  }

  async function deletePost(post: Post) {
    if (!window.confirm(`Delete “${post.title}”?`)) return;
    try {
      await api(`/posts/${post.id}`, { method: "DELETE" });
      setMyPosts((current) => current.filter((item) => item.id !== post.id));
      setProfilePosts((current) => current.filter((item) => item.id !== post.id));
      setPosts((current) => current.filter((item) => item.id !== post.id));
      notify("Post deleted");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete post");
    }
  }

  async function uploadAvatar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identity?.id) return;
    const file = new FormData(event.currentTarget).get("avatar");
    if (!(file instanceof File)) return;
    const body = new FormData();
    body.set("avatar", file);
    try {
      const result = await api<{ user: User }>(`/user/${identity.id}/avatar`, {
        method: "PATCH",
        body,
      });
      setUser(result.user);
      notify("Profile image updated");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not upload image",
      );
    }
  }

  async function adminAction(user: User, action: "ban" | "unban") {
    if (action === "ban" && !window.confirm(`Ban ${user.fullName} (@${user.username || "learner"})? They will lose access to Discere.`)) return;
    try {
      await api(`/admin/users/${user.id}/${action}`, { method: "PATCH", body: JSON.stringify({}) });
      setAdminUsers((current) => current.map((member) => member.id === user.id ? { ...member, isBanned: action === "ban" } : member));
      notify(action === "ban" ? "Account banned" : "Account restored");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Admin action failed");
    }
  }

  async function updateRole(user: User, role: string) {
    if (role === user.role) return;
    if (!window.confirm(`Change ${user.fullName}'s role from ${user.role || "USER"} to ${role}?`)) return;
    try {
      const updated = await api<User>(`/admin/users/${user.id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
      setAdminUsers((current) => current.map((member) => member.id === user.id ? { ...member, ...updated, role } : member));
      notify("Member role updated");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update role");
    }
  }

  const isAdmin = identity?.role === "ADMIN";
  const isModerator = identity?.role === "MODERATOR";
  const pageTitle =
    view === "feed"
      ? "Your learning feed"
      : view === "discover"
        ? "Explore ideas"
        : view === "rooms"
          ? "Study rooms"
          : view === "study"
            ? "Ask Discere"
            : view === "summarize"
              ? "Summarise"
              : view === "notifications"
                ? "Notifications"
                : view === "account"
                  ? "Settings"
                  : view === "profile"
                    ? "Profile"
                    : view === "moderator"
                      ? "Moderator Panel"
                      : "Admin Panel";
  const nav = (
    <>
      <div className="side-label">LEARN</div>
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`nav-item ${view === id ? "active" : ""}`}
          onClick={() => {
            setView(id);
            setProfile(undefined);
            if (id !== "rooms") setActiveRoom(undefined);
            setMobileNav(false);
          }}
        >
          <Icon size={18} strokeWidth={1.8} />
          <span>{label}</span>
          {id === "notifications" && unreadCount > 0 && (
            <b className="nav-count">{unreadCount}</b>
          )}
        </button>
      ))}
      <button className={`nav-item ${view === "summarize" ? "active" : ""}`} onClick={() => { setView("summarize"); setMobileNav(false); }}><FileText size={18} /><span>Summarise</span></button>
      {authenticated && signedUserKnown && <button className={`nav-item ${view === "profile" && profile?.id === identity?.id ? "active" : ""}`} onClick={() => { if (identity?.id) void loadProfile(identity.id); setMobileNav(false); }}><Users size={18} /><span>Profile</span></button>}
      {authenticated && signedUserKnown && (
        <button
          className={`nav-item ${view === "account" ? "active" : ""}`}
          onClick={() => {
            setProfile(undefined);
            setView("account");
            setMobileNav(false);
          }}
        >
          <Settings2 size={18} />
          <span>Settings</span>
        </button>
      )}
      {authenticated && isAdmin && <button className={`nav-item ${view === "admin" ? "active" : ""}`} onClick={() => { setView("admin"); setMobileNav(false); }}><Shield size={18} /><span>Admin Panel</span></button>}
      {authenticated && isModerator && <button className={`nav-item ${view === "moderator" ? "active" : ""}`} onClick={() => { setView("moderator"); setMobileNav(false); }}><Shield size={18} /><span>Moderator Panel</span></button>}
    </>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark">D</div>
          <span className="brand-name">
            discere<span className="brand-period">.</span>
          </span>
          <button
            className="icon-button mobile-close"
            onClick={() => setMobileNav(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="sidebar-nav">{nav}</div>
        <div className="sidebar-bottom">
          <div className="sidebar-note sidebar-note-hidden">
            <div className="note-icon">
              <Sparkles size={16} />
            </div>
            <strong>Learn in good company.</strong>
            <span>Share what you know. Ask what you don’t.</span>
          </div>
          {authenticated ? (
            <div className="account-chip">
              <button
                className="account-link"
                onClick={() =>
                  signedUserKnown
                    ? setView("account")
                    : notify("Your session is active")
                }
              >
                <Avatar user={identity} size="sm" />
                <span className="account-meta">
                  <b>{identity?.fullName || "Signed in"}</b>
                  <small>
                    {identity?.username
                      ? `@${identity.username}`
                      : "Discere learner"}
                  </small>
                </span>
              </button>
              <button
                className="icon-button logout-small"
                aria-label="Sign out"
                onClick={() => void signOut()}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              className="button button-primary button-wide"
              onClick={() => setAuthOpen(true)}
            >
              <LogIn size={16} /> Sign in
            </button>
          )}
          <div className="sidebar-foot">
            A thoughtful space for learning
            <br />© Discere
          </div>
        </div>
      </aside>

      {mobileNav && (
        <button
          className="mobile-scrim"
          aria-label="Close menu"
          onClick={() => setMobileNav(false)}
        />
      )}
      <main className="main-column">
        <header className="topbar">
          <div className="topbar-brand"><div className="brand-mark">D</div><span className="brand-name">discere<span className="brand-period">.</span></span></div>
          <button
            className="icon-button mobile-menu"
            onClick={() => setMobileNav(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <span className="crumb-brand">Discere</span>
            <span className="crumb-slash">/</span>
            <strong>{pageTitle}</strong>
          </div>
          <div className="top-actions">
            <form
              className="top-search"
              onSubmit={(e) => {
                e.preventDefault();
                setProfile(undefined);
                setSearchTab("posts");
                setView("discover");
                void loadFeed(true);
              }}
            >
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ideas…"
              />
              <kbd>↵</kbd>
            </form>
            {authenticated && <button className="top-avatar" title="Profile" onClick={() => { if (identity?.id) void loadProfile(identity.id); }}><Avatar user={identity} size="sm" /></button>}
            <button
              className="icon-button top-bell"
              onClick={() => {
                setView("notifications");
                if (!authenticated) setAuthOpen(true);
              }}
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && <i />}
            </button>
          </div>
        </header>

        {error && (
          <div className="inline-alert">
            <CircleHelp size={17} />
            <span>{error}</span>
            <button className="icon-button" onClick={() => setError("")}>
              <X size={15} />
            </button>
          </div>
        )}
        <div className="page-content">
          {view === "profile" && !profile && profilePostsLoading && <div className="empty-inline">Loading profile…</div>}
          {view === "profile" && profile && (
            <div className="profile-banner panel">
              <button
                className="text-button back-link"
                onClick={() => { setProfile(undefined); setView("discover"); }}
              >
                <ArrowLeft size={15} /> Back to explore
              </button>
              <div className="profile-main">
                <Avatar user={profile} size="lg" />
                <div className="profile-copy">
                  <h2>{profile.fullName}</h2>
                  <span className="muted">
                    @{profile.username || "learner"}
                  </span>
                  {profile.bio && <p>{profile.bio}</p>}
                </div>
                {authenticated && profile.id !== identity?.id && (
                  <button
                    className="button button-primary"
                    disabled={followPendingIds.includes(profile.id)}
                    onClick={() => void followUser(profile)}
                  >
                    {followingUserIds.includes(profile.id) ? "Unfollow" : "Follow"}
                  </button>
                )}
              </div>
              <div className="profile-stat-row">
                <button onClick={() => openRelationModal("followers")}><b>{profileLists.followers.length}</b> followers</button>
                <button onClick={() => openRelationModal("following")}><b>{profileLists.following.length}</b> following</button>
              </div>
            </div>
          )}

                    <FeedPage
            view={view} profile={profile} posts={view === "profile" ? profilePosts : posts} loading={view === "profile" ? profilePostsLoading : loading} refreshing={refreshing}
            authenticated={authenticated} identity={identity} summaries={summaryByPost} activePost={activePost} comments={comments}
            query={query} setQuery={setQuery} semantic={semantic} setSemantic={setSemantic}
            searchTab={searchTab} setSearchTab={setSearchTab} userSearchResults={userSearchResults} searchingUsers={searchingUsers} loadUserSearch={loadUserSearch} followingUserIds={followingUserIds} followPendingIds={followPendingIds} onFollow={followUser}
            setAuthOpen={setAuthOpen} setComposerOpen={setComposerOpen} setView={setView} loadFeed={loadFeed}
            toggleLike={toggleLike} toggleSave={toggleSave} loadComments={loadComments} sendComment={sendComment}
            loadProfile={loadProfile} summarize={summarize} editComment={editComment} deleteComment={deleteComment}
          />
{view === "rooms" && (
            <>
              {!activeRoom ? (
                <>
                  <div className="page-heading">
                    <div>
                      <p className="eyebrow">
                        Study together, at your own pace
                      </p>
                      <h1>Study rooms</h1>
                      <p className="subheading">
                        Join a room to share questions and work through ideas
                        together.
                      </p>
                    </div>
                    <button
                      className="button button-primary"
                      onClick={() =>
                        authenticated
                          ? setShowCreateRoom(true)
                          : setAuthOpen(true)
                      }
                    >
                      <Plus size={17} /> Create a room
                    </button>
                  </div>
                  {!authenticated && (
                    <div className="soft-notice">
                      <LogIn size={16} />
                      <span>
                        Sign in to browse, join, or create study rooms.
                      </span>
                      <button
                        className="text-button"
                        onClick={() => setAuthOpen(true)}
                      >
                        Sign in
                      </button>
                    </div>
                  )}
                  {rooms.length === 0 ? <div className="empty-inline">No study rooms are available yet.</div> : <div className="room-grid">
                    {rooms.map((room) => (
                      <article className="room-card panel" key={room.id}>
                        <div className="room-icon">
                          <Hash size={21} />
                        </div>
                        <div className="room-topline">
                          <span
                            className={`privacy-tag ${room.type === "PRIVATE" ? "private" : ""}`}
                          >
                            {room.type === "PRIVATE" ? "Private" : "Open room"}
                          </span>
                          <MoreHorizontal size={17} className="muted" />
                        </div>
                        <h3>{room.name}</h3>
                        <p className="muted room-description">
                          {room.description ||
                            "A space to learn and discuss together."}
                        </p>
                        <div className="room-meta">
                          <span>
                            <Users size={14} /> {room._count?.members ?? 0}{" "}
                            members
                          </span>
                          <span>
                            <MessageCircle size={14} />{" "}
                            {room._count?.messages ?? 0} messages
                          </span>
                        </div>
                        <div className="room-footer">
                          <span className="creator-label">
                            Started by {room.creator?.fullName || "a learner"}
                          </span>
                          {authenticated && (
                            <div className="room-actions">
                              {joinedRoomIds.includes(room.id) ? (
                                <>
                                  <button
                                    className="button button-quiet button-small"
                                    onClick={() => void openRoom(room)}
                                  >
                                    Open
                                  </button>
                                  {room.creator?.id !== identity?.id && (
                                    <button
                                      className="button button-quiet button-small"
                                      onClick={() => void leaveRoom(room)}
                                    >
                                      Leave
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  className="button button-primary button-small"
                                  onClick={() => void joinRoom(room)}
                                >
                                  Join
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>}
                  {authenticated && (
                    <div className="socket-panel panel">
                      <div className={`socket-indicator ${socketState}`} />
                      <div className="socket-copy">
                        <strong>Live conversation</strong>
                        <span>
                          {socketState === "connected"
                            ? "Connected securely"
                            : socketState === "connecting"
                              ? "Connecting to Discere…"
                              : socketState === "error"
                                ? socketError || "Could not connect"
                                : "Connect to send and receive room messages."}
                        </span>
                      </div>
                      {socketState !== "connected" && authenticated && !accessToken && (
                        <button className="text-button socket-session-note" onClick={() => setAuthOpen(true)}>
                          Sign in again to restore live chat after a page refresh
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <RoomChat
                  room={activeRoom}
                  identity={identity}
                  messages={messages}
                  members={roomMembers}
                  hasMore={hasMoreMessages}
                  typingNames={typingNames}
                  socketState={socketState}
                  socketError={socketError}
                  onlineUserIds={onlineUserIds}
                  onBack={() => {
                    socketRef.current?.emit("leave_room", {
                      roomId: activeRoom.id,
                    });
                    setActiveRoom(undefined);
                  }}
                  onLeave={() => void leaveRoom(activeRoom)}
                  onDelete={() => void deleteRoom(activeRoom)}
                  onLoadMore={loadMoreMessages}
                  onTyping={() =>
                    socketRef.current?.emit("user_typing", {
                      roomId: activeRoom.id,
                    })
                  }
                  onDeleteMessage={deleteMessage}
                  onEditMessage={editMessage}
                  onReconnect={() => setAuthOpen(true)}
                  onSend={sendMessage}
                  onInvite={async (userId) => {
                    await api(
                      `/room/${activeRoom.id}/members`,
                      json({ userId }),
                    );
                    notify("Member added to room");
                  }}
                />
              )}
            </>
          )}

                    {view === "study" && <StudyPage authenticated={authenticated} setAuthOpen={setAuthOpen} askQuestion={askQuestion} aiQuestion={aiQuestion} setAiQuestion={setAiQuestion} aiWaiting={aiWaiting} aiJob={aiJob} setView={setView} setQuery={setQuery} />}
          {view === "summarize" && <section className="summarize-page"><div className="page-heading"><div><h1>Summarise a post</h1><p className="subheading">Choose a community post to generate its summary.</p></div></div>{posts.length ? posts.map((post) => <article className="summary-choice" key={post.id}><div><strong>{post.title}</strong><p>{post.content}</p>{summaryByPost[post.id] && <p className="summary-result">{summaryByPost[post.id]}</p>}</div><button className="button button-secondary" onClick={() => void summarize(post)}>{summaryByPost[post.id] ? "Refresh summary" : "Summarise"}</button></article>) : <div className="empty-inline">No posts available to summarise.</div>}</section>}
          {view === "notifications" && <NotificationsPage authenticated={authenticated} setAuthOpen={setAuthOpen} loadNotifications={loadNotifications} notices={notices} markRead={markRead} />}
          {view === "account" && <AccountPage identity={identity} posts={myPosts} loadingPosts={myPostsLoading} onSavePost={editPost} onDeletePost={deletePost} profileEditing={profileEditing} setProfileEditing={setProfileEditing} uploadAvatar={uploadAvatar} updateAccount={updateAccount} profileForm={profileForm} setProfileForm={setProfileForm} />}
          {view === "admin" && isAdmin && <AccessPanel mode="admin" users={adminUsers} loading={adminUsersLoading} onSetRole={updateRole} onToggleBan={adminAction} />}
          {view === "moderator" && isModerator && <AccessPanel mode="moderator" users={adminUsers} loading={adminUsersLoading} />}
        </div>
      </main>

      <aside className={`right-rail ${activeRoom ? "room-rail" : ""}`}>
        {activeRoom ? (
          <>
            <h2>Room members</h2>
            <p className="context-caption">{roomMembers.length} people in this room</p>
            <div className="context-member-list">{roomMembers.map((member) => <div className="context-member" key={member.id}><Avatar user={member} size="sm" /><span>{member.fullName}</span><i className={`member-presence ${onlineUserIds.has(member.id) ? "online" : ""}`} /></div>)}</div>
          </>
        ) : view === "feed" || view === "discover" ? (
          <>
            {trendingTags.length > 0 && <section className="context-section"><h2>Topics in this feed</h2>{trendingTags.map(([tag, count]) => <button className="context-topic" key={tag} onClick={() => { setQuery(tag); setView("discover"); }}>{`#${tag}`}<span>{count}</span></button>)}</section>}
            {rooms.length > 0 && <section className="context-section"><h2>Study rooms</h2>{rooms.slice(0, 4).map((room) => <button className="context-room" key={room.id} onClick={() => { setView("rooms"); if (joinedRoomIds.includes(room.id)) void openRoom(room); }}><Hash size={15} /><span>{room.name}</span></button>)}</section>}
          </>
        ) : null}
      </aside>

      <nav className="mobile-tabs" aria-label="Primary navigation">
        <button className={view === "feed" ? "active" : ""} onClick={() => { setView("feed"); setProfile(undefined); }}><Activity /><span>Feed</span></button>
        <button className={view === "discover" ? "active" : ""} onClick={() => { setView("discover"); setProfile(undefined); }}><Compass /><span>Explore</span></button>
        <button className={view === "rooms" ? "active" : ""} onClick={() => setView("rooms")}><Users /><span>Rooms</span></button>
        <button className={view === "study" ? "active" : ""} onClick={() => setView("study")}><Sparkles /><span>Ask AI</span></button>
        <button className="mobile-more" onClick={() => setMobileNav(true)}><Menu /><span>More</span></button>
      </nav>

      {relationModal && profile && (
        <div className="scrim" onMouseDown={(event) => event.target === event.currentTarget && setRelationModal(undefined)}>
          <section className="relation-dialog panel" role="dialog" aria-modal="true" aria-label={relationModal === "followers" ? "Followers" : "Following"}>
            <header><div><h2>{relationModal === "followers" ? "Followers" : "Following"}</h2><span className="muted">@{profile.username || "learner"}</span></div><button className="icon-button" onClick={() => setRelationModal(undefined)} aria-label="Close"><X size={18} /></button></header>
            <div className="relation-user-list">{(relationModal === "followers" ? profileLists.followers.map((entry) => entry.follower) : profileLists.following.map((entry) => entry.following)).map((user) => <button className="relation-user" key={user.id} onClick={() => { setRelationModal(undefined); void loadProfile(user.id); }}><Avatar user={user} size="md" /><span><strong>{user.fullName}</strong><small>@{user.username || "learner"}</small></span></button>)}{(relationModal === "followers" ? profileLists.followers.length : profileLists.following.length) === 0 && <div className="empty-inline">No {relationModal} yet.</div>}</div>
          </section>
        </div>
      )}

      {composerOpen && (
        <div
          className="scrim"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setComposerOpen(false)
          }
        >
          <section className="compose-dialog panel">
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">Share a thought</p>
                <h2>Start a discussion</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setComposerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={createPost} className="form-stack">
              <label>
                Title
                <input
                  required
                  maxLength={200}
                  autoFocus
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, title: e.target.value })
                  }
                  placeholder="What did you learn?"
                />
              </label>
              <label>
                Your note
                <textarea
                  required
                  maxLength={50000}
                  rows={7}
                  value={createForm.content}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, content: e.target.value })
                  }
                  placeholder="Share the useful detail, the open question, or the connection you noticed…"
                />
              </label>
              <label>
                Topics
                <span className="input-hint">Separate tags with commas</span>
                <input
                  value={createForm.tags}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, tags: e.target.value })
                  }
                  placeholder="systems, design, research"
                />
              </label>
              <label className="file-drop">
                <ImagePlus size={17} />
                <span>Add images or video</span>
                <input
                  type="file"
                  name="media"
                  multiple
                  accept="image/*,video/*"
                />
              </label>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setComposerOpen(false)}
                >
                  Cancel
                </button>
                <button className="button button-primary" disabled={busy}>
                  {busy ? "Publishing…" : "Publish post"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {showCreateRoom && (
        <div
          className="scrim"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setShowCreateRoom(false)
          }
        >
          <section className="compose-dialog panel">
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">Make room for a good question</p>
                <h2>Create a study room</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowCreateRoom(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={createRoom} className="form-stack">
              <label>
                Room name
                <input
                  required
                  maxLength={100}
                  autoFocus
                  value={roomForm.name}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, name: e.target.value })
                  }
                />
              </label>
              <label>
                Description
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={roomForm.description}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, description: e.target.value })
                  }
                />
              </label>
              <label>
                Room access
                <select
                  value={roomForm.type}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, type: e.target.value })
                  }
                >
                  <option value="PUBLIC">Public — anyone can join</option>
                  <option value="PRIVATE">Private — invite members</option>
                </select>
              </label>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => setShowCreateRoom(false)}
                >
                  Cancel
                </button>
                <button className="button button-primary">Create room</button>
              </div>
            </form>
          </section>
        </div>
      )}
      {authOpen && (
        <AuthDialog
          onClose={() => setAuthOpen(false)}
          onSuccess={(auth) => void handleSignedIn(auth)}
        />
      )}
      {toast && (
        <div className="toast">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
