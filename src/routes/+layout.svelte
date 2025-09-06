<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { asset } from '$app/paths';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="manifest" href="{asset('/manifest.json')}">
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
