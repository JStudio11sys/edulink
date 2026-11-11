// EduLink — grade Edge Function (Phase 4)
//
// Scores one student's work on one activity:
//   1. Gemini reads the photo + transcribed text and returns the student's answer
//      for every objective item (in order, per part) and suggested rubric points for essays.
//   2. Objective answers are compared to the PRIVATE answer key here on the server.
//   3. The result is saved to activity_scores (unconfirmed) and returned.
//
// Only the activity's teacher (or admin) can call it. Students never see scores.
// Secrets: GEMINI_API_KEY (required), GRADE_MODEL or GEMINI_MODEL (optional).
// Deploy with "Verify JWT" OFF (the function checks the login itself).
//
// Body: { "activity_id": "<uuid>", "student_id": "<uuid>" }

import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const TIMEOUT_MS = 60_000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (message: string, status = 400) => json({ error: message }, status);

type PartType = "truefalse" | "multiple" | "matching" | "essay";
interface Criterion { id: string; label: string; description: string; points: number }
interface Question { id: string; prompt: string; rubric: Criterion[] }
interface Part { id: string; type: PartType; title: string; instructions: string; items: number; points: number; choices: number; questions: Question[] }

const letters = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));

function normalize(type: PartType, v: unknown): string | null {
  if (v === null || v === undefined) return null;
  let s = String(v).trim().toUpperCase();
  if (!s) return null;
  if (type === "truefalse") {
    if (s.startsWith("T")) return "T";
    if (s.startsWith("F")) return "F";
    return null;
  }
  s = s.replace(/[^A-Z]/g, "");
  return s ? s[0] : null;
}

function buildPrompt(parts: Part[], text: string) {
  const outline = parts.map((p) =>
    p.type === "essay"
      ? {
          part_id: p.id,
          title: p.title,
          type: "essay",
          instructions: p.instructions,
          questions: p.questions.map((q) => ({
            question_id: q.id,
            prompt: q.prompt,
            rubric: q.rubric.map((c) => ({ criterion_id: c.id, label: c.label, description: c.description, max_points: c.points })),
          })),
        }
      : {
          part_id: p.id,
          title: p.title,
          type: p.type,
          instructions: p.instructions,
          items: p.items,
          allowed_answers: p.type === "truefalse" ? ["T", "F"] : letters(p.choices),
        },
  );

  return `You are helping a teacher check a student's handwritten test.
You get: the photo(s) of the paper (pages in order — the first photo is page 1), a transcription of the handwriting, and the test outline.

TEST OUTLINE (JSON):
${JSON.stringify(outline)}

TRANSCRIPTION (may contain reading mistakes — trust the photo when they differ):
"""
${text}
"""

Return ONLY JSON in exactly this shape:
{
  "objective": [ { "part_id": "...", "answers": ["T", "F", null, ...] } ],
  "essays": [ { "part_id": "...", "question_id": "...", "criteria": [ { "criterion_id": "...", "points": 0, "reason": "..." } ] } ],
  "notes": "short note for the teacher, e.g. unreadable items or a missing page; empty if none"
}

Rules:
- For every objective part, "answers" has exactly "items" entries, in item order (item 1 first).
  Item numbering usually restarts for each part; use the part titles/instructions and the paper layout to match items to parts.
- Each answer must be one of that part's "allowed_answers", or null if blank, crossed out or unreadable.
  For True/False, convert words like "True"/"Tama"/"✓" to "T" and "False"/"Mali"/"✗" to "F".
- Copy what the STUDENT wrote. Do not correct it and do not guess the right answer.
- For essays, give each rubric criterion points from 0 to its max_points based only on what the student wrote,
  with a one-sentence reason. If no answer was written, give 0.`;
}

