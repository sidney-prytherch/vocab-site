<script lang="ts">
	import CrosswordWorker from '$lib/crosswordWorker.ts?worker';
	import ants from '$lib/assets/ant64 orig.gif';
	import esToEn from '$lib/assets/mex us.png';
	import enToEs from '$lib/assets/us mex.png';

	import type { GridData, Languages } from './Crossword';
	import { on } from 'svelte/events';
	import { onMount } from 'svelte';
	import { deserialize } from '$app/forms';

	type CrosswordGridCell = {
		value: string;
		acrossOrigin: { row: number; col: number } | null;
		downOrigin: { row: number; col: number } | null;
		downCells: { row: number; col: number }[] | null;
		acrossCells: { row: number; col: number }[] | null;
		downLanguages?: { from: Languages; to: Languages };
		acrossLanguages?: { from: Languages; to: Languages };
		downPartOfSpeech?: string;
		downVerbTense?: string;
		acrossPartOfSpeech?: string;
		acrossVerbTense?: string;
		acrossCellsIndex: number;
		downCellsIndex: number;
		acrossHint: string | null;
		downHint: string | null;
		acrossAnswer: string | null;
		downAnswer: string | null;
		button: HTMLButtonElement | null;
		userInput: string;
		highlight: 'none' | 'semi' | 'full' | string;
		acrossHelp: string;
		downHelp: string;
	};

	const tenseCodeMap: { [key: string]: string } = {
		PRES_IND: 'Present tense (indicative)',
		PRET_IND: 'Present tense (indicative)'
	};

	const partOfSpeechCodeMap: { [key: string]: string } = {
		v: 'Verb',
		num: 'Number',
		conj: 'Conjunction',
		pron: 'Pronoun',
		n: 'Noun',
		interj: 'Interjection',
		art: 'Article',
		expr: 'Expression',
		adj: 'Adjective',
		adv: 'Adverb',
		prep: 'Preposition'
	};

	let currentCells: CrosswordGridCell[] = $state([]);
	let cwWorker;

	let useHorizontalDisplay: boolean = $state(true);
	let currentHint: string = $state('');
	let currentHelp: string[] = $state([]);
	let currentAnswer: string = $state('');
	let currentAnswerWords: number = $derived(
		currentAnswer.split(' ').filter((it) => it.length > 0).length
	);
	let currentPartOfSpeech: string = $state('');
	let currentVerbTense: string = $state('');
	let hintLanguage: Languages = $state('EN');
	let answerLanguage: Languages = $state('EN');

	let selectedRow: number = $state(-1);
	let selectedCol: number = $state(-1);
	let isGoingAcross: boolean = $state(true);
	let crosswordGrid: CrosswordGridCell[][] = $state([]);
	let loading = $state(false);
	let hiddenInput: HTMLInputElement | null = $state(null)

	async function createCrossword() {
		loading = true;
		crosswordGrid = [];
		currentCells = [];
		currentHint = '';
		selectedRow = -1;
		selectedCol = -1;

		cwWorker = new CrosswordWorker();
		cwWorker.postMessage(0);
		cwWorker.onmessage = (event) => {
			let crosswordData: {
				crosswordGridData: GridData[][][];
				letterGrid: string[][];
			} = event.data;
			crosswordGrid = new Array(crosswordData.letterGrid.length).fill(0).map((_, rowIndex) =>
				new Array(crosswordData.letterGrid.length).fill(0).map((_, colIndex) => {
					let char = crosswordData.letterGrid[rowIndex][colIndex];
					return {
						value: char === '░' ? '▓' : char,
						acrossOrigin: null,
						downOrigin: null,
						downCells: null,
						acrossCells: null,
						downCellsIndex: -1,
						acrossCellsIndex: -1,
						acrossHint: null,
						downHint: null,
						button: null,
						userInput: '',
						acrossAnswer: null,
						downAnswer: null,
						highlight: 'none',
						acrossHelp: '',
						downHelp: ''
					};
				})
			);
			crosswordData.crosswordGridData.forEach((row, rowIndex) => {
				row.forEach((cell, colIndex) => {
					if (cell[0].answer.length > 0) {
						crosswordGrid[rowIndex][colIndex].acrossCells = [];
						for (let i = 0; i < cell[0].answer.length; i++) {
							crosswordGrid[rowIndex][colIndex + i].acrossOrigin = {
								row: rowIndex,
								col: colIndex
							};
							crosswordGrid[rowIndex][colIndex].acrossCells.push({
								row: rowIndex,
								col: colIndex + i
							});
							crosswordGrid[rowIndex][colIndex + i].acrossCells =
								crosswordGrid[rowIndex][colIndex].acrossCells;
							crosswordGrid[rowIndex][colIndex + i].acrossHint = cell[0].hint;
							crosswordGrid[rowIndex][colIndex + i].acrossAnswer = cell[0].answer;
							crosswordGrid[rowIndex][colIndex + i].acrossCellsIndex = i;
							crosswordGrid[rowIndex][colIndex + i].acrossLanguages = {
								from: cell[0].hintLanguage,
								to: cell[0].answerLanguage
							};
							if (cell[0].partOfSpeech) {
								crosswordGrid[rowIndex][colIndex + i].acrossPartOfSpeech = cell[0].partOfSpeech;
							}
							if (cell[0].verbTense && cell[0].verbTense.length > 0) {
								crosswordGrid[rowIndex][colIndex + i].acrossVerbTense = cell[0].verbTense;
							}
						}
					}
					if (cell[1].answer.length > 0) {
						crosswordGrid[rowIndex][colIndex].downCells = [];
						for (let i = 0; i < cell[1].answer.length; i++) {
							crosswordGrid[rowIndex + i][colIndex].downOrigin = { row: rowIndex, col: colIndex };
							crosswordGrid[rowIndex][colIndex].downCells.push({
								row: rowIndex + i,
								col: colIndex
							});
							crosswordGrid[rowIndex + i][colIndex].downCells =
								crosswordGrid[rowIndex][colIndex].downCells;
							crosswordGrid[rowIndex + i][colIndex].downHint = cell[1].hint;
							crosswordGrid[rowIndex + i][colIndex].downAnswer = cell[1].answer;
							crosswordGrid[rowIndex + i][colIndex].downCellsIndex = i;
							crosswordGrid[rowIndex + i][colIndex].downLanguages = {
								from: cell[1].hintLanguage,
								to: cell[1].answerLanguage
							};
							if (cell[1].partOfSpeech) {
								crosswordGrid[rowIndex + i][colIndex].downPartOfSpeech = cell[1].partOfSpeech;
							}
							if (cell[1].verbTense && cell[1].verbTense.length > 0) {
								crosswordGrid[rowIndex + i][colIndex].downVerbTense = cell[1].verbTense;
							}
						}
					}
				});
			});
			clickCrosswordBox(0, 0);
			loading = false;
		};
	}

	function giveHint() {
		let currentCell = crosswordGrid[selectedRow][selectedCol];
		if (isGoingAcross) {
			if (currentCell.acrossOrigin === null) {
				return;
			}
			let originRow = currentCell.acrossOrigin.row;
			let originCol = currentCell.acrossOrigin.col;
			let originCell = crosswordGrid[originRow][originCol];
			if (originCell.acrossHelp === '') {
				originCell.acrossHelp = currentAnswer.replaceAll(/[^ ]/g, '_');
			} else if (!/^[^_]/g.test(originCell.acrossHelp)) {
				originCell.acrossHelp = replaceStringLetter(
					originCell.acrossHelp,
					originCell.acrossAnswer?.charAt(0) || '_',
					0
				);
			} else if (originCell.acrossHelp.indexOf('_') > -1) {
				let index = originCell.acrossHelp.indexOf(
					'_',
					Math.floor(Math.random() * originCell.acrossHelp.length)
				);
				if (index === -1) {
					index = originCell.acrossHelp.indexOf('_');
				}
				originCell.acrossHelp = replaceStringLetter(
					originCell.acrossHelp,
					originCell.acrossAnswer?.charAt(index) || '_',
					index
				);
			}
			currentHelp = formatHelp(originCell.acrossHelp);
		} else {
			if (currentCell.downOrigin === null) {
				return;
			}
			let originRow = currentCell.downOrigin.row;
			let originCol = currentCell.downOrigin.col;
			let originCell = crosswordGrid[originRow][originCol];
			if (originCell.downHelp === '') {
				originCell.downHelp = currentAnswer.replaceAll(/[^ ]/g, '_');
			} else if (!/^[^_]/g.test(originCell.downHelp)) {
				originCell.downHelp = replaceStringLetter(
					originCell.downHelp,
					originCell.downAnswer?.charAt(0) || '_',
					0
				);
			} else if (originCell.downHelp.indexOf('_') > -1) {
				let index = originCell.downHelp.indexOf(
					'_',
					Math.floor(Math.random() * originCell.downHelp.length)
				);
				if (index === -1) {
					index = originCell.downHelp.indexOf('_');
				}
				originCell.downHelp = replaceStringLetter(
					originCell.downHelp,
					originCell.downAnswer?.charAt(index) || '_',
					index
				);
			}
			currentHelp = formatHelp(originCell.downHelp);
		}
	}

	function formatHelp(help: string) {
		return help.split('');
	}

	function replaceStringLetter(fullString: string, char: string, index: number) {
		return fullString.replace(new RegExp(`(?<=^.{${index}})_`, 'g'), char);
	}

	function clickCrosswordBox(rowIndex: number, colIndex: number) {
		if (hiddenInput) {
			hiddenInput.focus()
		}
		currentCells.forEach((cell) => {
			cell.highlight = 'none';
		});
		if (selectedRow === rowIndex && selectedCol === colIndex) {
			if (
				crosswordGrid[rowIndex][colIndex].acrossOrigin !== null &&
				crosswordGrid[rowIndex][colIndex].downOrigin !== null
			) {
				isGoingAcross = !isGoingAcross;
			}
		} else {
			if (
				crosswordGrid[rowIndex][colIndex].acrossOrigin !== null &&
				crosswordGrid[rowIndex][colIndex].downOrigin === null
			) {
				isGoingAcross = true;
			} else if (
				crosswordGrid[rowIndex][colIndex].acrossOrigin === null &&
				crosswordGrid[rowIndex][colIndex].downOrigin !== null
			) {
				isGoingAcross = false;
			}
			selectedCol = colIndex;
			selectedRow = rowIndex;
		}
		let selectedCell = crosswordGrid[rowIndex][colIndex];
		let newOrigin: CrosswordGridCell | null = null;
		if (isGoingAcross && selectedCell.acrossOrigin) {
			newOrigin = crosswordGrid[selectedCell.acrossOrigin.row][selectedCell.acrossOrigin.col];
		} else if (!isGoingAcross && selectedCell.downOrigin) {
			newOrigin = crosswordGrid[selectedCell.downOrigin.row][selectedCell.downOrigin.col];
		} else {
			console.error('something went wrong');
			console.log(crosswordGrid);
			return;
		}
		let newSemiSelectedCells = isGoingAcross ? newOrigin.acrossCells : newOrigin.downCells;
		if (!newSemiSelectedCells) {
			console.error('something went wrong');
			console.log(crosswordGrid);
			return;
		}
		currentCells = [];
		newSemiSelectedCells.forEach((cellRowAndCol) => {
			crosswordGrid[cellRowAndCol.row][cellRowAndCol.col].highlight = 'semi';
			currentCells.push(crosswordGrid[cellRowAndCol.row][cellRowAndCol.col]);
		});
		crosswordGrid[rowIndex][colIndex].highlight = 'full';
		if (isGoingAcross) {
			currentHint = crosswordGrid[rowIndex][colIndex].acrossHint || '';
			if (crosswordGrid[rowIndex][colIndex].acrossLanguages) {
				[hintLanguage, answerLanguage] = [
					crosswordGrid[rowIndex][colIndex].acrossLanguages.from,
					crosswordGrid[rowIndex][colIndex].acrossLanguages.to
				];
			}
			currentPartOfSpeech = crosswordGrid[rowIndex][colIndex].acrossPartOfSpeech || '';
			currentVerbTense = crosswordGrid[rowIndex][colIndex].acrossVerbTense || '';
			currentAnswer = crosswordGrid[rowIndex][colIndex].acrossAnswer || '';
			currentHelp = formatHelp(newOrigin.acrossHelp);
		} else {
			currentHint = crosswordGrid[rowIndex][colIndex].downHint || '';
			if (crosswordGrid[rowIndex][colIndex].downLanguages) {
				[
					crosswordGrid[rowIndex][colIndex].downLanguages.from,
					crosswordGrid[rowIndex][colIndex].downLanguages.to
				];
			}
			currentPartOfSpeech = crosswordGrid[rowIndex][colIndex].downPartOfSpeech || '';
			currentVerbTense = crosswordGrid[rowIndex][colIndex].downVerbTense || '';
			currentAnswer = crosswordGrid[rowIndex][colIndex].downAnswer || '';
			currentHelp = formatHelp(newOrigin.downHelp);
		}
		console.log({ hintLanguage, answerLanguage });

		console.log(
			isGoingAcross
				? crosswordGrid[rowIndex][colIndex].acrossAnswer
				: crosswordGrid[rowIndex][colIndex].downAnswer
		);
	}

	onMount(() => {
		useHorizontalDisplay = window.innerHeight < window.innerWidth * 1.2;
		on(window, 'resize', (e) => {
			useHorizontalDisplay = window.innerHeight < window.innerWidth * 1.2;
		});
		on(window, 'keydown', (e) => {
			if (selectedRow === -1 || selectedCol === -1) {
				return;
			}
			console.log(e.code);
			let currentCell = crosswordGrid[selectedRow][selectedCol];
			if (e.code === 'Space') {
				e.preventDefault();
				currentCell.userInput = ' ';
				goToNext(selectedRow, selectedCol, true);
				return;
			}
			if (
				(e.code === 'Backspace' && currentCell.userInput === '') ||
				(isGoingAcross && e.code === 'ArrowLeft') ||
				(!isGoingAcross && e.code === 'ArrowUp')
			) {
				goToNext(selectedRow, selectedCol, false);
				return;
			}
			if (e.code === 'Backspace') {
				currentCell.userInput = '';
				return;
			}
			if (
				(isGoingAcross && e.code === 'ArrowRight') ||
				(!isGoingAcross && e.code === 'ArrowDown')
			) {
				goToNext(selectedRow, selectedCol, true);
				return;
			}

			if (currentCell.userInput === '`') {
				if (e.key === 'e') {
					currentCell.userInput = 'è';
				} else if (e.key === 'i') {
					currentCell.userInput = 'ì';
				} else if (e.key === 'a') {
					currentCell.userInput = 'à';
				} else if (e.key === 'o') {
					currentCell.userInput = 'ò';
				} else if (e.key === 'u') {
					currentCell.userInput = 'ù';
				} else if (e.key.length === 1) {
					currentCell.userInput = e.key;
				}
				goToNext(selectedRow, selectedCol, true);
				return;
			} else if (currentCell.userInput === '´') {
				if (e.key === 'e') {
					currentCell.userInput = 'é';
				} else if (e.key === 'i') {
					currentCell.userInput = 'í';
				} else if (e.key === 'a') {
					currentCell.userInput = 'á';
				} else if (e.key === 'o') {
					currentCell.userInput = 'ó';
				} else if (e.key === 'u') {
					currentCell.userInput = 'ú';
				} else if (e.key.length === 1) {
					currentCell.userInput = e.key;
				}
				goToNext(selectedRow, selectedCol, true);
				return;
			} else if (currentCell.userInput === 'ˆ') {
				if (e.key === 'e') {
					currentCell.userInput = 'ê';
				} else if (e.key === 'i') {
					currentCell.userInput = 'î';
				} else if (e.key === 'a') {
					currentCell.userInput = 'â';
				} else if (e.key === 'o') {
					currentCell.userInput = 'ô';
				} else if (e.key === 'u') {
					currentCell.userInput = 'û';
				} else if (e.key.length === 1) {
					currentCell.userInput = e.key;
				}
				goToNext(selectedRow, selectedCol, true);
				return;
			} else if (currentCell.userInput === '˜') {
				if (e.key === 'n') {
					currentCell.userInput = 'ñ';
				} else if (e.key === 'o') {
					currentCell.userInput = 'õ';
				} else if (e.key === 'a') {
					currentCell.userInput = 'ã';
				} else if (e.key.length === 1) {
					currentCell.userInput = e.key;
				}
				goToNext(selectedRow, selectedCol, true);
				return;
			}
			if (e.key.length === 1) {
				currentCell.userInput = e.key;
				goToNext(selectedRow, selectedCol, true);
			}
		});
	});

	function goToNext(rowIndex: number, charIndex: number, forward: boolean) {
		let currentCell = crosswordGrid[rowIndex][charIndex];
		let changeInPosition = forward ? 1 : -1;
		let nextRow = rowIndex;
		let nextCol = charIndex;
		let nextInList = currentCell;
		if (isGoingAcross) {
			if (currentCell.acrossCells) {
				if (
					(forward && currentCell.acrossCellsIndex === currentCell.acrossCells.length - 1) ||
					(!forward && currentCell.acrossCellsIndex === 0)
				) {
					return;
				}
				nextInList.highlight = 'semi';
				nextInList = crosswordGrid[rowIndex][charIndex + changeInPosition];
				nextCol = charIndex + changeInPosition;
			}
		} else {
			if (currentCell.downCells) {
				if (
					(forward && currentCell.downCellsIndex === currentCell.downCells.length - 1) ||
					(!forward && currentCell.downCellsIndex === 0)
				) {
					return;
				}
				nextInList.highlight = 'semi';
				nextInList = crosswordGrid[rowIndex + changeInPosition][charIndex];
				nextRow = rowIndex + changeInPosition;
			}
		}
		nextInList.highlight = 'full';
		selectedRow = nextRow;
		selectedCol = nextCol;
		return nextInList;
	}
