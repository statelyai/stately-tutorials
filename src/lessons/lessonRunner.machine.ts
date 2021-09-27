import {
  assign,
  createMachine,
  EventObject,
  interpret,
  Interpreter,
  InterpreterStatus,
  StateNodeConfig,
} from "xstate";
import {
  AcceptanceCriteriaStep,
  CourseType,
  LessonType,
  AcceptanceCriteriaCase,
} from "./LessonType";
import { toMachine } from "./toMachine";
import type { CompileHandlerResponse } from "../pages/api/compile";

interface Context {
  course: CourseType;
  service?: Interpreter<any, any, any>;
  fileText: string;
  lessonIndex: number;
  stepCursor: {
    case: number;
    step: number;
  };
  lastErroredStep:
    | {
        case: number;
        step: number;
      }
    | undefined;
  terminalLines: TerminalLine[];
}

interface TerminalLine {
  color: "red" | "white" | "blue" | "green" | "gray" | "yellow";
  icon?: "check" | "cross" | "arrow-right" | "clock";
  text: string;
  bold?: boolean;
  fromUser?: boolean;
}

type Event =
  | { type: "TEXT_EDITED"; text: string }
  | {
      type: "STEP_DONE";
    }
  | {
      type: "GO_TO_NEXT_LESSON";
    }
  | {
      type: "CLEAR_TERMINAL";
    }
  | {
      type: "LOG_TO_CONSOLE";
      args: any[];
      consoleType: "log" | "warn" | "error";
    };

const checkingIfMachineIsValid: StateNodeConfig<Context, any, Event> = {
  entry: ["stopRunningService"],
  invoke: {
    src: async (context, event) => {
      if (!context.fileText) throw new Error();
      const result: CompileHandlerResponse = await fetch(`/api/compile`, {
        method: "POST",
        body: JSON.stringify({ file: context.fileText }),
      }).then((res) => res.json());

      if (!result.didItWork || !result.result) {
        throw new Error();
      }

      const machine = toMachine(result.result);

      // Tests the machine to see if it fails compilation
      interpret(machine).start().stop();

      await new Promise((res) => waitFor(600, res as any));

      return interpret(machine, {
        devTools: true,
      });
    },
    onDone: {
      actions: assign((context, event) => {
        return {
          service: event.data,
        };
      }),
      target: "runningTests",
    },
    onError: {
      target: "idle.machineCouldNotCompile",
      actions: [
        console.log,
        assign({
          terminalLines: (context, event) => [
            ...context.terminalLines,
            {
              color: "red",
              text: "Could not run tests: an error occurred",
              bold: true,
            },
            {
              color: "red",
              text: event.data.message || "An unknown error occurred",
            },
          ],
        }),
      ],
    },
  },
};

