import { Handle, type HandleProps } from '@xyflow/react';

export interface BaseHandleProps extends HandleProps {
	className?: string;
}

export default function BaseHandle(props: BaseHandleProps) {
	// You can add more logic or props here if needed
	return <Handle {...props} />;
}
