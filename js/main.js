// D3 Sankey Chart Logic
document.addEventListener("DOMContentLoaded", () => {
    const chartContainer = d3.select("#chart");
    if (chartContainer.empty()) return;

    const dataPath = chartContainer.attr("data-path");
    const chartTitle = chartContainer.attr("data-title");

    // Dimensions
    const margin = { top: 60, right: 200, bottom: 20, left: 120 };
    const width = 1200 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // SVG setup
    const svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip");

    // Color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Load data and initialize
    d3.json(dataPath).then(data => {
        const years = [...new Set(data.map(d => d.year))];
        const yearSelect = d3.select("#yearSelect");
        
        years.forEach(year => {
            yearSelect.append("option").attr("value", year).text(year);
        });

        yearSelect.on("change", () => updateChart(data));
        
        // Initial chart render
        updateChart(data);
    });

    function updateChart(allData) {
        const selectedYear = parseInt(d3.select("#yearSelect").property("value"));

        const filteredData = allData.filter(d => d.year === selectedYear);

        // Define columns based on the chart
        let columns;
        if (dataPath.includes("5_class")) {
            columns = ["migration_background", "trade_union_member_status", "professional_class", "income_level"];
        } else if (dataPath.includes("8_class")) {
            columns = ["migration_background", "trade_union_member_status", "professional_class", "vote_recall"];
        } else {
            columns = ["migration_background", "trade_union_member_status", "professional_class", "gender"];
        }

        let nodes = [];
        let links = [];
        
        const nodeMap = new Map();

        function getNodeId(name, colIndex) {
            const id = `${colIndex}:${name}`;
            if (!nodeMap.has(id)) {
                nodeMap.set(id, { name: name, column: colIndex });
            }
            return id;
        }

        filteredData.forEach(d => {
            for (let i = 0; i < columns.length - 1; i++) {
                const sourceName = d[columns[i]];
                const targetName = d[columns[i+1]];

                const sourceId = getNodeId(sourceName, i);
                const targetId = getNodeId(targetName, i + 1);

                const linkId = `${sourceId}->${targetId}`;
                let link = links.find(l => l.id === linkId);

                if (!link) {
                    link = { id: linkId, source: sourceId, target: targetId, value: 0 };
                    links.push(link);
                }
                link.value += d.weight;
            }
        });

        nodes = Array.from(nodeMap.values());
        
        const sankey = d3.sankey()
            .nodeWidth(15)
            .nodePadding(10)
            .extent([[1, 5], [width - 1, height - 5]])
            .nodeId(d => `${d.column}:${d.name}`)
            .nodeAlign(d3.sankeyJustify);
            
        const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
            nodes: nodes,
            links: links
        });

        // Calculate total value for percentage calculation
        const totalValue = d3.sum(sankeyNodes.filter(d => d.depth === 0), d => d.value);

        svg.selectAll("*").remove();

        const link = svg.append("g")
            .attr("fill", "none")
            .attr("stroke-opacity", 0.5)
            .selectAll("g")
            .data(sankeyLinks)
            .join("g")
            .style("mix-blend-mode", "multiply");

        link.append("path")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke", d => color(d.source.name))
            .attr("stroke-width", d => Math.max(1, d.width));

        link.on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                   .html(`${d.source.name} → ${d.target.name}<br>N = ${d.value.toFixed(0)}`);
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });

        const node = svg.append("g")
            .selectAll("g")
            .data(sankeyNodes)
            .join("g")
            .attr("class", "sankey-node")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        node.append("rect")
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", d => color(d.name))
            .attr("stroke", "#000");

        node.append("text")
            .attr("x", d => d.x0 < width / 2 ? 6 + (d.x1 - d.x0) : -6)
            .attr("y", d => (d.y1 - d.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
            .text(d => {
                const percentage = (d.value / totalValue * 100).toFixed(1);
                return `${d.name} (N=${d.value.toFixed(0)}, ${percentage}%)`;
            });

        // Add column headers
        const columnNames = columns.map(col => col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
        svg.append("g")
            .style("font", "14px sans-serif")
            .selectAll("text")
            .data(columnNames)
            .join("text")
            .attr("x", (d, i) => (width / (columnNames.length -1)) * i)
            .attr("y", -25)
            .attr("text-anchor", "middle")
            .text(d => d);
    }
});
