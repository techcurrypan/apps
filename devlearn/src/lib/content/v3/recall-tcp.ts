// 思い出す（TCP：send() から線に出るまで）。関数の名前は Linux 6.6 の net/ipv4/tcp_output.c・tcp_input.c で確かめる（確認日 2026-11-27）
import type { RecallSet } from '../../learn/recall3.ts';

export const RECALL_TCP: RecallSet = {
	qs: [
		{
			k: 'order',
			q: 'send() から線に出るまでを、通る順に並べる',
			items: [
				'tcp_sendmsg_locked()',
				'tcp_write_xmit()',
				'tcp_transmit_skb()',
				'qdisc（fq）',
				'NIC（TSO）'
			],
			start: [
				'qdisc（fq）',
				'tcp_transmit_skb()',
				'NIC（TSO）',
				'tcp_sendmsg_locked()',
				'tcp_write_xmit()'
			],
			why: '写して送信キューへ → 送ってよいか決める → 写しにヘッダを付ける → qdisc で順を待つ → NIC が切り分けて線へ。'
		},
		{
			k: 'hit',
			q: 'ACK が返るまで、送った物の元が残っている置き場はどこ？図の置き場を押す',
			hits: ['wq', 'rtx', 'fq', 'nic'],
			ans: 'rtx',
			why: '再送キュー（tcp_rtx_queue）。落ちた時にここから送り直す。'
		},
		{
			k: 'pick',
			q: 'ACK を受けた後の tcp_write_xmit() は、どの文脈で動く？',
			opts: ['アプリのシステムコール', 'softirq（NET_RX）', 'カーネルスレッドの kworker'],
			ans: 1,
			why: 'ACK の処理（tcp_ack → tcp_data_snd_check）は受信の softirq の中で動き、そのまま続きを送る。'
		},
		{
			k: 'num',
			q: '初期 cwnd 10、MSS 1,448 B。最初の 1 往復で送れるのは何バイト？',
			ans: 14480,
			unit: 'B',
			why: '10 × 1,448 = 14,480 B。'
		},
		{
			k: 'text',
			q: 'send() が戻っても、相手に届いたとは限らないのはなぜ？ 1〜2 文で',
			keys: [
				['写し', 'コピー', '写す'],
				['キュー', '置き場']
			],
			model:
				'send() はデータをカーネルの送信キューに写した所で戻る。届いたかは後で ACK が返って分かる。',
			why: 'send() は写して送信キューに置いた所で戻る。線に出るのも届くのも後。届いた知らせは ACK。'
		}
	],
	note: [
		'send() は「写して送信キューに置いた」で戻る。届いたかは ACK で分かる',
		'送ってよい数は cwnd と相手の窓の小さい方。ACK が来ると続きを送る（softirq の中）',
		'送った物の元は再送キューに残り、落ちたらそこから送り直す',
		'遅い時は ss（cwnd・retrans）→ nstat → tc -s qdisc（dropped）の順に見る'
	]
};
