let metricsData = null;
let chart = null;

document.getElementById('metricsFile').addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            showLoading();
            const json = JSON.parse(e.target.result);
            metricsData = json;
            renderUI();
            hideLoading();
        } catch (error) {
            showError('Failed to parse JSON file: ' + error.message);
            hideLoading();
        }
    };
    reader.readAsText(file);
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('content').style.display = 'none';
    document.getElementById('error').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = '❌ Error: ' + message;
    errorDiv.style.display = 'block';
    document.getElementById('content').style.display = 'none';
}

function renderUI() {
    if (!metricsData) return;

    // Extract metrics
    const methods = ['basic', 'structured', 'contextAware', 'baseline'];
    const methodNames = {
        basic: 'LLM (Basic Prompt)',
        structured: 'LLM (Structured Prompt)',
        contextAware: 'LLM (Context-Aware Prompt)',
        baseline: 'Baseline (Edit Distance)'
    };

    // Render metrics cards
    renderMetricsCards(methods, methodNames);

    // Render chart
    renderChart(methods, methodNames);

    // Render comparison tabs
    renderComparisonTabs(methods, methodNames);

    document.getElementById('content').style.display = 'block';
}

function renderMetricsCards(methods, methodNames) {
    const grid = document.getElementById('metricsGrid');
    grid.innerHTML = '';

    methods.forEach(method => {
        const metrics = metricsData.metrics?.[method] || metricsData[method];
        if (!metrics) return;

        const card = document.createElement('div');
        card.className = `metric-card ${method === 'baseline' ? 'baseline' : ''}`;
        
        const f1 = (metrics.f1 || 0).toFixed(3);
        const precision = (metrics.precision || 0).toFixed(3);
        const recall = (metrics.recall || 0).toFixed(3);
        const tp = metrics.tp || 0;
        const fp = metrics.fp || 0;
        const fn = metrics.fn || 0;

        card.innerHTML = `
            <h3>${methodNames[method]}</h3>
            <div class="value">${f1}</div>
            <div class="details">
                F1-Score<br>
                Precision: ${precision} | Recall: ${recall}<br>
                TP: ${tp} | FP: ${fp} | FN: ${fn}
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderChart(methods, methodNames) {
    const ctx = document.getElementById('metricsChart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }

    const labels = methods.map(m => methodNames[m]);
    const precisionData = methods.map(m => {
        const metrics = metricsData.metrics?.[m] || metricsData[m];
        return (metrics?.precision || 0) * 100;
    });
    const recallData = methods.map(m => {
        const metrics = metricsData.metrics?.[m] || metricsData[m];
        return (metrics?.recall || 0) * 100;
    });
    const f1Data = methods.map(m => {
        const metrics = metricsData.metrics?.[m] || metricsData[m];
        return (metrics?.f1 || 0) * 100;
    });

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Precision (%)',
                    data: precisionData,
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Recall (%)',
                    data: recallData,
                    backgroundColor: 'rgba(46, 204, 113, 0.7)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 2
                },
                {
                    label: 'F1-Score (%)',
                    data: f1Data,
                    backgroundColor: 'rgba(155, 89, 182, 0.7)',
                    borderColor: 'rgba(155, 89, 182, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Performance Metrics Comparison',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

function renderComparisonTabs(methods, methodNames) {
    const tabsContainer = document.getElementById('tabs');
    const contentContainer = document.getElementById('tabContent');
    
    tabsContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    methods.forEach((method, index) => {
        // Create tab button
        const tab = document.createElement('button');
        tab.className = `tab ${index === 0 ? 'active' : ''}`;
        tab.textContent = methodNames[method];
        tab.onclick = () => switchTab(index, methods, methodNames);
        tabsContainer.appendChild(tab);

        // Create tab content
        const content = document.createElement('div');
        content.className = `tab-content ${index === 0 ? 'active' : ''}`;
        content.id = `tab-${method}`;
        contentContainer.appendChild(content);
    });

    // Render content for each tab
    methods.forEach(method => {
        renderTabContent(method, methodNames[method]);
    });
}

function switchTab(index, methods, methodNames) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach((content, i) => {
        content.classList.toggle('active', i === index);
    });
}

function renderTabContent(method, methodName) {
    const content = document.getElementById(`tab-${method}`);
    const comparison = metricsData.comparisons?.[method];
    const metrics = metricsData.metrics?.[method] || metricsData[method];

    if (!comparison && !metrics) {
        content.innerHTML = '<p>No data available for this method.</p>';
        return;
    }

    let html = '';

    // Stats
    html += '<div class="stats-grid">';
    html += `<div class="stat-box">
        <h4>True Positives</h4>
        <div class="number" style="color: #27ae60;">${metrics?.tp || 0}</div>
        <small>Correct pairs found</small>
    </div>`;
    html += `<div class="stat-box">
        <h4>False Positives</h4>
        <div class="number" style="color: #e74c3c;">${metrics?.fp || 0}</div>
        <small>Incorrect pairs</small>
    </div>`;
    html += `<div class="stat-box">
        <h4>False Negatives</h4>
        <div class="number" style="color: #f39c12;">${metrics?.fn || 0}</div>
        <small>Missed pairs</small>
    </div>`;
    html += '</div>';

    // Search box
    html += '<input type="text" class="search-box" placeholder="🔍 Search attributes..." id="search-' + method + '" onkeyup="filterTable(\'' + method + '\', this.value)">';

    // Correct pairs
    if (comparison?.correctGroupings && comparison.correctGroupings.length > 0) {
        html += '<h3 style="margin-top: 30px; color: #27ae60;">✅ Correctly Identified Pairs</h3>';
        html += '<table class="comparison-table">';
        html += '<thead><tr><th>Attribute 1</th><th>Attribute 2</th><th>Status</th></tr></thead><tbody>';
        comparison.correctGroupings.forEach(pair => {
            html += `<tr class="pair-correct">
                <td>${pair[0]}</td>
                <td>${pair[1]}</td>
                <td>✅ Correct</td>
            </tr>`;
        });
        html += '</tbody></table>';
    }

    // Incorrect pairs
    if (comparison?.incorrectGroupings && comparison.incorrectGroupings.length > 0) {
        html += '<h3 style="margin-top: 30px; color: #e74c3c;">❌ Incorrectly Grouped Pairs</h3>';
        html += '<table class="comparison-table">';
        html += '<thead><tr><th>Attribute 1</th><th>Attribute 2</th><th>Status</th></tr></thead><tbody>';
        comparison.incorrectGroupings.forEach(pair => {
            html += `<tr class="pair-incorrect">
                <td>${pair[0]}</td>
                <td>${pair[1]}</td>
                <td>❌ Not equivalent</td>
            </tr>`;
        });
        html += '</tbody></table>';
    }

    // Missed pairs
    if (comparison?.missedGroupings && comparison.missedGroupings.length > 0) {
        html += '<h3 style="margin-top: 30px; color: #f39c12;">⚠️ Missed Pairs</h3>';
        html += '<table class="comparison-table">';
        html += '<thead><tr><th>Attribute 1</th><th>Attribute 2</th><th>Status</th></tr></thead><tbody>';
        comparison.missedGroupings.forEach(pair => {
            html += `<tr class="pair-missed">
                <td>${pair[0]}</td>
                <td>${pair[1]}</td>
                <td>⚠️ Should be grouped</td>
            </tr>`;
        });
        html += '</tbody></table>';
    }

    // Predicted groups
    if (comparison?.predictedGroups) {
        html += '<h3 style="margin-top: 30px;">📋 Predicted Groups</h3>';
        html += '<div class="group-display">';
        comparison.predictedGroups.forEach((group, idx) => {
            if (group.length > 1) {
                html += `<div class="group-box">
                    <h4>Group ${idx + 1}</h4>
                    <div class="attributes">`;
                group.forEach(attr => {
                    html += `<span class="attribute-tag">${attr}</span>`;
                });
                html += '</div></div>';
            }
        });
        html += '</div>';
    }

    // Ground truth groups
    if (comparison?.groundTruthGroups) {
        html += '<h3 style="margin-top: 30px;">🎯 Ground Truth Groups</h3>';
        html += '<div class="group-display">';
        comparison.groundTruthGroups.forEach((group, idx) => {
            if (group.length > 1) {
                html += `<div class="group-box">
                    <h4>Group ${idx + 1}</h4>
                    <div class="attributes">`;
                group.forEach(attr => {
                    html += `<span class="attribute-tag">${attr}</span>`;
                });
                html += '</div></div>';
            }
        });
        html += '</div>';
    }

    content.innerHTML = html;
}

function filterTable(method, searchTerm) {
    const content = document.getElementById(`tab-${method}`);
    const tables = content.querySelectorAll('.comparison-table tbody tr');
    const term = searchTerm.toLowerCase();

    tables.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
}
