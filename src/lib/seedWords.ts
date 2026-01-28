import type { Word } from '$lib/db';
import vocabulary from '../routes/vocabulary.json'
import { load } from 'js-yaml';

type WordConfidenceValue = {[key: string]: number}
type LearnedVocab =  {vocab: WordConfidenceValue}

export async function loadLearnedVocabYaml(): Promise<WordConfidenceValue> {
    const res = await fetch('learnedVocab.yml');
    const text = await res.text();
    return (load(text) as LearnedVocab).vocab;
}


export const seedWords: Word[] = vocabulary.words;
// export const learnedVocab: WordConfidenceValue = (await loadYaml()).vocab;