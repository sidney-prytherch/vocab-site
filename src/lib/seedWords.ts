import type { Word } from '$lib/db';

export const seedWords: Word[] = [
	{
		english: 'tree{s}',
		spanish: { word: 'árbol{es}', gender: 'm' },
		portuguese: { word: 'árvore{s}', gender: 'f' },
		pos: 'n'
	},
	{
		english: 'mother{s}',
		spanish: { word: 'madre{s}', gender: 'f' },
		portuguese: { word: 'mãe{s}', gender: 'f' },
		pos: 'n'
	}
];