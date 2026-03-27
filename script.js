// D3.js Placeholder Visualization
document.addEventListener('DOMContentLoaded', () => {
    const container = d3.select('#chart-container');
    const width = container.node().getBoundingClientRect().width;
    const height = 400;

    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);

    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Sample data for workplace dynamics
    let data = [
        { label: 'AI Adoption', value: 45 },
        { label: 'Automation', value: 30 },
        { label: 'Skill Gap', value: 65 },
        { label: 'Flexibility', value: 80 },
        { label: 'Innovation', value: 55 }
    ];

    const x = d3.scaleBand()
        .range([0, chartWidth])
        .padding(0.3);

    const y = d3.scaleLinear()
        .range([chartHeight, 0]);

    const xAxis = g.append('g')
        .attr('transform', `translate(0,${chartHeight})`);

    const yAxis = g.append('g');

    // Add labels
    g.append('text')
        .attr('x', chartWidth / 2)
        .attr('y', chartHeight + 45)
        .attr('text-anchor', 'middle')
        .attr('fill', '#64748b')
        .style('font-size', '14px')
        .text('Workplace Metrics');

    function update(data) {
        x.domain(data.map(d => d.label));
        y.domain([0, 100]);

        xAxis.transition().duration(500).call(d3.axisBottom(x));
        yAxis.transition().duration(500).call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'));

        const bars = g.selectAll('.bar')
            .data(data, d => d.label);

        bars.enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.label))
            .attr('y', chartHeight)
            .attr('width', x.bandwidth())
            .attr('height', 0)
            .attr('fill', '#3b82f6')
            .attr('rx', 4)
            .merge(bars)
            .transition()
            .duration(800)
            .attr('x', d => x(d.label))
            .attr('y', d => y(d.value))
            .attr('height', d => chartHeight - y(d.value))
            .attr('fill', (d, i) => d3.interpolateBlues(0.5 + i * 0.1));

        bars.exit().remove();
    }

    update(data);

    // Interaction
    d3.select('#update-btn').on('click', () => {
        data = data.map(d => ({
            ...d,
            value: Math.floor(Math.random() * 90) + 10
        }));
        update(data);
    });

    // Handle resize
    window.addEventListener('resize', () => {
        const newWidth = container.node().getBoundingClientRect().width;
        svg.attr('width', newWidth);
        // Recalculate and update if necessary
    });
});
