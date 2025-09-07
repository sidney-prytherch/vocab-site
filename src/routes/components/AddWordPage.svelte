<script lang="ts">
	import type { Word } from '$lib/db';
	import { addWord } from '$lib/db';

	let { onWordAdded } = $props();

	let newEnglish = $state('');
	let newSpanish = $state('');
	let newPortuguese = $state('');
	let newSpanishGender = $state('f');
	let newPortugueseGender = $state('f');
	let newPos = $state('n');

    async function handleAdd() {
		const word: Word = {
			english: newEnglish,
			pos: newPos
		};

		if (newSpanish) word.spanish = { word: newSpanish, gender: newSpanishGender };
		if (newPortuguese) word.portuguese = { word: newPortuguese, gender: newPortugueseGender };

		await addWord(word);
		onWordAdded();
	}

</script>

<input bind:value={newEnglish} placeholder="English" />
<input bind:value={newSpanish} placeholder="Spanish (optional)" />
<input bind:value={newPortuguese} placeholder="Portuguese (optional)" />
<input bind:value={newSpanishGender} placeholder="Spanish (optional)" />
<input bind:value={newPortugueseGender} placeholder="Portuguese (optional)" />
<input bind:value={newPos} placeholder="Part of Speech" />
<button onclick={handleAdd}>Add Word</button>
<button onclick={onWordAdded}>Cancel</button>