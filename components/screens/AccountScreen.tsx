import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { TAB_BAR_TOP_OFFSET } from "@/constants/layout";
import type { User } from "firebase/auth";
import { getUserProgress, saveLatencyCompensation, getDefaultLatencyCompensationMs, RECOMMENDED_LATENCY_COMPENSATION_MS } from "@/lib/userProgress";

const MIN_LATENCY_MS = 0;
const MAX_LATENCY_MS = 80;

type AccountScreenProps = {
  user: User | null;
  onSignOut: () => void;
};

export function AccountScreen({ user, onSignOut }: AccountScreenProps) {
  const displayName = user?.displayName ?? user?.email ?? "Signed in";
  const [latencyMs, setLatencyMs] = useState(RECOMMENDED_LATENCY_COMPENSATION_MS);
  const [latencyLoaded, setLatencyLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getUserProgress(user).then((progress) => {
      if (cancelled) return;
      setLatencyMs(getDefaultLatencyCompensationMs(progress));
      setLatencyLoaded(true);
    });
    return () => { cancelled = true; };
  }, [user]);

  const handleLatencyChange = (value: number) => {
    const ms = Math.round(value);
    setLatencyMs(ms);
    if (user) saveLatencyCompensation(user, ms);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value} numberOfLines={1}>
          {displayName}
        </Text>
        {user?.email ? (
          <Text style={styles.email} numberOfLines={1}>
            {user.email}
          </Text>
        ) : null}
      </View>

      {user && (
        <View style={styles.card}>
          <Text style={styles.label}>Latency compensation</Text>
          <Text style={styles.sliderHint}>
            Compensates for audio/display delay. Recommended: {RECOMMENDED_LATENCY_COMPENSATION_MS} ms
          </Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderValue}>{latencyLoaded ? latencyMs : "—"} ms</Text>
            <Slider
              style={styles.slider}
              minimumValue={MIN_LATENCY_MS}
              maximumValue={MAX_LATENCY_MS}
              step={5}
              value={latencyMs}
              onValueChange={handleLatencyChange}
              minimumTrackTintColor="#22c55e"
              maximumTrackTintColor="#333"
              thumbTintColor="#22c55e"
            />
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: TAB_BAR_TOP_OFFSET + 24,
    backgroundColor: "#0f0f0f",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: "#888",
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  email: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  sliderHint: {
    fontSize: 12,
    color: "#888",
    marginBottom: 8,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    minWidth: 40,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  signOutButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: "#333",
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
