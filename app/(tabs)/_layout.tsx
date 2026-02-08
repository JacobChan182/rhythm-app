import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { Tabs, router } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import type {
  BottomTabBarProps,
  BottomTabNavigationOptions,
} from "@react-navigation/bottom-tabs";
import { useAuth } from "@/contexts/AuthContext";

const NAVBAR_SLIDE_DISTANCE = 80;
const TAB_BAR_LAYOUT = {
  position: "absolute" as const,
  left: 24,
  right: 24,
  top: 20,
  height: 52,
};

function AnimatedNavbar(props: BottomTabBarProps) {
  const slideY = useRef(new Animated.Value(-NAVBAR_SLIDE_DISTANCE)).current;

  useEffect(() => {
    Animated.spring(slideY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 120,
    }).start();
  }, [slideY]);

  // So the bar fills our wrapper instead of positioning from screen
  const descriptorsWithRelativeStyle = Object.fromEntries(
    Object.entries(props.descriptors).map(([key, d]) => [
      key,
      {
        ...d,
        options: {
          ...d.options,
          tabBarStyle: [
            d.options.tabBarStyle,
            { left: 0, right: 0, top: 0 },
          ],
        },
      },
    ])
  );

  return (
    <Animated.View
      style={[
        TAB_BAR_LAYOUT,
        { transform: [{ translateY: slideY }] },
      ]}
      pointerEvents="box-none"
    >
      <BottomTabBar
        {...props}
        descriptors={descriptorsWithRelativeStyle}
      />
    </Animated.View>
  );
}

export default function TabsLayout() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
    }
  }, [user, loading]);

  if (!loading && !user) {
    return null;
  }

  return (
    <Tabs
      screenOptions={
        {
          tabBarActiveTintColor: "#22c55e",
          tabBarInactiveTintColor: "#666",
          tabBarShowLabel: false,
          tabBar: (props: BottomTabBarProps) => <AnimatedNavbar {...props} />,
          tabBarStyle: {
          position: "absolute",
          left: 24,
          right: 24,
          top: 20,
          height: 52,
          borderRadius: 26,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
          elevation: 12,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={60}
            tint="dark"
            style={StyleSheet.absoluteFillObject}
          />
        ),
        headerShown: false,
      } as BottomTabNavigationOptions}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: "Practice",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="musical-notes" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
