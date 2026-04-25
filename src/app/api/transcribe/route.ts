import { getSessionUserId } from "@/lib/apiAuth";

/**
 * POST /api/transcribe
 *
 * Receives an audio blob (webm/ogg from MediaRecorder) and sends it to
 * OpenAI's Whisper API for transcription. Used as a fallback when the
 * browser's SpeechRecognition API fails (network errors, unsupported
 * browsers, etc.).
 *
 * Returns: { text: string }
 */
export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Transcription service not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Forward to OpenAI Whisper API
    const whisperForm = new FormData();
    whisperForm.append("file", audioFile, "audio.webm");
    whisperForm.append("model", "whisper-1");
    whisperForm.append("language", "en");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: whisperForm,
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[api/transcribe] Whisper error:", response.status, errorBody);
      return new Response(
        JSON.stringify({ error: "Transcription failed" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({ text: result.text ?? "" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[api/transcribe] error:", error);
    return new Response(
      JSON.stringify({ error: "Transcription failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