</script>

<img alt="loading" class="loading" src={ants} class:invisible={!loading} />
<div class="flex-container" class:horizontal={useHorizontalDisplay}>
	{#if crosswordGrid.length > 0}
		<div class="crossword" class:wide-window-crossword={useHorizontalDisplay}>
			{#each crosswordGrid as row, rowIndex}
				<div class="crossword-row">
					{#each row as cell, colIndex}
						{#if cell.value === '▓'}
							<button class="disabled" id="{rowIndex}~{colIndex}">▓</button>
						{:else}
							<button
								bind:this={cell.button}
								class={cell.highlight}
								onclick={() => {
									clickCrosswordBox(rowIndex, colIndex);
								}}
								>{cell.userInput}
							</button>
						{/if}
					{/each}
				</div>
			{/each}
		</div>
	{/if}
	<div class="flex-container">
		<h2>
			<u>{currentHint}</u>
			{currentAnswerWords > 1
				? ` ~ ${currentAnswerWords} Words`
				: currentAnswerWords === 1
					? ` ~ ${currentAnswerWords} Word`
					: ''}
		</h2>
		<h3>
			{partOfSpeechCodeMap[currentPartOfSpeech]}
			{tenseCodeMap[currentVerbTense] && tenseCodeMap[currentVerbTense].length > 0
				? `- ${tenseCodeMap[currentVerbTense]}`
				: ''}
		</h3>
		<button class:invisible={crosswordGrid.length == 0 || (currentHelp.length > 0 && currentHelp.indexOf("_") > -1)} onclick={giveHint}
			>{currentHelp.length === 0 ? 'U' : 'Still u'}nsure? click here!</button
		>
		<div class="horizontal flex-container">
			{#each currentHelp as letter}
				<h3 class="help-letter" class:help-space={letter === " "}>{letter}</h3>
			{/each}
		</div>
		{#if hintLanguage === 'ES' && answerLanguage === 'EN'}
			<img alt="Es -> En" src={esToEn} />
		{/if}
		{#if hintLanguage === 'EN' && answerLanguage === 'ES'}
			<img alt="En -> Es" src={enToEs} />
		{/if}
	</div>
</div>
<br />
<button onclick={createCrossword} disabled={loading}>createCrossword</button>
<input bind:this={hiddenInput} type="text" value="" maxlength="1" />

<style>
	input {
		visibility: hidden;
	}

	.help-letter {
		padding-right: 6px;
	}

	.help-space {
		padding-right: 18px;
	}

	.flex-container {
		display: flex;
		flex-direction: column;
	}

	.horizontal {
		flex-direction: row;
	}

	.invisible {
		visibility: hidden;
	}

	.crossword-row {
		width: 100%;
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		flex-grow: 1;
		align-items: stretch;
	}

	img {
		max-width: 33vw;
		padding-top: 16px;
	}

	.loading {
		position: absolute;
		right: 0;
		bottom: 0;
		max-height: 33vw;
		max-width: 33vw;
	}

	.disabled {
		background-color: black;
	}

	.crossword-row * {
		border: 1px black solid;
		flex-basis: 100px;
		padding: 0;
		margin: 0;
	}

	.correct-semi {
		background-color: rgb(161, 235, 161);
	}

	.correct-full {
		background-color: rgb(105, 222, 105);
	}

	.incorrect-semi {
		background-color: lightpink;
	}

	.incorrect-full {
		background-color: rgb(255, 101, 101);
	}

	.semi {
		background-color: lightblue;
	}

	.full {
		background-color: lightskyblue;
	}

	.white-square {
		text-align: center;
	}

	.focused {
		background-color: lightskyblue;
		outline: none;
	}

	.crossword {
		width: 96vw;
		height: 96vw;
		min-height: 500px;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.wide-window-crossword {
		width: 40vw;
		height: 40vw;
		padding-right: 32px;
	}
</style>
