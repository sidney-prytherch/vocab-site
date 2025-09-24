<script lang="ts">
	import { Crossword } from './Crossword';

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
		input: HTMLInputElement | null;
		highlight: 'none' | 'semi' | 'full';
	};

	let currentCells: CrosswordGridCell[] = $state([]);

	let currentHint: string = $state('');

	let selectedRow: number = $state(-1);
	let selectedCol: number = $state(-1);
	let isGoingAcross: boolean = $state(true);
	let crosswordGrid: CrosswordGridCell[][] = $state([]);

	async function createCrossword() {
		let crossword = await Crossword.createWithoutWordList();
		let crosswordData = await crossword.createCrossword();
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
						crosswordGrid[rowIndex][colIndex + i].acrossOrigin = { row: rowIndex, col: colIndex };
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
						crosswordGrid[rowIndex][colIndex].downCells.push({ row: rowIndex + i, col: colIndex });
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

	function keyDown(e: KeyboardEvent, rowIndex: number, charIndex: number) {
		console.log(e.code);
		if (crosswordGrid[rowIndex][charIndex].input) {
			if (
				(e.code === 'Backspace' && crosswordGrid[rowIndex][charIndex].input.value === '') ||
				(isGoingAcross && e.code === 'ArrowLeft') ||
				(!isGoingAcross && e.code === 'ArrowUp')
			) {
				goToNext(rowIndex, charIndex, false);
			}
			if (
				(isGoingAcross && e.code === 'ArrowRight') ||
				(!isGoingAcross && e.code === 'ArrowDown')
			) {
				goToNext(rowIndex, charIndex, true);
			}
		}
	}

	function goToNext(rowIndex: number, charIndex: number, forward: boolean) {
		let currentCell = crosswordGrid[rowIndex][charIndex];
		let changeInPosition = forward ? 1 : -1;
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
			}
		}
		nextInList.highlight = 'full';
		if (nextInList.input) {
			nextInList.input.select();
		}
		return nextInList;
	}

	function inputChange(rowIndex: number, charIndex: number) {
		let currentCell = crosswordGrid[rowIndex][charIndex];
		if (currentCell.input && ['', '`', '´', '˜', 'ˆ'].includes(currentCell.input.value)) {
			return;
		}
		goToNext(rowIndex, charIndex, true);
	}
</script>

{#if crosswordGrid.length > 0}
	<div class="crossword">
		{#each crosswordGrid as row, rowIndex}
			<div class="crossword-row">
				{#each row as cell, colIndex}
					{#if cell.value === '▓'}
						<span class="disabled" id="{rowIndex}~{colIndex}">▓</span>
					{:else}
						<input
							bind:this={cell.input}
							type="text"
							class={cell.highlight}
							maxlength="1"
							size="1"
							id="{rowIndex}~{colIndex}"
							oninput={(e) => inputChange(rowIndex, colIndex)}
							onkeydown={(e) => keyDown(e, rowIndex, colIndex)}
							onclick={() => {
								clickCrosswordBox(rowIndex, colIndex);
							}}
						/>
					{/if}
				{/each}
			</div>
		{/each}
	</div>
{/if}

<h2>{currentHint}</h2>

<button onclick={createCrossword}>createCrossword</button>

<style>
	.crossword-row {
		width: 100%;
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		flex-grow: 1;
		align-items: stretch;
	}

	.semi {
		background-color: lightblue;
	}

	.full {
		background-color: lightskyblue;
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

	input {
		text-align: center;
	}

	input[type='text']:focus {
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
