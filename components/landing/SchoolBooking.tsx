"use client";

import { CalendarClock, Check, Mail } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { bookSchool } from "@/lib/billing";
import { useUI } from "@/lib/store";
import { SheetHeader } from "../Sheet";
import { ErrorNote, Field, PrimaryButton, inputCls } from "../ui";

/** "YYYY-MM-DDTHH:mm" for the date-time input, in local time. */
const localInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** School Edition: book a call / meeting. The meeting details are sent by email. */
export function SchoolBooking({ plan, planName }: { plan: "school" | "school-premium"; planName: string }) {
  const { closeSheet } = useUI();
  const [school, setSchool] = useState("");
  const [person, setPerson] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const minWhen = localInput(new Date(Date.now() + 60 * 60 * 1000));
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const whenOk = !!when && new Date(when).getTime() > Date.now();
  const valid = school.trim().length >= 2 && person.trim().length >= 2 && emailOk && whenOk;

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 14 }}
          className="mx-auto grid size-20 place-items-center rounded-full bg-mint"
        >
          <Check className="size-10 text-mint-deep" strokeWidth={3} />
        </motion.div>
        <p className="mt-4 text-xl font-semibold">Call booked!</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
          Thank you, {person.trim()}. The meeting details for {school.trim()} will be sent to {email.trim()}.
        </p>
        <PrimaryButton className="mx-auto mt-6 w-full max-w-xs" onClick={closeSheet}>
          Done
        </PrimaryButton>
      </motion.div>
    );
  }

  return (
    <form
      className="space-y-5 pt-1"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid || busy) return;
        setBusy(true);
        setError(null);
        try {
          await bookSchool({
            plan,
            school_name: school.trim(),
            contact_name: person.trim(),
            email: email.trim().toLowerCase(),
            mobile: mobile.trim() || null,
            preferred_at: new Date(when).toISOString(),
          });
          setDone(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <SheetHeader title={`Book ${planName}`} subtitle="School Edition · book a call or meeting with us to set up your school." />
      <Field label="School name">
        <input autoFocus value={school} onChange={(e) => setSchool(e.target.value)} placeholder="e.g. Bethany Christian School" className={inputCls} />
      </Field>
      <Field label="Principal or person in charge">
        <input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="e.g. Maria Santos" className={inputCls} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="principal@school.edu.ph"
            autoCapitalize="none"
            className={inputCls}
          />
        </Field>
        <Field label="Mobile number (optional)">
          <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="0917 123 4567" className={inputCls} />
        </Field>
      </div>
      <Field label="Preferred date and time for the call">
        <input type="datetime-local" min={minWhen} value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} />
      </Field>

      <p className="flex items-start gap-2 rounded-2xl bg-lilac-soft p-3 text-sm text-lilac-deep">
        <Mail className="mt-0.5 size-4 shrink-0" />
        The meeting details (time and link) will be sent to your email.
      </p>

      <ErrorNote message={error} />
      <PrimaryButton type="submit" className="w-full" disabled={!valid} loading={busy}>
        <CalendarClock className="size-4" /> Book {planName}
      </PrimaryButton>
    </form>
  );
}
