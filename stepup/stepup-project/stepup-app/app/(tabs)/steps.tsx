// app/(tabs)/steps.tsx
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { commonStyles } from '../styles/common';

export default function StepsScreen() {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [liveSteps, setLiveSteps] = useState(0);          // 화면 켠 이후 실시간
  const [todaySteps, setTodaySteps] = useState<number | null>(null); // iOS 전용
  const [debug, setDebug] = useState('');

  const goalSteps = 5000;

  useEffect(() => {
    let sub: { remove: () => void } | null = null;

    (async () => {
      const ok = await Pedometer.isAvailableAsync();
      setIsAvailable(ok);

      if (!ok) {
        setDebug('센서 없음');
        return;
      }

      // 1) 공통: 실시간 구독 (iOS/Android 둘 다)
      sub = Pedometer.watchStepCount((res) => {
        setLiveSteps(res.steps);
      });

      // 2) iOS에서만 “오늘 전체” 한 번 더 가져오기
      if (Platform.OS === 'ios') {
        try {
          const end = new Date();
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const res = await Pedometer.getStepCountAsync(start, end);
          setTodaySteps(res.steps);
          setDebug(`iOS 전체 걸음: ${res.steps}보`);
        } catch (e: any) {
          setDebug('iOS getStepCount 실패: ' + e?.message);
        }
      } else {
        // 안드로이드는 여기까지가 정상
        setDebug('Android: 실시간만 지원');
      }
    })();

    return () => {
      if (sub) sub.remove();
    };
  }, []);

  // 안드로이드: todaySteps가 null이니까 liveSteps로만 퍼센트 계산
  const base = todaySteps ?? liveSteps;
  const percent = Math.min(Math.round((base / goalSteps) * 100), 100);

  return (
    <ScrollView contentContainerStyle={commonStyles.screen}>
      <Text style={commonStyles.title}>걸음 기록</Text>
      <Text style={commonStyles.sub}>오늘 목표: {goalSteps.toLocaleString()} 보</Text>

      <Text style={styles.label}>
        센서 상태: {isAvailable === null ? '확인 중' : isAvailable ? '사용 가능' : '사용 불가'}
      </Text>

      {/* 실시간은 둘 다 공통 */}
      <Text style={styles.section}>실시간(이 화면 켠 이후)</Text>
      <Text style={styles.big}>{liveSteps} 보</Text>
      <Text style={styles.small}>달성률 {percent}%</Text>

      {/* iOS일 때만 보여줌 */}
      {todaySteps !== null && (
        <>
          <Text style={styles.section}>오늘 전체 (iOS)</Text>
          <Text>{todaySteps} 보</Text>
        </>
      )}

      <Text style={styles.debug}>{debug}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  section: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  big: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  small: {
    fontSize: 12,
    color: '#94a3b8',
  },
  debug: {
    fontSize: 11,
    backgroundColor: '#e2e8f0',
    padding: 8,
    borderRadius: 8,
    marginTop: 16,
    lineHeight: 16,
  },
});
