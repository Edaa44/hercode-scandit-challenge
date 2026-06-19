import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George

export const Route = createFileRoute("/api/tts-proxy")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.ELEVENLABS_API_KEY;
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const body = (await request.json().catch(() => ({}))) as {
            text?: string;
            voiceId?: string;
            modelId?: string;
          };

          const text = body.text?.trim();
          if (!text) {
            return new Response(
              JSON.stringify({ error: "Missing 'text' in request body" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const voiceId = body.voiceId || DEFAULT_VOICE_ID;
          const modelId = body.modelId || "eleven_multilingual_v2";

          const upstream = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: {
                "xi-api-key": apiKey,
                "Content-Type": "application/json",
                Accept: "audio/mpeg",
              },
              body: JSON.stringify({
                text,
                model_id: modelId,
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.75,
                  style: 0.5,
                  use_speaker_boost: true,
                  speed: 1.0,
                },
              }),
            },
          );

          if (!upstream.ok) {
            const errText = await upstream.text();
            return new Response(
              JSON.stringify({ error: errText || `TTS failed: ${upstream.status}` }),
              { status: upstream.status, headers: { "Content-Type": "application/json" } },
            );
          }

          const audio = await upstream.arrayBuffer();
          return new Response(audio, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "no-store",
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});