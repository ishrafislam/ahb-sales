type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: unknown;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== "production";
  }

  private formatMessage(entry: LogEntry): string {
    const time = entry.timestamp.toISOString();
    const ctx = entry.context ? `[${entry.context}]` : "";
    return `${time} ${entry.level.toUpperCase()} ${ctx} ${entry.message}`;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown
  ): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      data,
    };

    const formatted = this.formatMessage(entry);

    switch (level) {
      case "debug":
        if (this.isDevelopment) {
          console.debug(formatted, data !== undefined ? data : "");
        }
        break;
      case "info":
        console.log(formatted, data !== undefined ? data : "");
        break;
      case "warn":
        console.warn(formatted, data !== undefined ? data : "");
        break;
      case "error":
        console.error(formatted, data !== undefined ? data : "");
        break;
    }
  }

  debug(message: string, context?: string, data?: unknown): void {
    this.log("debug", message, context, data);
  }

  info(message: string, context?: string, data?: unknown): void {
    this.log("info", message, context, data);
  }

  warn(message: string, context?: string, data?: unknown): void {
    this.log("warn", message, context, data);
  }

  error(message: string, context?: string, data?: unknown): void {
    this.log("error", message, context, data);
  }
}

export const logger = new Logger();
