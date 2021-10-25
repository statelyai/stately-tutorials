// 1. import `extendTheme` function
import { extendTheme, ThemeConfig } from "@chakra-ui/react";
// 2. Add your color mode config
const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

// 3. extend the theme
export const theme = extendTheme({
  config,
  fonts: {
    heading: "TTCommons",
    body: "TTCommons",
  },
  styles: {
    global: {
      "html, body": {
        backgroundColor: "gray.900",
      },
    },
  },
  components: {
    // https://github.com/chakra-ui/chakra-ui/blob/main/packages/theme/src/components/switch.ts
    Switch: {
      baseStyle: {
        track: {
          _checked: {
            bg: "primary.500",
          },
        },
      },
    },
  },
  colors: {
    gray: {
      "50": "#EFEFF1",
      "100": "#E1E2E5",
      "200": "#C6C7CD",
      "300": "#ABACB5",
      "400": "#8F919D",
      "500": "#757785",
      "600": "#5D5F6A",
      "700": "#45464F",
      "800": "#2D2E34",
      "900": "#151618",
    },
    primary: {
      500: "#056DFF",
      600: "#1956DD",
    },
    danger: {
      500: "#F44747",
      600: "#EF0F0F",
    },
    warning: {
      500: "#FF9044",
    },
    redAlpha: {
      100: "rgba(244, 71, 71, 0.2)",
    },
  },
});
