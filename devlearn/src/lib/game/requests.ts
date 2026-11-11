// 要望の中身（段 8-2b：試作の 5 件をそのまま移した。8-2c で game-design.md 第 9 章・15.3 の依頼に替える）。
// at・builds は、試作の街の目印の建物（gen の FEAT）の名前。

export type FeatKey =
	'board' | 'annex' | 'school' | 'shopMain' | 'clinic' | 'dbvault' | 'warehouse' | 'gate' | 'hall';
export type ReqOpt = { label: string; note: string; cost: number };
export type ReqDef = {
	id: string;
	who: string;
	icon: string;
	color: string;
	at: FeatKey;
	builds?: FeatKey;
	view?: number[];
	title: string;
	due: number;
	needs?: string;
	quote: string;
	conds: string[];
	reward: string;
	lesson: string;
	learnedOpt: ReqOpt;
	outOpt: ReqOpt;
};

export const REQ: Record<string, ReqDef> = {
	board: {
		id: 'board',
		who: '町内会長',
		icon: '町',
		color: '#ff9d4d',
		at: 'board',
		builds: 'annex',
		view: [-8, 6, 105, 0.62, -0.4],
		title: '掲示板を、誰がいつ直したか残したい',
		due: 3,
		quote:
			'「お祭りの日付が、いつの間にか書き換わっていたんです。誰が直したのか分かるようにしてもらえませんか。前の文面にも戻せると助かります」',
		conds: ['直した人と日時が残る', '前の文面に戻せる'],
		reward: '満足度 最大 +6',
		lesson: 'git',
		learnedOpt: {
			label: '役場の隣に記録庫を建てる',
			note: '学んだ手 ・ 中身が見える ・ 後の要望にも使える',
			cost: 200
		},
		outOpt: { label: '外の業者に任せる', note: '学ばなくても選べる ・ 中身は見えない', cost: 900 }
	},
	school: {
		id: 'school',
		who: '港の学校の先生',
		icon: '学',
		color: '#6fb3ff',
		at: 'school',
		title: '昼休みになると校内の無線が止まる',
		due: 4,
		quote:
			'「昼休みにみんなが一斉につなぐと、授業の資料が開かなくなるんです。午後の授業までに何とかなりませんか」',
		conds: ['昼休みでも資料が開く', '新しい機械は最小限'],
		reward: '満足度 最大 +5',
		lesson: 'net',
		learnedOpt: {
			label: '中継器を 1 台足して振り分ける',
			note: '学んだ手 ・ 混む理由が見える',
			cost: 300
		},
		outOpt: {
			label: '業者に回線を太くしてもらう',
			note: '学ばなくても選べる ・ 費用が高い',
			cost: 1200
		}
	},
	shop: {
		id: 'shop',
		who: '商店街の会長',
		icon: '店',
		color: '#f2c14e',
		at: 'shopMain',
		title: '売上の控えを、なくさず残したい',
		due: 5,
		needs: 'board',
		quote:
			'「帳面が雨で濡れて、先月の売上が分からなくなりました。役場の記録庫みたいに残せませんか」',
		conds: ['毎日の控えが残る', '誰が書いたか分かる'],
		reward: '満足度 最大 +5',
		lesson: 'git',
		learnedOpt: {
			label: '記録庫に商店街の帳面をつなぐ',
			note: '前に学んだ記録庫をそのまま使える',
			cost: 100
		},
		outOpt: { label: '外の業者に任せる', note: '学ばなくても選べる', cost: 800 }
	},
	clinic: {
		id: 'clinic',
		who: '診療所の受付',
		icon: '診',
		color: '#3fd0c0',
		at: 'clinic',
		builds: 'dbvault',
		view: [0, 0, 85, 0.62, -2.4],
		title: '予約の数が、帳面と合わない',
		due: 4,
		quote:
			'「同じ人の予約が 2 回書いてあったり、数えるたびに数が違ったりするんです。明日の予約が何件か、すぐ分かるようにしたい」',
		conds: ['日ごとの予約の数がすぐ分かる', '二重の予約を見つけられる'],
		reward: '満足度 最大 +5',
		lesson: 'db',
		learnedOpt: {
			label: '診療所の隣に帳簿の倉庫を建てる',
			note: '学んだ手 ・ 表にして数えられる',
			cost: 250
		},
		outOpt: {
			label: '外の業者に予約の機械を入れてもらう',
			note: '学ばなくても選べる ・ 中身は見えない',
			cost: 1000
		}
	},
	harbor: {
		id: 'harbor',
		who: '港の倉庫の番頭',
		icon: '港',
		color: '#ff7a59',
		at: 'warehouse',
		builds: 'gate',
		view: [0, 10, 110, 0.6, 2.6],
		title: '夜中に、知らない所から記録へつながろうとする',
		due: 4,
		quote:
			'「荷の記録を見る機械に、夜中に知らない所から何度もつなごうとした跡があるんです。うちの事務所からだけ見られるようにできませんか」',
		conds: ['事務所からは今まで通り見られる', '知らない所からは届かない'],
		reward: '満足度 最大 +5',
		lesson: 'sec',
		learnedOpt: {
			label: '港の入口に門番の小屋を建てる',
			note: '学んだ手 ・ 断った記録が残る',
			cost: 300
		},
		outOpt: {
			label: '外の業者に見張ってもらう',
			note: '学ばなくても選べる ・ 毎月の費用がかさむ',
			cost: 1100
		}
	}
};
