"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import ReactMarkdown from "react-markdown";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Crown, Heart, Flame } from "lucide-react";
import MonkCharacter, { MonkMood } from "@/components/monk/MonkCharacter";
import ChatInput from "@/components/ChatInput";
import DailyWisdom from "@/components/DailyWisdom";
import NavBar from "@/components/NavBar";
import AuthGate from "@/components/auth/AuthGate";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type ChatMode = "text" | "voice";
type CharacterId = "buddha" | "avalokiteshvara" | "bodhidharma";

interface BuddhistCharacter {
  id: CharacterId;
  name: string;
  description: string;
  prompt: string;
  voice: {
    rate: number;
    pitch: number;
    preferredNameIncludes: string[];
  };
}

interface ServerChatSession {
  _id: string;
  character: CharacterId | null;
  messages: { role: string; content: string; timestamp?: string }[];
  createdAt?: string;
  updatedAt?: string;
}

const GREETING =
  "Welcome. I'm Bodhi, your companion on the path. Ask me anything about Buddhist teachings, meditation, or finding peace in daily life. 🪷";

const CHARACTERS: BuddhistCharacter[] = [
  {
    id: "buddha",
    name: "Siddhartha Gautama",
    description: "The Awakened One — calm, clear, direct",
    prompt:
      "You are Siddhartha Gautama, the historical Buddha. You speak from direct experience of awakening. You are gentle but clear. You prefer simple truths over elaborate philosophy. You often use metaphors from nature — water, fire, seeds, paths. You do not lecture. You converse like a kind friend who sees clearly.",
    voice: {
      rate: 0.88,
      pitch: 0.92,
      preferredNameIncludes: ["daniel", "david", "male", "en-us"],
    },
  },
  {
    id: "avalokiteshvara",
    name: "Avalokiteshvara",
    description: "The One Who Hears the Cries of the World",
    prompt:
      "You are Avalokiteshvara, the Bodhisattva of Compassion, also known as Guanyin. You embody infinite compassion. You always acknowledge what someone is feeling before offering guidance. You speak gently and never rush. You remind people they are not alone. You draw on Mahayana teachings about compassion, interconnection, and the bodhisattva path. You sometimes offer loving-kindness phrases or metta practices.",
    voice: {
      rate: 0.95,
      pitch: 1.08,
      preferredNameIncludes: ["zira", "aria", "female", "en-us"],
    },
  },
  {
    id: "bodhidharma",
    name: "Bodhidharma",
    description: "The Wall-Gazer — fierce, direct, no nonsense",
    prompt:
      "You are Bodhidharma, the founder of Zen Buddhism. You are direct and sometimes fierce. You dislike excessive philosophizing and prefer to point directly at the nature of mind. You use koans, paradoxes, and sharp questions. You challenge assumptions. You keep answers short — often just 1-3 sentences. If someone is overthinking, you tell them. You value practice over theory, sitting over reading.",
    voice: {
      rate: 1.03,
      pitch: 0.85,
      preferredNameIncludes: ["mark", "guy", "male", "en-us"],
    },
  },
];

