import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, Volume2 } from "lucide-react";
import type { Product } from "@/lib/types";

type Phase = "idle" | "recording" | "thinking" | "speaking" | "error";

export function VoiceProductQA({ product }: { product: Product }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [error, setError] = useState<string>("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioRef.current?.pause();
    };
  }, []);

  const startRecording = async () => {
    setError("");
    setAnswer("");
    setQuestion("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = ["audio/webm", "audio/mp4"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => handleStop(recorder.mimeType);
      recorder.start();
      recorderRef.current = recorder;
      setPhase("recording");
    } catch (err) {
      console.error(err);
      setError("Microphone access denied or unavailable.");
      setPhase("error");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const handleStop = async (mimeType: string) => {
    setPhase("thinking");
    const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
    if (blob.size < 1024) {
      setError("That recording was empty — please try again.");
      setPhase("error");
      return;
    }
    try {
      const form = new FormData();
      form.append("audio", blob, `question.${blob.type.includes("mp4") ? "mp4" : "webm"}`);
      form.append(
        "product",
        JSON.stringify({
          name: product.name,
          brand: product.brand,
          category: product.category,
          color: product.color,
          size: product.size,
          price_chf: product.price_chf,
          discount_pct: product.discount_pct,
          weight_g: product.weight_g,
          waterproof_rating_mm: product.waterproof_rating_mm,
          temp_rating_c: product.temp_rating_c,
          material: product.material,
          tags: product.tags,
          aisle: product.aisle,
          zone_name: product.zone_name,
          stock_total: product.stock_total,
          stock_front: product.stock_front,
          description: product.description,
        }),
      );

      const res = await fetch("/api/voice-qa", { method: "POST", body: form });
      const data = (await res.json()) as {
        question?: string;
        answer?: string;
        error?: string;
      };
      if (!res.ok || !data.answer) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setQuestion(data.question ?? "");
      setAnswer(data.answer);
      await speak(data.answer);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
    }
  };

  const speak = async (text: string) => {
    setPhase("speaking");
    try {
      const res = await fetch("/api/tts-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`TTS failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.addEventListener("ended", () => {
        URL.revokeObjectURL(url);
        setPhase("idle");
      });
      audio.addEventListener("error", () => {
        URL.revokeObjectURL(url);
        setPhase("idle");
      });
      await audio.play();
    } catch (err) {
      console.warn("TTS playback failed, falling back to native voice", err);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.onend = () => setPhase("idle");
        window.speechSynthesis.speak(u);
      } else {
        setPhase("idle");
      }
    }
  };

  const isBusy = phase === "thinking" || phase === "speaking";
  const isRecording = phase === "recording";

  return (
    <section className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-accent/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
            Voice Product Q&amp;A
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ask anything — waterproof rating, care, sizes in stock, cheaper alternatives.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isBusy}
        aria-pressed={isRecording}
        className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-bold transition-colors ${
          isRecording
            ? "bg-destructive text-destructive-foreground"
            : isBusy
              ? "bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground hover:opacity-90"
        }`}
      >
        {phase === "thinking" ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            Thinking…
          </>
        ) : phase === "speaking" ? (
          <>
            <Volume2 className="size-5 animate-pulse" aria-hidden="true" />
            Speaking…
          </>
        ) : isRecording ? (
          <>
            <Square className="size-5" aria-hidden="true" />
            Stop &amp; ask
          </>
        ) : (
          <>
            <Mic className="size-5" aria-hidden="true" />
            Voice Product Q&amp;A
          </>
        )}
      </button>

      {question && (
        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-bold uppercase tracking-wider">You asked:</span>{" "}
          {question}
        </p>
      )}
      {answer && (
        <p className="mt-2 rounded-lg bg-background/60 px-3 py-2 text-sm">
          {answer}
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs font-semibold text-destructive">{error}</p>
      )}

      <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Built with ElevenLabs
      </p>
    </section>
  );
}
