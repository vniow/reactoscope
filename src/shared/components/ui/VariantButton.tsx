/**
 * Enhanced button component with variant-based color inheritance
 */

import React from 'react';
import { useVariantButtonStyles } from '../../utils/useVariantColors';
import type { ComponentVariant } from '../../types/ui';

interface VariantButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant: ComponentVariant;
	size?: 'sm' | 'md' | 'lg';
	children: React.ReactNode;
	icon?: React.ReactNode;
	useCustomColors?: boolean; // Whether to use the new color system
}

export function VariantButton({
	variant,
	size = 'md',
	children,
	icon,
	useCustomColors = true,
	className = '',
	style = {},
	...props
}: VariantButtonProps) {
	const variantStyles = useVariantButtonStyles(variant);

	const sizeClasses = {
		sm: 'h-10 min-h-10 text-xs px-2 py-1',
		md: 'h-14 min-h-14 text-sm px-3 py-2',
		lg: 'h-16 min-h-16 text-base px-4 py-3',
	};

	const buttonStyle = useCustomColors ? { ...variantStyles, ...style } : style;

	return (
		<button
			{...props}
			data-variant={variant}
			className={`
				${sizeClasses[size]} 
				flex flex-col items-center justify-center text-center 
				rounded-lg transition-all duration-200 
				focus:outline-none focus:ring-2 focus:ring-offset-2 
				hover:scale-105 transform 
				border border-transparent
				font-medium shadow-md
				${useCustomColors ? '' : 'bg-blue-600 text-white hover:bg-blue-700'}
				${className}
			`.trim()}
			style={buttonStyle}
		>
			{icon && (
				<div
					className='mb-1'
					aria-hidden='true'
				>
					{icon}
				</div>
			)}
			<div className='leading-tight'>{children}</div>
		</button>
	);
}
