// Linear gradient: node background at start/end, header color in the center
const variantHeaderGradient = {
	default:
		'bg-gradient-to-b from-white via-gray-200 to-white dark:from-gray-800 dark:via-gray-600 dark:to-gray-800',
	debug:
		'bg-gradient-to-b from-white via-blue-200 to-white dark:from-gray-800 dark:via-blue-600 dark:to-gray-800',
	primary:
		'bg-gradient-to-b from-white via-green-200 to-white dark:from-gray-800 dark:via-green-600 dark:to-gray-800',
	secondary:
		'bg-gradient-to-b from-white via-purple-200 to-white dark:from-gray-800 dark:via-purple-600 dark:to-gray-800',
	audio:
		'bg-gradient-to-b from-white via-orange-200 to-white dark:from-gray-800 dark:via-orange-600 dark:to-gray-800',
};

const variantHeaderTextStyles = {
	default: 'text-gray-800 dark:text-gray-100',
	debug: 'text-blue-800 dark:text-blue-100',
	primary: 'text-green-800 dark:text-green-100',
	secondary: 'text-purple-800 dark:text-purple-100',
	audio: 'text-orange-800 dark:text-orange-100',
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
		${variantHeaderGradient[variant]}
		${variantHeaderTextStyles[variant]}
		px-4
		flex items-center
		font-semibold font-mono
		text-sm
		 
		${className}
	  `}
			style={style}
		>
			{title}
		</div>
	);
}
