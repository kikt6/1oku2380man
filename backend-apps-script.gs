// 1億2380万分の1 ― 共有バックエンド（Google Apps Script）
// みんなのレビュー と メモリアル（人生を納める・ろうそく・ひとこと）を1本で扱う。
// 使い方: スプレッドシートを新規作成 → 拡張機能 → Apps Script → このコードを全部貼る → 保存
//   → デプロイ → 新しいデプロイ → 種類「ウェブアプリ」/ 実行ユーザー「自分」/ アクセス「全員」→ デプロイ
//   → 表示された「ウェブアプリURL」をゲーム側の REVIEW_API に入れる。
// 荒らし対策: 各シートの「非表示」列に何か書けば表示されなくなる。

const MAX_TEXT = 300, MAX_NICK = 20;

function sh_(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(header); }
  return sh;
}
const REV = () => sh_("reviews", ["日時", "ニックネーム", "本文", "人物", "タイトル", "年齢", "死因", "非表示"]);
const MEM = () => sh_("memorial", ["id", "日時", "名前", "生年", "没年", "生まれ", "タイトル", "要約", "シーン", "レア度", "ろうそく", "非表示", "プレイヤー", "詳細"]);
const COM = () => sh_("memorial_words", ["日時", "id", "ニックネーム", "ひとこと", "非表示"]);

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function clean_(s, n) { s = String(s || "").replace(/[\u0000-\u001f]/g, " ").trim(); return s.slice(0, n); }
function memRow_(r) { return { id: r[0], d: Utilities.formatDate(new Date(r[1]), "Asia/Tokyo", "yyyy/M/d"), name: r[2], by: r[3], dy: r[4], pref: r[5], title: r[6], sum: r[7], scene: r[8], rank: r[9], candles: Number(r[10]) || 0, nick: r[12] || "", detail: r[13] || "" }; }
function memAll_() { const sh = MEM(); const last = sh.getLastRow(); if (last < 2) return []; return sh.getRange(2, 1, last - 1, 14).getValues().filter(r => r[0] && !r[11]); }

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.type === "memorial") {
    const all = memAll_();
    if (p.id) {
      const r = all.find(r => String(r[0]) === String(p.id)); if (!r) return json_({ ok: false });
      const cs = COM(); const lc = cs.getLastRow();
      const words = lc < 2 ? [] : cs.getRange(2, 1, lc - 1, 5).getValues().filter(w => String(w[1]) === String(p.id) && w[3] && !w[4]).slice(-50).reverse().map(w => ({ d: Utilities.formatDate(new Date(w[0]), "Asia/Tokyo", "M/d"), n: w[2], t: w[3] }));
      return json_({ ok: true, life: memRow_(r), words });
    }
    if (p.random) { if (!all.length) return json_({ ok: true, lives: [] }); return json_({ ok: true, lives: [memRow_(all[Math.floor(Math.random() * all.length)])] }); }
    const recent = all.slice(-40).reverse().map(memRow_);
    const top = all.slice().sort((a, b) => (Number(b[10]) || 0) - (Number(a[10]) || 0)).slice(0, 12).map(memRow_);
    return json_({ ok: true, recent, top, total: all.length });
  }
  // レビュー一覧
  const sh = REV(); const last = sh.getLastRow();
  if (last < 2) return json_({ reviews: [], total: 0 });
  const from = Math.max(2, last - 400);
  const rows = sh.getRange(from, 1, last - from + 1, 8).getValues().filter(r => r[2] && !r[7]).reverse().slice(0, 60)
    .map(r => ({ d: Utilities.formatDate(new Date(r[0]), "Asia/Tokyo", "M/d"), n: String(r[1]), t: String(r[2]), p: String(r[3]), ti: String(r[4]), a: r[5], c: String(r[6]) }));
  return json_({ reviews: rows, total: last - 1 });
}

function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents || "{}");
    const lock = LockService.getScriptLock(); lock.waitLock(5000);
    try {
      if (b.type === "memorial") {
        const id = Utilities.getUuid().slice(0, 8);
        MEM().appendRow([id, new Date(), clean_(b.name, 30), Number(b.by) || "", Number(b.dy) || "", clean_(b.pref, 20), clean_(b.title, 30), clean_(b.sum, 200), clean_(b.scene, 400), clean_(b.rank, 4), 0, "", clean_(b.nick, MAX_NICK), clean_(b.detail, 1500)]);
        return json_({ ok: true, id });
      }
      if (b.type === "candle") {
        const sh = MEM(); const last = sh.getLastRow(); if (last < 2) return json_({ ok: false });
        const ids = sh.getRange(2, 1, last - 1, 1).getValues();
        for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(b.id)) { const c = sh.getRange(i + 2, 11); const n = (Number(c.getValue()) || 0) + 1; c.setValue(n); return json_({ ok: true, candles: n }); }
        return json_({ ok: false });
      }
      if (b.type === "word") {
        const t = clean_(b.t, MAX_TEXT); if (t.length < 1) return json_({ ok: false, err: "空です" });
        if (/https?:\/\//i.test(t)) return json_({ ok: false, err: "URLは書けません" });
        COM().appendRow([new Date(), clean_(b.id, 12), clean_(b.n, MAX_NICK) || "名無し", t, ""]);
        return json_({ ok: true });
      }
      // レビュー投稿
      const text = clean_(b.t, MAX_TEXT);
      if (text.length < 2) return json_({ ok: false, err: "短すぎます" });
      if (/https?:\/\//i.test(text)) return json_({ ok: false, err: "URLは書けません" });
      REV().appendRow([new Date(), clean_(b.n, MAX_NICK) || "名無し", text, clean_(b.p, 40), clean_(b.ti, 30), Number(b.a) || "", clean_(b.c, 30), ""]);
      return json_({ ok: true });
    } finally { lock.releaseLock(); }
  } catch (err) { return json_({ ok: false, err: String(err) }); }
}
