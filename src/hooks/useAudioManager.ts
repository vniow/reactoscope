import { useState, useCallback } from 'react';
import { BUILT_IN_TRACKS } from '../config';

interface AudioTrack {
	label: string;
	file: string;
}

export function useAudioManager() {
	const [tracks] = useState<AudioTrack[]>(() => [...BUILT_IN_TRACKS]);
	const [currentTrack, setCurrentTrack] = useState<string>(
		() => BUILT_IN_TRACKS[0]?.file ?? '',
	);

	const loadTrack = useCallback((file: string) => {
		setCurrentTrack(file);
	}, []);

	return { tracks, currentTrack, loadTrack };
}
