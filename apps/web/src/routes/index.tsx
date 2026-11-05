import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { healthOptions } from "@/client/@tanstack/react-query.gen";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const saude = useQuery(healthOptions());

	return (
		<div className="container mx-auto max-w-3xl px-4 py-2">
			<h1 className="text-2xl font-semibold">Mandatômetro</h1>
			<p className="text-muted-foreground">Aprenda política com dados reais.</p>
			<div className="mt-6 grid gap-6">
				<section className="rounded-lg border p-4">
					<h2 className="mb-2 font-medium">Status da API</h2>
					<div className="flex items-center gap-2">
						<div
							className={`h-2 w-2 rounded-full ${saude.data ? "bg-green-500" : "bg-red-500"}`}
						/>
						<span className="text-muted-foreground text-sm">
							{saude.isLoading
								? "Verificando..."
								: saude.data
									? "No ar"
									: "Fora do ar"}
						</span>
					</div>
				</section>
			</div>
		</div>
	);
}
