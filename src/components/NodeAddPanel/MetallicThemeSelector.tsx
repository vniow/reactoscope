import { GridBlock } from '../GridBlock';
import { useAppStore } from '../../stores/appStore';
import type { MetallicTheme } from '../../stores/types';

const METALLIC_OPTIONS: {
	value: MetallicTheme;
	label: string;
	icon: string;
	description: string;
}[] = [
	{
		value: 'chrome',
		label: 'Chrome',
		icon: '⚪',
		description: 'Silver metallic sheen',
	},
	{
		value: 'gold',
		label: 'Gold',
		icon: '🟡',
		description: 'Golden metallic finish',
	},
	{
		value: 'copper',
		label: 'Copper',
		icon: '🟠',
		description: 'Copper metallic tone',
	},
	{
		value: 'titanium',
		label: 'Titanium',
		icon: '🔵',
		description: 'Blue-tinted metallic',
	},
	{
		value: 'rainbow',
		label: 'Rainbow',
		icon: '🌈',
		description: 'Iridescent chrome',
	},
];

interface MetallicThemeSelectorProps {
	gridWidth: number;
	gridHeight: number;
	gridX: number;
	gridY: number;
}

export function MetallicThemeSelector({
	gridWidth,
	gridHeight,
	gridX,
	gridY,
}: MetallicThemeSelectorProps) {
	const metallicBackground = useAppStore(
		(state) => state.theme.metallicBackground
	);
	const setMetallicBackground = useAppStore(
		(state) => state.setMetallicBackground
	);

	return (
		<GridBlock
			gridWidth={gridWidth}
			gridHeight={gridHeight}
			gridX={gridX}
			gridY={gridY}
			variant='secondary'
			showBorder={true}
			transparentBackground={false}
		>
			<div className='w-full h-full p-2'>
				<div className='text-xs font-medium text-gray-700 dark:text-gray-300 mb-2'>
					✨ Metallic Background
				</div>

				{/* Grid of metallic options */}
				<div className='grid grid-cols-2 gap-1 mb-2'>
					{METALLIC_OPTIONS.slice(0, 4).map((option) => (
						<button
							key={option.value}
							onClick={() => setMetallicBackground(option.value)}
							className={`
								px-2 py-1 text-xs rounded transition-all duration-200
								flex flex-col items-center justify-center gap-0.5
								hover:scale-105 active:scale-95
								${
									metallicBackground === option.value
										? 'bg-blue-500 text-white shadow-md'
										: 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
								}
							`}
							title={option.description}
						>
							<span className='text-sm'>{option.icon}</span>
							<span className='text-xs font-medium'>{option.label}</span>
						</button>
					))}
				</div>

				{/* Rainbow option takes full width */}
				<button
					onClick={() => setMetallicBackground('rainbow')}
					className={`
						w-full px-2 py-1 text-xs rounded transition-all duration-200
						flex items-center justify-center gap-1
						hover:scale-105 active:scale-95
						${
							metallicBackground === 'rainbow'
								? 'bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 text-white shadow-md'
								: 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
						}
					`}
					title={METALLIC_OPTIONS[4].description}
				>
					<span className='text-sm'>{METALLIC_OPTIONS[4].icon}</span>
					<span className='text-xs font-medium'>
						{METALLIC_OPTIONS[4].label}
					</span>
				</button>

				{/* Current selection indicator */}
				<div className='mt-1 text-xs text-gray-500 dark:text-gray-400 text-center'>
					{METALLIC_OPTIONS.find((opt) => opt.value === metallicBackground)
						?.label || 'Chrome'}
				</div>
			</div>
		</GridBlock>
	);
}
