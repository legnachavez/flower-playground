# Flower Playground

A small static website where flowers fall and pile up with real physics, inspired by the [Matter.js stress demo](https://brm.io/matter-js/demo/#stress). Click empty space to drop a flower, drag flowers to fling them, and use **Drop more**, **Shake** and **Clear** in the toolbar.

## Run locally

It's plain HTML/CSS/JS with no build step; [Matter.js](https://brm.io/matter-js/) loads from cdnjs. Serve the folder rather than opening `index.html` directly, since browsers block the flower textures on `file://` pages:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files

- `index.html`: page markup and flower picker
- `style.css`: layout and theme (light and dark)
- `script.js`: physics world, flower bodies, mouse dragging, and toolbar actions
- `flowers/`: the four flower SVGs
