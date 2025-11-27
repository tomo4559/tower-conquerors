import React, { useRef, useEffect } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  repeatOnHold?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  onClick,
  repeatOnHold = false,
  ...props 
}) => {
  const intervalRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:scale-95 select-none";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    secondary: "bg-slate-700 text-white hover:bg-slate-600",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    outline: "border border-slate-600 bg-transparent hover:bg-slate-800 text-slate-100"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-6 text-base"
  };

  const clearTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    if (props.disabled) return;
    
    // Always trigger click once immediately
    if (onClick) onClick(e as any);

    if (repeatOnHold && onClick) {
      // Clear any existing timers just in case
      clearTimers();
      
      // Wait 300ms before starting repetition
      timeoutRef.current = setTimeout(() => {
        intervalRef.current = setInterval(() => {
          onClick(e as any);
        }, 100); // Repeat every 100ms
      }, 300);
    }
  };

  const handleMouseUp = () => {
    clearTimers();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, []);

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      // Note: We handled onClick inside MouseDown/TouchStart for better control over repetition
      // but we need to ensure we don't double fire if repeatOnHold is false.
      // If repeatOnHold is FALSE, we can just use standard onClick passed in props (via ...props if we didn't destructure).
      // Since we destructured onClick, we need to decide.
      // Strategy: If repeatOnHold is true, disable standard onClick (since we call it manually).
      // If repeatOnHold is false, use standard onClick.
      onClick={repeatOnHold ? undefined : onClick}
      {...props}
    >
      {children}
    </button>
  );
};