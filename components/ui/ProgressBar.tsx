
import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  className?: string;
  label?: string;
  height?: string;
  displayValue?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  max, 
  color = "bg-blue-500", 
  className = "", 
  label,
  height = "h-2",
  displayValue
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between text-xs mb-1 text-slate-400">
          <span>{label}</span>
          <span>{displayValue || `${Math.floor(value)} / ${max}`}</span>
        </div>
      )}
      <div className={`w-full bg-slate-800 rounded-full overflow-hidden ${height}`}>
        <div 
          className={`h-full transition-all duration-300 ease-out ${color}`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
    </div>
  );
};
