import type { ReactNode } from 'react';

type NodeWrapperProps = {
	label: string;
	children: ReactNode;
	className?: string;
};

export function NodeWrapper({
	label,
	children,
	className = '',
}: NodeWrapperProps) {
	return (
		<div
			className={`flex flex-col border-2 border-purple-500 h-full rounded-lg bg-gray-900 shadow-lg ${className}`}
		>
			<div className='text-sm px-3 py-2 border-b border-purple-700 font-mono font-semibold rounded-t-lg text-purple-400 bg-gray-800'>
				{label}
			</div>
			<div className='relative bg-gray-900 p-3 flex rounded-b-lg flex-1'>
				{children}
			</div>
		</div>
	);
}
