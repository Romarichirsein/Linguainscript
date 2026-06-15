import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from "recharts";
import { useTheme } from "../../context/ThemeContext";

interface EnrollmentData {
  name: string;
  Inscriptions: number;
}

interface RechartsEnrollmentChartProps {
  data: EnrollmentData[];
  themeColor?: "blue" | "emerald" | "rose" | "amber" | "slate";
}

export const RechartsEnrollmentChart: React.FC<RechartsEnrollmentChartProps> = ({
  data,
  themeColor = "blue"
}) => {
  const { darkMode } = useTheme();

  // Define hex theme colors matching branding
  const themeColorsMap: Record<string, string> = {
    blue: "#3b82f6",
    emerald: "#10b981",
    rose: "#f43f5e",
    amber: "#f59e0b",
    slate: "#64748b"
  };

  const primaryColor = themeColorsMap[themeColor] || themeColorsMap.blue;

  // Derive colors based on dark mode status
  const gridColor = darkMode ? "#1e293b" : "#f1f5f9";
  const labelColor = darkMode ? "#94a3b8" : "#64748b";
  const tooltipBg = darkMode ? "#0f172a" : "#ffffff";
  const tooltipBorder = darkMode ? "#334155" : "#e2e8f0";
  const tooltipText = darkMode ? "#f8fafc" : "#0f172a";

  return (
    <div className="w-full h-[280px] font-sans">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="name"
            stroke={labelColor}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            stroke={labelColor}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dx={-4}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              borderColor: tooltipBorder,
              borderRadius: "12px",
              fontSize: "11px",
              color: tooltipText,
              boxShadow: "0 4px 12px rbg(0, 0, 0, 0.08)"
            }}
            cursor={{ fill: darkMode ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.02)" }}
          />
          <Bar
            dataKey="Inscriptions"
            radius={[6, 6, 0, 0]}
            maxBarSize={38}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={primaryColor}
                fillOpacity={0.88 - (data.length - 1 - index) * 0.08} // Beautiful gradient sequence
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
