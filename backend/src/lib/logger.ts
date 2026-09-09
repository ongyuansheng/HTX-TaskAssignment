type LogDetails = Record<string, unknown>;

function writeLog(level: "info" | "warn" | "error", event: string, details: LogDetails = {}) {
  // Emit one JSON object per line so Docker logs stay searchable.
  if (process.env.NODE_ENV === "test") {
    return;
  }

  console[level](
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...details,
    }),
  );
}

export const logger = {
  info(event: string, details?: LogDetails) {
    writeLog("info", event, details);
  },
  warn(event: string, details?: LogDetails) {
    writeLog("warn", event, details);
  },
  error(event: string, details?: LogDetails) {
    writeLog("error", event, details);
  },
};
