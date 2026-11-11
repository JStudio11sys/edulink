/**
 * Landing-page pricing: ₱199/month, ₱1,499/year.
 * (Payments aren't connected yet; the buttons lead to teacher sign-up.)
 */
export const CURRENCY = "₱";

export const PLANS = [
  {
    id: "trial",
    name: "Free trial",
    price: 0,
    period: "for 7 days",
    blurb: "Try everything with your real classes.",
    features: ["All features included", "Unlimited sections & students", "AI checking of papers", "No card needed"],
    cta: "Start free trial",
    highlight: false,
  },
  {
    id: "monthly",
    name: "Monthly",
    price: 199,
    period: "per month",
    blurb: "Flexible — cancel anytime.",
    features: ["Everything in the trial", "AI checking & essay rubrics", "Student app for at-home work", "Email support"],
    cta: "Choose monthly",
    highlight: false,
  },
  {
    id: "yearly",
    name: "Yearly",
    price: 1499,
    period: "per year",
    blurb: "Best value — save ₱889 (over 4 months free).",
    features: ["Everything in Monthly", "Priority support", "Early access to new features", "One payment for the school year"],
    cta: "Choose yearly",
    highlight: true,
  },
] as const;
