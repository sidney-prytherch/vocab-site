import { getWords } from "$lib/db";
import { Conjugator } from "@jirimracek/conjugate-esp";
import { EnglishVerbConjugator } from "./EnglishVerbConjugator";
import type { CrosswordSettings } from "./CrosswordPage.svelte";

// ░ ▓
// all 2D arrays are row, column (so each 2D array is an array of rows)
const defaultSize = 17;
const wordPoolSize = 100;
const onlyBlanksRegExp = /^[░▓]*$/g
const splitterRegExp = /[^▓]+/g
const extraVerbData = [
    {
        person: 1,
        plural: false,
        pronounEN: "I",
        pronounES: "yo",
        isMasc: null,
        includePronoun: false,
        formal: null
    },
    {
        person: 1,
        plural: false,
        pronounEN: "I",
        pronounES: "yo",
        isMasc: null,
        includePronoun: true,
        formal: null
    },
    {
        person: 2,
        plural: false,
        pronounEN: "you",
        pronounES: "tú",
        isMasc: null,
        includePronoun: false,
        formal: false
    },
    {
        person: 2,
        plural: false,
        pronounEN: "you",
        pronounES: "tú",
        isMasc: null,
        includePronoun: true,
        formal: false
    },
    {
        person: 3,
        plural: false,
        pronounEN: "he/she/it",
        pronounES: "él/ella/Ud.",
        isMasc: null,
        includePronoun: false,
        formal: null
    },
    {
        person: 3,
        plural: false,
        pronounEN: "he/it",
        pronounES: "él",
        isMasc: true,
        includePronoun: true,
        formal: null
    },
    {
        person: 3,
        plural: false,
        pronounEN: "she/it",
        pronounES: "ella",
        isMasc: false,
        includePronoun: true,
        formal: null
    },
    {
        person: 3,
        plural: false,
        pronounEN: "you",
        pronounES: "Ud.",
        isMasc: null,
        includePronoun: true,
        formal: true
    },
    {
        person: 1,
        plural: true,
        pronounEN: "we",
        pronounES: "nosotros",
        isMasc: null,
        includePronoun: false,
        formal: null
    },
    {
        person: 1,
        plural: true,
        pronounEN: "we",
        pronounES: "nosotros",
        isMasc: null,
        includePronoun: true,
        formal: null
    },
    {
        person: 2,
        plural: true,
        pronounEN: "you",
        pronounES: "vosotros",
        isMasc: null,
        includePronoun: false,
        formal: null
    },
    {
        person: 2,
        plural: true,
        pronounEN: "you",
        pronounES: "vosotros",
        isMasc: null,
        includePronoun: true,
        formal: null
    },
    {
        person: 3,
        plural: true,
        pronounEN: "they",
        pronounES: "ellos/ellas/Uds.",
        isMasc: null,
        includePronoun: false,
        formal: null
    },
    {
        person: 3,
        plural: true,
        pronounEN: "they",
        pronounES: "ellos",
        isMasc: true,
        includePronoun: true,
        formal: null
    },
    {
        person: 3,
        plural: true,
        pronounEN: "they",
        pronounES: "ellas",
        isMasc: false,
        includePronoun: true,
        formal: null
    },
    {
        person: 3,
        plural: true,
        pronounEN: "you",
        pronounES: "udestes",
        isMasc: null,
        includePronoun: true,
        formal: true
    }
]
export type Languages = "ES" | "EN" | "PT";

export interface GridData { hint: string, answer: string, hintLanguage: Languages, answerLanguage: Languages, partOfSpeech?: string, verbTense?: string }
export interface WordData {wordES?: string, wordEN?: string, wordPT?: string, extraDataIndex?: number, tense?: "PRES_IND" | "PRET_IND", extraEnglishDefs?: string[] , partOfSpeech?: string}
export interface CrosswordWordData {
    word: string;
    hint: string;
    extraDataIndex?: number;
    languageOrigin: Languages;
    hintLanguageOrigin: Languages;
    partOfSpeech?: string;
    verbTense?: string;
}

interface StringPattern { row: number, col: number, isAcross: boolean, pattern: RegExp }

