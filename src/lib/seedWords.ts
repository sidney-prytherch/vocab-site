import type { Word } from '$lib/db';
import vocabulary from '../routes/vocabulary.json'

export const seedWords: Word[] = vocabulary.words;