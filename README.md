# Getting started

Run `yarn dev` to start the project

# Important Files

## `pages/lessons/[lessonId.tsx]`

Where the lessons get implemented. Very messy. Visit `/pages/lessons/assign` in localhost:3000 to try it

## `lessonRunner.machine.ts`

Where all the logic for the lesson runner lives

## `lessons/lessons/courses`

Where all of the course information lives. Add courses to this folder.

# TODO

- Strip out tailwind and replace with Chakra UI
- Make the lesson runner look pretty
- Strip out the esbuild-on-API setup and use Monaco editor to compile
- Set up Monaco editor to use imports, in the same way as we have it in Stately viz
- Build a page to display all the courses
- Go on to the next course when you're done with the first one.
