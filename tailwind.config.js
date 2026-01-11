/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs", "./public/**/*.js"],
  safelist: [
    "container", "mx-auto", "px-6", "py-4", "rounded-2xl",
    "flex", "justify-center", "items-center",
    "text-2xl", "font-bold", "tracking-tighter", "accent-text",
    "overflow-x-auto", "whitespace-nowrap",
    "bg-gradient-to-br", "bg-gradient-to-tr",
    // Clases para el Banner
    "fixed", "top-4", "left-4", "right-4", "z-50",
    "backdrop-blur-xl", "backdrop-blur-md",
    "bg-white/80", "dark:bg-gray-900/90",
    "border-white/20", "dark:border-gray-800",
    "rounded-[2rem]", "rounded-full",
    "shadow-2xl", "shadow-lg",
    // Estados de Animación
    "opacity-0", "opacity-100",
    "translate-y-0", "translate-y-[-20px]",
    "scale-95", "scale-100",
    "pointer-events-none", "pointer-events-auto",
    "transition-all", "duration-500",
    {
      pattern: /from-(red|orange|yellow|green|blue|indigo|purple|pink)-(400|500|600|700)/,
    },
    {
      pattern: /to-(red|orange|yellow|green|blue|indigo|purple|pink)-(400|500|600|700)/,
    }
  ],
  theme: {
    extend: {
      fontSize: {
        '9xl': '8rem'
      },
      transitionTimingFunction: {
        'apple-in-out': 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      borderRadius: {
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}