export const lessonMachine = createMachine<Context, Event>(
  {
    initial: "throttling",
    context: {
      course: {} as any,
      lessonIndex: 0,
      fileText: "",
      stepCursor: {
        case: 0,
        step: 0,
      },
      lastErroredStep: undefined,
      terminalLines: [],
    },
    on: {
      CLEAR_TERMINAL: {
        actions: "clearTerminalLines",
      },
      TEXT_EDITED: {
        target: ".throttling",
        actions: assign((context, event) => {
          return {
            fileText: event.text,
          };
        }),
        internal: false,
      },
    },
    states: {
      idle: {
        id: "idle",
        initial: "machineValid",
        states: {
          machineValid: {
            initial: "testsNotPassed",
            states: {
              testsNotPassed: {
                tags: "testsNotPassed",
              },
              testsPassed: {
                tags: "testsPassed",
                on: {
                  GO_TO_NEXT_LESSON: [
                    {
                      cond: "thereIsANextLesson",
                      target: "#movingToNextLesson",
                    },
                    {
                      actions: "goToIndexPage",
                    },
                  ],
                },
              },
            },
          },
          machineCouldNotCompile: {},
        },
      },
      throttling: {
        entry: ["clearTerminalLines"],
        after: {
          400: "checkingIfMachineIsValid",
        },
      },
      movingToNextLesson: {
        entry: ["clearTerminalLines"],
        id: "movingToNextLesson",
        always: {
          actions: [
            "stopRunningService",
            assign((context, event) => {
              return {
                stepCursor: {
                  case: 0,
                  step: 0,
                },
                lessonIndex: context.lessonIndex + 1,
                lastErroredStep: undefined,
              };
            }),
            "autoFormatEditor",
          ],
          target: "checkingIfMachineIsValid",
        },
      },
      checkingIfMachineIsValid,
      runningTests: {
        entry: ["resetLessonCursor", "startService", "logTestStartToTerminal"],
        initial: "runningStep",
        onDone: {
          target: "idle.machineValid.testsPassed",
        },
        invoke: {
          src: "overrideConsoleLog",
        },
        on: {
          LOG_TO_CONSOLE: {
            actions: assign((context, event) => {
              return {
                terminalLines: [
                  ...context.terminalLines,
                  {
                    color:
                      event.consoleType === "log"
                        ? "gray"
                        : event.consoleType === "error"
                        ? "red"
                        : "yellow",
                    text: `${event.args
                      .map((elem) => JSON.stringify(elem, null, 2))
                      .join(" ")
                      .slice(1, -1)}`,
                    fromUser: true,
                  },
                ],
              };
            }),
          },
        },
        states: {
          runningStep: {
            entry: ["reportStepStartedInTerminal"],
            on: {
              STEP_DONE: {
                target: "checkingIfThereIsAnIncompleteStep",
                actions: ["reportStepSucceededInTerminal"],
              },
            },
            invoke: {
              src: "runTestStep",
              onError: {
                target: "#idle.machineValid.testsNotPassed",
                actions: ["reportStepFailedInTerminal", "markStepAsErrored"],
              },
            },
          },
          checkingIfThereIsAnIncompleteStep: {
            always: [
              {
                cond: "isThereAnIncompleteStepInThisCase",
                actions: "incrementToNextStep",
                target: "runningStep",
              },
              {
                cond: "isThereAnIncompleteStep",
                actions: [
                  "reportCaseSucceededInTerminal",
                  "restartService",
                  "incrementToNextStep",
                ],
                target: "runningStep",
              },
              {
                target: "complete",
                actions: [
                  "reportCaseSucceededInTerminal",
                  "reportAllTestsPassedInTerminal",
                ],
              },
            ],
          },
          complete: {
            type: "final",
          },
        },
      },
    },
  },
  {
    services: {
      overrideConsoleLog: () => (send) => {
        const tempLog = console.log;
        const tempWarn = console.warn;
        const tempError = console.error;

        console.log = (...args: any[]) => {
          send({
            type: "LOG_TO_CONSOLE",
            args,
            consoleType: "log",
          });
        };
        console.warn = (...args: any[]) => {
          send({
            type: "LOG_TO_CONSOLE",
            args,
            consoleType: "warn",
          });
        };
        console.error = (...args: any[]) => {
          send({
            type: "LOG_TO_CONSOLE",
            args,
            consoleType: "error",
          });
        };

        return () => {
          console.log = tempLog;
          console.warn = tempWarn;
          console.error = tempError;
        };
      },
      runTestStep: (context, event) => (send) => {
        const cases = getCurrentLessonCases(context);
        const currentStep =
          cases[context.stepCursor.case].steps[context.stepCursor.step];

        if (!currentStep || !context.service) return;

        runTestStep(
          currentStep,
          context.service,
          () => send("STEP_DONE"),
          context.terminalLines,
        );
      },
    },
    guards: {
      isThereAnIncompleteStepInThisCase: (context) => {
        const cases = getCurrentLessonCases(context);
        const nextStep = getNextSteps(cases, context.stepCursor);

        return Boolean(nextStep && nextStep.case === context.stepCursor.case);
      },
      isThereAnIncompleteStep: (context) => {
        const cases = getCurrentLessonCases(context);
        const nextStep = getNextSteps(cases, context.stepCursor);
        return Boolean(nextStep);
      },
      thereIsANextLesson: (context) => {
        return Boolean(context.course.lessons[context.lessonIndex + 1]);
      },
    },
    actions: {
      clearTerminalLines: assign((context) => {
        return {
          terminalLines: [],
        };
      }),
      reportAllTestsPassedInTerminal: assign((context) => {
        const successMessage = "All tests passed!";
        return {
          terminalLines: [
            ...context.terminalLines,
            {
              color: "green",
              text: new Array(successMessage.length + 2).fill("-").join(""),
            },
            {
              color: "green",
              text: successMessage,
              bold: true,
              icon: "check",
            },
            {
              color: "green",
              text: new Array(successMessage.length + 2).fill("-").join(""),
            },
          ],
        };
      }),
      logTestStartToTerminal: assign((context) => {
        return {
          terminalLines: [
            ...context.terminalLines,
            {
              color: "blue",
              bold: true,
              text: `Starting new test`,
            },
          ],
        };
      }),
      reportCaseSucceededInTerminal: assign((context) => {
        return {
          terminalLines: [
            ...context.terminalLines,
            {
              text: `Test #${context.stepCursor.case + 1} passed`,
              color: "white",
              bold: true,
              icon: "check",
            },
          ],
        };
      }),
      reportStepSucceededInTerminal: assign((context) => {
        const currentStep = getCurrentLessonStep(context);

        let text: TerminalLine[] = [];

        if (currentStep.type === "ASSERTION") {
          text = [
            {
              text: `Expected ${currentStep.check
                .toString()
                .slice(43, -13)} to equal ${
                currentStep.expectedValue
              } and received ${currentStep.check(context.service!.state)}`,
              color: "gray",
              icon: "check",
            },
          ];
        } else if (currentStep.type === "OPTIONS_ASSERTION") {
          text = [
            {
              text: `Expected: ${currentStep.description}`,
              color: "gray",
              icon: "check",
            },
          ];
        } else if (currentStep.type === "CONSOLE_ASSERTION") {
          text = [
            {
              text: `Expected "${currentStep.expectedText}" to have been logged to the console`,
              color: "gray",
              icon: "check",
            },
          ];
        }

        if (!text) return {};

        return {
          terminalLines: [...context.terminalLines, ...text],
        };
      }),
      reportStepFailedInTerminal: assign((context) => {
        const currentStep = getCurrentLessonStep(context);

        let text: TerminalLine[] = [];

        if (currentStep.type === "ASSERTION") {
          const errorText = `Expected ${currentStep.check
            .toString()
            .slice(43, -13)} to equal ${
            currentStep.expectedValue
          }, instead received ${currentStep.check(context.service!.state)}`;
          text = [
            {
              color: "red",
              text: new Array(errorText.length + 2).fill("-").join(""),
            },
            {
              color: "red",
              bold: true,
              text: `Test #${context.stepCursor.case + 1} failed`,
            },
            {
              text: errorText,
              color: "red",
              icon: "cross",
            },
            {
              color: "red",
              text: new Array(errorText.length + 2).fill("-").join(""),
            },
          ];
        } else if (currentStep.type === "OPTIONS_ASSERTION") {
          const errorText = `Check failed: ${currentStep.description}`;
          text = [
            {
              color: "red",
              text: new Array(errorText.length + 2).fill("-").join(""),
            },
            {
              color: "red",
              bold: true,
              text: `Test #${context.stepCursor.case + 1} failed`,
            },
            {
              text: errorText,
              color: "red",
              icon: "cross",
            },
            {
              color: "red",
              text: new Array(errorText.length + 2).fill("-").join(""),
            },
          ];
        } else if (currentStep.type === "CONSOLE_ASSERTION") {
          const errorText = `Check failed: Expected "${currentStep.expectedText}" to have been logged to the console`;
          text = [
            {
              color: "red",
              text: new Array(errorText.length + 2).fill("-").join(""),
            },
            {
              color: "red",
              bold: true,
              text: `Test #${context.stepCursor.case + 1} failed`,
            },
            {
              text: errorText,
              color: "red",
              icon: "cross",
            },
            {
              color: "red",
              text: new Array(errorText.length + 2).fill("-").join(""),
            },
          ];
        }

        if (!text) return {};

        return {
          terminalLines: [...context.terminalLines, ...text],
        };
      }),
      reportStepStartedInTerminal: assign((context) => {
        const currentStep = getCurrentLessonStep(context);

        let text: TerminalLine[] = [];

        if (currentStep.type === "WAIT") {
          text = [
            {
              text: `Waiting for ${currentStep.durationInMs}ms...`,
              icon: "clock",
              color: "white",
            },
          ];
        } else if (currentStep.type === "SEND_EVENT") {
          text = [
            {
              text: `Sending an event of type ${currentStep.event.type} to the machine...`,
              color: "white",
              icon: "arrow-right",
            },
          ];
        }

        if (!text) return {};

        return {
          terminalLines: [...context.terminalLines, ...text],
        };
      }),
      startService: (context) => {
        if (
          context.service &&
          context.service.status !== InterpreterStatus.Running
        ) {
          context.service.start();
        }
      },
      restartService: (context) => {
        if (
          context.service &&
          context.service.status === InterpreterStatus.Running
        ) {
          context.service.stop();
          context.service.start();
        }
      },
      stopRunningService: (context) => {
        if (
          context.service &&
          context.service.status === InterpreterStatus.Running
        ) {
          context.service.stop();
        }
      },
      incrementToNextStep: assign((context) => {
        const cases = getCurrentLessonCases(context);
        const nextStep = getNextSteps(cases, context.stepCursor);
        if (!nextStep) return {};

        return {
          stepCursor: nextStep,
        };
      }),
      markStepAsErrored: assign((context) => {
        return {
          lastErroredStep: context.stepCursor,
        };
      }),
      resetLessonCursor: assign((context) => ({
        stepCursor: {
          case: 0,
          step: 0,
        },
        lastErroredStep: undefined,
      })),
    },
  },
);

