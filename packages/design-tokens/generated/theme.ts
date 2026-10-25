/** GENERATED FILE — run `bun run tokens` after editing tokens.json. */
export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  anthracite: string;
  blue: string;
  blueSoft: string;
  brand: string;
  light: string;
  lightSoft: string;
  paper: string;
  mist: string;
  line: string;
  inkSoft: string;
  mute: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  toastInfo: string;
  toastSuccess: string;
  toastError: string;
  inverse: string;
  ambientGlow: string;
  ambientGlowSoft: string;
  ambientDot: string;
};

export const lightColors: ThemeColors = {
  anthracite: "#323232",
  blue: "#004191",
  blueSoft: "#E6EEF7",
  brand: "#004191",
  light: "#00BEFF",
  lightSoft: "#E5F8FF",
  paper: "#FFFFFF",
  mist: "#F3F6F8",
  line: "#E1E5E8",
  inkSoft: "#5E666E",
  mute: "#8B939A",
  success: "#1C6B45",
  successSoft: "#E5F4EC",
  warning: "#8A5A00",
  warningSoft: "#FBF3E4",
  danger: "#8E2F2F",
  dangerSoft: "#F8E8E8",
  toastInfo: "#004191",
  toastSuccess: "#1C6B45",
  toastError: "#8E2F2F",
  inverse: "#323232",
  ambientGlow: "rgba(0, 190, 255, 0.22)",
  ambientGlowSoft: "rgba(0, 65, 145, 0.08)",
  ambientDot: "rgba(0, 65, 145, 0.09)",
};

export const darkColors: ThemeColors = {
  anthracite: "#F1F4F7",
  blue: "#6CB4FF",
  blueSoft: "#152B42",
  brand: "#1E5FA8",
  light: "#38C6FF",
  lightSoft: "#0D2B36",
  paper: "#171B21",
  mist: "#0E1116",
  line: "#2B323C",
  inkSoft: "#A9B3BE",
  mute: "#79828D",
  success: "#5FD3A0",
  successSoft: "#102A1F",
  warning: "#F0C064",
  warningSoft: "#2C2415",
  danger: "#FF9B9B",
  dangerSoft: "#331A1C",
  toastInfo: "#1E5FA8",
  toastSuccess: "#246B4C",
  toastError: "#7A2F35",
  inverse: "#232A33",
  ambientGlow: "rgba(56, 198, 255, 0.16)",
  ambientGlowSoft: "rgba(30, 95, 168, 0.2)",
  ambientDot: "rgba(108, 180, 255, 0.14)",
};

export const themes: Record<ThemeMode, ThemeColors> = { light: lightColors, dark: darkColors };

export const space = {
  "screen": 20,
  "card": 16
} as const;
export const radius = {
  "sm": 8,
  "md": 12,
  "lg": 16,
  "pill": 999
} as const;
