import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, SendHorizontal, Plus, Trash2, MessageSquare } from "lucide-react";
import { fetchJSON, isDemoMode } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

type SessionMeta = {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  messageCount?: number;
};

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  content:
    "Namaste! मैं NutriNani हूँ 😊\n\nAsk me anything about food, calories, labels, simple meal ideas — in English, Hindi, or Hinglish.",
  createdAt: Date.now(),
};

function uuid() {
  return crypto.randomUUID();
}

const QUICK_PROMPTS = [
  "Suggest a healthy Indian breakfast under 400 calories",
  "I am vegetarian. Make a simple high-protein dinner idea",
  "Explain how to read a nutrition label like I’m 10",
  "Mujhe weight loss ke liye simple diet plan chahiye (Hinglish)",
];

export function ChatBot() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => uuid());
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canPersist = !isDemoMode;

  const refreshSessions = useCallback(async () => {
    if (!canPersist) return;
    setLoadingSessions(true);
    try {
      const list = await fetchJSON<SessionMeta[]>("/chat/sessions?limit=20");
      setSessions(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("sessions fetch", err);
    } finally {
      setLoadingSessions(false);
    }
  }, [canPersist]);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isSending]);

  async function persistSession(newMessages: ChatMessage[], sid: string) {
    if (!canPersist) return;
    // Don't save an empty/greeting-only session
    const hasRealContent = newMessages.some((m) => m.role === "user");
    if (!hasRealContent) return;
    try {
      await fetchJSON(`/chat/sessions/${encodeURIComponent(sid)}`, {
        method: "PUT",
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          })),
        }),
      });
      refreshSessions();
    } catch (err) {
      console.error("autosave failed", err);
    }
  }

  function startNewChat() {
    setSessionId(uuid());
    setMessages([{ ...GREETING, id: uuid(), createdAt: Date.now() }]);
    setInput("");
  }

  async function loadSession(id: string) {
    if (id === sessionId) return;
    try {
      const data = await fetchJSON<{
        id: string;
        title: string;
        messages: ChatMessage[];
      }>(`/chat/sessions/${encodeURIComponent(id)}`);
      const loaded =
        Array.isArray(data.messages) && data.messages.length
          ? data.messages
          : [GREETING];
      setMessages(loaded);
      setSessionId(id);
      setInput("");
    } catch (err: any) {
      toast({
        title: "Couldn’t load session",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    }
  }

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await fetchJSON(`/chat/sessions/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (id === sessionId) startNewChat();
      refreshSessions();
    } catch (err: any) {
      toast({
        title: "Couldn’t delete",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = {
      id: uuid(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    const afterUser = [...messages, userMsg];
    setMessages(afterUser);
    setInput("");
    setIsSending(true);

    try {
      if (isDemoMode) {
        const reply =
          "(Demo mode)\n\nI can chat once your API is connected. For now, try setting VITE_API_BASE_URL and deploying the backend.";
        setMessages((prev) => [
          ...prev,
          { id: uuid(), role: "assistant", content: reply, createdAt: Date.now() },
        ]);
        return;
      }

      const history = afterUser
        .slice(-16)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetchJSON<{ reply: string }>("/chat", {
        method: "POST",
        body: JSON.stringify({ message: trimmed, history, sessionId }),
      });

      const assistantMsg: ChatMessage = {
        id: uuid(),
        role: "assistant",
        content: res.reply || "Sorry, I didn’t get that. Try again?",
        createdAt: Date.now(),
      };
      const afterAssistant = [...afterUser, assistantMsg];
      setMessages(afterAssistant);
      persistSession(afterAssistant, sessionId);
    } catch (err: any) {
      console.error("Chat send error", err);
      toast({
        title: "Chat error",
        description: err?.message || "Could not reach the chatbot API.",
        variant: "destructive",
      });
      const failMsg: ChatMessage = {
        id: uuid(),
        role: "assistant",
        content:
          "I’m having trouble connecting right now. Please try again in a moment.",
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, failMsg]);
    } finally {
      setIsSending(false);
    }
  }

  const recentSessions = useMemo(() => sessions.slice(0, 5), [sessions]);

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Nani Chat</h2>
          <p className="text-muted-foreground">
            Multilingual nutrition assistant (English / Hindi / Hinglish)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isDemoMode ? "secondary" : "outline"}>
            {isDemoMode ? "Demo" : "Live"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        {/* History sidebar */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={startNewChat}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </CardHeader>
          <CardContent className="p-2">
            {!canPersist && (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                History disabled in demo mode.
              </p>
            )}
            {canPersist && loadingSessions && recentSessions.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                Loading…
              </p>
            )}
            {canPersist && !loadingSessions && recentSessions.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No saved chats yet. Start a conversation — it’ll appear here.
              </p>
            )}
            <div className="flex flex-col gap-1">
              {recentSessions.map((s) => {
                const isActive = s.id === sessionId;
                return (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    className={`group text-left rounded-lg px-3 py-2 text-sm transition-colors flex items-start gap-2 ${
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{s.title}</span>
                    <span
                      role="button"
                      onClick={(e) => deleteSession(s.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      aria-label="Delete session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Chat area */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Chat</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((p) => (
                <Button
                  key={p}
                  variant="outline"
                  size="sm"
                  disabled={isSending}
                  onClick={() => sendMessage(p)}
                >
                  {p}
                </Button>
              ))}
            </div>

            <ScrollArea className="h-[52vh] rounded-lg border bg-background">
              <div className="p-4 space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.role === "user" ? "flex justify-end" : "flex justify-start"
                    }
                  >
                    <div
                      className={
                        m.role === "user"
                          ? "max-w-[85%] rounded-2xl px-4 py-3 bg-primary text-primary-foreground shadow"
                          : "max-w-[85%] rounded-2xl px-4 py-3 bg-muted text-foreground"
                      }
                    >
                      {m.role === "user" ? (
                        <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span>
                      ) : (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="leading-snug">{children}</li>,
                            h1: ({ children }) => <h1 className="text-lg font-bold mb-1">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-bold mb-1">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                            code: ({ children }) => <code className="bg-black/10 rounded px-1 text-sm font-mono">{children}</code>,
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-muted text-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking…</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <div className="grid gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message… (Enter to send, Shift+Enter for new line)"
                className="min-h-[90px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage(input);
                  }
                }}
                disabled={isSending}
              />
              <div className="flex justify-end">
                <Button
                  disabled={isSending || !input.trim()}
                  onClick={() => sendMessage(input)}
                >
                  <SendHorizontal className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              NutriNani gives general nutrition guidance, not medical advice.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
