(function () {
    const scriptUrl = document.currentScript && document.currentScript.src;
    const dataUrl = scriptUrl
        ? new URL("../Final%20Data/First Nation Hospitalised Injuries/Q4.csv", scriptUrl).href
        : null;
    const stylesheetUrl = scriptUrl
        ? new URL("./q4-region-donut.css", scriptUrl).href
        : null;
    const statuses = [
        { key: "First Nations people", label: "First Nations people" },
        { key: "Non-Indigenous", label: "Non-Indigenous" }
    ];
    const regions = [
        { key: "Major Cities", color: "#0f766e" },
        { key: "Regional", color: "#7c3aed" },
        { key: "Remote", color: "#f59e0b" }
    ];

    function showError(container, message) {
        container.innerHTML = "";
        const error = document.createElement("p");
        error.className = "q4-chart-error";
        error.setAttribute("role", "alert");
        error.textContent = message;
        container.appendChild(error);
    }

    function renderChart(container, yearSelect, rows) {
        const years = [...new Set(rows.map(row => row.year))].sort((a, b) => a - b);
        const yearRows = d3.group(rows, row => row.year);
        if (years.some(year => statuses.some(status =>
            !yearRows.get(year).some(row => row.status === status.key)
        ))) {
            throw new Error("The CSV must include both status groups for every year.");
        }

        yearSelect.innerHTML = "";
        years.forEach(year => yearSelect.add(new Option(year, year)));
        yearSelect.value = String(years[years.length - 1]);

        container.innerHTML = `
            <div class="q4-region-chart">
                <p class="q4-chart-intro">Regional distribution of hospitalised injuries by Indigenous status for the selected year.</p>
                <div class="q4-region-legend" aria-label="Region legend"></div>
                <div class="q4-donut-grid"></div>
                <p class="q4-chart-note">Each donut shows the share of that status group's annual total. Hover over or focus a segment for its count and share.</p>
            </div>`;

        const chart = container.querySelector(".q4-region-chart");
        const legend = chart.querySelector(".q4-region-legend");
        const grid = chart.querySelector(".q4-donut-grid");
        const number = d3.format(",");
        const percent = d3.format(".1f");
        const pie = d3.pie().sort(null).value(item => item.count);
        const arc = d3.arc().innerRadius(68).outerRadius(108);

        regions.forEach(region => {
            const item = document.createElement("span");
            item.className = "q4-region-legend-item";
            item.innerHTML = `<span class="q4-region-swatch" style="background:${region.color}"></span><span>${region.key}</span>`;
            legend.appendChild(item);
        });

        const cards = statuses.map(status => {
            const card = document.createElement("article");
            card.className = "q4-donut-card";
            card.innerHTML = `
                <h3>${status.label}</h3>
                <div class="q4-donut-wrap">
                    <div class="q4-donut-tooltip" role="status" aria-live="polite"></div>
                    <svg class="q4-donut-svg" role="img"></svg>
                </div>`;
            grid.appendChild(card);
            return { status, card };
        });

        function draw() {
            const year = Number(yearSelect.value);
            cards.forEach(({ status, card }) => {
                const row = yearRows.get(year).find(item => item.status === status.key);
                const data = regions.map(region => ({
                    ...region,
                    count: row.values[region.key],
                    share: row.values[region.key] / row.total * 100
                }));
                const wrap = card.querySelector(".q4-donut-wrap");
                const tooltip = card.querySelector(".q4-donut-tooltip");
                const svg = d3.select(card.querySelector("svg"));
                const centerX = 160;
                const centerY = 130;

                svg.attr("viewBox", "0 0 320 270")
                    .attr("aria-label", `${status.label} regional hospitalised injury distribution in ${year}`);
                svg.selectAll("title, desc").remove();
                svg.append("title").text(`${status.label}, ${year}`);
                svg.append("desc").text(data.map(item => `${item.key}: ${number(item.count)} (${percent(item.share)}%)`).join(". "));

                const group = svg.selectAll("g.q4-donut-slices")
                    .data([null])
                    .join("g")
                    .attr("class", "q4-donut-slices")
                    .attr("transform", `translate(${centerX},${centerY})`);

                group.selectAll("path")
                    .data(pie(data), item => item.data.key)
                    .join("path")
                    .attr("class", "q4-donut-slice")
                    .attr("d", arc)
                    .attr("fill", item => item.data.color)
                    .attr("tabindex", 0)
                    .attr("role", "img")
                    .attr("aria-label", item => `${status.label}, ${year}, ${item.data.key}: ${number(item.data.count)} hospitalisations, ${percent(item.data.share)} percent`)
                    .on("pointerenter pointermove", function (event, item) {
                        showTooltip(event, item, this);
                    })
                    .on("pointerleave", hideTooltip)
                    .on("focus", function (event, item) {
                        showTooltip(null, item, this);
                    })
                    .on("blur", hideTooltip);

                group.selectAll(".q4-donut-total")
                    .data([row.total])
                    .join("text")
                    .attr("class", "q4-donut-total")
                    .attr("text-anchor", "middle")
                    .attr("y", -2)
                    .text(number);
                group.selectAll(".q4-donut-total-label")
                    .data(["total"])
                    .join("text")
                    .attr("class", "q4-donut-total-label")
                    .attr("text-anchor", "middle")
                    .attr("y", 17)
                    .text("injuries");

                function showTooltip(event, item, slice) {
                    const wrapRect = wrap.getBoundingClientRect();
                    const sliceRect = slice.getBoundingClientRect();
                    const left = event
                        ? event.clientX - wrapRect.left
                        : sliceRect.left + sliceRect.width / 2 - wrapRect.left;
                    const top = event
                        ? event.clientY - wrapRect.top
                        : sliceRect.top - wrapRect.top;
                    tooltip.textContent = `${year} · ${status.label}\n${item.data.key}: ${number(item.data.count)} (${percent(item.data.share)}%)`;
                    tooltip.style.display = "block";
                    tooltip.style.left = `${Math.max(110, Math.min(wrapRect.width - 110, left))}px`;
                    tooltip.style.top = `${Math.max(8, top)}px`;
                    tooltip.style.transform = "translate(-50%, -110%)";
                }

                function hideTooltip() {
                    tooltip.style.display = "none";
                }
            });
        }

        yearSelect.addEventListener("change", draw);
        draw();
    }

    function init() {
        const container = document.querySelector("#q4-chart");
        const yearSelect = document.querySelector("#q4-year");
        if (!container || !yearSelect) {
            console.error("Q4 region donut chart: expected #q4-chart and #q4-year elements.");
            return;
        }
        if (!window.d3) {
            showError(container, "This chart needs D3.js v7 loaded before Q4.js.");
            return;
        }
        if (!dataUrl || !stylesheetUrl) {
            showError(container, "Unable to locate the Q4 data or chart stylesheet.");
            return;
        }

        const stylesheet = document.createElement("link");
        stylesheet.rel = "stylesheet";
        stylesheet.href = stylesheetUrl;
        stylesheet.onerror = () => showError(container, "Could not load q4-region-donut.css.");
        document.head.appendChild(stylesheet);

        d3.csv(dataUrl, row => {
            const values = {};
            regions.forEach(region => {
                values[region.key] = row[region.key] === "" ? 0 : Number(row[region.key]);
            });
            return {
                status: row["First Nations status"],
                year: Number(row["Calendar year"]),
                total: Number(row.Total),
                values
            };
        }).then(rows => {
            if (!rows.length || rows.some(row =>
                !statuses.some(status => status.key === row.status) ||
                !Number.isInteger(row.year) ||
                !Number.isFinite(row.total) ||
                row.total <= 0 ||
                regions.some(region => !Number.isFinite(row.values[region.key]) || row.values[region.key] < 0)
            )) {
                throw new Error("The CSV is missing valid years, totals, or regional counts.");
            }
            renderChart(container, yearSelect, rows);
        }).catch(error => {
            console.error("Q4 region donut chart failed to load:", error);
            showError(container, `Could not load the Q4 data: ${error.message}`);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
