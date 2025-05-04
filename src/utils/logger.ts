import { Signale } from "signale";

// Configure signale
const options = {
  disabled: false,
  interactive: false,
  logLevel: "info",
  scope: "sm-evals",
  secrets: [],
  stream: process.stdout,
  types: {
    success: {
      badge: "✓",
      color: "green",
      label: "success",
      logLevel: "info",
    },
    info: {
      badge: "ℹ",
      color: "blue",
      label: "info",
      logLevel: "info",
    },
    warn: {
      badge: "⚠",
      color: "yellow",
      label: "warning",
      logLevel: "warn",
    },
    error: {
      badge: "✖",
      color: "red",
      label: "error",
      logLevel: "error",
    },
    debug: {
      badge: "🔍",
      color: "magenta",
      label: "debug",
      logLevel: "debug",
    },
  },
};

// Create the logger instance
const signale = new Signale(options);

export default signale;
