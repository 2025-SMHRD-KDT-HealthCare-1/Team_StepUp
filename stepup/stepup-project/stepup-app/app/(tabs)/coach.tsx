// app/(tabs)/coach.tsx
import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useProgress } from "../context/ProgressContext";

export default function CoachScreen() {
  const { coachLogs } = useProgress();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI 코치 로그</Text>
      <ScrollView style={styles.box}>
        {coachLogs.length === 0 ? (
          <Text>아직 기록이 없습니다. 미션을 완료해보세요.</Text>
        ) : (
          coachLogs.map((log, idx) => (
            <View key={idx} style={styles.logItem}>
              <Text style={styles.logText}>{log.text}</Text>
              <Text style={styles.timeText}>{log.time}</Text>
            </View>
          ))
        )}
      </ScrollView>
      <Text style={{ marginTop: 8, color: "#666" }}>
        (지금은 데모라서 AI는 아니고, 미션 완료 기록만 보여줘요)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  box: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
  },
  logItem: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 6,
  },
  logText: { fontSize: 16 },
  timeText: { fontSize: 11, color: "#888" },
});
