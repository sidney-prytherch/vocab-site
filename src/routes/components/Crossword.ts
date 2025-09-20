import { getWords } from "$lib/db";
import { Conjugator } from "@jirimracek/conjugate-esp";

// ░ ▓
// all 2D arrays are row, column (so each 2D array is an array of rows)
const defaultSize = 12;
const wordPoolSize = 1000;
const onlyBlanksRegExp = /^[░▓]*$/g
const splitterRegExp = /[^▓]+/g

export interface GridData { hint: string, answer: string, isAcross: boolean | null }
export interface WordData {wordES?: string, wordEN?: string, wordPT?: string}

interface StringPattern { row: number, col: number, isAcross: boolean, pattern: RegExp }

export class Crossword {
    crosswordSize: number;
    wordCounts: number[];
    conjugator: Conjugator;
    letterGrid: string[][];
    gridOfValidity: boolean[][][];
    wordLists: string[][];
    allWords: string[];
    crosswordGridData: GridData[][];

    static async createWithoutWordList(crosswordSize?: number) {


        console.log(results);


        let verbSet = new Set<string>();

        let size = crosswordSize || defaultSize;
        let conj = new Conjugator();

        let allWords = await getWords();
        let spanishVerbs = await conj.getVerbList();
        let words: string[] = [];

        let wordMap: WordData[];
        let count = 0;

        for (let word of allWords) {
            if (word.pos === "v") {
                count++;
                let presentTenses: {spanish?: string[], english?: string[], portuguese?: []} = {};
                if (word.spanish && spanishVerbs.includes(word.spanish)) {
                    let verbConjugation = await conj.conjugate(word.spanish)
                    if (typeof verbConjugation !== "string" && verbConjugation.length > 0) {
                        if (verbConjugation.length > 1) {
                            // console.log(verbConjugation)
                            // both transitive and non transitive definitions?
                        }
                        if (verbConjugation[0].conjugation.Indicativo.Presente.length !== 6) {
                            console.warn(verbConjugation[0].conjugation.Indicativo.Presente);
                        }
                        presentTenses.spanish = verbConjugation[0].conjugation.Indicativo.Presente
                        for (let word of verbConjugation[0].conjugation.Indicativo.Presente) {
                            words.push(word);
                        }
                    }
                }
                if (word.english) {
                    let formattedWord = word.english.replace("to ", "")
                    let formattedWords = formattedWord.split(/[,\/]/g).map(it => ((it.toLowerCase()).split(" "))[0]);
                    for (let w of formattedWords) {
                        verbSet.add(w);
                    }
                }
                if (count < 20) {

                    if (presentTenses.english && presentTenses.english.length > 0) {
                        // console.log(presentTenses.english[1])
                    }
                    if (presentTenses.spanish && presentTenses.spanish.length > 0) {
                        // console.log(presentTenses.spanish[1])
                    }
                }
                
            }
        }
        let list: string[] = [];
        verbSet.forEach(w => list.push(w))
        this.downloadSomething(list)
        let numbers = new Set<number>()
        while (numbers.size < wordPoolSize) {
            numbers.add(Math.floor(Math.random() * words.length))
        }

        let finalWords: string[] = [];
        numbers.forEach(number => {
            finalWords.push(words[number])
        })
        return new Crossword(finalWords, conj, crosswordSize)
    }

