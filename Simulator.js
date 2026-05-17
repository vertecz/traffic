import {
  ctx,
  W,
  H,
  ROAD_WIDTH,
  LANE_WIDTH,
  INTERSECTION_CENTER,
  MAX_CARS,
  CROSSWALK_WIDTH,
} from "./constants.js";
import { TrafficLight } from "./TrafficLight.js";
import { Car } from "./Car.js";
import { Pedestrian } from "./Pedestrian.js";

export class Simulator {
  constructor() {
    this.cars = [];
    this.peds = [];
    this.lights = [new TrafficLight("ns"), new TrafficLight("ew")];
    this.paused = false;
    this.simSpeed = 1;
    this.spawnRate = 2;
    this.lastSpawn = 0;
    this.lastPedSpawn = 0;
    this.animationId = null;
    this.lastTime = performance.now();
  }

  spawnCar() {
    if (this.cars.length >= MAX_CARS) return;
    const dir = Math.floor(Math.random() * 4);
    let x, y;
    const offset = ROAD_WIDTH / 4;
    switch (dir) {
      case 0:
        x = INTERSECTION_CENTER.x + offset;
        y = H + 50;
        break;
      case 1:
        x = -50;
        y = INTERSECTION_CENTER.y + offset;
        break;
      case 2:
        x = INTERSECTION_CENTER.x - offset;
        y = -50;
        break;
      case 3:
        x = W + 50;
        y = INTERSECTION_CENTER.y - offset;
        break;
    }
    this.cars.push(new Car(x, y, dir));
  }

  spawnPedestrian() {
    this.peds.push(new Pedestrian(Math.floor(Math.random() * 4)));
  }

  updateCounters() {
    const activeCars = this.cars.filter((c) => !c.done);
    document.getElementById("carCount").textContent = activeCars.length;
    document.getElementById("pedCount").textContent = this.peds.filter(
      (p) => !p.done,
    ).length;
    const avgWait =
      activeCars.length > 0
        ? (
            activeCars.reduce((sum, c) => sum + c.waitTime, 0) /
            activeCars.length
          ).toFixed(1)
        : "0.0";
    document.getElementById("avgWait").textContent = avgWait;
    document.getElementById("lightState").textContent =
      `N-S: ${this.lights[0].state.toUpperCase()} | E-W: ${this.lights[1].state.toUpperCase()}`;
  }

  drawRoad() {
    const ic = INTERSECTION_CENTER;
    const rd = ROAD_WIDTH / 2;

    // 1. Городской ландшафт вне дорог
    ctx.fillStyle = "#11141a";
    ctx.fillRect(0, 0, W, H);

    // Четыре угловые зоны плиточного тротуара
    ctx.fillStyle = "#262c36";
    ctx.fillRect(0, 0, ic.x - rd, ic.y - rd); // Топ-левый
    ctx.fillRect(ic.x + rd, 0, W - (ic.x + rd), ic.y - rd); // Топ-правый
    ctx.fillRect(0, ic.y + rd, ic.x - rd, H - (ic.y + rd)); // Бот-левый
    ctx.fillRect(ic.x + rd, ic.y + rd, W - (ic.x + rd), H - (ic.y + rd));

    // Отрисовка рельефного бордюрного камня
    ctx.strokeStyle = "#4b5563";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, ic.x - rd, ic.y - rd);
    ctx.strokeRect(ic.x + rd, 0, W - (ic.x + rd), ic.y - rd);
    ctx.strokeRect(0, ic.y + rd, ic.x - rd, H - (ic.y + rd));
    ctx.strokeRect(ic.x + rd, ic.y + rd, W - (ic.x + rd), H - (ic.y + rd));

    // 2. Асфальтовое покрытие дорожных ветвей
    ctx.fillStyle = "#181a1c";
    ctx.fillRect(0, ic.y - rd, W, ROAD_WIDTH); // Горизонтальное полотно
    ctx.fillRect(ic.x - rd, 0, ROAD_WIDTH, H); // Вертикальное полотно

    // Внутренняя коробка перекрестка
    ctx.fillStyle = "#1b1d1f";
    ctx.fillRect(ic.x - rd, ic.y - rd, ROAD_WIDTH, ROAD_WIDTH);

    // 3. ДОРОЖНАЯ РАЗМЕТКА
    // Двойная сплошная линия (Яркий дорожный желтый для разделения встречных направлений)
    ctx.strokeStyle = "#ffb300";
    ctx.lineWidth = 2;

