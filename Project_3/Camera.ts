import {lookAt, mat4, vec4} from "./helperfunctions.js";

export class Camera{
    public getCamerax(): number {
        return this.camerax;
    }

    public setCamerax(value: number) {
        this.camerax = value;
    }

    public getCameray(): number {
        return this.cameray;
    }

    public setCameray(value: number) {
        this.cameray = value;
    }

    public getCameraz(): number {
        return this.cameraz;
    }

    public setCameraz(value: number) {
        this.cameraz = value;
    }

    public getLookAtX(): number {
        return this.lookAtX;
    }

    public setLookAtX(value: number) {
        this.lookAtX = value;
    }

    public getLookAtY(): number {
        return this.lookAtY;
    }

    public setLookAtY(value: number) {
        this.lookAtY = value;
    }

    public getLookAtZ(): number {
        return this.lookAtZ;
    }

    public setLookAtZ(value: number) {
        this.lookAtZ = value;
    }

    public updateCameraz(value: number) {
        this.cameraz += value;
    }

    public updateCameray(value:number){
        this.cameray += value;
    }

    public updateCamerax(value:number){
        this.camerax += value;
    }

    private cameraMV:mat4;
    private camerax:number
    private cameray:number
    private cameraz:number
    private lookAtX:number
    private lookAtY:number
    private lookAtZ:number

    constructor() {
        this.cameraMV = lookAt(new vec4(0,10,20,1), new vec4(0,0,0,1), new vec4(0,1,0,0));
        this.camerax = 0;
        this.cameray = 10;
        this.cameraz = 20;
        this.lookAtX = 0;
        this.lookAtY = 0;
        this.lookAtZ = 0;

    }

    public updateCamera(camerax:number,cameray:number,cameraz:number, lookAtX:number,lookAtY:number,lookAtZ:number){
        this.cameraMV = lookAt(new vec4(this.camerax+ camerax, this.cameray+ cameray,this.cameraz+  cameraz, 1), new vec4(this.lookAtX+lookAtX, this.lookAtY+lookAtY,this.lookAtZ+lookAtZ, 1), new vec4(0, 1, 0, 0));
    }

    public setCamera(camerax:number,cameray:number,cameraz:number, lookAtX:number,lookAtY:number,lookAtZ:number){
        this.cameraMV = lookAt(new vec4(camerax, cameray, cameraz, 1), new vec4(lookAtX, lookAtY,lookAtZ, 1), new vec4(0, 1, 0, 0));
    }

    public setCameraLook(lookAtX:number,lookAtY:number,lookAtZ:number){
        this.cameraMV = lookAt(new vec4(this.camerax, this.cameray, this.cameraz, 1), new vec4(lookAtX, lookAtY,lookAtZ, 1), new vec4(0, 1, 0, 0));
    }

    public setCameraPos(camerax:number ,cameray:number,cameraz:number){
        this.cameraMV = lookAt(new vec4(camerax, cameray, cameraz, 1), new vec4(this.lookAtX, this.lookAtY,this.lookAtZ, 1), new vec4(0, 1, 0, 0));
    }

    public getCamera():mat4{
        return this.cameraMV;
    }

}