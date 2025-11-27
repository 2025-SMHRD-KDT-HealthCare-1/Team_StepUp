// app/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { ProgressProvider } from "./context/ProgressContext"; // ← 여기! ./ 로 시작

export default function RootLayout() {
  return (
    <ProgressProvider>
      <Stack />
    </ProgressProvider>
  );
}
