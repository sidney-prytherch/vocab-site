<script lang="ts">
    import { Crossword } from './Crossword';

    async function createCrossword() {
        let crossword = await Crossword.createWithoutWordList();
        await crossword.createCrossword();
    }

</script>

<button onclick={createCrossword}>createCrossword</button>
