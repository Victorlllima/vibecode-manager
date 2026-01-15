import React from 'react';
import { cn } from "@/lib/utils";

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'large' | 'small'; // large para Login/CTA, small para Header/Sair
    glowColor?: string; // Opcional se quiser mudar a cor do neon
}

export function NeonButton({
    children,
    className,
    variant = 'large',
    glowColor = 'from-orange-600 via-orange-400 to-orange-600',
    ...props
}: NeonButtonProps) {

    const isLarge = variant === 'large';

    return (
        <button
            className={cn(
                "group flex flex-col items-center justify-center gap-2 bg-transparent transition-all duration-300 hover:-translate-y-1 focus:outline-none",
                className
            )}
            {...props}
        >
            {/* TEXTO (Acima da linha) */}
            <span className={cn(
                "font-bold uppercase tracking-widest text-white transition-colors group-hover:text-orange-100",
                isLarge ? "text-lg drop-shadow-[0_0_8px_rgba(255,165,0,0.5)]" : "text-xs drop-shadow-md"
            )}>
                {children}
            </span>

            {/* LÂMINA DE LUZ (Abaixo do texto) */}
            <div className={cn(
                "rounded-full bg-gradient-to-r transition-all duration-300 ease-out",
                glowColor,
                // Estado Normal
                isLarge ? "h-1.5 w-64 shadow-[0_0_15px_rgba(255,100,0,0.4)]" : "h-1 w-20 shadow-[0_0_10px_rgba(255,100,0,0.3)]",
                // Estado Hover (Brilho explode e barra cresce levemente)
                isLarge
                    ? "group-hover:h-2 group-hover:w-72 group-hover:shadow-[0_0_35px_rgba(255,140,0,0.8)] group-hover:brightness-125"
                    : "group-hover:h-1.5 group-hover:w-24 group-hover:shadow-[0_0_20px_rgba(255,140,0,0.6)]"
            )} />
        </button>
    );
}
