import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.argv.includes('dev');

/** @type {import('@sveltejs/kit').Config} */

const config = {
    kit: {
        // appDir: 'app', // Required as the default is _app
        adapter: adapter({
            pages: 'build',
            assets: 'build',
            fallback: null
        }),
        paths: {
            base: dev ? '' : '/vocab-site'
        }
    },
    preprocess: vitePreprocess(),
    serviceWorker: {
        register: true,
        files: (filepath) => filepath.endsWith('.js') || filepath.endsWith('.ts')
    },
    compilerOptions: {
		experimental: {
			async: true
		}
	}
};

export default config;