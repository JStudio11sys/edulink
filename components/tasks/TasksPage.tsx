"use client";

import { PageBody, PageHeader } from "../shell/PageHeader";
import { Card } from "../ui";
import { TaskBoard } from "./TaskBoard";

/** Teacher: every task, grouped by subject + section — a shortcut instead of drilling through Sections. */
export function TasksPage() {
  return (
    <>
      <PageHeader title="Tasks" subtitle="All your tasks by subject and section" />
      <PageBody>
        <Card className="p-4 lg:p-5">
          <TaskBoard showSearch showSectionFilter layoutKey="tasks-page" />
        </Card>
      </PageBody>
    </>
  );
}
