// 1億2380万分の1 ― みんなのレビュー（Google Apps Script）
// 使い方: スプレッドシートを新規作成 → 拡張機能 → Apps Script → このコードを貼る → デプロイ → 新しいデプロイ
//   種類: ウェブアプリ / 実行ユーザー: 自分 / アクセス: 全員 → デプロイ → ウェブアプリURLをコピー
const SHEET = "reviews";
const MAX_TEXT = 300, MAX_NICK = 20, LIST_N = 60;

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.appendRow(["日時", "ニックネーム", "本文", "人物", "タイトル", "年齢", "死因", "非表示"]); }
  return sh;
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
// 一覧（新しい順）。「非表示」列に何か書けば出なくなる（荒らし対策はシートで手作業）
function doGet(e) {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return json_({ reviews: [], total: 0 });
  const from = Math.max(2, last - 400);
  const rows = sh.getRange(from, 1, last - from + 1, 8).getValues()
    .filter(r => r[2] && !r[7])
    .reverse().slice(0, LIST_N)
    .map(r => ({ d: Utilities.formatDate(new Date(r[0]), "Asia/Tokyo", "M/d"), n: String(r[1]), t: String(r[2]), p: String(r[3]), ti: String(r[4]), a: r[5], c: String(r[6]) }));
  return json_({ reviews: rows, total: last - 1 });
}
// 投稿
function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents || "{}");
    const text = String(b.t || "").trim().slice(0, MAX_TEXT);
    if (text.length < 2) return json_({ ok: false, err: "短すぎます" });
    if (/https?:\/\//i.test(text)) return json_({ ok: false, err: "URLは書けません" });
    const lock = LockService.getScriptLock(); lock.waitLock(5000);
    const sh = sheet_();
    sh.appendRow([new Date(), String(b.n || "").trim().slice(0, MAX_NICK) || "名無し", text, String(b.p || "").slice(0, 40), String(b.ti || "").slice(0, 30), Number(b.a) || "", String(b.c || "").slice(0, 30), ""]);
    lock.releaseLock();
    return json_({ ok: true });
  } catch (err) { return json_({ ok: false, err: String(err) }); }
}
