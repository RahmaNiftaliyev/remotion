import type {SequenceNodePath} from '@remotion/studio-shared';
import React, {useCallback, useContext, useMemo} from 'react';
import type {TSequence} from 'remotion';
import type {
	CodePosition,
	OriginalPosition,
} from '../../error-overlay/react-overlay/utils/get-source-map';
import {TIMELINE_TRACK_SEPARATOR} from '../../helpers/colors';
import type {TimelineTreeNode} from '../../helpers/timeline-layout';
import {
	buildTimelineTree,
	EXPANDED_SECTION_PADDING_LEFT,
	EXPANDED_SECTION_PADDING_RIGHT,
	flattenVisibleTreeNodes,
	getExpandedTrackHeight,
	getSchemaFields,
	getTreeRowHeight,
	TREE_GROUP_ROW_HEIGHT,
	TREE_INDENT_PER_LEVEL,
} from '../../helpers/timeline-layout';
import {ExpandedTracksContext} from '../ExpandedTracksProvider';
import {TimelineFieldRow} from './TimelineFieldRow';
import {SPACING} from './TimelineListItem';

const expandedSectionBase: React.CSSProperties = {
	color: 'white',
	fontFamily: 'Arial, Helvetica, sans-serif',
	fontSize: 12,
	display: 'flex',
	flexDirection: 'column',
	borderBottom: `1px solid ${TIMELINE_TRACK_SEPARATOR}`,
};

const separator: React.CSSProperties = {
	height: 1,
	backgroundColor: TIMELINE_TRACK_SEPARATOR,
};

const arrowButtonBase: React.CSSProperties = {
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
	marginRight: 6,
	userSelect: 'none',
	outline: 'none',
	lineHeight: 1,
};

const groupRowBase: React.CSSProperties = {
	height: TREE_GROUP_ROW_HEIGHT,
	display: 'flex',
	alignItems: 'center',
	paddingRight: EXPANDED_SECTION_PADDING_RIGHT,
	cursor: 'pointer',
};

const rowLabel: React.CSSProperties = {
	fontSize: 12,
	color: 'rgba(255, 255, 255, 0.8)',
	userSelect: 'none',
};

const labelOnlyRowBase: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	paddingRight: EXPANDED_SECTION_PADDING_RIGHT,
};

const Arrow: React.FC<{readonly isExpanded: boolean}> = ({isExpanded}) => {
	return (
		<svg
			width="12"
			height="12"
			viewBox="0 0 8 8"
			style={{
				display: 'block',
				transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
			}}
		>
			<path d="M2 1L6 4L2 7Z" fill="white" />
		</svg>
	);
};

export const TimelineExpandedSection: React.FC<{
	readonly sequence: TSequence;
	readonly originalLocation: OriginalPosition | null;
	readonly nestedDepth: number;
	readonly nodePath: SequenceNodePath | null;
}> = ({sequence, originalLocation, nestedDepth, nodePath}) => {
	const {expandedTracks, toggleTrack} = useContext(ExpandedTracksContext);

	const overrideId = sequence.controls?.overrideId ?? sequence.id;

	const validatedLocation: CodePosition | null = useMemo(() => {
		if (
			!originalLocation ||
			!originalLocation.source ||
			!originalLocation.line
		) {
			return null;
		}

		return {
			source: originalLocation.source,
			line: originalLocation.line,
			column: originalLocation.column ?? 0,
		};
	}, [originalLocation]);

	const tree = useMemo(() => buildTimelineTree(sequence), [sequence]);

	const flat = useMemo(
		() => flattenVisibleTreeNodes(tree, expandedTracks),
		[tree, expandedTracks],
	);

	const expandedHeight = useMemo(
		() => getExpandedTrackHeight(sequence, expandedTracks),
		[sequence, expandedTracks],
	);

	const sequenceOffsetPx = SPACING * 3 * nestedDepth;

	const keysToObserve = useMemo(() => {
		const fields = getSchemaFields(sequence.controls);
		if (!fields) {
			return [];
		}

		return fields.map((f) => f.key);
	}, [sequence.controls]);

	const style = useMemo(() => {
		return {
			...expandedSectionBase,
			height: expandedHeight,
		};
	}, [expandedHeight]);

	const renderRow = useCallback(
		(node: TimelineTreeNode, depth: number) => {
			const paddingLeft =
				EXPANDED_SECTION_PADDING_LEFT +
				depth * TREE_INDENT_PER_LEVEL +
				sequenceOffsetPx;

			if (node.kind === 'group') {
				const isExpanded = expandedTracks[node.id] ?? false;
				return (
					<div
						role="button"
						tabIndex={0}
						style={{...groupRowBase, paddingLeft}}
						onClick={() => toggleTrack(node.id)}
						aria-expanded={isExpanded}
					>
						<span style={arrowButtonBase}>
							<Arrow isExpanded={isExpanded} />
						</span>
						<span style={rowLabel}>{node.label}</span>
					</div>
				);
			}

			if (node.field) {
				return (
					<TimelineFieldRow
						field={node.field}
						overrideId={overrideId}
						validatedLocation={validatedLocation}
						paddingLeft={paddingLeft}
						nodePath={nodePath}
						keysToObserve={keysToObserve}
					/>
				);
			}

			return (
				<div
					style={{
						...labelOnlyRowBase,
						height: getTreeRowHeight(node),
						paddingLeft,
					}}
				>
					<span style={rowLabel}>{node.label}</span>
				</div>
			);
		},
		[
			expandedTracks,
			keysToObserve,
			nodePath,
			overrideId,
			sequenceOffsetPx,
			toggleTrack,
			validatedLocation,
		],
	);

	if (flat.length === 0) {
		return <div style={style}>No schema</div>;
	}

	return (
		<div style={style}>
			{flat.map(({node, depth}, i) => {
				return (
					<React.Fragment key={node.id}>
						{i > 0 ? <div style={separator} /> : null}
						{renderRow(node, depth)}
					</React.Fragment>
				);
			})}
		</div>
	);
};
