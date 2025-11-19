import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'success' }> = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseStyle = "px-4 py-2 font-bold uppercase border-4 transition-all active:translate-y-1 font-mono text-sm md:text-base";
    const variants = {
        primary: "bg-blue-600 border-blue-800 text-white hover:bg-blue-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]",
        secondary: "bg-slate-600 border-slate-800 text-white hover:bg-slate-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]",
        danger: "bg-red-600 border-red-800 text-white hover:bg-red-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]",
        success: "bg-green-600 border-green-800 text-white hover:bg-green-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
    };

    return (
        <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string, title?: string }> = ({ children, className = '', title }) => {
    return (
        <div className={`bg-slate-800 border-4 border-slate-600 p-4 shadow-lg ${className}`}>
            {title && <h3 className="text-yellow-400 text-xl mb-4 border-b-2 border-slate-600 pb-2 pixel-font">{title}</h3>}
            {children}
        </div>
    );
};

interface StatBarProps {
    label: string;
    current: number;
    max: number;
    color: string;
}

export const StatBar: React.FC<StatBarProps> = ({ label, current, max, color }) => {
    const percentage = Math.min(100, Math.max(0, (current / max) * 100));
    return (
        <div className="flex items-center gap-2 w-full text-sm mb-1 font-mono">
            <span className="w-8 font-bold text-right">{label}</span>
            <div className="flex-1 h-4 bg-slate-900 border-2 border-slate-700 relative">
                <div 
                    className={`h-full transition-all duration-300 ${color}`} 
                    style={{ width: `${percentage}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white drop-shadow-md">
                    {Math.floor(current)}/{max}
                </span>
            </div>
        </div>
    );
};