import { useCallback, useEffect, useRef, useState } from "react";
import type {
  TranslateRegionRequest,
  TranslateRegionResponse,
} from "../lib/messages";

type Phase = "idle" | "selecting" | "loading" | "result" | "error";

interface Point {
  x: number;
  y: number;
}

type Box = { x: number; y: number; width: number; height: number };

interface ResultData {
  sourceText: string;
  translatedText: string;
  detectedLang?: string;
}

function normalizeRect(a: Point, b: Point): Box {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

export default function Overlay() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [start, setStart] = useState<Point | null>(null);
  const [current, setCurrent] = useState<Point | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [finalRect, setFinalRect] = useState<Box | null>(null);
  const draggingRef = useRef(false);

  const reset = useCallback(() => {
    setPhase("idle");
    setStart(null);
    setCurrent(null);
    setResult(null);
    setErrorMsg("");
    setFinalRect(null);
    draggingRef.current = false;
  }, []);

  useEffect(() => {
    const listener = (message: { type: string }) => {
      if (message.type === "start-selection") {
        setPhase("selecting");
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  useEffect(() => {
    if (phase === "idle") {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        reset();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [phase, reset]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    const p = { x: e.clientX, y: e.clientY };
    setStart(p);
    setCurrent(p);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingRef.current) {
      return;
    }
    setCurrent({ x: e.clientX, y: e.clientY });
  }, []);

  const onMouseUp = useCallback(async () => {
    if (!draggingRef.current || !start || !current) {
      return;
    }
    draggingRef.current = false;
    const rect = normalizeRect(start, current);

    if (rect.width < 6 || rect.height < 6) {
      reset();
      return;
    }

    setFinalRect(rect);
    setPhase("loading");

    const req: TranslateRegionRequest = {
      type: "translate-region",
      rect: { ...rect, dpr: window.devicePixelRatio || 1 },
    };

    try {
      const res = (await chrome.runtime.sendMessage(
        req,
      )) as TranslateRegionResponse;
      if (res.ok) {
        setResult({
          sourceText: res.sourceText,
          translatedText: res.translatedText,
          detectedLang: res.detectedLang,
        });
        setPhase("result");
      } else {
        setErrorMsg(res.error);
        setPhase("error");
      }
    } catch {
      setErrorMsg("Could not reach the extension background, try again.");
      setPhase("error");
    }
  }, [start, current, reset]);

  if (phase === "idle") {
    return null;
  }

  const liveRect = start && current ? normalizeRect(start, current) : null;

  return (
    <div className="fixed inset-0 z-[2147483647]">
      {phase === "selecting" && (
        <div
          className="absolute inset-0 cursor-crosshair bg-scrim"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          {liveRect && liveRect.width > 0 && liveRect.height > 0 && (
            <div
              className="lens-glow absolute rounded-sm border-2 border-selection bg-selection-fill"
              style={{
                left: liveRect.x,
                top: liveRect.y,
                width: liveRect.width,
                height: liveRect.height,
              }}
            />
          )}
          <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-hint px-4 py-1.5 text-sm text-white shadow-lg">
            Drag to select text to translate &middot;{" "}
            <kbd className="font-mono">Esc</kbd> to cancel
          </div>
        </div>
      )}

      {(phase === "loading" || phase === "result" || phase === "error") &&
        finalRect && (
          <ResultCard
            rect={finalRect}
            phase={phase}
            result={result}
            errorMsg={errorMsg}
            onClose={reset}
          />
        )}
    </div>
  );
}

function ResultCard({
  rect,
  phase,
  result,
  errorMsg,
  onClose,
}: {
  rect: Box;
  phase: Phase;
  result: ResultData | null;
  errorMsg: string;
  onClose: () => void;
}) {
  const top = rect.y + rect.height + 10;
  const left = Math.max(8, Math.min(rect.x, window.innerWidth - 340));

  return (
    <div
      className="absolute w-[320px] rounded-xl bg-surface p-4 text-fg shadow-2xl"
      style={{ left, top }}
    >
      <button
        onClick={onClose}
        className="absolute right-2 top-2 rounded-full p-1 text-muted hover:bg-line/40"
        aria-label="Close"
      >
        ✕
      </button>

      {phase === "loading" && (
        <div className="flex items-center gap-2 py-2 text-sm text-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand" />
          Reading &amp; translating…
        </div>
      )}

      {phase === "error" && (
        <div className="text-sm text-danger">{errorMsg}</div>
      )}

      {phase === "result" && result && (
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
              {result.detectedLang
                ? `Detected: ${result.detectedLang}`
                : "Original"}
            </div>
            <div className="max-h-24 overflow-y-auto text-sm text-muted">
              {result.sourceText}
            </div>
          </div>
          <div className="rounded-lg bg-input p-2 shadow-inner">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-brand">
              Translation
            </div>
            <div className="text-base font-medium leading-snug">
              {result.translatedText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
