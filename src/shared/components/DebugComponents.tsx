import { formatDebugValue } from '../shared/utils/debugUtils';

/**
 * Presenter component for debug information blocks
 * Follows the Container/Presenter pattern
 */

interface DebugInfoBlockProps {
	title: string;
	info: Record<string, unknown>;
	className?: string;
}

export function DebugInfoBlock({
	title,
	info,
	className = '',
}: DebugInfoBlockProps) {
	return (
		<div
			className={`w-full h-full flex flex-col justify-center p-2 ${className}`}
		>
			<div className='font-semibold text-center mb-1'>{title}</div>
			<div className='space-y-1 text-xs'>
				{Object.entries(info).map(([label, value]) => (
					<div
						key={label}
						className='flex flex-col gap-1'
					>
						<span className='font-semibold opacity-70'>{label}:</span>
						<span className='break-all'>{formatDebugValue(value)}</span>
					</div>
				))}
			</div>
		</div>
	);
}

interface DebugDataDisplayProps {
	data: unknown;
	className?: string;
}

export function DebugDataDisplay({
	data,
	className = '',
}: DebugDataDisplayProps) {
	return (
		<div className={`w-full h-full flex flex-col p-2 ${className}`}>
			<div className='font-semibold text-center mb-2'>Data Object</div>
			<div className='flex-1 overflow-auto'>
				<pre className='text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all'>
					{JSON.stringify(data, null, 2)}
				</pre>
			</div>
		</div>
	);
}
