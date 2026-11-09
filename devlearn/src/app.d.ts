// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
	// vite.config.ts の define で埋め込む組み立て情報
	const __COMMIT__: string;
	const __BUILT_AT__: string;
}

export {};