    private constructor(words: string[], conjugator: Conjugator, crosswordSize?: number) {
        this.crosswordSize = crosswordSize || defaultSize;

        this.allWords = words;
        this.wordCounts = new Array(this.crosswordSize + 1).fill(0);
        this.conjugator = conjugator;
        this.letterGrid = new Array(this.crosswordSize).fill(0).map(_ => new Array(this.crosswordSize).fill("░"))
        this.gridOfValidity = new Array(this.crosswordSize).fill(0).map(_ =>
            new Array(this.crosswordSize).fill(0).map(_ => [true, true])) //[isAbleToHoldAcrossWord, isAbleToHoldDownWord]

        this.wordLists = this.wordCounts.map(_ => []);
        this.crosswordGridData = new Array(this.crosswordSize).fill(0).map(_ =>
            new Array(this.crosswordSize).fill(0).map(_ => { return { hint: "", answer: "", isAcross: null } }))

        for (let word of words) {
            if (word.length >= this.wordLists.length) {
                console.warn(`"${word}" doesn't fit for grid size ${this.crosswordSize}`);
                continue;
            }
            this.wordLists[word.length].push(word);
            this.wordCounts[word.length]++
        }
        this.printCrosswordToConsole();
    }

    static downloadSomething(data: any) {
		const link = document.createElement('a');
		const content = JSON.stringify(data);
		const file = new Blob([content], { type: 'text/plain' });
		link.href = URL.createObjectURL(file);
		link.download = 'whatever.txt';
		link.click();
		URL.revokeObjectURL(link.href);
	};


    async createCrossword() {
        // cubic function to get a random number between 2 and crosswordSize from Math.random(), 
        // but preferring numbers closer to 1 + crosswordSize / 2
        let firstWordLetters = Math.round((this.crosswordSize - 2) * 4 * Math.pow(Math.random() - .5, 3) + (this.crosswordSize - 2) / 2 + 2)
        let isAcross = Math.random() < .5
        let firstSelectedWord: string | null = null;
        let secondSelectedWord: string | null = null;
        if (this.wordCounts[firstWordLetters] > 1) {
            firstSelectedWord = this.removeRandomWordFromArray(this.wordLists[firstWordLetters]);
            secondSelectedWord = this.removeRandomWordFromArray(this.wordLists[firstWordLetters]);
        } else {
            firstSelectedWord = this.removeRandomWord();
            secondSelectedWord = this.removeRandomWord();
        }
        if (firstSelectedWord) {
            this.placeWordInGrid(0, 0, isAcross, firstSelectedWord);
        }
        if (secondSelectedWord) {
            this.placeWordInGrid(isAcross ? this.crosswordSize - 1 : this.crosswordSize - secondSelectedWord.length,
                isAcross ? this.crosswordSize - secondSelectedWord.length : this.crosswordSize - 1, isAcross, secondSelectedWord);
        }

        let patterns = this.getStringPatterns();
        this.printCrosswordToConsole()
        while (true) {
            //randomize patterns and then sort
            this.randomizeArray(patterns);
            
            // sort by length of pattern, regardless of contents:
            // patterns.sort((patternA, patternB) => patternB.word.length - patternA.word.length);

            // sort by amount of letters already placed:
            patterns.sort((patternA, patternB) => patternB.word.replaceAll("░", "").length - patternA.word.replaceAll("░", "").length);

            let foundWord = false;
            patternLoop: for (let pattern of patterns) {
                for (let word of this.wordLists[pattern.word.length]) {
                    if (pattern.pattern.test(word)) {
                        // console.log(`${pattern.word} -> ${word}`);
                        this.placeWordInGrid(pattern.row, pattern.col, pattern.isAcross, word);
                        foundWord = true;
                        break patternLoop;
                    }
                }
            }
            patterns = this.getStringPatterns();
            if (patterns.length === 0 || !foundWord) {
                break;
            }
        }
        this.printCrosswordToConsole();
    }

    randomizeArray(array: any[]) {
        for (let i = array.length - 1; i >= 0; i--) {
            let j = Math.floor(Math.random() * array.length);
            [array[i], array[j]] = [array[j], array[i]]
        }
    }

