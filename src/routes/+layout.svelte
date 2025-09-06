<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	let { children } = $props();

	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register(
			`${import.meta.env.BASE_URL}service-worker.js`
		);
	}
</script>

<svelte:head>
	<link rel="manifest" href="/manifest.json" />
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