async function callGemini(apiKey: string, model: string, body: unknown) {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return fail("Scoring is not configured (missing GEMINI_API_KEY).", 500);
  const model = Deno.env.get("GRADE_MODEL") || Deno.env.get("GEMINI_MODEL") || "gemini-flash-lite-latest";

  const url = Deno.env.get("SUPABASE_URL")!;
  const asCaller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData } = await asCaller.auth.getUser();
  if (!userData.user) return fail("Not signed in", 401);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  let activityId: string, studentId: string;
  try {
    ({ activity_id: activityId, student_id: studentId } = await req.json());
  } catch {
    return fail("Invalid JSON");
  }
  if (!activityId || !studentId) return fail("Missing activity_id or student_id.");

  // Caller must be this activity's teacher (or admin)
  const [{ data: caller }, { data: activity }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", userData.user.id).single(),
    admin.from("activities").select("id, teacher_id, parts").eq("id", activityId).single(),
  ]);
  if (!activity) return fail("Activity not found.", 404);
  if (caller?.role !== "admin" && activity.teacher_id !== userData.user.id) return fail("Not allowed", 403);

  const parts = (Array.isArray(activity.parts) ? activity.parts : []) as Part[];
  if (!parts.length) return fail("This activity has no test parts to score.");

  const [{ data: keyRow }, { data: submission }] = await Promise.all([
    admin.from("activity_keys").select("answers").eq("activity_id", activityId).maybeSingle(),
    admin.from("submissions").select("text, image_path, image_paths").eq("activity_id", activityId).eq("student_id", studentId).maybeSingle(),
  ]);
  if (!submission) return fail("No submission yet for this student.");
  const key = (keyRow?.answers ?? {}) as Record<string, string[]>;

  // Every page, in order → base64 (the photos help when the transcription misread something)
  const paths: string[] =
    Array.isArray(submission.image_paths) && submission.image_paths.length ? submission.image_paths : [submission.image_path];
  const imageParts: unknown[] = [];
  for (const path of paths) {
    const { data: blob } = await admin.storage.from("submissions").download(path);
    if (!blob) continue;
    const b64 = encodeBase64(new Uint8Array(await blob.arrayBuffer()));
    imageParts.push({ inline_data: { mime_type: blob.type || "image/jpeg", data: b64 } });
  }

  const contents = [{ parts: [...imageParts, { text: buildPrompt(parts, submission.text ?? "") }] }];
  const genBase = { temperature: 0, responseMimeType: "application/json" };

  let res: Response, data: any;
  try {
    res = await callGemini(apiKey, model, { contents, generationConfig: { ...genBase, thinkingConfig: { thinkingBudget: 0 } } });
    data = await res.json().catch(() => null);
    if (res.status === 400) {
      res = await callGemini(apiKey, model, { contents, generationConfig: genBase });
      data = await res.json().catch(() => null);
    }
  } catch (e) {
    console.error("Gemini failed", e);
    return fail("Scoring took too long. Please try again.", 504);
  }
  if (!res.ok) {
    console.error("Gemini error", res.status, JSON.stringify(data));
    if (res.status === 429) return fail("The AI is busy (free limit). Please wait a minute and try again.", 429);
    return fail(`Scoring is unavailable right now (${res.status}).`, 502);
  }

  const raw = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  let ai: any;
  try {
    ai = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    console.error("Unparseable AI output", raw);
    return fail("The AI's answer couldn't be read. Please try again.", 502);
  }

  // Compare to the key and build the details
  const detailParts = parts.map((p) => {
    if (p.type === "essay") {
      const questions = p.questions.map((q) => {
        const found = (ai.essays ?? []).find((e: any) => e.part_id === p.id && e.question_id === q.id);
        const criteria = q.rubric.map((c) => {
          const got = (found?.criteria ?? []).find((x: any) => x.criterion_id === c.id);
          const pts = Math.max(0, Math.min(c.points, Number(got?.points) || 0));
          return { criterion_id: c.id, label: c.label, max: c.points, points: pts, reason: String(got?.reason ?? "") };
        });
        const max = criteria.reduce((s, c) => s + c.max, 0);
        const score = criteria.reduce((s, c) => s + c.points, 0);
        return { question_id: q.id, prompt: q.prompt, criteria, score, max };
      });
      return {
        part_id: p.id,
        title: p.title,
        type: p.type,
        questions,
        score: questions.reduce((s, q) => s + q.score, 0),
        max: questions.reduce((s, q) => s + q.max, 0),
      };
    }
    const found = (ai.objective ?? []).find((o: any) => o.part_id === p.id);
    const items = Array.from({ length: p.items }, (_, i) => {
      const answer = normalize(p.type, found?.answers?.[i]);
      const correctAnswer = key[p.id]?.[i] || "";
      return { n: i + 1, answer, key: correctAnswer, correct: !!answer && !!correctAnswer && answer === correctAnswer };
    });
    const score = items.filter((it) => it.correct).length * p.points;
    return { part_id: p.id, title: p.title, type: p.type, points_each: p.points, items, score, max: p.items * p.points };
  });

  const score = detailParts.reduce((s, p) => s + p.score, 0);
  const max = detailParts.reduce((s, p) => s + p.max, 0);
  const details = { parts: detailParts, notes: String(ai.notes ?? ""), model };

  const { error: saveErr } = await admin.from("activity_scores").upsert(
    { activity_id: activityId, student_id: studentId, score, max_score: max, details, confirmed: false, graded_at: new Date().toISOString() },
    { onConflict: "activity_id,student_id" },
  );
  if (saveErr)
    return fail(
      /relation .* does not exist|schema cache/i.test(saveErr.message)
        ? "Scores aren't set up yet — run 0010_activity_scores.sql in Supabase."
        : saveErr.message,
      500,
    );

  return json({ score, max_score: max, details, confirmed: false });
});
