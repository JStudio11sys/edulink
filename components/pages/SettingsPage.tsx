"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { PageHeader } from "../shell/PageHeader";
import { Segmented } from "../ui";
import { StudentsPage } from "./StudentsPage";
import { TeachersPage } from "./TeachersPage";

type Tab = "teachers" | "students";

/** Admin only: school configuration. */
export function SettingsPage() {
  const [tab, setTab] = useState<Tab>("teachers");
  return (
    <>
      <PageHeader title="Settings" subtitle="Manage teacher and student accounts" />
      <Segmented
        className="mb-2 px-5 lg:mb-4 lg:px-0"
        layoutId="settings-tab"
        size="md"
        options={[
          { value: "teachers", label: "Teachers" },
          { value: "students", label: "Students" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "teachers" && <TeachersPage embedded />}
          {tab === "students" && <StudentsPage embedded />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
