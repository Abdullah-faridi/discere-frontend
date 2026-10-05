import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { connectSocket } from "../socket/client";
import { ChatMessage, JobResult } from "../types/domain";
import { normalizeAiJob } from "../utils/aiJobs";

type UseDiscereSocketOptions = {
  accessToken?: string;
  authenticated: boolean;
  activeRoomId?: string;
  notify: (message: string) => void;
  loadNotifications: () => Promise<void>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setHasMoreMessages: Dispatch<SetStateAction<boolean>>;
  setTypingNames: Dispatch<SetStateAction<string[]>>;
  setAiWaiting: Dispatch<SetStateAction<boolean>>;
  setAiJob: Dispatch<SetStateAction<JobResult | undefined>>;
  setSummaryByPost: Dispatch<SetStateAction<Record<string, string>>>;
};

export function useDiscereSocket(options: UseDiscereSocketOptions) {
  const [state, setState] = useState<"off" | "connecting" | "connected" | "error">("off");
  const [error, setError] = useState("");
  const [onlineUserIds, setOnlineUsers] = useState<Set<string>>(() => new Set());
  const socketRef = useRef<Socket | null>(null);
  const activeRoomIdRef = useRef(options.activeRoomId);
  const previousRoomIdRef = useRef<string | undefined>(undefined);
  activeRoomIdRef.current = options.activeRoomId;

  useEffect(() => {
    const {
      accessToken,
      authenticated,
      notify,
      loadNotifications,
      setMessages,
      setHasMoreMessages,
      setTypingNames,
      setAiWaiting,
      setAiJob,
      setSummaryByPost,
    } = options;

    if (!authenticated && !accessToken) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      previousRoomIdRef.current = undefined;
      setState("off");
      setOnlineUsers(new Set());
      return;
    }

    setState("connecting");
    const socket = connectSocket(accessToken, false);
    socketRef.current = socket;
    const heartbeat = window.setInterval(() => {
      if (socket.connected) socket.emit("heartbeat");
    }, 15000);

    socket.on("connect", () => {
      setState("connected");
      setError("");
      const roomId = activeRoomIdRef.current;
      if (roomId) socket.emit("join_room", { roomId });
    });
    socket.on("disconnect", () => setState("connecting"));
    socket.on("connect_error", (cause: Error) => {
      setState("error");
      setError(cause.message);
    });
    socket.on("chat_history", (payload: { roomId: string; messages: ChatMessage[] }) => {
      if (payload.roomId === activeRoomIdRef.current) setMessages(payload.messages || []);
    });
    socket.on("new_message", (message: ChatMessage & { roomId: string }) => {
      if (message.roomId !== activeRoomIdRef.current) return;
      const normalized = { ...message, senderId: message.senderId || message.sender?.id };
      setMessages((current) => current.some((item) => item.id === normalized.id)
        ? current
        : [...current, normalized]);
    });
    socket.on("message_deleted", (payload: { messageId: string; roomId: string }) => {
      if (payload.roomId !== activeRoomIdRef.current) return;
      setMessages((current) => current.map((message) => message.id === payload.messageId
        ? { ...message, content: "This message was deleted" }
        : message));
    });
    socket.on("message_edited", (payload: { messageId: string; roomId: string; content: string }) => {
      if (payload.roomId !== activeRoomIdRef.current) return;
      setMessages((current) => current.map((message) => message.id === payload.messageId
        ? { ...message, content: payload.content }
        : message));
    });
    socket.on("more_messages", (payload: { roomId: string; messages: ChatMessage[]; hasMore: boolean }) => {
      if (payload.roomId !== activeRoomIdRef.current) return;
      setMessages((current) => {
        const currentIds = new Set(current.map((message) => message.id));
        return [...(payload.messages || []).filter((message) => !currentIds.has(message.id)), ...current];
      });
      setHasMoreMessages(payload.hasMore);
    });
    socket.on("typing_indicator", (payload: { fullName?: string; roomId: string }) => {
      if (payload.roomId !== activeRoomIdRef.current || !payload.fullName) return;
      setTypingNames((current) => current.includes(payload.fullName!) ? current : [...current, payload.fullName!]);
      window.setTimeout(() => setTypingNames((current) => current.filter((name) => name !== payload.fullName)), 1800);
    });
    socket.on("user_joined", (payload: { fullName?: string }) => {
      if (payload.fullName) notify(`${payload.fullName} joined the room`);
    });
    socket.on("user_left", (payload: { fullName?: string }) => {
      if (payload.fullName) notify(`${payload.fullName} left the room`);
    });
    socket.on("notification", () => {
      void loadNotifications().catch(() => undefined);
      notify("You have a new notification");
    });
    socket.on("ai_job_completed", (result: JobResult & { type?: string; userId?: string; answer?: unknown }) => {
      const normalized = normalizeAiJob(result);
      setAiWaiting(false);
      setAiJob(normalized);
      const postId = normalized.postId || normalized.result?.post?.id;
      if (postId && normalized.result?.summary) {
        setSummaryByPost((current) => ({ ...current, [postId]: normalized.result!.summary! }));
      }
    });
    socket.on("ai_job_failed", () => {
      setAiWaiting(false);
      notify("The AI request could not be completed.");
    });
    socket.on("error", (payload: { message?: string }) => {
      if (payload?.message) setError(payload.message);
    });
    socket.on("user_online", (payload: { userId?: string }) => {
      if (payload.userId) setOnlineUsers((users) => new Set(users).add(payload.userId!));
    });
    socket.on("user_offline", (payload: { userId?: string }) => {
      if (payload.userId) setOnlineUsers((users) => {
        const next = new Set(users);
        next.delete(payload.userId!);
        return next;
      });
    });

    socket.connect();
    return () => {
      window.clearInterval(heartbeat);
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [options.accessToken, options.authenticated, options.notify, options.loadNotifications]);

  useEffect(() => {
    const previousRoomId = previousRoomIdRef.current;
    const currentRoomId = options.activeRoomId;
    const socket = socketRef.current;
    if (socket?.connected) {
      if (previousRoomId && previousRoomId !== currentRoomId) {
        socket.emit("leave_room", { roomId: previousRoomId });
      }
      if (currentRoomId && previousRoomId !== currentRoomId) {
        socket.emit("join_room", { roomId: currentRoomId });
      }
    }
    previousRoomIdRef.current = currentRoomId;
  }, [options.activeRoomId]);

  return { socketRef, socketState: state, socketError: error, onlineUserIds };
}
