import { addWord, getWords } from '$lib/db';
import { seedWords, loadLearnedVocabYaml } from './seedWords';

export async function seedDatabaseOnce() {
	const seeded = localStorage.getItem('wordsSeeded');
	if (seeded) return; // already seeded

	// Add all seed words to IndexedDB

	let learnedVocab = await loadLearnedVocabYaml();

	const nonFoundWords = Object.keys(learnedVocab)
	for (const word of seedWords) {
		if (word.spanish && !isNaN(learnedVocab[word.spanish])) {
			word.learned = true;
			word.weight = learnedVocab[word.spanish];
			if (nonFoundWords.includes(word.spanish)) {
				nonFoundWords.splice(nonFoundWords.indexOf(word.spanish), 1);
			}
			console.log(`${word.english.join(", ")} ~ ${word.spanish}`)
		}

		await addWord(word);
	}

	console.log(nonFoundWords)

	localStorage.setItem('wordsSeeded', 'true');
}