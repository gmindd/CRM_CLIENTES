import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera um servidor auto-contido em .next/standalone (ideal para deploy no VPS/Docker)
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "node-cron", "nodemailer"],
  poweredByHeader: false,
};

export default nextConfig;
