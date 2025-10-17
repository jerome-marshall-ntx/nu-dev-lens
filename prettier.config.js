/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
const config = {
  plugins: ["prettier-plugin-organize-imports", "prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./src/styles/globals.css",
  tailwindFunctions: ["clsx", "cn", "cva", "twMerge"],
};

export default config;
