import { io, Socket } from "socket.io-client";
import { API_BASE } from "../services/api";

const SOCKET_BASE = import.meta.env.VITE_SOCKET_URL || API_BASE;

export function connectSocket(accessToken?: string, autoConnect = true): Socket {
  return io(SOCKET_BASE, { withCredentials: true, auth: accessToken ? { token: accessToken } : {}, autoConnect, transports: ["websocket", "polling"] });
}
