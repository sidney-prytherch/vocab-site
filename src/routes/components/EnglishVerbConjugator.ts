
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

const badSimplePastVersions = new RegExp(/\[[^\]]*(obsolete|archaic|nonstandard|colloquial|rare|dialectal|Commonwealth|UK|rare)[^\]]*\]/)

export class EnglishVerbConjugator {

    conjugateVerb(tense: Conjugation, verb: string, negate: boolean) {
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
            if (negate) {
                return [`don't ${verbParts.default}`, `don't ${verbParts.default}`, `doesn't ${verbParts.default}`, `don't ${verbParts.default}`, `don't ${verbParts.default}`, `don't ${verbParts.default}`];
            } else {
                return [verbParts.default, verbParts.default, verbParts["third-person singular simple present"], verbParts.default, verbParts.default, verbParts.default];
            }
        }
        if (tense === "PRET_IND") {
            // if (verbParts["simple past"].match(/[^\w]/g)) {
            //     console.warn(verbParts);
            // }
            let simplePastVersions = verbParts["simple past"].split("|").filter(it => !(badSimplePastVersions.test(it)));
            let primaryVersion = simplePastVersions.find(it => it.indexOf("[US]") > -1)
            let formattedSimplePastVersions = simplePastVersions.map(it => it.replaceAll(/\[[^\]]*\]/g, ""))
            if (!primaryVersion) {
                primaryVersion = formattedSimplePastVersions[0];
            } else {
                primaryVersion = primaryVersion.replaceAll(/\[[^\]]*\]/g, "");
            }
            let allVersions = [primaryVersion, ...formattedSimplePastVersions.filter(it => it != primaryVersion)].join("|");

            if (negate) {
                return [`didn't ${verbParts.default}`, `didn't ${verbParts.default}`, `didn't ${verbParts.default}`, `didn't ${verbParts.default}`, `didn't ${verbParts.default}`, `didn't ${verbParts.default}`];
            } else {
                return [allVersions, allVersions, allVersions, allVersions, allVersions, allVersions];
            }
        }
    }

    constructor() { }

}