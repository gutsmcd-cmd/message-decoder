import './style.css'

type Lang = 'ja' | 'en'
type Unclear = { text: string; guesses: string[]; why?: string }
type Result = { probably: string; summary: string; unclear: Unclear[] }

const T = {
  ja: {
    title: 'メッセージ解読', lede: '誤字だらけ・言葉足らずのメッセージを貼りつけると、「たぶんこう言いたい」と一行まとめを出します。自信のないところは勝手に決めず、印をつけて知らせます。',
    big: '大きい文字', placeholder: 'ここにメッセージを貼りつけ…（日本語でも英語でも）', paste: '貼りつけ', clear: '消す',
    outLabel: '答えの言葉', same: 'メッセージと同じ', ja: '日本語', en: 'English', go: '解読する',
    working: '考え中…（無料のAIなので、30秒ほどかかることがあります）', retry: '別のAIで再挑戦中…',
    probably: 'たぶん、こう言っています', summary: 'ひとことで', unclear: 'はっきりしないところ', noUnclear: 'はっきりしないところはありません。',
    maybe: 'もしかして', copy: 'コピー', copied: 'コピーしました',
    empty: 'まずメッセージを貼りつけてください。', fail: 'AIにつながりませんでした。ネット接続を確かめて、少し待ってからもう一度どうぞ。',
    note: 'メッセージは解読のために無料AIサービス Pollinations.ai（pollinations.ai）に送られます。キーもログインも不要ですが、秘密の内容は貼りつけないでください。AIはまちがえることもあります。',
  },
  en: {
    title: 'Message Decoder', lede: 'Paste a messy, typo-filled message and see what it probably says, plus a one-line summary. Anything unclear is flagged, not guessed.',
    big: 'Large text', placeholder: 'Paste the message here… (English or Japanese)', paste: 'Paste', clear: 'Clear',
    outLabel: 'Answer in', same: 'Same as the message', ja: '日本語', en: 'English', go: 'Decode',
    working: 'Thinking… (it is a free AI, so this can take about 30 seconds)', retry: 'Trying another AI…',
    probably: 'It probably says', summary: 'In one line', unclear: 'Not sure about', noUnclear: 'Nothing unclear.',
    maybe: 'maybe', copy: 'Copy', copied: 'Copied',
    empty: 'Paste a message first.', fail: 'Could not reach the AI. Check your connection, wait a moment and try again.',
    note: 'To decode it, your message is sent to the free AI service Pollinations.ai (pollinations.ai). No key or login, but please don’t paste anything secret. The AI can make mistakes.',
  },
}

let lang: Lang = (localStorage.getItem('md-lang') as Lang) || (navigator.language.startsWith('ja') ? 'ja' : 'en')
let big = localStorage.getItem('md-big') === '1'
let last: Result | null = null
const app = document.getElementById('app')!

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

function render() {
  const t = T[lang]
  const text = (document.getElementById('msg') as HTMLTextAreaElement | null)?.value ?? ''
  const out = (document.getElementById('out') as HTMLSelectElement | null)?.value ?? 'same'
  document.documentElement.lang = lang
  document.documentElement.classList.toggle('big', big)
  document.title = `${t.title} / ${lang === 'ja' ? 'Message Decoder' : 'メッセージ解読'}`
  app.innerHTML = `<main>
  <header><h1>🧩 ${t.title}</h1>
   <div class="top-btns"><button id="lang">${lang === 'ja' ? 'English' : '日本語'}</button><button id="big" aria-pressed="${big}">${t.big}</button></div></header>
  <p class="lede">${t.lede}</p>
  <textarea id="msg" placeholder="${t.placeholder}"></textarea>
  <div class="row"><button id="paste">📋 ${t.paste}</button><button id="clear">${t.clear}</button>
   <label>${t.outLabel} <select id="out"><option value="same">${t.same}</option><option value="ja">${t.ja}</option><option value="en">${t.en}</option></select></label></div>
  <div class="row"><button class="primary" id="go">${t.go}</button></div>
  <p class="status" id="status" role="status"></p>
  <div id="result"></div>
  <p class="note">${t.note}</p></main>`
  ;(document.getElementById('msg') as HTMLTextAreaElement).value = text
  ;(document.getElementById('out') as HTMLSelectElement).value = out
  document.getElementById('lang')!.onclick = () => { lang = lang === 'ja' ? 'en' : 'ja'; localStorage.setItem('md-lang', lang); render() }
  document.getElementById('big')!.onclick = () => { big = !big; localStorage.setItem('md-big', big ? '1' : '0'); render() }
  document.getElementById('clear')!.onclick = () => { (document.getElementById('msg') as HTMLTextAreaElement).value = ''; last = null; showResult() }
  document.getElementById('paste')!.onclick = async () => {
    try { (document.getElementById('msg') as HTMLTextAreaElement).value = await navigator.clipboard.readText() } catch { (document.getElementById('msg') as HTMLTextAreaElement).focus() }
  }
  document.getElementById('go')!.onclick = decode
  showResult()
}

