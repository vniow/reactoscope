import { Handle, Position } from '@xyflow/react';
import { useNodeTheme } from '../hooks/useNodeTheme';
import { conditionalClasses } from '../utils/classNames';

export interface ThemedNodeProps {
	nodeType: string;
	title: string;
	children: React.ReactNode;
	handles?: {
		inputs?: Array<{ id: string; label?: string }>;
		outputs?: Array<{ id: string; label?: string }>;
	};
	className?: string;
	selected?: boolean;
}

/**
 * Base themed node component that provides consistent styling
 * across all node types using semantic utility classes
 * Fully Tailwind v4 compliant with proper class merging
 */
export function ThemedNode({
	nodeType,
	title,
	children,
	handles,
	className = '',
	selected = false,
}: ThemedNodeProps) {
	const { classes } = useNodeTheme(nodeType);

	return (
		<div
			className={conditionalClasses(classes.container, {
				selected,
				[className]: Boolean(className),
			})}
		>
			{/* Node Header */}
			<div className={classes.header}>
				<div className={classes.title}>{title}</div>
			</div>

			{/* Node Content */}
			<div className={classes.content}>{children}</div>

			{/* Input Handles */}
			{handles?.inputs?.map((input, index) => (
				<Handle
					key={`input-${input.id}`}
					type='target'
					position={Position.Left}
					id={input.id}
					className={classes.handle.target}
					style={{ top: 40 + index * 20 }}
				/>
			))}

			{/* Output Handles */}
			{handles?.outputs?.map((output, index) => (
				<Handle
					key={`output-${output.id}`}
					type='source'
					position={Position.Right}
					id={output.id}
					className={classes.handle.source}
					style={{ top: 40 + index * 20 }}
				/>
			))}
		</div>
	);
}
