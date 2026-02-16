import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { TAB_BAR_TOP_OFFSET } from "@/constants/layout";
import {
  getRudimentsByCourseId,
  type CourseRudimentSummary,
} from "@/lib/courseRudiments";
import { getCourses } from "@/lib/curriculum";
import type { Course } from "@/types/curriculum";

export default function Learn() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [rudimentsByCourse, setRudimentsByCourse] = useState<
    Record<string, CourseRudimentSummary[]>
  >({});
  const [rudimentsLoading, setRudimentsLoading] = useState<Record<string, boolean>>({});

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getCourses();
      setCourses(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  async function toggleCourse(courseId: string) {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      return;
    }
    setExpandedCourseId(courseId);
    if (rudimentsByCourse[courseId]) return;
    setRudimentsLoading((prev) => ({ ...prev, [courseId]: true }));
    try {
      const rudiments = await getRudimentsByCourseId(courseId);
      setRudimentsByCourse((prev) => ({ ...prev, [courseId]: rudiments }));
    } catch {
      setRudimentsByCourse((prev) => ({ ...prev, [courseId]: [] }));
    } finally {
      setRudimentsLoading((prev) => ({ ...prev, [courseId]: false }));
    }
  }

  function goToPractice(rudimentId: string, suggestedBpm?: number) {
    const params = new URLSearchParams();
    params.set("rudimentId", rudimentId);
    if (suggestedBpm != null) params.set("bpm", String(suggestedBpm));
    router.push(`/(tabs)/practice?${params.toString()}`);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading courses…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCourses}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Learn</Text>
      <Text style={styles.subtitle}>Choose a course to view rudiments.</Text>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {courses.length === 0 ? (
          <Text style={styles.emptyText}>No courses yet. Add some in the curriculum builder.</Text>
        ) : (
          <View style={styles.coursesGrid}>
            {courses.map((course) => (
              <View key={course.id} style={styles.courseBlock}>
                <TouchableOpacity
                  style={styles.courseRow}
                  onPress={() => toggleCourse(course.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.courseTitle}>{course.title}</Text>
                  <Text style={styles.courseChevron}>
                    {expandedCourseId === course.id ? "▼" : "▶"}
                  </Text>
                </TouchableOpacity>
                {expandedCourseId === course.id && (
                  <View style={styles.rudimentsContainer}>
                    {rudimentsLoading[course.id] ? (
                      <ActivityIndicator size="small" color="#22c55e" style={styles.rudimentLoader} />
                    ) : (
                      (rudimentsByCourse[course.id] ?? []).map((rudiment) => (
                        <TouchableOpacity
                          key={rudiment.id}
                          style={styles.rudimentRow}
                          onPress={() => goToPractice(rudiment.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.rudimentRowTitle}>{rudiment.name}</Text>
                          <Text style={styles.rudimentBadge}>Practice</Text>
                        </TouchableOpacity>
                      ))
                    )}
                    {expandedCourseId === course.id &&
                      !rudimentsLoading[course.id] &&
                      (rudimentsByCourse[course.id] ?? []).length === 0 && (
                        <Text style={styles.emptyRudiments}>No rudiments in this course.</Text>
                      )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: TAB_BAR_TOP_OFFSET,
    backgroundColor: "#0f0f0f",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#71717a",
    marginBottom: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingText: {
    color: "#71717a",
    marginTop: 12,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#22c55e",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#000",
    fontWeight: "600",
  },
  emptyText: {
    color: "#71717a",
    fontSize: 15,
  },
  coursesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    justifyContent: "center",
  },
  courseBlock: {
    width: "30%",
    marginHorizontal: 6,
    marginBottom: 12,
    minHeight: 280,
    backgroundColor: "#18181b",
    borderRadius: 12,
    overflow: "hidden",
  },
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  courseTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
  },
  courseChevron: {
    color: "#71717a",
    fontSize: 12,
  },
  rudimentsContainer: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  rudimentLoader: {
    marginVertical: 12,
  },
  rudimentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#0f0f0f",
    borderRadius: 8,
    marginTop: 8,
  },
  rudimentRowTitle: {
    fontSize: 15,
    color: "#e4e4e7",
    flex: 1,
  },
  rudimentBadge: {
    fontSize: 12,
    color: "#22c55e",
    fontWeight: "500",
  },
  emptyRudiments: {
    color: "#71717a",
    fontSize: 14,
    marginTop: 12,
  },
});
