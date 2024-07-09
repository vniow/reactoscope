# reactoscope

## what is it

**reactoscope** is a simple React based drawing app for oscilloscopes, utilising the WebAudio API and three.js. By drawing on the main canvas, you generate waveforms for the left and right audio channels, which are represented right below your drawing. Plug an oscilloscope in, or use an emulator, and view your artwork in all of its glitchy glory. 

## why are you doing this

I enjoy unusual ways of displaying information. Vector displays are a particular fascination, as they operate completely differently than raster ones do. I'm heavily inspired by the vector synthesis community and all of their amazing work with osci-render, XYscope, all the pure data patches, as well as countless other projects I've encountered.

My goals for this project were to build my own vector synthesis solution using only web technologies. I'm a javascript girlie by nature. I specifically wanted to understand at a more fundamental level how this whole process of converting points on a raster screen into audio signals works, and the best way to do that is to build your own library from scratch. 

I'm happy to report that it works! ...mostly. Calling this an alpha release is generous. It's a proof of concept if anything.

## how to use

1. checkout this repository
2. run `npm install` in the root directory
3. run `npm run dev`
4. go to [localhost:5173](http://localhost:5173/)
5. enjoy

## TODO

- honestly quite a lot
- reduce glitches
- suggestions?