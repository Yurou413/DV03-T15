(function () {
    const scriptUrl = document.currentScript && document.currentScript.src;
    const dataUrl = scriptUrl
        ? new URL("../Final%20Data/First Nation Hospitalised Injuries/Q2.csv", scriptUrl).href
        : null;
    const stylesheetUrl = scriptUrl
        ? new URL("./road-user-trends.css", scriptUrl).href
        : null;
    const statuses = [
        { key: "First Nations people", label: "First Nations people" },
        { key: "Non-Indigenous", label: "Non-Indigenous" }
    ];
    const remainingColor = "#94a3b8";

    function showError(container, message) {
        container.innerHTML = "";
        const error = document.createElement("p");
        error.className = "road-chart-error";
        error.setAttribute("role", "alert");
        error.textContent = message;
        container.appendChild(error);
    }

    function renderChart(container, rows, categories) {
        const years = [...new Set(rows.map(row => row.year))].sort((a, b) => a - b);
        const rowsByYear = d3.group(rows, row => row.year);
        const allYearStatusPairsPresent = years.every(year =>
            statuses.every(status => rowsByYear.get(year).some(row => row.status === status.key))
        );
        if (!allYearStatusPairsPresent) {
            throw new Error("The CSV must include both Indigenous status groups for every year.");
        }

        container.innerHTML = `
            <div class="road-user-chart">
                <p class="road-chart-intro">Annual hospitalised injury counts for each road-user category. The five largest categories use distinct colors; remaining categories are grey.</p>
                <div class="road-chart-controls">
                    <label class="control-label" for="road-status-select">Population group:</label>
                    <select id="road-status-select" class="select-input"></select>
                </div>
                <div class="road-chart-legend" aria-label="Road-user category legend"></div>
                <div class="road-chart-wrap">
                    <div class="road-chart-tooltip" role="status" aria-live="polite"></div>
                    <svg role="group" aria-label="Multi-line chart of annual road-user hospitalisations"></svg>
                </div>
                <p class="road-chart-note">The five categories with the highest combined count across the displayed years are highlighted for the selected group. Hover over or focus a point to see its count.</p>
            </div>`;

        const chart = container.querySelector(".road-user-chart");
        const statusSelect = chart.querySelector("#road-status-select");
        const legend = chart.querySelector(".road-chart-legend");
        const chartWrap = chart.querySelector(".road-chart-wrap");
        const tooltip = chart.querySelector(".road-chart-tooltip");
        const svg = d3.select(chart.querySelector("svg"));
        const number = d3.format(",");
        const color = d3.scaleOrdinal(categories, d3.schemeTableau10);

        statuses.forEach(status => {
            statusSelect.add(new Option(status.label, status.key));
        });

        function draw() {
            const width = Math.floor(chartWrap.getBoundingClientRect().width);
            if (!width) return;

            const height = width < 480 ? 380 : 420;
            const margin = { top: 18, right: 18, bottom: 56, left: width < 380 ? 60 : 72 };
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;
            const status = statuses.find(item => item.key === statusSelect.value);
            const statusRows = rows
                .filter(row => row.status === status.key)
                .sort((a, b) => a.year - b.year);
            const rankedCategories = categories
                .map(category => ({
                    category,
                    total: d3.sum(statusRows, row => row.values[category])
                }))
                .sort((a, b) => b.total - a.total);
            const topCategories = new Set(rankedCategories.slice(0, 5).map(item => item.category));
            const series = categories.map(category => ({
                category,
                values: statusRows.map(row => ({
                    year: row.year,
                    count: row.values[category]
                })),
                color: topCategories.has(category) ? color(category) : remainingColor,
                isTop: topCategories.has(category)
            }));
            const displaySeries = [...series].sort((a, b) => Number(a.isTop) - Number(b.isTop));
            const values = displaySeries.flatMap(item => item.values);
            const maxCount = d3.max(values, item => item.count) || 1;
            const x = d3.scaleLinear()
                .domain(d3.extent(years))
                .range([0, innerWidth]);
            const y = d3.scaleLinear()
                .domain([0, maxCount])
                .nice()
                .range([innerHeight, 0]);
            const tickYears = width < 520
                ? years.filter((year, index) => index % 2 === 0 || index === years.length - 1)
                : years;

            legend.innerHTML = "";
            rankedCategories.forEach(item => {
                const entry = document.createElement("span");
                entry.className = "road-chart-legend-item";
                const swatch = document.createElement("span");
                swatch.className = "road-chart-swatch";
                swatch.style.backgroundColor = topCategories.has(item.category) ? color(item.category) : remainingColor;
                const label = document.createElement("span");
                label.textContent = item.category;
                entry.append(swatch, label);
                legend.appendChild(entry);
            });

            svg.selectAll("*").remove();
            svg.attr("viewBox", `0 0 ${width} ${height}`).attr("height", height);
            svg.attr("aria-label", `Multi-line chart of annual road-user hospitalisations for ${status.label}`);
            svg.append("desc").text(`Each line shows annual counts for a road-user category for ${status.label}. The five highest-count categories are highlighted in color; remaining categories are grey.`);

            const plot = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
            plot.append("g")
                .attr("class", "road-chart-grid")
                .call(d3.axisLeft(y).ticks(4).tickSize(-innerWidth).tickFormat(""));
            plot.append("g")
                .attr("class", "road-chart-axis road-chart-x-axis")
                .attr("transform", `translate(0,${innerHeight})`)
                .call(d3.axisBottom(x).tickValues(tickYears).tickFormat(d3.format("d")).tickSizeOuter(0));
            plot.append("g")
                .attr("class", "road-chart-axis road-chart-y-axis")
                .call(d3.axisLeft(y).ticks(4).tickFormat(number).tickSizeOuter(0));
            svg.append("text")
                .attr("class", "road-chart-axis-title")
                .attr("text-anchor", "middle")
                .attr("x", margin.left + innerWidth / 2)
                .attr("y", height - 8)
                .text("Calendar year");
            svg.append("text")
                .attr("class", "road-chart-axis-title")
                .attr("text-anchor", "middle")
                .attr("transform", `translate(15,${margin.top + innerHeight / 2}) rotate(-90)`)
                .text("Hospitalised injuries");

            const line = d3.line()
                .x(item => x(item.year))
                .y(item => y(item.count));
            displaySeries.forEach(item => {
                const categoryIndex = categories.indexOf(item.category);
                plot.append("path")
                    .datum(item.values)
                    .attr("class", `road-chart-line ${item.isTop ? "top" : "other"}`)
                    .attr("stroke", item.color)
                    .attr("d", line);

                plot.selectAll(`.road-chart-point-${categoryIndex}`)
                    .data(item.values)
                    .join("circle")
                    .attr("class", `road-chart-point road-chart-point-${categoryIndex} ${item.isTop ? "top" : "other"}`)
                    .attr("cx", value => x(value.year))
                    .attr("cy", value => y(value.count))
                    .attr("r", item.isTop ? 3.5 : 2.5)
                    .attr("fill", item.color)
                    .attr("tabindex", 0)
                    .attr("role", "img")
                    .attr("aria-label", value => `${item.category}, ${value.year}, ${status.label}: ${number(value.count)} hospitalised injuries`)
                    .on("pointerenter pointermove", function (event, value) {
                        showTooltip(event, value, item, this, status);
                    })
                    .on("pointerleave", hideTooltip)
                    .on("focus", function (event, value) {
                        showTooltip(null, value, item, this, status);
                    })
                    .on("blur", hideTooltip);
            });

            function showTooltip(event, value, item, point, selectedStatus) {
                const wrapRect = chartWrap.getBoundingClientRect();
                const pointRect = point.getBoundingClientRect();
                const left = event
                    ? event.clientX - wrapRect.left
                    : pointRect.left + pointRect.width / 2 - wrapRect.left;
                const top = event
                    ? event.clientY - wrapRect.top
                    : pointRect.top - wrapRect.top;
                tooltip.textContent = `${value.year} · ${item.category} · ${selectedStatus.label}\n${number(value.count)} hospitalised injuries`;
                tooltip.style.display = "block";
                tooltip.style.left = `${Math.max(100, Math.min(wrapRect.width - 100, left))}px`;
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
    }

    function init() {
        const container = document.querySelector("#q2-chart");
        if (!container) {
            console.error("Road-user trend chart: add an element with id=\"q2-chart\" before loading Q2.js.");
            return;
        }
        if (!window.d3) {
            showError(container, "This chart needs D3.js v7 loaded before Q2.js.");
            return;
        }
        if (!dataUrl || !stylesheetUrl) {
            showError(container, "Unable to locate the road-user CSV or chart stylesheet.");
            return;
        }

        const stylesheet = document.createElement("link");
        stylesheet.rel = "stylesheet";
        stylesheet.href = stylesheetUrl;
        stylesheet.onerror = () => showError(container, "Could not load road-user-trends.css.");
        document.head.appendChild(stylesheet);

        d3.csv(dataUrl, row => {
            const values = {};
            Object.keys(row).forEach(key => {
                if (key !== "First Nations status" && key !== "Calendar year" && key !== "Total") {
                    values[key] = row[key] === "" ? 0 : Number(row[key]);
                }
            });
            return {
                status: row["First Nations status"],
                year: Number(row["Calendar year"]),
                total: Number(row.Total),
                values
            };
        }).then(rows => {
            const categories = rows.length
                ? Object.keys(rows[0].values)
                : [];
            if (!rows.length || !categories.length || rows.some(row =>
                !statuses.some(status => status.key === row.status) ||
                !Number.isInteger(row.year) ||
                !Number.isFinite(row.total) ||
                row.total < 0 ||
                categories.some(category => !Number.isFinite(row.values[category]) || row.values[category] < 0)
            )) {
                throw new Error("The CSV is missing valid years, totals, or road-user counts.");
            }
            renderChart(container, rows, categories);
        }).catch(error => {
            console.error("Road-user trend chart failed to load:", error);
            showError(container, `Could not load the road-user data: ${error.message}`);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
