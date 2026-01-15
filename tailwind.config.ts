import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Cores do tema Neon Laranja
                'neon-orange': '#F97316',
                'neon-orange-light': '#FB923C',
                'neon-orange-dark': '#EA580C',
                'dark-bg': '#0A0A0F',
                'dark-card': '#111118',
                'dark-red': '#1A0A0A',

                // Mantenho as variáveis HSL para compatibilidade com Shadcn
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            // Efeito de brilho (glow) para os botões
            boxShadow: {
                'neon': '0 0 20px rgba(249, 115, 22, 0.5), 0 0 40px rgba(249, 115, 22, 0.3)',
                'neon-strong': '0 0 30px rgba(249, 115, 22, 0.7), 0 0 60px rgba(249, 115, 22, 0.4)',
                'neon-line': '0 4px 20px rgba(249, 115, 22, 0.8)',
            },
            // Animação de pulsar para o efeito neon
            animation: {
                'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
            },
            keyframes: {
                'pulse-neon': {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(249, 115, 22, 0.5)' },
                    '50%': { boxShadow: '0 0 40px rgba(249, 115, 22, 0.8)' },
                },
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};

export default config;
