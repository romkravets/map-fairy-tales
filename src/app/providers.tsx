"use client";
import { ReactNode } from "react";
import { createTheme, StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { UserAuthBuilderProvider } from "../../context/context";
import AuthStateWrapper from "@/components/Auth/AuthStateWrapper";
import PrimaryLayout from "@/layout/PrimaryLayout/PrimaryLayout";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import {
  primaryColor,
  secondaryColor,
  accentColor,
  helperTextColor,
  primaryFont,
  textColor,
  lightGrayColor,
} from "@/helpers/variables/variables";

const theme = createTheme({
  palette: {
    primary: { main: primaryColor },
    secondary: { main: secondaryColor },
    info: { main: secondaryColor, contrastText: primaryColor },
    success: { main: textColor },
  },
  typography: {
    fontFamily: primaryFont,
    allVariants: { textTransform: "capitalize" },
    h2: { fontSize: "1.5rem", fontWeight: 600, lineHeight: "2rem" },
    h3: { fontSize: "1.125rem" },
    body2: { color: helperTextColor },
  },
  components: {
    MuiSelect: {
      styleOverrides: { select: { padding: "0.75rem 0.9rem" } },
    },
    MuiButton: {
      styleOverrides: {
        root: { padding: "15px 20px", borderRadius: 16, boxShadow: "none" },
        containedInfo: {
          "&:hover": { backgroundColor: secondaryColor, color: primaryColor },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { width: 42, height: 26, padding: 0 },
        switchBase: {
          padding: 0,
          margin: 2,
          transitionDuration: "300ms",
          "&.Mui-checked": {
            transform: "translateX(16px)",
            color: "#fff",
            "& + .MuiSwitch-track": {
              backgroundColor: primaryColor,
              opacity: 1,
              border: 0,
            },
            "&.Mui-disabled + .MuiSwitch-track": { opacity: 0.5 },
          },
          "&.Mui-focusVisible .MuiSwitch-thumb": {
            color: primaryColor,
            border: "6px solid #fff",
          },
          "&.Mui-disabled .MuiSwitch-thumb": { color: primaryColor },
          "&.Mui-disabled + .MuiSwitch-track": { opacity: 0.7 },
        },
        thumb: { boxSizing: "border-box", width: 22, height: 22 },
        track: {
          borderRadius: 26 / 2,
          backgroundColor: "#B3B9BD",
          opacity: 1,
          transition: "background-color 500ms",
        },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: lightGrayColor } },
    },
  },
});

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AccessibilityProvider>
      <AppRouterCacheProvider options={{ enableCssLayer: true }}>
        <ThemeProvider theme={theme}>
          <UserAuthBuilderProvider>
            <AuthStateWrapper>
              <PrimaryLayout>{children}</PrimaryLayout>
            </AuthStateWrapper>
          </UserAuthBuilderProvider>
        </ThemeProvider>
      </AppRouterCacheProvider>
    </AccessibilityProvider>
  );
}
