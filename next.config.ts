import type { NextConfig } from "next";
import { CABECALHOS } from "./src/lib/verificar/cabecalhos";

const nextConfig: NextConfig = {
	poweredByHeader: false,
	async headers() {
		return [
			{
				source: "/:path*",
				headers: Object.entries(CABECALHOS).map(([key, value]) => ({
					key,
					value,
				})),
			},
		];
	},
};

export default nextConfig;
