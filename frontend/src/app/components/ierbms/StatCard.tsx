import * as React from "react";
import { Card, CardContent } from "./Card";
import { cn } from "../ui/utils";
import { LucideIcon } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number | string;
    isPositive: boolean;
  };
  description?: string;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  description,
  variant = "default",
  className,
}) => {
  const variantStyles = {
    default: "bg-[var(--primary)] text-white",
    success: "bg-[var(--success)] text-white",
    warning: "bg-[var(--warning)] text-white",
    danger: "bg-[var(--danger)] text-white",
  };

  return (
    <Card className={cn("overflow-hidden border border-slate-200 dark:border-white/10 bg-card shadow-sm hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600 dark:text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">{value}</p>
            {trend && (
              <p
                className={cn(
                  "text-xs mt-2 flex items-center gap-1 font-medium",
                  trend.isPositive ? "text-emerald-600 dark:text-[var(--success)]" : "text-rose-600 dark:text-[var(--danger)]"
                )}
              >
                <span>{trend.isPositive ? "↑" : "↓"}</span>
                <span>{typeof trend.value === 'number' ? `${Math.abs(trend.value)}%` : trend.value}</span>
                {typeof trend.value === 'number' && <span className="text-slate-500 dark:text-muted-foreground">vs last period</span>}
              </p>
            )}
            {description && !trend && (
              <p className="text-xs mt-2 text-slate-500 dark:text-muted-foreground font-medium">
                {description}
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-lg", variantStyles[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { StatCard };
