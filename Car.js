import {
  DIR_VECTORS,
  INTERSECTION_CENTER,
  STOP_LINE_DIST,
  LANE_WIDTH,
  LANE_CHANGE_DIST,
  COLLISION_DIST,
  CAR_LENGTH,
  CAR_WIDTH,
  CAR_COLORS,
  ROAD_WIDTH,
  dist,
  lerp,
  randomChoice,
  W,
  H,
} from "./constants.js";

export class Car {
  constructor(x, y, dir) {
    this.dir = dir;
    this.currentAngle = Math.atan2(
      DIR_VECTORS[this.dir].y,
      DIR_VECTORS[this.dir].x,
    );
    this.angle = this.currentAngle;
    this.targetAngle = this.angle;
    this.x = x;
    this.y = y;
    this.speed = 2;
    this.maxSpeed = 2.5;
    this.state = "drive";
    this.color = randomChoice(CAR_COLORS);
    this.waitTime = 0;
    this.done = false;
    this.hasTurned = false;

    // Анимация поворота по кривой Безье
    this.isTurning = false;
    this.turnProgress = 0;
    this.turnLength = 0;

    const rand = Math.random() * 100;
    if (rand < 60) this.turn = "straight";
    else if (rand < 80) this.turn = "right";
    else if (rand < 95) this.turn = "left";
    else this.turn = "uturn";

    this.lane = Math.random() < 0.5 ? 1 : 2;
    this.targetLane = this.lane;
    this.laneChanging = false;
    this.laneChangeProgress = 0;

    this.updateTargetLane();
    this.calculateOffset();
  }

  updateTargetLane() {
    const noRight = document.getElementById("noRightTurn")?.checked || false;

    if (this.turn === "right" && !noRight) {
      this.targetLane = 2;
    } else if (this.turn === "left" || this.turn === "uturn") {
      this.targetLane = 1;
    } else {
      this.targetLane = this.lane;
    }
  }

  hasPassedStopLine() {
    const dirVec = DIR_VECTORS[this.dir];
    const dx = INTERSECTION_CENTER.x - this.x;
    const dy = INTERSECTION_CENTER.y - this.y;
    const dot = dx * dirVec.x + dy * dirVec.y;
    return dot < STOP_LINE_DIST - 50;
  }

  calculateOffset() {
    const dirVec = DIR_VECTORS[this.dir];
    const perpDir = { x: -dirVec.y, y: dirVec.x };
    const laneCenter = (this.lane - 1.5) * LANE_WIDTH;
    this.offsetX = perpDir.x * laneCenter;
    this.offsetY = perpDir.y * laneCenter;
  }

