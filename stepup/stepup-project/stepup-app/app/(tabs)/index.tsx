// app/(tabs)/index.tsx
import React from 'react';
import { ScrollView, View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { commonStyles } from '../styles/common';

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={commonStyles.screen}>
      {/* 위쪽 이미지 */}
      <Image
        style={styles.hero}
        source={{ uri: 'https://picsum.photos/600/300' }}
      />

      <Text style={commonStyles.title}>Step Up</Text>
      <Text style={commonStyles.sub}>오늘 해야 하는 것부터 들어가요</Text>

      {/* 큰 카드 */}
      <TouchableOpacity style={styles.bigCard} onPress={() => router.push('/missions')}>
        <Text style={styles.bigTitle}>오늘 미션 시작하기</Text>
        <Text style={styles.bigText}>할 일 목록 확인</Text>
      </TouchableOpacity>

      {/* 두 개씩 */}
      <View style={styles.row}>
        <TouchableOpacity style={styles.smallCard} onPress={() => router.push('/coach')}>
          <Text style={styles.cardTitle}>코치</Text>
          <Text style={styles.cardText}>AI 상담</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallCard} onPress={() => router.push('/steps')}>
          <Text style={styles.cardTitle}>걸음 기록</Text>
          <Text style={styles.cardText}>오늘 걸음수</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.smallCard} onPress={() => router.push('/rewards')}>
          <Text style={styles.cardTitle}>보상함</Text>
          <Text style={styles.cardText}>획득 포인트</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallCard} onPress={() => router.push('/profile')}>
          <Text style={styles.cardTitle}>내 정보</Text>
          <Text style={styles.cardText}>프로필</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    height: 160,
    borderRadius: 18,
    marginBottom: 16,
    backgroundColor: '#ddd',
  },
  bigCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  bigTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    color: '#0f172a',
  },
  bigText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  smallCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
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
