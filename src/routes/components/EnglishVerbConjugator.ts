
import verbs from "../../routes/englishVerbs.json";

export type Conjugation = "PRES_IND" | "PRET_IND" | "FUT_IND"


type VerbsData = {[key: string]: {
    "name"?: string,
    "default": string,
    "simple past": string,
    "past participle": string,
    "present participle": string,
    "third-person singular simple present": string,
    "extra1"?: string,
    "extra2"?: string
}[]};

export class EnglishVerbConjugator {

    conjugateVerb(tense: Conjugation, verb: string) {
        let allVerbs: VerbsData = (verbs as VerbsData);
        let verbMatch = allVerbs.hasOwnProperty(verb) ? allVerbs[verb] : null
        if (verb === "be") {
            if (tense === "PRES_IND") {
                return ["am", "are", "is", "are", "are", "are"];
            }
            if (tense === "PRET_IND") {
                return ["was", "were", "was", "were", "were", "were"];
            }
        }
        if (!verbMatch) {
            console.warn(`verb '${verb}' not found`)
            return verb;
        }
        let verbParts = verbMatch[0]
        if (tense === "PRES_IND") {
            return [verbParts.default, verbParts.default, verbParts["third-person singular simple present"], verbParts.default, verbParts.default, verbParts.default];
        }
        if (tense === "PRET_IND") {
            return [verbParts["past participle"], verbParts["past participle"], verbParts["past participle"], verbParts["past participle"], verbParts["past participle"], verbParts["past participle"]];
        }
    }

    constructor() { }

}