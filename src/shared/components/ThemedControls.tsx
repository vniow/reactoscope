import { useNodeTheme } from '../hooks/useNodeTheme';

/**
 * Themed control components for consistent styling across all nodes
 */

interface ThemedButtonProps {
	onClick: () => void;
	children: React.ReactNode;
	variant?: 'primary' | 'secondary';
	active?: boolean;
	nodeType: string;
}

export function ThemedButton({
	onClick,
	children,
	variant = 'primary',
	active,
	nodeType,
	...props
}: ThemedButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
	const { classes } = useNodeTheme(nodeType);
	const buttonClass =
		variant === 'primary'
			? active !== undefined
				? classes.button.toggle(active)
				: classes.button.primary
			: classes.button.secondary;

	return (
		<button
			onClick={onClick}
			className={buttonClass}
			{...props}
		>
			{children}
		</button>
	);
}

interface ThemedLabelProps {
	children: React.ReactNode;
	nodeType: string;
}

export function ThemedLabel({
	children,
	nodeType,
	...props
}: ThemedLabelProps & React.LabelHTMLAttributes<HTMLLabelElement>) {
	const { classes } = useNodeTheme(nodeType);
	return (
		<label
			className={classes.label}
			{...props}
		>
			{children}
		</label>
	);
}

interface ThemedValueProps {
	children: React.ReactNode;
	nodeType: string;
}

export function ThemedValue({
	children,
	nodeType,
	...props
}: ThemedValueProps & React.HTMLAttributes<HTMLSpanElement>) {
	const { classes } = useNodeTheme(nodeType);
	return (
		<span
			className={classes.value}
			{...props}
		>
			{children}
		</span>
	);
}

interface ThemedRangeInputProps {
	nodeType: string;
}

export function ThemedRangeInput({
	nodeType,
	...props
}: ThemedRangeInputProps & React.InputHTMLAttributes<HTMLInputElement>) {
	const { classes } = useNodeTheme(nodeType);
	return (
		<input
			type='range'
			className={classes.input.range}
			{...props}
		/>
	);
}

interface ThemedSelectProps {
	nodeType: string;
	children: React.ReactNode;
}

export function ThemedSelect({
	nodeType,
	children,
	...props
}: ThemedSelectProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
	const { classes } = useNodeTheme(nodeType);
	return (
		<select
			className={classes.input.select}
			{...props}
		>
			{children}
		</select>
	);
}
