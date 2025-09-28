<script lang="ts">
	import CrosswordWorker from '$lib/crosswordWorker.ts?worker';
	import ants from '$lib/assets/ant64 orig.gif';
	import type { GridData } from './Crossword';
	import { on } from 'svelte/events';
	import { onMount } from 'svelte';

	type CrosswordGridCell = {
		value: string;
		acrossOrigin: { row: number; col: number } | null;
		downOrigin: { row: number; col: number } | null;
		downCells: { row: number; col: number }[] | null;
		acrossCells: { row: number; col: number }[] | null;
		acrossCellsIndex: number;
		downCellsIndex: number;
		acrossHint: string | null;
		downHint: string | null;
		acrossAnswer: string | null;
		downAnswer: string | null;
		button: HTMLButtonElement | null;
		userInput: string;
		highlight: 'none' | 'semi' | 'full';
	};

	let currentCells: CrosswordGridCell[] = $state([]);
	let cwWorker;

	let currentHint: string = $state('');

	let selectedRow: number = $state(-1);
	let selectedCol: number = $state(-1);
	let isGoingAcross: boolean = $state(true);
	let crosswordGrid: CrosswordGridCell[][] = $state([]);
	let loading = $state(false);

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
						highlight: 'none'
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
						}
					}
				});
			});
			clickCrosswordBox(0, 0);
			loading = false;
		};
	}

	function clickCrosswordBox(rowIndex: number, colIndex: number) {
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
		console.log(crosswordGrid);
		crosswordGrid[rowIndex][colIndex].highlight = 'full';
		currentHint = isGoingAcross
			? `${crosswordGrid[rowIndex][colIndex].acrossHint}`
			: `${crosswordGrid[rowIndex][colIndex].downHint}`;
		console.log(isGoingAcross);
	}

	onMount(() => {
		on(window, 'keydown', (e) => {
			if (selectedRow === -1 || selectedCol === -1) {
				return;
			}
			let currentCell = crosswordGrid[selectedRow][selectedCol];
            if (e.code === "Space") {
                currentCell.userInput = " "
				goToNext(selectedRow, selectedCol, false);
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
                if (e.key === "e") {
                    currentCell.userInput = 'è'
                } else if (e.key === "i") {
                    currentCell.userInput = 'ì'
                } else if (e.key === "a") {
                    currentCell.userInput = 'à'
                } else if (e.key === "o") {
                    currentCell.userInput = 'ò'
                } else if (e.key === "u") {
                    currentCell.userInput = 'ù'
                } else if (e.key.length === 1) {
				    currentCell.userInput = e.key;
                }
				goToNext(selectedRow, selectedCol, true);
                return;
            } else if (currentCell.userInput === '´') { 
                if (e.key === "e") {
                    currentCell.userInput = 'é'
                } else if (e.key === "i") {
                    currentCell.userInput = 'í'
                } else if (e.key === "a") {
                    currentCell.userInput = 'á'
                } else if (e.key === "o") {
                    currentCell.userInput = 'ó'
                } else if (e.key === "u") {
                    currentCell.userInput = 'ú'
                } else if (e.key.length === 1) {
				    currentCell.userInput = e.key;
                }
				goToNext(selectedRow, selectedCol, true);
                return;
            } else if (currentCell.userInput === 'ˆ') { 
                if (e.key === "e") {
                    currentCell.userInput = 'ê'
                } else if (e.key === "i") {
                    currentCell.userInput = 'î'
                } else if (e.key === "a") {
                    currentCell.userInput = 'â'
                } else if (e.key === "o") {
                    currentCell.userInput = 'ô'
                } else if (e.key === "u") {
                    currentCell.userInput = 'û'
                } else if (e.key.length === 1) {
				    currentCell.userInput = e.key;
                }
				goToNext(selectedRow, selectedCol, true);
                return;
            } else if (currentCell.userInput === '˜') { 
                if (e.key === "n") {
                    currentCell.userInput = 'ñ'
                } else if (e.key === "o") {
                    currentCell.userInput = 'õ'
                } else if (e.key === "a") {
                    currentCell.userInput = 'ã'
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

<img alt="loading" src={ants} class:invisible={!loading} />

{#if crosswordGrid.length > 0}
	<div class="crossword">
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

<h2>{currentHint}</h2>

<button onclick={createCrossword} disabled={loading}>createCrossword</button>

<style>
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
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
</style>
