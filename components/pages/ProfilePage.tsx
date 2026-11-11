"use client";

import { LogOut } from "lucide-react";
import { motion } from "motion/react";
import { useAuth, useMe } from "@/lib/auth";
import { spring } from "@/lib/motion";
import { PageBody, PageHeader } from "../shell/PageHeader";
import { Avatar, Card, PrimaryButton } from "../ui";
import { PlanCard } from "../billing/Plans";
import { Credit } from "../Credit";

const ROLE = {
  admin: { label: "Administrator", tone: "bg-ink text-white" },
  teacher: { label: "Teacher", tone: "bg-lilac text-white" },
  student: { label: "Student", tone: "bg-mint text-mint-deep" },
};

export function ProfilePage() {
  const me = useMe();
  const { signOut } = useAuth();
  return (
    <>
      <PageHeader title="Profile" />
      <PageBody>
        <Card className="flex flex-col items-center py-10 text-center lg:max-w-md">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring}>
            <Avatar name={me.full_name} size={88} />
          </motion.div>
          <p className="mt-4 text-2xl font-semibold">{me.full_name}</p>
          <p className="text-sm text-muted">@{me.username}</p>
          <span className={`mt-3 rounded-full px-3 py-1 text-xs font-medium ${ROLE[me.role].tone}`}>{ROLE[me.role].label}</span>
          {me.role === "teacher" && (
            <div className="mt-6 w-full">
              <PlanCard />
            </div>
          )}
          <PrimaryButton variant="soft" className="mt-8 w-full max-w-xs text-red-500" onClick={signOut}>
            <LogOut className="size-4" /> Log out
          </PrimaryButton>
          <Credit className="mt-4" />
        </Card>
      </PageBody>
    </>
  );
}
