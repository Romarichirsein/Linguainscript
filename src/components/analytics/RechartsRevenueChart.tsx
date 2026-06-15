import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { useTheme } from "../../context/ThemeContext";

interface MonthlyPaymentData {
  month: string;  // e.g. "2026-01"
  amount: number; // e.g. 540000
  label: string;  // e.g. "Janvier"
}

interface RechartsRevenueChartProps {
  data: MonthlyPaymentData[];
  themeColor?: "blue" | "emerald" | "rose" | "amber" | "slate";
}

export const RechartsRevenueChart: React.FC<RechartsRevenueChartProps> = ({
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

  // Custom compact currency formatter
  const formatCurrencyCompact = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1).replace(".0", "")} M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)} K`;
    }
    return amount.toString();
  };

  // Derive styles depending on dark mode status
  const gridColor = darkMode ? "#1e293b" : "#f1f5f9";
  const labelColor = darkMode ? "#94a3b8" : "#64748b";
  const tooltipBg = darkMode ? "#0f172a" : "#ffffff";
  const tooltipBorder = darkMode ? "#334155" : "#e2e8f0";
  const tooltipText = darkMode ? "#f8fafc" : "#0f172a";

  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-slate-400 text-xs italic">
        Aucune transaction financière n'a été perçue sur cette période.
      </div>
    );
  }

  return (
    <div className="w-full h-[260px] font-sans">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 15, right: 10, left: -15, bottom: 5 }}
        >
          <defs>
            <linearGradient id={`colorRevenue-${themeColor}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={primaryColor} stopOpacity={0.4} />
              <stop offset="95%" stopColor={primaryColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="label"
            stroke={labelColor}
            fontSize={10}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            stroke={labelColor}
            fontSize={10}
            tickLine={false}
            axisLine={false}
            dx={-4}
            tickFormatter={(value) => `${formatCurrencyCompact(value)} F`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              borderColor: tooltipBorder,
              borderRadius: "12px",
              fontSize: "11px",
              color: tooltipText,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
              fontFamily: "Inter, sans-serif"
            }}
            formatter={(value: any) => [
              <span className="font-mono font-bold text-emerald-500">
                {Number(value).toLocaleString()} <span className="text-[9px] font-sans text-slate-450 font-medium">FCFA</span>
              </span>,
              "Recettes Scolarité"
            ]}
            labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke={primaryColor}
            strokeWidth={3}
            fillOpacity={1}
            fill={`url(#colorRevenue-${themeColor})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
