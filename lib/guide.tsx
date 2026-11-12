"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

/**
 * First-time teacher guide.
 * Each step points at an element marked with data-guide="…".
 *  - "click": goes on when the teacher taps the highlighted element
 *  - { appear }: goes on when an element with that marker shows up (e.g. the new section card)
 *  - "next": goes on with the Next button
 * A step without a target shows as a centered card.
 */
export type GuideAdvance = "click" | "next" | { appear: string };

export interface GuideStep {
  target?: string;
  title: string;
  text: string;
  advance: GuideAdvance;
  /** Next stays disabled until an element with this marker is on screen. */
  require?: { target: string; hint: string };
  /** Extra picture inside the card. */
  illustration?: "checking";
}

export const GUIDE_STEPS: GuideStep[] = [
  // Part 1 – Section
  {
    target: "nav-sections",
    title: "Welcome! Let's set up your class",
    text: "First, make a section — your class group, like Grade 7 – Rizal. Tap Sections.",
    advance: "click",
  },
  {
    target: "section-add",
    title: "Add your first section",
    text: "Type the section name, then tap Add.",
    advance: { appear: "section-card" },
  },
  // Part 2 – Subject
  {
    target: "section-card",
    title: "Open your section",
    text: "Tap your new section to add a subject to it.",
    advance: "click",
  },
  {
    target: "add-subject",
    title: "Add a subject",
    text: "Tap Add subject.",
    advance: "click",
  },
  {
    target: "subject-sheet",
    title: "Name the subject",
    text: "Type the subject you teach in this section, e.g. English 7, then tap Add.",
    advance: { appear: "subject-tile" },
  },
  // Part 3 – Student
  {
    target: "nav-students",
    title: "Now add a student",
    text: "Tap Students.",
    advance: "click",
  },
  {
    target: "new-student",
    title: "New student",
    text: "Tap New student.",
    advance: "click",
  },
  {
    target: "student-names",
    title: "Student's name",
    text: "Type the last name and first name, then choose Female or Male.",
    advance: "next",
  },
  {
    target: "student-section",
    title: "Pick the section",
    text: "Choose the section you just made, so the student joins your class.",
    advance: "next",
  },
  {
    target: "student-create",
    title: "Create the student",
    text: "Tap Create student.",
    advance: { appear: "student-done" },
  },
  {
    target: "student-done",
    title: "Login details",
    text: "Copy these and give them to your student — they use them to sign in. Then tap Done.",
    advance: "click",
  },
  // Part 4 – Task
  {
    target: "nav-sections",
    title: "Back to your section",
    text: "Tap Sections.",
    advance: "click",
  },
  {
    target: "section-card",
    title: "Open your section",
    text: "Tap your section.",
    advance: "click",
  },
  {
    target: "section-students",
    title: "Your student is here",
    text: "Students you add to this section show up here.",
    advance: "next",
  },
  {
    target: "subject-tile",
    title: "Open the subject",
    text: "Tasks are made per subject. Tap your subject.",
    advance: "click",
  },
  {
    target: "new-activity",
    title: "Create a task",
    text: "Tap New activity.",
    advance: "click",
  },
  {
    target: "activity-title",
    title: "Title",
    text: "Give the task a name, e.g. Quiz 1 – Parts of speech.",
    advance: "next",
  },
  {
    target: "activity-category",
    title: "Category",
    text: "Pick Written Work/Oral, Performance Task, Summative or Assessment. It decides where the score goes in the class record.",
    advance: "next",
  },
  {
    target: "activity-mode",
    title: "At home or face to face",
    text: "At home: students take photos and submit. Face to face: you take photos of each student's paper. For this guide, choose Face to face.",
    advance: "next",
    require: { target: "activity-mode-f2f", hint: "Choose Face to face to continue." },
  },
  {
    target: "add-part",
    title: "Add a test part",
    text: "Tests can be True/False, Multiple choice, Matching or Essay (with a rubric). Tap Add a test part.",
    advance: "click",
  },
  {
    target: "part-type-truefalse",
    title: "Choose True / False",
    text: "For this guide, tap True / False.",
    advance: "click",
  },
  {
    target: "activity-test",
    title: "Answer key",
    text: "Keep 10 items, then tap T or F for 1–10. The answer key is only for you — EduLink scores papers with it.",
    advance: "next",
    require: { target: "activity-tf10", hint: "Add a True/False part with 10 items and answer all 10 to continue." },
  },
  {
    target: "activity-finish",
    title: "Save the task",
    text: "Set a due date if you like, then tap Create activity.",
    advance: { appear: "activity-card" },
  },
  {
    title: "How checking works",
    text: "This is what happens to every paper for this task.",
    advance: "next",
    illustration: "checking",
  },
  // Part 5 – Dashboard
  {
    target: "nav-dashboard",
    title: "Your dashboard",
    text: "Tap Dashboard.",
    advance: "click",
  },
  {
    target: "dashboard-weekly",
    title: "Weekly Ongoing Tasks",
    text: "This week's tasks and your students' work show here: to do, in progress and done.",
    advance: "next",
  },
  // Part 6 – Check a paper
  {
    target: "task-row",
    title: "Open your task",
    text: "Tap the task you made.",
    advance: "click",
  },
  {
    target: "task-student",
    title: "Pick a student",
    text: "Tap the student whose paper you want to check.",
    advance: "click",
  },
  {
    target: "paper-upload",
    title: "Add the test paper",
    text: "Take photos with the camera, or upload photos from your gallery. For this guide, tap Upload photos — we'll use a sample paper.",
    advance: "click",
  },
  {
    target: "paper-reading",
    title: "Reading the handwriting…",
    text: "EduLink is turning the handwriting into text. This takes a few seconds.",
    advance: { appear: "paper-text" },
  },
  {
    target: "paper-text",
    title: "Transcribed text",
    text: "Here's what EduLink read. Check it and fix anything it missed.",
    advance: "next",
  },
  {
    target: "paper-save",
    title: "Save the paper",
    text: "Tap Save paper.",
    advance: "click",
  },
  {
    target: "paper-confirm",
    title: "Lock it in",
    text: "After saving, the photos and text can't be changed. Tap Yes, save.",
    advance: "click",
  },
  {
    target: "task-row",
    title: "The task is done",
    text: "Your task now shows Done. Tap it again to see the score.",
    advance: "click",
  },
  {
    target: "task-student",
    title: "Open the student's paper",
    text: "Tap the student.",
    advance: "click",
  },
  {
    target: "work-paper",
    title: "Photo and text",
    text: "The paper and what EduLink read from it, side by side.",
    advance: "next",
  },
  {
    target: "work-checking",
    title: "Checking the answers…",
    text: "EduLink is comparing each answer with your answer key.",
    advance: { appear: "work-score" },
  },
  {
    target: "work-score",
    title: "AI score",
    text: "This is the score EduLink suggests. It's only a suggestion until you confirm it.",
    advance: "next",
  },
  {
    target: "work-items",
    title: "Check each item",
    text: "Green is right, red is wrong with the correct answer shown. Tap an item to change it. Tap View answer key to see all your answers.",
    advance: "next",
  },
  {
    target: "work-confirm",
    title: "Confirm the score",
    text: "Tap Confirm score to save it, or Check again to let EduLink re-check.",
    advance: "next",
  },
  {
    target: "work-feedback",
    title: "You're all set!",
    text: "Write feedback for the student here and mark it Checked. Students see your feedback, never the score.",
    advance: "next",
  },
];

