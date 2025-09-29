<script lang="ts">
	import { onMount } from 'svelte';
	import { addWord, getWords } from '$lib/db';
	import type { Word } from '$lib/db';

	let words: (Word & { id: number })[] = $state([]);
	let canLoadDictionary = $state(false);

	// home, add-word, crossword-page, database-backup-page, dictionary-page
	let currentPage = $state('home');

	import { seedDatabaseOnce } from '$lib/initWords';
	import AddWordPage from './components/AddWordPage.svelte';
	import LoadDatabaseBackup from './components/LoadDatabaseBackup.svelte';
	import CrosswordPage from './components/CrosswordPage.svelte';
	import DictionaryPage from './components/DictionaryPage.svelte';

	async function onWordAdded() {
		words = await getWords(); // load all words from DB
		currentPage = 'home'
	}

	onMount(async () => {
		await seedDatabaseOnce(); // insert seed words if first use
		words = await getWords(); // load all words from DB
	});

	const goToAddWordPage = () => {
		currentPage = 'add-word-page'
	}

	const goToDatabaseBackupPage = () => {
		currentPage = 'database-backup-page'
	}

	const goToCrosswordPage = () => {
		currentPage = 'crossword-page'
	}

	const goToDictionaryPage = () => {
		canLoadDictionary = true;
		currentPage = 'dictionary-page'
	}

	
</script>

<div class:invisible={currentPage !== "home"}>
	<button onclick={goToAddWordPage}>Add a word</button>
	<button onclick={goToDatabaseBackupPage}>DB Backup Page</button>
	<button onclick={goToCrosswordPage}>Crossword Page</button>
	<button onclick={goToDictionaryPage}>Dictionary Page</button>
	<!-- <ul>
		{#each words as w}
			<li>
				{w.english}
				{#if w.spanish}
					→ {w.spanish.word}{/if}
				{#if w.portuguese}
					/ {w.portuguese.word}{/if}
				({w.pos})
			</li>
		{/each}
	</ul> -->

</div>

<div class:invisible={currentPage !== "add-word-page"}>
	<AddWordPage {onWordAdded}></AddWordPage>
</div>


<div class:invisible={currentPage !== "database-backup-page"}>
	<LoadDatabaseBackup onReturn={onWordAdded}> </LoadDatabaseBackup>
</div>

<div class:invisible={currentPage !== "crossword-page"}>
	<CrosswordPage > </CrosswordPage>
</div>

<div class:invisible={currentPage !== "dictionary-page"}>
	<DictionaryPage onReturn={onWordAdded} allWords={words}> </DictionaryPage>
</div>

<style>
	.invisible {
		display: none;
	}
</style>