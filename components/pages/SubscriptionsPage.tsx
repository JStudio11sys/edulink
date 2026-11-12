"use client";

import { AtSign, CalendarClock, CreditCard, Mail, Phone, School } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { getProfiles } from "@/lib/api";
import {
  PLAN_LABEL,
  SCHOOL_PLAN_LABEL,
  access,
  getAllSubscriptions,
  getSchoolBookings,
  setBookingStatus,
  type SchoolBooking,
} from "@/lib/billing";
import { cn } from "@/lib/cn";
import { fmtDate } from "@/lib/format";
import { useQuery } from "@/lib/useQuery";
import { PageBody, PageHeader } from "../shell/PageHeader";
import { Avatar, Card, EmptyState, ErrorNote, LoadingCards, Pill, Segmented } from "../ui";

type Tab = "teachers" | "schools";

/** Admin only: every teacher's plan, and School Edition call bookings. */
export function SubscriptionsPage() {
  const [tab, setTab] = useState<Tab>("teachers");
  return (
    <>
      <PageHeader title="Subscriptions" subtitle="Teachers' plans and School Edition bookings" />
      <Segmented
        className="mb-2 px-5 lg:mb-4 lg:px-0"
        layoutId="subscriptions-tab"
        size="md"
        options={[
          { value: "teachers", label: "Teachers" },
          { value: "schools", label: "School Edition" },
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
          <PageBody>{tab === "teachers" ? <TeacherPlans /> : <SchoolBookings />}</PageBody>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

/* ---------------- Teachers and their plan ---------------- */
function TeacherPlans() {
  const q = useQuery(() => Promise.all([getProfiles("teacher"), getAllSubscriptions()]));
  const [teachers, subs] = q.data ?? [[], []];

  if (q.loading && !q.data) return <LoadingCards />;
  return (
    <>
      <ErrorNote message={q.error} />
      <p className="mb-3 text-sm text-muted">
        {teachers.length} teacher{teachers.length === 1 ? "" : "s"}
      </p>
      {teachers.length === 0 ? (
        <EmptyState icon={<CreditCard className="size-7" />} title="No teachers yet" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {teachers.map((t, i) => {
            const sub = subs.find((s) => s.teacher_id === t.id) ?? null;
            const a = access(sub);
            return (
              <Card key={t.id} delay={Math.min(i, 8) * 0.03}>
                <div className="flex items-center gap-3">
                  <Avatar name={t.full_name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.full_name}</p>
                    <p className="flex items-center gap-1 truncate text-sm text-muted">
                      <AtSign className="size-3.5" />
                      {t.username}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {sub ? (
                    <>
                      <Pill tone={sub.plan === "trial" ? "bg-peach text-peach-deep" : "bg-lilac text-white"}>{PLAN_LABEL[sub.plan]}</Pill>
                      {a.ok ? (
                        <Pill tone="bg-mint text-mint-deep">
                          Active · {a.daysLeft} day{a.daysLeft === 1 ? "" : "s"} left
                        </Pill>
                      ) : (
                        <Pill tone="bg-red-500 text-white">{sub.plan === "trial" ? "Trial ended" : "Plan ended"}</Pill>
                      )}
                    </>
                  ) : (
                    <Pill tone="bg-soft text-muted ring-1 ring-line">No plan yet</Pill>
                  )}
                </div>
                {sub && (
                  <p className="mt-2 text-xs text-muted">
                    {a.ok ? "Until" : "Ended"} {fmtDate(sub.current_period_end)}
                    {sub.last_payment ? ` · last paid ${fmtDate(sub.last_payment.paid_at)}` : ""}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ---------------- School Edition: booked calls ---------------- */
const STATUS: { value: SchoolBooking["status"]; label: string }[] = [
  { value: "new", label: "New" },
  { value: "scheduled", label: "Scheduled" },
  { value: "done", label: "Done" },
];

const fmtCall = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function SchoolBookings() {
  const q = useQuery(() => getSchoolBookings());
  const bookings = q.data ?? [];
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const change = async (b: SchoolBooking, status: SchoolBooking["status"]) => {
    if (b.status === status) return;
    setBusy(b.id);
    setError(null);
    try {
      await setBookingStatus(b.id, status);
      q.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (q.loading && !q.data) return <LoadingCards count={2} />;
  return (
    <>
      <ErrorNote message={q.error ?? error} />
      <p className="mb-3 text-sm text-muted">
        {bookings.length} booking{bookings.length === 1 ? "" : "s"} · soonest call first
      </p>
      {bookings.length === 0 ? (
        <EmptyState
          icon={<School className="size-7" />}
          title="No bookings yet"
          text="Schools book a call from the School Edition plans on the landing page."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {bookings.map((b, i) => {
            const past = new Date(b.preferred_at).getTime() < Date.now();
            return (
              <Card key={b.id} delay={Math.min(i, 8) * 0.03} className={cn(b.status === "done" && "opacity-70")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[17px] font-semibold">{b.school_name}</p>
                    <p className="truncate text-sm text-muted">{b.contact_name}</p>
                  </div>
                  <Pill tone={b.plan === "school-premium" ? "bg-ink text-white" : "bg-lilac-soft text-lilac-deep"}>
                    {SCHOOL_PLAN_LABEL[b.plan]}
                  </Pill>
                </div>

                {/* The call / meeting */}
                <p
                  className={cn(
                    "mt-3 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium",
                    past && b.status !== "done" ? "bg-red-50 text-red-600" : "bg-soft",
                  )}
                >
                  <CalendarClock className="size-4 shrink-0" />
                  {fmtCall(b.preferred_at)}
                </p>

                <div className="mt-2 space-y-1 text-sm">
                  <a href={`mailto:${b.email}`} className="flex min-h-9 items-center gap-2 text-lilac-deep hover:underline">
                    <Mail className="size-4 shrink-0" />
                    <span className="truncate">{b.email}</span>
                  </a>
                  {b.mobile && (
                    <a href={`tel:${b.mobile.replace(/\s+/g, "")}`} className="flex min-h-9 items-center gap-2 text-ink-2 hover:underline">
                      <Phone className="size-4 shrink-0" />
                      {b.mobile}
                    </a>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted">Booked {fmtDate(b.created_at)}</p>
                  <div className="flex gap-1 rounded-full bg-soft p-1">
                    {STATUS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        disabled={busy === b.id}
                        onClick={() => change(b, s.value)}
                        className={cn(
                          "h-9 rounded-full px-3 text-xs font-medium transition-colors max-lg:h-11 max-lg:px-3.5",
                          b.status === s.value ? "bg-ink text-white" : "text-ink-2 hover:bg-white",
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
