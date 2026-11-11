"use client";

import { Plus } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useStore } from "@/lib/store";
import { NoteCard } from "../NoteCard";
import { Card, IconButton } from "../ui";

export function NotesCard({ className, delay }: { className?: string; delay?: number }) {
  const { notes, openSheet } = useStore();
  return (
    <Card className={className} delay={delay}>
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-semibold">My notes</h2>
        <IconButton onClick={() => openSheet({ kind: "newNote" })} aria-label="New note">
          <Plus className="size-[18px]" />
        </IconButton>
      </div>
      <div className="no-scrollbar -mx-5 mt-4 flex min-h-0 flex-1 snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pt-1 pb-1">
        <AnimatePresence initial={false} mode="popLayout">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} className="w-[190px]" />
          ))}
        </AnimatePresence>
      </div>
    </Card>
  );
}
