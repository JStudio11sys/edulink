"use client";

import { ChevronDown, LogOut, Search, Settings, User, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { STUDENT } from "@/lib/data";
import { snappy, spring } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { Notifications } from "../Notifications";
import { Avatar, IconButton, MenuItem, Popover } from "../ui";

export function TopBar({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  const [searching, setSearching] = useState(false);
  const { setView } = useStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="flex items-center gap-2 rounded-card bg-white p-2.5"
    >
      <motion.div
        layout
        transition={spring}
        className="flex h-10 items-center overflow-hidden rounded-full ring-1 ring-line"
        style={{ flex: searching ? 1 : "0 0 40px" }}
      >
        <button
          onClick={() => setSearching(true)}
          className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-soft"
          aria-label="Search"
        >
          <Search className="size-[18px]" />
        </button>
        <AnimatePresence>
          {searching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.1 } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              className="flex min-w-0 flex-1 items-center pr-1"
            >
              <input
                autoFocus
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="Search tasks…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              <IconButton
                variant="soft"
                size={30}
                onClick={() => {
                  onQuery("");
                  setSearching(false);
                }}
                aria-label="Close search"
              >
                <X className="size-3.5" />
              </IconButton>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <Notifications variant="lilac" />

      <div className="ml-auto">
        <Popover
          className="w-52"
          trigger={({ open, toggle }) => (
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={snappy}
              onClick={toggle}
              className="flex items-center gap-2.5 rounded-full py-1 pr-2 pl-1 transition-colors hover:bg-soft"
            >
              <Avatar name={STUDENT.name} size={36} />
              <span className="hidden text-left leading-tight min-[1180px]:block">
                <span className="block text-[13px] font-medium">{STUDENT.name}</span>
                <span className="block text-[11px] text-muted">{STUDENT.className}</span>
              </span>
              <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring}>
                <ChevronDown className="size-4 text-muted" />
              </motion.span>
            </motion.button>
          )}
        >
          {(close) => (
            <>
              <MenuItem onClick={close}>
                <User className="size-4" /> My profile
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setView("settings");
                  close();
                }}
              >
                <Settings className="size-4" /> Settings
              </MenuItem>
              <div className="my-1 h-px bg-line" />
              <MenuItem danger onClick={close}>
                <LogOut className="size-4" /> Log out
              </MenuItem>
            </>
          )}
        </Popover>
      </div>
    </motion.div>
  );
}
