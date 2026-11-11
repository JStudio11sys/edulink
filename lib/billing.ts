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
