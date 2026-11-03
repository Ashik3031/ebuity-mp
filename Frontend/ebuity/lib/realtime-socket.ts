"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

let globalSocket: Socket | null = null;
let currentRole: string | null = null;
let currentStaffId: string | null = null;

const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "http://localhost:4000";

interface SocketInitOptions {
  role?: "admin" | "staff" | "customer";
  staffId?: string;
  userId?: string;
}

/**
 * Get or initialize global Socket.IO instance
 */
export function getRealtimeSocket(options: SocketInitOptions = {}): Socket {
  if (typeof window === "undefined") {
    // Return dummy on SSR
    return null as unknown as Socket;
  }

  const role = options.role || "customer";
  const staffId = options.staffId;

  if (!globalSocket) {
    globalSocket = io(SOCKET_SERVER_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      query: {
        role,
        ...(staffId ? { staffId } : {}),
      },
      withCredentials: true,
    });

    currentRole = role;
    currentStaffId = staffId || null;

    globalSocket.on("connect", () => {
      // Auto-rejoin assigned rooms upon connection/reconnection
      globalSocket?.emit("join", {
        role: currentRole,
        staffId: currentStaffId,
      });
    });
  } else {
    // If role or staffId changed, inform server
    if (role !== currentRole || staffId !== currentStaffId) {
      currentRole = role;
      currentStaffId = staffId || null;
      if (globalSocket.connected) {
        globalSocket.emit("join", {
          role,
          staffId,
        });
      }
    }
  }

  return globalSocket;
}

/**
 * Hook to listen to a specific realtime event
 */
export function useRealtimeEvent<T = any>(
  eventName: string,
  handler: (data: T) => void,
  options: SocketInitOptions = {}
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const socket = getRealtimeSocket(options);
    if (!socket) return;

    const listener = (data: T) => {
      if (handlerRef.current) {
        handlerRef.current(data);
      }
    };

    socket.on(eventName, listener);

    return () => {
      socket.off(eventName, listener);
    };
  }, [eventName, options.role, options.staffId]);
}

/**
 * Hook to monitor live connection status
 */
export function useRealtimeConnection(options: SocketInitOptions = {}) {
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const socket = getRealtimeSocket(options);
    if (!socket) return;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    if (socket.connected) {
      setIsConnected(true);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [options.role, options.staffId]);

  return { isConnected };
}
