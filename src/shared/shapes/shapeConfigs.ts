import { RGBTriangleComponent } from './RGBTriangleComponent';
import { GreenSquareComponent } from './GreenSquareComponent';
import { RGB_TRIANGLE_POINTS, RGB_TRIANGLE_COLORS } from './triangleData';
import { GREEN_SQUARE_POINTS, GREEN_SQUARE_COLORS } from './squareData';

export interface ShapeConfig {
	id: string;
	name: string;
	component: React.ComponentType<any>;
	points: [number, number, number][];
	colors: [number, number, number][];
}

export const SHAPE_CONFIGS: ShapeConfig[] = [
	{
		id: 'rgb-triangle',
		name: 'RGB Triangle',
		component: RGBTriangleComponent,
		points: RGB_TRIANGLE_POINTS,
		colors: RGB_TRIANGLE_COLORS,
	},
	{
		id: 'green-square',
		name: 'Green Square',
		component: GreenSquareComponent,
		points: GREEN_SQUARE_POINTS,
		colors: GREEN_SQUARE_COLORS,
	},
];
