export const getScheduledTime = ({
	mediaTimestamp,
	targetTime,
	currentTime,
	sequenceStartTime,
}: {
	mediaTimestamp: number;
	targetTime: number;
	currentTime: number;
	sequenceStartTime: number;
}) => {
	const needsTrimStart = mediaTimestamp < sequenceStartTime;

	const offsetBecauseOfTrim = needsTrimStart
		? sequenceStartTime - mediaTimestamp
		: 0;
	const offsetBecauseOfTooLate = targetTime < 0 ? -targetTime : 0;
	const offset = offsetBecauseOfTrim + offsetBecauseOfTooLate;

	const scheduledTime = targetTime + currentTime + offset;

	return scheduledTime;
};

export const getDurationOfNode = ({
	mediaTimestamp,
	bufferDuration,
	sequenceEndTime,
	offset,
}: {
	mediaTimestamp: number;
	bufferDuration: number;
	sequenceEndTime: number;
	offset: number;
}) => {
	const unclampedMediaEndTime = mediaTimestamp + bufferDuration;

	const needsTrimEnd = unclampedMediaEndTime > sequenceEndTime;

	const duration = needsTrimEnd
		? bufferDuration -
			Math.max(0, unclampedMediaEndTime - sequenceEndTime) -
			offset
		: bufferDuration - offset;

	return duration;
};

export const getOffset = ({
	mediaTimestamp,
	targetTime,
	sequenceStartTime,
}: {
	mediaTimestamp: number;
	targetTime: number;
	sequenceStartTime: number;
}) => {
	const needsTrimStart = mediaTimestamp < sequenceStartTime;

	const offsetBecauseOfTrim = needsTrimStart
		? sequenceStartTime - mediaTimestamp
		: 0;
	const offsetBecauseOfTooLate = targetTime < 0 ? -targetTime : 0;

	const offset = offsetBecauseOfTrim + offsetBecauseOfTooLate;
	return offset;
};
