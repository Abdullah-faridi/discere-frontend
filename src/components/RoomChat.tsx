import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Hash, MessageCircle, MoreHorizontal, Plus, Send } from "lucide-react";
import { User } from "../types/auth";
import { ChatMessage, Room } from "../types/domain";
import { Avatar, EmptyState, formatDate } from "./common";

export default function RoomChat({
  room,
  identity,
  messages,
  members,
  hasMore,
  typingNames,
  socketState,
  socketError,
  onlineUserIds,
  onBack,
  onLeave,
  onDelete,
  onLoadMore,
  onTyping,
  onDeleteMessage,
  onEditMessage,
  onReconnect,
  onSend,
  onInvite,
}: {
  room: Room;
  identity?: User;
  messages: ChatMessage[];
  members: User[];
  hasMore: boolean;
  typingNames: string[];
  socketState: string;
  socketError: string;
  onlineUserIds: Set<string>;
  onBack: () => void;
  onLeave: () => void;
  onDelete: () => void;
  onLoadMore: () => void;
  onTyping: () => void;
  onDeleteMessage: (message: ChatMessage) => void;
  onEditMessage: (message: ChatMessage, content: string) => void;
  onReconnect: () => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
  onInvite: (userId: string) => Promise<void>;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | undefined>(undefined);
  const [openMenuId, setOpenMenuId] = useState<string | undefined>();
  const [editingMessageId, setEditingMessageId] = useState<string | undefined>();
  const [editDraft, setEditDraft] = useState("");
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => () => {
    if (typingTimer.current !== undefined) window.clearTimeout(typingTimer.current);
  }, []);
  useEffect(() => {
    if (!openMenuId) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpenMenuId(undefined);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [openMenuId]);
  return (
    <section className="chat-view">
      <header className="chat-header">
        <button className="icon-button" onClick={onBack}>
          <ArrowLeft size={18} />
        </button>
        <div className="room-icon small-room-icon">
          <Hash size={18} />
        </div>
        <div className="chat-room-title">
          <h1>{room.name}</h1>
          <span>
            <span className={`socket-indicator inline ${socketState}`} />
            {socketState === "connected" ? "Live · " : "Room · "}
            {members.length} members
          </span>
        </div>
        {identity?.id === room.creator?.id && (
          <button
            className="button button-quiet button-small"
            onClick={async () => {
              const userId = window.prompt("Enter the user ID to invite");
              if (userId) await onInvite(userId);
            }}
          >
            <Plus size={15} /> Invite
          </button>
        )}
        <button className="button button-quiet button-small" onClick={onLeave}>
          Leave
        </button>
        {identity?.id === room.creator?.id && (
          <button
            className="button button-danger button-small"
            onClick={onDelete}
          >
            Delete
          </button>
        )}
      </header>
      <div className="chat-context">
        <span>{room.description || "A focused space to learn together."}</span>
        {socketState !== "connected" && (
          <span className="chat-offline">
            {socketError || "Connect live chat to send messages."}
            {socketState === "off" && <button className="text-button" onClick={onReconnect}>Sign in again to connect</button>}
          </span>
        )}
      </div>
      <div className="messages-list">
        {hasMore && (
          <button
            className="load-older"
            onClick={onLoadMore}
            disabled={socketState !== "connected"}
          >
            <ArrowRight size={13} /> Load earlier messages
          </button>
        )}
        {messages.map((message, index) => {
          const grouped = index > 0 && messages[index - 1].senderId === message.senderId;
          const isOwnMessage = identity?.id === (message.senderId || message.sender?.id);
          const canAct = Boolean(isOwnMessage && message.content !== "This message was deleted");
          const isEditing = editingMessageId === message.id;
          const showMenu = openMenuId === message.id;
          return (
            <div className={`message-row ${grouped ? "grouped" : ""}`} key={message.id}>
              {!grouped && <Avatar user={message.sender} size="sm" />}
              <div className="message-bubble-wrap">
                <div className="message-meta">
                  {!grouped && <><strong>{message.sender?.fullName || "Learner"}</strong><small>{formatDate(message.createdAt)}</small></>}
                  {canAct && <div className="message-actions" ref={showMenu ? menuRef : null}>
                    <button className="message-more" type="button" aria-label="Message actions" aria-expanded={showMenu} onClick={() => setOpenMenuId(showMenu ? undefined : message.id)}><MoreHorizontal size={17} /></button>
                    {showMenu && <div className="message-menu" role="menu">
                      <button type="button" role="menuitem" onClick={() => { setEditingMessageId(message.id); setEditDraft(message.content); setOpenMenuId(undefined); }}>Edit</button>
                      <button type="button" role="menuitem" onClick={() => { onDeleteMessage(message); setOpenMenuId(undefined); }}>Delete</button>
                    </div>}
                  </div>}
                </div>
                {isEditing ? <form className="message-edit-form" onSubmit={(event) => { event.preventDefault(); onEditMessage(message, editDraft); setEditingMessageId(undefined); }}>
                  <textarea aria-label="Edit message" maxLength={1000} value={editDraft} onChange={(event) => setEditDraft(event.target.value)} autoFocus />
                  <div><button className="button button-primary button-small" type="submit" disabled={!editDraft.trim()}>Save</button><button className="button button-quiet button-small" type="button" onClick={() => setEditingMessageId(undefined)}>Cancel</button></div>
                </form> : <div className="message-bubble">{message.content}</div>}
              </div>
            </div>
          );
        })}
        {typingNames.length > 0 && (
          <div className="typing-note">
            {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"}{" "}
            thinking…
          </div>
        )}
        {!messages.length && (
          <EmptyState
            icon={<MessageCircle size={20} />}
            title="Start with a question"
            text="Messages appear here when room members start a conversation."
          />
        )}
        <div ref={bottomRef} />
      </div>
      <form className="message-composer" onSubmit={onSend}>
        <input
          name="message"
          maxLength={1000}
          disabled={socketState !== "connected"}
          onChange={() => {
            if (typingTimer.current) window.clearTimeout(typingTimer.current);
            typingTimer.current = window.setTimeout(onTyping, 800);
          }}
          placeholder={
            socketState === "connected"
              ? "Share a thought with the room…"
              : "Connect live chat to send a message"
          }
        />
        <button
          className="button button-primary"
          disabled={socketState !== "connected"}
        >
          <Send size={16} />
        </button>
      </form>
      <div className="members-strip">
        <span>IN THIS ROOM</span>
        {members.slice(0, 8).map((member) => (
          <span key={member.id} title={member.fullName}>
            <span className={`member-presence ${onlineUserIds.has(member.id) ? "online" : ""}`}>
            <Avatar user={member} size="sm" />
          </span>
          </span>
        ))}
        {members.length > 8 && <small>+{members.length - 8}</small>}
      </div>
    </section>
  );
}