const getNextSteps = (
  cases: AcceptanceCriteriaCase[],
  stepCursor: { case: number; step: number },
): { case: number; step: number } | null => {
  const currentCursor = stepCursor;
  const currentCase = cases[currentCursor.case];

  if (currentCase && currentCase.steps[currentCursor.step + 1]) {
    return {
      case: currentCursor.case,
      step: currentCursor.step + 1,
    };
  }

  const nextCase = cases[currentCursor.case + 1];

  if (nextCase) {
    return {
      case: currentCursor.case + 1,
      step: 0,
    };
  }

  return null;
};

const runTestStep = <TContext, TEvent extends EventObject>(
  step: AcceptanceCriteriaStep<TContext, TEvent>,
  service: Interpreter<TContext, any, TEvent>,
  callback: () => void,
  terminalLines: TerminalLine[],
) => {
  let state = service.state;
  const unsubscribeHandlers: (() => void)[] = [];

  const unsub = service.subscribe((newState) => {
    state = newState;
  });

  unsubscribeHandlers.push(unsub.unsubscribe);

  switch (step.type) {
    case "ASSERTION":
      {
        const value = step.check(state);

        if (value !== step.expectedValue) {
          throw new Error("Assertion failed");
        }
        callback();
      }
      break;
    case "OPTIONS_ASSERTION":
      {
        const succeeded = step.assertion(service.machine.options);

        if (!succeeded) {
          throw new Error("Assertion failed");
        }
        callback();
      }
      break;
    case "SEND_EVENT":
      {
        service.send(step.event);
        callback();
      }
      break;
    case "WAIT":
      {
        const unwait = waitFor(step.durationInMs, callback);
        unsubscribeHandlers.push(unwait);
      }
      break;
    case "CONSOLE_ASSERTION":
      {
        const regex = new RegExp(step.expectedText, "i");
        const succeeded = terminalLines.some((line) => {
          return line.fromUser && regex.test(line.text);
        });

        if (!succeeded) {
          throw new Error("Assertion failed");
        }
        callback();
      }
      break;
  }

  return () => {
    unsubscribeHandlers.forEach((func) => func());
  };
};

