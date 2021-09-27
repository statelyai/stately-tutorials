import { CourseType } from "../../LessonType";
import assignCourse from "./assign/root";
import optionsCourse from "./options/root";

interface CourseMeta {
  title: string;
  description: string;
  course: CourseType;
  /**
   * The folder name where the course is stored
   */
  id: string;
}

export const courseMeta: CourseMeta[] = [
  {
    course: assignCourse,
    title: "Assign",
    description:
      "This course teaches you the basics of assign, the way XState handles storing values.",
    id: "assign",
  },
  {
    course: optionsCourse,
    title: "Options",
    description: "Learn how to handle options, like actions and services",
    id: "options",
  },
];
