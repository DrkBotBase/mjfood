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