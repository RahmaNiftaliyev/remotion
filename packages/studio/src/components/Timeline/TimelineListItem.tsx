import React, {useCallback, useContext, useMemo} from 'react';
import type {TSequence} from 'remotion';
import {Internals} from 'remotion';
import {TIMELINE_TRACK_SEPARATOR} from '../../helpers/colors';
import type {SchemaFieldInfo} from '../../helpers/timeline-layout';
import {
	getExpandedTrackHeight,
	getSchemaFields,
	getTimelineLayerHeight,
	TIMELINE_ITEM_BORDER_BOTTOM,
} from '../../helpers/timeline-layout';
import {ExpandedTracksContext} from '../ExpandedTracksProvider';
import {InputDragger} from '../NewComposition/InputDragger';
import {
	getZodNumberMaximum,
	getZodNumberMinimum,
	getZodNumberStep,
} from '../RenderModal/SchemaEditor/zod-number-constraints';
import {TimelineLayerEye} from './TimelineLayerEye';
import {TimelineStack} from './TimelineStack';

const SPACING = 5;

const space: React.CSSProperties = {
	width: SPACING,
	flexShrink: 0,
};

const arrowButton: React.CSSProperties = {
	background: 'none',
	border: 'none',
	color: 'white',
	cursor: 'pointer',
	padding: 0,
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	width: 12,
	height: 12,
	flexShrink: 0,
	fontSize: 8,
	marginRight: 4,
	userSelect: 'none',
	outline: 'none',
	lineHeight: 1,
};

const expandedSectionBase: React.CSSProperties = {
	color: 'white',
	fontFamily: 'Arial, Helvetica, sans-serif',
	fontSize: 12,
	display: 'flex',
	flexDirection: 'column',
	paddingLeft: 28,
	paddingRight: 10,
	borderBottom: `1px solid ${TIMELINE_TRACK_SEPARATOR}`,
};

const fieldRow: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: 8,
};

const fieldName: React.CSSProperties = {
	flex: 1,
	fontSize: 12,
};

const unsupportedLabel: React.CSSProperties = {
	color: 'rgba(255, 255, 255, 0.4)',
	fontSize: 12,
	marginLeft: 'auto',
	fontStyle: 'italic',
};

const draggerStyle: React.CSSProperties = {
	width: 80,
	marginLeft: 'auto',
};

const TimelineNumberField: React.FC<{
	readonly field: SchemaFieldInfo;
}> = ({field}) => {
	const onValueChange = useCallback((_newVal: number) => {
		// TODO: wire up value change
	}, []);

	const onTextChange = useCallback((_newVal: string) => {
		// TODO: wire up text change
	}, []);

	return (
		<InputDragger
			type="number"
			value={field.currentValue as number}
			style={draggerStyle}
			status="ok"
			onValueChange={onValueChange}
			onTextChange={onTextChange}
			min={getZodNumberMinimum(field.fieldSchema)}
			max={getZodNumberMaximum(field.fieldSchema)}
			step={getZodNumberStep(field.fieldSchema)}
			rightAlign
		/>
	);
};

const TimelineFieldValue: React.FC<{
	readonly field: SchemaFieldInfo;
}> = ({field}) => {
	if (!field.supported) {
		return <span style={unsupportedLabel}>unsupported</span>;
	}

	if (field.typeName === 'number') {
		return <TimelineNumberField field={field} />;
	}

	return (
		<span style={{...unsupportedLabel, fontStyle: 'normal'}}>
			{String(field.currentValue)}
		</span>
	);
};

export const TimelineListItem: React.FC<{
	readonly sequence: TSequence;
	readonly nestedDepth: number;
	readonly isCompact: boolean;
}> = ({nestedDepth, sequence, isCompact}) => {
	const visualModeEnabled = Boolean(
		process.env.EXPERIMENTAL_VISUAL_MODE_ENABLED,
	);
	const {hidden, setHidden} = useContext(
		Internals.SequenceVisibilityToggleContext,
	);
	const {expandedTracks, toggleTrack} = useContext(ExpandedTracksContext);

	const isExpanded = expandedTracks[sequence.id] ?? false;

	const schemaFields = useMemo(
		() => getSchemaFields(sequence.controls),
		[sequence.controls],
	);

	const expandedHeight = useMemo(
		() => getExpandedTrackHeight(sequence.controls),
		[sequence.controls],
	);

	const onToggleExpand = useCallback(() => {
		toggleTrack(sequence.id);
	}, [sequence.id, toggleTrack]);

	const padder = useMemo((): React.CSSProperties => {
		return {
			width: Number(SPACING * 1.5) * nestedDepth,
			flexShrink: 0,
		};
	}, [nestedDepth]);

	const isItemHidden = useMemo(() => {
		return hidden[sequence.id] ?? false;
	}, [hidden, sequence.id]);

	const onToggleVisibility = useCallback(
		(type: 'enable' | 'disable') => {
			setHidden((prev) => {
				return {
					...prev,
					[sequence.id]: type !== 'enable',
				};
			});
		},
		[sequence.id, setHidden],
	);

	const outer: React.CSSProperties = useMemo(() => {
		return {
			height:
				getTimelineLayerHeight(sequence.type === 'video' ? 'video' : 'other') +
				TIMELINE_ITEM_BORDER_BOTTOM,
			color: 'white',
			fontFamily: 'Arial, Helvetica, sans-serif',
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			wordBreak: 'break-all',
			textAlign: 'left',
			paddingLeft: SPACING,
			borderBottom: `1px solid ${TIMELINE_TRACK_SEPARATOR}`,
		};
	}, [sequence.type]);

	const arrowStyle: React.CSSProperties = useMemo(() => {
		return {
			...arrowButton,
			transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
		};
	}, [isExpanded]);

	return (
		<>
			<div style={outer}>
				<TimelineLayerEye
					type={sequence.type === 'audio' ? 'speaker' : 'eye'}
					hidden={isItemHidden}
					onInvoked={onToggleVisibility}
				/>
				<div style={padder} />
				{sequence.parent && nestedDepth > 0 ? <div style={space} /> : null}
				{visualModeEnabled ? (
					<button
						type="button"
						style={arrowStyle}
						onClick={onToggleExpand}
						aria-expanded={isExpanded}
						aria-label={`${isExpanded ? 'Collapse' : 'Expand'} track`}
					>
						<svg
							width="12"
							height="12"
							viewBox="0 0 8 8"
							style={{display: 'block'}}
						>
							<path d="M2 1L6 4L2 7Z" fill="white" />
						</svg>
					</button>
				) : null}
				<TimelineStack sequence={sequence} isCompact={isCompact} />
			</div>
			{visualModeEnabled && isExpanded ? (
				<div style={{...expandedSectionBase, height: expandedHeight}}>
					{schemaFields
						? schemaFields.map((field) => (
								<div
									key={field.key}
									style={{...fieldRow, height: field.rowHeight}}
								>
									<span style={fieldName}>{field.key}</span>
									<TimelineFieldValue field={field} />
								</div>
							))
						: 'No schema'}
				</div>
			) : null}
		</>
	);
};
