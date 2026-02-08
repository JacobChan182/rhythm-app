import { useState, useEffect, useRef } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function SignIn() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (user) router.replace("/(tabs)/home");
  }, [user]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(slide, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 90,
      }),
    ]).start();
  }, [fade, slide]);

  async function handleSignIn() {
    setError("");
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setError("Enter your email and password");
      return;
    }
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, trimmed, password);
      router.replace("/(tabs)/home");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sign in failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <TouchableOpacity
        style={styles.back}
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.centered}>
        <Animated.View
          style={[styles.form, { opacity: fade, transform: [{ translateY: slide }] }]}
        >
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue to Crash Course</Text>

        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          placeholder="Email"
          placeholderTextColor="#52525b"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(""); }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!loading}
        />
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          placeholder="Password"
          placeholderTextColor="#52525b"
          value={password}
          onChangeText={(t) => { setPassword(t); setError(""); }}
          secureTextEntry
          textContentType="password"
          editable={!loading}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.forgot}
          onPress={() => router.push("/forgot-password")}
          disabled={loading}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerLabel}>Don&apos;t have an account? </Text>
          <TouchableOpacity
            onPress={() => router.replace("/sign-up")}
            disabled={loading}
          >
            <Text style={styles.footerLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 24,
  },
  back: {
    position: "absolute",
    top: 56,
    left: 24,
    zIndex: 1,
  },
  backText: {
    color: "#a1a1aa",
    fontSize: 15,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  form: {
    width: "100%",
    maxWidth: 400,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#71717a",
    marginBottom: 32,
  },
  input: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    color: "#fff",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginBottom: 12,
  },
  forgot: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotText: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  footerLabel: {
    color: "#71717a",
    fontSize: 15,
  },
  footerLink: {
    color: "#22c55e",
    fontSize: 15,
    fontWeight: "600",
  },
});
