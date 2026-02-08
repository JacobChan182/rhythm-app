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
import { getCourses, getLessonsByCourseId } from "@/lib/curriculum";
import { getRudimentById } from "@/lib/rudiments";
import { parseCourseRudimentId } from "@/lib/courseRudiments";
import type { Course, Lesson } from "@/types/curriculum";

function rudimentDisplayName(rudimentId: string): string {
  const staticR = getRudimentById(rudimentId);
  if (staticR) return staticR.name;
  if (parseCourseRudimentId(rudimentId)) return "Course rudiment";
  return rudimentId;
}

export default function Learn() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [lessonsByCourse, setLessonsByCourse] = useState<Record<string, Lesson[]>>({});
  const [lessonsLoading, setLessonsLoading] = useState<Record<string, boolean>>({});
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

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
      setSelectedLesson(null);
      return;
    }
    setExpandedCourseId(courseId);
    setSelectedLesson(null);
    if (lessonsByCourse[courseId]) return;
    setLessonsLoading((prev) => ({ ...prev, [courseId]: true }));
    try {
      const lessons = await getLessonsByCourseId(courseId);
      setLessonsByCourse((prev) => ({ ...prev, [courseId]: lessons }));
    } catch {
      setLessonsByCourse((prev) => ({ ...prev, [courseId]: [] }));
    } finally {
      setLessonsLoading((prev) => ({ ...prev, [courseId]: false }));
    }
  }

  function openLesson(lesson: Lesson) {
    setSelectedLesson(lesson);
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

  if (selectedLesson) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backRow} onPress={() => setSelectedLesson(null)}>
          <Text style={styles.backText}>← Back to lessons</Text>
        </TouchableOpacity>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.lessonTitle}>{selectedLesson.title}</Text>
          <Text style={styles.lessonBody}>{selectedLesson.body}</Text>
          {selectedLesson.rudimentIds.length > 0 ? (
            <View style={styles.rudimentsSection}>
              <Text style={styles.rudimentsHeading}>Rudiments in this lesson</Text>
              {selectedLesson.rudimentIds.map((rid) => (
                <TouchableOpacity
                  key={rid}
                  style={[styles.practiceButton, styles.practiceButtonSpaced]}
                  onPress={() => goToPractice(rid, selectedLesson.suggestedBpm)}
                >
                  <Text style={styles.practiceButtonText}>
                    Practice {rudimentDisplayName(rid)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Learn</Text>
      <Text style={styles.subtitle}>Choose a course to view lessons.</Text>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {courses.length === 0 ? (
          <Text style={styles.emptyText}>No courses yet. Add some in the curriculum builder.</Text>
        ) : (
          courses.map((course) => (
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
                <View style={styles.lessonsContainer}>
                  {lessonsLoading[course.id] ? (
                    <ActivityIndicator size="small" color="#22c55e" style={styles.lessonLoader} />
                  ) : (
                    (lessonsByCourse[course.id] ?? []).map((lesson) => (
                      <TouchableOpacity
                        key={lesson.id}
                        style={styles.lessonRow}
                        onPress={() => openLesson(lesson)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.lessonRowTitle}>{lesson.title}</Text>
                        {lesson.rudimentIds.length > 0 ? (
                          <Text style={styles.lessonBadge}>
                            {lesson.rudimentIds.length} rudiment{lesson.rudimentIds.length !== 1 ? "s" : ""}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    ))
                  )}
                  {expandedCourseId === course.id &&
                    !lessonsLoading[course.id] &&
                    (lessonsByCourse[course.id] ?? []).length === 0 && (
                      <Text style={styles.emptyLessons}>No lessons in this course.</Text>
                    )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 16,
    backgroundColor: "#0f0f0f",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  courseBlock: {
    marginBottom: 8,
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
  lessonsContainer: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  lessonLoader: {
    marginVertical: 12,
  },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#0f0f0f",
    borderRadius: 8,
    marginTop: 8,
  },
  lessonRowTitle: {
    fontSize: 15,
    color: "#e4e4e7",
    flex: 1,
  },
  lessonBadge: {
    fontSize: 12,
    color: "#22c55e",
    fontWeight: "500",
  },
  emptyLessons: {
    color: "#71717a",
    fontSize: 14,
    marginTop: 12,
  },
  backRow: {
    marginBottom: 16,
  },
  backText: {
    color: "#22c55e",
    fontSize: 15,
  },
  lessonTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  lessonBody: {
    fontSize: 16,
    color: "#d4d4d8",
    lineHeight: 24,
    marginBottom: 24,
  },
  practiceButton: {
    alignSelf: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#22c55e",
    borderRadius: 8,
  },
  practiceButtonSpaced: {
    marginBottom: 10,
  },
  practiceButtonText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 15,
  },
  rudimentsSection: {
    marginTop: 8,
  },
  rudimentsHeading: {
    fontSize: 14,
    fontWeight: "600",
    color: "#a1a1aa",
    marginBottom: 12,
  },
});
