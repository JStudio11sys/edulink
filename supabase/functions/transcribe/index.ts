// EduLink — transcribe Edge Function
//
// Reads handwriting from a photo using Google Gemini (free tier via
// Google AI Studio) and returns the text exactly as written.
// Signed-in students and teachers can call it. The photo is not stored here;
// the app uploads it to Storage only when the student submits.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   GEMINI_API_KEY   required — from aistudio.google.com
//   GEMINI_MODEL     optional — defaults to "gemini-flash-lite-latest" (fast)
//
// Body (JSON): { "images": ["<base64 page 1>", "<page 2>", ...] }  (or the older { "image": "..." })
// Returns:     { "text": "..." }

import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_BASE64_CHARS = 8_000_000; // ~6 MB per page
const MAX_PAGES = 10;
const TIMEOUT_MS = 60_000; // give up on Gemini after 60 s

const PROMPT = `You are transcribing a student's handwritten schoolwork from a photo.
Rules:
- Write out exactly what is handwritten, word for word.
- Do NOT correct spelling, grammar, math or answers — the teacher grades the original.
- Keep the student's line breaks, numbering and order.
- Numbered answers (like a test answer sheet) go one per line in number order (1, 2, 3, …),
  even when they are written in two or more columns. Put the name on its own first line.
- Write math in plain text (e.g. 3x + 2 = 11, x^2, 1/2).
- If a word is unreadable, write [?] in its place.
- Ignore printed text on the paper (like worksheet headings) unless the student wrote on it.
- Output only the transcription. No comments, no headings, no quotes.
- If there is no handwriting, output nothing.`;

const MULTI_PAGE = `
The photos are pages of ONE paper, in order: the first photo is page 1.
Transcribe them in that order. Start each page with its own line "Page 1", "Page 2", … and then that page's text.
Do not reorder pages, even if the numbering on the paper looks different.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (message: string, status = 400) => json({ error: message }, status);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return fail("Handwriting reader is not configured (missing GEMINI_API_KEY).", 500);
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-flash-lite-latest";

  // Caller must be a signed-in student or teacher
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return fail("Not signed in", 401);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  // Students read their own work; teachers read papers they photograph (face-to-face tests)
  if (profile?.role !== "student" && profile?.role !== "teacher") return fail("Not allowed to use the handwriting reader.", 403);

  let body: { image?: string; images?: string[] };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON");
  }
  const raw = (Array.isArray(body.images) ? body.images : body.image ? [body.image] : []).filter(
    (x): x is string => typeof x === "string" && x.length > 0,
  );
  if (!raw.length) return fail("Missing image.");
  if (raw.length > MAX_PAGES) return fail(`Too many pages (max ${MAX_PAGES}).`);

  const pages = raw.map((img) => ({
    mime: img.match(/^data:(image\/[\w+.-]+);base64,/)?.[1] ?? "image/jpeg",
    data: img.replace(/^data:image\/[\w+.-]+;base64,/, ""),
  }));
  if (pages.some((pg) => pg.data.length > MAX_BASE64_CHARS)) return fail("A page is too large. Please retake it.");

  const callGemini = (noThinking: boolean) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        contents: [
          {
            parts: [
              ...pages.map((pg) => ({ inline_data: { mime_type: pg.mime, data: pg.data } })),
              { text: pages.length > 1 ? PROMPT + MULTI_PAGE : PROMPT },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          // Transcribing doesn't need "thinking" — turning it off makes it much faster.
          ...(noThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
    });

  const started = Date.now();
  let res: Response;
  let data: any;
  try {
    res = await callGemini(true);
    data = await res.json().catch(() => null);
    // Some models don't accept thinkingBudget 0 ("invalid argument") — retry once without it.
    if (res.status === 400) {
      console.warn("Gemini rejected the request with thinking off; retrying without it", JSON.stringify(data));
      res = await callGemini(false);
      data = await res.json().catch(() => null);
    }
  } catch (e) {
    const timedOut = e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError");
    console.error("Gemini request failed", e);
    return fail(
      timedOut ? "Reading took too long. Please retake a clearer, closer photo and try again." : "Couldn't reach the handwriting reader.",
      504,
    );
  }
  console.log(`Gemini ${model} answered in ${Date.now() - started} ms (status ${res.status})`);

  if (!res.ok) {
    console.error("Gemini error", res.status, JSON.stringify(data));
    if (res.status === 429) return fail("The handwriting reader is busy. Please wait a minute and try again.", 429);
    if (res.status === 404) return fail(`Model "${model}" was not found. Set GEMINI_MODEL to a current model.`, 502);
    if (res.status === 400 || res.status === 403)
      return fail(`Handwriting reader setup problem: ${data?.error?.message ?? res.status}`, 502);
    return fail("The handwriting reader is unavailable right now. Please try again.", 502);
  }

  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();
  return json({ text });
});
