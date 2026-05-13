import { useCallback } from 'react';
import {
	BaseEdge,
	EdgeLabelRenderer,
	getBezierPath,
	getSmoothStepPath,
	getStraightPath,
	type EdgeProps,
} from '@xyflow/react';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useDawStore } from '../../store/daw';
import { hwDeleteIconBtn } from '../nodes/hwStyles';
import { NODE_COLORS } from '../nodes/nodeColors';

const TYPE_COLOR: Record<string, string> = {
	oscillator:     NODE_COLORS.source,
	noiseGenerator: NODE_COLORS.source,
	dcSignal:       NODE_COLORS.source,
	player:         NODE_COLORS.source,
	gain:           NODE_COLORS.processor,
	stub:           NODE_COLORS.processor,
	sceneInput:     NODE_COLORS.scene,
	masterOutput:   NODE_COLORS.output,
	debug:          NODE_COLORS.debug,
};

export function DeletableEdge({
	id,
	source,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	selected,
	style,
	markerEnd,
}: EdgeProps) {
	const edgePathType = useDawStore(s => s.edgePathType);
	const onEdgesChange = useDawStore(s => s.onEdgesChange);
	const edgeColor = useDawStore(s => {
		const srcType = s.nodes.find(n => n.id === source)?.type ?? '';
		return TYPE_COLOR[srcType] ?? NODE_COLORS.utility;
	});

	const pathArgs = { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition };
	const [edgePath, labelX, labelY] =
		edgePathType === 'bezier'     ? getBezierPath(pathArgs)                              :
		edgePathType === 'straight'   ? getStraightPath(pathArgs)                            :
		edgePathType === 'step'       ? getSmoothStepPath({ ...pathArgs, borderRadius: 0 })  :
		                                getSmoothStepPath(pathArgs);

	const handleDelete = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onEdgesChange([{ type: 'remove', id }]);
		},
		[id, onEdgesChange],
	);

	return (
		<>
			<BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />

			{selected && (
				<EdgeLabelRenderer>
					<div
						style={{
							position:      'absolute',
							transform:     `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
							pointerEvents: 'all',
						}}
						className='nodrag nopan'
					>
						<IconButton
							size='small'
							onClick={handleDelete}
							aria-label='Delete edge'
							sx={hwDeleteIconBtn(edgeColor)}
						>
							<CloseIcon sx={{ fontSize: 11 }} />
						</IconButton>
					</div>
				</EdgeLabelRenderer>
			)}
		</>
	);
}