const waitFor = (ms: number, callback: () => void): (() => void) => {
  let timeout = setTimeout(callback, ms);

  return () => {
    clearTimeout(timeout);
  };
};

const getCurrentLesson = (context: Context): LessonType => {
  return context.course.lessons[context.lessonIndex];
};

export const getCurrentLessonCases = (
  context: Context,
): AcceptanceCriteriaCase<any, any>[] => {
  if (context.lessonIndex === 0) {
    return context.course.lessons[0].acceptanceCriteria.cases;
  }

  const currentLesson = getCurrentLesson(context);

  if (!currentLesson.mergeWithPreviousCriteria) {
    return currentLesson.acceptanceCriteria.cases;
  }

  const cases: AcceptanceCriteriaCase<any, any>[] = [];

  let cursorIndex = context.lessonIndex;

  while (cursorIndex >= 0) {
    const targetLesson = context.course.lessons[cursorIndex];

    cases.unshift(...targetLesson.acceptanceCriteria.cases);

    if (!targetLesson.mergeWithPreviousCriteria) {
      break;
    }

    cursorIndex--;
  }

  return cases;
};

export const getCurrentLessonStep = (
  context: Context,
): AcceptanceCriteriaStep<any, any> => {
  const cases = getCurrentLessonCases(context);
  const currentStep =
    cases[context.stepCursor.case].steps[context.stepCursor.step];
  return currentStep;
};
