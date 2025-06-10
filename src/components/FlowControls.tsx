import { Panel, useReactFlow } from '@xyflow/react';
import { useTheme } from '../hooks/useAppStore';
import { useAppStore } from '../stores/appStore';
import { GRID_UNIT } from '../config/grid';

export function FlowControls() {
	const { theme, setTheme } = useTheme();
	const metallicBackground = useAppStore((state) => state.theme.metallicBackground);
	const setMetallicBackground = useAppStore((state) => state.setMetallicBackground);
	const { zoomIn, zoomOut, fitView } = useReactFlow();

	const handleThemeToggle = () => {
		// Cycle through: light -> dark -> system -> light
		if (theme === 'light') {
			setTheme('dark');
		} else if (theme === 'dark') {
			setTheme('system');
		} else {
			setTheme('light');
		}
	};

	const getThemeIcon = () => {
		if (theme === 'light') return '☀️';
		if (theme === 'dark') return '🌙';
		return '💻'; // system
	};

	const getThemeTitle = () => {
		if (theme === 'light') return 'Switch to Dark Theme';
		if (theme === 'dark') return 'Switch to System Theme';
		return 'Switch to Light Theme';
	};

	const toggleRainbowMetallic = () => {
		setMetallicBackground(metallicBackground === 'rainbow' ? 'titanium' : 'rainbow');
	};

	return (
		<Panel
			position='bottom-left'
			className='max-w-full'
		>
			{/* Main container with custom blurred background styling */}
			<div
				className='relative glass-panel-enhanced rounded-xl transition-all duration-300 ease-in-out'
				style={{
					width: `${GRID_UNIT * 5}px`, // Wider to accommodate 5 controls
					height: `${GRID_UNIT}px`, // Single row height
				}}
			>
				<div className='flex items-center justify-center h-full gap-2 px-2'>
					{/* Zoom In Control */}
					<button
						onClick={() => zoomIn()}
						title='Zoom In'
						className='flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
					>
						<span className='text-lg'>🔍</span>
						<span className='text-xs ml-1'>+</span>
					</button>

					{/* Zoom Out Control */}
					<button
						onClick={() => zoomOut()}
						title='Zoom Out'
						className='flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
					>
						<span className='text-lg'>🔍</span>
						<span className='text-xs ml-1'>-</span>
					</button>

					{/* Fit View Control */}
					<button
						onClick={() => fitView()}
						title='Fit View'
						className='flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
					>
						<span className='text-lg'>⌕</span>
					</button>
					{/* Theme Toggle Control */}
					<button
						onClick={handleThemeToggle}
						title={getThemeTitle()}
						className='flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
					>
						<span className='text-lg'>{getThemeIcon()}</span>
					</button>

					{/* Rainbow Toggle Control */}
					<button
						onClick={toggleRainbowMetallic}
						title={`Toggle rainbow metallic theme (${metallicBackground === 'rainbow' ? 'on' : 'off'})`}
						className='flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
						style={{ 
							background: metallicBackground === 'rainbow' 
								? 'linear-gradient(45deg, #ff0080, #ff8c00, #40e0d0, #ff0080)' 
								: undefined,
							color: metallicBackground === 'rainbow' ? 'white' : undefined,
							textShadow: metallicBackground === 'rainbow' ? '0 1px 2px rgba(0,0,0,0.5)' : undefined
						}}
					>
						<span className='text-lg'>🌈</span>
					</button>
				</div>
			</div>
		</Panel>
	);
}
