// コマンドの参考（LS-P8・検査 20）。コマンドごとに、その道具の公式の説明だけへのリンク。
// まとめサイト・個人のブログは載せない。足すときは URL を開いて、そのコマンドの説明だと確かめ、
// 確かめた日を docs/content-sources.md の「コマンドの参考」に書く。

export type CommandRef = { url: string; site: string };

// 2026-11-15 に全ての URL を開き、頁の題がそのコマンドの説明であることを確かめた（docs/content-sources.md「コマンドの参考」）
export const COMMAND_REFS: Readonly<Record<string, CommandRef>> = {
	'git add': { url: 'https://git-scm.com/docs/git-add', site: 'git-scm.com' },
	'git commit': { url: 'https://git-scm.com/docs/git-commit', site: 'git-scm.com' },
	'git status': { url: 'https://git-scm.com/docs/git-status', site: 'git-scm.com' },
	'git log': { url: 'https://git-scm.com/docs/git-log', site: 'git-scm.com' },
	'git revert': { url: 'https://git-scm.com/docs/git-revert', site: 'git-scm.com' },
	'git switch': { url: 'https://git-scm.com/docs/git-switch', site: 'git-scm.com' },
	'git merge': { url: 'https://git-scm.com/docs/git-merge', site: 'git-scm.com' },
	'git pull': { url: 'https://git-scm.com/docs/git-pull', site: 'git-scm.com' },
	'git push': { url: 'https://git-scm.com/docs/git-push', site: 'git-scm.com' },
	'git rebase': { url: 'https://git-scm.com/docs/git-rebase', site: 'git-scm.com' },
	'git rm': { url: 'https://git-scm.com/docs/git-rm', site: 'git-scm.com' },
	'docker run': {
		url: 'https://docs.docker.com/reference/cli/docker/container/run/',
		site: 'Docker Docs'
	},
	'docker stop': {
		url: 'https://docs.docker.com/reference/cli/docker/container/stop/',
		site: 'Docker Docs'
	},
	'docker rm': {
		url: 'https://docs.docker.com/reference/cli/docker/container/rm/',
		site: 'Docker Docs'
	},
	'docker build': {
		url: 'https://docs.docker.com/reference/cli/docker/buildx/build/',
		site: 'Docker Docs'
	},
	'docker volume': {
		url: 'https://docs.docker.com/reference/cli/docker/volume/',
		site: 'Docker Docs'
	},
	'docker exec': {
		url: 'https://docs.docker.com/reference/cli/docker/container/exec/',
		site: 'Docker Docs'
	},
	'docker network': {
		url: 'https://docs.docker.com/reference/cli/docker/network/',
		site: 'Docker Docs'
	},
	'docker compose up': {
		url: 'https://docs.docker.com/reference/cli/docker/compose/up/',
		site: 'Docker Docs'
	},
	curl: { url: 'https://curl.se/docs/manpage.html', site: 'curl.se' },
	SELECT: { url: 'https://www.sqlite.org/lang_select.html', site: 'SQLite' },
	UPDATE: { url: 'https://www.sqlite.org/lang_update.html', site: 'SQLite' },
	CREATE: { url: 'https://www.sqlite.org/lang_createtable.html', site: 'SQLite' },
	INSERT: { url: 'https://www.sqlite.org/lang_insert.html', site: 'SQLite' },
	EXPLAIN: { url: 'https://www.sqlite.org/lang_explain.html', site: 'SQLite' },
	BEGIN: { url: 'https://www.sqlite.org/lang_transaction.html', site: 'SQLite' },
	COMMIT: { url: 'https://www.sqlite.org/lang_transaction.html', site: 'SQLite' },
	echo: {
		url: 'https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html#index-echo',
		site: 'GNU'
	},
	printf: {
		url: 'https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html#index-printf',
		site: 'GNU'
	},
	cd: {
		url: 'https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html#index-cd',
		site: 'GNU'
	},
	export: {
		url: 'https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html#index-export',
		site: 'GNU'
	},
	ls: {
		url: 'https://www.gnu.org/software/coreutils/manual/html_node/ls-invocation.html',
		site: 'GNU'
	},
	mkdir: {
		url: 'https://www.gnu.org/software/coreutils/manual/html_node/mkdir-invocation.html',
		site: 'GNU'
	},
	cp: {
		url: 'https://www.gnu.org/software/coreutils/manual/html_node/cp-invocation.html',
		site: 'GNU'
	},
	rm: {
		url: 'https://www.gnu.org/software/coreutils/manual/html_node/rm-invocation.html',
		site: 'GNU'
	},
	tail: {
		url: 'https://www.gnu.org/software/coreutils/manual/html_node/tail-invocation.html',
		site: 'GNU'
	},
	head: {
		url: 'https://www.gnu.org/software/coreutils/manual/html_node/head-invocation.html',
		site: 'GNU'
	},
	cat: {
		url: 'https://www.gnu.org/software/coreutils/manual/html_node/cat-invocation.html',
		site: 'GNU'
	},
	chmod: {
		url: 'https://www.gnu.org/software/coreutils/manual/html_node/chmod-invocation.html',
		site: 'GNU'
	},
	sort: {
		url: 'https://www.gnu.org/software/coreutils/manual/html_node/sort-invocation.html',
		site: 'GNU'
	},
	uniq: {
		url: 'https://www.gnu.org/software/coreutils/manual/html_node/uniq-invocation.html',
		site: 'GNU'
	},
	cut: {
		url: 'https://www.gnu.org/software/coreutils/manual/html_node/cut-invocation.html',
		site: 'GNU'
	},
	tee: {
		url: 'https://www.gnu.org/software/coreutils/manual/html_node/tee-invocation.html',
		site: 'GNU'
	},
	sha256sum: {
		url: 'https://www.gnu.org/software/coreutils/manual/html_node/sha2-utilities.html',
		site: 'GNU'
	},
	grep: { url: 'https://www.gnu.org/software/grep/manual/grep.html', site: 'GNU' },
	ps: { url: 'https://man7.org/linux/man-pages/man1/ps.1.html', site: 'man7.org' },
	kill: { url: 'https://man7.org/linux/man-pages/man1/kill.1.html', site: 'man7.org' },
	systemctl: {
		url: 'https://www.freedesktop.org/software/systemd/man/latest/systemctl.html',
		site: 'systemd'
	},
	ping: { url: 'https://man7.org/linux/man-pages/man8/ping.8.html', site: 'man7.org' },
	ip: { url: 'https://man7.org/linux/man-pages/man8/ip.8.html', site: 'man7.org' },
	ss: { url: 'https://man7.org/linux/man-pages/man8/ss.8.html', site: 'man7.org' },
	dig: {
		url: 'https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility',
		site: 'BIND 9'
	},
	openssl: { url: 'https://docs.openssl.org/3.0/man1/openssl/', site: 'OpenSSL' },
	'ssh-keygen': { url: 'https://man.openbsd.org/ssh-keygen', site: 'OpenBSD' },
	ssh: { url: 'https://man.openbsd.org/ssh', site: 'OpenBSD' }
};

