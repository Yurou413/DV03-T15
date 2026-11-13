(function () {
    const scriptUrl = document.currentScript && document.currentScript.src;
    const dataUrl = scriptUrl
        ? new URL("../Final%20Data/First Nation Hospitalised Injuries/Q1.csv", scriptUrl).href
        : null;
    const stylesheetUrl = scriptUrl
        ? new URL("./indigenous-status-trends.css", scriptUrl).href
        : null;

    function showError(container, message) {
        container.innerHTML = "";
        const error = document.createElement("p");
        error.className = "trend-error";
        error.setAttribute("role", "alert");
        error.textContent = message;
        container.appendChild(error);
    }

    function renderChart(container, rows) {
        const colors = {
            firstNations: "#0f766e",
            nonIndigenous: "#7c3aed"
        };
        const series = [
            { key: "firstNations", name: "First Nations people", color: colors.firstNations },
            { key: "nonIndigenous", name: "Non-Indigenous", color: colors.nonIndigenous }
        ];
        const baseline = rows[0];
        const firstNationChange = (rows[rows.length - 1].firstNations / baseline.firstNations - 1) * 100;
        const nonIndigenousChange = (rows[rows.length - 1].nonIndigenous / baseline.nonIndigenous - 1) * 100;
        const firstNation2020 = rows.find(row => row.year === 2020);
        const firstNation2019 = rows.find(row => row.year === 2019);
        const nonIndigenous2020 = rows.find(row => row.year === 2020);
        const nonIndigenous2019 = rows.find(row => row.year === 2019);
        const firstNationAnnualChange = firstNation2019 && firstNation2020
            ? (firstNation2020.firstNations / firstNation2019.firstNations - 1) * 100
            : null;
        const nonIndigenousAnnualChange = nonIndigenous2019 && nonIndigenous2020
            ? (nonIndigenous2020.nonIndigenous / nonIndigenous2019.nonIndigenous - 1) * 100
            : null;
        const percent = d3.format("+.1f");
        const magnitude = d3.format(".1f");
        const number = d3.format(",");

        container.innerHTML = `
            <div class="indigenous-trend-chart">
                <h2>Identifying Important Changes Over Time</h2>
                <p class="trend-intro">Annual hospitalised injury counts indexed to 2011 (2011 = 0%).</p>
                <p class="trend-highlight"><strong>Notable change, 2019–2020:</strong>
                    First Nations hospitalisations ${firstNationAnnualChange === null ? "change unavailable" : `${firstNationAnnualChange < 0 ? "fell" : "rose"} ${magnitude(Math.abs(firstNationAnnualChange))}%`},
                    while non-Indigenous hospitalisations ${nonIndigenousAnnualChange === null ? "change unavailable" : `${nonIndigenousAnnualChange < 0 ? "fell" : "rose"} ${magnitude(Math.abs(nonIndigenousAnnualChange))}%`}.
                    From 2011 to ${rows[rows.length - 1].year}, counts ${firstNationChange < 0 ? "fell" : "rose"} ${magnitude(Math.abs(firstNationChange))}% for First Nations people and ${nonIndigenousChange < 0 ? "fell" : "rose"} ${magnitude(Math.abs(nonIndigenousChange))}% for non-Indigenous people.
                </p>
                <div class="trend-legend" aria-label="Chart legend"></div>
                <div class="trend-chart-wrap">
                    <div class="trend-tooltip" role="status" aria-live="polite"></div>
                    <svg role="group" aria-label="Line chart comparing changes in injury hospitalisations by Indigenous status"></svg>
                </div>
                <p class="trend-note">Hover over or focus a data point to see the annual count and change. Indexed percentages compare each year with 2011.</p>
            </div>`;

        const chart = container.querySelector(".indigenous-trend-chart");
        const legend = chart.querySelector(".trend-legend");
        series.forEach(item => {
            const entry = document.createElement("span");
            entry.className = "trend-legend-item";
            entry.innerHTML = `<span class="trend-swatch" style="background:${item.color}"></span><span>${item.name}</span>`;
            legend.appendChild(entry);
        });

        const chartWrap = chart.querySelector(".trend-chart-wrap");
        const tooltip = chart.querySelector(".trend-tooltip");
        const svg = d3.select(chart.querySelector("svg"));
        let resizeObserver;

        function draw() {
            const width = Math.floor(chartWrap.getBoundingClientRect().width);
            if (!width) return;

            const height = width < 480 ? 340 : 410;
            const margin = { top: 20, right: 18, bottom: 52, left: width < 380 ? 48 : 58 };
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;
            const minValue = d3.min(rows, row => d3.min(series, item => row[`${item.key}Change`]));
            const maxValue = d3.max(rows, row => d3.max(series, item => row[`${item.key}Change`]));
            const yDomain = [Math.min(-10, Math.floor(minValue / 10) * 10), Math.ceil(maxValue / 10) * 10];
            const x = d3.scaleLinear()
                .domain(d3.extent(rows, row => row.year))
                .range([0, innerWidth]);
            const y = d3.scaleLinear()
                .domain(yDomain)
                .nice()
                .range([innerHeight, 0]);
            const tickYears = width < 480
                ? rows.filter((row, index) => index % 2 === 0 || index === rows.length - 1).map(row => row.year)
                : rows.map(row => row.year);

            svg.selectAll("*").remove();
            svg.attr("viewBox", `0 0 ${width} ${height}`).attr("height", height);
            svg.append("desc").text("Two lines show percentage change from 2011 to 2021. Hover or focus points for exact counts and annual changes.");

            const plot = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
            plot.append("g")
                .attr("class", "trend-grid")
                .call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth).tickFormat(""));
            plot.append("g")
                .attr("class", "trend-axis")
                .attr("transform", `translate(0,${innerHeight})`)
                .call(d3.axisBottom(x).tickValues(tickYears).tickFormat(d3.format("d")).tickSizeOuter(0));
            plot.append("g")
                .attr("class", "trend-axis")
                .call(d3.axisLeft(y).ticks(6).tickFormat(value => `${value}%`).tickSizeOuter(0));
            svg.append("text")
                .attr("class", "trend-axis-title")
                .attr("text-anchor", "middle")
                .attr("x", margin.left + innerWidth / 2)
                .attr("y", height - 8)
                .text("Calendar year");
            svg.append("text")
                .attr("class", "trend-axis-title")
                .attr("text-anchor", "middle")
                .attr("transform", `translate(15,${margin.top + innerHeight / 2}) rotate(-90)`)
                .text("Change from 2011");

            series.forEach(item => {
                const line = d3.line()
                    .x(row => x(row.year))
                    .y(row => y(row[`${item.key}Change`]));
                plot.append("path")
                    .datum(rows)
                    .attr("fill", "none")
                    .attr("stroke", item.color)
                    .attr("stroke-width", 2.5)
                    .attr("stroke-linejoin", "round")
                    .attr("stroke-linecap", "round")
                    .attr("d", line);

                plot.selectAll(`.point-${item.key}`)
                    .data(rows)
                    .join("circle")
                    .attr("class", `point-${item.key}`)
                    .attr("cx", row => x(row.year))
                    .attr("cy", row => y(row[`${item.key}Change`]))
                    .attr("r", 4)
                    .attr("fill", item.color)
                    .attr("stroke", "var(--chart-surface, #fff)")
                    .attr("stroke-width", 1.5)
                    .attr("tabindex", 0)
                    .attr("role", "img")
                    .attr("aria-label", row => `${item.name}, ${row.year}: ${number(row[item.key])} hospitalisations, ${percent(row[`${item.key}Change`])}% from 2011`)
                    .on("pointerenter pointermove", function (event, row) {
                        showTooltip(event, row, item, this);
                    })
                    .on("pointerleave", hideTooltip)
                    .on("focus", function (event, row) {
                        showTooltip(null, row, item, this);
                    })
                    .on("blur", hideTooltip);
            });

            const annotationRow = rows.find(row => row.year === 2020);
            if (annotationRow) {
                const xPoint = x(annotationRow.year);
                const yPoint = y(annotationRow.firstNationsChange);
                const alignLeft = xPoint > innerWidth * 0.56;
                const labelX = xPoint + (alignLeft ? -10 : 10);
                const labelY = Math.max(16, yPoint - 18);
                const annualLabel = firstNationAnnualChange !== null && nonIndigenousAnnualChange !== null
                    ? `2020 YoY: ${percent(firstNationAnnualChange)}% / ${percent(nonIndigenousAnnualChange)}%`
                    : "2020 change";
                const annotation = plot.append("g").attr("class", "trend-annotation");

                annotation.append("circle")
                    .attr("cx", xPoint)
                    .attr("cy", yPoint)
                    .attr("r", 8)
                    .attr("class", "trend-annotation-ring");
                annotation.append("line")
                    .attr("x1", xPoint)
                    .attr("y1", yPoint - 8)
                    .attr("x2", labelX)
                    .attr("y2", labelY + 4)
                    .attr("class", "trend-annotation-leader");
                annotation.append("text")
                    .attr("x", labelX + (alignLeft ? -4 : 4))
                    .attr("y", labelY)
                    .attr("text-anchor", alignLeft ? "end" : "start")
                    .attr("class", "trend-annotation-label")
                    .text(annualLabel);
            }

            function showTooltip(event, row, item, point) {
                const previousRow = rows.find(candidate => candidate.year === row.year - 1);
                const annualChange = previousRow
                    ? (row[item.key] / previousRow[item.key] - 1) * 100
                    : null;
                const rowRect = chartWrap.getBoundingClientRect();
                const pointRect = point.getBoundingClientRect();
                const left = event
                    ? event.clientX - rowRect.left
                    : pointRect.left + pointRect.width / 2 - rowRect.left;
                const top = event
                    ? event.clientY - rowRect.top
                    : pointRect.top - rowRect.top;
                tooltip.innerHTML = `<strong style="color:${item.color}">${item.name} · ${row.year}</strong>
                    <div>Hospitalisations: ${number(row[item.key])}</div>
                    <div>Change from 2011: ${percent(row[`${item.key}Change`])}%</div>
                    <div>Year-over-year: ${annualChange === null ? "Baseline year" : `${percent(annualChange)}%`}</div>`;
                tooltip.style.display = "block";
                tooltip.style.left = `${Math.max(100, Math.min(rowRect.width - 100, left))}px`;
                tooltip.style.top = `${Math.max(8, top)}px`;
                tooltip.style.transform = "translate(-50%, -110%)";
            }

            function hideTooltip() {
                tooltip.style.display = "none";
            }
        }

        if (typeof ResizeObserver === "function") {
            resizeObserver = new ResizeObserver(draw);
            resizeObserver.observe(chartWrap);
        } else {
            window.addEventListener("resize", draw);
        }
        draw();
    }

    function init() {
        const container = document.querySelector("#q1-chart");
        if (!container) {
            console.error("Indigenous status trend chart: add an element with id=\"q1-chart\" before loading this script.");
            return;
        }

        if (!window.d3) {
            showError(container, "This chart needs D3.js v7 loaded before Q1.js.");
            return;
        }
        if (!dataUrl) {
            showError(container, "Unable to locate the Indigenous Status Comparison CSV. Load this script as a file.");
            return;
        }

        if (!stylesheetUrl) {
            showError(container, "Unable to locate indigenous-status-trends.css. Load this script as a file.");
            return;
        }

        const stylesheet = document.createElement("link");
        stylesheet.rel = "stylesheet";
        stylesheet.href = stylesheetUrl;
        stylesheet.dataset.indigenousStatusTrends = "true";
        stylesheet.onerror = () => {
            showError(container, "Could not load indigenous-status-trends.css. Keep it beside the chart script.");
        };
        document.head.appendChild(stylesheet);

        d3.csv(dataUrl, row => ({
            year: Number(row["Calendar year"]),
            firstNations: Number(row["First Nations people"]),
            nonIndigenous: Number(row["Non-Indigenous"])
        })).then(rows => {
            if (rows.length < 2 || rows.some(row =>
                !Number.isInteger(row.year) ||
                !Number.isFinite(row.firstNations) ||
                !Number.isFinite(row.nonIndigenous) ||
                row.firstNations <= 0 ||
                row.nonIndigenous <= 0
            )) {
                throw new Error("The CSV is missing valid years or group counts.");
            }
            rows.sort((a, b) => a.year - b.year);
            const baseline = rows[0];
            rows.forEach(row => {
                row.firstNationsChange = (row.firstNations / baseline.firstNations - 1) * 100;
                row.nonIndigenousChange = (row.nonIndigenous / baseline.nonIndigenous - 1) * 100;
            });
            renderChart(container, rows);
        }).catch(error => {
            console.error("Indigenous status trend chart failed to load:", error);
            showError(container, `Could not load the Indigenous Status Comparison data: ${error.message}`);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
