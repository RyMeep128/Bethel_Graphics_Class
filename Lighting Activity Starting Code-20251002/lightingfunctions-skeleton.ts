import {initFileShaders, vec4, mat4, perspective, flatten, lookAt, rotateX, rotateY} from "./helperfunctions.js";


"use strict";
let gl:WebGLRenderingContext;
let program:WebGLProgram; //array of different shader programs
let activeProgram:GLint; //index of active program
let UNLIT:GLint = 0;
let GOURAUD:GLint = 1;
let PHONG:GLint = 2;
let CEL:GLint = 3;
let RYAN:GLint = 4;
let ANI:GLint = 5;
let pulse:GLint = 0;

//eventually we'll have different objects we can draw
let object:GLint; //which object are we drawing?
const SPHERE:GLint = 0;
const MESH:GLint = 1;

//uniform locations
let umv:WebGLUniformLocation; //uniform for mv matrix
let uproj:WebGLUniformLocation; //uniform for projection matrix
let umode:WebGLUniformLocation; //lighting mode


//local copies of these matrices
let mv:mat4; //local mv
let p:mat4; //local projection

//shader variable indices for per vertex and material attributes
let vPosition:GLint; //
let vNormal:GLint;
let vAmbientDiffuseColor:GLint; //Ambient and Diffuse can be the same for the material
let vSpecularColor:GLint; //highlight color
let vSpecularExponent:GLint;




//uniform indices for light properties
//TODO
let light_position:WebGLUniformLocation;
let light_color:WebGLUniformLocation;
let ambient_light:WebGLUniformLocation;
let uPulse:WebGLUniformLocation;

//document elements
let canvas:HTMLCanvasElement;

//interaction and rotation state
let xAngle:number;
let yAngle:number;
let mouse_button_down:boolean = false;
let prevMouseX:number = 0;
let prevMouseY:number = 0;

//mesh vars
let sphereverts:vec4[]; //local copy of vertex data
let sphereBufferID:WebGLBuffer; //buffer id

let meshVertexData:vec4[];
let indexData:number[];

let meshVertexBufferID:WebGLBuffer;
let indexBufferID:WebGLBuffer;

window.onload = function init() {

    canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
    gl = canvas.getContext('webgl2', {antialias:true}) as WebGLRenderingContext;
    if (!gl) {
        alert("WebGL isn't available");
    }


    ///////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////
    //https://codepen.io/matt-west/pen/KjEHg
    //converted to typescript by Nathan Gossett
    let fileInput:HTMLInputElement = document.getElementById("fileInput") as HTMLInputElement;
    fileInput.addEventListener('change', function(e){
        let file:File = fileInput.files[0];
        let textType:RegExp = /text.*/;
        if(file.type.match(textType)){

            let reader:FileReader = new FileReader();
            reader.onload = function(e){

                createMesh(reader.result as string); //ok, we have our data, so parse it
                requestAnimationFrame(render); //ask for a new frame
            };
            reader.readAsText(file);
        }else{
            alert("File not supported: " + file.type + ".");
        }
    });
    ///////////////////c/////////////////////////////////////
    ////////////////////////////////////////////////////////

    let button:HTMLButtonElement = document.getElementById("button") as HTMLButtonElement;
    button.addEventListener('click', function(e){
        if(object == 1){
            object = 2;
        }else{
            object = 1;
        }

    })


    //allow the user to rotate mesh with the mouse
    canvas.addEventListener("mousedown", mouse_down);
    canvas.addEventListener("mousemove", mouse_drag);
    canvas.addEventListener("mouseup", mouse_up);

    //white background
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    //initialize rotation angles
    xAngle = 0;
    yAngle = 0;

    program = initFileShaders(gl, "vshader-combined.glsl", "fshader-combined.glsl");
    //Also note that we'll need to be using a local web server rather than just loading it off the harddrive to make
    //the browser happy with external .glsl files

    //Eventually we're going to have to store references to these attributes an uniforms in many different shaders
    //TODO
     gl.useProgram(program);
     umv = gl.getUniformLocation(program, "model_view");
     uproj = gl.getUniformLocation(program, "projection");
     umode = gl.getUniformLocation(program, "mode");
     vPosition = gl.getAttribLocation(program, "vPosition");
    vNormal = gl.getAttribLocation(program, "vNormal");
     vAmbientDiffuseColor = gl.getAttribLocation(program, "vAmbientDiffuseColor");
    vSpecularColor = gl.getAttribLocation(program, "vSpecularColor");
    vSpecularExponent = gl.getAttribLocation(program, "vSpecularExponent");
    light_position = gl.getUniformLocation(program, "light_position");
    light_color = gl.getUniformLocation(program, "light_color");
    ambient_light = gl.getUniformLocation(program, "ambient_light");
    uPulse = gl.getUniformLocation(program, "pulse");


    //get our sphere, 15 slices around the circle
    generateSphere(20);
    object = MESH;
    switchObjects();
    //set up basic perspective viewing and make sure the new shader gets it
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    p = perspective(60, (canvas.clientWidth / canvas.clientHeight), 5, 500);
    gl.uniformMatrix4fv(uproj, false, p.flatten());

    //initialize rotation angles
    xAngle = 0;
    yAngle = 0;

    meshVertexData = [];

    gl.uniform1i(umode, UNLIT);
    // Fixed-timestep update; render is scheduled via requestAnimationFrame.
    window.setInterval(update, 16);

};

