import React, { createContext } from 'react';

// 3D content registry: nodeId -> React.ReactNode
export type Registry = Record<string, React.ReactNode>;

export interface Canvas3DContextType {
	registerNodeContent: (nodeId: string, content: React.ReactNode) => void;
	unregisterNodeContent: (nodeId: string) => void;
	getRegistry: () => Registry;
}

export const Canvas3DContext = createContext<Canvas3DContextType | null>(null);
