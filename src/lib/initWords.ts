import { addWord, getWords } from '$lib/db';
import { seedWords, learnedVocab } from './seedWords';

export async function seedDatabaseOnce() {
	const seeded = localStorage.getItem('wordsSeeded');
	if (seeded) return; // already seeded

	// Add all seed words to IndexedDB
	for (const word of seedWords) {
		if (word.spanish && learnedVocab.includes(word.spanish)) {
			word.learned = true;
		}

		await addWord(word);
	}

	localStorage.setItem('wordsSeeded', 'true');
}