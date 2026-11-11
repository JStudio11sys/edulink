"use client";

import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { NOTIFICATIONS } from "@/lib/data";
import { listVariants, itemVariants } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { IconButton, Popover } from "./ui";

export function Notifications({ variant = "white" }: { variant?: "white" | "lilac" }) {
  const { unread, markRead } = useStore();
  return (
    <Popover
      align={variant === "lilac" ? "left" : "right"}
      className="w-[min(320px,calc(100vw-32px))]"
      trigger={({ toggle }) => (
        <IconButton variant={variant} onClick={toggle} aria-label="Notifications">
          <Bell className="size-[18px]" />
          <AnimatePresence>
            {unread && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-2 right-2.5 size-2 rounded-full bg-red-500 ring-2 ring-white"
              />
            )}
          </AnimatePresence>
        </IconButton>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-2 pt-1 pb-2">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              onClick={() => {
                markRead();
                close();
              }}
              className="text-xs font-medium text-lilac-deep hover:underline"
            >
              Mark all read
            </button>
          </div>
          <motion.ul variants={listVariants} initial="hidden" animate="show">
            {NOTIFICATIONS.map((n) => (
              <motion.li
                key={n.id}
                variants={itemVariants}
                className="flex gap-3 rounded-2xl px-2 py-2.5 hover:bg-soft"
              >
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-lilac" style={{ opacity: unread ? 1 : 0.2 }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">{n.title}</p>
                  <p className="text-xs text-muted">{n.body}</p>
                </div>
                <span className="text-[11px] text-muted">{n.time}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      )}
    </Popover>
  );
}
