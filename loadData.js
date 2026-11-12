/**
 * COS30045 Data Visualisation - Starter Script
 * Group: DV03-T15
 * 
 * This file is prepared to load and parse your datasets using D3.js v7,
 * handle filter interactions, and render your visualisations.
 */

// -----------------------------------------------------------------------------
// 1. Global State / Filter Configuration
// -----------------------------------------------------------------------------
const state = {
    selectedYear: 'all',
    selectedMetric: 'hospitalisations', // 'hospitalisations' | 'bed_days'
    selectedCause: 'all',
    selectedState: 'all',
    rawAnnualTrend: [],
    // Add additional datasets here as you finish cleaning them:
    // rawDemographics: [],
    // rawCauses: []
};

// -----------------------------------------------------------------------------
// 2. DOM Elements & Event Listeners
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initUIControls();
    
    // Uncomment once you're ready to load your cleaned CSV data:
    // loadDatasets();
});

/**
 * Sets up event listeners for filters and metric buttons
 */
function initUIControls() {
    // Year filter dropdown
    const yearSelect = document.getElementById('filter-year');
    if (yearSelect) {
        yearSelect.addEventListener('change', (e) => {
            state.selectedYear = e.target.value;
            console.log('Selected Year:', state.selectedYear);
            updateDashboard();
        });
    }

    // Metric toggle buttons (Hospitalisations vs Bed Days)
    const metricButtons = document.querySelectorAll('.btn-toggle[data-metric]');
    metricButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            metricButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedMetric = btn.getAttribute('data-metric');
            console.log('Active Metric:', state.selectedMetric);
            updateDashboard();
        });
    });

    // Cause filter dropdown
    const causeSelect = document.getElementById('filter-cause');
    if (causeSelect) {
        causeSelect.addEventListener('change', (e) => {
            state.selectedCause = e.target.value;
            console.log('Selected Cause:', state.selectedCause);
            updateDashboard();
        });
    }

    // State/Territory filter dropdown
    const stateSelect = document.getElementById('filter-state');
    if (stateSelect) {
        stateSelect.addEventListener('change', (e) => {
            state.selectedState = e.target.value;
            console.log('Selected State:', state.selectedState);
            updateDashboard();
        });
    }

    // Reset filters button
    const resetBtn = document.getElementById('btn-reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (yearSelect) yearSelect.value = 'all';
            if (causeSelect) causeSelect.value = 'all';
            if (stateSelect) stateSelect.value = 'all';
            
            metricButtons.forEach((b, idx) => {
                b.classList.toggle('active', idx === 0);
            });
            
            state.selectedYear = 'all';
            state.selectedMetric = 'hospitalisations';
            state.selectedCause = 'all';
            state.selectedState = 'all';

            console.log('Filters reset to default state');
            updateDashboard();
        });
    }
}

// -----------------------------------------------------------------------------
// 3. Data Loading (D3.js)
// -----------------------------------------------------------------------------
/**
 * Loads CSV files and converts numeric columns
 */
function loadDatasets() {
    const annualTrendPath = "Final Data/First Nation Hospitalised Injuries/Annual Trend.csv";

    d3.csv(annualTrendPath, d => ({
        year: +d["Calendar year"],
        hospitalisations: +d["Sum(Hospitalisations)"],
        bedDays: +d["Sum(Bed Days)"]
    })).then(data => {
        console.log("Annual Trend Data loaded successfully:", data);
        state.rawAnnualTrend = data;
        
        // Initial render of charts once data is available
        // renderAnnualTrendChart(data);
    }).catch(error => {
        console.error("Error loading CSV file:", error);
    });
}

// -----------------------------------------------------------------------------
// 4. Dashboard Update Handler
// -----------------------------------------------------------------------------
/**
 * Called whenever a filter or toggle changes to update all visualisations
 */
function updateDashboard() {
    // When your charts are ready, call your render/update functions here:
    // updateAnnualTrendChart();
    // updateCausesChart();
    // updateDemographicsChart();
    // updateGeographicChart();
}

