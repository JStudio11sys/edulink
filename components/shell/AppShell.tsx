"use client";

import { ClipboardList, Compass, Eye, LayoutGrid, LogOut, School, Settings, User, Users, type LucideIcon } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect } from "react";
import { useAuth, useMe, useReadOnly } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { easeOutExpo, snappy, spring } from "@/lib/motion";
import { useUI, type PageId } from "@/lib/store";
import type { Role } from "@/lib/types";
import { useDirection } from "@/lib/useDirection";
import { useIsDesktop } from "@/lib/useMedia";
import { DesktopDashboard } from "../dashboard/DesktopDashboard";
import { MobileHome } from "../dashboard/MobileHome";
import { Logo } from "../Logo";
import { SettingsPage } from "../pages/SettingsPage";
import { ProfilePage } from "../pages/ProfilePage";
import { StudentsPage } from "../pages/StudentsPage";
import { StudentActivities } from "../student/StudentActivities";
import { StudentHome } from "../student/StudentHome";
import { StudentProfile } from "../student/StudentProfile";
import { SectionsPage } from "../classes/SectionsPage";
import { TasksPage } from "../tasks/TasksPage";
import { TeachersPage } from "../pages/TeachersPage";
import { Avatar } from "../ui";
import { Credit } from "../Credit";
import { PlanPage, TrialBadge } from "../billing/Plans";
import { access, getSubscription } from "@/lib/billing";
import { useQuery } from "@/lib/useQuery";
import { useGuide } from "@/lib/guide";
import { GuideOverlay } from "../guide/GuideOverlay";

type NavItem = { id: PageId; label: string; icon: LucideIcon };

const NAV: Record<Role, NavItem[]> = {
  admin: [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "profile", label: "Profile", icon: User },
  ],
  teacher: [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { id: "tasks", label: "Tasks", icon: ClipboardList },
    { id: "sections", label: "Sections", icon: School },
    { id: "students", label: "Students", icon: Users },
    { id: "profile", label: "Profile", icon: User },
  ],
  student: [
    { id: "dashboard", label: "Home", icon: LayoutGrid },
    { id: "activities", label: "Activities", icon: ClipboardList },
    { id: "profile", label: "Profile", icon: User },
  ],
};

function PageView({ role, page, isDesktop }: { role: Role; page: PageId; isDesktop: boolean }) {
  if (role === "student") {
    if (page === "activities") return <StudentActivities />;
    if (page === "profile") return <StudentProfile />;
    return <StudentHome />;
  }
  switch (page) {
    case "dashboard":
      return isDesktop ? <DesktopDashboard /> : <MobileHome />;
    case "settings":
      return <SettingsPage />;
    case "teachers":
      return <TeachersPage />;
    case "students":
      return <StudentsPage />;
    case "tasks":
      return <TasksPage />;
    case "sections":
      return <SectionsPage />;
    case "activities":
      return <SectionsPage />;
    case "profile":
      return <ProfilePage />;
  }
}

export function AppShell() {
  const me = useMe();
  const { viewAs } = useAuth();
  if (viewAs) {
    // Admin viewing as a teacher: no billing check, a bar to exit
    return (
      <>
        <ViewingBar />
        <Shell />
      </>
    );
  }
  return me.role === "teacher" ? (
    <BillingGate>
      <Shell />
      <GuideOverlay />
    </BillingGate>
  ) : (
    <Shell />
  );
}

/** Teachers need an active trial or plan; otherwise they see the plan page. */
function BillingGate({ children }: { children: React.ReactNode }) {
  const { dataVersion, bumpData } = useUI();
  const q = useQuery(() => getSubscription(), [dataVersion]);
  if (q.loading && q.data === undefined) return <div className="min-h-dvh" />;
  if (q.error) {
    // Billing tables not set up yet → don't lock anyone out
    return <>{children}</>;
  }
  const sub = q.data ?? null;
  const a = access(sub);
  if (!a.ok && a.reason !== "active") return <PlanPage sub={sub} reason={a.reason} onDone={bumpData} />;
  return <>{children}</>;
}

