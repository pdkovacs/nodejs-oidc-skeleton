import { isNil } from "lodash-es";

const mockBoundery = 1024;
let currentlyUsed = 0;
let intervalHandle: NodeJS.Timeout;
let stopped = false;

export const startConsuming = (size: number, interval: number): void => {
	intervalHandle = setInterval(() => {
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
