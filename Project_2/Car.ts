import {RenderableObject} from "./RenderableObject.js";
import {lookAt, mat4, rotateX, rotateY, rotateZ, toradians, translate, vec4} from "./helperfunctions.js";
import {Cube} from "./Cube.js";
import {Cylinder} from "./Cylinder.js";
import * as Color from "./Color.js"
import * as util from "./util.js";

export class Car extends RenderableObject{

    private body:Cube;
    private wheel:Cylinder;
    private turningRight:boolean = false;
    private turningLeft:boolean = false;

    constructor(gl: WebGLRenderingContext,program: WebGLProgram, objectArr:RenderableObject[], width:number,height:number, depth:number,x:number = 0, y:number = 0, z:number = 0, yaw:number = 0, pitch:number = 0, roll:number = 0)  {
        super(gl,program, objectArr,-1, x, y, z);

        let halfHeight:number = height/2;

        this.body = new Cube(gl,program,objectArr, width, halfHeight, depth);
        this.wheel = new Cylinder(gl, program, objectArr, halfHeight, height/3);
        this.wheel.addVerticesStartCount(this.body.getVertexCount());
        // this.wheel.addZ(90);
        this.wheel.addRoll(90);

        this.body.setAllColor(Color.HOTPINK);
        this.wheel.setMiddleBitsColor(Color.SILVER);
        this.wheel.setTopColors(Color.RAINBOW32);
        this.wheel.setBottomColors(Color.RAINBOW32);

        this.vertexCount = this.body.getVertexCount() + this.wheel.getVertexCount();
    }


    /**
     * Does not do anything. needs the updates and draws sidebyside
     */
    public override update(parent?:mat4):mat4{
        return null;
    }
    
    private stupidRear = 0;

    private wheelTheta = 0;
    public override draw(){
        let carMV:mat4 = super.update();
        this.body.update(carMV);
        this.body.draw();

        this.wheel.setYaw(this.wheelTheta);
        this.wheel.setZ(this.body.getDepth()/-2);
        this.wheel.setX(this.body.getWidth()/-2);
        this.wheel.update(carMV);
        this.wheel.draw();

        this.wheel.setYaw(this.wheelTheta);
        this.wheel.setZ(this.body.getDepth()/-2);
        this.wheel.setX(this.body.getWidth()/2);
        this.wheel.update(carMV);
        this.wheel.draw();


        this.wheel.setYaw(this.yaw);
        this.wheel.setZ(this.body.getDepth()/2);
        this.wheel.setX(this.body.getWidth()/2);
        this.wheel.update(carMV);
        this.wheel.draw();

        this.wheel.setYaw(this.yaw);
        this.wheel.setZ(this.body.getDepth()/2);
        this.wheel.setX(this.body.getWidth()/-2);
        this.wheel.update(carMV);
        this.wheel.draw();

    }

    public moveCarForward(){
        let phi = this.yaw + this.wheelTheta;
        this.addX(-util.Velocity * Math.sin(toradians(phi)));
        this.addZ(-util.Velocity * Math.cos(toradians(phi)));
        this.wheel.addPitch(-util.Rotation*10);
        this.yaw = this.yaw + (this.wheelTheta * .05);

    }

    public moveCarBackward(){
        let phi = this.yaw + this.wheelTheta;
        this.addX(util.Velocity * Math.sin(toradians(phi)));
        this.addZ(util.Velocity * Math.cos(toradians(phi)));
        this.wheel.addPitch(util.Rotation*10);
        this.yaw = this.yaw + (this.wheelTheta * .05);
    }

    public turnRight(){
        this.wheelTheta += -util.Rotation;
        if(this.wheelTheta <= -util.maxWheelTurn){
            this.wheelTheta = -util.maxWheelTurn;
        }
    }

    public turnLeft(){
        this.wheelTheta += util.Rotation;
        if(this.wheelTheta >= util.maxWheelTurn){
            this.wheelTheta = util.maxWheelTurn;
        }
    }

    public stopTurningLeft(){
        this.turningLeft = false;
    }

    public stopTurningRight(){
        this.turningRight = false;
    }

    public setBodyColor(color:vec4){
        this.body.setAllColor(color);
    }

    public setWheelColor(color:vec4){
        this.wheel.setAllColor(color,color,Color.BLACK);
    }

    public getObjectData(): vec4[] {
        let objectPoints:vec4[] =  [];
        objectPoints.push(...this.body.getObjectData());
        objectPoints.push(...this.wheel.getObjectData());
        return objectPoints;
    }


    protected loadingArrayHelper(face: vec4[]): vec4[] {
        return null;
    }

}