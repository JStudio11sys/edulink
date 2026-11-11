"use client";

import { MotionConfig } from "motion/react";
import { StoreProvider } from "@/lib/store";
import { DesktopShell } from "./desktop/DesktopShell";
import { MobileShell } from "./mobile/MobileShell";
import { Sheet } from "./Sheet";

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <DesktopShell />
        <MobileShell />
        <Sheet />
      </StoreProvider>
    </MotionConfig>
  );
}
