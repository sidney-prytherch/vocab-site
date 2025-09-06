<script lang="ts">
	let fileInput: HTMLInputElement | undefined = $state();
    import vocabulary from "./vocabulary.json"

	const downloadVocabFile = () => {
		const link = document.createElement('a');
		const content = JSON.stringify(vocabulary);
		const file = new Blob([content], { type: 'text/plain' });
		link.href = URL.createObjectURL(file);
		link.download = 'vocab.json';
		link.click();
		URL.revokeObjectURL(link.href);
	};

	const uploadVocabFile = () => {
		if (fileInput && fileInput.files) {
			const selectedFile = fileInput.files[0];
			const reader = new FileReader();
			console.log(vocabulary);
			reader.onload = (event) => {
				if (event && event.target && event.target.result) {
					const newData = JSON.parse(event.target.result.toString());
					vocabulary.words = { ...vocabulary.words, ...newData.words };
				}
			};
			console.log(vocabulary);
			reader.readAsText(selectedFile);
		}
	};
</script>

<h1>Welcome to Vocab Site</h1>
<button onclick={downloadVocabFile}>Download</button>
<div>
	<input type="file" bind:this={fileInput} name="fileInput" accept="json" />
	<button class="fileButton" onclick={uploadVocabFile}>UPload Vocab File</button>
</div>
