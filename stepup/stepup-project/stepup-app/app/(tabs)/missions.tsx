// app/(tabs)/missions.tsx
import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Button,
  StyleSheet,
} from "react-native";
import { useProgress } from "../context/ProgressContext";

type Mission = {
  id: string;
  title: string;
  reward: number;
  done: boolean;
};

const INITIAL_MISSIONS: Mission[] = [
  { id: "1", title: "5,000보 걷기", reward: 10, done: false },
  { id: "2", title: "물 5잔 마시기", reward: 5, done: false },
  { id: "3", title: "스트레칭 5분", reward: 3, done: false },
];

export default function MissionsScreen() {
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);
  const { addPoints, addCoachLog } = useProgress();

  const completeMission = (id: string) => {
    const updated = missions.map((m) => {
      if (m.id === id && !m.done) {
        // 1) 포인트 올리고
        addPoints(m.reward);
        // 2) 코치 로그도 남기고
        addCoachLog(`미션 완료: ${m.title} (+${m.reward}pt)`);
        return { ...m, done: true };
      }
      return m;
    });
    setMissions(updated);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>오늘 미션</Text>
      <FlatList
        data={missions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.missionBox, item.done && styles.doneBox]}>
            <Text style={styles.missionTitle}>{item.title}</Text>
            <Text>보상: {item.reward} pt</Text>
            {item.done ? (
              <Text style={styles.doneText}>완료됨 ✅</Text>
            ) : (
              <Button title="완료" onPress={() => completeMission(item.id)} />
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f2", padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  missionBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  missionTitle: { fontSize: 16, marginBottom: 4 },
  doneBox: { opacity: 0.6 },
  doneText: { marginTop: 6, color: "green", fontWeight: "bold" },
});
