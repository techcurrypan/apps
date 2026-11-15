// 世界 net（shop.example.com）の機械と、そこを流れる荷物。中身の板（Step.inside）の材料。
// 番地は shell の模擬の世界（tools/shell/networld.ts）と同じ。MAC は例の値（02: で始まる手元の割り当て）。
import { tcpPacket, textPart, type Ends } from '../../lesson/packet.ts';
import type { Packet } from '../../lesson/types.ts';

export const DEVBOX: Ends = { mac: '02:42:c0:00:02:0a', ip: '192.0.2.10', port: 52814 };
export const SHOP: Ends = { mac: '02:42:c0:00:02:50', ip: '192.0.2.80', port: 80 };

/** curl の要求（GET /）。curl 8.5.0 が送る頭と同じ並び */
export const REQUEST_LINES = [
	{ k: '要求の行', line: 'GET / HTTP/1.1', level: 1 as const },
	{ k: 'Host', line: 'Host: shop.example.com', level: 1 as const },
	{ k: 'User-Agent', line: 'User-Agent: curl/8.5.0', level: 2 as const },
	{ k: 'Accept', line: 'Accept: */*', level: 2 as const }
];
export const BODY = '<!doctype html>\n<title>shop</title>\n<p>welcome</p>\n';
export const RESPONSE_LINES = [
	{ k: '状態の行', line: 'HTTP/1.1 200 OK', level: 1 as const },
	{ k: 'Server', line: 'Server: yorozu-web/1.0', level: 1 as const },
	{ k: 'Date', line: 'Date: Tue, 10 Nov 2026 00:01:00 GMT', level: 3 as const },
	{ k: 'Content-Type', line: 'Content-Type: text/html; charset=utf-8', level: 2 as const },
	{ k: 'Cache-Control', line: 'Cache-Control: no-cache', level: 3 as const },
	{
		k: 'Content-Length',
		line: `Content-Length: ${new TextEncoder().encode(BODY).length}`,
		level: 1 as const
	}
];

const ISN_C = 3_121_694_311; // devbox の最初の順番の番号（例の値）
const ISN_S = 1_843_200_977; // Web の最初の順番の番号（例の値）

export const synPacket = (): Packet =>
	tcpPacket({
		name: 'TCP SYN（つなぎたい）',
		src: DEVBOX,
		dst: SHOP,
		seq: ISN_C,
		ack: 0,
		flags: ['SYN'],
		window: 64240,
		ipId: 0x4b1d
	});

export const getPacket = (): Packet =>
	tcpPacket({
		name: 'HTTP GET /',
		src: DEVBOX,
		dst: SHOP,
		seq: ISN_C + 1,
		ack: ISN_S + 1,
		flags: ['PSH', 'ACK'],
		window: 502,
		ipId: 0x4b1f,
		app: textPart('HTTP', REQUEST_LINES)
	});

export const okPacket = (): Packet =>
	tcpPacket({
		name: 'HTTP 200 OK',
		src: SHOP,
		dst: DEVBOX,
		seq: ISN_S + 1,
		ack: ISN_C + 1 + 79,
		flags: ['PSH', 'ACK'],
		window: 509,
		ipId: 0x9e02,
		app: textPart('HTTP', RESPONSE_LINES, { k: '本体', text: BODY, level: 1 })
	});