/** 参考に載せてよい置き場（道具を作った所・その公式の説明書）。ブログ・まとめは載せない */
export const OFFICIAL: readonly string[] = [
	'git-scm.com',
	'docs.docker.com',
	'curl.se',
	'www.sqlite.org',
	'www.gnu.org',
	'man7.org',
	'www.freedesktop.org',
	'bind9.readthedocs.io',
	'docs.openssl.org',
	'man.openbsd.org'
];

/** その実戦の作業場所にある、自分で作った命令（公式の説明が無いので鍵にしない） */
const LOCAL = new Set(['report']);

/** 打った 1 行から、参考の鍵（"git add" "curl" "SELECT"）を取り出す。js は鍵を持たない */
export function commandKeys(tool: string, line: string): string[] {
	const t = line.trim();
	if (t === '' || tool === 'js') return [];
	if (tool === 'sql') {
		const m = /^([A-Za-z]+)/.exec(t);
		return m ? [m[1].toUpperCase()] : [];
	}
	const out: string[] = [];
	for (const seg of t.split(/\|\||&&|\||;/)) {
		const w = seg
			.trim()
			.replace(/^sudo\s+/, '')
			.split(/\s+/);
		if (!w[0] || /^[A-Z_]+=/.test(w[0]) || w[0].includes('/') || LOCAL.has(w[0])) continue;
		if (
			(w[0] === 'git' || w[0] === 'docker' || w[0] === 'kubectl') &&
			w[1] &&
			!w[1].startsWith('-')
		) {
			if (w[0] === 'docker' && w[1] === 'compose' && w[2]) out.push(`docker compose ${w[2]}`);
			else out.push(`${w[0]} ${w[1]}`);
		} else out.push(w[0]);
	}
	return [...new Set(out)];
}
