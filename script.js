import { Simulator } from "./Simulator.js";

const simulator = new Simulator();

document
  .getElementById("spawnBtn")
  .addEventListener("click", () => simulator.spawnCar());

document.getElementById("clearBtn").addEventListener("click", () => {
  simulator.cars = [];
  simulator.peds = [];
});

document.getElementById("pauseBtn").addEventListener("click", () => {
  simulator.paused = !simulator.paused;
  document.getElementById("pauseBtn").textContent = simulator.paused
    ? "▶️ Play"
    : "⏸️ Pause";
  if (!simulator.paused) simulator.lastTime = performance.now();
});

document.getElementById("simSpeed").addEventListener("input", (e) => {
  simulator.simSpeed = parseFloat(e.target.value);
  document.getElementById("simSpeedVal").textContent =
    simulator.simSpeed.toFixed(1) + "x";
});

document.getElementById("spawnRate").addEventListener("input", (e) => {
  simulator.spawnRate = parseInt(e.target.value);
  document.getElementById("spawnRateVal").textContent =
    simulator.spawnRate + "/s";
});

document.getElementById("redTime").addEventListener("input", (e) => {
  const val = parseInt(e.target.value);

  document.getElementById("redTimeVal").textContent = val + "s";
  simulator.lights.forEach((l) => (l.redTime = val));

  document.getElementById("greenTime").value = val;
  document.getElementById("greenTimeVal").textContent = val + "s";
  simulator.lights.forEach((l) => (l.greenTime = val));
});

document.getElementById("greenTime").addEventListener("input", (e) => {
  const val = parseInt(e.target.value);

  document.getElementById("greenTimeVal").textContent = val + "s";
  simulator.lights.forEach((l) => (l.greenTime = val));

  document.getElementById("redTime").value = val;
  document.getElementById("redTimeVal").textContent = val + "s";
  simulator.lights.forEach((l) => (l.redTime = val));
});

document.getElementById("yellowTime").addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  document.getElementById("yellowTimeVal").textContent = val + "s";
  simulator.lights.forEach((l) => (l.yellowTime = val));
});

document.getElementById("noRightTurn").addEventListener("change", () => {
  simulator.cars.forEach((car) => car.updateTargetLane());
});

simulator.animate();
