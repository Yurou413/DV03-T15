(function () {
    const scriptUrl = document.currentScript && document.currentScript.src;
    const dataUrl = scriptUrl
        ? new URL("../Final%20Data/First Nation Hospitalised Injuries/Q2.csv", scriptUrl).href
        : null;
    const stylesheetUrl = scriptUrl
        ? new URL("./road-user-grouped-bar.css", scriptUrl).href
        : null;
    const allCategoriesLabel = "All road users";
    const statuses = [
        { key: "First Nations people", label: "First Nations people", color: "#0f766e" },
        { key: "Non-Indigenous", label: "Non-Indigenous", color: "#7c3aed" }
    ];

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
                <p class="road-chart-intro">Annual hospitalised road-user counts by Indigenous status. Choose a road-user type to compare.</p>
                <div class="road-chart-controls">
                    <label class="control-label" for="road-category-select">Road-user type:</label>
                    <select id="road-category-select" class="select-input"></select>
                </div>
                <div class="road-chart-legend" aria-label="Chart legend"></div>
                <div class="road-chart-wrap">
                    <div class="road-chart-tooltip" role="status" aria-live="polite"></div>
                    <svg role="img" aria-label="Grouped bar chart comparing annual road-user hospitalisations by Indigenous status"></svg>
                </div>
                <p class="road-chart-note">Each year groups counts for First Nations and non-Indigenous people. Hover over or focus a bar for its count.</p>
            </div>`;

        const chart = container.querySelector(".road-user-chart");
        const categorySelect = chart.querySelector("#road-category-select");
        const legend = chart.querySelector(".road-chart-legend");
        const chartWrap = chart.querySelector(".road-chart-wrap");
        const tooltip = chart.querySelector(".road-chart-tooltip");
        const svg = d3.select(chart.querySelector("svg"));
        const number = d3.format(",");

        categorySelect.add(new Option(allCategoriesLabel, allCategoriesLabel));
        categories.forEach(category => categorySelect.add(new Option(category, category)));
        statuses.forEach(status => {
            const item = document.createElement("span");
            item.className = "road-chart-legend-item";
            item.innerHTML = `<span class="road-chart-swatch" style="background:${status.color}"></span><span>${status.label}</span>`;
            legend.appendChild(item);
        });

        function draw() {
            const width = Math.floor(chartWrap.getBoundingClientRect().width);
            if (!width) return;

            const height = width < 480 ? 360 : 410;
            const margin = { top: 18, right: 18, bottom: 58, left: width < 380 ? 58 : 70 };
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;
            const selectedCategory = categorySelect.value;
            const bars = years.flatMap(year => statuses.map(status => {
                const row = rowsByYear.get(year).find(item => item.status === status.key);
                return {
                    year,
                    status,
                    count: selectedCategory === allCategoriesLabel
                        ? row.total
                        : row.values[selectedCategory]
                };
            }));
            const maxCount = d3.max(bars, item => item.count) || 1;
            const x = d3.scaleBand()
                .domain(years)
                .range([0, innerWidth])
                .padding(0.2);
            const xStatus = d3.scaleBand()
                .domain(statuses.map(status => status.key))
                .range([0, x.bandwidth()])
                .padding(0.08);
            const y = d3.scaleLinear()
                .domain([0, maxCount])
                .nice()
                .range([innerHeight, 0]);
            const tickYears = width < 520
                ? years.filter((year, index) => index % 2 === 0 || index === years.length - 1)
                : years;
            const plot = svg.selectAll("g.road-chart-plot")
                .data([null])
                .join("g")
                .attr("class", "road-chart-plot")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            svg.attr("viewBox", `0 0 ${width} ${height}`).attr("height", height);
            svg.selectAll("title, desc").remove();
            svg.selectAll(".road-chart-axis-title").remove();
            svg.append("desc").text("Grouped vertical bars compare annual hospitalised injury counts for First Nations and non-Indigenous people.");

            plot.selectAll("*").remove();
            plot.append("g")
                .attr("class", "road-chart-grid")
                .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));
            plot.append("g")
                .attr("class", "road-chart-axis road-chart-x-axis")
                .attr("transform", `translate(0,${innerHeight})`)
                .call(
                    d3.axisBottom(x)
                        .tickValues(tickYears)
                        .tickFormat(d3.format("d"))
                        .tickSizeOuter(0)
                );
            plot.append("g")
                .attr("class", "road-chart-axis road-chart-y-axis")
                .call(d3.axisLeft(y).ticks(5).tickFormat(number).tickSizeOuter(0));
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

            plot.selectAll(".road-chart-bar")
                .data(bars)
                .join("rect")
                .attr("class", "road-chart-bar")
                .attr("x", item => x(item.year) + xStatus(item.status.key))
                .attr("y", item => y(item.count))
                .attr("width", xStatus.bandwidth())
                .attr("height", item => Math.max(0, innerHeight - y(item.count)))
                .attr("rx", 2)
                .attr("fill", item => item.status.color)
                .attr("tabindex", 0)
                .attr("role", "img")
                .attr("aria-label", item => `${item.year}, ${item.status.label}, ${selectedCategory}: ${number(item.count)} hospitalised injuries`)
                .on("pointerenter pointermove", function (event, item) {
                    showTooltip(event, item, this);
                })
                .on("pointerleave", hideTooltip)
                .on("focus", function (event, item) {
                    showTooltip(null, item, this);
                })
                .on("blur", hideTooltip);

            function showTooltip(event, item, bar) {
                const wrapRect = chartWrap.getBoundingClientRect();
                const barRect = bar.getBoundingClientRect();
                const left = event
                    ? event.clientX - wrapRect.left
                    : barRect.left + barRect.width / 2 - wrapRect.left;
                const top = event
                    ? event.clientY - wrapRect.top
                    : barRect.top - wrapRect.top;
                tooltip.textContent = `${item.year} · ${item.status.label} · ${selectedCategory}\n${number(item.count)} hospitalised injuries`;
                tooltip.style.display = "block";
                tooltip.style.left = `${Math.max(100, Math.min(wrapRect.width - 100, left))}px`;
                tooltip.style.top = `${Math.max(8, top)}px`;
                tooltip.style.transform = "translate(-50%, -110%)";
            }

            function hideTooltip() {
                tooltip.style.display = "none";
            }
        }

        categorySelect.addEventListener("change", draw);
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
            console.error("Road-user grouped bar chart: add an element with id=\"q2-chart\" before loading this script.");
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
        stylesheet.onerror = () => showError(container, "Could not load road-user-grouped-bar.css.");
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
            if (!rows.length || rows.some(row =>
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
            console.error("Road-user grouped bar chart failed to load:", error);
            showError(container, `Could not load the road-user data: ${error.message}`);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
