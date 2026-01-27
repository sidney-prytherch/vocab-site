// db.ts
export interface Word {
	english: string[];
	spanish?: string;
	portuguese?: string;
	primaryEnglishIndex?: number;
	pos: string;
	nDataSp?: {gender: string, onlyPlural?: boolean};
	adjDataSp?: {};
	vDataSp?: {};
	freqIndexSpanish?: number;
	learned?: boolean;
}
export interface Settings {
	crosswordSize: number;
}
const dbName = 'vocabDB';
const storeName = 'words';
const settingsStoreName = 'settings';

export function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(dbName, 1);

		request.onupgradeneeded = () => {
			const db = request.result;
			db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
			db.createObjectStore(settingsStoreName, { keyPath: 'id', autoIncrement: true });
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export async function addWord(word: Word): Promise<void> {
	const db = await openDB();
	const tx = db.transaction(storeName, 'readwrite');
	const store = tx.objectStore(storeName);
	store.add(word);

	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.onabort = () => reject(tx.error);
	});
}

export async function getWords(): Promise<(Word & { id: number })[]> {
	const db = await openDB();
	const tx = db.transaction(storeName, 'readonly');
	const store = tx.objectStore(storeName);

	return new Promise((resolve, reject) => {
		const request = store.getAll();
		request.onsuccess = () => resolve(request.result as (Word & { id: number })[]);
		request.onerror = () => reject(request.error);
	});
}

export async function deleteWord(id: number): Promise<void> {
	const db = await openDB();
	const tx = db.transaction(storeName, 'readwrite');
	const store = tx.objectStore(storeName);
	store.delete(id);

	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.onabort = () => reject(tx.error);
	});
}

export async function clearAllWords(): Promise<void> {
	const db = await openDB();
	const tx = db.transaction(storeName, 'readwrite');
	const store = tx.objectStore(storeName);
	store.clear();

	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.onabort = () => reject(tx.error);
	});
}


export async function addSettings(settings: Settings): Promise<void> {
	const db = await openDB();
	const tx = db.transaction(settingsStoreName, 'readwrite');
	const store = tx.objectStore(settingsStoreName);
	store.add(settings);

	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.onabort = () => reject(tx.error);
	});
}

export async function getSettings(): Promise<(Settings & { id: number })[]> {
	const db = await openDB();
	const tx = db.transaction(settingsStoreName, 'readonly');
	const store = tx.objectStore(settingsStoreName);

	return new Promise((resolve, reject) => {
		const request = store.getAll();
		request.onsuccess = () => resolve(request.result as (Settings & { id: number })[]);
		request.onerror = () => reject(request.error);
	});
}