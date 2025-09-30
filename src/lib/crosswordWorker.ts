import { Crossword } from '../routes/components/Crossword';
import type { CrosswordSettings } from '../routes/components/CrosswordPage.svelte';


self.onmessage = (crosswordSettings: MessageEvent<CrosswordSettings>) => {

    Crossword.createWithoutWordList(crosswordSettings.data).then((crossword) => {
        crossword.createCrossword().then((crosswordData) => {
            self.postMessage(crosswordData); // Send the result back to the main thread
        })
    })


};