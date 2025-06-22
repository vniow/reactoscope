# Dynamic Node Creation Test Guide

## Testing the New "Add Synth Setup" Button

### What Changed:

1. **Empty Start**: App now starts with no nodes or connections
2. **Dynamic Creation**: "🎵 Add Synth Setup" button creates oscillator + destination + connection
3. **Smart Positioning**: Multiple pairs stack vertically to avoid overlap
4. **Full Audio Chain**: Each button click creates a complete, working audio setup

### Test Steps:

1. **Start with Clean Slate**

   - Open http://localhost:5173
   - Should see empty canvas with just buttons at top

2. **Create First Synth Setup**

   - Click "🎵 Add Synth Setup" button
   - Should see oscillator (left) connected to destination (right)
   - Connection line should be visible and animated

3. **Test Audio**

   - Click "Start" on the oscillator
   - Should hear 440Hz sine wave immediately
   - Adjust frequency/waveform - should work in real-time
   - Adjust destination volume - should affect output

4. **Create Multiple Setups**

   - Click "🎵 Add Synth Setup" again
   - New pair should appear below the first (no overlap)
   - Each oscillator operates independently
   - Multiple oscillators can play simultaneously

5. **Debug Verification**
   - Click "Debug Audio"
   - Should show all created audio nodes in console
   - Each pair should have "Oscillator" and "Gain" entries

### Expected Behavior:

- **Clean Start**: No initial nodes cluttering the workspace
- **One-Click Setup**: Single button creates complete working synth
- **Multiple Instances**: Can create many independent oscillator→destination chains
- **Smart Layout**: New pairs positioned to avoid overlap
- **Full Functionality**: Each created pair works identically to manual connections

### Button Functions:

- **🎵 Add Synth Setup**: Creates connected oscillator + destination pair
- **Add Oscillator**: Creates standalone oscillator (manual connection needed)
- **Add Destination**: Creates standalone destination (manual connection needed)
- **Debug Audio**: Shows current audio registry contents

This approach gives users both quick setup (synth button) and granular control (individual node buttons).
