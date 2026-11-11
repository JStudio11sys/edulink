import type { NextConfig } from "next";

// Static export so the app runs on Vercel and GitHub Pages.
// For GitHub Pages set NEXT_PUBLIC_BASE_PATH=/<repo-name> at build time.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