  update(dt, simulator) {
    if (this.done) return;

    const simSpeed = simulator.simSpeed;
    const moveAmount = this.speed * simSpeed * dt * 60;

    this.updateTargetLane();

    if (!this.isTurning) {
      let targetAngle = Math.atan2(
        DIR_VECTORS[this.dir].y,
        DIR_VECTORS[this.dir].x,
      );
      let angleDiff = targetAngle - this.currentAngle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      this.currentAngle += angleDiff * 0.1 * simSpeed * dt * 60;
    }

    // Перестроение рядов (заблаговременно за 400px до перекрестка)
    const distToCenter = dist(this, INTERSECTION_CENTER);
    if (
      !this.isTurning &&
      distToCenter < 400 &&
      this.lane !== this.targetLane &&
      !this.laneChanging
    ) {
      this.laneChanging = true;
      this.laneChangeProgress = 0;
    }

    if (this.laneChanging && !this.isTurning) {
      this.laneChangeProgress += 0.015 * simSpeed * dt * 60;
      if (this.laneChangeProgress >= 1) {
        this.lane = this.targetLane;
        this.laneChanging = false;
        this.calculateOffset();
      } else {
        const currentLaneCenter = (this.lane - 1.5) * LANE_WIDTH;
        const targetLaneCenter = (this.targetLane - 1.5) * LANE_WIDTH;
        const lerpedLane = lerp(
          currentLaneCenter,
          targetLaneCenter,
          this.laneChangeProgress,
        );
        const dirVec = DIR_VECTORS[this.dir];
        const perpDir = { x: -dirVec.y, y: dirVec.x };
        this.offsetX = perpDir.x * lerpedLane;
        this.offsetY = perpDir.y * lerpedLane;
      }
    }

    // Светофоры
    const nsLight = simulator.lights[0];
    const ewLight = simulator.lights[1];
    const light = this.dir === 0 || this.dir === 2 ? nsLight : ewLight;
    const stopDist = dist(this, INTERSECTION_CENTER);
    const approachingIntersection =
      stopDist > STOP_LINE_DIST - 30 && stopDist < STOP_LINE_DIST + 50;

    if (
      approachingIntersection &&
      light.isStop() &&
      !this.hasPassedStopLine() &&
      !this.isTurning
    ) {
      this.state = "stopping";
    }

    // --- ЛОГИКА ПРИОРИТЕТА ---
    let yieldToOncoming = false;
    if (
      (this.turn === "left" || this.turn === "uturn") &&
      !this.isTurning &&
      !this.hasTurned
    ) {
      const oncomingDir = (this.dir + 2) % 4;
      let closestOncomingCar = null;
      let minOncomingDist = Infinity;

      for (const other of simulator.cars) {
        if (other === this || other.done) continue;
        if (other.dir === oncomingDir) {
          const otherWorldX = other.x + other.offsetX;
          const otherWorldY = other.y + other.offsetY;
          const otherDist = Math.sqrt(
            (otherWorldX - INTERSECTION_CENTER.x) ** 2 +
              (otherWorldY - INTERSECTION_CENTER.y) ** 2,
          );

          const dirVec = DIR_VECTORS[other.dir];
          const dx = INTERSECTION_CENTER.x - otherWorldX;
          const dy = INTERSECTION_CENTER.y - otherWorldY;
          const dot = dx * dirVec.x + dy * dirVec.y;

          if (otherDist < 240 && dot > -40) {
            if (otherDist < minOncomingDist) {
              minOncomingDist = otherDist;
              closestOncomingCar = other;
            }
          }
        }
      }

      if (closestOncomingCar) {
        if (
          closestOncomingCar.turn === "straight" ||
          closestOncomingCar.turn === "right"
        ) {
          if (distToCenter < 100) {
            yieldToOncoming = true;
          }
        }
      }
    }

    //СИСТЕМА КОЛЛИЗИЙ
    let carAhead = null;
    let minDistAhead = Infinity;

    const myWorldX = this.x + this.offsetX;
    const myWorldY = this.y + this.offsetY;
    const headingX = Math.cos(this.currentAngle);
    const headingY = Math.sin(this.currentAngle);

    for (const other of simulator.cars) {
      if (other === this || other.done) continue;

      if (
        (this.turn === "left" || this.turn === "uturn") &&
        (other.turn === "left" || other.turn === "uturn") &&
        (this.dir + 2) % 4 === other.dir
      ) {
        continue;
      }

      if (
        this.isTurning &&
        other.dir === (this.dir + 2) % 4 &&
        !other.hasPassedStopLine()
      ) {
        continue;
      }

      if (this.isTurning && this.waitTime > 1.5) {
        const myFinalDir = this.isTurning ? this.nextDir : this.dir;
        const otherFinalDir = other.isTurning ? other.nextDir : other.dir;
        if (myFinalDir !== otherFinalDir) {
          continue;
        }
      }

      const otherWorldX = other.x + other.offsetX;
      const otherWorldY = other.y + other.offsetY;

      const d = Math.sqrt(
        (otherWorldX - myWorldX) ** 2 + (otherWorldY - myWorldY) ** 2,
      );
      const scanDistance = this.isTurning ? 55 : 80;

      if (d < scanDistance) {
        const dx = otherWorldX - myWorldX;
        const dy = otherWorldY - myWorldY;

        const dot = dx * headingX + dy * headingY;
        const perp = -dx * headingY + dy * headingX;

        let corridorWidth = CAR_WIDTH * 1.1;
        if (this.isTurning) corridorWidth = CAR_WIDTH * 0.75;
        else if (this.laneChanging) corridorWidth = CAR_WIDTH * 1.5;

        if (dot > 0 && Math.abs(perp) < corridorWidth) {
          if (dot < minDistAhead) {
            minDistAhead = dot;
            carAhead = other;
          }
        }
      }
    }

    // Датчик пешеходов
    const pedCrossing =
      document.getElementById("pedCrossing")?.checked || false;
    let pedInCrosswalk = false;
    if (pedCrossing) {
      for (const ped of simulator.peds) {
        if (ped.done) continue;

        const dx = ped.x - myWorldX;
        const dy = ped.y - myWorldY;
        const pedDist = Math.sqrt(dx * dx + dy * dy);

        if (pedDist < 75) {
          const dot = dx * headingX + dy * headingY;
          const perp = -dx * headingY + dy * headingX;

          if (dot > 0 && dot < 70 && Math.abs(perp) < CAR_WIDTH * 1.2) {
            pedInCrosswalk = true;
            break;
          }
        }
      }
    }

    // Управление скоростью
    if (carAhead) {
      this.state = "stopping";
      this.speed = Math.max(
        0,
        ((minDistAhead - 53) / (80 - 53)) * this.maxSpeed,
      );
      if (this.speed < 0.1) this.speed = 0;
    } else if (pedInCrosswalk) {
      this.speed = 0;
    } else if (yieldToOncoming) {
      this.state = "yielding";
      this.speed = Math.max(0, ((distToCenter - 66) / 34) * this.maxSpeed);
      if (this.speed < 0.1) this.speed = 0;
    } else if (
      this.state === "stopping" &&
      approachingIntersection &&
      !this.hasPassedStopLine() &&
      !this.isTurning
    ) {
      this.speed = Math.max(
        0,
        ((stopDist - (STOP_LINE_DIST - 30)) / 30) * this.maxSpeed,
      );
      if (this.speed < 0.1) {
        this.speed = 0;
        this.state = "stopped";
      }
    } else {
      this.speed = Math.min(
        this.maxSpeed,
        this.speed + 0.05 * simSpeed * dt * 60,
      );
      this.state = "drive";
    }

    if (this.speed < 0.2) this.waitTime += dt * simSpeed;

    // Обновление позиций
    if (this.isTurning) {
      this.turnProgress += moveAmount / this.turnLength;

      if (this.turnProgress >= 1) {
        this.dir = this.nextDir;
        this.lane = this.nextLane;
        this.x = this.nextBaseX;
        this.y = this.nextBaseY;
        this.currentAngle = this.turnEndAngle;
        this.calculateOffset();
        this.isTurning = false;
        this.waitTime = 0;
      } else {
        const t = this.turnProgress;
        const currentWorldX =
          (1 - t) * (1 - t) * this.turnStartWorldX +
          2 * (1 - t) * t * this.cpX +
          t * t * this.turnEndWorldX;
        const currentWorldY =
          (1 - t) * (1 - t) * this.turnStartWorldY +
          2 * (1 - t) * t * this.cpY +
          t * t * this.turnEndWorldY;

        this.currentAngle =
          this.turnStartAngle + (this.turnEndAngle - this.turnStartAngle) * t;

        this.x = currentWorldX;
        this.y = currentWorldY;
        this.offsetX = 0;
        this.offsetY = 0;
      }
    } else {
      const dirVec = DIR_VECTORS[this.dir];
      this.x += dirVec.x * moveAmount;
      this.y += dirVec.y * moveAmount;

      if (
        dist(this, INTERSECTION_CENTER) < 65 &&
        this.state !== "stopped" &&
        this.state !== "yielding" &&
        !this.hasTurned
      ) {
        this.handleTurn(simulator);
      }
    }

    if (
      this.x < -100 ||
      this.x > W + 100 ||
      this.y < -100 ||
      this.y > H + 100
    ) {
      this.done = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + this.offsetX, this.y + this.offsetY);
    ctx.rotate(this.currentAngle);

    const halfL = CAR_LENGTH / 2;
    const halfW = CAR_WIDTH / 2;

    // Тень
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.roundRect(-halfL + 2, -halfW + 2, CAR_LENGTH, CAR_WIDTH, 6);
    ctx.fill();

    // Колёса
    ctx.fillStyle = "#1a1a1a";
    const wW = 8;
    const wH = 3;
    ctx.fillRect(-halfL + 6, -halfW - 1, wW, wH);
    ctx.fillRect(-halfL + 6, halfW - 2, wW, wH);
    ctx.fillRect(halfL - 14, -halfW - 1, wW, wH);
    ctx.fillRect(halfL - 14, halfW - 2, wW, wH);

    // Кузов
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(-halfL, -halfW, CAR_LENGTH, CAR_WIDTH, 5);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(-halfL, -halfW, CAR_LENGTH, 3);

    // Передние фары
    ctx.fillStyle = "#ffffd0";
    ctx.fillRect(halfL - 2, -halfW + 2, 3, 4);
    ctx.fillRect(halfL - 2, halfW - 6, 3, 4);

    if (this.speed > 0.2) {
      ctx.fillStyle = "rgba(255, 254, 230, 0.08)";
      ctx.beginPath();
      ctx.moveTo(halfL, -halfW + 2);
      ctx.lineTo(halfL + 25, -halfW - 6);
      ctx.lineTo(halfL + 25, halfW + 6);
      ctx.lineTo(halfL, halfW - 2);
      ctx.fill();
    }

    // Стоп-сигналы
    const isBraking =
      this.state === "stopping" ||
      this.state === "yielding" ||
      this.speed < 0.2;
    ctx.fillStyle = isBraking ? "#ff3333" : "#a30000";
    ctx.fillRect(-halfL, -halfW + 1, 2, 4);
    ctx.fillRect(-halfL, halfW - 5, 2, 4);
    if (isBraking) {
      ctx.fillStyle = "rgba(255, 51, 51, 0.2)";
      ctx.fillRect(-halfL - 4, -halfW, 4, 5);
      ctx.fillRect(-halfL - 4, halfW - 5, 4, 5);
    }

    const isBlinking = Math.floor(Date.now() / 300) % 2 === 0;
    if (isBlinking && (!this.hasTurned || this.isTurning)) {
      ctx.fillStyle = "#ffaa00";
      if (this.turn === "left" || this.turn === "uturn") {
        ctx.fillRect(halfL - 3, -halfW - 1, 3, 2);
        ctx.fillRect(-halfL, -halfW - 1, 2, 2);
      } else if (this.turn === "right") {
        ctx.fillRect(halfL - 3, halfW - 1, 3, 2);
        ctx.fillRect(-halfL, halfW - 1, 2, 2);
      }
    }

    // Стёкла
    ctx.fillStyle = "#1e272e";
    ctx.beginPath();
    ctx.roundRect(-halfL + 11, -halfW + 3, CAR_LENGTH - 18, CAR_WIDTH - 6, 3);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.beginPath();
    ctx.moveTo(-halfL + 16, -halfW + 3);
    ctx.lineTo(-halfL + 22, -halfW + 3);
    ctx.lineTo(-halfL + 15, halfW - 3);
    ctx.lineTo(-halfL + 9, halfW - 3);
    ctx.fill();

    // Крыша
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(-halfL + 13, -halfW + 5, CAR_LENGTH - 24, CAR_WIDTH - 10, 2);
    ctx.fill();

    ctx.restore();
  }

