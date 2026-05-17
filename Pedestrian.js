import {
  INTERSECTION_CENTER,
  ROAD_WIDTH,
  CROSSWALK_WIDTH,
  PEDESTRIAN_SPEED,
  dist,
  lerp,
  randomChoice,
} from "./constants.js";

export class Pedestrian {
  constructor(crosswalkIndex) {
    this.crosswalkIndex = crosswalkIndex;
    this.done = false;
    this.waitTime = 0;
    this.color = randomChoice([
      "#ff6b6b",
      "#4ecdc4",
      "#45b7d1",
      "#96ceb4",
      "#ffeaa7",
    ]);

    const cw = CROSSWALK_WIDTH;
    const ic = INTERSECTION_CENTER;
    const rd = ROAD_WIDTH / 2 + 10;

    const crosswalks = [
      //Верхний переход
      {
        sx: ic.x - rd,
        sy: ic.y - rd - cw / 2,
        ex: ic.x + rd,
        ey: ic.y - rd - cw / 2,
      },
      //Правый переход
      {
        sx: ic.x + rd + cw / 2,
        sy: ic.y - rd,
        ex: ic.x + rd + cw / 2,
        ey: ic.y + rd,
      },
      //Нижний переход
      {
        sx: ic.x - rd,
        sy: ic.y + rd + cw / 2,
        ex: ic.x + rd,
        ey: ic.y + rd + cw / 2,
      },
      //Левый переход
      {
        sx: ic.x - rd - cw / 2,
        sy: ic.y - rd,
        ex: ic.x - rd - cw / 2,
        ey: ic.y + rd,
      },
    ];

    const cwData = crosswalks[crosswalkIndex];
    this.sx = cwData.sx;
    this.sy = cwData.sy;
    this.ex = cwData.ex;
    this.ey = cwData.ey;
    this.x = this.sx;
    this.y = this.sy;

    this.totalDist = dist(
      { x: this.sx, y: this.sy },
      { x: this.ex, y: this.ey },
    );
    this.progress = 0;
  }

  update(dt, simulator) {
    if (this.done) return;

    const relevantLight =
      this.crosswalkIndex === 0 || this.crosswalkIndex === 2
        ? simulator.lights[1]
        : simulator.lights[0];

    if (this.progress === 0 && relevantLight.isStop()) {
      return;
    }

    this.progress +=
      (PEDESTRIAN_SPEED * simulator.simSpeed * dt * 60) / this.totalDist;
    if (this.progress >= 1) {
      this.progress = 1;
      this.done = true;
    }

    this.x = lerp(this.sx, this.ex, this.progress);
    this.y = lerp(this.sy, this.ey, this.progress);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y - 2);

    // Голова
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, -8, 5, 0, Math.PI * 2);
    ctx.fill();

    // Торс
    ctx.fillRect(-3, -3, 6, 12);

    // Ноги
    ctx.fillRect(-3, 9, 2, 4);
    ctx.fillRect(1, 9, 2, 4);

    ctx.restore();
  }
}
