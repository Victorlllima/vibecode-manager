import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./app/**/*.{ts,tsx}",
        "./src/**/*.{ts,tsx}",
    ],
    theme: {
        container: {
            center: true,
            padding: {
                DEFAULT: "2rem", // Mobile: 32px
                md: "4rem",      // Desktop: 64px
            },
            screens: {
                "2xl": "1536px", // Container Máximo
            },
        },
        extend: {
            fontFamily: {
                sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
            },
            colors: {
                // Paleta SAGE / Startup Template (Preto Absoluto)
                background: "hsl(var(--background))", // #000000
                foreground: "hsl(var(--foreground))", // #ffffff

                primary: {
                    DEFAULT: "hsl(var(--primary))",     // #ffffff
                    foreground: "hsl(var(--primary-foreground))", // #000000 (Invertido)
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",       // #a1a1aa (Texto de apoio)
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",      // #27272a (Hover states)
                    foreground: "hsl(var(--accent-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                border: "hsl(var(--border))",         // #27272a (Bordas sutis)
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",

                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",         // 16px (Cards)
                md: "calc(var(--radius) - 6px)", // ~10px (Buttons)
                sm: "calc(var(--radius) - 10px)",
            },
            // Animações do relatório (Border Beam, Glow)
            animation: {
                "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
                "fade-in-up": "fadeInUp 0.5s ease-out forwards",
            },
            keyframes: {
                "border-beam": {
                    "100%": { "offset-distance": "100%" },
                },
                fadeInUp: {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
export default config;
