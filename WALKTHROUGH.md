# Walkthrough assets

## Included video

`zork-map-walkthrough.mp4` is a 72-second, 1280×720, silent captioned tour. It
renders the original World view artwork directly from the project's drawing
code. It is a visual tour of the recorded expedition, not a screen recording or
new gameplay. It does not show the WebGL/3D view.

Nine eight-second chapters cover the completed run, the house, underground,
dam, temple, river, thief, mine, and final checkpoint. The generated transcript
provides the same on-screen narrative. The original `ROUTE.md` remains the
full written route, including mistakes and recovery notes.

Regenerate using `cd 3d && npm ci && npm run walkthrough`. FFmpeg must be on
PATH. The renderer uses Liberation Sans by default; set `ZORK_VIDEO_FONT` to
an installed alternative if needed. No font file is redistributed. The command writes chapters, a preview, transcript and MP4 under
`out/walkthrough/`. It does not upload or publish anything.

## Interactive demo sequence

Use this sequence after real-browser visual validation:

1. Open `out/map.html`. Point out 350/350 points, 624 moves and zero deaths.
2. Click World, then Fit. Pick the Living Room and inspect the trophy-case items.
3. Click Chart to explain that connections are schematic, not distances.
4. Click ASCII and Sketchbook to show the hand-drawn room scenes.
5. Press Replay, stop it, then use the slider to return to the complete map.
6. Open 3D. Test orbit and zoom, choose a room, and follow the explorer.
7. Start Retrace, interrupt it, restart, and return with Find me.
8. Close on the final checkpoint: the expedition stopped before the barrow.

Do not present the rendered video as proof that step 6 or 7 was browser-tested.
The project is a recorded map; it does not control or load the original game.
