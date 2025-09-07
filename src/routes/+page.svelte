<!-- <script lang="ts">
	let fileInput: HTMLInputElement | undefined = $state();
    import vocabulary from "./vocabulary.json"

	const downloadVocabFile = () => {
		const link = document.createElement('a');
		const content = JSON.stringify(vocabulary);
		const file = new Blob([content], { type: 'text/plain' });
		link.href = URL.createObjectURL(file);
		link.download = 'vocab.json';
		link.click();
		URL.revokeObjectURL(link.href);
	};

	const uploadVocabFile = () => {
		if (fileInput && fileInput.files) {
			const selectedFile = fileInput.files[0];
			const reader = new FileReader();
			console.log(vocabulary);
			reader.onload = (event) => {
				if (event && event.target && event.target.result) {
					const newData = JSON.parse(event.target.result.toString());
					vocabulary.words = { ...vocabulary.words, ...newData.words };
				}
			};
			console.log(vocabulary);
			reader.readAsText(selectedFile);
		}
	};
</script>

<h1>Welcome to Vocab Site</h1>
<button onclick={downloadVocabFile}>Download</button>
<div>
	<input type="file" bind:this={fileInput} name="fileInput" accept="json" />
	<button class="fileButton" onclick={uploadVocabFile}>Upload Vocab File</button>
</div> -->

<script lang="ts">
	import { onMount } from 'svelte';
	import { addWord, getWords } from '$lib/db';
	import type { Word } from '$lib/db';

	let words: (Word & { id: number })[] = [];
	let newEnglish = '';
	let newSpanish = '';
	let newPortuguese = '';
	let newPos = 'n';

	import { seedDatabaseOnce } from '$lib/initWords';

	onMount(async () => {
		await seedDatabaseOnce(); // insert seed words if first use
		words = await getWords(); // load all words from DB
	});

	async function handleAdd() {
		const word: Word = {
			english: newEnglish,
			pos: newPos
		};

		if (newSpanish) word.spanish = { word: newSpanish, gender: 'f' }; // optional
		if (newPortuguese) word.portuguese = { word: newPortuguese, gender: 'f' }; // optional

		await addWord(word);
		words = await getWords();

		newEnglish = '';
		newSpanish = '';
		newPortuguese = '';
	}
</script>

<input bind:value={newEnglish} placeholder="English" />
<input bind:value={newSpanish} placeholder="Spanish (optional)" />
<input bind:value={newPortuguese} placeholder="Portuguese (optional)" />
<input bind:value={newPos} placeholder="Part of Speech" />
<button on:click={handleAdd}>Add Word</button>

<ul>
	{#each words as w}
		<li>
			{w.english}
			{#if w.spanish} → {w.spanish.word}{/if}
			{#if w.portuguese} / {w.portuguese.word}{/if}
			({w.pos})
		</li>
	{/each}
</ul>