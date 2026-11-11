"use client";

import { Check, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { NoteColor } from "@/lib/data";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { PrimaryButton } from "./TaskSheets";
import { NOTE_BG } from "./ui";

const COLORS: NoteColor[] = ["mint", "lilac", "peach", "sky"];

export function NoteEditor({ id }: { id?: string }) {
  const { notes, addNote, updateNote, deleteNote, closeSheet } = useStore();
  const existing = notes.find((n) => n.id === id);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [color, setColor] = useState<NoteColor>(existing?.color ?? "mint");

  const save = () => {
    if (!title.trim()) return;
    if (existing) updateNote(existing.id, { title, body, color });
    else
      addNote({
        title: title.trim(),
        body,
        color,
        date: "Nov 11, 2026",
      });
    closeSheet();
  };

  return (
    <div className="space-y-4 pt-1">
      <motion.div
        layout
        className={cn("rounded-[22px] p-4 transition-colors duration-300", NOTE_BG[color])}
      >
        <input
          autoFocus={!existing}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full bg-transparent pr-8 text-xl font-semibold outline-none placeholder:text-ink/40"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write something…"
          rows={6}
          className="mt-2 w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-ink/40"
        />
      </motion.div>

      <div className="flex items-center gap-3">
        {COLORS.map((c) => (
          <motion.button
            key={c}
            whileTap={{ scale: 0.85 }}
            onClick={() => setColor(c)}
            className={cn("relative grid size-9 place-items-center rounded-full", NOTE_BG[c])}
            aria-label={c}
          >
            {c === color && (
              <motion.span
                layoutId="note-color-ring"
                transition={spring}
                className="absolute -inset-1 rounded-full ring-2 ring-ink"
              />
            )}
            {c === color && <Check className="size-4" />}
          </motion.button>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        {existing && (
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              deleteNote(existing.id);
              closeSheet();
            }}
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-500"
            aria-label="Delete note"
          >
            <Trash2 className="size-[18px]" />
          </motion.button>
        )}
        <PrimaryButton className="flex-1" onClick={save} disabled={!title.trim()}>
          {existing ? "Save" : "Add note"}
        </PrimaryButton>
      </div>
    </div>
  );
}
