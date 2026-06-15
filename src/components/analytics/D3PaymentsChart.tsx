import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useTheme } from "../../context/ThemeContext";

interface MonthlyPaymentData {
  month: string;  // e.g. "2026-01"
  amount: number; // e.g. 540000
  label: string;  // e.g. "Janvier"
}

interface D3PaymentsChartProps {
  data: MonthlyPaymentData[];
  themeColor?: "blue" | "emerald" | "rose" | "amber" | "slate";
}

export const D3PaymentsChart: React.FC<D3PaymentsChartProps> = ({ data, themeColor = "blue" }) => {
  const { darkMode } = useTheme();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 260 });
  const [hoveredIndex, setHoveredIndex] = useState<{
    label: string;
    amount: number;
    x: number;
    y: number;
  } | null>(null);

  // Monitor element container size using a ResizeObserver to expand fluids
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      setDimensions({
        width: Math.max(300, width),
        height: 260
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const { width, height } = dimensions;
    const margin = { top: 25, right: 20, bottom: 35, left: 70 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Clear previous items
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create the main graphics stage g
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define X axis scale (categorical bands)
    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, chartWidth])
      .padding(0.35);

    // Define Y axis scale (linear numeric values)
    const maxAmount = Number(d3.max(data, (d: MonthlyPaymentData) => d.amount) || 10000);
    // Add additional 15% head margin room on top of the maximum bar
    const yScale = d3
      .scaleLinear()
      .domain([0, maxAmount * 1.15])
      .range([chartHeight, 0]);

    // Theme color palette selection mapping
    const colorMap: Record<string, string> = {
      blue: "#2563eb",
      emerald: "#10b981",
      rose: "#f43f5e",
      amber: "#f59e0b",
      slate: "#475569"
    };
    const primaryThemeHex = colorMap[themeColor] || colorMap.blue;

    const gridColor = darkMode ? "#1e293b" : "#f1f5f9";
    const axisColor = darkMode ? "#334155" : "#cbd5e1";
    const labelColor = darkMode ? "#94a3b8" : "#64748b";
    const barTextColor = darkMode ? "#cbd5e1" : "#475569";

    // Dynamic gridlines on Y axis
    g.append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickSize(-chartWidth)
          .tickFormat(() => "")
      )
      .call((g) => g.select(".domain").remove())
      .selectAll("line")
      .attr("stroke", gridColor)
      .attr("stroke-dasharray", "3,3");

    // X Axis drawing
    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale).tickSize(4))
      .call((g) => g.select(".domain").attr("stroke", axisColor))
      .selectAll("text")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "10px")
      .attr("fill", labelColor)
      .attr("dy", "8px");

    // Y Axis drawing with compact french currency formatting auto-calculators
    const formatCurrencyCompact = (amount: number) => {
      if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(1).replace(".0", "")} M`;
      }
      if (amount >= 1000) {
        return `${(amount / 1000).toFixed(0)} K`;
      }
      return amount.toString();
    };

    g.append("g")
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickFormat((v) => `${formatCurrencyCompact(Number(v))} F`)
      )
      .call((g) => g.select(".domain").attr("stroke", axisColor))
      .selectAll("text")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "9px")
      .attr("fill", labelColor)
      .attr("dx", "-4px");

    // Draw solid columns bars
    const bars = g
      .selectAll(".bar-group")
      .data<MonthlyPaymentData>(data)
      .enter()
      .append("g")
      .attr("class", "bar-group");

    // Interactive bar with dynamic background tracking column
    bars
      .append("rect")
      .attr("x", (d) => xScale(d.label) || 0)
      .attr("y", 0)
      .attr("width", xScale.bandwidth())
      .attr("height", chartHeight)
      .attr("fill", "#f8fafc/30")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("opacity", 0.15);

    // Dynamic Foreground data reporting columns bars
    bars
      .append("rect")
      .attr("x", (d) => xScale(d.label) || 0)
      .attr("width", xScale.bandwidth())
      .attr("fill", primaryThemeHex)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("opacity", 0.85);

        const [mx, my] = d3.pointer(event, svgRef.current);
        setHoveredIndex({
          label: d.label,
          amount: d.amount,
          x: mx + 16,
          y: my - 16
        });
      })
      .on("mousemove", function (event) {
        const [mx, my] = d3.pointer(event, svgRef.current);
        setHoveredIndex((prev) =>
          prev ? { ...prev, x: mx + 16, y: my - 16 } : null
        );
      })
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("opacity", 1);
        setHoveredIndex(null);
      })
      // Slide up from bottom grid boundary line animation
      .attr("y", chartHeight)
      .attr("height", 0)
      .transition()
      .duration(900)
      .delay((_, i) => i * 110)
      .attr("y", (d) => yScale(d.amount))
      .attr("height", (d) => Math.max(2, chartHeight - yScale(d.amount)));

    // Individual glowing count values atop of the bar elements
    bars
      .append("text")
      .attr("x", (d) => (xScale(d.label) || 0) + xScale.bandwidth() / 2)
      .attr("y", (d) => yScale(d.amount) - 8)
      .attr("text-anchor", "middle")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "8.5px")
      .attr("font-weight", "700")
      .attr("fill", barTextColor)
      .text((d) => d.amount > 0 ? `${formatCurrencyCompact(d.amount)}` : "")
      .attr("opacity", 0)
      .transition()
      .duration(450)
      .delay(950)
      .attr("opacity", 1);

  }, [dimensions, data, themeColor, darkMode]);

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-slate-400 text-xs italic">
        Aucune transaction financière n'a été perçue sur cette période.
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

      {/* Floating absolute HTML custom popup bubble */}
      {hoveredIndex && (
        <div
          className="absolute z-20 pointer-events-none rounded-xl bg-slate-900 border border-slate-800 p-2 text-[11px] text-white shadow-xl min-w-[150px]"
          style={{
            left: `${hoveredIndex.x}px`,
            top: `${hoveredIndex.y}px`,
            transform: "translateY(-50%)"
          }}
        >
          <div className="font-sans font-bold text-slate-300">{hoveredIndex.label}</div>
          <div className="mt-1 font-mono text-emerald-450 font-bold flex items-baseline gap-1">
            <span className="text-white text-xs">{hoveredIndex.amount.toLocaleString()}</span>
            <span className="text-[9px] text-slate-400 font-sans">FCFA</span>
          </div>
          <div className="text-[8.5px] text-slate-500 font-mono mt-0.5 uppercase">Net perçu de scolarité</div>
        </div>
      )}
    </div>
  );
};
