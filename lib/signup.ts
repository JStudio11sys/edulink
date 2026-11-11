import { supabase } from "./supabase";

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
export const validUsername = (u: string) => USERNAME_RE.test(u);

/** true = nobody has this username yet. */
export async function usernameAvailable(username: string) {
  const { data, error } = await supabase.rpc("username_available", { u: username });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/**
 * Create a teacher account. Supabase emails a 6-digit code; the account works after verifyCode().
 * Returns needsCode = false if email confirmation is turned off (signed in right away).
 */
export async function signUpTeacher(input: { fullName: string; username: string; email: string; password: string }) {
  const username = input.username.trim().toLowerCase();
  if (!validUsername(username)) throw new Error("Username must be 3–32 characters: lowercase letters, numbers, dot, dash or underscore.");
  if (!(await usernameAvailable(username))) throw new Error("That username is taken. Try another one.");

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: { data: { signup_role: "teacher", full_name: input.fullName.trim(), username } },
  });
  if (error) {
    if (/registered|already/i.test(error.message)) throw new Error("An account with this email already exists. Try logging in.");
    if (/signups not allowed|disabled/i.test(error.message)) throw new Error("Sign-ups are turned off in Supabase (Authentication → Sign In / Providers).");
    if (/database error/i.test(error.message)) throw new Error("Couldn't create the account (the username may have just been taken). Please try again.");
    throw new Error(error.message);
  }
  // With "Confirm email" on, Supabase returns a user but no session until the code is entered.
  // (An existing, already-confirmed email also returns no session and no identities.)
  if (data.user && data.user.identities && data.user.identities.length === 0)
    throw new Error("An account with this email already exists. Try logging in.");
  return { needsCode: !data.session };
}

/** Confirm the 6-digit code from the email — signs the teacher in. */
export async function verifyCode(email: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "signup" });
  if (error) throw new Error(/expired|invalid/i.test(error.message) ? "That code is wrong or has expired. Check the email or send a new code." : error.message);
}

export async function resendCode(email: string) {
  const { error } = await supabase.auth.resend({ type: "signup", email: email.trim().toLowerCase() });
  if (error) throw new Error(/rate|seconds/i.test(error.message) ? "Please wait a bit before asking for another code." : error.message);
}
