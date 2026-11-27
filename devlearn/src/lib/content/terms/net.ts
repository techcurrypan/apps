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
	net('app', 'アプリ', ['アプリ'], 'PC やスマホで動くプログラム。通信したい時は、OS に頼む。'),
	net(
		'sendq',
		'送信キュー',
		['送信キュー', 'sk_write_queue'],
		'まだ送り終えていないデータが並んで待つ列。カーネルの中に、接続ごとに 1 本ある。',
		['include/net/sock.h（Linux v6.6）']
	),
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
	net(
		'byte',
		'バイト（B）',
		['バイト'],
		'データの量の単位で、記号は B。英字 1 文字がおよそ 1 つ分。'
	),
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
	net('socket', 'ソケット', ['ソケット'], '通信の口。アプリはこの口を開き、fd の番号で指す。', [
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
		'カーネルがデータの塊を持つ入れ物。頭の余白と、中身の断片の表を持つ。',
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
	),
	// 見本 1（net-101 第 3 版）の図の物の言葉（吹き出し。検査 46）。出典：Linux v6.6 の net/ipv4/。確認日 2026-11-28
	net(
		'packet',
		'パケット',
		['パケット'],
		'線の上を運ばれるデータの小包。1 枚はおよそ 1,500 バイトまで。',
		['RFC 894']
	),
	net(
		'sendmsg',
		'tcp_sendmsg_locked()',
		['tcp_sendmsg_locked()'],
		'send() を受けて、送る中身をカーネルの置き場に写す関数。写し終えると戻る。',
		['net/ipv4/tcp.c（Linux v6.6）']
	),
	net(
		'xmit',
		'tcp_write_xmit()',
		['tcp_write_xmit()'],
		'送信キューの先頭を見て、今送ってよいかを決める関数。',
		['net/ipv4/tcp_output.c（Linux v6.6）']
	),
	net(
		'txskb',
		'tcp_transmit_skb()',
		['tcp_transmit_skb()'],
		'送る塊を写し、TCP の見出しを付けて下の係へ渡す関数。',
		['net/ipv4/tcp_output.c（Linux v6.6）']
	),
	net(
		'rtxq',
		'再送キュー',
		['再送キュー', 'tcp_rtx_queue'],
		'送ったが、まだ ACK が来ていない塊を残しておく列。落ちたらここから送り直す。',
		['net/ipv4/tcp_output.c（Linux v6.6）']
	),
	net('tcpack', 'tcp_ack()', ['tcp_ack()'], '届いた ACK を読み、確かめられた塊を片付ける関数。', [
		'net/ipv4/tcp_input.c（Linux v6.6）'
	]),
	net(
		'ipq',
		'ip_queue_xmit()',
		['ip_queue_xmit()'],
		'IP の見出しを付け、行き先への道を決めて送り出す関数。',
		['net/ipv4/ip_output.c（Linux v6.6）']
	),
	net(
		'ring',
		'送信リング',
		['送信リング'],
		'NIC が直接読む、輪になった置き場。ドライバが塊を置き、NIC が取り出す。'
	),
	net(
		'irq',
		'割り込み',
		['割り込み', 'hardirq'],
		'部品が CPU に「今すぐ見て」と知らせる合図。短く済ませ、残りは後に回す。'
	),
	net(
		'rcvest',
		'tcp_rcv_established()',
		['tcp_rcv_established()'],
		'受け手で、届いた塊の並びを確かめて ACK を返す関数。',
		['net/ipv4/tcp_input.c（Linux v6.6）']
	)
];
