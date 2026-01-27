<script lang="ts">
	import CrosswordWorker from '$lib/crosswordWorker.ts?worker';
	import ants from '$lib/assets/ant64 orig.gif';
	import esToEn from '$lib/assets/mex us.png';
	import enToEs from '$lib/assets/us mex.png';
	import left from '$lib/assets/left-arrow.svg';
	import nextClue from '$lib/assets/next.svg';
	import switchOrientation from '$lib/assets/switchAcrossAndDown.svg';
	import checkLetters from '$lib/assets/checkAnswers.svg';

	import type { GridData, Languages } from './Crossword';
	import { on } from 'svelte/events';
	import { onMount } from 'svelte';
	import { translations } from './Translations';

	export type CrosswordSettings = {
		gridSize: number;
		language: Languages;
		personIndices: number[];
		partsOfSpeech: {
			[key: string]: boolean
			// "verb": boolean;
			// "number": boolean;
			// "conjunction": boolean;
			// "pronoun": boolean;
			// "noun": boolean;
			// "interjection": boolean;
			// "article": boolean;
			// "expression": boolean;
			// "adjective": boolean;
			// "adverb": boolean;
		},
		allowedTranslations: {from: Languages, to: Languages}[];
		wordPoolSize: number;
		maxFrequency: number;
		verbTenses: {
			[key: string]: boolean
		},
		allowSpaces: boolean,
		learnedOnly: boolean
	};

	let { settings, goToCrosswordSettingsPage }: { settings: CrosswordSettings, goToCrosswordSettingsPage: () => void } = $props();

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
		// button: HTMLButtonElement | null;
		input: HTMLInputElement | null;
		userInput: string;
		highlight: 'none' | 'semi' | 'full' | string;
		acrossHelp: string;
		downHelp: string;
		downWordCount: number;
		acrossWordCount: number;
	};

	let tenseCodeMap: { [key: string]: string } = $derived({
		PRES_IND: translations[settings.language]['present (indicative)'],
		PRET_IND: translations[settings.language]['past (indicative)']
	});

	let partOfSpeechCodeMap: { [key: string]: string } = $derived({
		v: translations[settings.language]['verb'],
		num: translations[settings.language]['number'],
		conj: translations[settings.language]['conjunction'],
		pron: translations[settings.language]['pronoun'],
		n: translations[settings.language]['noun'],
		interj: translations[settings.language]['interjection'],
		art: translations[settings.language]['article'],
		expr: translations[settings.language]['expression'],
		adj: translations[settings.language]['adjective'],
		adv: translations[settings.language]['adverb'],
		prep: translations[settings.language]['preposition']
	});

	const incorrectAnimation = [
		{ backgroundColor: 'rgb(230, 108, 128)' },
		{ backgroundColor: 'rgb(255, 255, 255)' }
	];

	const correctAnimation = [
		{ backgroundColor: 'rgb(108, 230, 108)' },
		{ backgroundColor: 'rgb(255, 255, 255)' }
	];

	const incorrectAnimationToSemi = [
		{ backgroundColor: 'rgb(230, 108, 128)' },
		{ backgroundColor: 'rgb(173, 216, 230)' }
	];

	const correctAnimationToSemi = [
		{ backgroundColor: 'rgb(108, 230, 108)' },
		{ backgroundColor: 'rgb(173, 216, 230)' }
	];

	const incorrectAnimationToFull = [
		{ backgroundColor: 'rgb(230, 108, 128)' },
		{ backgroundColor: 'rgb(135, 216, 230)' }
	];

	const correctAnimationToFull = [
		{ backgroundColor: 'rgb(108, 230, 108)' },
		{ backgroundColor: 'rgb(135, 216, 230)' }
	];

	const animationTiming = {
		duration: 5000,
		iterations: 1
	};

	const fastAnimationTiming = {
		duration: 2000,
		iterations: 1
	};

	let currentCells: CrosswordGridCell[] = $state([]);
	let cwWorker;

	let useHorizontalDisplay: boolean = $state(true);
	let currentHint: string = $state('');
	let currentHelp: string[] = $state([]);
	let currentAnswer: string = $state('');
	let currentAnswerWords: number = $state(0);
	let currentPartOfSpeech: string = $state('');
	let currentVerbTense: string = $state('');
	let hintLanguage: Languages = $state('EN');
	let answerLanguage: Languages = $state('EN');

	let selectedRow: number = $state(-1);
	let selectedCol: number = $state(-1);
	let isGoingAcross: boolean = $state(true);
	let crosswordGrid: CrosswordGridCell[][] = $state([]);
	let loading = $state(false);
	let originCells: { row: number; col: number; isAcross: boolean }[] = $state([]);
	let currentOriginCellIndex = -1;

	function switchDirection() {
		clickCrosswordBox(selectedRow, selectedCol, null);
	}

	function goToNextOrigin() {
		currentOriginCellIndex = (currentOriginCellIndex + 1) % originCells.length;
		let origin = originCells[currentOriginCellIndex];
		clickCrosswordBox(origin.row, origin.col, origin.isAcross);
	}

	function goToPreviousOrigin() {
		currentOriginCellIndex = (currentOriginCellIndex + originCells.length - 1) % originCells.length;
		let origin = originCells[currentOriginCellIndex];
		clickCrosswordBox(origin.row, origin.col, origin.isAcross);
	}

	function checkAnswers() {
		crosswordGrid.forEach((row) => {
			row.forEach((cell) => {
				if (!cell.input) {
					return;
				}
				if (cell.userInput === cell.value) {
					if (cell.highlight === 'none') {
						cell.input.animate(correctAnimation, animationTiming);
					} else if (cell.highlight === 'semi') {
						cell.input.animate(correctAnimationToSemi, fastAnimationTiming);
					} else {
						cell.input.animate(correctAnimationToFull, fastAnimationTiming);
					}
				} else {
					if (cell.highlight === 'none') {
						cell.input.animate(incorrectAnimation, animationTiming);
					} else if (cell.highlight === 'semi') {
						cell.input.animate(incorrectAnimationToSemi, fastAnimationTiming);
					} else {
						cell.input.animate(incorrectAnimationToFull, fastAnimationTiming);
					}
				}
			});
		});
		crosswordGrid[selectedRow][selectedCol].input?.focus();
	}

	async function createCrossword() {
		if (crosswordGrid.length > 0) {
			let text = translations[settings.language]["Are you sure?"];
			if (!confirm(text)) {
				return;
			}
		}
		
		loading = true;
		crosswordGrid = [];
		currentCells = [];
		currentHint = '';
		selectedRow = -1;
		selectedCol = -1;

		cwWorker = new CrosswordWorker();
		console.log(settings);
		cwWorker.postMessage(settings);
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
						input: null,
						userInput: ' ',
						acrossAnswer: null,
						downAnswer: null,
						highlight: 'none',
						acrossHelp: '',
						downHelp: '',
						acrossWordCount: 0,
						downWordCount: 0
					};
				})
			);
			originCells = [];
			crosswordData.crosswordGridData.forEach((row, rowIndex) => {
				row.forEach((cell, colIndex) => {
					if (cell[0].answer.length > 0) {
						originCells.push({ row: rowIndex, col: colIndex, isAcross: true });
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
							crosswordGrid[rowIndex][colIndex + i].acrossWordCount = cell[0].wordCount;
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
						originCells.push({ row: rowIndex, col: colIndex, isAcross: false });
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
							crosswordGrid[rowIndex + i][colIndex].downWordCount = cell[1].wordCount;
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
			loading = false;
			clickCrosswordBox(0, 0, null);
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

	function clickCrosswordBox(rowIndex: number, colIndex: number, across?: boolean | null) {
		currentCells.forEach((cell) => {
			cell.highlight = 'none';
			cell.input?.getAnimations().forEach((it) => it.cancel());
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
		if (across !== null) {
			isGoingAcross = !!across;
		}
		let selectedCell = crosswordGrid[rowIndex][colIndex];
		let newOrigin: CrosswordGridCell | null = null;
		let originRow: number = 0;
		let originCol: number = 0;
		if (isGoingAcross && selectedCell.acrossOrigin) {
			newOrigin = crosswordGrid[selectedCell.acrossOrigin.row][selectedCell.acrossOrigin.col];
			originRow = selectedCell.acrossOrigin.row;
			originCol = selectedCell.acrossOrigin.col;
			currentAnswerWords = selectedCell.acrossWordCount;
		} else if (!isGoingAcross && selectedCell.downOrigin) {
			newOrigin = crosswordGrid[selectedCell.downOrigin.row][selectedCell.downOrigin.col];
			originRow = selectedCell.downOrigin.row;
			originCol = selectedCell.downOrigin.col;
			currentAnswerWords = selectedCell.downWordCount;
		} else {
			console.error('something went wrong');
			console.log(crosswordGrid);
			return;
		}
		currentOriginCellIndex = originCells.findIndex(
			(it) => it.col === originCol && it.row === originRow && it.isAcross === isGoingAcross
		);
		let newSemiSelectedCells = isGoingAcross ? newOrigin.acrossCells : newOrigin.downCells;
		if (!newSemiSelectedCells) {
			console.error('something went wrong');
			console.log(crosswordGrid);
			return;
		}
		currentCells = [];
		newSemiSelectedCells.forEach((cellRowAndCol) => {
			crosswordGrid[cellRowAndCol.row][cellRowAndCol.col].highlight = 'semi';
			crosswordGrid[cellRowAndCol.row][cellRowAndCol.col].input
				?.getAnimations()
				.forEach((it) => it.cancel());
			currentCells.push(crosswordGrid[cellRowAndCol.row][cellRowAndCol.col]);
		});
		crosswordGrid[rowIndex][colIndex].highlight = 'full';
		crosswordGrid[rowIndex][colIndex].input?.focus();
		crosswordGrid[rowIndex][colIndex].input?.setSelectionRange(1, 1);
		crosswordGrid[rowIndex][colIndex].input?.getAnimations().forEach((it) => it.cancel());
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
	}

	onMount(() => {
		useHorizontalDisplay = window.innerWidth > 1000;
		on(window, 'resize', (e) => {
			useHorizontalDisplay = window.innerWidth > 1000;
		});
	});

	function inputChange() {
		if (selectedRow === -1 || selectedCol === -1) {
			return;
		}
		let currentCell = crosswordGrid[selectedRow][selectedCol];
		if (!currentCell.input) {
			return;
		}
		let value = currentCell.input.value.toUpperCase();
		let previousInputValue = currentCell.userInput;
		currentCell.userInput = value;
		if (value.length === 0) {
			currentCell.input.value = currentCell.userInput = ' ';
			if (previousInputValue === ' ') {
				goToNext(selectedRow, selectedCol, false);
			}
			return;
		}
		value = value.trim();
		if (value === '') {
			currentCell.input.value = currentCell.userInput = ' ';
			goToNext(selectedRow, selectedCol, true);
			return;
		}
		currentCell.input.value = currentCell.userInput = value;
		if (value.length === 1) {
			if (['`', '´', '˜', 'ˆ', ','].includes(value)) {
				return;
			}
			goToNext(selectedRow, selectedCol, true);
			return;
		} else {
			if (value === '`E' || value == 'E`') {
				currentCell.input.value = currentCell.userInput = 'È';
			} else if (value === '`A' || value == 'A`') {
				currentCell.input.value = currentCell.userInput = 'À';
			} else if (value === '`I' || value == 'I`') {
				currentCell.input.value = currentCell.userInput = 'Ì';
			} else if (value === '`O' || value == 'O`') {
				currentCell.input.value = currentCell.userInput = 'Ò';
			} else if (value === '`U' || value == 'U`') {
				currentCell.input.value = currentCell.userInput = 'Ù';
			} else if (value === '´E' || value == 'E´') {
				currentCell.input.value = currentCell.userInput = 'É';
			} else if (value === '´A' || value == 'A´') {
				currentCell.input.value = currentCell.userInput = 'Á';
			} else if (value === '´I' || value == 'I´') {
				currentCell.input.value = currentCell.userInput = 'Í';
			} else if (value === '´O' || value == 'O´') {
				currentCell.input.value = currentCell.userInput = 'Ó';
			} else if (value === '´U' || value == 'U´') {
				currentCell.input.value = currentCell.userInput = 'Ú';
			} else if (value === 'ˆE' || value == 'Eˆ') {
				currentCell.input.value = currentCell.userInput = 'Ê';
			} else if (value === 'ˆA' || value == 'Aˆ') {
				currentCell.input.value = currentCell.userInput = 'Â';
			} else if (value === 'ˆI' || value == 'Iˆ') {
				currentCell.input.value = currentCell.userInput = 'Î';
			} else if (value === 'ˆO' || value == 'Oˆ') {
				currentCell.input.value = currentCell.userInput = 'Ô';
			} else if (value === 'ˆU' || value == 'Uˆ') {
				currentCell.input.value = currentCell.userInput = 'Û';
			} else if (value === '˜A' || value == 'A˜') {
				currentCell.input.value = currentCell.userInput = 'Ã';
			} else if (value === '˜O' || value == 'O˜') {
				currentCell.input.value = currentCell.userInput = 'Õ';
			} else if (value === '˜N' || value == 'N˜') {
				currentCell.input.value = currentCell.userInput = 'Ñ';
			} else if (value === ',C' || value == 'C,') {
				currentCell.input.value = currentCell.userInput = 'Ç';
			} else {
				currentCell.input.value = currentCell.userInput = value.charAt(1);
				if (['`', '´', '˜', 'ˆ', ','].includes(currentCell.userInput)) {
					return;
				}
			}
			goToNext(selectedRow, selectedCol, true);
			return;
		}
	}

	function goToNext(rowIndex: number, charIndex: number, forward: boolean) {
		let currentCell = crosswordGrid[rowIndex][charIndex];
		let changeInPosition = forward ? 1 : -1;
		let nextRow = rowIndex;
		let nextCol = charIndex;
		let nextInList = currentCell;
		if (isGoingAcross) {
			currentAnswerWords = nextInList.acrossWordCount;
			if (currentCell.acrossCells) {
				if (
					(forward && currentCell.acrossCellsIndex === currentCell.acrossCells.length - 1) ||
					(!forward && currentCell.acrossCellsIndex === 0)
				) {
					nextInList.input?.focus();
					nextInList.input?.setSelectionRange(1, 1);
					return;
				}
				nextInList.highlight = 'semi';
				nextInList = crosswordGrid[rowIndex][charIndex + changeInPosition];
				nextCol = charIndex + changeInPosition;
			}
		} else {
			if (currentCell.downCells) {
				currentAnswerWords = nextInList.downWordCount;
				if (
					(forward && currentCell.downCellsIndex === currentCell.downCells.length - 1) ||
					(!forward && currentCell.downCellsIndex === 0)
				) {
					nextInList.input?.focus();
					nextInList.input?.setSelectionRange(1, 1);
					return;
				}
				nextInList.highlight = 'semi';
				nextInList = crosswordGrid[rowIndex + changeInPosition][charIndex];
				nextRow = rowIndex + changeInPosition;
			}
		}
		nextInList.highlight = 'full';
		nextInList.input?.focus();
		nextInList.input?.setSelectionRange(1, 1);
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
							<span class="disabled" id="{rowIndex}~{colIndex}"></span>
						{:else}
							<input
								bind:this={cell.input}
								id="{rowIndex}~{colIndex}"
								maxlength="2"
								class={cell.highlight}
								onfocus={() => {
									console.log('input');
								}}
								oninput={inputChange}
								onclick={() => {
									clickCrosswordBox(rowIndex, colIndex, null);
								}}
								value={cell.userInput}
							/>
						{/if}
					{/each}
				</div>
			{/each}
		</div>
	
	<div class="flex-container">
		<div class="flex-container horizontal spaced" class:reverse={useHorizontalDisplay}>
			<div>
				<h2>
					<u>{currentHint}</u>
					{#if hintLanguage === 'ES' && answerLanguage === 'EN'}
						<img alt="Es -> En" src={esToEn} />
					{/if}
					{#if hintLanguage === 'EN' && answerLanguage === 'ES'}
						<img alt="En -> Es" src={enToEs} />
					{/if}
				</h2>
				<h4>
					{partOfSpeechCodeMap[currentPartOfSpeech]}
					{tenseCodeMap[currentVerbTense] && tenseCodeMap[currentVerbTense].length > 0
						? `- ${tenseCodeMap[currentVerbTense]}`
						: ''}
				</h4>
				<h4>
					{currentAnswerWords > 1
						? `(${currentAnswerWords} ${translations[settings.language]['words']})`
						: currentAnswerWords === 1
							? `(${currentAnswerWords} ${translations[settings.language]['word']})`
							: ''}
				</h4>
			</div>
			<div class="flex-container button-group">
				<div class="flex-container horizontal">
					<button
						class="icon-button"
						aria-label="previous letter"
						class:invisible={crosswordGrid.length === 0}
						onclick={() => {
							goToNext(selectedRow, selectedCol, false);
						}}><svg class:up-arrow={!isGoingAcross}><image href={left}></image></svg></button
					>
					<button
						class="icon-button"
						aria-label="next letter"
						class:invisible={crosswordGrid.length === 0}
						onclick={() => {
							goToNext(selectedRow, selectedCol, true);
						}}
						><svg class:down-arrow={!isGoingAcross} class:right-arrow={isGoingAcross}
							><image href={left}></image></svg
						></button
					>
				</div>
				<div class="flex-container horizontal">
					<button
						class="icon-button"
						aria-label="previous word"
						class:invisible={crosswordGrid.length === 0}
						onclick={goToPreviousOrigin}
						><svg class="right-arrow"><image href={nextClue}></image></svg></button
					>
					<button
						class="icon-button"
						aria-label="next word"
						class:invisible={crosswordGrid.length === 0}
						onclick={goToNextOrigin}><svg><image href={nextClue}></image></svg></button
					>
				</div>
				<div class="flex-container horizontal">
					<button
						aria-label="check letters"
						class="icon-button"
						class:invisible={crosswordGrid.length === 0}
						onclick={checkAnswers}><svg><image href={checkLetters}></image></svg></button
					>
					<button
						class="icon-button"
						aria-label="switch orientation"
						class:invisible={crosswordGrid.length === 0}
						onclick={switchDirection}><svg><image href={switchOrientation}></image></svg></button
					>
				</div>
			</div>
		</div>
		<div class="flex-container horizontal">
			<button
				class="right-margin"
				class:invisible={crosswordGrid.length === 0 ||
					(currentHelp.length > 0 && currentHelp.indexOf('_') === -1)}
				onclick={giveHint}>{translations[settings.language]['help']}!</button
			>
			<div class="horizontal flex-container">
				{#each currentHelp as letter}
					<h4 class="letter-help" class:help-space={letter === ' '}>{letter}</h4>
				{/each}
			</div>
		</div>
	</div>
	{/if}
</div>
<br />
<button onclick={createCrossword} disabled={loading}
	>{translations[settings.language]['create crossword']}</button
>
<button onclick={goToCrosswordSettingsPage}>{translations[settings.language]['go to settings page']}</button>

<style>
	.reverse {
		flex-direction: row-reverse !important;
	}
	.reverse .button-group {
		padding-right: 16px;
	}

	.button-group {
		justify-content: center;
		padding-bottom: 16px;
	}
	.button-group div {
		justify-content: space-evenly;
	}
	.spaced {
		justify-content: space-between;
	}
	.right-margin {
		margin-right: 8px;
	}

	h2 {
		margin: 2px 0 2px 0;
	}

	h4 {
		margin: 0 0 0 20px;
		padding: 0;
	}

	.letter-help {
		margin: 0 6px 0 0;
	}

	.up-arrow {
		transform: rotate(90deg);
	}

	.down-arrow {
		transform: rotate(270deg);
	}

	.right-arrow {
		transform: rotate(180deg);
	}

	.icon-button {
		border: 2px solid black;
		border-radius: 4px;
		aspect-ratio: 1 / 1;
		height: 44px;
		width: 44px;
		padding: 0;
		margin: 2px;
		text-align: center;
	}

	image,
	svg {
		height: 40px;
		width: 40px;
		padding: 0;
		margin: 0;
	}

	.crossword {
		width: 96vw;
		height: 96vw;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		aspect-ratio: 1 / 1 !important;
	}

	.wide-window-crossword {
		width: 50vw;
		height: 50vw;
		min-width: 600px;
		min-height: 600px;
		padding-right: 32px;
		aspect-ratio: 1 / 1 !important;
	}

	input {
		text-align: center;
		animation-duration: 2s;
		min-height: 1px;
		min-width: 0px;
	}

	.crossword-row {
		width: 100%;
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		flex: 1;
	}

	.crossword-row * {
		border: 1px black solid;
		padding: 0;
		margin: 0;
		flex: 1;
	}

	* {
		font-family: 'Monaco';
	}

	input:focus {
		outline: none;
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

	img {
		height: 24px;
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
</style>
