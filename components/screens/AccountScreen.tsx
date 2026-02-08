import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { TAB_BAR_TOP_OFFSET } from "@/constants/layout";
import type { User } from "firebase/auth";

type AccountScreenProps = {
  user: User | null;
  onSignOut: () => void;
};

export function AccountScreen({ user, onSignOut }: AccountScreenProps) {
  const displayName = user?.displayName ?? user?.email ?? "Signed in";

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
