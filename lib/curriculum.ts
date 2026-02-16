import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Course } from "@/types/curriculum";

const COURSES_COLLECTION = "courses";

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