    // Вертикальная двойная сплошная линия
    ctx.strokeRect(ic.x - 2, 0, 0, ic.y - rd - 40);
    ctx.strokeRect(ic.x + 2, 0, 0, ic.y - rd - 40);
    ctx.strokeRect(ic.x - 2, ic.y + rd + 40, 0, H - (ic.y + rd + 40));
    ctx.strokeRect(ic.x + 2, ic.y + rd + 40, 0, H - (ic.y + rd + 40));

    // Горизонтальная двойная сплошная линия
    ctx.strokeRect(0, ic.y - 2, ic.x - rd - 40, 0);
    ctx.strokeRect(0, ic.y + 2, ic.x - rd - 40, 0);
    ctx.strokeRect(ic.x + rd + 40, ic.y - 2, W - (ic.x + rd + 40), 0);
    ctx.strokeRect(ic.x + rd + 40, ic.y + 2, W - (ic.x + rd + 40), 0);

    // Пунктирные разделители полос попутного движения (белые, полупрозрачные)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([12, 18]);

    ctx.beginPath();
    // Вертикальные полосы
    ctx.moveTo(ic.x - 40, 0);
    ctx.lineTo(ic.x - 40, ic.y - rd - 40);
    ctx.moveTo(ic.x + 40, 0);
    ctx.lineTo(ic.x + 40, ic.y - rd - 40);
    ctx.moveTo(ic.x - 40, ic.y + rd + 40);
    ctx.lineTo(ic.x - 40, H);
    ctx.moveTo(ic.x + 40, ic.y + rd + 40);
    ctx.lineTo(ic.x + 40, H);
    // Горизонтальные полосы
    ctx.moveTo(0, ic.y - 40);
    ctx.lineTo(ic.x - rd - 40, ic.y - 40);
    ctx.moveTo(0, ic.y + 40);
    ctx.lineTo(ic.x - rd - 40, ic.y + 40);
    ctx.moveTo(ic.x + rd + 40, ic.y - 40);
    ctx.lineTo(W, ic.y - 40);
    ctx.moveTo(ic.x + rd + 40, ic.y + 40);
    ctx.lineTo(W, ic.y + 40);
    ctx.stroke();
    ctx.setLineDash([]); // Сброс штриха

    // 4. ШИРОКИЕ СТОП-ЛИНИИ (Выровнены ровно по бамперу торможения машин — 170px от центра)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ic.x, ic.y + 140);
    ctx.lineTo(ic.x + rd, ic.y + 140); // Снизу
    ctx.moveTo(ic.x - rd, ic.y - 140);
    ctx.lineTo(ic.x, ic.y - 140); // Сверху
    ctx.moveTo(ic.x - 140, ic.y);
    ctx.lineTo(ic.x - 140, ic.y + rd); // Слева
    ctx.moveTo(ic.x + 140, ic.y - rd);
    ctx.lineTo(ic.x + 140, ic.y); // Справа
    ctx.stroke();

