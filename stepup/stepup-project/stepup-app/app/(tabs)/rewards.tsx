// app/(tabs)/rewards.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { commonStyles } from '../styles/common';

export default function RewardsScreen() {
  return (
    <View style={commonStyles.screen}>
      <Text style={commonStyles.title}>보상함</Text>
      <Text style={commonStyles.sub}>지금은 데모라서 받은 보상만 보여줄게요.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>5,000보 달성 보너스</Text>
        <Text style={styles.cardText}>+10 포인트 · 2025-11-06</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>물 5잔 미션 완료</Text>
        <Text style={styles.cardText}>+5 포인트 · 2025-11-06</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>스트레칭 5분</Text>
        <Text style={styles.cardText}>+3 포인트 · 2025-11-06</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
    color: '#0f172a',
  },
  cardText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