interface GuideState {
  active: boolean;
  index: number;
  step: GuideStep;
  total: number;
  next: () => void;
  back: () => void;
  /** Skip or finish: hides the guide and remembers it. */
  end: () => void;
  restart: () => void;
}

const Ctx = createContext<GuideState | null>(null);

export function GuideProvider({ children }: { children: ReactNode }) {
  const { profile: me } = useAuth();
  const key = `edulink.guide.${me?.id ?? "none"}`;
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);

  // Start for teachers who haven't finished it (undefined = column not added yet → don't start).
  useEffect(() => {
    if (!me || me.role !== "teacher" || me.guide_done !== false) return;
    let saved = 0;
    try {
      saved = Number(sessionStorage.getItem(key)) || 0;
    } catch {
      /* storage blocked */
    }
    if (saved < 0) return; // ended in this tab
    setIndex(Math.min(saved, GUIDE_STEPS.length - 1));
    setActive(true);
  }, [me, key]);

  const save = useCallback(
    (i: number) => {
      try {
        sessionStorage.setItem(key, String(i));
      } catch {
        /* storage blocked */
      }
    },
    [key],
  );

  const end = useCallback(() => {
    setActive(false);
    save(-1);
    supabase.rpc("finish_guide").then(() => undefined);
  }, [save]);

  const next = useCallback(() => {
    if (index + 1 >= GUIDE_STEPS.length) return end();
    save(index + 1);
    setIndex(index + 1);
  }, [index, end, save]);

  const back = useCallback(() => {
    if (index === 0) return;
    save(index - 1);
    setIndex(index - 1);
  }, [index, save]);

  const restart = useCallback(() => {
    setIndex(0);
    save(0);
    setActive(true);
  }, [save]);

  const value = useMemo(
    () => ({ active, index, step: GUIDE_STEPS[index], total: GUIDE_STEPS.length, next, back, end, restart }),
    [active, index, next, back, end, restart],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Null outside the teacher shell. */
export function useGuide() {
  return useContext(Ctx);
}
