import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	const themes = [
		{ value: 'light', label: '☀️ Light', icon: '☀️' },
		{ value: 'dark', label: '🌙 Dark', icon: '🌙' },
		{ value: 'system', label: '💻 System', icon: '💻' },
	] as const;

	return (
		<div className='absolute top-4 right-4 z-10'>
			<div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2'>
				<div className='flex gap-1'>
					{themes.map((themeOption) => (
						<button
							key={themeOption.value}
							onClick={() => setTheme(themeOption.value)}
							className={`
								px-3 py-2 rounded-md text-sm font-medium transition-colors
								${
									theme === themeOption.value
										? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700'
										: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
								}
							`}
							title={themeOption.label}
						>
							<span className='text-lg'>{themeOption.icon}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
