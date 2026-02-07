import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)/home" />;
  }

  // No user yet: anonymous sign-in was just triggered; show loading until listener fires
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#22c55e" />
      <Text style={styles.text}>Signing you in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f0f0f",
  },
  text: {
    color: "#888",
    marginTop: 12,
  },
});
