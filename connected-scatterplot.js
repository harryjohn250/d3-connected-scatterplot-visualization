let fullData = [];
let rawData = [];
let currentFile = "";

let timeKey = null;
let numericKeys = [];

let xKey = null;
let yKey = null;
let hueKey = null;
let lightnessKey = null;

let startYear = null;
let endYear = null;

const bivariatePalette = {
  decrease: {
    decrease: "#e8e8e8",
    same: "#b8d6be",
    increase: "#73ae80"
  },
  same: {
    decrease: "#e4cfe8",
    same: "#b0b0b0",
    increase: "#5a9178"
  },
  increase: {
    decrease: "#c85a5a",
    same: "#ad7aa9",
    increase: "#3b4994"
  }
};

function main() {
  const datasetSelect = document.getElementById("datasetSelect");
  datasetSelect.addEventListener("change", handleDatasetChange);

  document.getElementById("xAxisSelect").addEventListener("change", handleDimensionChange);
  document.getElementById("yAxisSelect").addEventListener("change", handleDimensionChange);
  document.getElementById("hueSelect").addEventListener("change", handleDimensionChange);
  document.getElementById("lightnessSelect").addEventListener("change", handleDimensionChange);

  loadDataset(datasetSelect.value);
}

function handleDatasetChange() {
  const datasetSelect = document.getElementById("datasetSelect");
  loadDataset(datasetSelect.value);
}

function handleDimensionChange() {
  xKey = document.getElementById("xAxisSelect").value;
  yKey = document.getElementById("yAxisSelect").value;
  hueKey = document.getElementById("hueSelect").value;
  lightnessKey = document.getElementById("lightnessSelect").value;

  addDeltaInfo(fullData);
  renderLegend();
  updateDatasetInfo();
  drawChart();
}

function loadDataset(fileName) {
  d3.csv(fileName, d3.autoType).then(data => {
    if (!data || data.length === 0) {
      alert("Dataset could not be loaded.");
      return;
    }

    currentFile = fileName;
    rawData = data;

    const columns = data.columns;
    timeKey = columns[0];
    numericKeys = columns.slice(1).filter(col => typeof data[0][col] === "number");

    if (numericKeys.length < 2) {
      alert("Dataset must have at least 2 numeric columns after the time column.");
      return;
    }

    if (fileName === "driving.csv") {
      xKey = "miles";
      yKey = "gas";
      hueKey = "miles";
      lightnessKey = "gas";
    } else {
      xKey = numericKeys[0];
      yKey = numericKeys[1];
      hueKey = numericKeys[2] || numericKeys[0];
      lightnessKey = numericKeys[3] || numericKeys[1];
    }

    fullData = data
      .filter(d => d[timeKey] != null)
      .sort((a, b) => d3.ascending(a[timeKey], b[timeKey]));

    addDeltaInfo(fullData);
    setupDimensionMenus();
    setupTimeRange();
    renderLegend();
    updateDatasetInfo();
    drawChart();
  }).catch(() => {
    alert("Could not load " + fileName + ". Make sure the file is in your project folder.");
  });
}

function setupDimensionMenus() {
  fillSelect("xAxisSelect", numericKeys, xKey);
  fillSelect("yAxisSelect", numericKeys, yKey);
  fillSelect("hueSelect", numericKeys, hueKey);
  fillSelect("lightnessSelect", numericKeys, lightnessKey);
}

