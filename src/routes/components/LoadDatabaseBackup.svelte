<script lang="ts">
	import type { Word } from '$lib/db';
	import { getWords, addWord } from '$lib/db';
	import { Conjugator } from '@jirimracek/conjugate-esp';
	import { Crossword } from './Crossword';

    let allWordz: any[] = [];

	let { onReturn } = $props();

    let fileInput: HTMLInputElement | undefined = $state();


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
		onReturn();
	}

    const downloadVocabFile = async () => {
		const link = document.createElement('a');
		const content = JSON.stringify(allWordz);
		const file = new Blob([content], { type: 'text/plain' });
		link.href = URL.createObjectURL(file);
		link.download = 'vocab.json';
		link.click();
		URL.revokeObjectURL(link.href);
	};

    const downloadVocabFileSpecial = async () => {
		const link = document.createElement('a');
		let allWords = await getWords();
		const content = JSON.stringify(allWords);
		const file = new Blob([content], { type: 'text/plain' });
		link.href = URL.createObjectURL(file);
		link.download = 'vocab.json';
		link.click();
		URL.revokeObjectURL(link.href);
	};

    const goThroughVerbs = async () => {
		const link = document.createElement('a');
		let allWords = await getWords();
        let conj = new Conjugator()
        let verbs = await conj.getVerbList()
        let contents: string[] = []
        for (let word of allWords) {
            if (word.pos === "v" && word.spanish && verbs.includes(word.spanish)) {
                let verbConjugation = await conj.conjugate(word.spanish)
                if (verbConjugation) {
                    contents.push(JSON.stringify(verbConjugation));
                }
            }
            // if (word.pos === "v" && word.english) {
            //     getConjugation()
            // }
        }
		const file = new Blob(["[" + contents.join(",\n") + "]"], { type: 'text/plain' });
		link.href = URL.createObjectURL(file);
		link.download = 'verbConj.json';
		link.click();
		URL.revokeObjectURL(link.href);
    }

    async function createCrossword() {
        let crossword = await Crossword.createWithoutWordList();
        await crossword.createCrossword();
    }

	function uploadVocabFile() {
		if (fileInput && fileInput.files) {
			const selectedFile = fileInput.files[0];
			const reader = new FileReader();
			reader.onload = (event) => {
				if (event && event.target && event.target.result) {
					const newData = JSON.parse(event.target.result.toString());
					for (let word of newData) {
						let newWord: Word = {
							english: word.english,
							portuguese: word.portuguese,
							pos: word.pos
						};
						addWord(newWord);
					}
				}
			};
			reader.readAsText(selectedFile);
		}
	}

</script>

<button onclick={downloadVocabFile}>Download</button>
	<div>
		<input type="file" bind:this={fileInput} name="fileInput" accept="json" />
		<button class="fileButton" onclick={uploadVocabFile}>Upload Vocab File</button>
	</div>
<button onclick={handleAdd}>Add Word</button>
<button onclick={goThroughVerbs}>goThroughVerbs</button>
<button onclick={createCrossword}>createCrossword</button>
<button onclick={onReturn}>Go Home</button>