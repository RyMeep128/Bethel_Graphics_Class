import { Car } from "./car.js";

export function attachInput(car: Car, canvas: HTMLCanvasElement) {
    const keys = new Set<string>();

    const down = (e: KeyboardEvent) => {
        // Reserve number keys and A, F, Q, R, S, W, X, Z for future
        if (["A","F","Q","R","S","W","X","Z"].includes(e.key.toUpperCase())) return;
        keys.add(e.key);
        if (e.key === " "){ car.stop(); }
        if (e.key === "ArrowUp")   car.input.driveFwd = true;
        if (e.key === "ArrowDown") car.input.driveBack = true;
        if (e.key === "ArrowLeft") car.input.turnLeft = true;
        if (e.key === "ArrowRight")car.input.turnRight = true;
    };

    const up = (e: KeyboardEvent) => {
        keys.delete(e.key);
        if (e.key === "ArrowUp")   car.input.driveFwd = false;
        if (e.key === "ArrowDown") car.input.driveBack = false;
        if (e.key === "ArrowLeft") car.input.turnLeft = false;
        if (e.key === "ArrowRight")car.input.turnRight = false;
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    // Make sure canvas has focus on click for accessibility
    canvas.addEventListener("click", () => canvas.focus());
}
