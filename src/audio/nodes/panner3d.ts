import { Panner3D } from 'tone';
import { _audioNodes } from '../audioCore';
import type { NodeTypeHandler } from './nodeHandler';
import type { Panner3DNodeData } from '../../store/dawTypes';

export const panner3dHandler: NodeTypeHandler<Panner3DNodeData> = {
	defaultData: { label: 'Panner3D', positionX: 0, positionY: 0, positionZ: 0, panningModel: 'equalpower' },

	create(id, data) {
		const toneNode = new Panner3D({
			positionX:    data.positionX,
			positionY:    data.positionY,
			positionZ:    data.positionZ,
			panningModel: data.panningModel,
		});
		_audioNodes.set(id, { kind: 'panner3d', toneNode });
	},

	dispose(id) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'panner3d') return;
		e.toneNode.dispose();
		_audioNodes.delete(id);
	},

	setAudioParam(id, update) {
		const e = _audioNodes.get(id);
		if (e?.kind !== 'panner3d') return;
		if (update.positionX    !== undefined) e.toneNode.positionX.value = update.positionX;
		if (update.positionY    !== undefined) e.toneNode.positionY.value = update.positionY;
		if (update.positionZ    !== undefined) e.toneNode.positionZ.value = update.positionZ;
		if (update.panningModel !== undefined) e.toneNode.panningModel    = update.panningModel;
	},
};
