export class TrafficLight {
  constructor(direction) {
    this.direction = direction;
    this.state = "red";
    this.timer = 0;
    this.redTime = 20;
    this.greenTime = 20;
    this.yellowTime = 3;
    this.initialDelay = direction === "ew" ? 20 : 0;
    this.started = false;
  }

  update(dt) {
    if (!this.started) {
      this.initialDelay -= dt;
      if (this.initialDelay <= 0) {
        this.started = true;
        this.state = this.direction === "ns" ? "green" : "red";
        this.timer = this.state === "green" ? this.greenTime : this.yellowTime;
      }
      return;
    }

    this.timer -= dt;
    if (this.timer <= 0) {
      switch (this.state) {
        case "green":
          this.state = "yellow";
          this.timer = this.yellowTime;
          break;
        case "yellow":
          this.state = "red";
          this.timer = this.redTime;
          break;
        case "red":
          this.state = "green";
          this.timer = this.greenTime;
          break;
      }
    }
  }

  isStop() {
    return this.state === "red" || this.state === "yellow";
  }
}