export class Crossword {
    crosswordSize: number;
    wordCounts: number[];
    letterGrid: string[][];
    gridOfValidity: boolean[][][];
    wordLists: CrosswordWordData[][];
    allWordPairs: CrosswordWordData[];
    crosswordGridData: GridData[][][];

    static async createWithoutWordList(crosswordSettings?: CrosswordSettings) {

        let conjEng = new EnglishVerbConjugator()

        let conj = new Conjugator();

        let allWords = (await getWords()).sort((a, b) => (a.freqIndexSpanish || 9999) - (b.freqIndexSpanish || 9999));
        let spanishVerbs = await conj.getVerbList();

        let wordMap: WordData[] = [];
        let count = 0;

        // I
        // you
        // he
        // she
        // it
        // we
        // you (all)
        // they (f.)
        // they (m.)

        let unfoundEnglishVerbs = new Set<string>()
        wordLoop: for (let word of allWords) {
            if (word.pos === "v") {
                let spanishVerb: {[tense: string]: string[][]} = {};
                let englishVerb: {[tense: string]: string[][]} = {};
                // let portugueseVerb: string[][] = [];
                if (word.spanish && spanishVerbs.includes(word.spanish)) {
                    let verbConjugation = await conj.conjugate(word.spanish)
                    if (typeof verbConjugation !== "string" && verbConjugation.length > 0) {
                        if (verbConjugation.length > 1) {
                            // console.log(verbConjugation)
                            // both transitive and non transitive definitions?
                        }
                        if (verbConjugation[0].conjugation.Indicativo.Presente.length !== 6) {
                            console.warn(`spanish conjugator didn't give 6 length conjugation for present: ${verbConjugation[0].conjugation.Indicativo.Presente}`);
                        }
                        if (!spanishVerb.PRES_IND) {
                            spanishVerb.PRES_IND = []
                        }
                        spanishVerb["PRES_IND"].push([
                            verbConjugation[0].conjugation.Indicativo.Presente[0], // (yo)
                            `yo ${verbConjugation[0].conjugation.Indicativo.Presente[0]}`, // 
                            verbConjugation[0].conjugation.Indicativo.Presente[1], // (you)
                            `tú ${verbConjugation[0].conjugation.Indicativo.Presente[1]}`, // you
                            verbConjugation[0].conjugation.Indicativo.Presente[2], // (he/she/it)
                            `él ${verbConjugation[0].conjugation.Indicativo.Presente[2]}`, // he
                            `ella ${verbConjugation[0].conjugation.Indicativo.Presente[2]}`, // she
                            `ud ${verbConjugation[0].conjugation.Indicativo.Presente[2]}`, // you (formal)
                            verbConjugation[0].conjugation.Indicativo.Presente[3],
                            `nosotros ${verbConjugation[0].conjugation.Indicativo.Presente[3]}`, // we
                            verbConjugation[0].conjugation.Indicativo.Presente[4],
                            `vosotros ${verbConjugation[0].conjugation.Indicativo.Presente[4]}`, // you (pl.)
                            verbConjugation[0].conjugation.Indicativo.Presente[5],
                            `ellos ${verbConjugation[0].conjugation.Indicativo.Presente[5]}`, // they (m.)
                            `ellas ${verbConjugation[0].conjugation.Indicativo.Presente[5]}`, // they (f.)
                            `uds ${verbConjugation[0].conjugation.Indicativo.Presente[5]}`, // you (pl., formal)
                        ])
                        if (verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido.length !== 6) {
                            console.warn(`spanish conjugator didn't give 6 length conjugation for present: ${verbConjugation[0].conjugation.Indicativo.Presente}`);
                        }
                        if (!spanishVerb.PRET_IND) {
                            spanishVerb.PRET_IND = []
                        }
                        spanishVerb["PRET_IND"].push([
                            verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido[0], // (yo)
                            `yo ${verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido[0]}`, // 
                            verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido[1], // (you)
                            `tú ${verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido[1]}`, // you
                            verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido[2], // (he/she/it)
                            `él ${verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido[2]}`, // he
                            `ella ${verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido[2]}`, // she
                            `ud ${verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido[2]}`, // you (formal)
                            verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido[3],
                            `nosotros ${verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido[3]}`, // we
                            verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido[4],
                            `vosotros ${verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido[4]}`, // you (pl.)
                            verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido[5],
                            `ellos ${verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido[5]}`, // they (m.)
                            `ellas ${verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido[5]}`, // they (f.)
                            `uds ${verbConjugation[0].conjugation.Indicativo.PreteritoIndefinido[5]}`, // you (pl., formal)
                        ])
                    }
                }
                if (word.english && word.english.length > 0) {
                    // let alternateDefinitions = word.english.split(/[,\/]/g); // all
                    let alternateDefinitions = [word.english[0]] // [word.english.split(/[,\/]/g)[0]]; // only the first

                    let defintionData = alternateDefinitions.map(definition => {
                        if ((/^not| not/g).test(definition)) {
                            let def = definition.trim().toLowerCase().replace(/^to /g, "").replace(/ ?not /g, "").trim();
                            let spaceIndex = def.indexOf(" ")
                            let [verb, remainder] = spaceIndex > -1 ? [def.substring(0, spaceIndex), def.substring(spaceIndex)] : [def, ""]
                            return {verb, remainder, negate: true};
                        }
                        let def = definition.toLowerCase().replace(/^to /g, "");
                        let spaceIndex = def.indexOf(" ")
                        let [verb, remainder] = spaceIndex > -1 ? [def.substring(0, spaceIndex), def.substring(spaceIndex)] : [def, ""]
                        return {verb, remainder};
                    })
                    let presIndConjugations = defintionData.map(definition => {
                        let conjugation = conjEng.conjugateVerb("PRES_IND", definition.verb, !!(definition.negate));
                        if (typeof conjugation === "string") {
                            unfoundEnglishVerbs.add(conjugation);
                            return null
                        }
                        if (conjugation) {
                            return conjugation.map(conjugation => `${conjugation}${definition.remainder}`);
                        } else {
                            return null
                        }
                    }).filter(it => !!it)
                    let pretIndConjugations = defintionData.map(definition => {
                        let conjugation = conjEng.conjugateVerb("PRET_IND", definition.verb, !!(definition.negate));
                        if (typeof conjugation === "string") {
                            unfoundEnglishVerbs.add(conjugation);
                            return null
                        }
                        if (conjugation) {
                            return conjugation.map(conjugation => `${conjugation}${definition.remainder}`);
                        } else {
                            return null
                        }
                    }).filter(it => !!it)
                    // console.log({alternateDefinitions, defintionData, conjugations: presIndConjugations});
                    presIndConjugations.forEach(conjugation => {
                        if (!englishVerb.PRES_IND) {
                            englishVerb.PRES_IND = []
                        }
                        englishVerb.PRES_IND.push([
                            conjugation[0],
                            `i ${conjugation[0]}`, // 1 I
                            conjugation[1],
                            `you ${conjugation[1]}`, // 3 you
                            conjugation[2],
                            `he ${conjugation[2]}`, // 5 he
                            `she ${conjugation[2]}`, // 6 she
                            `you ${conjugation[1]}`, // 7 you (formal)
                            conjugation[3],
                            `we ${conjugation[3]}`, // 8 we
                            conjugation[4],
                            `you ${conjugation[4]}`, // 11 you (pl.)
                            conjugation[5],
                            `they ${conjugation[5]}`, // 13 they (m.)
                            `they ${conjugation[5]}`, // 14 they (f.)
                            `you ${conjugation[4]}`, // 15 you (pl., formal)
                        ])
                    })
                    pretIndConjugations.forEach(conjugation => {
                        if (!englishVerb.PRET_IND) {
                            englishVerb.PRET_IND = []
                        }
                        englishVerb.PRET_IND.push([
                            conjugation[0],
                            `i ${conjugation[0]}`, // 1 I
                            conjugation[1],
                            `you ${conjugation[1]}`, // 3 you
                            conjugation[2],
                            `he ${conjugation[2]}`, // 5 he
                            `she ${conjugation[2]}`, // 6 she
                            `you ${conjugation[1]}`, // 7 you (formal)
                            conjugation[3],
                            `we ${conjugation[3]}`, // 8 we
                            conjugation[4],
                            `you ${conjugation[4]}`, // 11 you (pl.)
                            conjugation[5],
                            `they ${conjugation[5]}`, // 13 they (m.)
                            `they ${conjugation[5]}`, // 14 they (f.)
                            `you ${conjugation[4]}`, // 15 you (pl., formal)
                        ])
                    })
                }

                if (spanishVerb.PRES_IND && spanishVerb.PRES_IND.length > 0 && englishVerb.PRES_IND && englishVerb.PRES_IND.length > 0) {
                    count++;
                    for (let englishVerbConjugation of englishVerb.PRES_IND) {
                        for (let spanishVerbConjugation of spanishVerb.PRES_IND) {
                            for (let i = 0; i < englishVerbConjugation.length; i++) {
                                 wordMap.push({wordEN: englishVerbConjugation[i], wordES: spanishVerbConjugation[i], extraDataIndex: i, tense: "PRES_IND", partOfSpeech: "v"})
                            }
                        }
                    }
                    if (count > 1000) {
                        // break wordLoop;
                    }
                }
                if (spanishVerb.PRET_IND && spanishVerb.PRET_IND.length > 0 && englishVerb.PRET_IND && englishVerb.PRET_IND.length > 0) {
                    count++;
                    for (let englishVerbConjugation of englishVerb.PRET_IND) {
                        for (let spanishVerbConjugation of spanishVerb.PRET_IND) {
                            for (let i = 0; i < englishVerbConjugation.length; i++) {
                                 wordMap.push({wordEN: englishVerbConjugation[i], wordES: spanishVerbConjugation[i], extraDataIndex: i, tense: "PRET_IND", partOfSpeech: "v"})
                            }
                        }
                    }
                    
                }
            } else {
                console.log(`${word.english[0]}~${word.spanish}`)
                wordMap.push({
                    wordEN: word.english[0],
                    extraEnglishDefs: word.english,
                    wordES: word.spanish,
                    partOfSpeech: word.pos
                })
            }
            count++;
            if (count > 500) {
                break wordLoop;
            }
        }

        // (function(callback) {
        //     let array: string[] = [];
        //     unfoundEnglishVerbs.forEach(it => {array.push(it)});
        //     callback(array);
        // })(this.downloadSomething);

        let filteredWordMap = wordMap.filter(it => it.wordEN && it.wordES);

        let numbers = new Set<number>()
        while (numbers.size < wordPoolSize) {
            numbers.add(Math.floor(Math.random() * filteredWordMap.length))
        }

        let finalWordMap: WordData[] = [];
        numbers.forEach(number => {
            if (filteredWordMap[number].wordEN && filteredWordMap[number].wordES) {
                finalWordMap.push(filteredWordMap[number])
            }
        })
        return new Crossword(finalWordMap, crosswordSettings)
    }

