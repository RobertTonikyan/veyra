import { StyleSheet, Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Veyra</Text>
      <Text style={styles.subtitle}>שלב 0 · הפרויקט עולה</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1614', gap: 8 },
  title: { fontSize: 40, fontWeight: '700', color: '#F3ECE6' },
  subtitle: { fontSize: 16, color: '#A89C91' },
});