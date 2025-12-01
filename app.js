console.log('app.js が読み込まれました');

// 直近の検索キーワードを保存しておく
let currentKeyword = '';

// 正規表現用に記号をエスケープ
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 検索用データ（最初は空）
let indexData = [];

// 3冊ぶんの JSON をまとめて読み込む
async function loadIndex() {
  indexData = [];

  const files = [
    'spec-index-kenchiku.json',
    'spec-index-denki.json',
    'spec-index-kikai.json'
  ];

  for (const file of files) {
    try {
      const res = await fetch(file);
      if (!res.ok) {
        console.warn(file, 'は読み込みできませんでした (status =', res.status, ')');
        continue;
      }
      const json = await res.json();
      const items = json.items || [];
      indexData = indexData.concat(items);
      console.log(file, 'から', items.length, '件読み込み');
    } catch (e) {
      console.error(file, 'の読み込みに失敗しました', e);
    }
  }

  console.log('検索データ読み込み完了（合計）:', indexData.length, '件');
}

// =============================
// PDF を開く関数
// =============================
function openPdf(kindOrItem) {
  const frame = document.getElementById('pdfFrame');
  let pdf = '';
  let page = 1;

  // 文字列の場合（ヘッダのボタンから）
  if (typeof kindOrItem === 'string') {
    if (kindOrItem === 'kenchiku') {
      pdf = 'kenchiku.pdf';
    } else if (kindOrItem === 'denki') {
      pdf = 'denki.pdf';
    } else if (kindOrItem === 'kikai') {
      pdf = 'kikai.pdf';
    }
    page = 1;
  } else {
    // 検索結果オブジェクトの場合
    const item = kindOrItem;

    if (item.part === '建築編') {
      pdf = 'kenchiku.pdf';
    } else if (item.part === '電気編') {
      pdf = 'denki.pdf';
    } else if (item.part === '機械編') {
      pdf = 'kikai.pdf';
    }
    page = item.page || 1;
  }

  if (!pdf) {
    alert('PDFファイルが指定されていません');
    return;
  }

  let url = `${encodeURI(pdf)}#page=${page}`;
  if (currentKeyword) {
    const encodedKeyword = encodeURIComponent(currentKeyword);
    url += `&search=${encodedKeyword}`;
  }

  console.log('openPdf URL:', url, 'keyword:', currentKeyword);

  // 一度リセットしてから読み込み直すことで、ページ切り替えを確実にする
  frame.onload = () => {
    if (!currentKeyword) return;
    try {
      frame.contentWindow.focus();
      frame.contentWindow.find(currentKeyword);
    } catch (e) {
      console.warn('PDF 内検索制御はこの環境では制限があります:', e);
    }
  };

  frame.src = '';
  setTimeout(() => {
    frame.src = url;
  }, 50);
}

// =============================
// 検索処理
// =============================
function search() {
  const q = document.getElementById('searchInput').value.trim();
  const part = document.getElementById('partFilter').value;
  currentKeyword = q;  // 今のキーワードを保存

  const resultsEl = document.getElementById('results');

  if (!q) {
    resultsEl.innerHTML = '<p>ここに検索結果が表示されます。</p>';
    return;
  }

  const keyword = q.toLowerCase();

  const hits = indexData
    .filter(item => {
      if (part && item.part !== part) return false;
      return (item.text || '').toLowerCase().includes(keyword);
    })
    .slice(0, 50);

  if (hits.length === 0) {
    resultsEl.innerHTML = '<p>該当する結果はありませんでした。</p>';
    return;
  }

  resultsEl.innerHTML = '';

  hits.forEach(item => {
    const div = document.createElement('div');
    div.className = 'result-item';

    const rawText = (item.text || '');
    let snippet = rawText.substring(0, 80);

    // キーワードを <mark> で囲んでハイライト
    if (currentKeyword) {
      const re = new RegExp(escapeRegExp(currentKeyword), 'ig');
      snippet = snippet.replace(re, (m) => `<mark>${m}</mark>`);
    }

    div.innerHTML = `
      <strong>[${item.part}] ${item.chapter || ''} ${item.section || ''}</strong>
      <small>p.${item.page}</small>
      <div>${snippet}…</div>
    `;
    div.onclick = () => openPdf(item);
    resultsEl.appendChild(div);
  });
}

// =============================
// ページ読み込み時の初期化
// =============================
window.addEventListener('DOMContentLoaded', () => {
  console.log('初期化: イベントリスナー設定');

  loadIndex();

  const searchInput = document.getElementById('searchInput');
  const partFilter = document.getElementById('partFilter');

  searchInput.addEventListener('input', search);
  partFilter.addEventListener('change', search);

  const resultsEl = document.getElementById('results');
  resultsEl.innerHTML = '<p>ここに検索結果が表示されます。</p>';
});