    private constructor(wordData: WordData[], crosswordSettings?: CrosswordSettings) {        
        this.crosswordSize = crosswordSettings?.gridSize || defaultSize;

        this.wordCounts = new Array(this.crosswordSize + 1).fill(0);
        this.letterGrid = new Array(this.crosswordSize).fill(0).map(_ => new Array(this.crosswordSize).fill("░"))
        this.gridOfValidity = new Array(this.crosswordSize).fill(0).map(_ =>
            new Array(this.crosswordSize).fill(0).map(_ => [true, true])) //[isAbleToHoldAcrossWord, isAbleToHoldDownWord]

        this.wordLists = this.wordCounts.map(_ => []);
        this.crosswordGridData = new Array(this.crosswordSize).fill(0).map(_ =>
            new Array(this.crosswordSize).fill(0).map(_ => { return [{ hint: "", answer: "", hintLanguage: 'EN', answerLanguage: 'EN' }, { hint: "", answer: "", hintLanguage: 'EN', answerLanguage: 'EN' }] }))

        // for (let word of wordPairs) {
        //     if (word.length >= this.wordLists.length) {
        //         console.warn(`"${word}" doesn't fit for grid size ${this.crosswordSize}`);
        //         continue;
        //     }
        //     this.wordLists[word.length].push(word);
        //     this.wordCounts[word.length]++
        // }
        this.allWordPairs = []
        for (let wordPair of wordData) {
            if (wordPair.wordEN && wordPair.wordES) {
                let englishSimple = (wordPair.tense === "PRET_IND" ? wordPair.wordEN.split("|")[0] : wordPair.wordEN).replaceAll(/\([^\)]*\)|\[[^\]]*\]|\+\[|\]|\(|\)/g, "").trim();
                if (wordPair.partOfSpeech !== "v") console.log(`~~~EN~~~${englishSimple}->${wordPair.wordES}`)
                if (englishSimple.length < this.crosswordSize) {
                    let formattedWordData: CrosswordWordData = {word: englishSimple, hint: wordPair.wordES, extraDataIndex: wordPair.extraDataIndex, languageOrigin: "EN", hintLanguageOrigin: "ES", partOfSpeech: wordPair.partOfSpeech, verbTense: wordPair.tense}
                    this.allWordPairs.push(formattedWordData);
                    this.wordLists[englishSimple.length].push(formattedWordData);
                    this.wordCounts[englishSimple.length]++
                }
                if (wordPair.partOfSpeech !== "v") console.log(`~~~SP~~~${wordPair.wordES}->${wordPair.wordEN}`)
                if (wordPair.wordES.length < this.crosswordSize) {
                    let formattedWordData: CrosswordWordData = {word: wordPair.wordES, hint: wordPair.wordEN, extraDataIndex: wordPair.extraDataIndex, languageOrigin: "ES", hintLanguageOrigin: "EN", partOfSpeech: wordPair.partOfSpeech, verbTense: wordPair.tense}
                    this.allWordPairs.push(formattedWordData);
                    this.wordLists[wordPair.wordES.length].push(formattedWordData);
                    this.wordCounts[wordPair.wordES.length]++
                }
            }
        }
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
        let firstSelectedWord: CrosswordWordData | null = null;
        let secondSelectedWord: CrosswordWordData | null = null;
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
            this.placeWordInGrid(
                isAcross ? this.crosswordSize - 1 : this.crosswordSize - secondSelectedWord.word.length,
                isAcross ? this.crosswordSize - secondSelectedWord.word.length : this.crosswordSize - 1, 
                isAcross, 
                secondSelectedWord);
        }

        let patterns = this.getStringPatterns();
        while (true) {
            //randomize patterns and then sort
            this.randomizeArray(patterns);
            
            // sort by length of pattern, regardless of contents:
            // patterns.sort((patternA, patternB) => patternB.word.length - patternA.word.length);

            // sort by amount of letters already placed:
            patterns.sort((patternA, patternB) => patternB.word.replaceAll("░", "").length - patternA.word.replaceAll("░", "").length);

            // sort by amount of blank spaces it'd fill
            // patterns.sort((patternA, patternB) => patternB.word.replaceAll(/[^░]/g, "").length - patternA.word.replaceAll(/[^░]/g, "").length);

            let foundWord = false;
            patternLoop: for (let pattern of patterns) {
                for (let word of this.wordLists[pattern.word.length]) {
                    if (pattern.pattern.test(word.word)) {
                        // console.log(`${pattern.word} -> ${word}`);
                        this.placeWordInGrid(pattern.row, pattern.col, pattern.isAcross, word);
                        this.wordLists[pattern.word.length].splice(this.wordLists[pattern.word.length].indexOf(word), 1)
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
        return {
            crosswordGridData: this.crosswordGridData,
            letterGrid: this.letterGrid
        }
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
                        try {
                            patterns.push({ row: rowIndex, col: subsection.index, isAcross: true, word: subsection.word, 
                                pattern: new RegExp(`^${this.replaceBlanks(subsection.word)}$`, "g") })
                        } catch (error) {
                            console.warn(error, subsection.word);
                        }
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
                // let containsIllegalSpace = false
                // for (let rowIndex = colSubsection.index; rowIndex < colSubsection.index + colSubsection.word.length; rowIndex++) {
                //     if (!this.gridOfValidity[rowIndex][colIndex][1]) {
                //         containsIllegalSpace = true;
                //         break;
                //     }
                // }
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
                        // console.log(subsection.word)
                        patterns.push(
                            { row: subsection.index, 
                                col: colIndex, 
                                isAcross: false, 
                                word: subsection.word, 
                                pattern: new RegExp(`^${this.replaceBlanks(subsection.word)}$`, "g")
                            }
                        )
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

    formatHint(wordData: CrosswordWordData) {
        let givePronouns = true;
        // console.log(wordData);
        if (wordData.extraDataIndex === undefined) {
            return wordData.hint;
        }
        let data = extraVerbData[wordData.extraDataIndex];
        // console.log(data);
        let formattedExtras = ''
        if (givePronouns) {
            if (wordData.hintLanguageOrigin === "EN" && wordData.languageOrigin === "ES") {
                let pronoun = extraVerbData[wordData.extraDataIndex].pronounES;
                if (['tú', 'Ud.', 'ellos', 'ellas', 'Uds.', 'vosotros'].includes(pronoun)) {
                    formattedExtras = `[${pronoun}]`
                }
            }
        } else {
            let formal = ""
            if (wordData.hintLanguageOrigin === "EN" && wordData.languageOrigin === "ES") {
                if (data.formal === false) {
                    formal = "informal " 
                } else if (data.formal) {
                    formal = "formal "
                }
            } 
            let plural = "" 
            if (wordData.hintLanguageOrigin === "EN" && wordData.languageOrigin === "ES") {
                if (!data.plural && [2,3,7].includes(wordData.extraDataIndex)) {
                    plural = "singular "
                } else if (data.plural && [10,11,15].includes(wordData.extraDataIndex)) {
                    plural = "plural "
                }
            }
            let gender = ""
            if (wordData.hintLanguageOrigin === "EN" && wordData.languageOrigin === "ES") {
                if (wordData.extraDataIndex > 11) {
                    gender = data.isMasc === true ? "masculine " : data.isMasc === false ? "feminine " : ""
                }
            }
            formattedExtras = `[${`${formal}${plural}${gender}`.trim()}]`
        }
        let formattedPronoun = "";
        if (!data.includePronoun) {
            if (wordData.hintLanguageOrigin === "EN") {
                formattedPronoun = `(${data.pronounEN}) `
            } else if (wordData.hintLanguageOrigin === "ES") {
                formattedPronoun = `(${data.pronounES}) `
            }
        }
        let finalExtras = formattedExtras.length > 2 ? ` ${formattedExtras}` : ''
        let formattedHint = `${formattedPronoun}${wordData.hint}${finalExtras}`
        return formattedHint
    }

    placeWordInGrid(row: number, col: number, isAcross: boolean, wordData: CrosswordWordData) {
        let word = wordData.word;
        let hint = this.formatHint(wordData)
        // console.log({row, col, word, hint})
        // console.log(this.letterGrid)
        this.crosswordGridData[row][col][isAcross ? 0 : 1] = { hint: hint, answer: word, hintLanguage: wordData.hintLanguageOrigin, answerLanguage: wordData.languageOrigin, partOfSpeech: wordData.partOfSpeech, verbTense: wordData.verbTense }
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

    removeRandomWordFromArray(wordArray: CrosswordWordData[]) {
        if (wordArray.length === 0) {
            console.warn("NO WORDS LEFT!")
            return null;
        }
        let wordIndex = Math.floor(Math.random() * wordArray.length);
        let word = (wordArray.splice(wordIndex, 1))[0];
        this.allWordPairs.splice(this.allWordPairs.indexOf(word), 1); 
        this.wordCounts[word.word.length]--;
        return word;
    }

    removeRandomWord() {
        let wordIndex = Math.floor(Math.random() * this.allWordPairs.length);
        let word = (this.allWordPairs.splice(wordIndex, 1))[0];
        this.wordLists[word.word.length].splice(this.wordLists[word.word.length].indexOf(word), 1)
        this.wordCounts[word.word.length]--;
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
                let [acrossWord, downWord] = wordData;
                if (acrossWord.answer) 
                    console.log(`(${rowIndex}, ${colIndex}), across: ${acrossWord.hint} -> ${acrossWord.answer}`)
                if (downWord.answer) 
                    console.log(`(${rowIndex}, ${colIndex}), down: ${downWord.hint} -> ${downWord.answer}`)
            })
        })
    }
}

