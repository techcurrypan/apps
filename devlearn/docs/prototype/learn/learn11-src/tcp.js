// ================= レッスン 1：TCP の送信と ACK（カーネルの中）—— 見せ方の型：stack（層・関数の箱・キュー・文脈） =================
(() => {
  // 物の種類と名前。置き場所はステップごとの layout で決める（画面 1000 × 600 に、関わる物だけを大きく）
  const OB = {
    app: { k: 'laptop', c: C.blue, f: 'send(fd, buf, 65536)', s: 'アプリ（ユーザー空間）' },
    smsg: { k: 'func', c: C.blue, f: 'tcp_sendmsg_locked()', s: '送るデータを skb に写す', g: 'ƒ' },
    wq: { k: 'queue', c: C.teal, f: 'sk_write_queue', s: '送信キュー（まだ送っていない）' },
    ack: { k: 'func', c: C.orange, f: 'tcp_ack()', s: 'ACK を受けて片付ける（softirq）', g: '✓' },
    xmit: { k: 'func', c: C.blue, f: 'tcp_write_xmit()', s: '送るか待つかを決める', g: '?' },
    tx: { k: 'func', c: C.blue, f: 'tcp_transmit_skb()', s: 'clone してヘッダを付ける', g: 'ƒ' },
    rtx: { k: 'queue', c: C.teal, f: 'tcp_rtx_queue', s: '再送キュー（ACK 待ち）' },
    ipq: { k: 'func', c: C.gray, f: 'ip_queue_xmit()', s: 'IP ヘッダ・経路', g: 'IP' },
    fq: { k: 'queue', c: C.teal, f: 'qdisc: fq', s: '送る時刻まで待つ', clock: true },
    gro: { k: 'func', c: C.orange, f: 'napi_gro_receive()', s: 'NAPI・GRO（softirq）', g: '⇉' },
    ring: { k: 'ring', c: C.gray, f: 'ndo_start_xmit()', s: 'ドライバの送信リング' },
    nic: { k: 'nic', c: C.purple, f: 'NIC（TSO）', s: 'MSS ごとに割って送る' },
    irq: { k: 'func', c: C.red, f: 'RX 割り込み', s: 'NIC → CPU（hardirq）', g: '⚡' },
    rapp: { k: 'laptop', c: C.blue, f: 'recv()', s: '受け手のアプリ' },
    rtcp: { k: 'func', c: C.orange, f: 'tcp_rcv_established()', s: '並びを確かめ ACK を返す', g: 'ƒ' },
    rgro: { k: 'func', c: C.orange, f: 'napi_gro_receive()', s: '受け手：10 枚を 1 つに', g: '⇉' },
    rnic: { k: 'nic', c: C.purple, f: '受け手の NIC', s: 'パケットを受ける' }
  };
  const at = (id) => { const q = scnPos(id); return q ? { ...OB[id], ...q, sub: OB[id].s, id } : null; };
  const top = (id, up = 14) => { const o = at(id); return o ? objTop(o, up) : [500, 300]; }, ctr = top;
  const slot = (id, i) => { const o = at(id); return o ? localProj(o.x, o.y, o.s)(-78 + i * 52, 0, objH(o) + 10) : [500, 300]; };
  const edge = (id, dir) => { const o = at(id); const [fw, fd] = objFoot(o); return [o.x + dir[0] * (fw + fd) * .5 * ISO.ax * o.s * .9, o.y + dir[1] * (fw + fd) * .5 * ISO.ay * o.s * .9]; };
  const wire = (a = 'nic', b = 'rnic') => { const A = at(a), B = at(b); if (!A || !B) return [[0, 0], [0, 0]]; const y = Math.max(A.y, B.y) + 70; return [[A.x + 40, A.y + 30], [A.x + 40, y], [B.x - 40, y], [B.x - 40, B.y + 30]]; };
  function stage(o = {}) { let s = ''; const ids = Object.keys(OB).filter((id) => { const q = scnPos(id); return q && q.op > .01; });
    for (const [a, b, kind] of o.links || []) { const A = at(a), B = at(b); if (!A || !B) continue; const op = Math.min(A.op, B.op); const dx = B.x - A.x, dy = B.y - A.y, Ln = Math.hypot(dx, dy) || 1;
      const ra = (objFoot(A)[0] + objFoot(A)[1]) * .36 * A.s, rb = (objFoot(B)[0] + objFoot(B)[1]) * .36 * B.s;
      s += line([[A.x + dx / Ln * ra, A.y + dy / Ln * ra * .6], [B.x - dx / Ln * rb, B.y - dy / Ln * rb * .6]], { c: kind === 'ack' ? C.green : 'var(--ink)', w: 1.8, op: op * .85, dash: kind === 'ack' ? '7 5' : undefined, both: kind === 'both', flow: true, flowC: kind === 'ack' ? C.green : C.blue }); }
    s += o.floor || '';
    ids.sort((a, b) => at(a).y - at(b).y);
    for (const id of ids) { const q = at(id); s += drawObj(q, { op: q.op, hl: (o.hl || []).includes(id) }); }
    s += o.under || '';
    for (const id of ids) { const q = at(id); const nm = (o.names || {})[id]; if (q.op > .3) s += objLabel(nm ? { ...q, f: nm[0], sub: nm[1] } : q, { sub: !(o.nosub || []).includes(id), op: q.op, term: nm ? ({ smsg: 'kernel', rapp: 'recv' })[id] || id : id }); }
    return s; }
  const skb = (p, lab, c = C.blue, o = {}) => tok(p, lab, c, o);
  const pk = (p, c = C.blue, o = {}) => pkt(p, c, o);
  const cwl = (n, c, p) => badge(p[0], p[1], `cwnd ${n} MSS`, c, { center: true, size: 14, mono: true });
  const ctxBreak = (p, op = 1) => badge(p[0], p[1], '⚡ ここで実行の文脈が変わる', C.red, { center: true, op, size: 13 });
  const p = (h, at) => ({ h, at });
  const MSS = 1448;
  const steps = [
    { kind: 'problem', short: '問題', title: 'send() はすぐ戻るのに、届くのは後', cam: [0, 0, 1000, 600], layout: { app: [130, 250], wq: [390, 300], nic: [640, 340], rapp: [880, 250] }, links: [['app', 'wq'], ['wq', 'nic']], dur: 5200,
      metrics: { cwnd: '10 MSS', wq: '0 B', flight: '0 B', rtx: '0 回', rtt: '30 ms' },
      paras: [p('アプリが <code>send()</code> で <span class="n">64 KB</span> を渡すと、関数は約 <span class="n">40 µs</span> で戻る。でも相手の <code>recv()</code> に全部が届くのは、RTT <span class="n">30 ms</span> の道で <span class="n">60 ms</span> ほど後になる。', 0),
        p('その間、データは<b>カーネルの中の 4 つの置き場</b>（送信キュー・再送キュー・qdisc・NIC のリング）を渡り歩き、<b>ACK</b> が返るたびに次が送られる。', 1800),
        p('このレッスンでは、1 つの <code>send()</code> を、関数とキューの単位で、線の向こうの ACK まで追う。', 3600)],
      callout: ['ポイント', '「送った」は「キューに入れた」の意味でしかない。遅さの原因は、どのキューで待っているかで分かる。'],
      changes: [['+', 'アプリが send(64 KB) を呼ぶ'], ['~', 'send() は 40 µs で戻る']],
      deep: '<p>Linux v6.12 の道筋：<code>send()</code> → <code>__sys_sendto()</code> → <code>tcp_sendmsg()</code>（ソケットを掴む）→ <code>tcp_sendmsg_locked()</code>。戻るのは skb に写し終えた時で、相手に届いた時ではない（<code>net/ipv4/tcp.c</code>）。</p>',
      draw(t) { let s = stage({ links: this.links, hl: ['app'] }); const W = wire('nic', 'rapp'); const k = Lin(t % 3800, 0, 3600);
        const path = [top('app'), top('wq'), top('nic'), [top('nic')[0] + 120, top('nic')[1] - 40], top('rapp')];
        s += line([top('nic'), [top('nic')[0] + 120, top('nic')[1] - 40], top('rapp')], { c: 'var(--ink)', w: 1.6, dash: '6 5', op: .5 });
        if (t > 300) s += skb(along(path, k), '64 KB', C.blue, { w: 56 });
        s += badge(top('app')[0], top('app')[1] - 60, 'send() は 40 µs で戻る', C.green, { center: true, op: P(t, 600, 500), size: 14 });
        s += badge(top('rapp')[0], top('rapp')[1] - 60, '届くのは 60 ms 後', C.orange, { center: true, op: P(t, 1800, 400), size: 14 });
        s += badge(top('nic')[0] + 140, top('nic')[1] - 90, 'RTT 30 ms', C.gray, { center: true, op: P(t, 1800, 400), mono: true }); return s; } },
    { kind: 'mech', short: 'skb を作る', title: 'skb を作って送信キューへ', cam: [0, 0, 1000, 600], layout: { app: [150, 270], smsg: [470, 300], wq: [800, 300] }, links: [['app', 'smsg'], ['smsg', 'wq']], dur: 4200,
      metrics: { wq: '65,536 B' },
      paras: [p('<code>tcp_sendmsg_locked()</code> は、アプリのデータを <b>skb</b>（ソケットバッファ）に写す。1 つの skb の大きさは「1 ms で送れる量」を目安に決まり、ここでは <span class="n">22 MSS = 31,856 B</span>。', 0),
        p('64 KB は <b>A・B</b>（各 31,856 B）と <b>C</b>（1,824 B）の 3 つに分かれ、<code>sk_write_queue</code> の後ろに並ぶ。ここまで全部<b>システムコールの文脈</b>（アプリのプロセス）で動く。', 1500),
        p('送信キューが <code>sk_sndbuf</code> を超えると、<code>send()</code> はここで待たされる（ブロック）。速いアプリが遅い線に詰まるのはこの所。', 3000)],
      callout: ['知っておくと便利', 'MSS 1,448 B ＝ MTU 1,500 − IP 20 − TCP 20 − 時刻の付け足し 12。'],
      changes: [['+', 'skb A・B・C が送信キューに入った'], ['~', '送信キュー 0 → 65,536 B']],
      deep: '<p>大きさは <code>tcp_send_mss()</code> → <code>tcp_xmit_size_goal()</code> が、<code>tcp_tso_autosize()</code>（ペーシングの速さ × 約 1 ms、最低 2 MSS）から決める。skb は <code>tcp_stream_alloc_skb()</code> で作り、<code>tcp_skb_entail()</code> で送信キューの後ろに付ける。</p>',
      draw(t) { let s = stage({ links: this.links, hl: ['smsg', 'wq'] }); const blob = P(t, 200, 900);
        if (t < 1500) s += skb(mix(top('app'), top('smsg'), blob), '64 KB', C.blue, { w: 60 });
        [['A', 0], ['B', 1], ['C', 2]].forEach(([n, i]) => { const k = P(t, 1300 + i * 350, 800); if (t >= 1300) s += skb(mix(top('smsg'), slot('wq', i), k), n, C.blue, { w: n === 'C' ? 30 : 44 }); });
        if (t > 2600) s += badge(top('wq')[0], top('wq')[1] - 110, 'A 31,856 ・ B 31,856 ・ C 1,824 B', C.teal, { center: true, mono: true, op: P(t, 2600, 500) });
        if (t > 3000) s += pulse(...slot('wq', 2), t, C.blue, 14, { iso: true }); return s; } },
    { kind: 'inside', short: '送るか待つか', title: '送るか待つか：cwnd が 10 MSS しか許さない', cam: [0, 0, 1000, 600], layout: { wq: [230, 230], xmit: [520, 360], tx: [820, 280] }, links: [['wq', 'xmit'], ['xmit', 'tx']], dur: 5200,
      paras: [p('<code>tcp_write_xmit()</code> は送信キューの先頭（A）を<b>覗いて</b>、送ってよいかを 4 つの条件で確かめる。', 0),
        p('相手の受信窓は <span class="n">64 KB</span> 空いている。でも <b>cwnd</b>（輻輳窓）は始めは <span class="n">10 MSS = 14,480 B</span>。まだ ACK が 1 つも返っていないので、これ以上は線に出せない。', 1200),
        p('そこで A を <code>tso_fragment()</code> で <b>A1（14,480 B）と A2（17,376 B）</b>に割り、A1 だけを送る。A2 は送信キューの先頭に戻る。', 3200)],
      callout: ['注意', '「帯域が太いのに遅い」の多くは、始めの cwnd と RTT で決まる。最初の 1 往復で送れるのは 14 KB 余り。'],
      changes: [['~', 'A を A1・A2 に割った'], ['+', 'A1 だけ送ると決めた']],
      deep: '<p>条件：<code>tcp_snd_wnd_test()</code>（受信窓）・<code>tcp_cwnd_test()</code>（cwnd − 未 ACK）・<code>tcp_nagle_test()</code>・<code>tcp_small_queue_check()</code>（TSQ）。TSO の塊を待つかは <code>tcp_tso_should_defer()</code>。初期の cwnd は <code>TCP_INIT_CWND = 10</code>（<code>include/net/tcp.h</code>、RFC 6928）。</p>',
      draw(t) { const ck = [['受信窓 64 KB', 1, 900], ['cwnd 14,480 B まで', 0, 1500], ['Nagle', 1, 2100], ['TSQ', 1, 2500]];
        let s = stage({ links: this.links, hl: ['xmit'] });
        const peek = mix(slot('wq', 0), top('xmit'), P(t, 200, 800)); const split = P(t, 3200, 900);
        if (split < .01) s += skb(peek, 'A', C.blue); else { s += skb(top('xmit'), 'A1', C.blue, { w: 40 }); s += skb(mix(top('xmit'), slot('wq', 0), split), 'A2', C.blue, { w: 44 }); }
        s += skb(slot('wq', 1), 'B', C.blue) + skb(slot('wq', 2), 'C', C.blue, { w: 30 });
        if (t > 800) s += card(30, 400, [['送ってよいか（4 つの条件）', 'var(--mut)']].concat(ck.map(([n, ok, at]) => [(ok ? '✓ ' : '✕ ') + n, ok ? C.green : C.red, P(t, at, 300)])), { w: 250, lh: 24, size: 14, op: P(t, 800, 300) });
        if (t > 4200) s += pulse(...top('xmit'), t, C.blue, 18, { iso: true }); return s; } },
    { kind: 'inside', short: 'clone', title: 'clone して下へ。元は再送キューで ACK を待つ', cam: [0, 0, 1000, 600], layout: { xmit: [150, 230], tx: [430, 300], rtx: [760, 200], ipq: [760, 440] }, links: [['xmit', 'tx'], ['tx', 'rtx'], ['tx', 'ipq']], dur: 4600,
      metrics: { wq: '51,056 B', flight: '14,480 B' },
      paras: [p('<code>tcp_transmit_skb()</code> は A1 を<b>写し（clone）</b>、写しに TCP ヘッダ（seq・ack・窓・オプション）を付けて IP 層へ渡す。', 0),
        p('元の A1 は<b>再送キュー</b>（<code>tcp_rtx_queue</code>）へ移る。線の上で落ちても、ここから送り直せるように、ACK が返るまで消さない。', 1700),
        p('写しは中身のデータを共有するので、64 KB を 2 回写すわけではない。増えるのは skb の頭（約 240 B）だけ。', 3200)],
      callout: ['ポイント', '未 ACK（送ったが確かめられていない量）＝ 再送キューの中身。ss の unacked はここを数えている。'],
      changes: [['+', 'A1 の写しが IP 層へ'], ['~', 'A1 が送信キュー → 再送キュー']],
      deep: '<p><code>__tcp_transmit_skb()</code> が <code>skb_clone()</code> し、<code>tcp_options_write()</code> で見出しを書いて <code>icsk-&gt;icsk_af_ops-&gt;queue_xmit</code>（= <code>ip_queue_xmit()</code>）を呼ぶ。元は <code>tcp_event_new_data_sent()</code> → <code>tcp_rbtree_insert()</code> で再送キュー（赤黒木）へ。</p>',
      draw(t) { let s = stage({ links: this.links, hl: ['tx', 'rtx'] });
        const a = mix(top('xmit'), top('tx'), P(t, 0, 700)); const cl = P(t, 800, 600), down = P(t, 1500, 1000), side = P(t, 1700, 900);
        if (t < 800) s += skb(a, 'A1', C.blue, { w: 40 });
        else { s += skb(mix(top('tx'), slot('rtx', 0), side), 'A1', C.blue, { w: 40 }); const cp = mix([top('tx')[0] + 40 * cl, top('tx')[1]], top('ipq'), down); s += skb(cp, 'A1′（写し）', C.purple, { w: 40, op: cl });
          if (cl > .5 && down < .9) s += badge(cp[0] + 70, cp[1] - 20, '+ TCP 32 B', C.purple, { op: cl, mono: true }); }
        if (t > 2600) s += clock(slot('rtx', 0)[0] + 70, slot('rtx', 0)[1] - 50, 'ACK 待ち', C.orange); return s; } },
    { kind: 'mech', short: 'qdisc', title: 'qdisc で「送る時刻」まで待つ（ペーシング）', cam: [0, 0, 1000, 600], layout: { ipq: [170, 260], fq: [490, 320], ring: [820, 300] }, links: [['ipq', 'fq'], ['fq', 'ring']], dur: 4800,
      paras: [p('IP ヘッダ（20 B）を付けた写しは、<b>qdisc</b>（送信の待ち行列）に入る。<code>fq</code> は skb ごとに<b>送ってよい時刻</b>（EDT）を持たせ、その時刻まで出さない。', 0),
        p('時刻はペーシングの速さから決まる。始め（スロースタート）は <code>2 × cwnd ÷ RTT</code> ＝ 約 <span class="n">7.7 Mbps</span>。14,480 B の塊どうしは約 <span class="n">15 ms</span> ずつ空けて出し、まとめて押し出さない。', 1600),
        p('時刻が来ると、ドライバの送信リングへ渡る。リングは NIC が直接読む置き場。', 3200)],
      callout: ['知っておくと便利', '既定の qdisc は <code>sysctl net.core.default_qdisc</code>。fq_codel の所も多い。BBR は fq のペーシングと組で使うのが基本。'],
      changes: [['+', 'IP ヘッダ 20 B'], ['~', 'fq で送る時刻まで待った']],
      deep: '<p>速さは <code>tcp_update_pacing_rate()</code>：スロースタート中は <code>tcp_pacing_ss_ratio</code>（既定 200%）、その後は <code>tcp_pacing_ca_ratio</code>（既定 120%）。fq は <code>sch_fq.c</code> の <code>fq_enqueue()</code> で skb の <code>tstamp</code> を見て、時刻まで流れごとの木に置く。</p>',
      draw(t) { let s = stage({ links: this.links, hl: ['fq'] }); const inq = P(t, 0, 800), out = P(t, 3000, 900);
        const pos = out > 0 ? mix(slot('fq', 1), top('ring'), out) : mix(top('ipq'), slot('fq', 1), inq);
        s += skb(pos, 'A1′', C.purple, { w: 40 });
        if (t > 600 && t < 3100) s += clock(slot('fq', 1)[0] + 40, slot('fq', 1)[1] - 90, '送る時刻まで ' + Math.max(0, 15 - Math.round(clamp((t - 600) / 2400) * 15)) + ' ms', C.orange);
        s += badge(top('ipq')[0], top('ipq')[1] - 60, '+ IP 20 B', C.teal, { center: true, op: inq, mono: true }); return s; } },
    { kind: 'mech', short: 'TSO', title: 'NIC の TSO で 10 枚に割れて線へ', cam: [0, 0, 1000, 600], layout: { ring: [130, 230], nic: [390, 330], rnic: [830, 300] }, links: [['ring', 'nic']], dur: 5600,
      paras: [p('ドライバは skb をリングに置き、NIC に知らせる。14,480 B の塊は線にそのままは乗らない（1 枚 1,500 B まで）。', 0),
        p('<b>TSO</b>（TCP の分割を NIC に任せる）が、塊を <span class="n">MSS 1,448 B</span> ごとの <span class="n">10 枚</span>に割り、それぞれに見出しを写して seq を進める。CPU は 1 回渡しただけ。', 1300),
        p('10 枚は約 <span class="n">1.2 µs</span>（10 Gbps）ずつの間隔で線に出て、受け手へ向かう。', 3000)],
      callout: ['ポイント', 'tcpdump で送り手に 14 KB の大きなパケットが見えるのは TSO のせい。線の上は 1,514 B ずつ。'],
      changes: [['+', '10 枚のパケット'], ['~', '塊 14,480 B → 1,514 B × 10']],
      deep: '<p>TSO が使えない時はカーネルの GSO（<code>skb_segment()</code>）が同じ割り方をする。<code>ethtool -k eth0 | grep segmentation</code> で確かめられる。</p>',
      draw(t) { let s = stage({ links: this.links, hl: ['nic'], floor: line(wire(), { c: 'var(--ink)', w: 3, head: false, op: .55 }) }); const W = wire(); const toNic = P(t, 0, 900), sp = P(t, 1200, 900);
        s += T((W[1][0] + W[2][0]) / 2, W[1][1] + 26, '線：1 枚 1,514 B（MTU 1,500）', { a: 'middle', size: 13, w: 700, fill: 'var(--mut)', halo: true });
        if (sp < .02) s += skb(mix(top('ring'), top('nic'), toNic), 'A1′ 14,480 B', C.purple, { w: 46 });
        for (let i = 0; i < 10; i++) { if (sp < .02) break; const b0 = [top('nic')[0] - 90 + i * 20, top('nic')[1] - 10]; const go = Lin(t, 2400 + i * 160, 1600);
          const route = [b0, ...W, top('rnic')]; s += pk(go > 0 ? along(route, go) : mix(top('nic'), b0, sp), C.purple, { op: go >= 1 ? .6 : 1 }); }
        if (t > 1600) s += badge(top('nic')[0] + 40, top('nic')[1] - 80, '1,448 B × 10（seq 1 … 14,481）', C.purple, { op: P(t, 1600, 400), mono: true }); return s; } },
    { kind: 'mech', short: 'GRO と ACK', title: '受け手：GRO でまとめ、ACK を返す', cam: [0, 0, 1000, 600], layout: { rnic: [170, 400], rgro: [470, 330], rtcp: [790, 250] }, links: [['rnic', 'rgro'], ['rgro', 'rtcp']], dur: 5600,
      metrics: { rtt: '30 ms' },
      paras: [p('10 枚が届くと NIC が <b>割り込み</b>（hardirq）を上げる。割り込みは短く済ませ、残りは <b>softirq</b> の <b>NAPI</b> がまとめて拾う。', 0),
        p('<b>GRO</b> は同じ流れの続きのパケットを 1 つの大きな skb にまとめ直す。TCP の処理は 10 回でなく 1 回で済む。', 1500),
        p('<code>tcp_rcv_established()</code> は並びが正しいことを確かめ、<b>ACK（ack = 14,481）</b>を作って返す。ACK は「14,481 番の前までは全部受け取った」の意味。', 3000)],
      callout: ['知っておくと便利', '受け手は普通 2 枚分ごとに ACK を返す（遅延 ACK）。始めは速く返す「クイック ACK」の時期がある。'],
      changes: [['+', 'GRO で 1 つの 14,480 B'], ['+', 'ACK（ack = 14,481）が戻り道へ']],
      deep: '<p>受信：<code>napi_poll()</code> → ドライバの poll → <code>napi_gro_receive()</code> → <code>netif_receive_skb()</code> → <code>ip_rcv()</code> → <code>tcp_v4_rcv()</code> → <code>tcp_rcv_established()</code> → <code>__tcp_ack_snd_check()</code>。全て NET_RX の softirq の中。</p>',
      draw(t) { let s = stage({ links: this.links, hl: ['rgro', 'rtcp'] }); const up = P(t, 300, 1000), merge = P(t, 1500, 800), up2 = P(t, 2400, 800), ackp = Lin(t, 3200, 2200);
        if (merge < .05) for (let i = 0; i < 10; i++) s += pk(mix([top('rnic')[0] - 90 + i * 20, top('rnic')[1]], [top('rgro')[0] - 90 + i * 20, top('rgro')[1]], up), C.purple);
        else if (t < 3300) s += skb(mix(top('rgro'), top('rtcp'), up2), '14,480 B', C.purple, { w: 30 + 30 * merge });
        s += badge(top('rnic')[0], top('rnic')[1] - 60, '割り込み（hardirq）', C.red, { center: true, op: 1 - up }); if (t > 1000) s += ctxBreak([top('rgro')[0], top('rgro')[1] - 80], P(t, 1000, 300) * (1 - P(t, 2300, 400)));
        if (t > 3200) { const route = [top('rtcp'), top('rgro'), top('rnic'), [top('rnic')[0] - 60, 560], [20, 560]]; s += line(partial(route, ackp), { c: C.green, w: 3, op: .7, dash: '8 6', head: false }); s += skb(along(route, ackp), 'ACK 14,481', C.green, { w: 40 }); }
        return s; } },
    { kind: 'mech', short: 'ACK を受ける', title: 'ACK を受けて片付け、続きを送る（softirq の中）', cam: [0, 0, 1000, 600], layout: { irq: [110, 440, .85], gro: [330, 450, .85], ack: [560, 360, .9], rtx: [850, 450, .85], xmit: [560, 130, .85], wq: [850, 170, .85] }, links: [['irq', 'gro'], ['gro', 'ack'], ['ack', 'rtx'], ['ack', 'xmit'], ['wq', 'xmit']], dur: 6400,
      metrics: { cwnd: '20 MSS', wq: '22,096 B', flight: '28,960 B' },
      paras: [p('ACK が送り手の NIC に着くと、ここでも割り込み → softirq。<b>アプリの send() とは別の文脈</b>で、<code>tcp_ack()</code> が動く。', 0),
        p('<code>tcp_ack()</code> は A1 を再送キューから外し、RTT を測る。スロースタート中は ACK された分だけ cwnd を増やすので <span class="n">10 → 20 MSS</span>。', 2000),
        p('続けて <code>tcp_data_snd_check()</code> が <code>tcp_write_xmit()</code> を<b>softirq の中から</b>呼び、A2 と B の一部（計 <span class="n">28,960 B</span>）を送る。ACK が送りを駆動する（ACK クロック）。', 3600)],
      callout: ['ポイント', '同じ tcp_write_xmit() が、送る時はシステムコールから、ACK の後は softirq から呼ばれる。「アプリが止まっていても送りは進む」理由。'],
      changes: [['-', 'A1 が再送キューから消えた'], ['~', 'cwnd 10 → 20 MSS'], ['+', '次の 28,960 B を送った']],
      deep: '<p><code>tcp_ack()</code> → <code>tcp_clean_rtx_queue()</code>（外す・RTT の標本）→ <code>tcp_cong_control()</code>（CUBIC の <code>cubictcp_cong_avoid()</code>、スロースタートは <code>tcp_slow_start()</code>）。その後 <code>tcp_data_snd_check()</code> → <code>tcp_push_pending_frames()</code> → <code>tcp_write_xmit()</code>。</p>',
      draw(t) { let s = stage({ links: this.links, hl: ['ack', 'xmit', 'rtx'], nosub: ['irq', 'gro', 'wq'] }); const r1 = [[0, 460], top('irq'), top('gro'), top('ack')]; const k = P(t, 0, 1800);
        if (t < 2000) s += skb(along(r1, k), 'ACK', C.green, { w: 40 }); if (t > 500 && t < 2600) s += ctxBreak([top('gro')[0], top('gro')[1] - 70], P(t, 500, 300) * (1 - P(t, 2200, 300)));
        const gone = P(t, 2000, 700); s += skb(slot('rtx', 0), 'A1', C.blue, { w: 40, op: 1 - gone, scale: 1 - .4 * gone });
        if (t > 2000 && t < 3000) s += badge(slot('rtx', 0)[0], slot('rtx', 0)[1] - 60, '✓ ACK 済み', C.green, { center: true });
        if (t > 3400) s += badge(top('xmit')[0] - 210, (top('xmit')[1] + top('ack')[1]) / 2 + 40, 'tcp_data_snd_check() → tcp_write_xmit()', C.orange, { center: true, mono: true, op: P(t, 3700, 300) }) + pulse(...top('xmit'), t, C.orange, 16, { iso: true });
        const go = Lin((t - 4400) % 2600, 0, 2400); if (t > 4400) { const route = [slot('wq', 0), top('xmit'), [top('xmit')[0] - 300, top('xmit')[1] + 60], [-40, top('xmit')[1] + 120]]; s += skb(along(route, go), 'A2', C.blue, { w: 44 }); s += skb(along(route, Math.max(0, go - .1)), 'B', C.blue); }
        else s += skb(slot('wq', 0), 'A2', C.blue, { w: 44 }) + skb(slot('wq', 1), 'B', C.blue);
        s += skb(slot('wq', 2), 'C', C.blue, { w: 30 }); s += cwl(t > 2400 ? 20 : 10, t > 2400 ? C.blue : C.gray, [top('xmit')[0] + 150, top('xmit')[1] - 20]); return s; } },
    { kind: 'fail', short: '1 枚落ちる', title: '失敗：1 枚落ちると、再送キューから送り直す', cam: [0, 0, 1000, 600], layout: { rtx: [150, 170, .9], ack: [440, 160, .9], nic: [200, 420, .9], rnic: [800, 420, .9], rtcp: [820, 160, .9] }, links: [['ack', 'rtx'], ['rnic', 'rtcp']], dur: 7000,
      metrics: { cwnd: '14 MSS', rtx: '1 回' },
      paras: [p('次の 20 枚のうち <b>4 枚目</b>が途中で落ちた（混んだ機器のキューがあふれた）。受け手には 5 枚目以降が先に届く。', 0),
        p('受け手は「まだ 4 枚目の前までしか揃っていない」と同じ ack の <b>重複 ACK</b> を返し、SACK で「5〜20 枚目は持っている」と知らせる。', 1800),
        p('送り手の <code>tcp_ack()</code> は抜けを見つけ、<b>再送キューに残っていた 4 枚目</b>を送り直す（速い再送）。RTO（約 200 ms 以上）を待たない。', 3600),
        p('落ちたのは混雑の印なので、CUBIC は cwnd を <span class="n">0.7 倍</span>（20 → 14 MSS）にする。', 5200)],
      callout: ['注意', '再送キューが無ければ送り直せない。「ACK が来るまで消さない」設計が、落ちても届く TCP の土台。'],
      changes: [['-', '4 枚目が落ちた'], ['+', '重複 ACK と SACK'], ['~', '再送 1 回・cwnd 20 → 14 MSS']],
      deep: '<p>v6.12 の既定の喪失の見つけ方は RACK-TLP（RFC 8985、<code>net.ipv4.tcp_recovery = 1</code>）。重複 ACK 3 回を待たず、後の段が届いた時刻から「4 枚目は失われた」と決める。送り直しは <code>tcp_retransmit_skb()</code>。減らし方は <code>cubictcp_recalc_ssthresh()</code>（β = 717/1024 ≈ 0.7）と PRR（RFC 6937）。</p>',
      draw(t) { const W = wire(); let s = stage({ links: this.links, hl: ['rtx', 'ack'], floor: line(W, { c: 'var(--ink)', w: 3, head: false, op: .5 }) }); const seq = [...W, top('rnic')];
        for (let i = 0; i < 8; i++) { const g = Lin(t, i * 120, 1500); if (i === 3) { const pp = along(seq, Math.min(g, .45)); const fall = P(t, 600, 700); s += pk([pp[0], pp[1] + 50 * fall], C.red, { op: 1 - fall * .5 }); if (fall > .3) s += cross(pp[0] + 24, pp[1] + 50 * fall - 26, 9, C.red); } else if (g < 1) s += pk(along(seq, g), C.blue); }
        const back = [top('rnic'), [top('rnic')[0], 300], [top('ack')[0] + 60, 300], top('ack')];
        for (let i = 0; i < 3; i++) { const g = Lin(t, 1800 + i * 450, 1600); if (t > 1800 && g < 1) s += skb(along(back, g), 'dup ACK', C.green, { w: 30 }); }
        if (t > 1900) s += badge(620, 300, 'ack = 18,825 ・ SACK 20,273–43,441', C.green, { op: P(t, 1900, 400), mono: true, center: true });
        const re = P(t, 3800, 2400); s += skb(slot('rtx', 1), '#4', re > 0 ? C.red : C.blue, { w: 40 }); if (re > 0) { const r2 = [slot('rtx', 1), top('nic'), ...W]; s += skb(along(r2, re), '#4 再送', C.red, { w: 40 }); }
        s += skb(slot('rtx', 0), 'A2', C.blue, { w: 44 }) + skb(slot('rtx', 2), 'B', C.blue);
        s += badge(top('rtx')[0] + 40, top('rtx')[1] - 70, `cwnd ${t > 5200 ? 14 : 20} MSS`, t > 5200 ? C.red : C.gray, { center: true, mono: true, size: 14 }); return s; } },
    { kind: 'ops', short: 'ss で見る', title: '運用：ss -ti の数を図に重ねて読む', cam: [0, 0, 1000, 600], layout: { xmit: [140, 190, .9], wq: [400, 160, .9], rtx: [400, 430, .9], fq: [140, 450, .9] }, links: [], dur: 6000,
      paras: [p('現場では <code>ss -tin</code> で、1 本の接続の中の数を読む。図のどこを数えているかを結ぶ。', 0),
        p('<code>cwnd:14</code> は tcp_write_xmit() が見る窓、<code>unacked:20</code> は再送キュー、<code>notsent:22096</code> は送信キューの未送信、<code>retrans:0/1</code> は送り直しの数。', 1400),
        p('<code>rtt:30.2/0.8</code> は平均と揺れ。retrans が増え続ける・cwnd が育たないなら、線の途中のキューあふれを疑う。<code>nstat -az TcpExtTCPLostRetransmit</code> と <code>tc -s qdisc</code> の dropped も見る。', 3200)],
      callout: ['目安', '1 分あたりの再送が送った段の 1% を超えるなら調べる。RTT の揺れ（後ろの数）が平均の半分を超えるなら、途中のキューが伸び縮みしている。'],
      changes: [['+', 'ss の 5 つの数と図の置き場の対応']],
      deep: '<p>ss は <code>INET_DIAG</code>（netlink）で <code>tcp_get_info()</code> の値（<code>struct tcp_info</code>）を読む。<code>notsent</code> は <code>write_seq − snd_nxt</code>、<code>unacked</code> は <code>packets_out</code>。</p>',
      draw(t) { let s = stage({ links: this.links, hl: ['xmit', 'wq', 'rtx', 'fq'], nosub: ['xmit', 'wq', 'rtx', 'fq'] }); const x0 = 600, y0 = 110;
        const lines = [['$ ss -tin dst 203.0.113.80', '#7fd1a8'], 'ESTAB 0 0 10.0.0.5:51234', ' cubic rto:232 rtt:30.2/0.8', ' mss:1448 cwnd:14 ssthresh:14', ' unacked:20 retrans:0/1', ' notsent:22096 delivered:31'];
        s += card(x0, y0, lines, { dark: true, w: 370, lh: 26, size: 14, op: P(t, 0, 500) });
        const maps = [[3, 150, 'xmit', 1400], [4, 30, 'rtx', 1900], [5, 30, 'wq', 2400], [4, 170, 'rtx', 2900], [2, 160, 'fq', 3400]];
        maps.forEach(([row, dx, id, at]) => { const kk = P(t, at, 600); if (kk > 0) { const a = [x0 + dx, y0 + 9 + row * 26 + 4]; s += line(partial([a, top(id, 20)], kk), { c: C.orange, w: 2.2, dash: '6 4' }) + `<circle cx="${a[0]}" cy="${a[1]}" r="5" style="fill:${C.orange};opacity:${kk}"/>`; } });
        return s; } },
    { kind: 'sum', short: 'まとめ', title: 'まとめ：3 つの道と 4 つの置き場', cam: [0, 0, 1000, 600], layout: { app: [90, 160, .72], wq: [290, 150, .72], xmit: [290, 360, .72], rtx: [500, 470, .72], fq: [500, 250, .72], nic: [700, 330, .72], rnic: [900, 330, .72], ack: [290, 540, .62] }, links: [['app', 'wq'], ['wq', 'xmit'], ['xmit', 'fq'], ['xmit', 'rtx'], ['fq', 'nic'], ['ack', 'rtx']], dur: 4000,
      paras: [p('<b>送る道</b>（システムコール）：send() → tcp_sendmsg_locked() → 送信キュー → tcp_write_xmit() → tcp_transmit_skb() → qdisc → NIC（TSO）→ 線。', 0),
        p('<b>ACK の道</b>（割り込み → softirq）：NIC → NAPI・GRO → tcp_ack() → 再送キューを片付け、cwnd を増やし、tcp_write_xmit() で続きを送る。', 1200),
        p('<b>落ちた時</b>：再送キューに残した元から送り直し、cwnd を減らす。4 つの置き場（送信キュー・再送キュー・qdisc・リング）のどこで待っているかが、遅さの答え。', 2400)],
      callout: ['教えるとき', 'よくある誤解は「send() が戻った＝相手に届いた」。正しくは「カーネルの送信キューに入った」。'],
      changes: [['+', '送る道・ACK の道・送り直す道']],
      draw(t) { let s = stage({ links: this.links, hl: ['xmit', 'ack', 'wq', 'rtx', 'fq', 'nic'], nosub: Object.keys(OB) });
        const send = [top('app'), slot('wq', 0), top('xmit'), slot('fq', 1), top('nic'), top('rnic')];
        const ackr = [top('rnic'), [top('rnic')[0], 580], [top('ack')[0], 580], top('ack'), slot('rtx', 0)];
        for (let i = 0; i < 3; i++) { s += skb(along(send, ((t / 5200) + i / 3) % 1), 'skb', C.blue, { w: 34 }); s += skb(along(ackr, ((t / 3800) + i / 3) % 1), 'ACK', C.green, { w: 34 }); }
        return s; } }
  ];
  // ---- 試す：RTT・喪失率・初期 cwnd で 1 MB を送る時間（スロースタート → CUBIC を粗く数える） ----
  function sim(Pm) { const mss = 1448, total = 1048576; let cwnd = Pm.icw, sent = 0, rtts = 0, ss = true, ssth = 1e9; const hist = []; const lossEvery = Pm.loss > 0 ? Math.round(100 / Pm.loss) : 1e9; let cnt = 0;
    while (sent < total && rtts < 400) { const n = Math.min(Math.floor(cwnd), Math.ceil((total - sent) / mss)); let lost = false; for (let i = 0; i < n; i++) { cnt++; if (cnt % lossEvery === 0) lost = true; }
      sent += n * mss; hist.push(Math.floor(cwnd)); rtts++; if (lost) { ssth = Math.max(2, cwnd * .7); cwnd = ssth; ss = false; } else cwnd = ss && cwnd < ssth ? cwnd * 2 : cwnd + 1; }
    return { rtts, ms: rtts * Pm.rtt, hist, mbps: (total * 8 / (rtts * Pm.rtt / 1000)) / 1e6 }; }
  const lab = { title: '1 MB を送る時間は何で決まるか', cam: [0, 0, 1000, 600],
    intro: 'RTT・喪失率・初期 cwnd を動かすと、1 往復ごとの cwnd の育ち方と、1 MB が届くまでの時間が計算し直される（スロースタートは 1 往復で 2 倍、落ちたら 0.7 倍、その後は 1 往復で +1 MSS と粗く数える）。',
    params: [{ k: 'rtt', label: 'RTT', min: 5, max: 200, step: 5, v: 30, unit: ' ms' }, { k: 'loss', label: '喪失率', min: 0, max: 5, step: .5, v: 0, unit: ' %' }, { k: 'icw', label: '初期 cwnd', min: 2, max: 40, step: 1, v: 10, unit: ' MSS' }],
    results(Pm) { const r = sim(Pm); return [['往復の回数', r.rtts + ' 回'], ['1 MB が届くまで', fmt(r.ms) + ' ms'], ['平均の速さ', fmt(r.mbps) + ' Mbps'], ['最後の cwnd', r.hist[r.hist.length - 1] + ' MSS', 'cwnd'], ['RTT', Pm.rtt + ' ms', 'rtt']]; },
    preds: [{ q: '帯域が 10 倍の回線に替えたら、RTT 30 ms・喪失 0% の 1 MB は何倍速くなる？', opts: ['約 10 倍', 'ほとんど変わらない', '約 2 倍'], ans: 1, why: '1 MB の大半はスロースタートの往復の回数で決まり、帯域ではなく RTT と cwnd の育ち方が律速になる。', tryit: 'RTT を 30 → 15 ms にすると時間がほぼ半分になるのを確かめる' },
      { q: '喪失率を 0 → 1% にすると？', opts: ['少し遅くなるだけ', '往復の回数が何倍にも増える'], ans: 1, why: '落ちるたびに 0.7 倍に減り、その後は 1 往復で 1 MSS しか増えない。', tryit: '喪失率 1% と 2% で往復の回数を比べる' }],
    draw(Pm, t) { const r = sim(Pm); const x0 = 80, y0 = 80, w = 840, h = 400; const n = r.hist.length; const mx = Math.max(...r.hist, 20);
      let s = slab(40, 40, 920, 500, { r: 16 }) + T(x0, 66, `1 往復ごとの cwnd（MSS）— 全 ${n} 往復・${fmt(r.ms)} ms`, { size: 15, w: 700 });
      for (let g = 0; g <= 4; g++) { const yy = y0 + h - g * h / 4; s += line([[x0, yy], [x0 + w, yy]], { c: 'var(--ln)', w: 1, head: false }) + T(x0 - 8, yy + 4, fmt(mx * g / 4), { a: 'end', size: 11, mono: true, fill: 'var(--mut)' }); }
      const bw = Math.min(40, w / n - 2); const shown = Math.floor(clamp(t / 1600) * n + 1);
      r.hist.slice(0, shown).forEach((c, i) => { const bh = c / mx * h; const x = x0 + i * (w / n); const prev = r.hist[i - 1]; const drop = prev && c < prev; s += bar3d(x, y0 + h - bh, bw, bh, drop ? C.red : C.blue); if (n <= 24) s += T(x + bw / 2, y0 + h - bh - 5, c, { a: 'middle', size: 11, mono: true, fill: 'var(--mut)' }); });
      s += T(x0 + w, y0 + h + 24, '往復 →', { a: 'end', size: 11.5, fill: 'var(--mut)' }) + T(x0, y0 + h + 24, `RTT ${Pm.rtt} ms ・ 喪失 ${Pm.loss}% ・ 初期 cwnd ${Pm.icw}`, { size: 11.5, mono: true, fill: 'var(--mut)' });
      if (Pm.loss > 0) s += badge(x0 + 8, y0 + 14, '赤：落ちて 0.7 倍', C.red, { size: 11 }); return s; } };
  // ---- やってみる：遅い転送の原因を絞る ----
  const tr = { cam: [0, 0, 1000, 600], layout: { xmit: [160, 220], fq: [470, 300], rtx: [160, 470, .85], nic: [720, 330, .85], rnic: [900, 330, .7] }, ps: 'ops@web-1:~$', who: '配信チーム', req: '大きなファイルの配信だけ遅い。回線は空いているはず。どこで詰まっているか調べて、直せる所を直して。',
    cards: ['ss -tin dst 203.0.113.80', 'nstat -az TcpExtTCPLostRetransmit', 'tc -s qdisc show dev eth0', 'ethtool -k eth0 | grep segmentation', 'sysctl net.ipv4.tcp_congestion_control', 'sysctl -w net.ipv4.tcp_congestion_control=bbr', 'tc qdisc replace dev eth0 root fq'],
    refs: [['ss', 'https://man7.org/linux/man-pages/man8/ss.8.html'], ['nstat', 'https://man7.org/linux/man-pages/man8/nstat.8.html'], ['tc', 'https://man7.org/linux/man-pages/man8/tc.8.html'], ['ethtool', 'https://man7.org/linux/man-pages/man8/ethtool.8.html'], ['sysctl (ip-sysctl)', 'https://docs.kernel.org/networking/ip-sysctl.html']],
    tasks: [{ t: 'ss で cwnd と再送を見る', ok: (s) => s.f.ss }, { t: '再送の数を nstat で確かめる', ok: (s) => s.f.nstat }, { t: 'qdisc の落とした数を見る', ok: (s) => s.f.tc }, { t: '輻輳制御を BBR に、qdisc を fq にする', ok: (s) => s.f.bbr && s.f.fq }, { t: 'もう一度 ss で cwnd が育ったか確かめる', ok: (s) => s.f.ss2 }],
    init: () => ({ lines: [{ o: '# web-1 から 203.0.113.80 への 1 本の接続が遅い', k: 'd' }], hist: [], f: {}, cc: 'cubic', q: 'pfifo_fast' }),
    metrics: (s) => ({ cwnd: s.f.ss2 ? '86 MSS' : '9 MSS', rtx: s.f.ss2 ? '0 回' : '412 回', rtt: s.f.ss2 ? '31 ms' : '58 ms', wq: s.f.ss2 ? '0 B' : '4,194,304 B', flight: s.f.ss2 ? '124,528 B' : '13,032 B' }),
    run(cmd, s) { const c = cmd.replace(/\s+/g, ' ').trim(); const o = (x, k) => ({ o: x, k });
      if (/^ss -t?i?n?( dst \S+)?$|^ss -tin dst 203\.0\.113\.80$/.test(c) || c.startsWith('ss -ti')) { const fixed = s.cc === 'bbr' && s.q === 'fq'; if (fixed && s.f.bbr && s.f.fq) s.f.ss2 = true; s.f.ss = true;
        return { out: fixed ? [o('ESTAB 0 0 10.0.0.5:51234 203.0.113.80:443'), o(' bbr wscale:7,7 rto:232 rtt:31.1/1.2 mss:1448'), o(' cwnd:86 bytes_retrans:0 unacked:86 retrans:0/0'), o(' pacing_rate 412Mbps delivery_rate 398Mbps notsent:0', 'h')]
          : [o('ESTAB 0 0 10.0.0.5:51234 203.0.113.80:443'), o(' cubic wscale:7,7 rto:268 rtt:58.4/22.1 mss:1448'), o(' cwnd:9 ssthresh:9 unacked:9 retrans:1/412', 'e'), o(' delivery_rate 1.8Mbps notsent:4194304', 'e'), o('# cwnd が 9 で育たず、再送が 412 回。RTT の揺れ 22.1 ms は途中のキューの伸び縮み', 'd')] }; }
      if (c.startsWith('nstat')) { s.f.nstat = true; return { out: [o('#kernel'), o('TcpExtTCPLostRetransmit          1873     0.0', 'e'), o('# 失われたと決めて送り直した数が多い', 'd')] }; }
      if (c.startsWith('tc -s qdisc')) { s.f.tc = true; return { out: s.q === 'fq' ? [o('qdisc fq 8001: root refcnt 2 limit 10000p flow_limit 100p'), o(' Sent 92883321 bytes 64302 pkt (dropped 0, overlimits 0)', 'h')] : [o('qdisc pfifo_fast 0: root refcnt 2 bands 3'), o(' Sent 92883321 bytes 64302 pkt (dropped 2214, overlimits 0)', 'e'), o(' backlog 1478Kb 1012p', 'e'), o('# 手元の qdisc で 2,214 個落とし、1,012 個が溜まっている（bufferbloat）', 'd')] }; }
      if (c.startsWith('ethtool -k')) return { out: [o('tcp-segmentation-offload: on'), o('generic-segmentation-offload: on')] };
      if (c === 'sysctl net.ipv4.tcp_congestion_control') return { out: [o('net.ipv4.tcp_congestion_control = ' + s.cc)] };
      if (c === 'sysctl -w net.ipv4.tcp_congestion_control=bbr') { s.cc = 'bbr'; s.f.bbr = true; return { out: [o('net.ipv4.tcp_congestion_control = bbr', 'h'), o('# 新しい接続から効く', 'd')] }; }
      if (/^tc qdisc (replace|add) dev eth0 root fq/.test(c)) { s.q = 'fq'; s.f.fq = true; return { out: [o('# qdisc を fq にした（流れごとの公平とペーシング）', 'd')] }; }
      if (c === 'help') return { out: [o('使える命令：下の見本を押すと入る')] };
      return { out: [o('bash: ' + c.split(' ')[0] + ': この場面では使えない（help）', 'e')] }; },
    draw(s, t) { const fixed = s.f.ss2; const fq = s.q === 'fq'; let st = stage({ links: [['xmit', 'fq'], ['fq', 'nic']], hl: ['fq', 'xmit'] });
      st += badge(top('fq')[0], top('fq')[1] - 110, fq ? 'fq：ペーシングで溜めない' : 'pfifo_fast：溜まって落とす', fq ? C.green : C.red, { center: true, size: 14 });
      if (!fq) { for (let i = 0; i < 4; i++) st += skb(slot('fq', i), '', C.orange, { w: 34 }); const k = (t % 1600) / 1600; st += pk([top('fq')[0] + 120 + 60 * k, top('fq')[1] + 60 * k * k], C.red, { op: 1 - k }); }
      st += cwl(fixed ? 86 : 9, fixed ? C.green : C.red, [top('xmit')[0], top('xmit')[1] - 70]);
      const route = wire('nic', 'rnic'); const n = fixed ? 8 : 2; st += line(route, { c: 'var(--ink)', w: 3, head: false, op: .5 }); for (let i = 0; i < n; i++) st += pk(along(route, ((t / 1800) + i / n) % 1), fixed ? C.blue : C.gray);
      st += badge(top('rtx')[0], top('rtx')[1] - 80, s.cc === 'bbr' ? '輻輳制御：BBR' : '輻輳制御：CUBIC', s.cc === 'bbr' ? C.green : C.gray, { center: true, size: 13 }); return st; } };
  const quiz = [{ k: 'order', q: 'send() から線に出るまでを、通る順に並べる', items: ['tcp_sendmsg_locked()', 'tcp_write_xmit()', 'tcp_transmit_skb()', 'qdisc（fq）', 'NIC（TSO）'], shuffled: ['qdisc（fq）', 'tcp_transmit_skb()', 'NIC（TSO）', 'tcp_sendmsg_locked()', 'tcp_write_xmit()'], why: '写して送信キュー → 送るか決める → clone してヘッダ → 時刻まで待つ → 割って線へ。' },
    { k: 'hit', q: 'ACK が返るまで、送った skb の元が残っている置き場はどこ？', hits: ['wq', 'rtx', 'fq', 'nic'], ans: 'rtx', why: '再送キュー（tcp_rtx_queue）。落ちた時にここから送り直す。' },
    { k: 'pick', q: 'ACK を受けた後の tcp_write_xmit() は、どの文脈で動く？', opts: ['アプリのシステムコール', 'softirq（NET_RX）', 'カーネルスレッドの kworker'], ans: 1, why: 'ACK の処理（tcp_ack → tcp_data_snd_check）は受信の softirq の中で動き、そのまま続きを送る。' },
    { k: 'num', q: '初期 cwnd 10、MSS 1,448 B。最初の 1 往復で送れるのは何バイト？', ans: 14480, why: '10 × 1,448 = 14,480 B。' },
    { k: 'pick', q: 'ss で cwnd が育たず retrans が増え、tc -s qdisc の dropped も多い。まず疑うのは？', opts: ['相手のアプリが遅い', '手元や途中のキューのあふれ（bufferbloat）', 'DNS が遅い'], ans: 1, why: '落ちる → cwnd が 0.7 倍 → 育たない。qdisc の dropped と backlog が証拠。fq と BBR で溜めずに送る。' }];
  function drawQuiz(t, hits, a, q) { let s = stage({ nosub: Object.keys(OB) });
    hits.forEach((id) => { const o = at(id); if (!o) return; const [fw, fd] = objFoot(o); s += pad(o.x, o.y, (fw + 70) * o.s, (fd + 70) * o.s, C.blue, { f: 14, id }) + pulse(o.x, o.y, t, C.blue, 30, { iso: true }); });
    if (a && q && q.k === 'hit') { const o = at(q.ans); const [fw, fd] = objFoot(o); s += pad(o.x, o.y, (fw + 70) * o.s, (fd + 70) * o.s, C.green, { f: 22 }); } return s; }
  const TERMS = {
    app: { t: 'アプリ', m: ['アプリ'], d: 'あなたが書いて動かすプログラム。ここでは大きなファイルを配るサーバのプログラム。' },
    kernel: { t: 'カーネル', m: ['カーネル'], d: 'OS（Linux など）の中心部分。メモリやネットワークの部品を管理し、アプリに頼まれた仕事を代わりにする。' },
    syscall: { t: 'システムコール', m: ['システムコール'], d: 'アプリがカーネルに仕事を頼むための決まった窓口。send() もその 1 つ。' },
    func: { t: '関数', m: ['関数'], d: '名前の付いた処理のまとまり。名前の後ろの ( ) に材料（引数）を入れて呼ぶ。' },
    send: { t: 'send()', m: ['send(', 'send()'], d: '「このデータをこの接続で送って」とカーネルに頼む関数。戻ってきても、相手に届いたとは限らない。' },
    fd: { t: 'fd', m: ['fd'], d: 'ファイル記述子。カーネルが開いた接続（ソケット）に付ける番号札（例：3）。アプリはこの番号で「どの接続か」を伝える。' },
    buf: { t: 'buf', m: ['buf'], d: 'バッファ。送りたいデータが置いてあるメモリの場所（先頭の住所）。' },
    len: { t: '65536', m: ['65536', '64 KB'], d: '送りたいデータの量。65,536 バイト ＝ 64 KB。' },
    byte: { t: 'バイト（B）', m: ['B）', ' B', 'KB'], d: 'データの量の単位。1 B は半角 1 文字ほど。1 KB ＝ 1,024 B。' },
    socket: { t: 'ソケット', m: ['ソケット'], d: '通信の出入り口としてカーネルが用意する物。1 本の接続に 1 つ。fd はこれを指す番号。' },
    tcp: { t: 'TCP', m: ['TCP'], d: '届いたかを確かめ、順番どおり・漏れなく届ける通信の決まり（プロトコル）。落ちたら送り直す。' },
    packet: { t: 'パケット', m: ['パケット', '枚'], d: '線の上を流れる小分けのデータ。ここでは 1 枚最大 1,514 B。' },
    ackmsg: { t: 'ACK', m: ['ACK'], d: '受け手が「この番号の前までは全部受け取った」と返す知らせ。ACK が返るまで送り手は元を消さない。' },
    rtt: { t: 'RTT', m: ['RTT'], d: '往復時間。送ってから、その ACK が返ってくるまでの時間。ここでは 30 ms。' },
    time: { t: 'ms・µs', m: ['ms', 'µs'], d: 'ms（ミリ秒）は 1,000 分の 1 秒。µs（マイクロ秒）は 100 万分の 1 秒。' },
    recv: { t: 'recv()', m: ['recv()'], d: '受け手のアプリが、届いたデータを受け取る関数。' },
    skb: { t: 'skb', m: ['skb'], d: 'ソケットバッファ。カーネルの中でデータを入れて運ぶ「箱」。データと、行き先などのメモが入っている。' },
    queue: { t: 'キュー', m: ['キュー'], d: '順番待ちの列。先に入った物から出ていく。' },
    nic: { t: 'NIC', m: ['NIC'], d: 'ネットワークの線につながる部品（ネットワークカード）。データを電気や光の信号にして送る。' },
    mss: { t: 'MSS', m: ['MSS'], d: '1 枚のパケットに入れられるデータの最大量。ここでは 1,448 B。' },
    cwnd: { t: 'cwnd', m: ['cwnd'], d: '輻輳ウィンドウ。ACK を待たずに送ってよい量の上限。道が混まないように送り手が自分で決める。' },
    rwnd: { t: '受信窓', m: ['受信窓'], d: '受け手が「あとこれだけなら受け取れる」と知らせてくる量。' },
    clone: { t: 'clone（写し）', m: ['clone', '写し'], d: 'skb の頭だけを写した物。中身のデータは元と共有するので、データを 2 回写すわけではない。' },
    header: { t: 'ヘッダ', m: ['ヘッダ'], d: 'パケットの先頭に付ける宛名書き。番号（seq）・宛先・ACK などが書いてある。' },
    seq: { t: 'seq', m: ['seq'], d: 'シーケンス番号。データの何バイト目かを表す通し番号。受け手は並べ直しと抜けの確認に使う。' },
    ip: { t: 'IP', m: ['IP '], d: 'パケットを宛先のコンピュータまで運ぶための決まり。IP ヘッダに宛先の住所（IP アドレス）を書く。' },
    qdisc: { t: 'qdisc', m: ['qdisc'], d: '送信の待ち行列の決まり。どの順に・いつ線へ出すかを決める。fq は流れごとに順番と送る時刻を守る種類。' },
    pacing: { t: 'ペーシング', m: ['ペーシング'], d: '一度にまとめて押し出さず、間隔を空けて少しずつ送ること。途中の機器があふれにくくなる。' },
    driver: { t: 'ドライバ', m: ['ドライバ'], d: 'カーネルの中で、特定の部品（ここでは NIC）を動かす担当のプログラム。' },
    tso: { t: 'TSO', m: ['TSO'], d: '大きな塊を MSS ごとに割る仕事を、CPU ではなく NIC にやらせる仕組み。' },
    irq: { t: '割り込み', m: ['割り込み', 'hardirq'], d: '部品が CPU に「用があります」と知らせて、今の仕事を中断させる仕組み。短く済ませ、残りは後回しにする。' },
    softirq: { t: 'softirq', m: ['softirq'], d: '割り込みの後回しにした仕事を、少し後にカーネルがまとめて片付ける仕組み。アプリとは別の文脈で動く。' },
    ctx: { t: '文脈', m: ['文脈'], d: '「今、誰のために・どの立場でカーネルが動いているか」。アプリの頼み（システムコール）か、割り込みの後片付け（softirq）か。' },
    napi: { t: 'NAPI・GRO', m: ['NAPI', 'GRO'], d: 'NAPI は届いたパケットをまとめて拾う仕組み。GRO は続きのパケットを 1 つにまとめ直して、処理の回数を減らす。' },
    congestion: { t: '輻輳', m: ['輻輳', '混雑'], d: '道（ネットワーク）が混んで、途中の機器の列があふれること。パケットが落ちる原因になる。' },
    rtxq: { t: '再送', m: ['再送', '送り直'], d: '落ちたパケットを、送り手が手元に残しておいた元からもう一度送ること。' },
    sack: { t: 'SACK', m: ['SACK'], d: '「抜けはあるが、この範囲は持っている」と受け手が知らせる仕組み。送り手は抜けた所だけ送り直せる。' },
    ss: { t: 'ss', m: ['ss -t', 'ss で', 'ss の'], d: '接続の中の数（cwnd・再送の数・RTT など）を見る Linux の命令。' },
    smsg: { t: 'tcp_sendmsg_locked()', m: ['tcp_sendmsg_locked'], d: 'send() で呼ばれるカーネルの関数。アプリのデータを skb に写して送信キューに並べる。' },
    wq: { t: 'sk_write_queue', m: ['sk_write_queue', '送信キュー'], d: '送信キュー。まだ線に出していないデータ（skb）の待ち行列。' },
    xmit: { t: 'tcp_write_xmit()', m: ['tcp_write_xmit'], d: '送信キューの先頭を見て、今送ってよいか（cwnd・受信窓など）を決める関数。' },
    tx: { t: 'tcp_transmit_skb()', m: ['tcp_transmit_skb'], d: 'skb の写しを作って TCP ヘッダを付け、IP の層へ渡す関数。' },
    rtx: { t: 'tcp_rtx_queue', m: ['tcp_rtx_queue', '再送キュー'], d: '再送キュー。送ったが ACK がまだ来ていないデータを、送り直しに備えて残しておく列。' },
    ipq: { t: 'ip_queue_xmit()', m: ['ip_queue_xmit'], d: 'IP ヘッダ（宛先の住所など）を付けて、行き先を決める関数。' },
    fq: { t: 'qdisc: fq', m: ['fq'], d: '送る時刻を守って、少しずつ線へ出す待ち行列（qdisc の一種）。' },
    ring: { t: 'ndo_start_xmit()', m: ['ndo_start_xmit', 'リング'], d: 'ドライバがデータを送信リング（NIC が直接読む置き場）に置く関数。' },
    ackf: { t: 'tcp_ack()', m: ['tcp_ack()'], d: '届いた ACK を読み、再送キューから受け取られた分を消し、cwnd を増やす関数。' },
    gro: { t: 'napi_gro_receive()', m: ['napi_gro_receive'], d: '届いたパケットを拾い、続きを 1 つにまとめる関数。' },
    rtcp: { t: 'tcp_rcv_established()', m: ['tcp_rcv_established'], d: '受け手で、届いたデータの並びを確かめ、ACK を作って返す関数。' }
  };
  const TALIAS = { rapp: 'recv', rgro: 'gro', rnic: 'nic', ack: 'ackf' };
  const INTRO = { kind: 'intro', short: '言葉', title: '始める前に：言葉をそろえる', cam: [0, 0, 1000, 600], dur: 7000,
    layout: { app: [150, 440], smsg: [430, 470], nic: [690, 480, .85], rapp: [890, 430, .85] }, links: [['app', 'smsg'], ['smsg', 'nic']],
    metrics: { cwnd: '10 MSS', wq: '0 B', flight: '0 B', rtx: '0 回', rtt: '30 ms' },
    terms: ['app', 'kernel', 'syscall', 'func', 'send', 'fd', 'buf', 'len', 'byte', 'socket', 'tcp', 'packet', 'ackmsg', 'rtt', 'time', 'nic'],
    paras: [p('このレッスンは「アプリがデータを送ると、コンピュータの中で何が起きるか」を追う。まず登場する 4 つを覚える。', 0),
      p('<b>アプリ</b>は、あなたが書くプログラム。<b>カーネル</b>は OS の中心で、ネットワークの部品を動かす係。アプリは部品に直接さわれないので、カーネルに<b>頼む</b>（システムコール）。', 1500),
      p('頼む時に書くのが <code>send(fd, buf, 65536)</code>。上の黒い札の 4 つの部分を、左から順に見てほしい。', 3000),
      p('カーネルはデータを小分けの<b>パケット</b>にして、<b>NIC</b>（線につながる部品）から相手へ送る。相手は受け取ると <b>ACK</b>（受け取ったよ）を返す。', 4600)],
    callout: ['たとえると', 'アプリは客、カーネルは窓口の係員、send() は「この荷物を送って」という申込書。fd は伝票番号、buf は荷物の置き場所、65536 は荷物の量。'],
    changes: [['+', '登場する 4 つ：アプリ・カーネル・NIC・相手']],
    draw(t) { let s = stage({ links: this.links, hl: ['app'], names: { app: ['アプリ', 'あなたのプログラム'], smsg: ['カーネル', 'OS の中心。部品を動かす係'], nic: ['NIC', '線につながる部品'], rapp: ['相手のコンピュータ', '受け取るアプリ'] } });
      s += anatomy(500, 74, [['send', '#7fb2ff', '送って と頼む関数', 'send'], ['(', null], ['fd', '#f5b46b', 'どの接続か（番号札）', 'fd'], [', ', null], ['buf', '#c3a6f5', 'データの置き場所', 'buf'], [', ', null], ['65536', '#8fd6a8', '送る量（バイト）', 'len'], [')', null]], t, { center: true, step: 600, rows: [0, 0, 1, 0, 2, 0, 0, 0] });
      const W = wire('nic', 'rapp'); s += line(W, { c: 'var(--ink)', w: 3, head: false, op: .5 });
      if (t > 4600) { const path = [top('app'), top('smsg'), top('nic'), ...W.slice(1), top('rapp')]; const k = Lin((t - 4600) % 3000, 0, 2400); s += skb(along(path, k), 'データ', C.blue, { w: 40 }); const back = [top('rapp'), W[2], W[1], top('nic')]; if (k > .9) s += skb(along(back, Lin((t - 4600) % 3000, 2400, 600)), 'ACK', C.green, { w: 30 }); }
      return s; } };
  steps.unshift(INTRO);
  LESSONS.push({ terms: TERMS, termAlias: TALIAS, id: 'tcp', tab: 'TCP（カーネルの中）', color: C.blue, kick: 'ネットワーク ・ 段 3（設計と障害対応）・ 見せ方：層とキュー', title: 'TCP で送って ACK が返るまで', goal: '1 つの send() を、関数・キュー・実行の文脈の単位で追い、遅さと再送の原因を図と数で読める',
    metrics: [{ k: 'cwnd', label: 'cwnd' }, { k: 'wq', label: '送信キュー' }, { k: 'flight', label: '未 ACK' }, { k: 'rtx', label: '再送' }, { k: 'rtt', label: 'RTT' }],
    legend: [['データ（skb）', C.blue], ['写し（clone）', C.purple], ['ACK', C.green], ['落ちた・再送', C.red], ['softirq', C.orange]], scene: true, steps, lab, tr, quiz, drawQuiz, quizCam: [0, 0, 1000, 600], quizLayout: { wq: [170, 200, .9], xmit: [430, 170, .9], rtx: [170, 450, .9], fq: [470, 430, .9], nic: [780, 300, .9] }, note: 'send() は送信キューに入れるだけ。ACK が送りを駆動し、再送キューから送り直す' });
})();
