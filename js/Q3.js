(function () {
    const scriptUrl = document.currentScript && document.currentScript.src;
    const dataUrl = scriptUrl
        ? new URL("../Final%20Data/First Nation Hospitalised Injuries/Q3.csv", scriptUrl).href
        : null;
    const stylesheetUrl = scriptUrl
        ? new URL("./age-share-stacked-bar.css", scriptUrl).href
        : null;
    const ageGroups = ["0-7", "8-16", "17-25", "26-39", "40-64", "65+"];
    const colors = ["#0f766e", "#2563eb", "#7c3aed", "#d97706", "#db2777", "#475569"];
    const statuses = [
        { key: "First Nations people", label: "First Nations people", color: "#0f766e" },
        { key: "Non-Indigenous", label: "Non-Indigenous", color: "#7c3aed" }
    ];

    function showError(container, message) {
        container.innerHTML = "";
        const error = document.createElement("p");
        error.className = "age-share-error";
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
            <div class="age-share-chart">
                <h3>Isolating Proportional Share Shifts</h3>
                <p class="age-share-intro">Compare how hospitalised injuries are distributed across age groups over time.</p>
                <div class="age-share-controls">
                    <label class="control-label" for="age-share-status">Indigenous status:</label>
                    <select id="age-share-status" class="select-input">
                        <option value="First Nations people">First Nations people</option>
                        <option value="Non-Indigenous">Non-Indigenous</option>
                        <option value="both" selected>Both</option>
                    </select>
                </div>
                <div class="age-share-legend" aria-label="Age group legend"></div>
                <div class="age-share-wrap">
                    <div class="age-share-tooltip" role="status" aria-live="polite"></div>
                    <svg role="img" aria-label="100 percent stacked bar chart showing annual hospitalisation shares by age group"></svg>
                </div>
                <p class="age-share-note">Each bar totals 100% of hospitalisations for that status and year. In Both view, First Nations bars appear left of non-Indigenous bars. Hover over or focus a segment for its count and share.</p>
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

        const chart = container.querySelector(".age-share-chart");
        const statusSelect = chart.querySelector("#age-share-status");
        const legend = chart.querySelector(".age-share-legend");
        const chartWrap = chart.querySelector(".age-share-wrap");
        const tooltip = chart.querySelector(".age-share-tooltip");
        const svg = d3.select(chart.querySelector("svg"));
        const number = d3.format(",");
        const percent = d3.format(".1f");
        const color = d3.scaleOrdinal().domain(ageGroups).range(colors);

        ageGroups.forEach(ageGroup => {
            const item = document.createElement("span");
            item.className = "age-share-legend-item";
            item.innerHTML = `<span class="age-share-swatch" style="background:${color(ageGroup)}"></span><span>${ageGroup}</span>`;
            legend.appendChild(item);
        });

        function draw() {
            const width = Math.floor(chartWrap.getBoundingClientRect().width);
            if (!width) return;

            const selectedStatus = statusSelect.value;
            const activeStatuses = selectedStatus === "both"
                ? statuses
                : statuses.filter(status => status.key === selectedStatus);
            const height = width < 480 ? 390 : 440;
            const margin = {
                top: 20,
                right: 18,
                bottom: selectedStatus === "both" ? 70 : 56,
                left: width < 380 ? 54 : 64
            };
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;
            const activeRows = rows.filter(row =>
                activeStatuses.some(status => status.key === row.status)
            );
            const xYear = d3.scaleBand()
                .domain(years)
                .range([0, innerWidth])
                .padding(0.18);
            const xStatus = d3.scaleBand()
                .domain(activeStatuses.map(status => status.key))
                .range([0, xYear.bandwidth()])
                .padding(0.12);
            const y = d3.scaleLinear()
                .domain([0, 100])
                .range([innerHeight, 0]);
            const tickYears = width < 520
                ? years.filter((year, index) => index % 2 === 0 || index === years.length - 1)
                : years;
            const plot = svg.selectAll("g.age-share-plot")
                .data([null])
                .join("g")
                .attr("class", "age-share-plot")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            svg.attr("viewBox", `0 0 ${width} ${height}`).attr("height", height);
            svg.selectAll("title, desc, .age-share-axis-title").remove();
            svg.append("title").text("Annual hospitalisation shares by age group and Indigenous status");
            svg.append("desc").text("Each stacked bar represents 100 percent of one status group's annual hospitalisations. Select one or both status groups.");

            plot.selectAll("*").remove();
            plot.append("g")
                .attr("class", "age-share-grid")
                .call(d3.axisLeft(y).tickValues([0, 20, 40, 60, 80, 100]).tickSize(-innerWidth).tickFormat(""));
            plot.append("g")
                .attr("class", "age-share-axis")
                .attr("transform", `translate(0,${innerHeight})`)
                .call(
                    d3.axisBottom(xYear)
                        .tickValues(tickYears)
                        .tickFormat(d3.format("d"))
                        .tickSizeOuter(0)
                );
            plot.append("g")
                .attr("class", "age-share-axis")
                .call(
                    d3.axisLeft(y)
                        .tickValues([0, 20, 40, 60, 80, 100])
                        .tickFormat(value => `${value}%`)
                        .tickSizeOuter(0)
                );

            if (selectedStatus === "both") {
                const statusLabelYears = width < 520 ? tickYears : years;
                plot.selectAll(".age-share-status-label")
                    .data(statusLabelYears.flatMap(year => activeStatuses.map(status => ({ year, status }))))
                    .join("text")
                    .attr("class", "age-share-status-label")
                    .attr("x", item => xYear(item.year) + xStatus(item.status.key) + xStatus.bandwidth() / 2)
                    .attr("y", innerHeight + 29)
                    .attr("text-anchor", "middle")
                    .text(item => item.status.key === "First Nations people" ? "FN" : "NI");
            }

            svg.append("text")
                .attr("class", "age-share-axis-title")
                .attr("text-anchor", "middle")
                .attr("x", margin.left + innerWidth / 2)
                .attr("y", height - 8)
                .text("Calendar year");
            svg.append("text")
                .attr("class", "age-share-axis-title")
                .attr("text-anchor", "middle")
                .attr("transform", `translate(15,${margin.top + innerHeight / 2}) rotate(-90)`)
                .text("Share of hospitalised injuries");

            const stacked = d3.stack()
                .keys(ageGroups)
                .value((row, ageGroup) => row.values[ageGroup] / row.total * 100)(activeRows);

            plot.selectAll(".age-share-series")
                .data(stacked, series => series.key)
                .join("g")
                .attr("class", "age-share-series")
                .attr("fill", series => color(series.key))
                .each(function (series) {
                    d3.select(this)
                        .selectAll("rect")
                        .data(series.map(segment => ({ segment, ageGroup: series.key })))
                        .join("rect")
                        .attr("class", "age-share-segment")
                        .attr("x", item => xYear(item.segment.data.year) + xStatus(item.segment.data.status))
                        .attr("y", item => y(item.segment[1]))
                        .attr("width", xStatus.bandwidth())
                        .attr("height", item => Math.max(0, y(item.segment[0]) - y(item.segment[1])))
                        .attr("tabindex", 0)
                        .attr("role", "img")
                        .attr("aria-label", item => {
                            const row = item.segment.data;
                            const count = row.values[item.ageGroup];
                            return `${row.year}, ${row.status}, age ${item.ageGroup}: ${number(count)} hospitalisations, ${percent(count / row.total * 100)} percent`;
                        })
                        .on("pointerenter pointermove", function (event, item) {
                            showTooltip(event, item, this);
                        })
                        .on("pointerleave", hideTooltip)
                        .on("focus", function (event, item) {
                            showTooltip(null, item, this);
                        })
                        .on("blur", hideTooltip);
                });

            function showTooltip(event, item, segment) {
                const row = item.segment.data;
                const count = row.values[item.ageGroup];
                const wrapRect = chartWrap.getBoundingClientRect();
                const segmentRect = segment.getBoundingClientRect();
                const left = event
                    ? event.clientX - wrapRect.left
                    : segmentRect.left + segmentRect.width / 2 - wrapRect.left;
                const top = event
                    ? event.clientY - wrapRect.top
                    : segmentRect.top - wrapRect.top;
                tooltip.textContent = `${row.year} · ${row.status}\nAge ${item.ageGroup}: ${number(count)} hospitalisations (${percent(count / row.total * 100)}%)`;
                tooltip.style.display = "block";
                tooltip.style.left = `${Math.max(110, Math.min(wrapRect.width - 110, left))}px`;
                tooltip.style.top = `${Math.max(8, top)}px`;
                tooltip.style.transform = "translate(-50%, -110%)";
            }

            function hideTooltip() {
                tooltip.style.display = "none";
            }
        }

        statusSelect.addEventListener("change", draw);
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
        const svg = d3.select(chart.querySelector("svg"));
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
            console.error("Age-share stacked bar chart: add an element with id=\"q3-chart\" before loading this script.");
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
        stylesheet.onerror = () => showError(container, "Could not load age-share-stacked-bar.css.");
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
            console.error("Age-share stacked bar chart failed to load:", error);
            showError(container, `Could not load the age-group data: ${error.message}`);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