    // ░ ▓
    getStringPatterns() {
        let patterns = [];

        for (let rowIndex = 0; rowIndex < this.letterGrid.length; rowIndex++) {
            let row = this.letterGrid[rowIndex];
            let rowPatternStr = row.join("");
            //if the row contains only blank spaces, move to next row
            if (onlyBlanksRegExp.test(rowPatternStr)) {
                continue;
            }
            let rowSubsections: { word: string, index: number }[] = [];
            let subsection = splitterRegExp.exec(rowPatternStr);
            while (subsection !== null) {
                if (!onlyBlanksRegExp.test(subsection[0])) {
                    rowSubsections.push({ word: subsection[0], index: subsection.index })
                }
                subsection = splitterRegExp.exec(rowPatternStr);
            }
            for (let rowSubsection of rowSubsections) {
                let containsIllegalSpace = false;
                for (let colIndex = rowSubsection.index; colIndex < rowSubsection.index + rowSubsection.word.length; colIndex++) {
                    if (!this.gridOfValidity[rowIndex][colIndex][0]) {
                        containsIllegalSpace = true;
                        break;
                    }
                }
                let subsections = this.getSubsections(rowSubsection);
                for (let subsection of subsections) {
                    let containsIllegalSpace = false;
                    for (let colIndex = subsection.index; colIndex < subsection.index + subsection.word.length; colIndex++) {
                        if (!this.gridOfValidity[rowIndex][colIndex][0]) {
                            containsIllegalSpace = true;
                            break;
                        }
                    }
                    if (!containsIllegalSpace) {
                        patterns.push({ row: rowIndex, col: subsection.index, isAcross: true, word: subsection.word, pattern: new RegExp(`^${this.replaceBlanks(subsection.word)}$`, "g") })
                    }
                }
            }
        }

        for (let colIndex = 0; colIndex < this.letterGrid.length; colIndex++) {
            let colPatternStr = "";
            for (let row of this.letterGrid) {
                colPatternStr += row[colIndex];
            }
            //if the row contains only blank spaces, move to next row
            if (onlyBlanksRegExp.test(colPatternStr)) {
                continue;
            }
            let colSubsections: { word: string, index: number }[] = [];
            let subsection = splitterRegExp.exec(colPatternStr);
            while (subsection !== null) {
                if (!onlyBlanksRegExp.test(subsection[0])) {
                    colSubsections.push({ word: subsection[0], index: subsection.index })
                }
                subsection = splitterRegExp.exec(colPatternStr);
            }
            for (let colSubsection of colSubsections) {
                let containsIllegalSpace = false
                for (let rowIndex = colSubsection.index; rowIndex < colSubsection.index + colSubsection.word.length; rowIndex++) {
                    if (!this.gridOfValidity[rowIndex][colIndex][1]) {
                        containsIllegalSpace = true;
                        break;
                    }
                }
                let subsections = this.getSubsections(colSubsection);
                for (let subsection of subsections) {
                    let containsIllegalSpace = false
                    for (let rowIndex = subsection.index; rowIndex < subsection.index + subsection.word.length; rowIndex++) {
                        if (!this.gridOfValidity[rowIndex][colIndex][1]) {
                            containsIllegalSpace = true;
                            break;
                        }
                    }
                    if (!containsIllegalSpace) {
                        patterns.push({ row: subsection.index, col: colIndex, isAcross: false, word: subsection.word, pattern: new RegExp(`^${this.replaceBlanks(subsection.word)}$`, "g") })
                    }
                }
            }
        }

        // for (let pattern of patterns) {
        //     console.log(`r${pattern.row} c${pattern.col} ${pattern.isAcross ? "across" : "down"}: ${pattern.pattern}`)
        // }
        return patterns;
    }

    getSubsections(subsection: { word: string, index: number }) {
        let subsections = [];
        let subsectionStartIndex = subsection.index;
        let word = subsection.word.substring(0);
        while (word.length > 1 && !onlyBlanksRegExp.test(word)) {

            let backWord = word;
            // let subsectionLastIndex = word.length;

            while (backWord.length > 1 && !onlyBlanksRegExp.test(backWord)) {
                subsections.push({ word: backWord, index: subsectionStartIndex })

                let lettersToCut = backWord.charAt(backWord.length - 1) === "░" ? 1 : 2
                backWord = backWord.substring(0, backWord.length - lettersToCut)
                // subsectionLastIndex = backWord.length - lettersToCut
            }


            let lettersToCut = word.charAt(0) === "░" ? 1 : 2
            word = word.substring(lettersToCut)
            subsectionStartIndex = subsectionStartIndex + lettersToCut
        }

        return subsections;

    }

