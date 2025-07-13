/**
 * CRTBarrelDistortionPass - Postprocessing pass for CRT barrel distortion effect
 * Applies a simple barrel distortion to the image
 * @param strength - Distortion strength (0.0-0.5 typical)
 */
import { forwardRef } from 'react';
import { BlendFunction, Effect } from 'postprocessing';
import { Uniform } from 'three';

export interface CRTBarrelDistortionPassProps {
	strength?: number;
}
class CRTBarrelDistortionEffect extends Effect {
	strength: number;
	constructor(strength: number = 0.2) {
		super(
			'CRTBarrelDistortionEffect',
			`
      uniform float strength;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec2 center = uv - 0.5;
        float r = length(center);
        vec2 barrel = center * (1.0 + strength * r * r);
        vec2 uvBarrel = barrel + 0.5;
        outputColor = texture2D(inputBuffer, uvBarrel);
      }
      `,
			{
				blendFunction: BlendFunction.NORMAL,
				uniforms: new Map([['strength', new Uniform(strength)]]),
			}
		);
		this.strength = strength;
	}
	update(_renderer?: unknown, _inputBuffer?: unknown, _deltaTime?: unknown) {
		const strengthUniform = this.uniforms.get('strength');
		if (strengthUniform) strengthUniform.value = this.strength;
	}
}

export const CRTBarrelDistortionPass = forwardRef<
	unknown,
	CRTBarrelDistortionPassProps
>(({ strength = 0.2 }, ref) => {
	const effect = new CRTBarrelDistortionEffect(strength);
	return (
		<primitive
			ref={ref}
			object={effect}
		/>
	);
});
