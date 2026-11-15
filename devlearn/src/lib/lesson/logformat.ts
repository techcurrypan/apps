// 中身の板のログの書式（検査 23。LS-Q4）。src ごとに、本物の出力の形を正規表現で持つ。
// 型の無い src は使えない。形は各道具の本物の出力（tools.md 第 2 章）と、その道具の説明書の書式の節から取った。
// 新しい src を足すときは、先に本物の出力を記録し、その行が当たることをテストで確かめる。

export type LogFormat = { src: RegExp; line: RegExp; from: string };

const TIME = String.raw`\d{2}/[A-Z][a-z]{2}/\d{4}:\d{2}:\d{2}:\d{2} [+-]\d{4}`;

export const LOG_FORMATS: LogFormat[] = [
	{
		src: /^nginx access\.log$/,
		// log_format combined
		line: new RegExp(
			String.raw`^\d{1,3}(\.\d{1,3}){3} - \S+ \[${TIME}\] "[A-Z]+ \S+ HTTP/\d(\.\d)?" \d{3} \d+ "[^"]*" "[^"]*"$`
		),
		from: 'nginx の log_format combined'
	},
	{
		src: /^nginx error\.log$/,
		line: /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} \[(emerg|alert|crit|error|warn|notice|info|debug)\] \d+#\d+: .+$/,
		from: 'nginx の error_log'
	},
	{
		src: /^kernel( \S+)?$/,
		line: /^(\[UFW (BLOCK|ALLOW|AUDIT)\] IN=\S* OUT=\S* (MAC=\S+ )?SRC=\S+ DST=\S+ LEN=\d+ .*PROTO=(TCP|UDP|ICMP).*|Memory cgroup out of memory: Killed process \d+ \(.+\).*|oom-kill:.+)$/,
		from: 'ufw の記録（kern.log）と、カーネルの OOM の記録'
	},
	{
		src: /^sshd$/,
		line: /^(Accepted (password|publickey) for \S+ from \S+ port \d+ ssh2.*|Failed (password|publickey) for (invalid user )?\S+ from \S+ port \d+ ssh2|Invalid user \S+ from \S+ port \d+|Connection closed by .+)$/,
		from: 'OpenSSH の sshd の記録（auth.log）'
	},
	{
		src: /^sudo$/,
		line: /^\S+ : TTY=\S+ ; PWD=\S+ ; USER=\S+ ; COMMAND=.+$/,
		from: 'sudo の記録（auth.log）'
	},
	{
		src: /^systemd$/,
		line: /^((Started|Stopped|Starting|Stopping|Reloading|Reloaded) .+\.|\S+\.(service|socket|timer): .+)$/,
		from: 'systemd の journalctl の行'
	},
	{
		src: /^dnsmasq$/,
		line: /^(query\[[A-Z]+\] \S+ from \S+|forwarded \S+ to \S+|reply \S+ is \S+|cached \S+ is \S+|config \S+ is \S+|\/etc\/hosts \S+ is \S+)$/,
		from: 'dnsmasq の log-queries'
	},
	{
		src: /^tcpdump$/,
		line: /^\d{2}:\d{2}:\d{2}\.\d{6} IP \S+ > \S+: .+$/,
		from: 'tcpdump -n の行'
	},
	{
		src: /^curl$/,
		line: /^[*<>{}] ?.*$/,
		from: 'curl -v の行（* は情報、> は送った頭、< は受けた頭）'
	},
	{
		src: /^kubectl events$/,
		line: /^(Normal|Warning) +[A-Za-z]+ +\S+\/\S+ +.+$/,
		from: 'kubectl get events の TYPE・REASON・OBJECT・MESSAGE'
	},
	{
		src: /^kubelet( \S+)?$/,
		line: /^[IWE]\d{4} \d{2}:\d{2}:\d{2}\.\d{6} +\d+ \S+:\d+\] .+$/,
		from: 'kubelet の klog の行'
	},
	{
		src: /^docker events$/,
		line: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+\+\d{2}:\d{2} (container|image|network|volume) [a-z]+ [0-9a-f]{12,64}( \(.+\))?$/,
		from: 'docker events の行'
	},
	{
		src: /^git reflog$/,
		line: /^[0-9a-f]{7,40} HEAD@\{\d+\}: [a-z-]+( \([a-z ]+\))?: .+$/,
		from: 'git reflog の行'
	},
	{
		src: /^git$/,
		line: /^(\[\S+( \(root-commit\))? [0-9a-f]{7}\] .+| \d+ files? changed.*|To \S+| {3}[0-9a-f]{7}\.\.[0-9a-f]{7} {2}\S+ -> \S+| \* \[new branch\] +\S+ -> \S+|Switched to( a new)? branch '\S+'|Fast-forward|Merge made by the '\S+' strategy\.|CONFLICT \(content\): Merge conflict in \S+|Auto-merging \S+)$/,
		from: 'git commit・push・switch・merge の出力'
	},
	{
		src: /^(stdout|stderr)$/,
		line: /^.*$/,
		from: 'その場で動かしたプログラムの出力（そのまま写す）'
	}
];

/** src の書式。無ければ null */
export function formatOf(src: string): LogFormat | null {
	return LOG_FORMATS.find((f) => f.src.test(src)) ?? null;
}