function CharacterIcon({ id, size = 42 }: { id: CharacterId; size?: number }) {
  const iconSize = Math.round(size * 0.55);
  const wrapper = {
    width: size,
    height: size,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    backgroundColor: "rgba(200,169,110,0.12)",
  } as const;
  if (id === "buddha") {
    return (
      <div style={wrapper}>
        <Crown size={iconSize} color="#D4A545" strokeWidth={1.5} />
      </div>
    );
  }
  if (id === "avalokiteshvara") {
    return (
      <div style={wrapper}>
        <Heart size={iconSize} color="#7BA886" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <div style={wrapper}>
      <Flame size={iconSize} color="#6E6A62" strokeWidth={1.5} />
    </div>
  );
}

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

function getMood(
  isLoading: boolean,
  isStreaming: boolean,
  hasMessages: boolean,
  isNewSession: boolean
): MonkMood {
  if (isNewSession) return "greeting";
  if (isLoading && !isStreaming) return "thinking";
  if (isStreaming) return "speaking";
  if (!hasMessages) return "curious";
  return "happy";
}

function previewFromMessages(messages: ServerChatSession["messages"]) {
  const firstUser = messages.find((m) => m.role === "user");
  if (firstUser?.content) {
    return firstUser.content.length > 80
      ? `${firstUser.content.slice(0, 80)}…`
      : firstUser.content;
  }
  return "New conversation";
}

function ChatSuspenseFallback() {
  return (
    <div
      className="relative z-10 max-w-[680px] mx-auto px-4 sm:px-6 min-h-screen flex flex-col"
      style={{ paddingTop: 24, paddingBottom: 24 }}
    >
      <NavBar />
      <div
        className="flex-1 flex flex-col items-center justify-center gap-2"
        style={{ color: "#8F8A81" }}
      >
        <p className="animate-pulse">Loading chat…</p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <AuthGate message="Sign in with Google to start a conversation and have your chat history saved.">
      <Suspense fallback={<ChatSuspenseFallback />}>
        <ChatPageInner />
      </Suspense>
    </AuthGate>
  );
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const { status: authStatus } = useSession();

  // serverSessionIdRef tracks the MongoDB _id for the active chat so subsequent
  // turns keep updating the same ChatSession document.
  const serverSessionIdRef = useRef<string | null>(null);

  const [sessions, setSessions] = useState<ServerChatSession[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("text");
  const [history, setHistory] = useState<Message[]>([]);
  const [currentResponse, setCurrentResponse] = useState<string>(GREETING);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isNewSession, setIsNewSession] = useState(true);
  const [selectedCharacterId, setSelectedCharacterId] =
    useState<CharacterId>("buddha");
  const [voiceHistory, setVoiceHistory] = useState<Message[]>([]);
  const [voiceUserTranscript, setVoiceUserTranscript] = useState("");
  const [voiceAssistantTranscript, setVoiceAssistantTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [isVoiceStreaming, setIsVoiceStreaming] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechSupported, setSpeechSupported] = useState(true);
  const historyRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const timeoutId = setTimeout(() => setIsNewSession(false), 2000);
    return () => clearTimeout(timeoutId);
  }, []);

  // Auto-dismiss speech errors after 5 seconds
  useEffect(() => {
    if (!speechError) return;
    const timeoutId = setTimeout(() => setSpeechError(null), 5000);
    return () => clearTimeout(timeoutId);
  }, [speechError]);

  const scrollHistoryToBottom = useCallback(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollHistoryToBottom();
  }, [history, currentResponse, isLoading, isStreaming, scrollHistoryToBottom]);

  const mood = getMood(
    isLoading,
    isStreaming,
    history.length > 0,
    isNewSession
  );
  const selectedCharacter =
    CHARACTERS.find((character) => character.id === selectedCharacterId) ??
    CHARACTERS[0];

  const refreshSessions = useCallback(async () => {
    if (authStatus !== "authenticated") return;
    try {
      const res = await fetch("/api/chat/history", { cache: "no-store" });
      if (!res.ok) return;
      const data: { sessions: ServerChatSession[] } = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      // Silent fail — chat still works, just the drawer may be stale.
    } finally {
      setIsHistoryLoading(false);
    }
  }, [authStatus]);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    const loadVoices = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };
    loadVoices();
    synth.onvoiceschanged = loadVoices;
    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
      recognitionRef.current?.stop();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const cleanupRecordingSession = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    audioChunksRef.current = [];
  }, []);

  const pickVoiceForCharacter = useCallback(
    (character: BuddhistCharacter) => {
      const loweredIncludes = character.voice.preferredNameIncludes.map(
        (item) => item.toLowerCase()
      );
      return availableVoices.find((voice) => {
        const signature = `${voice.name} ${voice.lang}`.toLowerCase();
        return loweredIncludes.some((hint) => signature.includes(hint));
      });
    },
    [availableVoices]
  );

  const stopSpeechPlayback = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setIsAISpeaking(false);
  }, []);

  const speakAssistantResponse = useCallback(
    (text: string, character: BuddhistCharacter) => {
      if (typeof window === "undefined" || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const matchingVoice = pickVoiceForCharacter(character);
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
      utterance.rate = character.voice.rate;
      utterance.pitch = character.voice.pitch;
      utterance.onstart = () => setIsAISpeaking(true);
      utterance.onend = () => setIsAISpeaking(false);
      utterance.onerror = () => setIsAISpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [pickVoiceForCharacter]
  );

  // Shared streaming helper: POSTs to /api/chat, consumes the stream, and
  // captures the returned X-Session-Id so follow-up turns update the same
  // ChatSession record in Mongo.
  //
  // Includes a 25-second timeout on the initial fetch and one automatic
  // retry so transient network blips or cold-start delays don't surface
  // as permanent failures.
  const streamChatResponse = useCallback(
    async (
      payloadMessages: Message[],
      options: {
        systemPrompt?: string;
        character?: CharacterId | null;
        onStreamStart?: () => void;
        onDelta?: (assistantSoFar: string) => void;
      }
    ): Promise<string> => {
      const MAX_ATTEMPTS = 2;
      const FETCH_TIMEOUT_MS = 25_000;
      const RETRY_DELAY_MS = 1_500;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const abortController = new AbortController();
        const timeoutId = setTimeout(
          () => abortController.abort(),
          FETCH_TIMEOUT_MS
        );

        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: payloadMessages,
              systemPrompt: options.systemPrompt,
              sessionId: serverSessionIdRef.current ?? undefined,
              character: options.character ?? null,
            }),
            signal: abortController.signal,
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
            if (attempt < MAX_ATTEMPTS) {
              await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
              options.onDelta?.("");
              continue;
            }
            throw new Error("API error");
          }

          const sessionIdHeader = res.headers.get("x-session-id");
          if (sessionIdHeader) {
            serverSessionIdRef.current = sessionIdHeader;
          }

          const reader = res.body?.getReader();
          if (!reader) throw new Error("No reader");

          const decoder = new TextDecoder();
          let buffer = "";
          let preambleParsed = false;
          let assistantContent = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            if (!preambleParsed) {
              const sep = buffer.indexOf("---STREAM---\n");
              if (sep !== -1) {
                buffer = buffer.slice(sep + "---STREAM---\n".length);
                preambleParsed = true;
                options.onStreamStart?.();
              } else {
                continue;
              }
            }

            assistantContent += buffer;
            buffer = "";
            options.onDelta?.(assistantContent);
          }

          return assistantContent;
        } catch (error) {
          clearTimeout(timeoutId);

          // On last attempt, throw so the caller shows the fallback message.
          if (attempt >= MAX_ATTEMPTS) throw error;

          // Otherwise wait briefly and retry.
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          options.onDelta?.("");
        }
      }

      // Should never reach here, but satisfies TypeScript.
      throw new Error("All retry attempts failed");
    },
    []
  );

  const handleSend = async (content: string) => {
    const newHistory: Message[] = [...history, { role: "user", content }];
    setHistory(newHistory);
    setCurrentResponse("");
    setIsLoading(true);
    setIsStreaming(false);

    try {
      const assistantContent = await streamChatResponse(newHistory, {
        character: null,
        onStreamStart: () => setIsStreaming(true),
        onDelta: (soFar) => setCurrentResponse(soFar),
      });

      const finalized: Message[] = [
        ...newHistory,
        { role: "assistant", content: assistantContent },
      ];
      setHistory(finalized);
      setCurrentResponse("");
      void refreshSessions();
    } catch {
      const fallback =
        "I'm sorry, I wasn't able to respond just now. Please try again.";
      setCurrentResponse(fallback);
      setHistory([
        ...newHistory,
        { role: "assistant", content: fallback },
      ]);
      // Don't refresh on error — the server didn't persist a finished session.
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const runVoiceTurn = useCallback(
    async (transcript: string) => {
      const cleanTranscript = transcript.trim();
      if (!cleanTranscript) return;

      const newVoiceHistory: Message[] = [
        ...voiceHistory,
        { role: "user", content: cleanTranscript },
      ];
      setVoiceHistory(newVoiceHistory);
      setVoiceUserTranscript(cleanTranscript);
      setVoiceAssistantTranscript("");
      setSpeechError(null);
      setIsVoiceLoading(true);
      setIsVoiceStreaming(false);

      try {
        const assistantContent = await streamChatResponse(newVoiceHistory, {
          systemPrompt: selectedCharacter.prompt,
          character: selectedCharacter.id,
          onStreamStart: () => setIsVoiceStreaming(true),
          onDelta: (soFar) => setVoiceAssistantTranscript(soFar),
        });

        if (assistantContent.trim().length > 0) {
          setVoiceHistory([
            ...newVoiceHistory,
            { role: "assistant", content: assistantContent },
          ]);
          speakAssistantResponse(assistantContent, selectedCharacter);
          void refreshSessions();
        }
      } catch {
        const fallback = "I couldn't hear clearly. Please try again.";
        setSpeechError(fallback);
        setVoiceAssistantTranscript(fallback);
        setVoiceHistory([
          ...newVoiceHistory,
          { role: "assistant", content: fallback },
        ]);
      } finally {
        setIsVoiceLoading(false);
        setIsVoiceStreaming(false);
      }
    },
    [refreshSessions, selectedCharacter, speakAssistantResponse, streamChatResponse, voiceHistory]
  );

  // Whisper fallback: send recorded audio to /api/transcribe when the
  // browser's SpeechRecognition fails (network error, unsupported, etc.)
  const transcribeWithWhisper = useCallback(
    async (chunks: Blob[]): Promise<string | null> => {
      if (chunks.length === 0) return null;
      try {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        // Skip if the recording is too short (< 1 KB likely means silence)
        if (audioBlob.size < 1024) return null;

        const form = new FormData();
        form.append("audio", audioBlob, "audio.webm");

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });
        if (!res.ok) return null;

        const data: { text?: string } = await res.json();
        return data.text?.trim() || null;
      } catch (err) {
        console.error("[VoiceChat] Whisper fallback failed:", err);
        return null;
      }
    },
    []
  );

  const startVoiceCapture = useCallback(async () => {
    if (typeof window === "undefined") return;
    stopSpeechPlayback();
    setSpeechError(null);

    const speechWindow = window as SpeechRecognitionWindow;
    const RecognitionClass =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    // If the browser doesn't support SpeechRecognition at all, go
    // straight to the MediaRecorder → Whisper path.
    const useBrowserRecognition = Boolean(RecognitionClass);

    if (!navigator.mediaDevices?.getUserMedia) {
      setSpeechError("Microphone capture is not available in this browser.");
      return;
    }

    try {
      setSpeechSupported(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      // Always start MediaRecorder so we have audio to fall back on.
      if (typeof MediaRecorder !== "undefined") {
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (event: BlobEvent) => {
          if (!event.data || event.data.size === 0) return;
          audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current = recorder;
        recorder.start(250);
      }

      // ── No browser SpeechRecognition → Whisper-only mode ──
      if (!useBrowserRecognition) {
        setIsListening(true);
        console.log("[VoiceChat] No SpeechRecognition — using Whisper-only mode");

        // Record for up to 10 seconds, then transcribe
        await new Promise((r) => setTimeout(r, 5000));
        setIsListening(false);

        // Stop recorder and collect chunks
        const recorder = mediaRecorderRef.current;
        const chunks = await new Promise<Blob[]>((resolve) => {
          if (!recorder || recorder.state === "inactive") {
            resolve([...audioChunksRef.current]);
            return;
          }
          recorder.onstop = () => resolve([...audioChunksRef.current]);
          recorder.stop();
        });
        cleanupRecordingSession();

        const transcript = await transcribeWithWhisper(chunks);
        if (transcript) {
          void runVoiceTurn(transcript);
        } else {
          setSpeechError("Could not transcribe your speech. Please try again or use text chat.");
        }
        return;
      }

      // ── Browser SpeechRecognition path (with Whisper fallback) ──
      const recognition = new RecognitionClass!();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let hasReceivedResult = false;
      let finalTranscript = "";
      let usedWhisperFallback = false;

      recognition.onstart = () => {
        setIsListening(true);
        hasReceivedResult = false;
        finalTranscript = "";
        console.log("[VoiceChat] Speech recognition started");
      };

      recognition.onresult = (event) => {
        hasReceivedResult = true;
        let interim = "";
        let final = "";

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result?.[0]?.transcript ?? "";
          const isFinal = (result as unknown as { isFinal?: boolean }).isFinal;
          if (isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        finalTranscript = final || interim;
        console.log("[VoiceChat] Transcript:", finalTranscript, "(final:", !!final, ")");
      };

      recognition.onerror = (event) => {
        const errorType = event.error;
        console.error("[VoiceChat] Speech recognition error:", errorType, "hasResult:", hasReceivedResult);

        // If we already got a usable transcript, ignore the error.
        if (hasReceivedResult && finalTranscript.trim()) {
          console.log("[VoiceChat] Ignoring error since we have a transcript");
          return;
        }

        // For network / service errors → try Whisper fallback with the
        // audio we recorded via MediaRecorder.
        if (errorType === "network" || errorType === "service-not-allowed") {
          console.log("[VoiceChat] Attempting Whisper fallback…");
          usedWhisperFallback = true;

          // Stop recorder and gather audio chunks
          const recorder = mediaRecorderRef.current;
          const gatherChunks = new Promise<Blob[]>((resolve) => {
            if (!recorder || recorder.state === "inactive") {
              resolve([...audioChunksRef.current]);
              return;
            }
            recorder.onstop = () => resolve([...audioChunksRef.current]);
            recorder.stop();
          });

          setIsListening(false);
          setSpeechError(null);

          void gatherChunks.then(async (chunks) => {
            const transcript = await transcribeWithWhisper(chunks);
            cleanupRecordingSession();
            if (transcript) {
              void runVoiceTurn(transcript);
            } else {
              setSpeechError("Could not transcribe your speech. Please try again.");
            }
          });
          return;
        }

        // Other errors — show a user-friendly message.
        let message = "I couldn't capture your voice. Please try again.";
        if (errorType === "no-speech") {
          message = "No speech was detected. Please speak louder or check your microphone.";
        } else if (errorType === "audio-capture") {
          message = "Microphone not available. Please check your microphone connection.";
        } else if (errorType === "not-allowed") {
          message = "Microphone access was denied. Please allow microphone permissions in your browser.";
        } else if (errorType === "aborted") {
          message = "Speech recognition was cancelled.";
        }

        setSpeechError(message);
        setIsListening(false);
        cleanupRecordingSession();
      };

      recognition.onend = () => {
        console.log("[VoiceChat] Speech recognition ended. hasResult:", hasReceivedResult, "transcript:", finalTranscript);
        setIsListening(false);

        // If Whisper fallback already took over, don't double-process.
        if (usedWhisperFallback) return;

        cleanupRecordingSession();

        if (hasReceivedResult && finalTranscript.trim()) {
          void runVoiceTurn(finalTranscript.trim());
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      let message = "Voice capture failed. Please try again.";
      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          message =
            "Microphone access was denied. Please allow microphone permissions and try again.";
        } else if (error.name === "NotFoundError") {
          message = "No microphone was detected. Connect a microphone and try again.";
        }
      }
      setSpeechError(message);
      setIsListening(false);
      cleanupRecordingSession();
    }
  }, [cleanupRecordingSession, runVoiceTurn, stopSpeechPlayback, transcribeWithWhisper]);

  const startNewChat = useCallback(() => {
    serverSessionIdRef.current = null;
    setChatMode("text");
    setHistory([]);
    setCurrentResponse(GREETING);
    setIsLoading(false);
    setIsStreaming(false);
    setVoiceHistory([]);
    setVoiceUserTranscript("");
    setVoiceAssistantTranscript("");
    setIsVoiceLoading(false);
    setIsVoiceStreaming(false);
    setSpeechError(null);
    stopSpeechPlayback();
    setIsHistoryOpen(false);
  }, [stopSpeechPlayback]);

  const loadConversation = useCallback(
    (serverSession: ServerChatSession) => {
      serverSessionIdRef.current = serverSession._id;
      const normalized: Message[] = serverSession.messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));
      const isVoice = Boolean(serverSession.character);
      setChatMode(isVoice ? "voice" : "text");
      setSelectedCharacterId(serverSession.character ?? "buddha");
      setHistory(isVoice ? [] : normalized);
      setVoiceHistory(isVoice ? normalized : []);
      setVoiceUserTranscript("");
      const lastAssistant = [...normalized]
        .reverse()
        .find((message) => message.role === "assistant");
      setVoiceAssistantTranscript(lastAssistant?.content ?? "");
      setCurrentResponse(GREETING);
      setIsHistoryOpen(false);
      setIsLoading(false);
      setIsStreaming(false);
      setIsVoiceLoading(false);
      setIsVoiceStreaming(false);
      setSpeechError(null);
      stopSpeechPlayback();
    },
    [stopSpeechPlayback]
  );

  const hasUserMessages = history.some((message) => message.role === "user");
  const isConversationState = hasUserMessages;
  const prefillQuestion = searchParams.get("question") ?? "";

  const displayedMessages: Array<
    Message & { key: string; isStreaming?: boolean; isThinking?: boolean }
  > = [
    { role: "assistant", content: GREETING, key: "greeting" },
    ...history.map((message, index) => ({
      ...message,
      key: `history-${index}`,
    })),
  ];

  if (isConversationState && isLoading && !isStreaming) {
    displayedMessages.push({
      role: "assistant",
      content: "",
      key: "assistant-thinking",
      isThinking: true,
    });
  }

  if (isConversationState && isStreaming) {
    displayedMessages.push({
      role: "assistant",
      content: currentResponse,
      key: "assistant-streaming",
      isStreaming: true,
    });
  }

  return (
    <div
      className="relative z-10 max-w-[680px] mx-auto px-4 sm:px-6 min-h-screen flex flex-col"
      style={{ paddingTop: 24, paddingBottom: 24 }}
    >
      <NavBar
        rightSlot={
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="px-3 py-1.5 rounded-full text-[0.78rem]"
            style={{
              backgroundColor: "#242424",
              border: "1px solid #3A3A3A",
              color: "#D4CFC7",
            }}
          >
            Chat History
          </button>
        }
      />

      {isHistoryOpen && (
        <>
          <button
            type="button"
            aria-label="Close history drawer"
            className="fixed inset-0 z-20"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}
            onClick={() => setIsHistoryOpen(false)}
          />
          <aside
            className="fixed top-0 right-0 z-30 h-full w-[min(90vw,360px)] p-4"
            style={{
              backgroundColor: "#1F1F1F",
              borderLeft: "1px solid #303030",
              boxShadow: "-8px 0 26px rgba(0,0,0,0.35)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                style={{
                  color: "#F0EDE6",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                }}
              >
                Chat History
              </h2>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="px-2 py-1 rounded-md"
                style={{ color: "#A8A49C", border: "1px solid #3A3A3A" }}
              >
                Close
              </button>
            </div>
            <button
              type="button"
              onClick={startNewChat}
              className="w-full rounded-[12px] py-2.5 mb-4"
              style={{
                backgroundColor: "#C8A96E",
                color: "#1A1A1A",
                fontWeight: 600,
              }}
            >
              New Chat
            </button>
            <div className="space-y-2 max-h-[calc(100vh-170px)] overflow-y-auto pr-1">
              {isHistoryLoading ? (
                <p
                  className="animate-pulse"
                  style={{ color: "#8F8A81", fontSize: "0.82rem" }}
                >
                  Loading your conversations…
                </p>
              ) : sessions.length === 0 ? (
                <p
                  style={{
                    color: "#8F8A81",
                    fontSize: "0.82rem",
                    lineHeight: 1.55,
                  }}
                >
                  No saved conversations yet. Send a message to start one — it
                  will appear here next time.
                </p>
              ) : (
                sessions.map((session) => {
                  const isActive =
                    session._id === serverSessionIdRef.current;
                  const stamp = new Date(
                    session.updatedAt ?? session.createdAt ?? Date.now()
                  );
                  return (
                    <button
                      key={session._id}
                      type="button"
                      onClick={() => loadConversation(session)}
                      className="w-full text-left rounded-[12px] px-3 py-2.5 transition-colors"
                      style={{
                        backgroundColor: isActive ? "#2A2A2A" : "#242424",
                        border: `1px solid ${isActive ? "#C8A96E" : "#313131"}`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          style={{
                            color: "#F0EDE6",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                          }}
                        >
                          {session.character ? "Voice chat" : "Text chat"}
                        </span>
                        <span
                          style={{ color: "#8F8A81", fontSize: "0.7rem" }}
                        >
                          {stamp.toLocaleDateString()}
                        </span>
                      </div>
                      <p
                        style={{
                          color: "#C9C3B9",
                          fontSize: "0.75rem",
                          lineHeight: 1.45,
                        }}
                      >
                        {previewFromMessages(session.messages)}
                      </p>
                      {session.character && (
                        <p
                          style={{
                            color: "#A8A49C",
                            fontSize: "0.68rem",
                            marginTop: 4,
                          }}
                        >
                          Character: {session.character}
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        </>
      )}

      <div ref={historyRef} className="flex-1 overflow-y-auto pr-1">
        <DailyWisdom />
        <div
          className="inline-flex p-1 rounded-full mb-5"
          style={{ backgroundColor: "#222222", border: "1px solid #2F2F2F" }}
        >
          {(["text", "voice"] as const).map((mode) => {
            const isActive = chatMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setChatMode(mode)}
                className="px-4 py-1.5 rounded-full text-[0.82rem] transition-colors"
                style={{
                  backgroundColor: isActive ? "#C8A96E" : "transparent",
                  color: isActive ? "#1A1A1A" : "#A8A49C",
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {mode === "text" ? "Text" : "Voice"}
              </button>
            );
          })}
        </div>

        {chatMode === "text" ? (
          !isConversationState ? (
            <div className="flex flex-col items-center justify-center gap-6 py-6">
              <div
                className="w-full max-w-[75%] px-4 py-3 rounded-[16px]"
                style={{
                  backgroundColor: "#242424",
                  border: "1px solid #2A2A2A",
                  color: "#D4CFC7",
                  borderTopLeftRadius: 4,
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: "0.9375rem",
                  lineHeight: 1.7,
                }}
              >
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p
                        style={{
                          margin: 0,
                          marginBottom: "0.45em",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong
                        style={{ color: "#F0EDE6", fontWeight: 600 }}
                      >
                        {children}
                      </strong>
                    ),
                    em: ({ children }) => (
                      <em style={{ color: "#D4CFC7", fontStyle: "italic" }}>
                        {children}
                      </em>
                    ),
                  }}
                >
                  {GREETING}
                </ReactMarkdown>
              </div>
              <div
                className={`
                  transition-transform duration-500
                  ${mood === "thinking" ? "monk-thinking" : ""}
                  ${mood === "speaking" ? "monk-speaking" : ""}
                  ${mood === "greeting" ? "monk-greeting" : ""}
                  ${mood === "idle" || mood === "happy" || mood === "curious" ? "monk-idle" : ""}
                `}
              >
                <MonkCharacter mood={mood} size="clamp(100px, 26vw, 140px)" />
              </div>
            </div>
          ) : (
            <div className="pb-3">
              {displayedMessages.map((msg, index) => {
                const previousRole =
                  index > 0 ? displayedMessages[index - 1].role : null;
                const rowMarginTop =
                  index === 0
                    ? 0
                    : previousRole === "user" && msg.role === "assistant"
                      ? 16
                      : 8;
                const isUser = msg.role === "user";

                return (
                  <div
                    key={msg.key}
                    className={`w-full ${isUser ? "flex justify-end" : "flex items-start gap-2.5"} animate-fade-in`}
                    style={{ marginTop: rowMarginTop }}
                  >
                    {!isUser && (
                      <div
                        className="shrink-0 rounded-full flex items-center justify-center"
                        style={{
                          width: 34,
                          height: 34,
                          backgroundColor: "#2A2A2A",
                          border: "1px solid #3A3A3A",
                        }}
                      >
                        <MonkCharacter mood={msg.isThinking ? "thinking" : "idle"} size={24} headOnly />
                      </div>
                    )}
                    <div
                      className="max-w-[75%] px-4 py-3 rounded-[16px]"
                      style={{
                        backgroundColor: isUser
                          ? "rgba(200, 169, 110, 0.1)"
                          : "#242424",
                        border: isUser
                          ? "1px solid rgba(200, 169, 110, 0.2)"
                          : "1px solid #2A2A2A",
                        color: isUser ? "#F0EDE6" : "#D4CFC7",
                        borderTopRightRadius: isUser ? 4 : 16,
                        borderTopLeftRadius: isUser ? 16 : 4,
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: "0.9375rem",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {msg.isThinking ? (
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center gap-[5px]">
                            {[0, 150, 300].map((delay) => (
                              <span
                                key={delay}
                                className="inline-block rounded-full animate-bounce"
                                style={{
                                  width: 7,
                                  height: 7,
                                  backgroundColor: "#C8A96E",
                                  animationDelay: `${delay}ms`,
                                  animationDuration: "0.8s",
                                }}
                              />
                            ))}
                          </div>
                          <span
                            className="font-display italic animate-pulse"
                            style={{
                              color: "#8F8A81",
                              fontSize: "0.8rem",
                            }}
                          >
                            Bodhi is reflecting…
                          </span>
                        </div>
                      ) : isUser ? (
                        <span>{msg.content}</span>
                      ) : (
                        <>
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => (
                                <p
                                  style={{
                                    margin: 0,
                                    marginBottom: "0.45em",
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {children}
                                </p>
                              ),
                              strong: ({ children }) => (
                                <strong
                                  style={{
                                    color: "#F0EDE6",
                                    fontWeight: 600,
                                  }}
                                >
                                  {children}
                                </strong>
                              ),
                              em: ({ children }) => (
                                <em
                                  style={{
                                    color: "#D4CFC7",
                                    fontStyle: "italic",
                                  }}
                                >
                                  {children}
                                </em>
                              ),
                              a: ({ href, children }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: "#C8A96E",
                                    textDecoration: "underline",
                                    textUnderlineOffset: "2px",
                                  }}
                                >
                                  {children}
                                </a>
                              ),
                              ol: ({ children }) => (
                                <ol
                                  style={{
                                    paddingLeft: "1.2em",
                                    marginBottom: "0.5em",
                                    listStyleType: "decimal",
                                  }}
                                >
                                  {children}
                                </ol>
                              ),
                              ul: ({ children }) => (
                                <ul
                                  style={{
                                    paddingLeft: "1.2em",
                                    marginBottom: "0.5em",
                                    listStyleType: "disc",
                                  }}
                                >
                                  {children}
                                </ul>
                              ),
                              li: ({ children }) => (
                                <li style={{ marginBottom: "0.2em" }}>
                                  {children}
                                </li>
                              ),
                              br: () => <br />,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                          {msg.isStreaming && (
                            <span
                              className="inline-block w-[2px] h-[1em] ml-[2px] animate-pulse align-middle"
                              style={{
                                backgroundColor: "#C8A96E",
                                verticalAlign: "middle",
                              }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center gap-6 py-6">
            <div className="w-full overflow-x-auto pb-1">
              <div className="flex gap-3 min-w-max">
                {CHARACTERS.map((character) => {
                  const isSelected = character.id === selectedCharacterId;
                  return (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => setSelectedCharacterId(character.id)}
                      className="w-[196px] rounded-[14px] p-3 text-left transition-all"
                      style={{
                        backgroundColor: "#242424",
                        border: `1px solid ${isSelected ? "#C8A96E" : "#333333"}`,
                        boxShadow: isSelected
                          ? "0 0 18px rgba(200, 169, 110, 0.2)"
                          : "none",
                      }}
                    >
                      <div className="flex items-center gap-2.5 mb-2">
                        <div
                          className="rounded-full flex items-center justify-center"
                          style={{
                            width: 42,
                            height: 42,
                            backgroundColor: "#2A2A2A",
                            border: "1px solid #3A3A3A",
                          }}
                        >
                          <CharacterIcon id={character.id} size={28} />
                        </div>
                        <span
                          style={{
                            color: "#F0EDE6",
                            fontSize: "0.86rem",
                            fontWeight: 600,
                          }}
                        >
                          {character.name}
                        </span>
                      </div>
                      <p
                        style={{
                          color: "#C9C3B9",
                          fontSize: "0.76rem",
                          lineHeight: 1.5,
                        }}
                      >
                        {character.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col items-center gap-4 pt-1">
              <div
                className={`rounded-full flex items-center justify-center transition-transform ${
                  isAISpeaking ? "voice-avatar-speaking" : ""
                }`}
                style={{
                  width: 94,
                  height: 94,
                  backgroundColor: "#262626",
                  border: "1px solid #3A3A3A",
                  boxShadow: "0 0 0 8px rgba(200, 169, 110, 0.08)",
                }}
              >
                <CharacterIcon id={selectedCharacter.id} size={64} />
              </div>

              <button
                type="button"
                disabled={isListening || isVoiceLoading}
                onClick={startVoiceCapture}
                className="rounded-full px-7 py-4 text-[0.9rem] font-medium transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "#C8A96E",
                  color: "#1A1A1A",
                  boxShadow: "0 8px 22px rgba(200, 169, 110, 0.28)",
                  animation: isListening ? "none" : "pulse 4s ease-in-out infinite",
                }}
              >
                {isListening
                  ? "Listening..."
                  : isVoiceStreaming
                    ? "Responding..."
                    : isVoiceLoading
                      ? "Processing..."
                      : "Tap to Talk"}
              </button>

              {isAISpeaking && (
                <button
                  type="button"
                  onClick={stopSpeechPlayback}
                  className="px-4 py-2 rounded-full text-[0.82rem]"
                  style={{
                    backgroundColor: "#2A2A2A",
                    border: "1px solid #3A3A3A",
                    color: "#F0EDE6",
                  }}
                >
                  Stop
                </button>
              )}

              {!speechSupported && (
                <p style={{ color: "#E8A0A0", fontSize: "0.82rem" }}>
                  Voice recognition is unavailable in this browser.
                </p>
              )}

              {speechError && (
                <p style={{ color: "#E8A0A0", fontSize: "0.82rem" }}>
                  {speechError}
                </p>
              )}

              <div className="w-full max-w-[560px] pt-1 space-y-2">
                <div
                  className="px-4 py-3 rounded-[14px]"
                  style={{
                    backgroundColor: "#242424",
                    border: "1px solid #2E2E2E",
                    color: "#D9D4CB",
                    fontSize: "0.88rem",
                    lineHeight: 1.65,
                  }}
                >
                  <span
                    style={{
                      color: "#A8A49C",
                      fontSize: "0.72rem",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    You said
                  </span>
                  {voiceUserTranscript || "Tap to talk to begin."}
                </div>
                <div
                  className="px-4 py-3 rounded-[14px]"
                  style={{
                    backgroundColor: "#242424",
                    border: "1px solid #2E2E2E",
                    color: "#D4CFC7",
                    fontSize: "0.9rem",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  <span
                    style={{
                      color: "#A8A49C",
                      fontSize: "0.72rem",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    {selectedCharacter.name}
                  </span>
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => (
                        <p
                          style={{
                            margin: 0,
                            marginBottom: "0.45em",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong
                          style={{ color: "#F0EDE6", fontWeight: 600 }}
                        >
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em
                          style={{ color: "#D4CFC7", fontStyle: "italic" }}
                        >
                          {children}
                        </em>
                      ),
                      br: () => <br />,
                    }}
                  >
                    {voiceAssistantTranscript || "I am listening with compassion."}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {chatMode === "text" && history.length > 0 && (
        <div
          className="font-display italic text-[0.72rem] opacity-0 transition-opacity"
          style={{
            color: "#6E6A62",
            marginTop: -8,
          }}
        >
          {mood === "thinking"
            ? "reflecting..."
            : mood === "speaking"
              ? "speaking..."
              : ""}
        </div>
      )}

      <div
        className="sticky bottom-0 pt-3 pb-1 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(26, 26, 26, 0.9)" }}
      >
        {chatMode === "text" ? (
          <ChatInput
            onSend={handleSend}
            isLoading={isLoading}
            initialValue={prefillQuestion}
          />
        ) : (
          <div
            className="rounded-[14px] px-4 py-3 text-center"
            style={{
              backgroundColor: "#222222",
              border: "1px solid #2F2F2F",
              color: "#8F8A81",
              fontSize: "0.82rem",
            }}
          >
            Voice mode active. Tap the button above to speak.
          </div>
        )}
      </div>
    </div>
  );
}
