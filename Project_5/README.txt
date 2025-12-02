Overview

This WebGL project renders a rotating Earth with optional color, normal, specular, night, and cloud maps. The user can rotate the planet manually, zoom the camera, and toggle the automatic spin.

All texture images used by the program must be placed into the "assets" folder.

Required Assets

Place the following files into the ./assets/ directory:

earth.png

earthNormal.png

earthSpec.png

EarthNight.png

earthcloudmap-visness.png

These filenames must match exactly unless you change the paths in the source code (initTextures).

User Controls

Mouse Controls:

Click and drag on the canvas to rotate the Earth.

Drag horizontally to rotate around the Y axis.

Drag vertically to rotate around the X axis.

Keyboard Controls:

Up Arrow: Zoom in (camera moves closer).

Down Arrow: Zoom out (camera moves farther away).

F Key: Toggles the Earth's automatic rotation on/off.

When ON (default): the Earth spins continuously.

When OFF: the Earth remains fixed but can still be rotated manually with the mouse.

How to Run

Ensure all shader files and JavaScript files are in the same directory as your HTML file.

Make sure all required images are in the ./assets/ folder.

Open the project using a local server (not the file:// protocol).

Load the HTML page through the local server to run the program.