import withPWA from "@ducanh2912/next-pwa";

const nextConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/~offline",
  },
})({
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
});

export default nextConfig;
