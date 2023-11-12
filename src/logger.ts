import winston from "winston";
import _ from "lodash";

export type LoggerFactory = (label: string) => winston.Logger;
export type LogLevel = "info" | "error" | "debug" | "warn";

let defaultLogLevel: LogLevel = "info";

// Keep track of the loggers by label, so they can be reconfigured, if necessary
type Loggers = Record<string, winston.Logger>;
const loggers: Loggers = {};

export const getLogger = (label: string): winston.Logger => {
	const cached = loggers[label];

	if (!_.isNil(cached)) {
		return cached;
	} else {
		const logger = winston.createLogger({
			level: defaultLogLevel,
			format: winston.format.combine(
				winston.format.splat(),
				winston.format.timestamp(),
				winston.format.label({ label }),
				winston.format.printf(info => `${info.timestamp} ${info.level}: ${label}: ${info.message}`)
			),
			transports: [new winston.transports.Console()]
		});
		loggers[label] = logger;
		return logger;
	}
};

export const setDefaultLogLevel = (logLevel: LogLevel): void => {
	defaultLogLevel = logLevel;
};

export const updateDefaultLogLevel = (logLevel: LogLevel): void => {
	defaultLogLevel = logLevel;
	for (const logger of Object.values(loggers)) {
		if (_.isNil(logger)) {
			return;
		}
		logger.level = logLevel;
	};
};

export const getDefaultLogLevel = (): string => defaultLogLevel;
