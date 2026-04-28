import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import cloud from "d3-cloud";

function AiWordGraph() {
  const [words, setWords] = useState([]);
  const svgRef = useRef(null);

  const width = 600;
  const height = 400;

  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL || "/";

    // 1. Fetch the dataset
    d3.csv(`${baseUrl}ai_impact_jobs_2010_2025.csv`).then((raw) => {
      const keywordCounts = {};

      // 2. Parse the CSV rows
      raw.forEach((d) => {
        if (d.ai_keywords) {
          // Split keywords by comma and clean up whitespace
          const tags = d.ai_keywords.split(",").map((s) => s.trim().toLowerCase());
          tags.forEach((tag) => {
            if (tag) {
              keywordCounts[tag] = (keywordCounts[tag] || 0) + 1;
            }
          });
        }
      });

      // 3. Convert dictionary to D3 readable array
      const wordsArray = Object.entries(keywordCounts).map(([text, value]) => ({
        text,
        value,
      }));

      // Grab the max occurrences to scale sizes correctly
      const maxValue = d3.max(wordsArray, (d) => d.value) || 1;

      // 4. Create a scale to map frequency -> font size
      const sizeScale = d3.scaleLinear().domain([1, maxValue]).range([12, 60]); // Smallest words will be 12px, biggest 60px

      // 5. Initialize the d3-cloud layout
      cloud()
        .size([width, height])
        .words(wordsArray)
        .padding(5) // Spacing between words
        .rotate(() => (Math.random() > 0.5 ? 0 : 90)) // Mix of horizontal/vertical text
        .font("Impact")
        .fontSize((d) => sizeScale(d.value)) // Call our scale
        .on("end", (computedWords) => {
          // Once collision checks are complete, store plotted coordinates
          setWords(computedWords);
        })
        .start(); // Run the algorithm
    });
  }, []);

  // 6. Draw the SVGs using React state
  useEffect(() => {
    if (words.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear canvas before redrawing

    // Color scale for words
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const group = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`); // Center the cloud

    group
      .selectAll("text")
      .data(words)
      .enter()
      .append("text")
      .style("font-family", "Impact")
      .style("font-size", (d) => `${d.size}px`)
      .style("fill", (d, i) => colorScale(i))
      .attr("text-anchor", "middle")
      .attr("transform", (d) => `translate(${d.x}, ${d.y})rotate(${d.rotate})`) // Placed safely by D3 Cloud
      .text((d) => d.text);
  }, [words]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      <svg ref={svgRef}></svg>
    </div>
  );
}

export default AiWordGraph;