function switchObjects(){
        //There are a variety of ways to accomplish this, but this way is pretty straightforward
        //note that we don't re-buffer the data, simply connect the existing buffer to a different shader program
        gl.disableVertexAttribArray(vPosition); //incase the indices change
        //TODO gl.disableVertexAttribArray(vNormal);

        if(object == SPHERE) {
            gl.bindBuffer(gl.ARRAY_BUFFER, sphereBufferID);
        }else{
            // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshVertexBufferID);
        }

        gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 32, 0); //stride is 32 bytes total for position, normal
        gl.enableVertexAttribArray(vPosition);

        //TODO once we have normal vectors
        gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 32, 16);
        gl.enableVertexAttribArray(vNormal);
}

/**
 * Fixed-timestep update hook; schedules the next render frame.
 * @returns {void}
 */
function update(): void {
    requestAnimationFrame(render);
}


/**
 * Parse string into list of vertices and triangles
 * Not robust at all, but simple enough to follow as an introduction
 * @param input string of ascii floats
 */
function createMesh(input:string){
    let numbers:string[] = input.split(/\s+/); //split on white space
    let numVerts:GLint = parseInt(numbers[0]); //first element is number of vertices
    let numTris:GLint = parseInt(numbers[1]); //second element is number of triangles
    let positionData:vec4[] = [];

    //three numbers at a time for xyz
    for(let i:number = 2; i < 3*numVerts + 2; i+= 3){
        positionData.push(new vec4(parseFloat(numbers[i]), parseFloat(numbers[i+1]), parseFloat(numbers[i+2]), 1));
    }

    //now the triangles
    indexData = []; //empty out any previous data
    //three vertex indices per triangle
    for(let i:number = 3*numVerts + 2; i < numbers.length; i++){
        indexData.push(parseInt(numbers[i]));
    }

    let normalVectors:vec4[] = [];

    //at first, we have no normal vectors
    for(let i:number = 0; i < positionData.length; i++){
        normalVectors.push(new vec4(0,0,0,0));
    }

    //We need to calculate normal vectors for each triangle
    for(let i:number = 0; i < indexData.length; i += 3){
        //direction from vertex 0 to vertex 1
        let triLeg1:vec4 = positionData[indexData[i+1]].subtract(positionData[indexData[i]]).normalize();
        //direction from vertex 0 to vertex 2
        let triLeg2:vec4 = positionData[indexData[i+2]].subtract(positionData[indexData[i]]).normalize();
        //get a vector perpendicular to both triangle sides
        let triNormal:vec4 = triLeg1.cross(triLeg2).normalize();
        //and add that on to the totals for all three vertices involved in this triangle
        normalVectors[indexData[i]] = normalVectors[indexData[i]].add(triNormal);
        normalVectors[indexData[i+1]] = normalVectors[indexData[i+1]].add(triNormal);
        normalVectors[indexData[i+2]] = normalVectors[indexData[i+2]].add(triNormal);
    }

    //at this point, every vertex normal is the sum of all the normal vectors of the triangles that meet up at that vertex
    //so normalize to get a unit length average normal direction for the vertex
    for(let i:number = 0; i < normalVectors.length; i++){
        normalVectors[i] = normalVectors[i].normalize();
    }

    //and put that all together into an array so we can buffer it to graphics memory
    meshVertexData = [];
    for(let i:number = 0; i < positionData.length; i++){
        meshVertexData.push(positionData[i]);
        meshVertexData.push(normalVectors[i]);
    }


    //buffer vertex data and enable vPosition attribute
    meshVertexBufferID = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, meshVertexBufferID);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(meshVertexData), gl.STATIC_DRAW);

    let vPosition:GLint = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 32, 0); //stride is 32 bytes total for position, normal
    gl.enableVertexAttribArray(vPosition);

    let vNormal:GLint = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 32, 16);
    gl.enableVertexAttribArray(vNormal);

    //we could at this point go through the list and duplicate vertex data as needed, or we can
    //just buffer the list of indices and use drawElements() instead of drawArrays()
    //If you see references to EBO (Element Buffer Objects) rather than VBO (Vertex Buffer Objects)
    //then you're using Indexed rendering

    indexBufferID = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferID);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
    //note we have Uint16 so we have UNSIGNED_SHORT, which allows us 65k vertices.  If our mesh has more
    //than that we'll need to switch to an UNSIGNED_INT with 32 bits


}

