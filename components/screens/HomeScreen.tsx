import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type HomeScreenProps = {
  onStartPractice: () => void;
  onSignOut: () => void;
  userLabel: string;
};

export function HomeScreen({ onStartPractice, onSignOut, userLabel }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rhythm</Text>
      <Text style={styles.welcome}>{userLabel}</Text>
      <Text style={styles.hint}>Tap below to open Practice and play a rudiment with the metronome.</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={onStartPractice}>
        <Text style={styles.primaryButtonText}>Start practice</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={onSignOut}>
        <Text style={styles.secondaryButtonText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#0f0f0f",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  welcome: {
    fontSize: 18,
    color: "#aaa",
    marginBottom: 16,
  },
  hint: {
    fontSize: 14,
    color: "#666",
    marginBottom: 32,
  },
  primaryButton: {
    alignSelf: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: "#22c55e",
    borderRadius: 12,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#333",
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 14,
  },
});