function fillSelect(selectId, options, selectedValue) {
  const select = document.getElementById(selectId);
  select.innerHTML = "";

  options.forEach(optionValue => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    if (optionValue === selectedValue) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

function setupTimeRange() {
  const timeValues = fullData.map(d => d[timeKey]);
  const minTime = Math.min(...timeValues);
  const maxTime = Math.max(...timeValues);

  startYear = minTime;
  endYear = maxTime;

  const startSlider = document.getElementById("startYear");
  const endSlider = document.getElementById("endYear");
  const startLabel = document.getElementById("startLabel");
  const endLabel = document.getElementById("endLabel");

  startSlider.min = minTime;
  startSlider.max = maxTime;
  startSlider.value = minTime;

  endSlider.min = minTime;
  endSlider.max = maxTime;
  endSlider.value = maxTime;

  startLabel.textContent = minTime;
  endLabel.textContent = maxTime;

  startSlider.oninput = function () {
    let newStart = +this.value;

    if (newStart > endYear) {
      newStart = endYear;
      this.value = endYear;
    }

    startYear = newStart;
    startLabel.textContent = startYear;
    drawChart();
  };

  endSlider.oninput = function () {
    let newEnd = +this.value;

    if (newEnd < startYear) {
      newEnd = startYear;
      this.value = startYear;
    }

    endYear = newEnd;
    endLabel.textContent = endYear;
    drawChart();
  };
}

function updateDatasetInfo() {
  const info = document.getElementById("datasetInfo");
  info.innerHTML =
    `<strong>Loaded file:</strong> ${currentFile}<br>` +
    `<strong>Time column:</strong> ${timeKey}<br>` +
    `<strong>x-axis:</strong> ${xKey}<br>` +
    `<strong>y-axis:</strong> ${yKey}<br>` +
    `<strong>Hue:</strong> ${hueKey}<br>` +
    `<strong>Lightness:</strong> ${lightnessKey}`;
}

function addDeltaInfo(data) {
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      data[i].deltaHue = 0;
      data[i].deltaLightness = 0;
    } else {
      data[i].deltaHue = data[i][hueKey] - data[i - 1][hueKey];
      data[i].deltaLightness = data[i][lightnessKey] - data[i - 1][lightnessKey];
    }

    data[i].hueChange = classifyDelta(data[i].deltaHue);
    data[i].lightnessChange = classifyDelta(data[i].deltaLightness);
    data[i].pointColor = getBivariateColor(data[i].hueChange, data[i].lightnessChange);
  }
}

function classifyDelta(delta) {
  if (delta > 0) return "increase";
  if (delta < 0) return "decrease";
  return "same";
}

function getBivariateColor(hueChange, lightnessChange) {
  return bivariatePalette[lightnessChange][hueChange];
}

function renderLegend() {
  const legend = document.getElementById("legend");

  legend.innerHTML = `
    <div class="legend-title">Bivariate Color Legend</div>
    <div class="legend-wrapper">
      <div class="legend-top-labels">
        <div></div>
        <div>↓ ${hueKey}</div>
        <div>= ${hueKey}</div>
        <div>↑ ${hueKey}</div>
      </div>

      <div class="legend-grid-row">
        <div>↑ ${lightnessKey}</div>
        <div class="legend-cell" style="background:${bivariatePalette.increase.decrease};"></div>
        <div class="legend-cell" style="background:${bivariatePalette.increase.same};"></div>
        <div class="legend-cell" style="background:${bivariatePalette.increase.increase};"></div>
      </div>

      <div class="legend-grid-row">
        <div>= ${lightnessKey}</div>
        <div class="legend-cell" style="background:${bivariatePalette.same.decrease};"></div>
        <div class="legend-cell" style="background:${bivariatePalette.same.same};"></div>
        <div class="legend-cell" style="background:${bivariatePalette.same.increase};"></div>
      </div>

      <div class="legend-grid-row">
        <div>↓ ${lightnessKey}</div>
        <div class="legend-cell" style="background:${bivariatePalette.decrease.decrease};"></div>
        <div class="legend-cell" style="background:${bivariatePalette.decrease.same};"></div>
        <div class="legend-cell" style="background:${bivariatePalette.decrease.increase};"></div>
      </div>
    </div>

    <div class="legend-axis-note">
      Horizontal shows change in ${hueKey}. Vertical shows change in ${lightnessKey}.
    </div>
  `;
}

