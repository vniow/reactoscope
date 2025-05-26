import { Controls, ControlButton } from '@xyflow/react';
import { useTheme } from '../hooks/useAppStore';

export function FlowControls() {
	const { theme, setTheme } = useTheme();

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

	return (
		<Controls className='bg-gray-100/50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'>
			<ControlButton
				onClick={handleThemeToggle}
				title={getThemeTitle()}
			>
				<span className='text-lg'>{getThemeIcon()}</span>
			</ControlButton>
		</Controls>
	);
}
