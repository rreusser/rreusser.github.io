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
const aspectRatioContainer = document.createElement("div");
aspectRatioContainer.style.position = "absolute";
aspectRatioContainer.style.top = "10px";
aspectRatioContainer.style.left = "10px";
aspectRatioContainer.style.color = "white";
aspectRatioContainer.style.fontSize = "20px";
aspectRatioContainer.style.zIndex = "1000";
aspectRatioContainer.style.pointerEvents = "none";
aspectRatioContainer.style.fontFamily = "monospace";
aspectRatioContainer.style.textShadow = "0 0 5px black";

const aspectRatioLabel = document.createElement("span");
aspectRatioLabel.innerText = "Input: ";
aspectRatioContainer.appendChild(aspectRatioLabel);

const aspectRatioInput = document.createElement("input");
aspectRatioInput.style.pointerEvents = "all";
aspectRatioInput.type = "text";
aspectRatioInput.value = "sqrt(2)"; // Initial value
aspectRatioInput.style.background = "rgba(255,255,255,0.05)";
aspectRatioInput.style.border = "1px solid rgba(255, 255, 255, 0.5)";
aspectRatioInput.style.borderRadius = "5px";
aspectRatioInput.style.padding = "5px";
aspectRatioInput.style.color = "white";
aspectRatioInput.style.fontSize = "20px";
aspectRatioInput.style.fontFamily = "monospace";
aspectRatioInput.style.textShadow = "0 0 5px black";
aspectRatioContainer.appendChild(aspectRatioInput);

document.body.appendChild(aspectRatioContainer);

const termsDisplay = document.createElement("div");
termsDisplay.style.position = "absolute";
termsDisplay.style.bottom = "10px";
termsDisplay.style.left = "10px";
termsDisplay.style.color = "white";
termsDisplay.style.fontSize = "20px";
termsDisplay.style.zIndex = "1000";
//termsDisplay.style.pointerEvents = "none";
termsDisplay.style.fontFamily = "serif";
termsDisplay.style.textShadow = "0 0 5px black";
document.body.appendChild(termsDisplay);

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

// Establish x and y scales
const xScale = d3.scaleLinear().domain([0, width]).range([0, width]);
const yScale = d3.scaleLinear().domain([0, height]).range([0, height]);

let k = 1;

// Define the zoom behavior
const zoom = d3
  .zoom()
  .scaleExtent([0.1, 10000]) // Set zoom scale limits
  .on("zoom", (event) => {
    const transform = event.transform;
    k = transform.k;

    // Update the scales with the zoom transform
    xScale.domain([0, width].map((d) => transform.applyX(d)));
    yScale.domain([0, height].map((d) => transform.applyY(d)));

    // Apply the transform to the SVG elements
    svg.selectAll("g").attr("transform", transform);

    // Redraw the nested squares and other elements
    update();
  });

// Add a group to hold all zoomable content
const zoomableGroup = svg.append("g");

// Apply the zoom behavior to the SVG
svg.call(zoom);

// Initial rectangle vertices
const rectWidth = 0.8 * width;
const rectHeight = rectWidth / Math.sqrt(2);
const centerX = width / 2;
const centerY = height / 2;

let vertices = (window.vertices = [
  { x: centerX - rectWidth / 2, y: centerY - rectHeight / 2 }, // Top-left
  { x: centerX + rectWidth / 2, y: centerY - rectHeight / 2 }, // Top-right
  { x: centerX + rectWidth / 2, y: centerY + rectHeight / 2 }, // Bottom-right
  { x: centerX - rectWidth / 2, y: centerY + rectHeight / 2 }, // Bottom-left
]);

function updateAspectRatioDisplay() {
  const width = Math.abs(vertices[1].x - vertices[0].x);
  const height = Math.abs(vertices[3].y - vertices[0].y);
  const aspectRatio = (width / height).toFixed(14);
  aspectRatioInput.value = aspectRatio;
}

function setAspectRatio(aspectRatio) {
  const width = Math.abs(vertices[1].x - vertices[0].x);
  const height = width / aspectRatio;
  vertices[1].x = vertices[0].x + width;
  vertices[1].y = vertices[0].y;
  vertices[2].x = vertices[0].x + width;
  vertices[2].y = vertices[0].y + height;
  vertices[3].x = vertices[0].x;
  vertices[3].y = vertices[0].y + height;
  update(false);
}

aspectRatioInput.addEventListener("input", (event) => {
  try {
    const value = new Function(`
      const { ${Object.getOwnPropertyNames(Math).map(name => `${name}: ${name.toLowerCase()}`).join(", ")} } = Math;
      return Math.abs(${event.target.value.toLowerCase()});
    `)();
    if (isNaN(value) || value <= 0) return;
    setAspectRatio(value);
  } catch (e) {
    return;
  }
});

// Function to draw nested squares
function updateNestedSquares() {
  const threshold = 0.00001; // Minimum size of squares to stop nesting
  const squares = [];
  let remainingVertices = [...vertices];

  let depth = -1;
  let curSize = Infinity;
  let cnt = 0;
  let terms = [];
  while (true) {
    const [topLeft, topRight, bottomRight, bottomLeft] = remainingVertices;

    // Calculate the width and height of the current rectangle
    const rectWidth = topRight.x - topLeft.x;
    const rectHeight = bottomLeft.y - topLeft.y;

    // Determine the size of the largest square that can fit
    const squareSize = Math.min(rectWidth, rectHeight);
    cnt++;

    if (squareSize < curSize - 1e-11) {
      depth++;
      if (depth > 0) terms.push(cnt);
      cnt = 0;
      curSize = squareSize;
    }

    if (squareSize < threshold) {
      if (Math.abs(squareSize) < 1e-10) {
        terms.push(0);
      }
      break;
    }

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
  if (terms[terms.length - 1] === 0) {
    terms.pop();
    termsDisplay.innerText = `[${terms[0]}; ${terms.slice(1).join(", ")}]`;
  } else {
    termsDisplay.innerText = `[${terms[0]}; ${terms.slice(1).join(", ")}, ...]`;
  }

  // Bind the data to the squares
  const squareSelection = zoomableGroup
    .selectAll(".nested-square")
    .data(squares);

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
    .attr("stroke-width", 1)
    .style("vector-effect", "non-scaling-stroke"); // Ensure stroke width stays fixed

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

  updateAspectRatioDisplay();
  update();
});

const rect = zoomableGroup
  .append("polygon")
  .attr("points", vertices.map((d) => `${d.x},${d.y}`).join(" "))
  .attr("fill", "none");

const circles = zoomableGroup
  .selectAll("circle")
  .data(vertices)
  .enter()
  .append("circle")
  .attr("r", 6)
  .attr("fill", "rgba(255, 255, 255, 0.2)")
  .attr("stroke", "none")
  .attr("cursor", "move")
  .call(drag);

// Adjust circle radius on zoom to keep size fixed
svg.on("zoom", (event) => {
  const transform = event.transform;
  circles.attr("r", 12 / transform.k); // Scale radius inversely with zoom level
});

// Update the rectangle and circles
function update(feedback = true) {
  rect.attr("points", vertices.map((d) => `${d.x},${d.y}`).join(" "));
  circles
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", 12 / k);

  updateNestedSquares();
  circles.raise();
}

// Initial update
update();
