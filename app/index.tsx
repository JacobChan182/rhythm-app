import { useEffect, useRef } from "react";
import { Redirect, router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";

export default function Index() {
  const { user, loading, authError, signInAsGuest } = useAuth();
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slide]);

  if (loading && !user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)/home" />;
  }

  if (authError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>{authError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.card,
          {
            opacity: fade,
            transform: [{ translateY: slide }],
          },
        ]}
      >
        <Text style={styles.logo}>Crash Course</Text>
        <Text style={styles.tagline}>Practice. Track. Improve.</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/sign-in")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Sign in</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/sign-up")}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>Create account</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.guestButton}
          onPress={() => signInAsGuest()}
          activeOpacity={0.85}
        >
          <Text style={styles.guestButtonText}>Continue as guest</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },
  card: {
    width: "100%",
    maxWidth: 360,
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 15,
    color: "#71717a",
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: "#22c55e",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#27272a",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  guestButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  guestButtonText: {
    color: "#71717a",
    fontSize: 15,
  },
  loadingText: {
    color: "#71717a",
  },
  errorTitle: {
    color: "#ef4444",
    fontSize: 18,
    fontWeight: "600",
  },
  errorText: {
    color: "#a1a1aa",
    marginTop: 8,
  },
});
