/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {
			gradients: {
				'blue-purple': 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
				'green-blue': 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
			},
		},
	},
	plugins: [],
};
