<svelte:options namespace="svg" />

<!-- 図に 1 つだけ置く：影のぼかし -->
<defs>
	<filter id="dl-isoblur" x="-30%" y="-30%" width="160%" height="160%">
		<feGaussianBlur stdDeviation="5" />
	</filter>
</defs>