    replaceBlanks(patternString: string) {
        return patternString.replaceAll("░", ".")
    }

    placeWordInGrid(row: number, col: number, isAcross: boolean, word: string) {
        this.crosswordGridData[row][col] = { hint: word, answer: word, isAcross }
        for (let charIndex = 0; charIndex < word.length; charIndex++) {
            if (isAcross) {
                this.letterGrid[row][col + charIndex] = word.charAt(charIndex)
            } else {
                this.letterGrid[row + charIndex][col] = word.charAt(charIndex)
            }
        }
        if (isAcross) {
            if (col - 1 >= 0) {
                this.letterGrid[row][col - 1] = "▓"
                this.gridOfValidity[row][col - 1] = [false, false]
            }
            if (col + word.length < this.crosswordSize) {
                this.letterGrid[row][col + word.length] = "▓"
                this.gridOfValidity[row][col + word.length] = [false, false]
            }
            for (let colIndex = col; colIndex < col + word.length; colIndex++) {
                this.gridOfValidity[row][colIndex][0] = false
                if (row - 1 >= 0) {
                    this.gridOfValidity[row - 1][colIndex][0] = false
                }
                if (row + 1 < this.crosswordSize) {
                    this.gridOfValidity[row + 1][colIndex][0] = false
                }
            }
        } else {
            if (row - 1 >= 0) {
                this.letterGrid[row - 1][col] = "▓"
                this.gridOfValidity[row - 1][col] = [false, false]
            }
            if (row + word.length < this.crosswordSize) {
                this.letterGrid[row + word.length][col] = "▓"
                this.gridOfValidity[row + word.length][col] = [false, false]
            }
            for (let rowIndex = row; rowIndex < row + word.length; rowIndex++) {
                this.gridOfValidity[rowIndex][col][1] = false
                if (col - 1 >= 0) {
                    this.gridOfValidity[rowIndex][col - 1][1] = false
                }
                if (col + 1 < this.crosswordSize) {
                    this.gridOfValidity[rowIndex][col + 1][1] = false
                }
            }
        }
    }

    removeRandomWordFromArray(wordArray: string[]) {
        if (wordArray.length === 0) {
            console.warn("NO WORDS LEFT!")
            return null;
        }
        let wordIndex = Math.floor(Math.random() * wordArray.length);
        let word = (wordArray.splice(wordIndex, 1))[0];
        this.allWords.splice(this.allWords.indexOf(word), 1);
        this.wordCounts[word.length]--;
        return word;
    }

    removeRandomWord() {
        let wordIndex = Math.floor(Math.random() * this.allWords.length);
        let word = (this.allWords.splice(wordIndex, 1))[0];
        this.wordCounts[word.length]--;
        return word;
    }

    printCrosswordToConsole() {
        console.log(" ")
        let colNums = "   "
        this.letterGrid.forEach((row, index) => {
            colNums = colNums + " " + index + (index < 10 ? "  " : " ")
        })
        console.log(colNums)
        this.letterGrid.forEach((row, index) => {
            console.log(`${(index < 10 ? " " : "")}${index}: ${row.join(" | ").replaceAll("░", " ")}`)
        })
        console.log(" ")
        this.crosswordGridData.forEach((row, rowIndex) => {
            row.forEach((wordData, colIndex) => {
                if (wordData.isAcross !== null) {
                    console.log(`(${rowIndex}, ${colIndex}), ${wordData.isAcross ? "across" : "down"}: ${wordData.hint} -> ${wordData.answer}`)
                }
            })
        })
    }
}

