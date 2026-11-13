/**
 * Question 5: State & Territory Hospitalised Injury Trends & Changes (2011–2021)
 * COS30045 Data Visualisation - Group DV03-T15
 */
(() => {
  const scriptUrl = document.currentScript && document.currentScript.src;
  const annualPath = scriptUrl
    ? new URL("../Final%20Data/State%20and%20Territory%20Hospitalisation%20Injury%20Publication/state_territory_annual_injuries.csv", scriptUrl).href
    : "Final%20Data/State%20and%20Territory%20Hospitalisation%20Injury%20Publication/state_territory_annual_injuries.csv";
  const changePath = scriptUrl
    ? new URL("../Final%20Data/State%20and%20Territory%20Hospitalisation%20Injury%20Publication/state_territory_change_2011_2021.csv", scriptUrl).href
    : "Final%20Data/State%20and%20Territory%20Hospitalisation%20Injury%20Publication/state_territory_change_2011_2021.csv";
  const mapPath = scriptUrl
    ? new URL("../Data/australia-states-territories-2021.geojson", scriptUrl).href
    : "Data/australia-states-territories-2021.geojson";

  const nameMap = {
    ACT: "Australian Capital Territory",
    NSW: "New South Wales",
    NT: "Northern Territory",
    Qld: "Queensland",
    SA: "South Australia",
    Tas: "Tasmania",
    Vic: "Victoria",
    WA: "Western Australia"
  };

  const numberFormat = d3.format(",.0f");

  function init() {
    const trendContainer = document.getElementById("trend-chart");
    const changeContainer = document.getElementById("change-chart");
    const jurisdictionSelect = document.getElementById("jurisdiction-select");
    const mapContainer = document.getElementById("jurisdiction-map");

    if (!trendContainer || !changeContainer || !mapContainer || !jurisdictionSelect) {
      console.warn("Q5: Required chart containers or jurisdiction control were not found.");
      return;
    }

    Promise.all([
      d3.csv(annualPath),
      d3.csv(changePath),
      d3.json(mapPath)
    ])
      .then(([annualRows, changeRows, mapData]) => {
        const annual = annualRows.map(d => ({
          year: +d.Year,
          code: d.State,
          jurisdiction: nameMap[d.State] || d.State,
          count: +d["Sum(Injury_Count)"]
        }));

        const changes = changeRows.map(d => ({
          code: d.State,
          jurisdiction: nameMap[d.State] || d.State,
          startCount: +d["2011+Sum(Sum(Injury_Count))"],
          endCount: +d["2021+Sum(Sum(Injury_Count))"],
          change: +d.Change
        }));

        if (
          !annual.length ||
          annual.some(d => !Number.isFinite(d.count)) ||
          changes.some(d => !Number.isFinite(d.change))
        ) {
          throw new Error("The CSV data could not be read as numeric counts.");
        }

        drawTrend(annual);
        drawChanges(changes);
        drawMap(mapData, changes);

        jurisdictionSelect.addEventListener("change", () => drawTrend(annual));
      })
      .catch(error => {
        const message = document.getElementById("load-error");
        if (message) {
          message.hidden = false;
          message.textContent =
            "The Q5 data or Australia map could not be loaded. Check the CSV files and the Data/australia-states-territories-2021.geojson file. " +
            error.message;
        }
        console.error("Q5 Load Error:", error);
      });
  }

  function drawTrend(allRows) {
    const select = document.getElementById("jurisdiction-select");
    const names = [...new Set(allRows.map(d => d.jurisdiction))]
      .sort((a, b) => a.localeCompare(b));

    const current = select.value || "Queensland";
    select.innerHTML = "";

    names.forEach(name => {
      select.add(new Option(name, name));
    });

    select.value = names.includes(current) ? current : names[0];

    const rows = allRows
      .filter(d => d.jurisdiction === select.value)
      .sort((a, b) => a.year - b.year);

    const width = 940;
    const height = 390;
    const margin = { top: 24, right: 90, bottom: 58, left: 76 };

    const svg = d3
      .select("#trend-chart")
      .html("")
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr(
        "aria-label",
        `Annual hospitalised injury counts in ${select.value}, 2011 to 2021`
      );

    const x = d3
      .scaleLinear()
      .domain([2011, 2021])
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([0, 12000])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickSize(-(width - margin.left - margin.right))
          .tickFormat("")
      );

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .tickFormat(d3.format("d"))
          .ticks(6)
          .tickSizeOuter(0)
      );

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${margin.left},0)`)
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickFormat(numberFormat)
          .tickSizeOuter(0)
      );

    svg
      .append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr(
        "x",
        -(margin.top + (height - margin.bottom - margin.top) / 2)
      )
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .text("Hospitalised injury cases");

    svg
      .append("text")
      .attr("class", "axis-label")
      .attr("x", (margin.left + width - margin.right) / 2)
      .attr("y", height - 12)
      .attr("text-anchor", "middle")
      .text("Calendar year");

    const line = d3
      .line()
      .x(d => x(d.year))
      .y(d => y(d.count));

    svg
      .append("path")
      .datum(rows)
      .attr("class", "trend-line")
      .attr("d", line);

    const tooltip = document.getElementById("trend-tooltip");

    svg
      .selectAll(".data-point")
      .data(rows)
      .join("circle")
      .attr("class", "data-point")
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.count))
      .attr("r", 5)
      .attr("tabindex", 0)
      .on("mouseenter focus", (event, d) => {
        if (tooltip) {
          tooltip.textContent =
            `${d.jurisdiction} · ${d.year}: ` +
            `${numberFormat(d.count)} hospitalised injuries`;
          const point = event.type === "focus"
            ? event.currentTarget.getBoundingClientRect()
            : null;
          tooltip.style.left = `${point ? point.right + 8 : event.clientX + 12}px`;
          tooltip.style.top = `${point ? point.top : event.clientY + 12}px`;
          tooltip.classList.add("visible");
          tooltip.setAttribute("aria-hidden", "false");
        }
      })
      .on("mouseleave blur", () => {
        if (tooltip) {
          tooltip.textContent = "";
          tooltip.classList.remove("visible");
          tooltip.setAttribute("aria-hidden", "true");
        }
      });

    [rows[0], rows[rows.length - 1]].forEach((d, i) => {
      svg
        .append("text")
        .attr("class", "endpoint-label")
        .attr("x", x(d.year) + (i ? 9 : -9))
        .attr("y", y(d.count) - 10)
        .attr("text-anchor", i ? "start" : "end")
        .text(numberFormat(d.count));
    });
  }

  function drawChanges(rows) {
    rows.sort((a, b) => b.change - a.change);

    const width = 940;
    const rowHeight = 42;
    const height = 48 + rows.length * rowHeight + 44;
    const margin = { top: 20, right: 92, bottom: 58, left: 240 };

    const x = d3
      .scaleLinear()
      .domain([-2000, 4500])
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleBand()
      .domain(rows.map(d => d.jurisdiction))
      .range([margin.top, height - margin.bottom])
      .padding(0.25);

    const svg = d3
      .select("#change-chart")
      .html("")
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr(
        "aria-label",
        "Absolute change in hospitalised injury counts by state and territory, 2011 to 2021"
      );

    svg
      .append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues([-2000, 0, 2000, 4000])
          .tickSize(-(height - margin.top - margin.bottom))
          .tickFormat("")
      );

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues([-2000, 0, 2000, 4000])
          .tickFormat(d3.format(",d"))
          .tickSizeOuter(0)
      );

    svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${x(0)},0)`)
      .call(d3.axisLeft(y).tickSize(0))
      .call(g => g.select(".domain").remove());

    svg
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", x(0))
      .attr("x2", x(0))
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom);

    svg
      .selectAll(".bar")
      .data(rows)
      .join("rect")
      .attr("class", d => (d.change < 0 ? "bar negative" : "bar"))
      .attr("x", d => x(Math.min(0, d.change)))
      .attr("y", d => y(d.jurisdiction))
      .attr("width", d => Math.abs(x(d.change) - x(0)))
      .attr("height", y.bandwidth())
      .attr("rx", 4);

    svg
      .selectAll(".value-label")
      .data(rows)
      .join("text")
      .attr("class", "value-label")
      .attr("x", d => x(d.change) + (d.change < 0 ? -8 : 8))
      .attr("y", d => y(d.jurisdiction) + y.bandwidth() / 2 + 4)
      .attr("text-anchor", d => (d.change < 0 ? "end" : "start"))
      .text(
        d =>
          (d.change > 0 ? "+" : "−") +
          numberFormat(Math.abs(d.change))
      );

    svg
      .append("text")
      .attr("class", "axis-label")
      .attr("x", (margin.left + width - margin.right) / 2)
      .attr("y", height - 8)
      .attr("text-anchor", "middle")
      .text("Change in cases (2021 minus 2011)");
  }


  function drawMap(geojson, rows) {
    const container = d3.select("#jurisdiction-map").html("");
    const width = 940;
    const height = 680;
    const svg = container
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-label", "Map of Australia showing change in hospitalised injury cases by state and territory from 2011 to 2021");

    const byName = new Map(rows.map(d => [d.jurisdiction, d]));
    const projection = d3.geoIdentity().reflectY(true).fitExtent([[26, 18], [width - 26, height - 86]], geojson);
    const path = d3.geoPath(projection);
    const maxIncrease = d3.max(rows, d => Math.max(0, d.change)) || 1;
    const increaseColor = d3.scaleSequential(
      [0, maxIncrease],
      t => d3.interpolatePurples(0.3 + 0.7 * t)
    );
    const tooltip = document.getElementById("trend-tooltip");

    const features = svg.append("g").attr("class", "map-features");
    features.selectAll("path")
      .data(geojson.features)
      .join("path")
      .attr("class", "map-state")
      .attr("d", path)
      .attr("fill", feature => {
        const value = byName.get(feature.properties.state_name_2021);
        if (!value) return "#e5e7eb";
        return value.change < 0 ? "#ef4444" : increaseColor(value.change);
      })
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", feature => {
        const value = byName.get(feature.properties.state_name_2021);
        return value
          ? `${value.jurisdiction}: ${numberFormat(value.startCount)} cases in 2011, ${numberFormat(value.endCount)} in 2021, change ${value.change > 0 ? "plus " : "minus "}${numberFormat(Math.abs(value.change))}`
          : feature.properties.state_name_2021;
      })
      .on("mouseenter focus", function(event, feature) {
        const value = byName.get(feature.properties.state_name_2021);
        if (!value || !tooltip) return;
        tooltip.textContent = `${value.jurisdiction} · 2011: ${numberFormat(value.startCount)} · 2021: ${numberFormat(value.endCount)} · Change: ${value.change > 0 ? "+" : "−"}${numberFormat(Math.abs(value.change))}`;
        const point = event.type === "focus" ? this.getBoundingClientRect() : null;
        tooltip.style.left = `${point ? point.right + 8 : event.clientX + 12}px`;
        tooltip.style.top = `${point ? point.top : event.clientY + 12}px`;
        tooltip.classList.add("visible");
        tooltip.setAttribute("aria-hidden", "false");
      })
      .on("mouseleave blur", () => {
        if (!tooltip) return;
        tooltip.textContent = "";
        tooltip.classList.remove("visible");
        tooltip.setAttribute("aria-hidden", "true");
      });

    // ACT is too small to distinguish at this scale, so add a Canberra locator.
    const act = byName.get("Australian Capital Territory");
    const canberra = projection([149.13, -35.28]);
    if (act && canberra) {
      svg.append("line")
        .attr("class", "map-act-leader")
        .attr("x1", canberra[0]).attr("y1", canberra[1])
        .attr("x2", canberra[0] - 22).attr("y2", canberra[1] - 18);
      svg.append("circle")
        .attr("class", "map-act-marker")
        .attr("cx", canberra[0]).attr("cy", canberra[1]).attr("r", 4)
        .attr("tabindex", 0)
        .attr("aria-label", `Canberra locator for Australian Capital Territory. Change: ${act.change > 0 ? "+" : "−"}${numberFormat(Math.abs(act.change))}`)
        .on("mouseenter focus", function(event) {
          if (!tooltip) return;
          tooltip.textContent = `Australian Capital Territory · 2011: ${numberFormat(act.startCount)} · 2021: ${numberFormat(act.endCount)} · Change: +${numberFormat(act.change)}`;
          const point = event.type === "focus" ? this.getBoundingClientRect() : null;
          tooltip.style.left = `${point ? point.right + 8 : event.clientX + 12}px`;
          tooltip.style.top = `${point ? point.top : event.clientY + 12}px`;
          tooltip.classList.add("visible");
          tooltip.setAttribute("aria-hidden", "false");
        })
        .on("mouseleave blur", () => {
          if (!tooltip) return;
          tooltip.textContent = "";
          tooltip.classList.remove("visible");
          tooltip.setAttribute("aria-hidden", "true");
        });
      svg.append("text")
        .attr("class", "map-act-label")
        .attr("x", canberra[0] - 26).attr("y", canberra[1] - 21)
        .attr("text-anchor", "end")
        .text("ACT / Canberra");
    }

    const legend = svg.append("g")
      .attr("class", "map-legend")
      .attr("transform", `translate(${width / 2 - 190},${height - 48})`);
    const stops = d3.range(0, 6).map(i => i / 5);
    legend.append("rect")
      .attr("x", 0).attr("y", 0).attr("width", 18).attr("height", 14)
      .attr("fill", "#ef4444");
    legend.append("text").attr("x", 24).attr("y", 12)
      .text(`Decrease (${numberFormat(d3.min(rows, d => d.change))})`);
    legend.selectAll(".increase-swatch")
      .data(stops)
      .join("rect")
      .attr("class", "increase-swatch")
      .attr("x", (d, i) => 145 + i * 24)
      .attr("y", 0)
      .attr("width", 25)
      .attr("height", 14)
      .attr("fill", d => increaseColor(d * maxIncrease));
    legend.append("text").attr("x", 145).attr("y", 28)
      .text(`Increase (0 to +${numberFormat(maxIncrease)} cases)`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

