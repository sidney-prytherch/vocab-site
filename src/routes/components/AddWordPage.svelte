<script lang="ts">
	import type { Word } from '$lib/db';
	import { addWord } from '$lib/db';

	let { onWordAdded } = $props();

	let newEnglish = $state('');
	let newSpanish = $state('');
	let newPortuguese = $state('');
	let newPos = $state('n');

    async function handleAdd() {
		const word: Word = {
			english: newEnglish,
			pos: newPos
		};

		if (newSpanish) word.spanish = newSpanish;
		if (newPortuguese) word.portuguese = newPortuguese;

		await addWord(word);
		onWordAdded();
	}

</script>

<input bind:value={newEnglish} placeholder="English" />
<input bind:value={newSpanish} placeholder="Spanish (optional)" />
<input bind:value={newPortuguese} placeholder="Portuguese (optional)" />
<input bind:value={newPos} placeholder="Part of Speech" />
<button onclick={handleAdd}>Add Word</button>
<button onclick={onWordAdded}>Cancel</button>