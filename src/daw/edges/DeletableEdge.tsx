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

export function DeletableEdge({
	id,
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
							sx={{
								bgcolor:     'background.paper',
								border:      '1px solid',
								borderColor: 'divider',
								p:           0.25,
								color:       'text.secondary',
								'&:hover':   { color: 'error.main', borderColor: 'error.main' },
							}}
						>
							<CloseIcon sx={{ fontSize: 11 }} />
						</IconButton>
					</div>
				</EdgeLabelRenderer>
			)}
		</>
	);
}