  handleTurn(simulator) {
    const noRight = document.getElementById("noRightTurn")?.checked || false;

    let nextDir = this.dir;
    let nextLane = this.lane;

    if (this.turn === "right" && !noRight) {
      nextDir = (this.dir + 1) % 4;
      nextLane = 2;
    } else if (this.turn === "left") {
      nextDir = (this.dir + 3) % 4;
      nextLane = 1;
    } else if (this.turn === "uturn") {
      nextDir = (this.dir + 2) % 4;
      nextLane = 1;
    } else {
      this.hasTurned = true;
      return;
    }

    this.hasTurned = true;
    this.isTurning = true;
    this.turnProgress = 0;

    this.turnStartWorldX = this.x + this.offsetX;
    this.turnStartWorldY = this.y + this.offsetY;
    this.turnStartAngle = this.currentAngle;

    const nextDirVec = DIR_VECTORS[nextDir];
    const nextPerpDir = { x: -nextDirVec.y, y: nextDirVec.x };
    const nextLaneCenter = (nextLane - 1.5) * LANE_WIDTH;
    const targetOffsetX = nextPerpDir.x * nextLaneCenter;
    const targetOffsetY = nextPerpDir.y * nextLaneCenter;

    const baseOffset = ROAD_WIDTH / 4;
    let baseX = INTERSECTION_CENTER.x;
    let baseY = INTERSECTION_CENTER.y;
    if (nextDir === 0) baseX += baseOffset;
    else if (nextDir === 1) baseY += baseOffset;
    else if (nextDir === 2) baseX -= baseOffset;
    else if (nextDir === 3) baseY -= baseOffset;

    baseX += nextDirVec.x * (ROAD_WIDTH / 2);
    baseY += nextDirVec.y * (ROAD_WIDTH / 2);

    this.turnEndWorldX = baseX + targetOffsetX;
    this.turnEndWorldY = baseY + targetOffsetY;

    let endAngle = Math.atan2(nextDirVec.y, nextDirVec.x);
    let angleDiff = endAngle - this.turnStartAngle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    if ((this.turn === "left" || this.turn === "uturn") && angleDiff > 0) {
      angleDiff -= Math.PI * 2;
    }
    if (this.turn === "uturn") {
      angleDiff = -Math.PI;
    }

    this.turnEndAngle = this.turnStartAngle + angleDiff;

    if (this.turn === "left" || this.turn === "uturn") {
      this.cpX = INTERSECTION_CENTER.x;
      this.cpY = INTERSECTION_CENTER.y;
    } else {
      if (this.dir === 0 || this.dir === 2) {
        this.cpX = this.turnStartWorldX;
        this.cpY = this.turnEndWorldY;
      } else {
        this.cpX = this.turnEndWorldX;
        this.cpY = this.turnStartWorldY;
      }
    }

    const chord = Math.sqrt(
      (this.turnEndWorldX - this.turnStartWorldX) ** 2 +
        (this.turnEndWorldY - this.turnStartWorldY) ** 2,
    );
    this.turnLength = this.turn === "uturn" ? chord * 1.6 : chord * 1.2;

    this.nextDir = nextDir;
    this.nextLane = nextLane;
    this.nextBaseX = baseX;
    this.nextBaseY = baseY;
  }
}
