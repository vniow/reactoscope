/**
 * PersistencePass - Postprocessing pass for analog afterglow/persistence effect
 * Blends previous frame with current using a decay factor
 * @param decay - Persistence decay factor (0.8-0.99 typical)
 */
import { forwardRef } from 'react';
import { BlendFunction, Effect } from 'postprocessing';
import { Uniform } from 'three';

export interface PersistencePassProps {
	decay?: number;
}
class PersistenceEffect extends Effect {
	decay: number;
	constructor(decay: number = 0.95) {
		super(
			'PersistenceEffect',
			`
	  uniform float decay;
	  uniform sampler2D previousFrame;
	  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
		vec4 prev = texture2D(previousFrame, uv);
		outputColor = mix(inputColor, prev, decay);
	  }
	  `,
			{
				blendFunction: BlendFunction.NORMAL,
				uniforms: new Map([['decay', new Uniform(decay)]]),
			}
		);
		this.decay = decay;
	}
	update() {
		const decayUniform = this.uniforms.get('decay');
		if (decayUniform) decayUniform.value = this.decay;
	}
}

export const PersistencePass = forwardRef<unknown, PersistencePassProps>(
	({ decay = 0.95 }, ref) => {
		const effect = new PersistenceEffect(decay);
		return (
			<primitive
				ref={ref}
				object={effect}
			/>
		);
	}
);
