import { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type HomeScreenProps = {
  onStartPractice: () => void;
  onSignOut: () => void;
};

const FADE_DURATION = 300;
const SLIDE_DISTANCE = 24;

export function HomeScreen({ onStartPractice, onSignOut }: HomeScreenProps) {
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
  const hintFade = useRef(new Animated.Value(0)).current;
  const hintSlide = useRef(new Animated.Value(SLIDE_DISTANCE)).current;
  const buttonsFade = useRef(new Animated.Value(0)).current;
  const buttonsSlide = useRef(new Animated.Value(SLIDE_DISTANCE)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.parallel([
        Animated.timing(titleFade, {
          toValue: 1,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(titleSlide, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 90,
        }),
      ]),
      Animated.parallel([
        Animated.timing(hintFade, {
          toValue: 1,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(hintSlide, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 90,
        }),
      ]),
      Animated.parallel([
        Animated.timing(buttonsFade, {
          toValue: 1,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(buttonsSlide, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 90,
        }),
      ]),
    ]).start();
  }, [titleFade, titleSlide, hintFade, hintSlide, buttonsFade, buttonsSlide]);

  return (
    <ImageBackground
      source={require("@/assets/background.png")}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <LinearGradient
        colors={["rgba(0,0,0,1)", "rgba(0,0,0,0.9)", "rgba(0,0,0,0.4)"]}
        locations={[0, 0.4, 1]}
        style={styles.gradient}
      >
        <View style={styles.container}>
          <Animated.Text
            style={[
              styles.title,
              {
                opacity: titleFade,
                transform: [{ translateY: titleSlide }],
              },
            ]}
          >
            Crash Course
          </Animated.Text>
          <Animated.Text
            style={[
              styles.hint,
              {
                opacity: hintFade,
                transform: [{ translateY: hintSlide }],
              },
            ]}
          >
            Tap below to open Practice and play a rudiment with the metronome.
          </Animated.Text>

          <Animated.View
            style={[
              styles.buttonRow,
              {
                opacity: buttonsFade,
                transform: [{ translateY: buttonsSlide }],
              },
            ]}
          >
            <TouchableOpacity style={styles.primaryButton} onPress={onStartPractice}>
              <Text style={styles.primaryButtonText}>Start practice</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={onSignOut}>
              <Text style={styles.secondaryButtonText}>Sign out</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 80,
  },
  title: {
    fontSize: 64,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  hint: {
    fontSize: 14,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: "#22c55e",
    borderRadius: 12,
  },
  primaryButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
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
