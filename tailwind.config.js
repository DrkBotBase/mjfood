/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs", "./public/**/*.js"],
  safelist: [
    "container",
    "mx-auto",
    "px-6",
    "py-4",
    "rounded-2xl",
    "flex",
    "justify-center",
    "items-center",
    "text-2xl",
    "font-bold",
    "tracking-tighter",
    "accent-text",
    "overflow-x-auto",
    "whitespace-nowrap",
    'bg-gradient-to-br',
    'bg-gradient-to-tr',
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
      }
    },
  },
  plugins: [],
}