const variantHeaderBorderStyles = {
	default: 'border-gray-300 dark:border-gray-600',
	debug: 'border-blue-300 dark:border-blue-600',
	primary: 'border-green-300 dark:border-green-600',
	secondary: 'border-purple-300 dark:border-purple-600',
	audio: 'border-orange-300 dark:border-orange-600',
};

const variantHeaderTextStyles = {
	default: 'text-gray-800 dark:text-gray-100',
	debug: 'text-blue-800 dark:text-blue-100',
	primary: 'text-green-800 dark:text-green-100',
	secondary: 'text-purple-800 dark:text-purple-100',
	audio: 'text-orange-800 dark:text-orange-100',
};

const variantHeaderShadowStyles = {
	default: 'shadow-gray-300/50 dark:shadow-gray-600/50',
	debug: 'shadow-blue-300/50 dark:shadow-blue-600/50',
	primary: 'shadow-green-300/50 dark:shadow-green-600/50',
	secondary: 'shadow-purple-300/50 dark:shadow-purple-600/50',
	audio: 'shadow-orange-300/50 dark:shadow-orange-600/50',
};

export interface NodeHeaderProps {
	title: string;
	variant?: 'default' | 'debug' | 'primary' | 'secondary' | 'audio';
	className?: string;
	style?: React.CSSProperties;
}

export function NodeHeader({
	title,
	variant = 'default',
	className = '',
	style,
}: NodeHeaderProps) {
	return (
		<div
			className={`
		bg-gradient-to-b from-slate-200 via-slate-50 to-slate-200 dark:from-slate-600 dark:via-slate-800 dark:to-slate-600
		${variantHeaderTextStyles[variant]}
		${variantHeaderBorderStyles[variant]}
		rounded-sm
		
		px-4
		flex items-center
		font-semibold font-mono
		text-xl
		shadow-lg
		${variantHeaderShadowStyles[variant]}
		 
		${className}
	  `}
			style={style}
		>
			{title}
		</div>
	);
}
