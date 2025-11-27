// app/context/ProgressContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type CoachLog = {
  time: string;
  text: string;
};

type ProgressContextType = {
  points: number;
  addPoints: (pt: number) => void;
  coachLogs: CoachLog[];
  addCoachLog: (text: string) => void;
};

const ProgressContext = createContext<ProgressContextType | undefined>(
  undefined
);

export const ProgressProvider = ({ children }: { children: React.ReactNode }) => {
  const [points, setPoints] = useState(0);
  const [coachLogs, setCoachLogs] = useState<CoachLog[]>([]);

  // 앱 켤 때 저장된 포인트 불러오기
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("stepup_points");
      if (saved) {
        setPoints(Number(saved));
      }
    })();
  }, []);

  const addPoints = async (pt: number) => {
    setPoints((prev) => {
      const next = prev + pt;
      // 저장도 같이
      AsyncStorage.setItem("stepup_points", String(next));
      return next;
    });
  };

  const addCoachLog = (text: string) => {
    const newLog: CoachLog = {
      time: new Date().toISOString(),
      text,
    };
    setCoachLogs((prev) => [newLog, ...prev]);
  };

  return (
    <ProgressContext.Provider
      value={{ points, addPoints, coachLogs, addCoachLog }}
    >
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error("useProgress must be used within ProgressProvider");
  }
  return ctx;
};