function Shell() {
  const me = useMe();
  const { page, setPage, sheet } = useUI();
  const isDesktop = useIsDesktop();
  const items = NAV[me.role];
  const current = page && items.some((i) => i.id === page) ? page : items[0].id;
  const dir = useDirection(items.findIndex((i) => i.id === current));

  useEffect(() => {
    if (page !== current) setPage(current);
  }, [page, current, setPage]);

  if (isDesktop) {
    return (
      <LayoutGroup id="desktop">
        <div className="flex h-dvh min-h-[600px] gap-4 p-4">
          <Sidebar items={items.filter((i) => i.id !== "profile")} current={current} onSelect={setPage} />
          <main className="relative z-10 min-w-0 flex-1">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current}
                className="thin-scroll absolute inset-0 overflow-y-auto"
                initial={{ opacity: 0, scale: 0.985, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
                exit={{ opacity: 0, scale: 0.985, filter: "blur(8px)" }}
                transition={{ duration: 0.3, ease: easeOutExpo }}
              >
                <PageView role={me.role} page={current} isDesktop={isDesktop} />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </LayoutGroup>
    );
  }

  return (
    <LayoutGroup id="mobile">
      <div className="fixed inset-0 bg-ink">
        {/* iOS-style: the page recedes when a sheet opens */}
        <motion.div
          animate={sheet ? { scale: 0.93, y: 8, borderRadius: 28 } : { scale: 1, y: 0, borderRadius: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 38 }}
          className="relative h-full overflow-hidden bg-canvas"
        >
          <AnimatePresence initial={false} custom={dir}>
            <motion.div
              key={current}
              custom={dir}
              variants={{
                enter: (d: number) => ({ x: d * 48, opacity: 0, filter: "blur(6px)" }),
                center: { x: 0, opacity: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } },
                exit: (d: number) => ({ x: d * -48, opacity: 0, filter: "blur(6px)" }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ ...spring, opacity: { duration: 0.2 } }}
              className="no-scrollbar absolute inset-0 overflow-y-auto"
            >
              <div className="mx-auto max-w-2xl">
                <PageView role={me.role} page={current} isDesktop={isDesktop} />
              </div>
            </motion.div>
          </AnimatePresence>
          <TabBar items={items} current={current} onSelect={setPage} />
        </motion.div>
      </div>
    </LayoutGroup>
  );
}

function Sidebar({ items, current, onSelect }: { items: NavItem[]; current: PageId; onSelect: (p: PageId) => void }) {
  const me = useMe();
  const readOnly = useReadOnly();
  const { signOut } = useAuth();
  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={spring}
      className="isolate flex w-[76px] shrink-0 flex-col rounded-card bg-white p-3 xl:w-[232px] xl:p-4"
    >
      <div className="mb-6 flex items-center gap-3 px-1.5 pt-1">
        <motion.div whileHover={{ rotate: -8, scale: 1.06 }} transition={snappy} className="shrink-0">
          <Logo size={40} />
        </motion.div>
        <span className="hidden text-lg font-semibold xl:inline">EduLink</span>
      </div>

      <nav className="space-y-1">
        {items.map((it) => (
          <NavButton key={it.id} item={it} active={it.id === current} onClick={() => onSelect(it.id)} />
        ))}
      </nav>

      <div className="mt-auto space-y-1">
        {me.role === "teacher" && !readOnly && <StartGuideButton />}
        {me.role === "teacher" && !readOnly && <TrialBadge onClick={() => onSelect("profile")} />}
        <div className="text-center">
          <Credit className="hidden xl:inline-flex" />
          <Credit compact className="xl:hidden" />
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect("profile")}
          title="Profile"
          className={cn(
            "flex w-full items-center justify-center gap-3 rounded-2xl p-2 text-left transition-colors xl:justify-start",
            current === "profile" ? "bg-soft" : "hover:bg-soft",
          )}
        >
          <Avatar name={me.full_name} size={36} />
          <span className="hidden min-w-0 xl:block">
            <span className="block truncate text-[13px] font-medium">{me.full_name}</span>
            <span className="block text-[11px] text-muted capitalize">{me.role}</span>
          </span>
        </motion.button>
        <NavButton item={{ id: "profile", label: "Log out", icon: LogOut }} active={false} onClick={signOut} />
      </div>
    </motion.aside>
  );
}