function drawChart() {
  d3.select("#chart").selectAll("*").remove();

  if (fullData.length === 0) return;

  const highlightedData = fullData.filter(
    d => d[timeKey] >= startYear && d[timeKey] <= endYear
  );

  const tooltip = d3.select("#tooltip");

  const width = 928;
  const height = 720;
  const marginTop = 20;
  const marginRight = 30;
  const marginBottom = 30;
  const marginLeft = 55;
  const animationDuration = 5000;

  const x = d3.scaleLinear()
    .domain(d3.extent(fullData, d => d[xKey]))
    .nice()
    .range([marginLeft, width - marginRight]);

  const y = d3.scaleLinear()
    .domain(d3.extent(fullData, d => d[yKey]))
    .nice()
    .range([height - marginBottom, marginTop]);

  const line = d3.line()
    .curve(d3.curveCatmullRom)
    .x(d => x(d[xKey]))
    .y(d => y(d[yKey]));

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("max-width", "100%")
    .style("height", "auto")
    .style("border", "1px solid black");

  svg.append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x).ticks(width / 80))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line")
      .clone()
      .attr("y2", -height)
      .attr("stroke-opacity", 0.1))
    .call(g => g.append("text")
      .attr("x", width - 4)
      .attr("y", -4)
      .attr("fill", "currentColor")
      .attr("font-weight", "bold")
      .attr("text-anchor", "end")
      .text(xKey));

  svg.append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line")
      .clone()
      .attr("x2", width)
      .attr("stroke-opacity", 0.1))
    .call(g => g.select(".tick:last-of-type text")
      .clone()
      .attr("x", 4)
      .attr("text-anchor", "start")
      .attr("font-weight", "bold")
      .text(yKey));

  const chartGroup = svg.append("g");

  const fullPath = chartGroup.append("path")
    .datum(fullData)
    .attr("fill", "none")
    .attr("stroke", "#c7c7c7")
    .attr("stroke-width", 2.5)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("d", line);

  const totalLength = fullPath.node().getTotalLength();

  fullPath
    .attr("stroke-dasharray", `0,${totalLength}`)
    .transition()
    .duration(animationDuration)
    .ease(d3.easeLinear)
    .attr("stroke-dasharray", `${totalLength},${totalLength}`);

  if (highlightedData.length > 1) {
    chartGroup.append("path")
      .datum(highlightedData)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 4)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("d", line);
  }

  chartGroup.append("g")
    .selectAll("circle")
    .data(fullData)
    .join("circle")
    .attr("cx", d => x(d[xKey]))
    .attr("cy", d => y(d[yKey]))
    .attr("r", d => (d[timeKey] >= startYear && d[timeKey] <= endYear ? 6 : 4))
    .attr("fill", d => d.pointColor)
    .attr("stroke", "black")
    .attr("stroke-width", d => (d[timeKey] >= startYear && d[timeKey] <= endYear ? 1.8 : 1))
    .attr("opacity", d => (d[timeKey] >= startYear && d[timeKey] <= endYear ? 1 : 0.55))
    .on("mouseover", function (event, d) {
      let numericDetails = "";

      numericKeys.forEach(key => {
        numericDetails += `<strong>${key}:</strong> ${d[key]}<br>`;
      });

      tooltip
        .style("visibility", "visible")
        .html(
          `<strong>${timeKey}:</strong> ${d[timeKey]}<br>` +
          numericDetails +
          `<strong>Δ ${hueKey}:</strong> ${formatDelta(d.deltaHue)}<br>` +
          `<strong>Δ ${lightnessKey}:</strong> ${formatDelta(d.deltaLightness)}`
        );

      d3.select(this)
        .attr("stroke-width", 3)
        .attr("r", 7);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("top", (event.pageY + 10) + "px")
        .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", function (event, d) {
      tooltip.style("visibility", "hidden");

      d3.select(this)
        .attr("stroke-width", d[timeKey] >= startYear && d[timeKey] <= endYear ? 1.8 : 1)
        .attr("r", d[timeKey] >= startYear && d[timeKey] <= endYear ? 6 : 4);
    });

  chartGroup.append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .selectAll("text")
    .data(fullData)
    .join("text")
    .attr("transform", d => `translate(${x(d[xKey])},${y(d[yKey])})`)
    .attr("fill-opacity", d => (d[timeKey] >= startYear && d[timeKey] <= endYear ? 1 : 0.35))
    .text(d => d[timeKey])
    .attr("stroke", "white")
    .attr("paint-order", "stroke")
    .attr("fill", "currentColor")
    .attr("dx", 6)
    .attr("dy", -6);

  const zoom = d3.zoom()
    .scaleExtent([0.5, 10])
    .on("zoom", function (event) {
      chartGroup.attr("transform", event.transform);
    });

  svg.call(zoom);
}

function formatDelta(value) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

main();