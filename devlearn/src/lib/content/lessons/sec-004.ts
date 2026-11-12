// sec-004 署名と証明書（shell 模擬。世界 certs）。
// 出力は全て、模擬の bash で打って得た物。模擬は本物（Ubuntu 24.04、OpenSSL 3.0.13）の記録
// tools-real/recorded/sec-004-cert.json と一字ずつ比べてある。証明書は記録のために作った作り物で、実在の認証局ではない。
// 場面：店の Web の証明書 server.pem を、中間の証明書 inter-ca.pem・根の証明書 root-ca.pem と合わせて確かめる。
// 経過時刻 t は端末を開いた時を 0s とした。
import type { Lesson } from '../../lesson/types.ts';

const SRV = 'server.pem';
const INTER = 'inter-ca.pem';
const ROOT = 'root-ca.pem';

export const sec004: Lesson = {
	id: 'sec-004',
	field: 'sec',
	level: 2,
	title: '署名と証明書',
	goal: '電子署名と証明書の連なりを、根の証明書まで辿ることができる',
	prereq: ['sec-003'],
	related: ['net-009'],
	next: [],
	explain: [
		{
			n: 1,
			title: '中身の要約',
			lead: '署名は、文書そのものでなく要約（ハッシュ）に付ける',
			body: [
				'文書を SHA-256 にかけると、どんな長さでも 32 バイトの要約になる。',
				'1 字でも書き換えると、要約は全く別の値になる。',
				'証明書 server.pem の要約は、sha256 Fingerprint=02:00:FD:D9:… だ。'
			],
			facts: [
				{ k: '要約の長さ', v: '32 バイト（SHA-256）' },
				{ k: 'server.pem の要約', v: '02:00:FD:D9:74:BD:…:68:04:FE' }
			],
			scene: [
				{ op: 'appear', id: 'srv', label: SRV, sub: 'shop.example.com', at: [0, 1] },
				{ op: 'change', id: 'srv', k: '要約', v: '02:00:FD:D9:…' }
			],
			log: { t: '0s', from: SRV, to: SRV, kind: 'digest', info: '要約は 02:00:FD:D9:…' }
		},
		{
			n: 2,
			title: '秘密鍵で署名',
			lead: '発行者が、要約を自分の秘密鍵で閉じた物が署名',
			body: [
				'発行者は、要約を自分の秘密鍵で閉じ、署名として文書に添える。',
				'秘密鍵を持つのは発行者だけなので、ほかの者は同じ署名を作れない。',
				'server.pem の発行者は issuer=… CN = Yorozu Issuing CA 1 だ。'
			],
			facts: [
				{ k: '署名する者', v: 'Yorozu Issuing CA 1' },
				{ k: '使う鍵', v: '発行者の秘密鍵' }
			],
			scene: [
				{ op: 'appear', id: 'inter', label: INTER, sub: 'Yorozu Issuing CA 1', at: [2, 1] },
				{ op: 'move', from: 'inter', to: 'srv', payload: '署名', kind: 'sign' }
			],
			log: { t: '10s', from: INTER, to: SRV, kind: 'sign', info: 'Yorozu Issuing CA 1 が署名した' }
		},
		{
			n: 3,
			title: '公開鍵で確かめる',
			lead: '受け取った側は、発行者の公開鍵で署名を開いて比べる',
			body: [
				'署名を発行者の公開鍵で開くと、発行者が見た要約が出てくる。',
				'自分で計算した要約と同じなら、書き換えも成りすましも無い。',
				'1 字でも書き換えた文書なら、2 つの要約が合わない。'
			],
			facts: [
				{ k: '開いた要約', v: '02:00:FD:D9:…' },
				{ k: '計算した要約', v: '02:00:FD:D9:…（同じ）' },
				{ k: '結果', v: '署名は正しい' }
			],
			scene: [
				{ op: 'move', from: 'srv', to: 'inter', payload: '公開鍵で開いて比べる', kind: 'verify' },
				{ op: 'change', id: 'srv', k: '署名', v: '正しい' }
			],
			log: { t: '20s', from: SRV, to: INTER, kind: 'verify', info: '2 つの要約が同じ' }
		},
		{
			n: 4,
			title: '証明書',
			lead: '証明書は「この公開鍵はこの名前の物」に署名した文書',
			body: [
				'server.pem の subject は CN = shop.example.com、持ち主の名前だ。',
				'中には shop.example.com の公開鍵と、期限 notAfter=Jun 1 2027 が入っている。',
				'発行者が名前と公開鍵の組に署名したので、組が正しいと分かる。'
			],
			facts: [
				{ k: 'subject', v: 'C = JP, O = Example Shop, CN = shop.example.com' },
				{ k: 'issuer', v: 'C = JP, O = Yorozu Lab, CN = Yorozu Issuing CA 1' },
				{ k: '期限', v: 'Jun 1 2026 〜 Jun 1 2027' }
			],
			scene: [
				{ op: 'change', id: 'srv', k: '持ち主', v: 'shop.example.com' },
				{ op: 'change', id: 'srv', k: '期限', v: '2027-06-01 まで' }
			],
			log: {
				t: '30s',
				from: SRV,
				to: SRV,
				kind: 'cert',
				info: '持ち主 shop.example.com・期限 2027-06-01'
			}
		},
		{
			n: 5,
			title: '発行者を辿る',
			lead: '発行者の公開鍵が正しいかは、発行者の証明書で確かめる',
			body: [
				'inter-ca.pem の issuer（発行者）は Yorozu Root CA だ。',
				'中間の証明書は、根の認証局が署名している。',
				'中間を添えずに確かめると、error 20 で止まる。発行者が見つからない印だ。'
			],
			facts: [
				{ k: 'inter-ca.pem の issuer', v: 'CN = Yorozu Root CA' },
				{ k: '中間を添えないと', v: 'error 20 at 0 depth lookup' }
			],
			scene: [
				{ op: 'appear', id: 'root', label: ROOT, sub: 'Yorozu Root CA', at: [4, 1] },
				{ op: 'move', from: 'root', to: 'inter', payload: '署名', kind: 'sign' }
			],
			log: {
				t: '40s',
				from: ROOT,
				to: INTER,
				kind: 'sign',
				info: 'Yorozu Root CA が中間に署名した'
			}
		},
		{
			n: 6,
			title: '根の証明書',
			lead: '根は自分で自分に署名している。信じる根は手元に置く',
			body: [
				'root-ca.pem は、subject も issuer も Yorozu Root CA だ。自分で署名している。',
				'根は、OS やブラウザに初めから入れておき、それを信じると決める。',
				'根と中間を渡して openssl verify で確かめると、server.pem: OK が返る。'
			],
			facts: [
				{ k: 'root-ca.pem', v: 'subject = issuer = Yorozu Root CA' },
				{ k: '辿った道', v: 'server.pem → inter-ca.pem → root-ca.pem' },
				{ k: '結果', v: 'server.pem: OK' }
			],
			scene: [
				{ op: 'change', id: 'root', k: '信じる', v: '手元にある' },
				{ op: 'change', id: 'srv', k: '確かめ', v: 'OK' }
			],
			log: { t: '50s', from: SRV, to: ROOT, kind: 'chain', info: '根まで辿れたので OK' },
			why: '根を手元に置くと決めれば、世界中の証明書を一つずつ信じなくても、署名の連なりで確かめられる'
		}
	],
	example: {
		intro: '持ち主と発行者を読み、中間の有無で確かめ比べた（模擬は本物の記録と比べ済み）',
		lines: [
			'$ ls',
			'inter-ca.pem  old.pem  other-ca.pem  root-ca.pem  server.pem',
			'$ openssl x509 -in server.pem -noout -subject -issuer',
			'subject=C = JP, O = Example Shop, CN = shop.example.com',
			'issuer=C = JP, O = Yorozu Lab, CN = Yorozu Issuing CA 1',
			'$ openssl x509 -in inter-ca.pem -noout -subject -issuer',
			'subject=C = JP, O = Yorozu Lab, CN = Yorozu Issuing CA 1',
			'issuer=C = JP, O = Yorozu Lab, CN = Yorozu Root CA',
			'$ openssl x509 -in root-ca.pem -noout -subject -issuer',
			'subject=C = JP, O = Yorozu Lab, CN = Yorozu Root CA',
			'issuer=C = JP, O = Yorozu Lab, CN = Yorozu Root CA',
			'$ openssl verify -CAfile root-ca.pem server.pem',
			'C = JP, O = Example Shop, CN = shop.example.com',
			'error 20 at 0 depth lookup: unable to get local issuer certificate',
			'error server.pem: verification failed',
			'$ openssl verify -CAfile root-ca.pem -untrusted inter-ca.pem server.pem',
			'server.pem: OK'
		]
	},
	practice: {
		goal: 'server.pem を、中間 inter-ca.pem を添えて根 root-ca.pem まで辿り、OK を出す',
		tool: { name: 'shell', mode: 'mock' },
		setup: { world: 'certs' },
		success: { output: 'server.pem: OK\n' },
		mistakes: [
			{
				when: '中間の証明書を添えなかった、または別の根を渡した',
				why: 'server.pem の発行者 Yorozu Issuing CA 1 の証明書が、渡した中に無い',
				next: '-CAfile root-ca.pem に加え、-untrusted inter-ca.pem で中間を添える',
				match: 'unable to get local issuer certificate'
			},
			{
				when: '中間の証明書を、信じる根として渡した',
				why: '中間は根でない。中間の発行者 Yorozu Root CA の証明書が無いので、辿り切れない',
				next: '信じる根は -CAfile root-ca.pem、中間は -untrusted inter-ca.pem に分けて渡す',
				match: 'unable to get issuer certificate'
			},
			{
				when: '期限の切れた old.pem を確かめた',
				why: 'old.pem の期限は 2026 年 1 月 1 日で切れている。署名が正しくても使えない',
				next: '確かめる証明書を server.pem にする',
				match: 'certificate has expired'
			}
		]
	},
	check: [
		{ ask: '署名を付ける鍵と確かめる鍵', how: '発行者の秘密鍵で付け、発行者の公開鍵で確かめる' },
		{ ask: 'server.pem の連なり', how: 'server.pem → Yorozu Issuing CA 1 → Yorozu Root CA' },
		{ ask: '根の印', how: 'subject と issuer が同じ（自分で署名）' }
	]
};
