(function () {
    const scriptUrl = document.currentScript && document.currentScript.src;
    const dataUrl = scriptUrl
        ? new URL("../Final%20Data/First Nation Hospitalised Injuries/Q3.csv", scriptUrl).href
        : null;
    const stylesheetUrl = scriptUrl
        ? new URL("./q3-age-charts.css", scriptUrl).href
        : null;
    const ageGroups = ["0-7", "8-16", "17-25", "26-39", "40-64", "65+"];
    const statuses = [
        { key: "First Nations people", label: "First Nations people", color: "#0f766e" },
        { key: "Non-Indigenous", label: "Non-Indigenous", color: "#7c3aed" }
    ];

    function showError(container, message) {
        container.innerHTML = "";
        const error = document.createElement("p");
        error.className = "q3-chart-error";
        error.setAttribute("role", "alert");
        error.textContent = message;
        container.appendChild(error);
    }

    function renderChart(container, rows) {
        const years = [...new Set(rows.map(row => row.year))].sort((a, b) => a - b);
        const rowsByYear = d3.group(rows, row => row.year);
        const hasBothStatuses = years.every(year =>
            statuses.every(status => rowsByYear.get(year).some(row => row.status === status.key))
        );
        if (!hasBothStatuses) {
            throw new Error("The CSV must include both status groups for every year.");
        }

        container.innerHTML = `
            <div class="q3-chart">
                <section class="age-butterfly-chart" aria-label="Age-group hospitalisation counts by Indigenous status">
                    <h3>Hospitalisations by age group</h3>
                    <p class="age-butterfly-intro">Compare counts for First Nations people and non-Indigenous people in a selected calendar year.</p>
                    <div class="age-butterfly-controls">
                        <label class="control-label" for="age-butterfly-year">Calendar year:</label>
                        <select id="age-butterfly-year" class="select-input"></select>
                    </div>
                    <div class="age-butterfly-wrap">
                        <div class="age-butterfly-tooltip" role="status" aria-live="polite"></div>
                        <svg role="img" aria-label="Butterfly chart comparing hospitalisations by age group, with First Nations people on the left and non-Indigenous people on the right"></svg>
                    </div>
                    <p class="age-butterfly-note">Bars use the same count scale on both sides. Hover over or focus a bar for its count and share of that population's annual total.</p>
                </section>
                <section class="age-heatmap-chart" aria-label="Age-group hospitalisation heat maps by Indigenous status">
                    <h3>Age-group distribution by calendar year</h3>
                    <p class="age-heatmap-intro">Each cell shows an age group's share of its population's annual hospitalisations. Both heat maps use the same color scale.</p>
                    <div class="age-heatmap-legend" aria-label="Share of annual hospitalisations color scale">
                        <span class="age-heatmap-min"></span>
                        <span class="age-heatmap-gradient" aria-hidden="true"></span>
                        <span class="age-heatmap-max"></span>
                    </div>
                    <div class="age-heatmap-wrap">
                        <div class="age-heatmap-tooltip" role="status" aria-live="polite"></div>
                        <svg role="group" aria-label="Heat maps with age groups on the horizontal axis and calendar years on the vertical axis"></svg>
                    </div>
                    <p class="age-heatmap-note">Darker red indicates a larger share. Hover over or focus a cell to see the count and share.</p>
                </section>
            </div>`;

        const chart = container.querySelector(".q3-chart");
        const yearSelect = chart.querySelector("#age-butterfly-year");
        const chartWrap = chart.querySelector(".age-butterfly-wrap");
        const tooltip = chart.querySelector(".age-butterfly-tooltip");
        const svg = d3.select(chart.querySelector(".age-butterfly-wrap svg"));
        const number = d3.format(",");
        const percent = d3.format(".1f");
        const statusColors = d3.scaleOrdinal()
            .domain(statuses.map(status => status.key))
            .range(statuses.map(status => status.color));
        years.forEach(year => yearSelect.add(new Option(year, year)));
        yearSelect.value = years[years.length - 1];

        function draw() {
            const width = Math.floor(chartWrap.getBoundingClientRect().width);
            if (!width) return;

            const year = Number(yearSelect.value);
            const yearRows = rowsByYear.get(year);
            const height = width < 480 ? 410 : 460;
            const margin = { top: 58, right: 16, bottom: 42, left: 16 };
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;
            const centerX = innerWidth / 2;
            const centerGap = width < 480 ? 84 : 112;
            const halfWidth = Math.max(0, (innerWidth - centerGap) / 2);
            const leftEdge = centerX - centerGap / 2;
            const rightEdge = centerX + centerGap / 2;
            const maxCount = d3.max(yearRows, row => d3.max(ageGroups, ageGroup => row.values[ageGroup]));
            const countScale = d3.scaleLinear()
                .domain([0, maxCount])
                .nice()
                .range([0, halfWidth]);
            const tickValues = countScale.ticks(4);
            const rowHeight = innerHeight / ageGroups.length;
            const barHeight = Math.min(30, rowHeight * 0.58);
            const plot = svg.selectAll("g.age-butterfly-plot")
                .data([null])
                .join("g")
                .attr("class", "age-butterfly-plot")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            svg.attr("viewBox", `0 0 ${width} ${height}`).attr("height", height);
            svg.selectAll("title, desc").remove();
            svg.append("desc").text("Mirrored horizontal bars compare First Nations people on the left and non-Indigenous people on the right, with age groups centered.");
            plot.selectAll("*").remove();
            plot.append("text")
                .attr("class", "age-butterfly-status")
                .attr("x", leftEdge - halfWidth / 2)
                .attr("y", -30)
                .text(statuses[0].label);
            plot.append("text")
                .attr("class", "age-butterfly-status")
                .attr("x", rightEdge + halfWidth / 2)
                .attr("y", -30)
                .text(statuses[1].label);

            tickValues.forEach(value => {
                if (value === 0) return;
                const distance = countScale(value);
                [leftEdge - distance, rightEdge + distance].forEach(x => {
                    plot.append("line")
                        .attr("class", "age-butterfly-grid")
                        .attr("x1", x)
                        .attr("x2", x)
                        .attr("y1", 0)
                        .attr("y2", innerHeight);
                });
            });
            [leftEdge, rightEdge].forEach(x => plot.append("line")
                .attr("class", "age-butterfly-center")
                .attr("x1", x)
                .attr("x2", x)
                .attr("y1", 0)
                .attr("y2", innerHeight));

            ageGroups.forEach((ageGroup, index) => {
                const y = rowHeight * (index + 0.5);
                const firstNationsRow = yearRows.find(row => row.status === statuses[0].key);
                const nonIndigenousRow = yearRows.find(row => row.status === statuses[1].key);
                const bars = [
                    { row: firstNationsRow, status: statuses[0], x: leftEdge - countScale(firstNationsRow.values[ageGroup]), anchor: "end" },
                    { row: nonIndigenousRow, status: statuses[1], x: rightEdge, anchor: "start" }
                ];
                plot.append("text")
                    .attr("class", "age-butterfly-age")
                    .attr("x", centerX)
                    .attr("y", y)
                    .text(ageGroup);

                bars.forEach(item => {
                    const count = item.row.values[ageGroup];
                    const bar = plot.append("rect")
                        .attr("class", "age-butterfly-bar")
                        .attr("fill", statusColors(item.status.key))
                        .attr("x", item.x)
                        .attr("y", y - barHeight / 2)
                        .attr("width", countScale(count))
                        .attr("height", barHeight)
                        .attr("tabindex", 0)
                        .attr("role", "img")
                        .attr("aria-label", `${year}, ${item.status.label}, age ${ageGroup}: ${number(count)} hospitalisations, ${percent(count / item.row.total * 100)} percent`);
                    bar.on("pointerenter pointermove", function (event) {
                        showTooltip(event, item, ageGroup, this);
                    })
                        .on("pointerleave", hideTooltip)
                        .on("focus", function (event) {
                            showTooltip(null, item, ageGroup, this);
                        })
                        .on("blur", hideTooltip);

                    const labelX = item.anchor === "end"
                        ? item.x - 6
                        : item.x + countScale(count) + 6;
                    plot.append("text")
                        .attr("class", "age-butterfly-value")
                        .attr("x", labelX)
                        .attr("y", y + 4)
                        .attr("text-anchor", item.anchor)
                        .text(number(count));
                });
            });

            tickValues.forEach(value => {
                const distance = countScale(value);
                [[leftEdge - distance, "middle"], [rightEdge + distance, "middle"]].forEach(([x, anchor]) => {
                    plot.append("text")
                        .attr("class", "age-butterfly-tick")
                        .attr("x", x)
                        .attr("y", innerHeight + 22)
                        .attr("text-anchor", anchor)
                        .text(number(value));
                });
            });
            plot.append("text")
                .attr("class", "age-butterfly-axis-title")
                .attr("x", centerX)
                .attr("y", innerHeight + 40)
                .attr("text-anchor", "middle")
                .text("Hospitalisations");

            function showTooltip(event, item, ageGroup, bar) {
                const wrapRect = chartWrap.getBoundingClientRect();
                const barRect = bar.getBoundingClientRect();
                const left = event && event.clientX
                    ? event.clientX - wrapRect.left
                    : barRect.left + barRect.width / 2 - wrapRect.left;
                const top = event && event.clientY
                    ? event.clientY - wrapRect.top
                    : barRect.top - wrapRect.top;
                const count = item.row.values[ageGroup];
                tooltip.textContent = `${year} · ${item.status.label}\nAge ${ageGroup}: ${number(count)} hospitalisations (${percent(count / item.row.total * 100)}%)`;
                tooltip.style.display = "block";
                tooltip.style.left = `${Math.max(110, Math.min(wrapRect.width - 110, left))}px`;
                tooltip.style.top = `${Math.max(8, top)}px`;
                tooltip.style.transform = "translate(-50%, -110%)";
            }

            function hideTooltip() {
                tooltip.style.display = "none";
            }
        }

        yearSelect.addEventListener("change", draw);
        if (typeof ResizeObserver === "function") {
            new ResizeObserver(draw).observe(chartWrap);
        } else {
            window.addEventListener("resize", draw);
        }
        draw();
        renderAgeGroupHeatmap(chart, rows);
    }

    function renderAgeGroupHeatmap(container, rows) {
        const chart = container.querySelector(".age-heatmap-chart");
        const chartWrap = chart.querySelector(".age-heatmap-wrap");
        const tooltip = chart.querySelector(".age-heatmap-tooltip");
        const svg = d3.select(chart.querySelector(".age-heatmap-wrap svg"));
        const number = d3.format(",");
        const percent = d3.format(".1f");
        const years = [...new Set(rows.map(row => row.year))].sort((a, b) => a - b);
        const maxShare = d3.max(rows, row =>
            d3.max(ageGroups, ageGroup => row.values[ageGroup] / row.total * 100)
        );
        const color = d3.scaleQuantize()
            .domain([0, maxShare])
            .range(d3.schemeYlOrRd[7]);

        chart.querySelector(".age-heatmap-min").textContent = "0%";
        chart.querySelector(".age-heatmap-max").textContent = `${percent(maxShare)}%`;

        function draw() {
            const width = Math.floor(chartWrap.getBoundingClientRect().width);
            if (!width) return;

            const stacked = width < 640;
            const height = stacked ? 690 : 460;
            const margin = { top: 28, right: 12, bottom: 54, left: 54 };
            const panelGap = 30;
            const panelWidth = stacked
                ? width - margin.left - margin.right
                : (width - margin.left - margin.right - panelGap) / 2;
            const panelHeight = stacked
                ? (height - margin.top - margin.bottom - panelGap) / 2
                : height - margin.top - margin.bottom;
            const plotLeft = 60;
            const plotRight = 6;
            const plotTop = 24;
            const plotBottom = 44;
            const plotWidth = panelWidth - plotLeft - plotRight;
            const plotHeight = panelHeight - plotTop - plotBottom;

            svg.selectAll("*").remove();
            svg.attr("viewBox", `0 0 ${width} ${height}`).attr("height", height);
            svg.append("desc").text("Two heat maps compare the annual share of hospitalisations by age group for First Nations and non-Indigenous people. Both use the same color scale.");

            statuses.forEach((status, index) => {
                const panelX = stacked
                    ? margin.left
                    : margin.left + index * (panelWidth + panelGap);
                const panelY = stacked
                    ? margin.top + index * (panelHeight + panelGap)
                    : margin.top;
                const panel = svg.append("g")
                    .attr("class", "age-heatmap-panel")
                    .attr("transform", `translate(${panelX},${panelY})`);
                const x = d3.scaleBand()
                    .domain(ageGroups)
                    .range([0, plotWidth])
                    .paddingInner(0.06)
                    .paddingOuter(0.02);
                const y = d3.scaleBand()
                    .domain(years)
                    .range([0, plotHeight])
                    .paddingInner(0.08)
                    .paddingOuter(0.02);
                const statusRows = rows
                    .filter(row => row.status === status.key)
                    .sort((a, b) => a.year - b.year);
                const cells = statusRows.flatMap(row => ageGroups.map(ageGroup => ({
                    year: row.year,
                    ageGroup,
                    count: row.values[ageGroup],
                    share: row.values[ageGroup] / row.total * 100
                })));
                const plot = panel.append("g")
                    .attr("transform", `translate(${plotLeft},${plotTop})`);

                panel.append("text")
                    .attr("class", "age-heatmap-status")
                    .attr("x", panelWidth / 2)
                    .attr("y", 13)
                    .text(status.label);
                plot.selectAll(".age-heatmap-cell")
                    .data(cells)
                    .join("rect")
                    .attr("class", "age-heatmap-cell")
                    .attr("x", cell => x(cell.ageGroup))
                    .attr("y", cell => y(cell.year))
                    .attr("width", x.bandwidth())
                    .attr("height", y.bandwidth())
                    .attr("fill", cell => color(cell.share))
                    .attr("tabindex", 0)
                    .attr("role", "img")
                    .attr("aria-label", cell => `${status.label}, ${cell.year}, age ${cell.ageGroup}: ${number(cell.count)} hospitalisations, ${percent(cell.share)} percent of annual total`)
                    .on("pointerenter pointermove", function (event, cell) {
                        showTooltip(event, cell, status, this);
                    })
                    .on("pointerleave", hideTooltip)
                    .on("focus", function (event, cell) {
                        showTooltip(null, cell, status, this);
                    })
                    .on("blur", hideTooltip);

                plot.append("g")
                    .attr("class", "age-heatmap-axis")
                    .attr("transform", `translate(0,${plotHeight})`)
                    .call(d3.axisBottom(x).tickSizeOuter(0));
                plot.append("g")
                    .attr("class", "age-heatmap-axis")
                    .call(d3.axisLeft(y).tickFormat(d3.format("d")).tickSizeOuter(0));
                panel.append("text")
                    .attr("class", "age-heatmap-axis-title")
                    .attr("text-anchor", "middle")
                    .attr("x", plotLeft + plotWidth / 2)
                    .attr("y", plotTop + plotHeight + 37)
                    .text("Age group");
                panel.append("text")
                    .attr("class", "age-heatmap-axis-title")
                    .attr("text-anchor", "middle")
                    .attr("transform", `translate(12,${plotTop + plotHeight / 2}) rotate(-90)`)
                    .text("Calendar year");
            });

            function showTooltip(event, cell, status, target) {
                const wrapRect = chartWrap.getBoundingClientRect();
                const targetRect = target.getBoundingClientRect();
                const left = event
                    ? event.clientX - wrapRect.left
                    : targetRect.left + targetRect.width / 2 - wrapRect.left;
                const top = event
                    ? event.clientY - wrapRect.top
                    : targetRect.top - wrapRect.top;
                tooltip.textContent = `${cell.year} · ${status.label}\nAge ${cell.ageGroup}: ${number(cell.count)} hospitalisations (${percent(cell.share)}%)`;
                tooltip.style.display = "block";
                tooltip.style.left = `${Math.max(110, Math.min(wrapRect.width - 110, left))}px`;
                tooltip.style.top = `${Math.max(8, top)}px`;
                tooltip.style.transform = "translate(-50%, -110%)";
            }

            function hideTooltip() {
                tooltip.style.display = "none";
            }
        }

        if (typeof ResizeObserver === "function") {
            new ResizeObserver(draw).observe(chartWrap);
        } else {
            window.addEventListener("resize", draw);
        }
        draw();
    }

    function init() {
        const container = document.querySelector("#q3-chart");
        if (!container) {
            console.error("Question 3 chart: add an element with id=\"q3-chart\" before loading this script.");
            return;
        }
        if (!window.d3) {
            showError(container, "This chart needs D3.js v7 loaded before Q3.js.");
            return;
        }
        if (!dataUrl || !stylesheetUrl) {
            showError(container, "Unable to locate the age-group CSV or chart stylesheet.");
            return;
        }

        const stylesheet = document.createElement("link");
        stylesheet.rel = "stylesheet";
        stylesheet.href = stylesheetUrl;
        stylesheet.onerror = () => showError(container, "Could not load q3-age-charts.css.");
        document.head.appendChild(stylesheet);

        d3.csv(dataUrl, row => {
            const values = {};
            ageGroups.forEach(ageGroup => {
                values[ageGroup] = row[ageGroup] === "" ? 0 : Number(row[ageGroup]);
            });
            return {
                status: row["First Nations status"],
                year: Number(row["Calendar year"]),
                total: Number(row["Sum(Total)"]),
                values
            };
        }).then(rows => {
            if (!rows.length || rows.some(row =>
                !statuses.some(status => status.key === row.status) ||
                !Number.isInteger(row.year) ||
                !Number.isFinite(row.total) ||
                row.total <= 0 ||
                ageGroups.some(ageGroup => !Number.isFinite(row.values[ageGroup]) || row.values[ageGroup] < 0)
            )) {
                throw new Error("The CSV is missing valid years, totals, or age-group counts.");
            }
            renderChart(container, rows);
        }).catch(error => {
            console.error("Question 3 chart failed to load:", error);
            showError(container, `Could not load the age-group data: ${error.message}`);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
