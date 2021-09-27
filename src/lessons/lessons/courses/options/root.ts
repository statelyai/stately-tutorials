import { CourseType } from "../../../LessonType";

const optionsCourse: CourseType = {
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
              {
                type: "CONSOLE_ASSERTION",
                expectedText: "Hello",
              },
            ],
          },
        ],
      },
    },
  ],
};

export default optionsCourse;
