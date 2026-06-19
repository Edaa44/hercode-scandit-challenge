/**
 * Calls the server-side /api/tts-proxy endpoint (which protects the
 * ELEVENLABS_API_KEY) and plays the returned MP3 audio. If anything goes
 * wrong (network error, missing key, upstream failure), falls back to the
 * browser's built-in SpeechSynthesis API.
 */
export async function playElevenLabs(
  text: string,
  options?: { voiceId?: string; modelId?: string },
): Promise<void> {
  const trimmed = text?.trim();
  if (!trimmed) return;

  try {
    const response = await fetch("/api/tts-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: trimmed,
        voiceId: options?.voiceId,
        modelId: options?.modelId,
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS proxy failed: ${response.status}`);
    }

    const blob = await response.blob();
    if (!blob.size) throw new Error("Empty audio response");

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
    audio.addEventListener("error", () => URL.revokeObjectURL(url), { once: true });
    await audio.play();
  } catch (err) {
    console.warn("[elevenLabsService] Falling back to speechSynthesis:", err);
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(trimmed));
      }
    } catch (fallbackErr) {
      console.error("[elevenLabsService] Fallback TTS failed:", fallbackErr);
    }
  }
}