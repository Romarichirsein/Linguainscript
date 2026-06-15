import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useTheme } from "../../context/ThemeContext";

interface CourseData {
  name: string;
  value: number;
}

interface D3CourseChartProps {
  data: CourseData[];
  themeColor?: "blue" | "emerald" | "rose" | "amber" | "slate";
}

export const D3CourseChart: React.FC<D3CourseChartProps> = ({ data, themeColor = "blue" }) => {
  const { darkMode } = useTheme();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 260 });
  const [hoveredItem, setHoveredItem] = useState<{ name: string; value: number; x: number; y: number } | null>(null);

  // Monitor container width to be 100% responsive
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      // Define appropriate aspect ratio / height
      setDimensions({
        width: Math.max(280, width),
        height: Math.max(220, data.length * 35 + 40) // dynamic height based on course count
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [data.length]);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const { width, height } = dimensions;
    const margin = { top: 15, right: 40, bottom: 20, left: 110 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Clear previous elements
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create the main group element g
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define scales
    const yScale = d3
      .scaleBand()
      .domain(data.map((d) => d.name))
      .range([0, chartHeight])
      .padding(0.25);

    const maxValue = Number(d3.max(data, (d: CourseData) => d.value) || 1);
    const xScale = d3
      .scaleLinear()
      .domain([0, maxValue])
      .range([0, chartWidth]);

    // Theme color palette mappings
    const colorMap: Record<string, string> = {
      blue: "#3b82f6",
      emerald: "#10b981",
      rose: "#f43f5e",
      amber: "#f59e0b",
      slate: "#475569"
    };
    const barColor = colorMap[themeColor] || colorMap.blue;

    const gridColor = darkMode ? "#1e293b" : "#f1f5f9";
    const axisColor = darkMode ? "#334155" : "#e2e8f0";
    const labelColor = darkMode ? "#94a3b8" : "#64748b";
    const barBgColor = darkMode ? "#1e293b" : "#f8fafc";
    const barTextColor = darkMode ? "#cbd5e1" : "#334155";

    // Add background vertical grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(5)
          .tickSize(-chartHeight)
          .tickFormat(() => "")
      )
      .call((g) => g.select(".domain").remove())
      .selectAll("line")
      .attr("stroke", gridColor)
      .attr("stroke-dasharray", "3,3");

    // Left Y Axis
    g.append("g")
      .call(d3.axisLeft(yScale).tickSize(0))
      .call((g) => g.select(".domain").attr("stroke", axisColor))
      .selectAll("text")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .attr("fill", labelColor)
      .attr("dx", "-6px");

    // Render bars with a stylish modern look (rounded corners, transition)
    const bars = g
      .selectAll(".bar-group")
      .data<CourseData>(data)
      .enter()
      .append("g")
      .attr("class", "bar-group");

    // Background tracking pill lane
    bars
      .append("rect")
      .attr("x", 0)
      .attr("y", (d) => yScale(d.name) || 0)
      .attr("width", chartWidth)
      .attr("height", yScale.bandwidth())
      .attr("fill", barBgColor)
      .attr("rx", 6)
      .attr("ry", 6);

    // Dynamic foreground data bar
    bars
      .append("rect")
      .attr("x", 0)
      .attr("y", (d) => yScale(d.name) || 0)
      .attr("height", yScale.bandwidth())
      .attr("fill", barColor)
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("cursor", "pointer")
      .style("transform-origin", "left center")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("opacity", 0.85);

        // Calculate absolute positioning for the tooltip
        const [mx, my] = d3.pointer(event, svgRef.current);
        setHoveredItem({
          name: d.name,
          value: d.value,
          x: mx + 16,
          y: my - 12
        });
      })
      .on("mousemove", function (event) {
        const [mx, my] = d3.pointer(event, svgRef.current);
        setHoveredItem((prev) =>
          prev ? { ...prev, x: mx + 16, y: my - 12 } : null
        );
      })
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("opacity", 1);
        setHoveredItem(null);
      })
      // Smooth loading transition extending from left margin
      .attr("width", 0)
      .transition()
      .duration(800)
      .delay((_, i) => i * 100)
      .attr("width", (d) => xScale(d.value));

    // Right-aligned numerical labels counts
    bars
      .append("text")
      .attr("x", (d) => xScale(d.value) + 8)
      .attr("y", (d) => (yScale(d.name) || 0) + yScale.bandwidth() / 2 + 3.5)
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "10px")
      .attr("font-weight", "700")
      .attr("fill", barTextColor)
      .text((d) => `${d.value}`)
      .attr("opacity", 0)
      .transition()
      .duration(300)
      .delay(700)
      .attr("opacity", 1);

    // End boundary bottom horizontal reference line
    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(3))
      .call((g) => g.select(".domain").attr("stroke", axisColor))
      .selectAll("text")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "9px")
      .attr("fill", labelColor);

  }, [dimensions, data, themeColor, darkMode]);

  if (data.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-slate-450 text-[11px] font-medium italic">
        Aucune inscription active à analyser.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full overflow-visible">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="overflow-visible block select-none"
      />

      {/* Elegant customized absolute HTML tooltip */}
      {hoveredItem && (
        <div
          className="absolute z-20 pointer-events-none rounded-lg bg-slate-900 border border-slate-850 p-2.5 shadow-lg text-[11px] font-sans text-slate-100 min-w-[130px]"
          style={{
            left: `${hoveredItem.x}px`,
            top: `${hoveredItem.y}px`,
            transform: "translateY(-50%)"
          }}
        >
          <div className="font-bold text-slate-200">{hoveredItem.name}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="h-1.5 w-1.5 rounded-full inline-block"
              style={{
                backgroundColor:
                  themeColor === "blue"
                    ? "#3b82f6"
                    : themeColor === "emerald"
                    ? "#10b981"
                    : themeColor === "rose"
                    ? "#f43f5e"
                    : themeColor === "amber"
                    ? "#f59e0b"
                    : "#475569"
              }}
            />
            <span className="font-mono text-slate-400">
              <strong className="text-white text-xs">{hoveredItem.value}</strong>{" "}
              {hoveredItem.value > 1 ? "inscriptions" : "inscription"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
