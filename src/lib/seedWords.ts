import type { Word } from '$lib/db';
import vocabulary from '../routes/vocabulary.json'
import learnedVocabulary from '../routes/learnedVocab.json'

export const seedWords: Word[] = vocabulary.words;
export const learnedVocab: String[] = learnedVocabulary.vocab;