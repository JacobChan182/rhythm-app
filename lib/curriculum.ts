import {
  collection,
  query,
  orderBy,
  where,
  getDocs,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Course, Lesson } from "@/types/curriculum";

const COURSES_COLLECTION = "courses";
const LESSONS_COLLECTION = "lessons";

export async function getCourses(): Promise<Course[]> {
  const db = getFirebaseDb();
  const ref = collection(db, COURSES_COLLECTION);
  const q = query(ref, orderBy("order"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title ?? "",
      description: data.description ?? "",
      order: typeof data.order === "number" ? data.order : 0,
      updatedAt: data.updatedAt ?? "",
    } as Course;
  });
}

export async function getLessonsByCourseId(courseId: string): Promise<Lesson[]> {
  const db = getFirebaseDb();
  const ref = collection(db, LESSONS_COLLECTION);
  const q = query(
    ref,
    where("courseId", "==", courseId),
    orderBy("order")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const rudimentIds = Array.isArray(data.rudimentIds)
      ? data.rudimentIds
      : data.rudimentId != null
        ? [data.rudimentId]
        : [];
    return {
      id: d.id,
      courseId: data.courseId ?? courseId,
      title: data.title ?? "",
      body: data.body ?? "",
      order: typeof data.order === "number" ? data.order : 0,
      rudimentIds,
      suggestedBpm: data.suggestedBpm,
      updatedAt: data.updatedAt ?? "",
    } as Lesson;
  });
}
