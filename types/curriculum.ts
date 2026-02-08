export interface Course {
  id: string;
  title: string;
  description: string;
  order: number;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  body: string;
  order: number;
  /** Rudiment IDs for the student to learn in this lesson (e.g. ["paradiddle-1"]). */
  rudimentIds: string[];
  suggestedBpm?: number;
  updatedAt: string;
}
