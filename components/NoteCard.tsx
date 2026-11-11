"use client";

import { MoreHorizontal } from "lucide-react";
import { motion } from "motion/react";
import type { Note } from "@/lib/data";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { NOTE_BG } from "./ui";

export function NoteCard({
  note,
  className,
  ref,
}: {
  note: Note;
  className?: string;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  const { openSheet } = useStore();
  return (
    <motion.button
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4, rotate: -0.6 }}
      whileTap={{ scale: 0.97 }}
      transition={snappy}
      onClick={() => openSheet({ kind: "note", id: note.id })}
      className={cn(
        "flex shrink-0 snap-start flex-col rounded-[22px] p-4 text-left shadow-[0_1px_0_rgba(0,0,0,0.04)]",
        NOTE_BG[note.color],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[15px] font-semibold leading-tight">{note.title}</p>
        <MoreHorizontal className="size-4 shrink-0 opacity-60" />
      </div>
      <p className="mt-3 line-clamp-5 text-[12.5px] leading-relaxed text-ink/75">{note.body}</p>
      <p className="mt-auto pt-3 text-[11px] text-ink/50">{note.date}</p>
    </motion.button>
  );
}
