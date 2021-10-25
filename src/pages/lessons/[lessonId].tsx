import { Button } from "@chakra-ui/button";
import {
  Box,
  Code,
  Divider,
  Heading,
  List,
  ListItem,
  Text,
  UnorderedList,
} from "@chakra-ui/layout";
import { useMachine } from "@xstate/react";
import classNames from "classnames";
import type * as monaco from "monaco-editor";
import { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import { useRouter } from "next/dist/client/router";
import dynamic from "next/dynamic";
import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import { lessonMachine } from "../../lessons/lessonRunner.machine";
import { courseMeta } from "../../lessons/lessons/courses/meta";
import { CourseType } from "../../lessons/LessonType";

const EditorWithXStateImports = dynamic(
  () => import("../../EditorWithXStateImports"),
);

export const getStaticPaths: GetStaticPaths = async (context) => {
  const fs = await import("fs");
  const path = await import("path");

  const lessonFolderPath = path.resolve(
    process.cwd(),
    "src/lessons/lessons/courses",
  );

  const dirs = fs.readdirSync(lessonFolderPath);

  return {
    paths: dirs.map((dir) => {
      return {
        params: {
          lessonId: dir,
        },
      };
    }),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const lessonDir = context.params?.lessonId as string;

  const fs = await import("fs");
  const path = await import("path");

  const lessonFolderPath = path.resolve(
    process.cwd(),
    "src/lessons/lessons/courses",
    lessonDir,
  );

  const markdownFiles: string[] = fs
    .readdirSync(lessonFolderPath)
    .filter((filePath) => filePath.endsWith(".md"))
    .map((file) =>
      fs.readFileSync(path.resolve(lessonFolderPath, file)).toString(),
    );

  return {
    props: {
      markdownFiles,
      id: lessonDir,
    },
  };
};

const LessonDemo = (props: InferGetStaticPropsType<typeof getStaticProps>) => {
  const course = courseMeta.find((course) => course.id === props.id)?.course;

  if (!course) return null;

  return <LessonInner course={course} markdownFiles={props.markdownFiles} />;
};

export default LessonDemo;

const LessonInner = (props: {
  course: CourseType;
  markdownFiles: string[];
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const router = useRouter();

  const [state, send] = useMachine(lessonMachine, {
    context: {
      course: props.course,
      fileText: props.course.initialMachineText,
    },
    actions: {
      autoFormatEditor: () => {
        editorRef.current?.getAction("editor.action.formatDocument").run();
      },
      goToIndexPage: () => {
        router.push("/");
      },
    },
  });

  return (
    <Box display="flex" alignItems="stretch" w="full" h="full" minH="100vh">
      <Box
        flexShrink={0}
        p="8"
        overflowY="auto"
        w="sm"
        borderRight="2px"
        borderColor="gray.800"
        minH="0px"
      >
        <ReactMarkdown
          components={{
            h1: (props) => (
              <Box>
                <Heading {...props} size="lg" mb="3"></Heading>
                <Divider mb="4" borderColor="gray.500" />
              </Box>
            ),
            p: (props) => (
              <Text {...props} mb="4" color="gray.100" lineHeight="7"></Text>
            ),
            code: (props) => <Code {...props} color="gray.100"></Code>,
            ul: (props) => (
              <UnorderedList {...props} mb="4" color="gray.100"></UnorderedList>
            ),
            li: (props) => <ListItem {...props} />,
          }}
        >{`${props.markdownFiles[state.context.lessonIndex]}`}</ReactMarkdown>
      </Box>
      <Box display="flex" flexDir="column" flex={1}>
        <EditorWithXStateImports
          height="400px"
          onChange={(text) => {}}
          onCompile={(nodes) => {
            send({
              type: "MACHINES_COMPILED",
              nodes,
            });
          }}
          language="typescript"
          value={state.context.fileText}
        />
        <Box flex={1} w="full" padding="4" px="6" bg="black" overflowY="auto">
          {state.context.terminalLines.map((line, index) => {
            return (
              <Text
                {...(line.bold && {
                  fontWeight: "bold",
                })}
                {...(line.color === "red" && { color: "red.400" })}
                {...(line.color === "green" && { color: "green.400" })}
                {...(line.color === "white" && { color: "white" })}
                {...(line.color === "gray" && { color: "gray.200" })}
                {...(line.color === "blue" && { color: "blue.400" })}
                {...(line.color === "yellow" && { color: "yellow.200" })}
                // letterSpacing="wider"
                fontFamily="mono"
                fontSize="sm"
                key={index}
              >
                {line.icon === "check" && (
                  <Text as="span" mr="2" fontSize="xl">
                    ✔️
                  </Text>
                )}
                {line.icon === "arrow-right" && (
                  <Text as="span" mr="2" fontSize="xl">
                    ➡
                  </Text>
                )}
                {line.icon === "clock" && (
                  <Text as="span" mr="2" fontSize="xl">
                    ⏱️
                  </Text>
                )}
                {line.icon === "cross" && (
                  <Text as="span" mr="2" fontSize="xl">
                    ✖️
                  </Text>
                )}
                {`${line.text}`}
              </Text>
            );
          })}
          {state.hasTag("testsPassed") && (
            <Button
              onClick={() => send("GO_TO_NEXT_LESSON")}
              colorScheme="green"
              fontFamily="mono"
              fontSize="sm"
              mt="3"
              rounded="none"
              className="px-4 py-2 mt-3 font-mono text-sm font-semibold text-black uppercase bg-green-400"
            >
              Next Lesson
            </Button>
          )}
          {/* {state.hasTag("testsNotPassed") && (
            <Button
              // onClick={() => send("GO_TO_NEXT_LESSON")}
              colorScheme="red"
              fontFamily="mono"
              fontSize="sm"
              mt="3"
              className="px-4 py-2 mt-3 font-mono text-sm font-semibold text-black uppercase bg-red-400"
            >
              Show Answer
            </Button>
          )} */}
        </Box>
      </Box>
    </Box>
  );
};
