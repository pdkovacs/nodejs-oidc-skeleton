import { isNil } from "lodash-es";
import { getLogger } from "./logger.js";

const mockBoundery = 1024;
let currentlyUsed = 0;
let intervalHandle: NodeJS.Timeout;
let stopped = false;

export const startConsuming = (size: number, interval: number): void => {
	const logger = getLogger("startConsumeing");
	logger.debug("size: %o, interval: %o", size, interval);
	intervalHandle = setInterval(() => {
		logger.debug("currentlyUsed: %o", currentlyUsed);
		currentlyUsed += size;
		if (currentlyUsed >= mockBoundery) {
			stopped = true;
			clearInterval(intervalHandle);
		}
	}, interval);
};

export const stopConsuming = (): void => {
	if (!isNil(intervalHandle)) {
		clearInterval(intervalHandle);
	}
};

export const getCurrentlyUsedAmount = (): number => {
	return stopped
		? -1
		: currentlyUsed;
};
