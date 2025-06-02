import { GridBlock } from './GridBlock';

export function DashDemo() {
	const dashSizes: Array<'xs' | 'sm' | 'md' | 'lg' | 'xl'> = [
		'xs',
		'sm',
		'md',
		'lg',
		'xl',
	];

	return (
		<div className='p-8 space-y-6'>
			<h2 className='text-2xl font-bold mb-4'>GridBlock Dash Size Demo</h2>

			<div className='grid grid-cols-1 gap-6'>
				{dashSizes.map((size) => (
					<div
						key={size}
						className='relative'
					>
						<h3 className='text-lg font-semibold mb-2'>Dash Size: {size}</h3>
						<GridBlock
							gridWidth={6}
							gridHeight={2}
							gridX={0}
							gridY={0}
							variant='primary'
							borderStyle='dashed'
							dashSize={size}
							showBorder={true}
						>
							<div className='flex items-center justify-center h-full'>
								<span className='text-lg font-mono'>Dash Size: {size}</span>
							</div>
						</GridBlock>
					</div>
				))}
			</div>

			<div className='mt-8'>
				<h3 className='text-lg font-semibold mb-2'>Comparison Side by Side</h3>
				<div className='relative h-48 bg-gray-100 dark:bg-gray-800 rounded-lg p-4'>
					{dashSizes.map((size, index) => (
						<GridBlock
							key={size}
							gridWidth={2}
							gridHeight={2}
							gridX={index * 2.5}
							gridY={0}
							variant='debug'
							borderStyle='dashed'
							dashSize={size}
							showBorder={true}
							transparentBackground={true}
						>
							<div className='flex items-center justify-center h-full text-xs'>
								{size}
							</div>
						</GridBlock>
					))}
				</div>
			</div>
		</div>
	);
}
