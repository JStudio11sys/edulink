"use client";

import { Check, Copy, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { manageUsers } from "@/lib/api";
import { suggestUsername } from "@/lib/format";
import { capitalizeWords } from "@/lib/names";
import { generatePassword } from "@/lib/password";
import { useUI } from "@/lib/store";
import type { Profile, Section } from "@/lib/types";
import { PasswordField } from "../PasswordField";
import { SheetHeader } from "../Sheet";
import { ErrorNote, Field, PrimaryButton, Segmented, ToggleChip, inputCls } from "../ui";

const ROLE_LABEL = { teacher: "teacher", student: "student" } as const;

/**
 * Create or edit a teacher (by admin) or a student (by teacher / admin).
 * Optional section picker for students (a student belongs to one section).
 */
export function AccountForm({
  role,
  existing,
  sections,
  currentSectionId = null,
  defaultSectionId,
  saveSection,
  onSaved,
  onDelete,
}: {
  role: "teacher" | "student";
  existing?: Profile;
  sections?: Section[];
  currentSectionId?: string | null;
  /** New student: start in this section. */
  defaultSectionId?: string;
  saveSection?: (userId: string, sectionId: string | null) => Promise<unknown>;
  onSaved: () => void;
  /** Shown as a "Delete" button at the bottom when editing. */
  onDelete?: () => void;
}) {
  const { closeSheet } = useUI();
  const isStudent = role === "student";
  const [fullName, setFullName] = useState(existing?.full_name ?? "");
  const [lastName, setLastName] = useState(existing?.last_name ?? "");
  const [firstName, setFirstName] = useState(existing?.first_name ?? "");
  const [sex, setSex] = useState<"female" | "male" | null>(existing?.sex ?? null);
  const [username, setUsername] = useState(existing?.username ?? "");
  const [usernameTouched, setUsernameTouched] = useState(!!existing);
  const [password, setPassword] = useState(existing ? "" : generatePassword());
  const [changePassword, setChangePassword] = useState(!existing);
  const [sectionId, setSectionId] = useState<string | null>(currentSectionId ?? defaultSectionId ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [done, setDone] = useState<{ username: string; password: string } | null>(null);

  const label = ROLE_LABEL[role];
  const nameOk = isStudent ? lastName.trim().length > 0 && firstName.trim().length > 0 && sex !== null : fullName.trim().length > 0;
  const displayFull = isStudent ? `${firstName.trim()} ${lastName.trim()}` : fullName.trim();
  const valid =
    nameOk &&
    /^[a-z0-9._-]{3,32}$/.test(username) &&
    (!changePassword || password.length >= 8);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      let id = existing?.id ?? createdId;
      if (!id) {
        const names = isStudent
          ? { first_name: firstName.trim(), last_name: lastName.trim(), sex, full_name: displayFull }
          : { full_name: fullName.trim() };
        const res = await manageUsers({ action: "create", role, username, password, ...names });
        id = res.id!;
        setCreatedId(id);
      } else if (existing) {
        const patch: {
          full_name?: string;
          first_name?: string;
          last_name?: string;
          sex?: "female" | "male" | null;
          username?: string;
          password?: string;
        } = {};
        if (isStudent) {
          if (firstName.trim() !== (existing.first_name ?? "") || lastName.trim() !== (existing.last_name ?? "")) {
            patch.first_name = firstName.trim();
            patch.last_name = lastName.trim();
          }
          if (sex !== (existing.sex ?? null)) patch.sex = sex;
        } else if (fullName.trim() !== existing.full_name) patch.full_name = fullName.trim();
        if (username !== existing.username) patch.username = username;
        if (changePassword) patch.password = password;
        if (Object.keys(patch).length) await manageUsers({ action: "update", id, ...patch });
      }
      if (saveSection && sectionId !== currentSectionId) await saveSection(id, sectionId);
      onSaved();
      if (!existing || changePassword) setDone({ username, password });
      else closeSheet();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {done ? (
        <Credentials key="done" name={displayFull} {...done} isNew={!existing} onDone={closeSheet} />
      ) : (
        <motion.form
          key="form"
          exit={{ opacity: 0, x: -20 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && !busy) submit();
          }}
          className="space-y-5 pt-1"
        >
          <SheetHeader
            title={existing ? `Edit ${label}` : `New ${label}`}
            subtitle={existing ? `@${existing.username}` : `They'll sign in with a username and password.`}
          />

          {isStudent ? (
            <div className="space-y-5" data-guide="student-names">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Last name">
                  <input
                    autoFocus={!existing}
                    value={lastName}
                    onChange={(e) => {
                      setLastName(capitalizeWords(e.target.value));
                      if (!usernameTouched) setUsername(suggestUsername(`${firstName} ${e.target.value}`));
                    }}
                    placeholder="e.g. Penduko"
                    className={inputCls}
                  />
                </Field>
                <Field label="First name">
                  <input
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(capitalizeWords(e.target.value));
                      if (!usernameTouched) setUsername(suggestUsername(`${e.target.value} ${lastName}`));
                    }}
                    placeholder="e.g. Pedro"
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Sex">
                <Segmented
                  layoutId="account-sex"
                  size="md"
                  grow
                  options={[
                    { value: "female", label: "Female" },
                    { value: "male", label: "Male" },
                  ]}
                  value={(sex ?? "") as "female" | "male"}
                  onChange={setSex}
                />
              </Field>
            </div>
          ) : (
            <Field label="Full name">
              <input
                autoFocus={!existing}
                value={fullName}
                onChange={(e) => {
                  setFullName(capitalizeWords(e.target.value));
                  if (!usernameTouched) setUsername(suggestUsername(e.target.value));
                }}
                placeholder="e.g. Anna Goodman"
                className={inputCls}
              />
            </Field>
          )}

          <Field label="Username" hint="Lowercase letters, numbers, dot, dash or underscore (3–32).">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted">@</span>
              <input
                value={username}
                onChange={(e) => {
                  setUsernameTouched(true);
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""));
                }}
                autoCapitalize="none"
                spellCheck={false}
                className={`${inputCls} pl-8`}
              />
            </div>
          </Field>

          {existing && (
            <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-soft px-4 py-3">
              <span className="text-sm font-medium">Set a new password</span>
              <input
                type="checkbox"
                checked={changePassword}
                onChange={(e) => {
                  setChangePassword(e.target.checked);
                  if (e.target.checked && !password) setPassword(generatePassword());
                }}
                className="size-5 accent-ink"
              />
            </label>
          )}

          <AnimatePresence initial={false}>
            {changePassword && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Field label="Password" hint="Tap the wand for an easy-to-type password.">
                  <PasswordField value={password} onChange={setPassword} />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>

          {sections && (
            <div data-guide="student-section">
            <Field label="Section">
              {sections.length === 0 ? (
                <p className="text-sm text-muted">No sections yet. Create one in Sections first.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  <ToggleChip on={sectionId === null} onClick={() => setSectionId(null)}>
                    None
                  </ToggleChip>
                  {sections.map((s) => (
                    <ToggleChip key={s.id} on={sectionId === s.id} onClick={() => setSectionId(s.id)}>
                      {s.name}
                    </ToggleChip>
                  ))}
                </div>
              )}
            </Field>
            </div>
          )}

          <ErrorNote message={error} />

          <PrimaryButton guide="student-create" type="submit" className="w-full" disabled={!valid} loading={busy}>
            {existing ? "Save changes" : `Create ${label}`}
          </PrimaryButton>
          {existing && onDelete && (
            <PrimaryButton variant="soft" className="w-full text-red-500" onClick={onDelete}>
              <Trash2 className="size-4" /> Delete {label}
            </PrimaryButton>
          )}
        </motion.form>
      )}
    </AnimatePresence>
  );
}

