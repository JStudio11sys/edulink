import { callFunction } from "./api";
import { supabase } from "./supabase";

export type PlanId = "trial" | "monthly" | "yearly";

export interface Subscription {
  teacher_id: string;
  plan: PlanId;
  status: "active" | "canceled";
  trial_used: boolean;
  current_period_end: string;
  last_payment: { method: string; number: string; amount: number; reference: string; paid_at: string; demo?: boolean } | null;
}

/** The signed-in teacher's plan (null = never chose one). */
export async function getSubscription(): Promise<Subscription | null> {
  const { data, error } = await supabase.from("subscriptions").select("*").maybeSingle();
  if (error) throw new Error(/relation .* does not exist|schema cache/i.test(error.message) ? "Billing isn't set up yet — run 0012_signup_billing.sql." : error.message);
  return (data as Subscription | null) ?? null;
}

export const startTrial = () => callFunction<Subscription>("billing", { action: "start_trial" });

/** DEMO GCash payment — activates the plan without charging anything. */
export const payDemo = (plan: "monthly" | "yearly", number: string) =>
  callFunction<Subscription>("billing", { action: "pay", plan, method: "gcash", number });

/** Can the teacher use the app right now? */
export function access(sub: Subscription | null) {
  if (!sub) return { ok: false, reason: "new" as const, daysLeft: 0 };
  const ms = new Date(sub.current_period_end).getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(ms / 86_400_000));
  if (sub.status !== "active" || ms <= 0) return { ok: false, reason: (sub.plan === "trial" ? "trial_ended" : "plan_ended") as "trial_ended" | "plan_ended", daysLeft: 0 };
  return { ok: true, reason: "active" as const, daysLeft };
}

export const PLAN_LABEL: Record<PlanId, string> = { trial: "Free trial", monthly: "Monthly", yearly: "Yearly" };

/* ---------- Admin: everyone's plans + School Edition bookings ---------- */

const notSetUp = (m: string) => /relation .* does not exist|schema cache/i.test(m);

/** Admin: every teacher's subscription (the admin can read all). */
export async function getAllSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase.from("subscriptions").select("*");
  if (error) throw new Error(notSetUp(error.message) ? "Billing isn't set up yet — run 0012_signup_billing.sql." : error.message);
  return (data ?? []) as Subscription[];
}

/** A school's request for a call / meeting about School Edition. */
export interface SchoolBooking {
  id: string;
  plan: "school" | "school-premium";
  school_name: string;
  contact_name: string;
  email: string;
  mobile: string | null;
  preferred_at: string;
  status: "new" | "scheduled" | "done";
  created_at: string;
}

export const SCHOOL_PLAN_LABEL: Record<SchoolBooking["plan"], string> = {
  school: "School Package",
  "school-premium": "School Package Premium",
};

/** Landing page: send a booking (no account needed). */
export async function bookSchool(b: Pick<SchoolBooking, "plan" | "school_name" | "contact_name" | "email" | "mobile" | "preferred_at">) {
  const { error } = await supabase.from("school_bookings").insert(b);
  if (error) throw new Error(notSetUp(error.message) ? "Booking isn't available yet — please try again later." : error.message);
}

/** Admin: all bookings, soonest call first. */
export async function getSchoolBookings(): Promise<SchoolBooking[]> {
  const { data, error } = await supabase.from("school_bookings").select("*").order("preferred_at", { ascending: true });
  if (error) throw new Error(notSetUp(error.message) ? "Run 0015_school_bookings.sql to see bookings." : error.message);
  return (data ?? []) as SchoolBooking[];
}

export async function setBookingStatus(id: string, status: SchoolBooking["status"]) {
  const { error } = await supabase.from("school_bookings").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}
