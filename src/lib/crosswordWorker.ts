import { Crossword } from '../routes/components/Crossword';


self.onmessage = (_) => {

    Crossword.createWithoutWordList().then((crossword) => {
        crossword.createCrossword().then((crosswordData) => {
            self.postMessage(crosswordData); // Send the result back to the main thread
        })
    })


};