/** Shown after creating an account or resetting a password, so it can be shared. */
function Credentials({
  name,
  username,
  password,
  isNew,
  onDone,
}: {
  name: string;
  username: string;
  password: string;
  isNew: boolean;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const text = `EduLink login for ${name}\nUsername: ${username}\nPassword: ${password}`;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pt-1 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
        className="mx-auto grid size-16 place-items-center rounded-full bg-mint"
      >
        <Check className="size-8 text-mint-deep" strokeWidth={3} />
      </motion.div>
      <h3 className="mt-4 text-[22px] font-semibold">{isNew ? "Account created" : "Password updated"}</h3>
      <p className="mt-1 text-sm text-muted">Share these login details with {name}.</p>

      <div className="mt-5 space-y-2 rounded-2xl bg-soft p-4 text-left font-mono text-[15px]">
        <p>
          <span className="text-muted">Username </span>
          {username}
        </p>
        <p>
          <span className="text-muted">Password </span>
          {password}
        </p>
      </div>

      <div className="mt-5 flex gap-2">
        <PrimaryButton
          variant="soft"
          className="flex-1"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            } catch {
              /* clipboard blocked */
            }
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy details"}
        </PrimaryButton>
        <PrimaryButton guide="student-done" className="flex-1" onClick={onDone}>
          Done
        </PrimaryButton>
      </div>
    </motion.div>
  );
}
