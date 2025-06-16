/**
 * Verification script to ensure the modular visualizer is properly registered
 * This file can be run or imported to validate the registration system.
 */

import {
	ALL_NODE_TYPES,
	groupNodesByVariant,
	isAudioNode,
} from '../shared/config/nodeTypes';
import { nodeTypes } from '../nodes';

export function verifyModularVisualizerRegistration() {
	console.log('🔍 Verifying Modular Visualizer Registration...\n');

	// 1. Check if modular visualizer is in the node types configuration
	const modularVisualizer = ALL_NODE_TYPES.find(
		(node) => node.type === 'visualizer-modular'
	);
	console.log(
		'✅ Modular Visualizer in nodeTypes config:',
		!!modularVisualizer
	);
	if (modularVisualizer) {
		console.log('   - Name:', modularVisualizer.name);
		console.log('   - Description:', modularVisualizer.description);
		console.log('   - Emoji:', modularVisualizer.emoji);
		console.log('   - Variant:', modularVisualizer.variant);
		console.log('   - Category:', modularVisualizer.category);
	}

	// 2. Check if it's properly grouped by variant
	const nodeGroups = groupNodesByVariant();
	const signalNodes = nodeGroups.signal || [];
	const hasModularInSignal = signalNodes.some(
		(node) => node.type === 'visualizer-modular'
	);
	console.log(
		'\n✅ Modular Visualizer in Signal Processing group:',
		hasModularInSignal
	);

	// 3. Check if it's recognized as an audio node
	const isRecognizedAsAudio = isAudioNode('visualizer-modular');
	console.log('✅ Recognized as audio node:', isRecognizedAsAudio);

	// 4. Check if the React component is registered in nodeTypes
	const hasReactComponent = 'visualizer-modular' in nodeTypes;
	console.log('✅ React component registered:', hasReactComponent);

	// 5. List all nodes in the Signal Processing group
	console.log('\n📊 All Signal Processing nodes:');
	signalNodes.forEach((node) => {
		console.log(`   - ${node.emoji} ${node.name} (${node.type})`);
	});

	// 6. Summary
	const allChecks = [
		!!modularVisualizer,
		hasModularInSignal,
		isRecognizedAsAudio,
		hasReactComponent,
	];
	const passed = allChecks.filter(Boolean).length;
	const total = allChecks.length;

	console.log(`\n🎯 Registration Status: ${passed}/${total} checks passed`);

	if (passed === total) {
		console.log('🎉 Modular Visualizer is fully registered and ready to use!');
		console.log(
			'   - Will appear in the NodeAddPanel under "Signal Processing"'
		);
		console.log('   - Can be created and used like any other node');
		console.log('   - Will be handled as an audio node by the system');
	} else {
		console.log('⚠️  Some registration issues found. Check the logs above.');
	}

	return {
		passed,
		total,
		isFullyRegistered: passed === total,
		details: {
			inConfig: !!modularVisualizer,
			inSignalGroup: hasModularInSignal,
			isAudioNode: isRecognizedAsAudio,
			hasComponent: hasReactComponent,
		},
	};
}

// Export for easy testing
export default verifyModularVisualizerRegistration;
