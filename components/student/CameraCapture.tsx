"use client";

import { Camera, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { snappy, spring } from "@/lib/motion";

const MAX_SIDE = 1600; // px — plenty for handwriting, keeps uploads small

/** Draw an image source onto a canvas (scaled down) and return a JPEG data URL. */
function toJpeg(src: CanvasImageSource, w: number, h: number) {
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d")!.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** Photo file (any size, e.g. a 12 MP phone photo) → scaled-down JPEG data URL. */
export async function fileToJpeg(file: File) {
  // 1) <img> + onload: most reliable on iPhone, and respects photo rotation.
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("load failed"));
      img.src = url;
    });
    return toJpeg(img, img.naturalWidth, img.naturalHeight);
  } catch {
    // 2) Fallback: createImageBitmap
    try {
      const bmp = await createImageBitmap(file);
      const out = toJpeg(bmp, bmp.width, bmp.height);
      bmp.close();
      return out;
    } catch {
      throw new Error("Couldn't open that photo. Please try again, or use Upload photo.");
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Full-screen in-app camera. When it can't start, offers the phone's own camera instead. */
export function CameraCapture({
  onCapture,
  onClose,
  onUsePhoneCamera,
  pages = [],
  maxPages = 10,
}: {
  onCapture: (jpeg: string) => void;
  onClose: () => void;
  /** Must open the phone camera synchronously (inside this click). */
  onUsePhoneCamera: () => void;
  /** Pages already taken (data URLs), shown as a stack with a count. */
  pages?: string[];
  /** Max pages allowed. */
  maxPages?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("The in-app camera needs a secure (https) connection. Use your phone camera instead.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        setReady(true);
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        setError(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow it in your browser settings, or use your phone camera."
            : "Couldn't open the in-app camera. Use your phone camera instead.",
        );
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const shoot = () => {
    const v = videoRef.current;
    if (!v || !ready || pages.length >= maxPages) return;
    setFlash((f) => f + 1);
    onCapture(toJpeg(v, v.videoWidth, v.videoHeight));
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex flex-col bg-black text-white"
    >
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 size-full object-cover" />

        {/* Paper guide */}
        {ready && (
          <motion.div
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
            className="pointer-events-none absolute inset-x-[8%] top-[10%] bottom-[8%] rounded-[28px] border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
          >
            <p className="absolute -top-9 inset-x-0 text-center text-sm font-medium text-white/90">
              {pages.length >= maxPages ? `Max ${maxPages} pages` : `Page ${pages.length + 1} — fit the paper in the frame`}
            </p>
          </motion.div>
        )}

        {error && (
          <div className="absolute inset-0 grid place-items-center p-8 text-center">
            <div>
              <Camera className="mx-auto size-10 text-white/60" />
              <p className="mt-4 text-[15px] leading-relaxed text-white/85">{error}</p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onUsePhoneCamera}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-ink"
              >
                <Camera className="size-4" /> Open phone camera
              </motion.button>
            </div>
          </div>
        )}

        {/* Shutter flash */}
        <AnimatePresence>
          {flash > 0 && (
            <motion.div
              key={flash}
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="pointer-events-none absolute inset-0 bg-white"
            />
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onClose}
          className="absolute top-[max(16px,env(safe-area-inset-top))] left-4 grid size-11 place-items-center rounded-full bg-black/40 backdrop-blur"
          aria-label="Close camera"
        >
          <X className="size-5" />
        </motion.button>
      </div>

      <div className="flex items-center justify-between px-6 pt-6 pb-[max(28px,env(safe-area-inset-bottom))]">
        {/* Last page taken + count */}
        <div className="relative size-14">
          <AnimatePresence>
            {pages.length > 0 && (
              <motion.div
                key={pages.length}
                initial={{ scale: 0.4, opacity: 0, y: -40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={snappy}
                className="absolute inset-0 overflow-hidden rounded-xl ring-2 ring-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pages[pages.length - 1]} alt={`Page ${pages.length}`} className="size-full object-cover" />
              </motion.div>
            )}
          </AnimatePresence>
          {pages.length > 0 && (
            <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-lilac text-xs font-bold text-white">
              {pages.length}
            </span>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.86 }}
          transition={snappy}
          onClick={shoot}
          disabled={!ready}
          className="grid size-[78px] place-items-center rounded-full border-4 border-white disabled:opacity-30"
          aria-label="Take photo"
        >
          <span className="size-[62px] rounded-full bg-white" />
        </motion.button>

        {/* Done */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={snappy}
          onClick={onClose}
          disabled={pages.length === 0}
          className="h-12 min-w-14 rounded-full bg-white px-4 text-sm font-semibold text-ink disabled:opacity-0"
        >
          Done{pages.length ? ` (${pages.length})` : ""}
        </motion.button>
      </div>

    </motion.div>,
    document.body,
  );
}
