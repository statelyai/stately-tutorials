import { CourseType } from "../../../LessonType";

const assignCourse: CourseType = {
  title: "Assign",
  initialMachineText: `createMachine({
  context: {
    count: 0,
  },
  on: {
    INCREMENT: {
      actions: [assign({
        count: (context) => context.count - 1
      })]
    }
  }
})`,
  lessons: [
    {
      acceptanceCriteria: {
        cases: [
          {
            steps: [
              {
                type: "ASSERTION",
                check: (state) => state.context.count,
                description: `The 'count' in context should equal 0`,
                expectedValue: 0,
              },
              {
                type: "SEND_EVENT",
                event: {
                  type: "INCREMENT",
                },
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.count,
                description: `The 'count' in context should equal 1`,
                expectedValue: 1,
              },
            ],
          },
        ],
      },
    },
    {
      mergeWithPreviousCriteria: true,
      acceptanceCriteria: {
        cases: [
          {
            steps: [
              {
                type: "ASSERTION",
                check: (state) => state.context.count,
                description: `The 'count' in context should equal 0`,
                expectedValue: 0,
              },
              {
                type: "SEND_EVENT",
                event: {
                  type: "DECREMENT",
                },
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.count,
                description: `The 'count' in context should equal -1`,
                expectedValue: -1,
              },
            ],
          },
        ],
      },
    },
    {
      acceptanceCriteria: {
        cases: [
          {
            steps: [
              {
                type: "ASSERTION",
                check: (state) => state.context.count,
                description: `The 'count' in context should equal 0`,
                expectedValue: 0,
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.pressCount,
                description: `The 'pressCount' in context should equal 0`,
                expectedValue: 0,
              },
              {
                type: "SEND_EVENT",
                event: {
                  type: "DECREMENT",
                },
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.count,
                description: `The 'count' in context should equal -1`,
                expectedValue: -1,
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.pressCount,
                description: `The 'pressCount' in context should equal 1`,
                expectedValue: 1,
              },
              {
                type: "SEND_EVENT",
                event: {
                  type: "INCREMENT",
                },
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.count,
                description: `The 'count' in context should equal 0`,
                expectedValue: 0,
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.pressCount,
                description: `The 'pressCount' in context should equal 2`,
                expectedValue: 2,
              },
            ],
          },
        ],
      },
    },
    {
      acceptanceCriteria: {
        cases: [
          {
            steps: [
              {
                type: "ASSERTION",
                check: (state) => state.context.count,
                description: `The 'count' in context should equal 0`,
                expectedValue: 0,
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.pressCount,
                description: `The 'pressCount' in context should equal 0`,
                expectedValue: 0,
              },
              {
                type: "SEND_EVENT",
                event: {
                  type: "DECREMENT",
                },
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.count,
                description: `The 'count' in context should equal -1`,
                expectedValue: -1,
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.pressCount,
                description: `The 'pressCount' in context should equal 0`,
                expectedValue: 0,
              },
              {
                type: "SEND_EVENT",
                event: {
                  type: "INCREMENT",
                },
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.count,
                description: `The 'count' in context should equal 0`,
                expectedValue: 0,
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.pressCount,
                description: `The 'pressCount' in context should equal 0`,
                expectedValue: 0,
              },
            ],
          },
        ],
      },
    },
    {
      acceptanceCriteria: {
        cases: [
          {
            steps: [
              {
                type: "OPTIONS_ASSERTION",
                assertion: (options) =>
                  Boolean(options.actions.incrementPressCount),
                description: `Must have an action called 'incrementPressCount' defined`,
              },
            ],
          },
          {
            steps: [
              {
                type: "ASSERTION",
                check: (state) => state.context.count,
                description: `The 'count' in context should equal 0`,
                expectedValue: 0,
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.pressCount,
                description: `The 'pressCount' in context should equal 0`,
                expectedValue: 0,
              },
              {
                type: "SEND_EVENT",
                event: {
                  type: "DECREMENT",
                },
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.count,
                description: `The 'count' in context should equal -1`,
                expectedValue: -1,
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.pressCount,
                description: `The 'pressCount' in context should equal 1`,
                expectedValue: 1,
              },
              {
                type: "SEND_EVENT",
                event: {
                  type: "INCREMENT",
                },
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.count,
                description: `The 'count' in context should equal 0`,
                expectedValue: 0,
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.pressCount,
                description: `The 'pressCount' in context should equal 2`,
                expectedValue: 2,
              },
            ],
          },
        ],
      },
    },
    {
      acceptanceCriteria: {
        cases: [
          {
            steps: [
              {
                type: "OPTIONS_ASSERTION",
                assertion: (options) =>
                  Boolean(options.actions.incrementPressCount),
                description: `Must have an action called 'incrementPressCount' defined`,
              },
            ],
          },
          {
            steps: [
              {
                type: "ASSERTION",
                check: (state) => state.context.count,
                description: `The 'count' in context should equal 0`,
                expectedValue: 0,
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.pressCount,
                description: `The 'pressCount' in context should equal 0`,
                expectedValue: 0,
              },
              {
                type: "SEND_EVENT",
                event: {
                  type: "DECREMENT",
                },
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.count,
                description: `The 'count' in context should equal -1`,
                expectedValue: -1,
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.pressCount,
                description: `The 'pressCount' in context should equal 1`,
                expectedValue: 1,
              },
              {
                type: "SEND_EVENT",
                event: {
                  type: "INCREMENT",
                },
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.count,
                description: `The 'count' in context should equal 0`,
                expectedValue: 0,
              },
              {
                type: "ASSERTION",
                check: (state) => state.context.pressCount,
                description: `The 'pressCount' in context should equal 3`,
                expectedValue: 3,
              },
            ],
          },
        ],
      },
    },
  ],
};

export default assignCourse;
