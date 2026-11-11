import Image from "next/image";

export type Pose = "parado" | "comemorando" | "pensando";

// O IAHacks é enfeite: a frase ao lado já diz tudo, por isso a imagem não tem texto (alt="").
// As três poses têm o mesmo quadro (720 × 1107), então trocar de pose não mexe na página.
export function Mascote({ pose }: { pose: Pose }) {
	return (
		<Image
			src={`/mascote/${pose}.avif`}
			alt=""
			width={720}
			height={1107}
			unoptimized
			loading="eager"
			fetchPriority="high"
			className="mascote"
		/>
	);
}
