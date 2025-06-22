# Audio Troubleshooting Guide

## Testing the Audio Output Fix

### What Was Fixed:

1. **Missing Audio Connections**: The initial edges weren't connecting the oscillator to destination
2. **Audio Context Not Started**: Modern browsers require user interaction to start audio
3. **Destination Node Setup**: Now properly connects to `Tone.getDestination()`
4. **Debug Tools**: Added logging and debug button to troubleshoot issues

### Test Steps:

1. **Open Developer Console** (F12)

   - You should see console logs showing node creation and connections

2. **Click "Debug Audio" Button**

   - This will show what audio nodes are in the registry
   - Verify you see both "Oscillator" and "Gain" nodes

3. **Start the Oscillator**

   - Click "Start" on the oscillator node
   - Console should show "Audio context started" and "Oscillator started"
   - **You should now hear a 440Hz sine wave**

4. **Test Controls**
   - Move the frequency slider - audio should change pitch in real-time
   - Change waveform type - audio should change timbre
   - Adjust destination volume - audio should get quieter/louder
   - Click "Mute" - audio should stop

### If You Still Don't Hear Audio:

1. **Check Browser Console** for error messages
2. **Verify Audio Setup**:
   - Speakers/headphones connected and working
   - Browser has audio permissions
   - System volume not muted
3. **Try Creating New Nodes**:
   - Add new oscillator and destination
   - Connect them manually
   - Start the new oscillator

### Expected Console Output:

```
Audio Registry Contents:
  osc1: Oscillator
  dest1: Gain
Audio Context State: running
Connecting audio nodes: {source: "osc1", target: "dest1", sourceNode: "Oscillator", targetNode: "Gain"}
Audio connection successful
```

The main issue was that the oscillator wasn't actually connected to the destination node that routes to the browser's speakers!
