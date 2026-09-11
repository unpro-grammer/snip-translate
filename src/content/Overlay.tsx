import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { IoClose } from "react-icons/io5";
import type {
  TranslateRegionRequest,
  TranslateRegionResponse,
} from "../lib/messages";
import { isChineseLang, toPinyinChars } from "../lib/pinyin";

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

const CARD_MIN_WIDTH = 260;
const CARD_MAX_WIDTH = 420;
const CARD_MARGIN = 10;
const OVERLAY_FONT_SIZE = 10;
const ROMANISATION_FONT_SIZE = 8;

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
  const [scrollAtCapture, setScrollAtCapture] = useState({ x: 0, y: 0 });
  const [liveScroll, setLiveScroll] = useState({
    x: window.scrollX,
    y: window.scrollY,
  });
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
    if (!finalRect) {
      return;
    }
    const onScroll = () => {
      setLiveScroll({ x: window.scrollX, y: window.scrollY });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [finalRect]);

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
    setScrollAtCapture({ x: window.scrollX, y: window.scrollY });
    setLiveScroll({ x: window.scrollX, y: window.scrollY });
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

  const anchoredRect = finalRect && {
    x: finalRect.x + scrollAtCapture.x - liveScroll.x,
    y: finalRect.y + scrollAtCapture.y - liveScroll.y,
    width: finalRect.width,
    height: finalRect.height,
  };

  return (
    <div className="fixed inset-0 z-[2147483647]">
      {phase === "selecting" && (
        <div
          className="absolute inset-0 cursor-crosshair opacity-90"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          {liveRect && liveRect.width > 0 && liveRect.height > 0 && (
            <div
              className="lens-glow absolute rounded-sm border-2 border-selection"
              style={{
                left: liveRect.x,
                top: liveRect.y,
                width: liveRect.width,
                height: liveRect.height,
              }}
            />
          )}
          <div
            className="absolute rounded-full bg-brand px-2 py-0.5 text-white shadow-lg"
            style={{
              fontSize: OVERLAY_FONT_SIZE,
              left: "50%",
              top: 8,
              transform: "translateX(-50%)",
            }}
          >
            Drag to select text to translate. Press <kbd>Esc</kbd> to cancel
          </div>
        </div>
      )}

      {anchoredRect && (
        <div
          className="lens-glow pointer-events-none absolute rounded-sm border-2 border-selection"
          style={{
            left: anchoredRect.x,
            top: anchoredRect.y,
            width: anchoredRect.width,
            height: anchoredRect.height,
          }}
        />
      )}

      {(phase === "loading" || phase === "result" || phase === "error") &&
        anchoredRect && (
          <ResultCard
            rect={anchoredRect}
            phase={phase}
            result={result}
            errorMsg={errorMsg}
            onClose={reset}
          />
        )}
    </div>
  );
}

function PinyinText({ text }: { text: string }) {
  const chars = toPinyinChars(text);

  return (
    <span className="leading-loose">
      {chars.map((c, i) =>
        c.reading === c.char ? (
          <span key={i}>{c.char}</span>
        ) : (
          <ruby key={i}>
            {c.char}
            <rt
              className="text-brand"
              style={{ fontSize: ROMANISATION_FONT_SIZE }}
            >
              {c.reading}
            </rt>
          </ruby>
        ),
      )}
    </span>
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(
    Math.max(8, Math.min(rect.x, window.innerWidth - CARD_MIN_WIDTH - 8)),
  );
  const [top, setTop] = useState(rect.y + rect.height + CARD_MARGIN);

  useLayoutEffect(() => {
    const cardWidth = cardRef.current?.offsetWidth ?? CARD_MIN_WIDTH;
    const cardHeight = cardRef.current?.offsetHeight ?? 0;

    setLeft(Math.max(8, Math.min(rect.x, window.innerWidth - cardWidth - 8)));

    const below = rect.y + rect.height + CARD_MARGIN;
    const above = rect.y - CARD_MARGIN - cardHeight;
    const fitsBelow = below + cardHeight <= window.innerHeight - 8;
    setTop(fitsBelow ? below : Math.max(8, above));
  }, [rect, phase, result, errorMsg]);

  return (
    <div
      ref={cardRef}
      className="absolute rounded-lg bg-bg p-3 text-fg shadow-2xl"
      style={{
        left,
        top,
        width: "max-content",
        minWidth: CARD_MIN_WIDTH,
        maxWidth: CARD_MAX_WIDTH,
        fontSize: OVERLAY_FONT_SIZE,
      }}
    >
      <button
        onClick={onClose}
        className="absolute flex items-center justify-center rounded-full bg-brand text-white hover:cursor-pointer hover:bg-brand-hover"
        style={{ right: 10, top: 10, width: 16, height: 16 }}
        aria-label="Close"
      >
        <IoClose size={12} />
      </button>

      {phase === "loading" && (
        <div className="flex items-center gap-2 py-1 text-muted">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-line border-t-brand" />
          Processing…
        </div>
      )}

      {phase === "error" && <div className="text-danger">{errorMsg}</div>}

      {phase === "result" && result && (
        <div className="space-y-2">
          <div>
            <div className="mb-0.5 uppercase tracking-wide text-fg">
              {result.detectedLang
                ? `Detected: ${result.detectedLang}`
                : "Original"}
            </div>
            <div className="max-h-20 overflow-y-auto text-muted">
              {isChineseLang(result.detectedLang) ? (
                <PinyinText text={result.sourceText} />
              ) : (
                result.sourceText
              )}
            </div>
          </div>
          <div className="rounded-md bg-input p-1.5 shadow-inner">
            <div className="mb-0.5 uppercase tracking-wide text-brand">
              Translation
            </div>
            <div className="leading-snug text-bg">{result.translatedText}</div>
          </div>
        </div>
      )}
    </div>
  );
}