/** Admin viewing as a teacher: who, view only, and a way back. */
function ViewingBar() {
  const { viewAs, setViewAs } = useAuth();
  const { setPage } = useUI();
  if (!viewAs) return null;
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={spring}
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center pt-[max(8px,env(safe-area-inset-top))]"
    >
      <div className="pointer-events-auto flex max-w-[calc(100vw-24px)] items-center gap-2 rounded-full bg-ink py-1.5 pr-1.5 pl-4 text-sm text-white shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)]">
        <Eye className="size-4 shrink-0" />
        <span className="min-w-0 truncate">
          Viewing as <b className="font-semibold">{viewAs.full_name}</b>
          <span className="text-white/60"> · view only</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setPage("settings");
            setViewAs(null);
          }}
          className="h-9 shrink-0 rounded-full bg-white px-4 text-sm font-medium text-ink max-lg:h-11"
        >
          Exit
        </button>
      </div>
    </motion.div>
  );
}

/** Shiny button that restarts the first-time guide. */
function StartGuideButton() {
  const guide = useGuide();
  if (!guide) return null;
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={snappy}
      onClick={guide.restart}
      title="Start Guide"
      className="relative mb-1 flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#2FB3B0] via-[#8CBF6C] to-[#F0B429] text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(47,179,176,0.7)]"
    >
      {/* moving shine */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent"
        initial={{ left: "-60%" }}
        animate={{ left: "130%" }}
        transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.8, ease: "easeInOut" }}
      />
      <Compass className="relative size-[18px] shrink-0" />
      <span className="relative hidden xl:inline">Start Guide</span>
    </motion.button>
  );
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <motion.button
      data-guide={`nav-${item.id}`}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      transition={snappy}
      title={item.label}
      className={cn(
        "group relative flex w-full items-center justify-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 xl:justify-start",
        active ? "text-white" : "text-ink-2",
      )}
    >
      {active ? (
        <motion.span layoutId="sidebar-active" className="absolute inset-0 rounded-2xl bg-ink" transition={spring} />
      ) : (
        <span className="absolute inset-0 rounded-2xl bg-soft opacity-0 transition-opacity group-hover:opacity-100" />
      )}
      <Icon className="relative z-10 size-[18px] shrink-0" />
      <span className="relative z-10 hidden xl:inline">{item.label}</span>
    </motion.button>
  );
}

function TabBar({ items, current, onSelect }: { items: NavItem[]; current: PageId; onSelect: (p: PageId) => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-[max(16px,env(safe-area-inset-bottom))]">
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...spring, delay: 0.2 }}
        className="pointer-events-auto flex gap-1 rounded-full bg-ink/95 p-1.5 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      >
        {items.map((t) => {
          const Icon = t.icon;
          const on = t.id === current;
          return (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.85 }}
              transition={snappy}
              onClick={() => onSelect(t.id)}
              aria-label={t.label}
              data-guide={`nav-${t.id}`}
              className="relative grid size-12 place-items-center rounded-full"
            >
              {on && <motion.span layoutId="tab-active" transition={spring} className="absolute inset-0 rounded-full bg-white" />}
              <Icon className={cn("relative z-10 size-5 transition-colors duration-300", on ? "text-ink" : "text-white/70")} />
            </motion.button>
          );
        })}
      </motion.nav>
    </div>
  );
}
