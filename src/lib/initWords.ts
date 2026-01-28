import { addWord, getWords } from '$lib/db';
import { seedWords, loadLearnedVocabYaml } from './seedWords';

export async function seedDatabaseOnce() {
	const seeded = localStorage.getItem('wordsSeeded');
	if (seeded) return; // already seeded

	// Add all seed words to IndexedDB

	let learnedVocab = await loadLearnedVocabYaml();

	for (const word of seedWords) {
		if (word.spanish && !isNaN(learnedVocab[word.spanish])) {
			word.learned = true;
			word.weight = learnedVocab[word.spanish];
			delete learnedVocab[word.spanish]
			console.log(`${word.english.join(", ")} ~ ${word.spanish}`)
		}

		await addWord(word);
	}

	console.log(learnedVocab)

	localStorage.setItem('wordsSeeded', 'true');
}