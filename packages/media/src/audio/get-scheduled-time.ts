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
