import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Bot,
  User,
  Car,
  ShoppingBag,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCheck,
} from "lucide-react";
import { authFetch } from "./services/apiClient";

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  otherMembers: Array<{ id: string; name: string; email: string }>;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchConversations();
  }, [backendUrl]);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.id);
      const timer = setInterval(() => {
        fetchMessages(activeConv.id, true);
      }, 2500);
      return () => clearInterval(timer);
    }
  }, [activeConv, backendUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMsg;
    if (!activeConv || !text.trim() || isSending) return;

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
        // Poll for immediate reply
        setTimeout(() => {
          fetchMessages(activeConv.id, true);
        }, 1200);
      }
    } catch (err) {
      console.warn("Send failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  const quickPrompts = activeConv?.name?.includes("AI")
    ? [
        "What services are available in NEXUS?",
        "How do I transfer funds in the wallet?",
        "Where is my active food order?",
      ]
    : activeConv?.name?.includes("Driver")
    ? [
        "I am waiting near the main gate.",
        "Please turn on the AC.",
        "What is your ETA?",
      ]
    : [
        "Is this item in stock?",
        "When will my package dispatch?",
        "Do you provide a warranty?",
      ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "580px" }}>
      {/* CONVERSATION LIST VIEW */}
      {!activeConv ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                  background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                  padding: "8px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MessageSquare size={18} color="#fff" />
              </div>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: "700" }}>NEXUS Real-Time Chat</h3>
                <p style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                  Encrypted direct messaging with AI, drivers & sellers
                </p>
              </div>
            </div>
            <button
              onClick={fetchConversations}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              <RefreshCw className="animate-spin" size={24} style={{ margin: "0 auto 8px" }} />
              <p style={{ fontSize: "12px" }}>Syncing conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="glass-card" style={{ textAlign: "center", padding: "36px" }}>
              <MessageSquare size={36} color="var(--text-muted)" style={{ margin: "0 auto 8px" }} />
              <h4 style={{ fontSize: "14px" }}>No active chats</h4>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                Conversations with the AI Concierge, drivers, and sellers will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {conversations.map((c) => {
                const isAI = c.name.includes("AI");
                const isDriver = c.name.includes("Driver");
                const isSeller = c.name.includes("Seller");

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
                        background: isAI
                          ? "linear-gradient(135deg, #a855f7, #6366f1)"
                          : isDriver
                          ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                          : "linear-gradient(135deg, #10b981, #059669)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {isAI ? (
                        <Bot size={20} color="#fff" />
                      ) : isDriver ? (
                        <Car size={20} color="#fff" />
                      ) : (
                        <ShoppingBag size={20} color="#fff" />
                      )}
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
                            gap: "4px",
                          }}
                        >
                          {c.name}
                          {isAI && (
                            <span
                              style={{
                                background: "rgba(168, 85, 247, 0.2)",
                                color: "#c084fc",
                                fontSize: "9px",
                                padding: "1px 5px",
                                borderRadius: "4px",
                              }}
                            >
                              AI AGENT
                            </span>
                          )}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: "10px",
              borderBottom: "1px solid var(--border)",
              marginBottom: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={() => {
                  setActiveConv(null);
                  fetchConversations();
                }}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  padding: "6px",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: "700" }}>{activeConv.name}</h4>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#10b981" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                  Online & Connected
                </div>
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              paddingRight: "4px",
              marginBottom: "8px",
            }}
          >
            {messages.map((m) => {
              const isMe = m.senderId === user?.id || m.senderId === "my-id";
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isMe ? "flex-end" : "flex-start",
                  }}
                >
                  {!isMe && (
                    <span style={{ fontSize: "9px", color: "var(--text-muted)", marginLeft: "4px", marginBottom: "2px" }}>
                      {m.senderName}
                    </span>
                  )}
                  <div
                    style={{
                      maxWidth: "78%",
                      padding: "8px 12px",
                      borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                      background: isMe
                        ? "linear-gradient(135deg, var(--primary), var(--primary-hover))"
                        : "rgba(255,255,255,0.08)",
                      color: "#fff",
                      fontSize: "12px",
                      lineHeight: "1.4",
                      boxShadow: isMe ? "0 4px 12px rgba(139, 92, 246, 0.25)" : "none",
                    }}
                  >
                    {m.content}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "3px",
                        fontSize: "9px",
                        color: "rgba(255,255,255,0.6)",
                        marginTop: "4px",
                      }}
                    >
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {isMe && <CheckCheck size={11} color="#67e8f9" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "6px", marginBottom: "4px" }}>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(p)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  color: "var(--text-secondary)",
                  padding: "4px 8px",
                  fontSize: "10px",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{ display: "flex", gap: "6px", alignItems: "center" }}
          >
            <input
              type="text"
              className="text-input"
              placeholder={`Message ${activeConv.name}...`}
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              style={{ flex: 1, padding: "10px 12px", fontSize: "12px" }}
            />
            <button
              type="submit"
              disabled={!inputMsg.trim() || isSending}
              className="btn-primary"
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
