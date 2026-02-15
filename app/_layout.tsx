import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/contexts/AuthContext";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </RootErrorBoundary>
  );
}
