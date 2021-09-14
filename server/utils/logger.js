// @flow
import chalk from "chalk";
import winston from "winston";
import env from "../env";
import Sentry from "../utils/sentry";
import * as metrics from "./metrics";

const isProduction = env.NODE_ENV === "production";

type LogCategory =
  | "lifecycle"
  | "collaboration"
  | "http"
  | "commands"
  | "processor"
  | "email"
  | "queue"
  | "database"
  | "utils";

type Extra = { [key: string]: any };

class Logger {
  output: any;

  constructor() {
    this.output = winston.createLogger();
    this.output.add(
      new winston.transports.Console({
        format: isProduction
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(
                ({ message, label }) =>
                  `${chalk.bold("[" + label + "]")} ${message}`
              )
            ),
      })
    );
  }

  /**
   * Log information
   *
   * @param category A log message category that will be prepended
   * @param extra Arbitrary data to be logged that will appear in prod logs
   */
  info(label: LogCategory, message: string, extra?: Extra) {
    this.output.info(message, { ...extra, label });
  }

  /**
   * Debug information
   *
   * @param category A log message category that will be prepended
   * @param extra Arbitrary data to be logged that will appear in prod logs
   */
  debug(label: LogCategory, message: string, extra?: Extra) {
    this.output.debug(message, { ...extra, label });
  }

  /**
   * Log a warning
   *
   * @param message A warning message
   * @param extra Arbitrary data to be logged that will appear in prod logs
   */
  warn(message: string, extra?: Extra) {
    metrics.increment("logger.warning");

    if (process.env.SENTRY_DSN) {
      Sentry.withScope(function (scope) {
        for (const key in extra) {
          scope.setExtra(key, extra[key]);
          scope.setLevel(Sentry.Severity.Warning);
        }
        Sentry.captureMessage(message);
      });
    }

    this.output.warn(message, extra);
  }

  /**
   * Report a runtime error
   *
   * @param message A description of the error
   * @param error The error that occurred
   * @param extra Arbitrary data to be logged that will appear in prod logs
   */
  error(message: string, error: Error, extra?: Extra) {
    metrics.increment("logger.error");

    if (process.env.SENTRY_DSN) {
      Sentry.withScope(function (scope) {
        for (const key in extra) {
          scope.setExtra(key, extra[key]);
          scope.setLevel(Sentry.Severity.Error);
        }
        Sentry.captureException(error);
      });
    }

    if (isProduction) {
      this.output.error(message, { error: error.message, stack: error.stack });
    } else {
      console.error(error);
    }
  }
}

export default new Logger();
