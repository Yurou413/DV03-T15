(function () {
    const scriptUrl = document.currentScript && document.currentScript.src;
    const dataUrl = scriptUrl
        ? new URL("../Final%20Data/First Nation Hospitalised Injuries/Q3.csv", scriptUrl).href
        : null;
    const stylesheetUrl = scriptUrl
        ? new URL("./q3-age-butterfly.css", scriptUrl).href
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
                <section class="age-trend-chart" aria-label="Age group trend by Indigenous status">
                    <h3>Age-group trend by Indigenous status</h3>
                    <p class="age-trend-intro">Compare the selected age group's share of annual hospitalisations across calendar years.</p>
                    <div class="age-trend-controls">
                        <label class="control-label" for="age-trend-select">Age group:</label>
                        <select id="age-trend-select" class="select-input"></select>
                    </div>
                    <div class="age-trend-legend" aria-label="Indigenous status legend"></div>
                    <div class="age-trend-wrap">
                        <div class="age-trend-tooltip" role="status" aria-live="polite"></div>
                        <svg role="img" aria-label="Line chart comparing the selected age-group share over time by Indigenous status"></svg>
                    </div>
                    <p class="age-trend-note">Lines show age-group share, not raw counts. Hover over or focus a point to see its count and share.</p>
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
            svg.append("title").text(`Hospitalisations by age group in ${year}`);
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
        renderAgeGroupTrend(chart, rows);
    }

    function renderAgeGroupTrend(container, rows) {
        const chart = container.querySelector(".age-trend-chart");
        const ageSelect = chart.querySelector("#age-trend-select");
        const legend = chart.querySelector(".age-trend-legend");
        const chartWrap = chart.querySelector(".age-trend-wrap");
        const tooltip = chart.querySelector(".age-trend-tooltip");
        const svg = d3.select(chart.querySelector(".age-trend-wrap svg"));
        const number = d3.format(",");
        const percent = d3.format(".1f");
        const years = [...new Set(rows.map(row => row.year))].sort((a, b) => a - b);

        ageGroups.forEach(ageGroup => ageSelect.add(new Option(ageGroup, ageGroup)));
        ageSelect.value = "17-25";
        statuses.forEach(status => {
            const item = document.createElement("span");
            item.className = "age-trend-legend-item";
            item.innerHTML = `<span class="age-trend-swatch" style="background:${status.color}"></span><span>${status.label}</span>`;
            legend.appendChild(item);
        });

        function draw() {
            const width = Math.floor(chartWrap.getBoundingClientRect().width);
            if (!width) return;

            const ageGroup = ageSelect.value;
            const data = rows.map(row => ({
                ...row,
                share: row.values[ageGroup] / row.total * 100
            }));
            const height = width < 480 ? 320 : 360;
            const margin = { top: 18, right: 18, bottom: 52, left: width < 380 ? 54 : 62 };
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;
            const maxShare = d3.max(data, row => row.share);
            const x = d3.scaleLinear()
                .domain([years[0] - 0.25, years[years.length - 1] + 0.25])
                .range([0, innerWidth]);
            const y = d3.scaleLinear()
                .domain([0, maxShare * 1.1])
                .nice()
                .range([innerHeight, 0]);
            const tickYears = width < 520
                ? years.filter((year, index) => index % 2 === 0 || index === years.length - 1)
                : years;
            const plot = svg.selectAll("g.age-trend-plot")
                .data([null])
                .join("g")
                .attr("class", "age-trend-plot")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            svg.attr("viewBox", `0 0 ${width} ${height}`).attr("height", height);
            svg.selectAll("title, desc, .age-trend-axis-title").remove();
            svg.append("title").text(`Age ${ageGroup} hospitalisation share by Indigenous status`);
            svg.append("desc").text(`Line chart showing the annual share of hospitalisations in age group ${ageGroup} for First Nations and non-Indigenous people.`);

            plot.selectAll("*").remove();
            plot.append("g")
                .attr("class", "age-trend-grid")
                .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));
            plot.append("g")
                .attr("class", "age-trend-axis")
                .attr("transform", `translate(0,${innerHeight})`)
                .call(
                    d3.axisBottom(x)
                        .tickValues(tickYears)
                        .tickFormat(d3.format("d"))
                        .tickSizeOuter(0)
                );
            plot.append("g")
                .attr("class", "age-trend-axis")
                .call(d3.axisLeft(y).ticks(5).tickFormat(value => `${d3.format(".0f")(value)}%`).tickSizeOuter(0));
            svg.append("text")
                .attr("class", "age-trend-axis-title")
                .attr("text-anchor", "middle")
                .attr("x", margin.left + innerWidth / 2)
                .attr("y", height - 8)
                .text("Calendar year");
            svg.append("text")
                .attr("class", "age-trend-axis-title")
                .attr("text-anchor", "middle")
                .attr("transform", `translate(15,${margin.top + innerHeight / 2}) rotate(-90)`)
                .text("Share of annual hospitalisations");

            const line = d3.line()
                .x(row => x(row.year))
                .y(row => y(row.share));

            statuses.forEach(status => {
                const statusRows = data
                    .filter(row => row.status === status.key)
                    .sort((a, b) => a.year - b.year);

                plot.append("path")
                    .datum(statusRows)
                    .attr("class", "age-trend-line")
                    .attr("stroke", status.color)
                    .attr("d", line);

                plot.selectAll(`.age-trend-point-${statuses.indexOf(status)}`)
                    .data(statusRows)
                    .join("circle")
                    .attr("class", `age-trend-point-${statuses.indexOf(status)}`)
                    .attr("cx", row => x(row.year))
                    .attr("cy", row => y(row.share))
                    .attr("r", 4)
                    .attr("fill", status.color)
                    .attr("tabindex", 0)
                    .attr("role", "img")
                    .attr("aria-label", row => `${status.label}, ${row.year}, age ${ageGroup}: ${number(row.values[ageGroup])} hospitalisations, ${percent(row.share)} percent`)
                    .on("pointerenter pointermove", function (event, row) {
                        showTooltip(event, row, status, this);
                    })
                    .on("pointerleave", hideTooltip)
                    .on("focus", function (event, row) {
                        showTooltip(null, row, status, this);
                    })
                    .on("blur", hideTooltip);
            });

            function showTooltip(event, row, status, point) {
                const wrapRect = chartWrap.getBoundingClientRect();
                const pointRect = point.getBoundingClientRect();
                const left = event
                    ? event.clientX - wrapRect.left
                    : pointRect.left + pointRect.width / 2 - wrapRect.left;
                const top = event
                    ? event.clientY - wrapRect.top
                    : pointRect.top - wrapRect.top;
                tooltip.textContent = `${row.year} · ${status.label} · Age ${ageGroup}\n${number(row.values[ageGroup])} hospitalisations (${percent(row.share)}%)`;
                tooltip.style.display = "block";
                tooltip.style.left = `${Math.max(110, Math.min(wrapRect.width - 110, left))}px`;
                tooltip.style.top = `${Math.max(8, top)}px`;
                tooltip.style.transform = "translate(-50%, -110%)";
            }

            function hideTooltip() {
                tooltip.style.display = "none";
            }
        }

        ageSelect.addEventListener("change", draw);
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
        stylesheet.onerror = () => showError(container, "Could not load q3-age-butterfly.css.");
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
