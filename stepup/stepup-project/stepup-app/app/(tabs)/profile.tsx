// app/(tabs)/profile.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { commonStyles } from '../styles/common';

export default function ProfileScreen() {
  return (
    <View style={commonStyles.screen}>
      <Text style={commonStyles.title}>내 정보</Text>
      <Text style={commonStyles.sub}>데모 버전이라 기본 정보만 보여줄게요.</Text>

      <View style={styles.box}>
        <Text style={styles.label}>이름</Text>
        <Text style={styles.value}>Step Up 사용자</Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>오늘 목표 걸음수</Text>
        <Text style={styles.value}>5,000 보</Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>현재 포인트</Text>
        <Text style={styles.value}>18 pt</Text>
      </View>

      <Text style={styles.hint}>
        (나중에 실제 로그인/파이어베이스 붙이면 여기서 불러오게 하면 됨)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  hint: {
    marginTop: 14,
    fontSize: 11,
    color: '#94a3b8',
  },
});