function showResult() {
  const t = T[lang], box = document.getElementById('result')!
  if (!last) { box.innerHTML = ''; return }
  const r = last
  let prob = esc(r.probably)
  // highlight unclear fragments if they appear in the rewritten text
  for (const u of r.unclear) for (const g of u.guesses.slice(0, 1)) if (g && g.length > 1) prob = prob.replace(esc(g), `<mark>${esc(g)}</mark>`)
  box.innerHTML = `
  <section class="card"><h2>💬 ${t.probably}</h2><p class="probably" id="prob">${prob}</p><button class="copy" id="cp">${t.copy}</button></section>
  <section class="card"><h2>📌 ${t.summary}</h2><p id="sum">${esc(r.summary)}</p></section>
  <section class="card unclear"><h2>❓ ${t.unclear}</h2>${r.unclear.length ? `<ul>${r.unclear.map(u =>
    `<li>「${esc(u.text)}」 → ${u.guesses.length ? `${t.maybe}: ${u.guesses.map(g => `<b>${esc(g)}</b>`).join(' / ')}` : '?'}${u.why ? `<br><small>${esc(u.why)}</small>` : ''}</li>`).join('')}</ul>` : `<p>${t.noUnclear}</p>`}</section>`
  document.getElementById('cp')!.onclick = async (e) => {
    try { await navigator.clipboard.writeText(r.probably); (e.target as HTMLButtonElement).textContent = t.copied } catch { /* ignore */ }
  }
}

const SYSTEM = `You help someone understand messy text messages full of typos, missing words, autocorrect mistakes, odd spacing, wrong kanji or kana conversions, and run-on sentences. The message may be English, Japanese, or mixed.
Return ONLY a JSON object, no code fences:
{"probably": string, "summary": string, "unclear": [{"text": string, "guesses": [string], "why": string}]}
- "probably": the message rewritten clearly with spelling and grammar fixed. Keep the sender's meaning, tone and every detail. Do NOT add facts, names, times or places that are not in the message.
- "summary": ONE short sentence saying what the sender wants or is telling.
- "unclear": every word or part you could not be confident about (unknown names, ambiguous abbreviations, words that could mean two things, missing information). "text" is the original fragment exactly as written, "guesses" are 1-3 possible meanings, "why" is a few words. In "probably", write your best reading but keep it neutral. Only list parts whose MEANING is uncertain; do not list simple spelling fixes you are sure of. Use an empty list only if everything is clear. Never pretend to be sure.`

function langLine(out: string, msg: string) {
  if (out === 'same') out = /[\u3040-\u30ff\u4e00-\u9fff]/.test(msg) ? 'ja' : 'en'
  return out === 'ja' ? 'Write "probably", "summary", "guesses" and "why" in natural Japanese (translate if needed).'
    : out === 'en' ? 'Write "probably", "summary", "guesses" and "why" in natural English (translate if needed).'
      : 'Write "probably", "summary", "guesses" and "why" in the same language as the message.'
}

async function withTimeout(url: string, init: RequestInit, ms: number) {
  const c = new AbortController(); const id = setTimeout(() => c.abort(), ms)
  try { return await fetch(url, { ...init, signal: c.signal }) } finally { clearTimeout(id) }
}

function parse(content: string): Result {
  const s = content.replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '')
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  const j = JSON.parse(s.slice(a, b + 1))
  if (typeof j.probably !== 'string' || !j.probably.trim()) throw new Error('bad json')
  const unclear: Unclear[] = Array.isArray(j.unclear) ? j.unclear.map((u: any) => typeof u === 'string' ? { text: u, guesses: [] } :
    { text: String(u.text ?? ''), guesses: Array.isArray(u.guesses) ? u.guesses.map(String) : [], why: u.why ? String(u.why) : undefined }).filter((u: Unclear) => u.text) : []
  return { probably: j.probably.trim(), summary: String(j.summary ?? '').trim(), unclear }
}

async function ask(messages: object[]): Promise<Result> {
  const body = (model: string) => JSON.stringify({ model, messages, temperature: 0.2, reasoning_effort: 'low', seed: Math.floor(Math.random() * 1e9) })
  const tries: [string, string][] = [
    ['https://text.pollinations.ai/openai', 'openai'],
    ['https://gen.pollinations.ai/v1/chat/completions', 'openai-fast'],
    ['https://text.pollinations.ai/openai', 'openai'],
  ]
  let lastErr: unknown
  for (let i = 0; i < tries.length; i++) {
    if (i > 0) setStatus(T[lang].retry)
    try {
      const r = await withTimeout(tries[i][0], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body(tries[i][1]) }, 90000)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const j = await r.json()
      return parse(j.choices?.[0]?.message?.content ?? '')
    } catch (e) { lastErr = e; await new Promise(res => setTimeout(res, 2500)) }
  }
  throw lastErr
}

function setStatus(s: string, err = false) { const el = document.getElementById('status')!; el.textContent = s; el.classList.toggle('err', err) }

async function decode() {
  const t = T[lang]
  const msg = (document.getElementById('msg') as HTMLTextAreaElement).value.trim()
  const out = (document.getElementById('out') as HTMLSelectElement).value
  if (!msg) { setStatus(t.empty, true); return }
  const go = document.getElementById('go') as HTMLButtonElement
  go.disabled = true; setStatus(t.working); last = null; showResult()
  try {
    last = await ask([{ role: 'system', content: SYSTEM + '\n' + langLine(out, msg) }, { role: 'user', content: 'Message:\n"""\n' + msg.slice(0, 4000) + '\n"""' }])
    setStatus(''); showResult()
  } catch { setStatus(t.fail, true) } finally { go.disabled = false }
}

render()
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js')
