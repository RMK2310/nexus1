import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Bot,
  User,
  Car,
  ShoppingBag,
  Bike,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCheck,
  Plus,
  Search,
  X,
  Trash2,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
} from "lucide-react";
import { authFetch } from "./services/apiClient";
import { io, Socket } from "socket.io-client";

interface Conversation {
  id: string;
  name: string;
  role?: string;
  isGroup?: boolean;
  lastMessage: string;
  lastMessageTime: string;
  otherMembers: Array<{ id: string; name: string; email: string; phone?: string }>;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  tagline: string;
  isSystem: boolean;
}

interface ChatPortalProps {
  user: any;
  backendUrl: string;
  setGlobalSuccessMsg?: (msg: string) => void;
  setGlobalErrorMsg?: (msg: string) => void;
}

export const ChatPortal: React.FC<ChatPortalProps> = ({
  user,
  backendUrl,
  setGlobalSuccessMsg,
  setGlobalErrorMsg,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTypingReply, setIsTypingReply] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [isContactsLoading, setIsContactsLoading] = useState(false);
  const [customContactInput, setCustomContactInput] = useState("");
  const [convFilterQuery, setConvFilterQuery] = useState("");
  
  // Direct Mobile Messaging states (with hidden seamless verification)
  const [phoneToLookup, setPhoneToLookup] = useState("");
  const [phoneDirectMessage, setPhoneDirectMessage] = useState("");
  const [isSendingPhoneDirect, setIsSendingPhoneDirect] = useState(false);
  const [directPhoneError, setDirectPhoneError] = useState<string | null>(null);

  // Real-time WebSocket typing & messaging state
  const [remoteTypingUser, setRemoteTypingUser] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const remoteTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchConversations();
  }, [backendUrl]);

  // WebSocket real-time connection for instant messages & typing indicators
  useEffect(() => {
    const socket = io(backendUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("WebSocket connected to NEXUS real-time gateway:", socket.id);
      if (activeConv) {
        socket.emit("join_conversation", {
          conversationId: activeConv.id,
          userId: user?.id,
          userName: user?.name,
        });
      }
    });

    socket.on("user_typing", (data: { conversationId: string; senderId?: string; senderName?: string }) => {
      if (activeConv && data.conversationId === activeConv.id) {
        if (data.senderId && user?.id && data.senderId === user.id) return;
        setRemoteTypingUser(data.senderName || "User");
        if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
        remoteTypingTimeoutRef.current = setTimeout(() => {
          setRemoteTypingUser(null);
        }, 3500);
      }
    });

    socket.on("user_stop_typing", (data: { conversationId: string; senderId?: string }) => {
      if (activeConv && data.conversationId === activeConv.id) {
        if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
        setRemoteTypingUser(null);
      }
    });

    socket.on("new_message", (msg: ChatMessage) => {
      if (activeConv && msg.conversationId === activeConv.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setRemoteTypingUser(null);
      }
      fetchConversations();
    });

    return () => {
      socket.disconnect();
    };
  }, [backendUrl]);

  useEffect(() => {
    if (socketRef.current && activeConv) {
      socketRef.current.emit("join_conversation", {
        conversationId: activeConv.id,
        userId: user?.id,
        userName: user?.name,
      });
    }
    setRemoteTypingUser(null);
  }, [activeConv?.id]);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.id);
      const timer = setInterval(() => {
        fetchMessages(activeConv.id, true);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [activeConv, backendUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTypingReply, remoteTypingUser]);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`${backendUrl}/api/v1/messaging/conversations`, {}, backendUrl);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setConversations(json.data);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch conversations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContacts = async (query = "") => {
    setIsContactsLoading(true);
    try {
      const url = query
        ? `${backendUrl}/api/v1/messaging/contacts?q=${encodeURIComponent(query)}`
        : `${backendUrl}/api/v1/messaging/contacts`;
      const res = await authFetch(url, {}, backendUrl);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setContacts(json.data);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch contacts:", err);
    } finally {
      setIsContactsLoading(false);
    }
  };

  const openNewChatModal = () => {
    setShowNewChatModal(true);
    setContactSearchQuery("");
    setCustomContactInput("");
    fetchContacts();
  };

  // Seamless Direct Messaging by phone with hidden automatic verification
  const handleSendToPhone = async (explicitPhone?: string, explicitMsg?: string) => {
    const rawNumber = (explicitPhone || phoneToLookup).trim();
    const message = (explicitMsg || phoneDirectMessage).trim();

    if (!rawNumber) {
      setDirectPhoneError("Please enter a mobile number");
      return;
    }
    if (!message) {
      setDirectPhoneError("Please enter a message to send");
      return;
    }

    setDirectPhoneError(null);
    setIsSendingPhoneDirect(true);

    try {
      const res = await authFetch(
        `${backendUrl}/api/v1/messaging/send-to-phone`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: rawNumber,
            content: message,
          }),
        },
        backendUrl
      );

      const json = await res.json();
      if (res.ok && json.success) {
        if (setGlobalSuccessMsg) {
          setGlobalSuccessMsg(
            `🚀 Message delivered to ${json.data.recipient.name} (${rawNumber})!`
          );
        }
        setPhoneDirectMessage("");
        setPhoneToLookup("");
        setDirectPhoneError(null);
        setShowNewChatModal(false);
        await fetchConversations();

        // Open the conversation immediately
        const targetConv: Conversation = {
          id: json.data.conversationId,
          name: json.data.recipient.name,
          role: json.data.recipient.role || "USER",
          lastMessage: json.data.message,
          lastMessageTime: new Date().toISOString(),
          otherMembers: [json.data.recipient],
        };
        setActiveConv(targetConv);
      } else {
        const errorMsg = json.message || "Failed to deliver message";
        setDirectPhoneError(errorMsg);
        if (setGlobalErrorMsg) {
          setGlobalErrorMsg(errorMsg);
        }
      }
    } catch (err: any) {
      const errMsg = err.message || "Network error";
      setDirectPhoneError(errMsg);
      if (setGlobalErrorMsg) setGlobalErrorMsg(errMsg);
    } finally {
      setIsSendingPhoneDirect(false);
    }
  };

  const startNewConversation = async (
    recipientId?: string,
    recipientContact?: string,
    name?: string,
    initialMessage?: string
  ) => {
    try {
      setIsLoading(true);
      const res = await authFetch(
        `${backendUrl}/api/v1/messaging/conversations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientId, recipientContact, name, initialMessage }),
        },
        backendUrl
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setShowNewChatModal(false);
          await fetchConversations();
          setActiveConv(json.data);
          if (setGlobalSuccessMsg) {
            setGlobalSuccessMsg(`Chat opened with ${json.data.name}!`);
          }
        }
      } else {
        const errJson = await res.json();
        if (setGlobalErrorMsg) {
          setGlobalErrorMsg(errJson.message || "Failed to start conversation");
        }
      }
    } catch (e: any) {
      if (setGlobalErrorMsg) setGlobalErrorMsg(e.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await authFetch(
        `${backendUrl}/api/v1/messaging/conversations/${id}`,
        { method: "DELETE" },
        backendUrl
      );
      if (res.ok) {
        if (activeConv?.id === id) setActiveConv(null);
        await fetchConversations();
        if (setGlobalSuccessMsg) setGlobalSuccessMsg("Conversation deleted");
      }
    } catch (err) {
      console.warn("Delete failed:", err);
    }
  };

  const fetchMessages = async (conversationId: string, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await authFetch(
        `${backendUrl}/api/v1/messaging/conversations/${conversationId}/messages`,
        {},
        backendUrl
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setMessages(json.data);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch messages:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleChatInputChange = (val: string) => {
    setInputMsg(val);
    if (!activeConv || !socketRef.current) return;

    socketRef.current.emit("typing", {
      conversationId: activeConv.id,
      senderId: user?.id || "user",
      senderName: user?.name || "User",
    });

    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      socketRef.current?.emit("stop_typing", {
        conversationId: activeConv.id,
        senderId: user?.id || "user",
      });
    }, 1500);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMsg;
    if (!activeConv || !text.trim() || isSending) return;

    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    socketRef.current?.emit("stop_typing", {
      conversationId: activeConv.id,
      senderId: user?.id || "user",
    });

    setIsSending(true);
    setInputMsg("");

    // Optimistic UI insert
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: activeConv.id,
      senderId: user?.id || "my-id",
      senderName: user?.name || "Me",
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const isCompanion =
      activeConv.role === "AI_ASSISTANT" ||
      activeConv.role === "DRIVER" ||
      activeConv.role === "SELLER" ||
      activeConv.role === "COURIER" ||
      activeConv.name.includes("AI") ||
      activeConv.name.includes("Driver") ||
      activeConv.name.includes("Seller") ||
      activeConv.name.includes("Courier");

    if (isCompanion) {
      setIsTypingReply(true);
    }

    try {
      const res = await authFetch(
        `${backendUrl}/api/v1/messaging/conversations/${activeConv.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text.trim() }),
        },
        backendUrl
      );

      if (res.ok) {
        setTimeout(async () => {
          await fetchMessages(activeConv.id, true);
          setIsTypingReply(false);
          fetchConversations();
        }, 850);
      }
    } catch (err) {
      console.warn("Send failed:", err);
      setIsTypingReply(false);
    } finally {
      setIsSending(false);
    }
  };

  const getAvatarInfo = (item: { name?: string; role?: string }) => {
    const name = item.name || "";
    const role = item.role || "";

    if (role === "AI_ASSISTANT" || name.includes("AI") || name.includes("Concierge")) {
      return {
        bg: "linear-gradient(135deg, #a855f7, #6366f1)",
        icon: <Bot size={18} color="#fff" />,
        badge: "AI ASSISTANT",
        badgeBg: "rgba(168, 85, 247, 0.2)",
        badgeColor: "#c084fc",
      };
    }
    if (role === "DRIVER" || name.includes("Driver")) {
      return {
        bg: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
        icon: <Car size={18} color="#fff" />,
        badge: "MOBILITY DRIVER",
        badgeBg: "rgba(59, 130, 246, 0.2)",
        badgeColor: "#60a5fa",
      };
    }
    if (role === "SELLER" || name.includes("Seller") || name.includes("Merchant")) {
      return {
        bg: "linear-gradient(135deg, #10b981, #059669)",
        icon: <ShoppingBag size={18} color="#fff" />,
        badge: "MERCHANT SELLER",
        badgeBg: "rgba(16, 185, 129, 0.2)",
        badgeColor: "#34d399",
      };
    }
    if (role === "COURIER" || name.includes("Courier") || name.includes("Ramesh")) {
      return {
        bg: "linear-gradient(135deg, #f97316, #ea580c)",
        icon: <Bike size={18} color="#fff" />,
        badge: "COURIER FLEET",
        badgeBg: "rgba(249, 115, 22, 0.2)",
        badgeColor: "#fb923c",
      };
    }
    return {
      bg: "linear-gradient(135deg, #64748b, #475569)",
      icon: <User size={18} color="#fff" />,
      badge: "MEMBER",
      badgeBg: "rgba(148, 163, 184, 0.2)",
      badgeColor: "#cbd5e1",
    };
  };

  const quickPrompts = activeConv?.name?.includes("AI")
    ? [
        "How do I message users with phone numbers?",
        "How do notifications work in NEXUS?",
        "Check my wallet balance",
      ]
    : activeConv?.name?.includes("Driver")
    ? [
        "I am waiting near the main gate.",
        "Please turn on the AC.",
        "What is your ETA?",
      ]
    : activeConv?.name?.includes("Courier")
    ? [
        "I have my delivery OTP ready.",
        "Please ring the doorbell upon arrival.",
        "How many minutes away are you?",
      ]
    : [
        "Is this item in stock?",
        "When will my order dispatch?",
        "Do you provide a warranty?",
      ];

  const filteredConversations = conversations.filter((c) =>
    convFilterQuery
      ? c.name.toLowerCase().includes(convFilterQuery.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(convFilterQuery.toLowerCase())
      : true
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "600px", position: "relative" }}>
      {/* CONVERSATION LIST VIEW */}
      {!activeConv ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%", overflowY: "auto" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--border)",
              paddingBottom: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  padding: "8px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Smartphone size={18} color="#fff" />
              </div>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: "700" }}>NEXUS Direct Chat</h3>
                <p style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                  Message anyone by mobile number with instant notification
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={openNewChatModal}
                className="btn-primary"
                style={{
                  padding: "6px 12px",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontWeight: "700",
                }}
              >
                <Plus size={14} /> New Chat
              </button>
              <button
                onClick={fetchConversations}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "6px",
                }}
                title="Refresh Conversations"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Direct Mobile Messaging (Seamless Hidden Verification) */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(6, 78, 59, 0.35), rgba(15, 23, 42, 0.7))",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              borderRadius: "12px",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "14px" }}>📱</span>
                <h4 style={{ fontSize: "12px", fontWeight: "700", color: "#fff" }}>
                  Message by Mobile Number
                </h4>
              </div>
              <span
                style={{
                  fontSize: "9px",
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "#34d399",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontWeight: "700",
                }}
              >
                REAL-TIME NOTIFY
              </span>
            </div>

            {/* Quick Contacts for 1-Tap Messaging */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase" }}>Quick contacts:</span>
              {[
                { label: "Charlie Driver", num: "98765 11111" },
                { label: "Merchant Bob", num: "98765 22222" },
                { label: "Courier Ramesh", num: "98765 33333" },
                { label: "AI Concierge", num: "99999 00000" },
              ].map((pn, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setPhoneToLookup(pn.num);
                    if (directPhoneError) setDirectPhoneError(null);
                  }}
                  style={{
                    background: phoneToLookup === pn.num ? "rgba(16, 185, 129, 0.25)" : "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${phoneToLookup === pn.num ? "#10b981" : "rgba(16, 185, 129, 0.25)"}`,
                    borderRadius: "12px",
                    padding: "2px 8px",
                    fontSize: "9px",
                    color: phoneToLookup === pn.num ? "#34d399" : "#a7f3d0",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {pn.label} ({pn.num.slice(-5)})
                </button>
              ))}
            </div>

            {/* Hidden Verification: Direct Message Form with Mobile Number and Message */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendToPhone();
              }}
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {/* Row 1: Country Code & Mobile Number */}
              <div style={{ display: "flex", gap: "6px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "0 8px",
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                    fontWeight: "700",
                    whiteSpace: "nowrap",
                  }}
                >
                  🇮🇳 +91
                </div>
                <input
                  type="tel"
                  placeholder="Enter mobile number (e.g. 98765 11111)"
                  value={phoneToLookup}
                  onChange={(e) => {
                    setPhoneToLookup(e.target.value);
                    if (directPhoneError) setDirectPhoneError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    fontSize: "12px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border)",
                    color: "#fff",
                    outline: "none",
                  }}
                />
              </div>

              {/* Row 2: Message input and Send button */}
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="text"
                  placeholder="Type a message to send..."
                  value={phoneDirectMessage}
                  onChange={(e) => {
                    setPhoneDirectMessage(e.target.value);
                    if (directPhoneError) setDirectPhoneError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    fontSize: "12px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border)",
                    color: "#fff",
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={!phoneToLookup.trim() || !phoneDirectMessage.trim() || isSendingPhoneDirect}
                  style={{
                    padding: "8px 14px",
                    fontSize: "11px",
                    fontWeight: "700",
                    background: "#10b981",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    cursor: !phoneToLookup.trim() || !phoneDirectMessage.trim() || isSendingPhoneDirect ? "not-allowed" : "pointer",
                    opacity: !phoneToLookup.trim() || !phoneDirectMessage.trim() || isSendingPhoneDirect ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isSendingPhoneDirect ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Send size={12} /> Send
                    </>
                  )}
                </button>
              </div>

              {/* Seamless feedback if number not registered */}
              {directPhoneError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11px",
                    color: "#f87171",
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "6px",
                    padding: "6px 10px",
                  }}
                >
                  <AlertTriangle size={13} />
                  <span>{directPhoneError}</span>
                </div>
              )}
            </form>
          </div>

          {/* Search Existing Conversations */}
          {conversations.length > 0 && (
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search
                size={14}
                color="var(--text-muted)"
                style={{ position: "absolute", left: "10px" }}
              />
              <input
                type="text"
                placeholder="Search conversations..."
                value={convFilterQuery}
                onChange={(e) => setConvFilterQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px 8px 30px",
                  fontSize: "12px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border)",
                  color: "#fff",
                }}
              />
            </div>
          )}

          {/* Conversations List */}
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              <RefreshCw className="animate-spin" size={24} style={{ margin: "0 auto 8px" }} />
              <p style={{ fontSize: "12px" }}>Syncing conversations...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div
              className="glass-card"
              style={{
                textAlign: "center",
                padding: "24px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <h4 style={{ fontSize: "13px", fontWeight: "700" }}>No Active Conversations Yet</h4>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", maxWidth: "280px" }}>
                Use the Direct Message box above to message any mobile number, or tap a contact below.
              </p>

              {/* Quick Contact Chips */}
              <div style={{ width: "100%", borderTop: "1px solid var(--border)", paddingTop: "12px", marginTop: "4px" }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                  Registered Contacts
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {[
                    { id: "nexus-ai-concierge", name: "NEXUS AI Concierge", phone: "+91 99999 00000", desc: "24/7 Super-App Assistant", role: "AI_ASSISTANT" },
                    { id: "driver-charlie", name: "Charlie Driver", phone: "+91 98765 11111", desc: "Prime Sedan (KA-03-EX-9988)", role: "DRIVER" },
                    { id: "seller-bob", name: "Bob Seller (Merchant)", phone: "+91 98765 22222", desc: "Apex Electronics & Fashion", role: "SELLER" },
                    { id: "courier-ramesh", name: "Ramesh Kumar (Courier)", phone: "+91 98765 33333", desc: "Food Delivery Fleet Partner", role: "COURIER" },
                  ].map((qc) => {
                    const avatar = getAvatarInfo(qc);
                    return (
                      <div
                        key={qc.id}
                        onClick={() => startNewConversation(qc.id, undefined, qc.name, "Hello! I have a question.")}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid var(--border)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: avatar.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {avatar.icon}
                          </div>
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontSize: "12px", fontWeight: "700" }}>{qc.name}</div>
                            <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{qc.phone} • {qc.desc}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: "10px", color: "#10b981", fontWeight: "700" }}>Chat ➔</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredConversations.map((c) => {
                const avatar = getAvatarInfo(c);

                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveConv(c)}
                    className="glass-card"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      cursor: "pointer",
                      padding: "12px 14px",
                      transition: "transform 0.15s ease, border-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        background: avatar.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {avatar.icon}
                      <span
                        style={{
                          position: "absolute",
                          bottom: 0,
                          right: 0,
                          width: "11px",
                          height: "11px",
                          borderRadius: "50%",
                          background: "#10b981",
                          border: "2px solid #000",
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h4
                          style={{
                            fontSize: "13px",
                            fontWeight: "700",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {c.name}
                          <span
                            style={{
                              background: avatar.badgeBg,
                              color: avatar.badgeColor,
                              fontSize: "8px",
                              padding: "1px 5px",
                              borderRadius: "4px",
                              fontWeight: "700",
                            }}
                          >
                            {avatar.badge}
                          </span>
                        </h4>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                          {new Date(c.lastMessageTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "var(--text-secondary)",
                          marginTop: "2px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {c.lastMessage}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDeleteConversation(c.id, e)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        padding: "6px",
                        opacity: 0.6,
                      }}
                      title="Delete Conversation"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE CHAT TIMELINE VIEW */
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Header */}
          {(() => {
            const avatar = getAvatarInfo(activeConv);

            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: "10px",
                  borderBottom: "1px solid var(--border)",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={() => {
                      setActiveConv(null);
                      fetchConversations();
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "4px",
                    }}
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div
                    style={{
                      position: "relative",
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: avatar.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {avatar.icon}
                    <span
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: "9px",
                        height: "9px",
                        borderRadius: "50%",
                        background: "#10b981",
                        border: "2px solid #000",
                      }}
                    />
                  </div>

                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                      {activeConv.name}
                      <span
                        style={{
                          background: avatar.badgeBg,
                          color: avatar.badgeColor,
                          fontSize: "8px",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          fontWeight: "700",
                        }}
                      >
                        {avatar.badge}
                      </span>
                    </h4>
                    <p style={{ fontSize: "10px", color: "#10b981", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                      Online • Direct Messaging Active
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    onClick={() => handleDeleteConversation(activeConv.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "6px",
                    }}
                    title="Delete Conversation"
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    onClick={() => fetchMessages(activeConv.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "6px",
                    }}
                    title="Refresh"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Quick Prompts */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              paddingBottom: "8px",
              scrollbarWidth: "none",
            }}
          >
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                  padding: "4px 10px",
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Sparkles size={10} color="#10b981" /> {prompt}
              </button>
            ))}
          </div>

          {/* Messages Thread */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "10px 4px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", margin: "auto", fontSize: "12px" }}>
                <p>👋 Say hello to begin your conversation with <strong>{activeConv.name}</strong>!</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.senderId === user?.id || m.senderName === "User" || m.senderName === user?.name;

                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isMe ? "flex-end" : "flex-start",
                      maxWidth: "80%",
                      alignSelf: isMe ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        background: isMe
                          ? "linear-gradient(135deg, #059669, #047857)"
                          : "rgba(255, 255, 255, 0.07)",
                        border: isMe ? "none" : "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                        padding: "10px 14px",
                        color: "#fff",
                        fontSize: "12px",
                        lineHeight: "1.45",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      }}
                    >
                      {!isMe && (
                        <div style={{ fontSize: "10px", fontWeight: "700", color: "#34d399", marginBottom: "3px" }}>
                          {m.senderName}
                        </div>
                      )}
                      <div>{m.content}</div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "9px",
                        color: "var(--text-muted)",
                        marginTop: "3px",
                        padding: "0 4px",
                      }}
                    >
                      <span>
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isMe && <CheckCheck size={11} color="#34d399" />}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {(isTypingReply || remoteTypingUser) && (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "14px 14px 14px 2px",
                  padding: "8px 12px",
                  fontSize: "11px",
                  color: "#34d399",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span className="animate-pulse">
                  {remoteTypingUser
                    ? `${remoteTypingUser} is typing...`
                    : `${activeConv.name} is typing...`}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              paddingTop: "8px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => handleChatInputChange(e.target.value)}
              placeholder={`Message ${activeConv.name}...`}
              style={{
                flex: 1,
                padding: "10px 14px",
                fontSize: "12px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border)",
                color: "#fff",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <button
              type="submit"
              disabled={!inputMsg.trim() || isSending}
              className="btn-primary"
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#10b981",
                borderColor: "#059669",
                opacity: !inputMsg.trim() || isSending ? 0.5 : 1,
                cursor: !inputMsg.trim() || isSending ? "not-allowed" : "pointer",
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {/* NEW CHAT MODAL */}
      {showNewChatModal && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(10, 10, 15, 0.95)",
            backdropFilter: "blur(8px)",
            borderRadius: "12px",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            padding: "16px",
            gap: "12px",
          }}
        >
          {/* Modal Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Smartphone size={16} color="#10b981" />
              <h3 style={{ fontSize: "14px", fontWeight: "700" }}>Start New Direct Chat</h3>
            </div>
            <button
              onClick={() => setShowNewChatModal(false)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Contacts Bar */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={14} color="var(--text-muted)" style={{ position: "absolute", left: "10px" }} />
            <input
              type="text"
              placeholder="Search contacts by name, email, or mobile..."
              value={contactSearchQuery}
              onChange={(e) => {
                setContactSearchQuery(e.target.value);
                fetchContacts(e.target.value);
              }}
              style={{
                width: "100%",
                padding: "8px 10px 8px 30px",
                fontSize: "12px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--border)",
                color: "#fff",
              }}
            />
          </div>

          {/* Contacts Directory */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Registered NEXUS Contacts ({contacts.length})
            </span>

            {isContactsLoading ? (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                <RefreshCw className="animate-spin" size={18} style={{ margin: "0 auto 6px" }} />
                <span style={{ fontSize: "11px" }}>Loading registered contacts...</span>
              </div>
            ) : contacts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "11px" }}>
                No matching contacts found.
              </div>
            ) : (
              contacts.map((c) => {
                const avatar = getAvatarInfo(c);

                return (
                  <div
                    key={c.id}
                    onClick={() => startNewConversation(c.id, undefined, c.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#10b981")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "50%",
                          background: avatar.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {avatar.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                          {c.name}
                          <span
                            style={{
                              background: avatar.badgeBg,
                              color: avatar.badgeColor,
                              fontSize: "8px",
                              padding: "1px 4px",
                              borderRadius: "3px",
                              fontWeight: "700",
                            }}
                          >
                            {avatar.badge}
                          </span>
                        </div>
                        <div style={{ fontSize: "10px", color: "#10b981" }}>
                          {c.phone || c.email} • {c.tagline}
                        </div>
                      </div>
                    </div>

                    <button
                      style={{
                        padding: "4px 8px",
                        fontSize: "10px",
                        fontWeight: "600",
                        background: "rgba(16, 185, 129, 0.15)",
                        border: "1px solid #10b981",
                        borderRadius: "6px",
                        color: "#10b981",
                        cursor: "pointer",
                      }}
                    >
                      Message ➔
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
