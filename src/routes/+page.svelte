<script lang="ts">
	import { onMount } from 'svelte';
	import { addWord, getWords } from '$lib/db';
	import type { Word } from '$lib/db';

	let words: (Word & { id: number })[] = $state([]);
	let canLoadDictionary = $state(false);

	// home, add-word, crossword-page, database-backup-page, dictionary-page, settings-page
	let currentPage = $state('home');

	import { seedDatabaseOnce } from '$lib/initWords';
	import AddWordPage from './components/AddWordPage.svelte';
	import LoadDatabaseBackup from './components/LoadDatabaseBackup.svelte';
	import CrosswordPage, { type CrosswordSettings } from './components/CrosswordPage.svelte';
	import DictionaryPage from './components/DictionaryPage.svelte';
	import type { Languages } from './components/Crossword';
	import { translations } from './components/Translations';

	let settings: CrosswordSettings = $state({
		language: 'ES',
		gridSize: 17,
		personIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13, 14, 15, 16, 17],
		partsOfSpeech: {
			verb: true,
			number: true,
			conjunction: true,
			pronoun: true,
			noun: true,
			interjection: true,
			article: true,
			expression: true,
			adjective: true,
			adverb: true
		},
		allowedTranslations: [
			{ from: 'EN', to: 'ES' },
			{ from: 'ES', to: 'EN' }
		],
		wordPoolSize: 100,
		maxFrequency: 1000,
		verbTenses: {
			PRES_IND: true,
			PRET_IND: true
		},
		allowSpaces: true,
		learnedOnly: true
	});

	let languages: Languages[] = ['ES', 'EN', 'PT'];

	async function onWordAdded() {
		words = await getWords(); // load all words from DB
		currentPage = 'home';
	}

	onMount(async () => {
		goToCrosswordSettingsPage();
		await seedDatabaseOnce(); // insert seed words if first use
		words = await getWords(); // load all words from DB
	});

	const goToAddWordPage = () => {
		currentPage = 'add-word-page';
	};

	const goToDatabaseBackupPage = () => {
		currentPage = 'database-backup-page';
	};

	const goToCrosswordPage = () => {
		currentPage = 'crossword-page';
	};

	const goToCrosswordSettingsPage = () => {
		currentPage = 'settings-page';
	};

	const goToDictionaryPage = () => {
		canLoadDictionary = true;
		currentPage = 'dictionary-page';
	};
</script>

<div class:invisible={currentPage !== 'home'}>
	<button onclick={goToAddWordPage}>Add a word</button>
	<button onclick={goToDatabaseBackupPage}>DB Backup Page</button>
	<button onclick={goToCrosswordPage}>Crossword Page</button>
	<button onclick={goToDictionaryPage}>Dictionary Page</button>
	<button onclick={goToCrosswordSettingsPage}>Crossword Settings Page</button>
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

<div class:invisible={currentPage !== 'settings-page'}>
	<div class="flex-container horizontal group">
		<label for="language-select">{translations[settings.language]['Select Language:']}</label>
		<select id="language-select" bind:value={settings.language}>
			{#each languages as language}
				<option>{language}</option>
			{/each}
		</select>
	</div>

	<div class="flex-container horizontal group">
		<label for="grid-size-input"
			>{translations[settings.language]['Select size of Crossword:']}</label
		>
		<input id="grid-size-input" bind:value={settings.gridSize} type="number" min="5" max="25" />
	</div>

	<div class="flex-container group">
		<p>{translations[settings.language]['Select word types to appear:']}</p>
		{#each Object.keys(settings.partsOfSpeech) as pos}
			<div>
				<input
					id={`${pos}-checkbox`}
					type="checkbox"
					value={pos}
					bind:checked={settings.partsOfSpeech[pos]}
				/>
				<label for={`${pos}-checkbox`}>{translations[settings.language][pos]}</label>
			</div>
		{/each}
	</div>

	<div class="flex-container horizontal group">
		<label for="freq-input"
			>{translations[settings.language]['Select maximum word frequency:']}</label
		>
		<input id="freq-input" bind:value={settings.maxFrequency} type="number" min="50" max="5000" />
		<p>{translations[settings.language]['additional freq info']}</p>
	</div>

	<div class="flex-container horizontal group">
		<input
			id={`allow-spaces-checkbox`}
			type="checkbox"
			value={'allowSpaces'}
			bind:checked={settings.allowSpaces}
		/>
		<label for={`allow-spaces-checkbox`}
			>{translations[settings.language]['allow spaces in crossword']}</label
		>
	</div>

	<div class="flex-container horizontal group">
		<input
			id={`learned-only-checkbox`}
			type="checkbox"
			value={'learnedOnly'}
			bind:checked={settings.learnedOnly}
		/>
		<label for={`allow-spaces-checkbox`}
			>{translations[settings.language]['only learned words']}</label
		>
	</div>

	<!-- <div class="flex-container horizontal group">
		<label for="word-pool-size"
			>{translations[settings.language]['Select word pool size:']}</label
		>
		<input id="word-pool-size" bind:value={settings.wordPoolSize} type="number" min="50" max="2000" />
		<p>{translations[settings.language]['additional word pool info']}</p>
	</div> -->

	<div class="flex-container horizontal">
		<button onclick={goToCrosswordPage}>{translations[settings.language]['Crossword Page']}</button>
	</div>
</div>

<div class:invisible={currentPage !== 'add-word-page'}>
	<AddWordPage {onWordAdded}></AddWordPage>
</div>

<div class:invisible={currentPage !== 'database-backup-page'}>
	<LoadDatabaseBackup onReturn={onWordAdded}></LoadDatabaseBackup>
</div>

<div class:invisible={currentPage !== 'crossword-page'}>
	<CrosswordPage
		{goToCrosswordSettingsPage}
		settings={{
			language: settings.language,
			gridSize: settings.gridSize,
			personIndices: settings.personIndices.map((it) => it),
			partsOfSpeech: {
				verb: settings.partsOfSpeech.verb,
				number: settings.partsOfSpeech.number,
				conjunction: settings.partsOfSpeech.conjunction,
				pronoun: settings.partsOfSpeech.pronoun,
				noun: settings.partsOfSpeech.noun,
				interjection: settings.partsOfSpeech.interjection,
				article: settings.partsOfSpeech.article,
				expression: settings.partsOfSpeech.expression,
				adjective: settings.partsOfSpeech.adjective,
				adverb: settings.partsOfSpeech.adverb
			},
			allowedTranslations: settings.allowedTranslations.map((it) => {
				return { to: it.to, from: it.from };
			}),
			wordPoolSize: settings.wordPoolSize,
			maxFrequency: settings.maxFrequency,
			verbTenses: {
				PRES_IND: settings.verbTenses.PRES_IND,
				PRET_IND: settings.verbTenses.PRET_IND
			},
			allowSpaces: settings.allowSpaces,
			learnedOnly: settings.learnedOnly
		}}
	></CrosswordPage>
</div>

<div class:invisible={currentPage !== 'dictionary-page'}>
	<DictionaryPage onReturn={onWordAdded} allWords={words}></DictionaryPage>
</div>

<style>
	.invisible {
		display: none;
	}

	.group {
		background-color: #00000033;
		border-radius: 8px;
		margin: 8px;
		padding: 8px;
		width: 92vw;
	}

	.flex-container {
		display: flex;
		flex-direction: column;
		flex-wrap: wrap;
	}

	.horizontal {
		flex-direction: row;
	}
</style>
