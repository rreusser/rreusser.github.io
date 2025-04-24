import * as d3 from "./d3@7.umd.js";
import css from "insert-css";

css(`
html, body {
  margin: 0;
  padding: 0;
}
body {
  background: #333;
}
`);

const aspectRatioDisplay = document.createElement("div");
aspectRatioDisplay.style.position = "absolute";
aspectRatioDisplay.style.top = "10px";
aspectRatioDisplay.style.left = "10px";
aspectRatioDisplay.style.color = "white";
aspectRatioDisplay.style.fontSize = "20px";
aspectRatioDisplay.style.zIndex = "1000";
aspectRatioDisplay.style.pointerEvents = "none";
aspectRatioDisplay.style.fontFamily = "monospace";
document.body.appendChild(aspectRatioDisplay);

// Set up the SVG canvas
let width = window.innerWidth;
let height = window.innerHeight;

window.addEventListener("resize", () => {
  width = window.innerWidth;
  height = window.innerHeight;

  svg.attr("width", width).attr("height", height);
});
const svg = d3
  .select("body")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Initial rectangle vertices
const rectWidth = 0.8 * width;
const rectHeight = rectWidth / Math.sqrt(2);
const centerX = width / 2;
const centerY = height / 2;

let vertices = [
  { x: centerX - rectWidth / 2, y: centerY - rectHeight / 2 },
  { x: centerX + rectWidth / 2, y: centerY - rectHeight / 2 },
  { x: centerX + rectWidth / 2, y: centerY + rectHeight / 2 },
  { x: centerX - rectWidth / 2, y: centerY + rectHeight / 2 },
];

function updateAspectRatioDisplay() {
  const width = Math.abs(vertices[1].x - vertices[0].x);
  const height = Math.abs(vertices[3].y - vertices[0].y);
  const aspectRatio = (width / height).toFixed(8);
  aspectRatioDisplay.innerText = `Aspect Ratio: ${aspectRatio}`;
}

// Function to draw nested squares
function updateNestedSquares() {
  const threshold = 2; // Minimum size of squares to stop nesting
  const squares = [];
  let remainingVertices = [...vertices];

  let depth = -1;
  let curSize = Infinity;
  while (true) {
    const [topLeft, topRight, bottomRight, bottomLeft] = remainingVertices;

    // Calculate the width and height of the current rectangle
    const rectWidth = topRight.x - topLeft.x;
    const rectHeight = bottomLeft.y - topLeft.y;

    // Determine the size of the largest square that can fit
    const squareSize = Math.min(rectWidth, rectHeight);

    if (squareSize < curSize) {
      depth++;
      curSize = squareSize;
    }

    if (squareSize < threshold) break;

    // Add the square to the data array
    squares.push({
      depth,
      x: topLeft.x,
      y: topLeft.y,
      size: squareSize,
    });

    // Update the remaining vertices based on the uncovered area
    if (rectWidth > rectHeight) {
      // Horizontal step
      remainingVertices = [
        { x: topLeft.x + squareSize, y: topLeft.y },
        topRight,
        bottomRight,
        { x: bottomLeft.x + squareSize, y: bottomLeft.y },
      ];
    } else {
      // Vertical step
      remainingVertices = [
        { x: topLeft.x, y: topLeft.y + squareSize },
        { x: topRight.x, y: topRight.y + squareSize },
        bottomRight,
        bottomLeft,
      ];
    }
  }

  // Bind the data to the squares
  const squareSelection = svg.selectAll(".nested-square").data(squares);
  console.log(squares);

  // Enter selection: Add new squares
  squareSelection
    .enter()
    .append("rect")
    .attr("class", "nested-square")
    .merge(squareSelection) // Update selection: Update existing squares
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y)
    .attr("width", (d) => d.size)
    .attr("height", (d) => d.size)
    .attr("fill", ({ depth }, i) =>
      d3.interpolateSpectral(1 - ((depth / 7) % 1))
    )
    .attr("stroke", "rgba(0, 0, 0, 0.5)")
    .attr("stroke-width", 1);

  // Exit selection: Remove old squares
  squareSelection.exit().remove();
}

// Draw the draggable vertices
const drag = d3.drag().on("drag", function (event, d) {
  d.x = event.x;
  d.y = event.y;

  const index = vertices.indexOf(d);
  if (index % 2 === 0) {
    // Update the adjacent vertices to maintain a rectangle
    vertices[(index + 1) % 4].y = d.y;
    vertices[(index + 3) % 4].x = d.x;
  } else {
    vertices[(index + 1) % 4].x = d.x;
    vertices[(index + 3) % 4].y = d.y;
  }

  update();
});

const rect = svg
  .append("polygon")
  .attr("points", vertices.map((d) => `${d.x},${d.y}`).join(" "))
  .attr("fill", "none");

const circles = svg
  .selectAll("circle")
  .data(vertices)
  .enter()
  .append("circle")
  .attr("r", 6)
  .attr("fill", "rgba(255, 255, 255, 0.2)")
  .attr("stroke", "rgba(255, 255, 255, 0.0)")
  .attr("cursor", "move")
  .attr("stroke-width", 8)
  .call(drag);

// Update the rectangle and circles
function update() {
  rect.attr("points", vertices.map((d) => `${d.x},${d.y}`).join(" "));
  circles.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
  updateNestedSquares();
  circles.raise();

  updateAspectRatioDisplay();
}

// Initial update
update();
