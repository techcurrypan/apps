// net 分野の言葉（explanation-standard.md 第 10 章）。説明は平易な言葉で 1〜2 文・80 字以内。
// 出典：send(2)・socket(7)（Linux man-pages 6.9）、RFC 9293（TCP）、RFC 8985（RACK）、RFC 6298（RTO）、
// Linux v6.6 の include/linux/skbuff.h・net/ipv4/tcp_output.c。確認日 2026-11-27
import type { Term } from '../../learn/terms.ts';

const net = (id: string, t: string, m: string[], d: string, refs?: string[]): Term => ({
	id,
	t,
	m,
	d,
	field: 'net',
	first: 'net-101',
	...(refs ? { refs } : {})
});

export const NET_TERMS: Term[] = [
	// 言葉をそろえるステップ（段 0 から上がる人の言葉）
	net(
		'send',
		'send()',
		['send()', 'send'],
		'データを送るよう OS に頼む関数。アプリが呼び、OS が送り出す。',
		['send(2)']
	),
	net(
		'fd',
		'fd（ファイル記述子）',
		['ファイル記述子', 'fd'],
		'OS が開いた接続やファイルに付ける番号札。アプリはこの番号で、どの接続かを伝える。',
		['socket(7)']
	),
	net('buf', 'buf', ['buf'], '送る中身を置いたメモリの場所。send() は、ここから中身を写す。', [
		'send(2)'
	]),
	net('byte', 'バイト（B）', ['バイト'], 'データの量の単位。英字 1 文字がおよそ 1 バイト。'),
	net(
		'kernel',
		'カーネル',
		['カーネル'],
		'OS の中心の部分。アプリの頼みを受けて、メモリや NIC を動かす。'
	),
	net(
		'nic',
		'NIC',
		['NIC'],
		'線や電波につながる部品（network interface card）。データを信号にして外へ出す。'
	),
	net('socket', 'ソケット', ['ソケット'], '通信の口。アプリはソケットを開き、fd でそれを指す。', [
		'socket(7)'
	]),
	net(
		'syscall',
		'システムコール',
		['システムコール'],
		'アプリが OS に仕事を頼む決まった入口。send() もその 1 つ。'
	),
	net('tcp', 'TCP', ['TCP'], '届いたかを確かめながら、順番どおりに届ける通信の決まり。', [
		'RFC 9293'
	]),
	net('ack', 'ACK', ['ACK'], '「ここまで受け取った」と相手に返す知らせ。', ['RFC 9293']),
	// net-101 の中の言葉
	net(
		'skb',
		'skb',
		['sk_buff', 'skb'],
		'カーネルがデータの塊を持つ入れ物（struct sk_buff）。頭の余白と断片の表を持つ。',
		['include/linux/skbuff.h']
	),
	net('cwnd', 'cwnd', ['cwnd'], '確かめずに一度に送ってよい区切りの数。ACK で増え、喪失で減る。', [
		'RFC 5681'
	]),
	net('rtt', 'RTT', ['RTT'], '送ってから ACK が返るまでの往復の時間。'),
	net('mss', 'MSS', ['MSS'], '1 つの区切りに載せるデータの最大。ここでは 1,448 B。', ['RFC 9293']),
	net('tso', 'TSO', ['TSO'], '大きな skb を NIC が MSS ごとのフレームに割る仕組み。'),
	net('gro', 'GRO', ['GRO'], '受け取ったフレームを、続きの物どうし 1 個の skb にまとめる仕組み。'),
	net(
		'napi',
		'NAPI',
		['NAPI'],
		'割り込みの後、softirq の中で受け取った物をまとめて取り出す仕組み。'
	),
	net('softirq', 'softirq', ['softirq'], '割り込みの後で動く、眠れないカーネルの仕事の文脈。'),
	net('qdisc', 'qdisc', ['qdisc'], 'NIC に渡す前の待ち行列と、出す順の決め方。'),
	net(
		'tsq',
		'TSQ',
		['TSQ'],
		'手元の qdisc と NIC に置く量を、1 本ずつ「約 1 ms 分」と「塊 2 個」の大きい方までに抑える仕組み。',
		['net/ipv4/tcp_output.c']
	),
	net('edt', 'EDT', ['EDT'], 'skb に「出してよい時刻」を書き、qdisc がその時刻まで待たせる方式。'),
	net('rack', 'RACK', ['RACK'], '送った時刻で喪失を決める仕組み。', ['RFC 8985']),
	net(
		'rto',
		'RTO',
		['RTO'],
		'ACK が来ないまま時間切れで送り直すまでの待ち。Linux の下限は 200 ms。',
		['RFC 6298', 'include/net/tcp.h']
	),
	net('sack', 'SACK', ['SACK'], '抜けの後ろのどこまで届いたかを知らせる ACK の選択肢。', [
		'RFC 2018'
	]),
	net(
		'bufferbloat',
		'bufferbloat',
		['bufferbloat'],
		'待ち行列が大きすぎて、喪失なしに待ちだけが伸びること。'
	)
];
