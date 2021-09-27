import { CourseType } from "../../../LessonType";

const optionsCourse: CourseType = {
  title: "Options",
  initialMachineText: `createMachine({
  entry: ['sayHello'],
}, {
  actions: {}
})`,
  lessons: [
    {
      acceptanceCriteria: {
        cases: [
          {
            steps: [
              {
                type: "OPTIONS_ASSERTION",
                assertion: (options) => Boolean(options.actions.sayHello),
                description: `sayHello should be defined in options.actions`,
              },
            ],
          },
        ],
      },
    },
  ],
};

export default optionsCourse;
