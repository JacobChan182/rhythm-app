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
  ScrollView,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

const MIN_PASSWORD_LENGTH = 8;

export default function SignUp() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  function validate(): string | null {
    const trimmed = email.trim();
    if (!trimmed) return "Enter your email";
    if (!trimmed.includes("@") || !trimmed.includes(".")) return "Enter a valid email address";
    if (!password) return "Enter a password";
    if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    if (password !== confirmPassword) return "Passwords don't match";
    if (!agreeToTerms) return "Please agree to the Terms of Service and Privacy Policy";
    return null;
  }

  async function handleSignUp() {
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/(tabs)/home");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sign up failed";
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.back}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Animated.View
          style={[styles.form, { opacity: fade, transform: [{ translateY: slide }] }]}
        >
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join Rhythm to save your progress</Text>

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
            placeholder={`Password (min ${MIN_PASSWORD_LENGTH} characters)`}
            placeholderTextColor="#52525b"
            value={password}
            onChangeText={(t) => { setPassword(t); setError(""); }}
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            editable={!loading}
          />
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="Confirm password"
            placeholderTextColor="#52525b"
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            editable={!loading}
          />

          <TouchableOpacity
            style={styles.showPasswordRow}
            onPress={() => setShowPassword((v) => !v)}
            disabled={loading}
          >
            <View style={[styles.checkbox, showPassword && styles.checkboxChecked]}>
              {showPassword ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.showPasswordLabel}>Show passwords</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreeToTerms((v) => !v)}
            disabled={loading}
          >
            <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
              {agreeToTerms ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.termsLabel}>
              I agree to the{" "}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {" "}and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerLabel}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => router.replace("/sign-in")}
              disabled={loading}
            >
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  back: {
    alignSelf: "flex-start",
    marginBottom: 24,
  },
  backText: {
    color: "#a1a1aa",
    fontSize: 15,
  },
  form: {
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
    marginBottom: 28,
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
  showPasswordRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#52525b",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  checkmark: {
    color: "#000",
    fontSize: 12,
    fontWeight: "800",
  },
  showPasswordLabel: {
    color: "#a1a1aa",
    fontSize: 15,
  },
  termsLabel: {
    flex: 1,
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    color: "#22c55e",
    fontWeight: "500",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginBottom: 12,
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