//***********************************************
//TODO HEY! READ THIS!
//In this particular case, our normal vectors and vertex vectors are identical since the sphere is centered at the origin
//For most objects this won't be the case, so I'm treating them as separate values for that reason
//This could also be done as separate triangle strips, but I've chosen to make them just triangles so I don't
//have to execute multiple glDrawArrays() commands
//***********************************************
function generateSphere(subdiv:number){

    let step:number = (360.0 / subdiv)*(Math.PI / 180.0);
    sphereverts = [];

    for (let lat:number = 0; lat <= Math.PI ; lat += step){ //latitude
        for (let lon:number = 0; lon + step <= 2*Math.PI; lon += step){ //longitude
            //triangle 1
            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon) ,Math.cos(lat) , Math.cos(lon) * Math.sin(lat), 1.0));
            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon), Math.cos(lat),Math.cos(lon) * Math.sin(lat),  0.0));
            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon + step), Math.cos(lat),Math.sin(lat) * Math.cos(lon + step),  1.0));
            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon + step),  Math.cos(lat),Math.sin(lat) * Math.cos(lon + step), 0.0));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon + step), Math.cos(lat + step),Math.cos(lon + step) * Math.sin(lat + step),  1.0));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon + step), Math.cos(lat + step),Math.cos(lon + step) * Math.sin(lat + step),  0.0));

            //triangle 2
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon + step),  Math.cos(lat + step),Math.cos(lon + step) * Math.sin(lat + step), 1.0));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon + step),  Math.cos(lat + step),Math.cos(lon + step) * Math.sin(lat + step), 0.0));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon), Math.cos(lat + step),Math.sin(lat + step) * Math.cos(lon),  1.0));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.sin(lon), Math.cos(lat + step), Math.sin(lat + step) * Math.cos(lon), 0.0));
            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon), Math.cos(lat),Math.cos(lon) * Math.sin(lat),  1.0));
            sphereverts.push(new vec4(Math.sin(lat) * Math.sin(lon),  Math.cos(lat),Math.cos(lon) * Math.sin(lat), 0.0));
        }
    }

    sphereBufferID = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereBufferID);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereverts), gl.STATIC_DRAW);

}

//update rotation angles based on mouse movement
function mouse_drag(event:MouseEvent){
    let thetaY:number, thetaX:number;
    if (mouse_button_down) {
        thetaY = 360.0 *(event.clientX-prevMouseX)/canvas.clientWidth;
        thetaX = 360.0 *(event.clientY-prevMouseY)/canvas.clientHeight;
        prevMouseX = event.clientX;
        prevMouseY = event.clientY;
        xAngle += thetaX;
        yAngle += thetaY;
    }
    requestAnimationFrame(render);
}

//record that the mouse button is now down
function mouse_down(event:MouseEvent) {
    //establish point of reference for dragging mouse in window
    mouse_button_down = true;
    prevMouseX= event.clientX;
    prevMouseY = event.clientY;
    requestAnimationFrame(render);
}

//record that the mouse button is now up, so don't respond to mouse movements
function mouse_up(){
    mouse_button_down = false;
    requestAnimationFrame(render);
}

window.addEventListener("keydown" ,function(event:KeyboardEvent){
    switch(event.key) {
        //TODO uncomment these as you add the various lighting programs
        case "g":
            gl.uniform1i(umode, GOURAUD);
            break;
        case "p":
            gl.uniform1i(umode, PHONG);
            break;
        case "c": //cel shading color
            gl.uniform1i(umode, CEL);
            break;
        case "r": //cel shading color
            gl.uniform1i(umode, RYAN);
            break;
        case "a": //cel shading color
            if(pulse == 0){
                pulse = 1;
            }else pulse = 0;

            gl.uniform1i(uPulse, pulse)
            break;
        default:
            gl.uniform1i(umode, UNLIT);
    }
    requestAnimationFrame(render);//and now we need a new frame since we made a change
});

//draw a frame
function render(){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let test = gl.getUniformLocation(program, "time");
    let time = performance.now() / 1000;
    gl.uniform1f(test, time);

    //position camera 10 units back from origin
    mv = lookAt(new vec4(0, 0, 10, 1), new vec4(0, 0, 0, 1), new vec4(0, 1, 0, 0));

    //rotate if the user has been dragging the mouse around
    mv = mv.mult(rotateY(yAngle).mult(rotateX(xAngle)));

    //send the modelview matrix over
    gl.uniformMatrix4fv(umv, false, mv.flatten());

    //note that if we have one value that should be applied to all the vertices,
    //we can send it over just once even if it's an attribute and not a uniform
    gl.vertexAttrib4fv(vAmbientDiffuseColor, [.5, 0, 0, 1]);

    //these don't impact the UNLIT mode
    //TODO
    gl.vertexAttrib4fv(vSpecularColor, [1.0, 1.0, 1.0, 1.0]);
    gl.vertexAttrib1f(vSpecularExponent, 15.0);
    gl.uniform4fv(light_position, mv.mult(new vec4(50, 50, 50, 1)).flatten());
    gl.uniform4fv(light_color, [1, 1, 1, 1]);
    gl.uniform4fv(ambient_light, [.5, .5, .5, 1]);
    if(object == MESH) {
        if(meshVertexData.length > 0) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferID);
            gl.drawElements(gl.TRIANGLES, indexData.length, gl.UNSIGNED_SHORT, 0);
        }
    }else{
        gl.drawArrays(gl.TRIANGLES, 0, sphereverts.length/2);
    }
}