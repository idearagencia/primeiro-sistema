import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";

// Fonte de pixel guardada na própria pasta (licença em fontes/VT323-OFL.txt): a página não
// busca nada fora do seu computador.
const pixel = localFont({
	src: "./fontes/vt323-latin.woff2",
	variable: "--fonte-pixel",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Meu primeiro sistema",
	description: "Confere se o seu computador está pronto para criar com IA.",
};

export const viewport: Viewport = { themeColor: "#141414" };

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="pt-BR" className={pixel.variable}>
			<body>{children}</body>
		</html>
	);
}
