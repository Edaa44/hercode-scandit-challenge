// Voice Product Q&A — multipart endpoint:
//   - field "audio": user's recorded question (webm/mp4)
//   - field "product": JSON-encoded product context
// Pipeline: Lovable AI STT  →  Lovable AI chat answer  →  plain JSON.
// Client takes the returned `answer` text and pipes it through /api/tts-proxy
// (ElevenLabs) for playback. Keeps the API key strictly server-side.

import { createFileRoute } from "@tanstack/react-router";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export const Route = createFileRoute("/api/voice-qa")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return json({ error: "LOVABLE_API_KEY not configured" }, 500);
          }

          const form = await request.formData();
          const audio = form.get("audio");
          const productRaw = form.get("product");
          const transcriptOnly = form.get("transcript");

          if (!(audio instanceof Blob) || audio.size < 256) {
            return json({ error: "Missing or empty audio" }, 400);
          }
          if (typeof productRaw !== "string") {
            return json({ error: "Missing product context" }, 400);
          }

          let product: Record<string, unknown> = {};
          try {
            product = JSON.parse(productRaw);
          } catch {
            return json({ error: "Invalid product JSON" }, 400);
          }

          // ---------- 1. Transcribe ----------
          const stt = new FormData();
          const ext =
            audio.type.includes("mp4") ? "mp4"
            : audio.type.includes("mpeg") ? "mp3"
            : audio.type.includes("wav") ? "wav"
            : "webm";
          stt.append("file", audio, `question.${ext}`);
          stt.append("model", "openai/gpt-4o-mini-transcribe");

          const sttRes = await fetch(`${GATEWAY}/audio/transcriptions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: stt,
          });
          if (!sttRes.ok) {
            const err = await sttRes.text();
            return json({ error: `Transcription failed: ${err}` }, sttRes.status);
          }
          const sttJson = (await sttRes.json()) as { text?: string };
          const question = (sttJson.text ?? "").trim();
          if (!question) return json({ error: "Couldn't understand audio" }, 400);

          if (typeof transcriptOnly === "string") {
            return json({ question, answer: "" });
          }

          // ---------- 2. Answer ----------
          const system = [
            "You are an in-store outdoor-gear assistant.",
            "Answer the shopper's spoken question about the product below.",
            "Be concise (1-3 short sentences), friendly, and speak naturally — your reply will be read aloud.",
            "If the product data doesn't contain the answer, say so plainly and suggest asking staff.",
            "Never invent specifications, prices, or stock numbers.",
            "",
            "PRODUCT JSON:",
            JSON.stringify(product, null, 2),
          ].join("\n");

          const chatRes = await fetch(`${GATEWAY}/chat/completions`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: system },
                { role: "user", content: question },
              ],
            }),
          });
          if (!chatRes.ok) {
            const err = await chatRes.text();
            return json({ error: `Answer failed: ${err}`, question }, chatRes.status);
          }
          const chatJson = (await chatRes.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const answer = chatJson.choices?.[0]?.message?.content?.trim() ?? "";
          if (!answer) return json({ error: "Empty answer", question }, 502);

          return json({ question, answer });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return json({ error: message }, 500);
        }
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
