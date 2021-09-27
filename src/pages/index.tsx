import Link from "next/link";
import { courseMeta } from "../lessons/lessons/courses/meta";

const Home = () => {
  return (
    <div className="p-6 space-y-6">
      {courseMeta.map((course) => {
        return (
          <div
            key={course.id}
            className="max-w-sm p-4 px-6 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-1 space-x-4">
              <h2 className="text-xl font-semibold tracking-tight text-gray-700">
                {course.title}
              </h2>
              <p className="px-2 py-1 text-xs text-gray-700 uppercase bg-gray-100 rounded">
                {course.course.lessons.length} Lessons
              </p>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-gray-600">
              {course.description}
            </p>
            <div className="flex justify-end">
              <Link href={`/lessons/${course.id}`}>
                <a className="px-4 py-2 text-sm text-blue-900 uppercase bg-blue-200 rounded">
                  Learn
                </a>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Home;