    this.drawCrosswalks();
  }

  drawTurnArrows() {
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    const ic = INTERSECTION_CENTER;
    const arrowDist = 225; // Сдвинуты за стоп-линии, чтобы разметка была видна перед машинами
    this.drawArrow(ic.x - LANE_WIDTH * 0.6, ic.y + arrowDist, "up");
    this.drawArrow(ic.x + LANE_WIDTH * 0.6, ic.y - arrowDist, "down");
    this.drawArrow(ic.x - arrowDist, ic.y + LANE_WIDTH * 0.6, "right");
    this.drawArrow(ic.x + arrowDist, ic.y - LANE_WIDTH * 0.6, "left");
    ctx.restore();
  }

  drawArrow(x, y, direction) {
    ctx.save();
    ctx.translate(x, y);
    const size = 12;
    ctx.beginPath();
    if (direction === "up") {
      ctx.moveTo(0, -size);
      ctx.lineTo(-size / 2, size / 2);
      ctx.lineTo(size / 2, size / 2);
    } else if (direction === "down") {
      ctx.moveTo(0, size);
      ctx.lineTo(-size / 2, -size / 2);
      ctx.lineTo(size / 2, -size / 2);
    } else if (direction === "left") {
      ctx.moveTo(-size, 0);
      ctx.lineTo(size / 2, -size / 2);
      ctx.lineTo(size / 2, size / 2);
    } else if (direction === "right") {
      ctx.moveTo(size, 0);
      ctx.lineTo(-size / 2, -size / 2);
      ctx.lineTo(-size / 2, size / 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawCrosswalks() {
    const ic = INTERSECTION_CENTER;
    const rd = ROAD_WIDTH / 2 + 10;
    const cw = CROSSWALK_WIDTH;
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)"; // Зебра стала плотнее и ярче

    for (let x = ic.x - rd; x < ic.x + rd; x += 16) {
      ctx.fillRect(x, ic.y - rd - cw, 10, cw);
      ctx.fillRect(x, ic.y + rd, 10, cw);
    }
    for (let y = ic.y - rd; y < ic.y + rd; y += 16) {
      ctx.fillRect(ic.x - rd - cw, y, cw, 10);
      ctx.fillRect(ic.x + rd, y, cw, 10);
    }
  }

  drawTrafficLights() {
    const ic = INTERSECTION_CENTER;
    const rd = ROAD_WIDTH / 2 + 28;
    const lightPositions = [
      { x: ic.x - rd, y: ic.y - rd, light: this.lights[0] },
      { x: ic.x + rd, y: ic.y + rd, light: this.lights[0] },
      { x: ic.x + rd, y: ic.y - rd, light: this.lights[1] },
      { x: ic.x - rd, y: ic.y + rd, light: this.lights[1] },
    ];

    for (const pos of lightPositions) {
      ctx.save();

      // Металлическое основание столба опоры
      ctx.fillStyle = "#4b5563";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Стильный скругленный матовый корпус светофора
      ctx.fillStyle = "#1f2937";
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(pos.x - 10, pos.y - 24, 20, 48, 6);
      ctx.fill();
      ctx.stroke();

      const state = pos.light.state;

      // Линза Красного (Свечение при активации)
      ctx.save();
      if (state === "red") {
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#ff3333";
        ctx.fillStyle = "#ff3333";
      } else {
        ctx.fillStyle = "#4c0519"; // Выключенное стекло
      }
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 14, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Линза Желтого
      ctx.save();
      if (state === "yellow") {
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#eab308";
        ctx.fillStyle = "#eab308";
      } else {
        ctx.fillStyle = "#451a03";
      }
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Линза Зеленого
      ctx.save();
      if (state === "green") {
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#22c55e";
        ctx.fillStyle = "#22c55e";
      } else {
        ctx.fillStyle = "#022c22";
      }
      ctx.beginPath();
      ctx.arc(pos.x, pos.y + 14, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
    }
  }

  drawNoRightTurnSign() {
    if (!document.getElementById("noRightTurn")?.checked) return;
    const ic = INTERSECTION_CENTER;
    const rd = ROAD_WIDTH / 2 + 45;
    const corners = [
      { x: ic.x - rd, y: ic.y - rd },
      { x: ic.x + rd, y: ic.y - rd },
      { x: ic.x + rd, y: ic.y + rd },
      { x: ic.x - rd, y: ic.y + rd },
    ];
    for (const corner of corners) {
      ctx.save();
      ctx.translate(corner.x, corner.y - 35);

      // Небольшая объемная тень под знаком
      ctx.shadowBlur = 6;
      ctx.shadowColor = "rgba(0,0,0,0.4)";

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.strokeStyle = "#1f2937";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-5, 3);
      ctx.lineTo(3, 3);
      ctx.lineTo(3, -4);
      ctx.stroke();

      ctx.fillStyle = "#1f2937";
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(7, -4);
      ctx.lineTo(3, -1);
      ctx.fill();

      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-9, -9);
      ctx.lineTo(9, 10);
      ctx.stroke();
      ctx.restore();
    }
  }

  animate(currentTime = performance.now()) {
    if (!this.paused) {
      const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
      for (const light of this.lights) light.update(dt * this.simSpeed);
      this.lastSpawn += dt * this.simSpeed;
      if (this.spawnRate > 0 && this.lastSpawn >= 1 / this.spawnRate) {
        this.spawnCar();
        this.lastSpawn = 0;
      }
      this.lastPedSpawn += dt * this.simSpeed;
      if (this.lastPedSpawn >= 3 + Math.random() * 2) {
        this.spawnPedestrian();
        this.lastPedSpawn = 0;
      }
      for (const car of this.cars) car.update(dt, this);
      for (const ped of this.peds) ped.update(dt, this);
      this.cars = this.cars.filter((c) => !c.done);
      this.peds = this.peds.filter((p) => !p.done);
    }
    this.lastTime = currentTime;
    this.draw();
    this.updateCounters();
    this.animationId = requestAnimationFrame((time) => this.animate(time));
  }

  draw() {
    ctx.clearRect(0, 0, W, H);
    this.drawRoad();
    this.drawTrafficLights();
    this.drawNoRightTurnSign();
    for (const ped of this.peds) ped.draw(ctx);
    for (const car of this.cars) car.draw(ctx);
  }
}
