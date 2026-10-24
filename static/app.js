/**
 * Saral frontend — Vanilla JS (Phase 2 Ledger & Marginalia).
 *
 * SPECIFICATIONS:
 * - Ctrl+Enter to submit paste
 * - Cache by content hash + index
 * - Keyboard navigable, no modals, no auto audio
 * - Error banner: missing key / failed call → plain words + show document's own text
 * - Mode switch: DOCUMENT READER | SUSPICIOUS MESSAGE (SMS/WhatsApp)
 * - Asymmetrical split pane: Left ~40% Source Verbatim, Right ~60% Explanation Marginalia
 * - Verified badge: square stamp-style badge (#b45309 border) next to each block.
 *   Click → flash/highlight matching quote in source pane.
 * - Hard terms underlined → tap shows inline gloss meaning
 * - Bottom: GENERATE WHOLE-DOCUMENT SUMMARY (button press only)
 * - Print button: media print strips nav, shows source + explanation side by side
 */

(function () {
  'use strict';

  /* ─── Locales Dictionary ─── */
  const LOCALES = {
    en: {
      tagline: 'You sign what you cannot read.',
      rule: 'If Saral can’t quote it, it doesn’t say it.',
      inputTitle: 'SOURCE FOLIO // PASTE DOCUMENT TEXT',
      btnExplain: 'EXPLAIN',
      footerNote: 'NO DATA STORED · VERIFIED QUOTES ONLY',
      statLabel: 'READABILITY DISPLACEMENT',
      statSub: 'Deterministic complexity shift',
      levelFrom: 'Postgraduate',
      levelTo: 'Class 6',
      lblParagraphs: 'Paragraphs',
      lblVerified: 'Verified',
      paneExplainTitle: 'EXPLANATION MARGINALIA [~60%]',
      paneExplainNote: 'FAITHFUL · SIMPLE · DOUBTS',
      faithfulTitle: 'FAITHFUL',
      simpleTitle: 'SIMPLE',
      doubtsTitle: 'DOUBTS YOU MIGHT HAVE',
      summaryTitle: 'Whole-Document Summary',
      stampVerified: 'VERIFIED',
      stampUnverified: 'ORIGINAL TEXT'
    },
    hi: {
      tagline: 'आप उस दस्तावेज़ पर हस्ताक्षर करते हैं जिसे आप पढ़ नहीं पाते।',
      rule: 'यदि सरल इसे उद्धृत नहीं कर सकता, तो यह ऐसा नहीं कहता।',
      inputTitle: 'दस्तावेज़ दर्ज करें // वित्तीय या कानूनी पाठ',
      btnExplain: 'समझाएं',
      footerNote: 'कोई डेटा संग्रहीत नहीं · केवल सत्यापित उद्धरण',
      statLabel: 'पठनीयता सुधार',
      statSub: 'जटिलता में व्यवस्थित कमी',
      levelFrom: 'स्नातकोत्तर',
      levelTo: 'कक्षा 6',
      lblParagraphs: 'अनुच्छेद',
      lblVerified: 'सत्यापित',
      paneExplainTitle: 'स्पष्टीकरण हाशिए की टिप्पणियां [~60%]',
      paneExplainNote: 'सटीक · सरल · सामान्य प्रश्न',
      faithfulTitle: 'सटीक अर्थ',
      simpleTitle: 'सरल व्याख्या',
      doubtsTitle: 'आपके संभावित प्रश्न',
      summaryTitle: 'दस्तावेज़ का संपूर्ण सारांश',
      stampVerified: 'सत्यापित',
      stampUnverified: 'मूल पाठ'
    },
    ta: {
      tagline: 'நீங்கள் படிக்க முடியாத ஆவணத்தில் கையெழுத்திடுகிறீர்கள்.',
      rule: 'சரல் அதை மேற்கோள் காட்ட முடியாவிட்டால், அது அவ்வாறு கூறவில்லை.',
      inputTitle: 'பதிவு உள்ளீடு // நிதி அல்லது சட்ட உரை',
      btnExplain: 'விளக்குக',
      footerNote: 'தரவு சேமிக்கப்படவில்லை · சரிபார்க்கப்பட்ட மேற்கோள்கள் மட்டுமே',
      statLabel: 'வாசிப்புத்திறன் இடப்பெயர்ச்சி',
      statSub: 'சிக்கல் குறைப்பு பகுப்பாய்வு',
      levelFrom: 'முதுகலை',
      levelTo: 'வகுப்பு 6',
      lblParagraphs: 'பத்திகள்',
      lblVerified: 'சரிபார்க்கப்பட்டது',
      paneExplainTitle: 'விளக்கக் குறிப்புகள் [~60%]',
      paneExplainNote: 'துல்லியமானது · எளிமையானது · சந்தேகங்கள்',
      faithfulTitle: 'துல்லியமான அர்த்தம்',
      simpleTitle: 'எளிய விளக்கம்',
      doubtsTitle: 'உங்களுக்கு எழக்கூடிய சந்தேகங்கள்',
      summaryTitle: 'முழு ஆவணச் சுருக்கம்',
      stampVerified: 'சரிபார்க்கப்பட்டது',
      stampUnverified: 'அசல் உரை'
    }
  };

  let currentLang = 'en';

  /* ─── Client Cache (Key = hash + index) ─── */
  const clientCache = new Map();

  /* ─── Hard Terms Dictionary (Inline gloss) ─── */
  const GLOSS_TERMS = [
    { term: 'surrender value', meaning: 'The cash sum the insurance company pays you if you cancel your policy before its maturity date.' },
    { term: 'arbitration', meaning: 'Settling disputes outside the court through a private arbitrator whose decision is legally binding.' },
    { term: 'lock-in', meaning: 'A mandatory time period during which you cannot sell or withdraw your invested money.' },
    { term: 'lien', meaning: 'A legal claim or right against your funds or assets until a debt is repaid.' },
    { term: 'set-off', meaning: 'A bank’s right to deduct money from one of your accounts to pay off a due loan in another.' },
    { term: 'indemnity', meaning: 'A promise to compensate for any financial loss or damage incurred.' },
    { term: 'liquidated damages', meaning: 'A fixed amount agreed upon in advance that must be paid if the agreement is breached.' },
    { term: 'force majeure', meaning: 'Unforeseeable circumstances (natural disasters, war) that prevent someone from fulfilling a contract.' },
    { term: 'moratorium', meaning: 'A temporary suspension or deferment of payment obligations granted by the lender.' },
    { term: 'amortization', meaning: 'The gradual repayment of a loan through regular scheduled installments over time.' }
  ];

  /* ─── DOM References ─── */
  const docModeContainer = document.getElementById('doc-mode-container');
  const smsModeContainer = document.getElementById('sms-mode-container');
  const tabDoc = document.getElementById('tab-doc');
  const tabSms = document.getElementById('tab-sms');

  const heroStage = document.getElementById('hero-stage');
  const readerStage = document.getElementById('reader-stage');
  const errorBanner = document.getElementById('error-banner');
  const errorMessage = document.getElementById('error-message');
  const btnErrorDismiss = document.getElementById('btn-error-dismiss');

  const sourceInput = document.getElementById('source-input');
  const btnRead = document.getElementById('btn-read');
  const btnBack = document.getElementById('btn-back');
  const btnPrint = document.getElementById('btn-print');
  const btnSummary = document.getElementById('btn-summary');
  const sourceParasEl = document.getElementById('source-paragraphs');
  const explainParasEl = document.getElementById('explain-paragraphs');
  const summaryBox = document.getElementById('summary-box');
  const summaryContent = document.getElementById('summary-content');
  const glossTooltip = document.getElementById('gloss-tooltip');
  const glossClose = document.getElementById('gloss-close');
  const statParaCount = document.getElementById('stat-para-count');
  const statVerifiedCount = document.getElementById('stat-verified-count');

  // Tool panels
  const btnClauseScanner = document.getElementById('btn-clause-scanner');
  const clauseScannerPanel = document.getElementById('clause-scanner-panel');
  const btnCloseScanner = document.getElementById('btn-close-scanner');
  const clauseScannerResults = document.getElementById('clause-scanner-results');

  const btnFitCheck = document.getElementById('btn-fit-check');
  const fitCheckPanel = document.getElementById('fit-check-panel');
  const btnCloseFit = document.getElementById('btn-close-fit');
  const btnRunFit = document.getElementById('btn-run-fit');
  const fitResults = document.getElementById('fit-results');

  // SMS Suspicious mode elements
  const smsInput = document.getElementById('sms-input');
  const btnAnalyzeSms = document.getElementById('btn-analyze-sms');
  const smsResults = document.getElementById('sms-results');
  const smsOutput = document.getElementById('sms-output');

  /* ─── State ─── */
  let fullSourceDoc = '';
  let contentHash = '';
  let paragraphs = [];
  let explanations = [];
  let activeIndex = -1;

  /* ─── Helpers ─── */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorBanner.classList.remove('hidden');
  }

  function hideError() {
    errorBanner.classList.add('hidden');
    errorMessage.textContent = '';
  }

  btnErrorDismiss.addEventListener('click', hideError);

  /* ─── Language Switcher ─── */
  function setLanguage(lang) {
    if (!LOCALES[lang]) return;
    currentLang = lang;
    const loc = LOCALES[lang];

    document.querySelectorAll('.btn-lang').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setText('txt-hero-tagline', loc.tagline);
    setText('txt-hero-rule', loc.rule);
    setText('txt-input-title', loc.inputTitle);
    setText('txt-btn-explain', loc.btnExplain);
    setText('txt-footer-note', loc.footerNote);
    setText('txt-pane-explain-title', loc.paneExplainTitle);
    setText('txt-pane-explain-note', loc.paneExplainNote);
    setText('txt-summary-title', loc.summaryTitle);

    // Re-render blocks to update localized titles & stamps
    explanations.forEach((expl, idx) => {
      if (expl) renderExplanationBlock(idx, expl);
    });
  }

  document.querySelectorAll('.btn-lang').forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });

  /* ─── Mode Switching (Document Reader vs Suspicious Message) ─── */
  tabDoc.addEventListener('click', () => {
    tabDoc.classList.add('active');
    tabSms.classList.remove('active');
    docModeContainer.classList.remove('hidden');
    smsModeContainer.classList.add('hidden');
  });

  tabSms.addEventListener('click', () => {
    tabSms.classList.add('active');
    tabDoc.classList.remove('active');
    docModeContainer.classList.add('hidden');
    smsModeContainer.classList.remove('hidden');
  });

  /* ─── Inline Gloss Matching ─── */
  function annotateGloss(text) {
    if (!text) return '';
    let processed = escapeHtml(text);
    GLOSS_TERMS.forEach(item => {
      const regex = new RegExp(`\\b(${item.term})\\b`, 'gi');
      processed = processed.replace(regex, (match) => {
        return `<span class="gloss-term" tabindex="0" role="button" data-term="${escapeHtml(item.term)}" data-meaning="${escapeHtml(item.meaning)}" data-quote="${escapeHtml(match)}">${match}</span>`;
      });
    });
    return processed;
  }

  /* ─── Flash / Highlight matching quote in Source Verbatim pane ─── */
  function highlightSourceQuote(idx, quoteText) {
    const srcEl = document.getElementById(`src-p-${idx}`);
    if (!srcEl) return;

    // Remove previous flash and quote highlights
    document.querySelectorAll('.source-item').forEach(el => el.classList.remove('flash-highlight'));

    // Scroll source item into view
    srcEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    srcEl.classList.add('flash-highlight');

    // If specific quote provided, highlight quote inside source paragraph
    if (quoteText && quoteText.trim()) {
      const originalText = paragraphs[idx] || '';
      const cleanQuote = quoteText.trim();
      const textContainer = srcEl.querySelector('.source-text');
      if (textContainer && originalText.includes(cleanQuote)) {
        const parts = originalText.split(cleanQuote);
        textContainer.innerHTML = parts.map(p => escapeHtml(p)).join(`<mark class="quote-highlight">${escapeHtml(cleanQuote)}</mark>`);
      }
    }

    // Remove highlight flash after 2 seconds
    setTimeout(() => {
      srcEl.classList.remove('flash-highlight');
    }, 2000);
  }

  /* ─── Render Source Verbatim (Left ~40% Pane) ─── */
  function renderSourceParagraphs() {
    sourceParasEl.innerHTML = '';
    paragraphs.forEach((text, idx) => {
      const div = document.createElement('div');
      div.className = 'source-item';
      div.dataset.index = idx;
      div.id = `src-p-${idx}`;
      div.tabIndex = 0;

      const lineNum = document.createElement('span');
      lineNum.className = 'source-line-num';
      lineNum.textContent = `PARAGRAPH ${idx + 1} // VERBATIM`;

      const textBody = document.createElement('div');
      textBody.className = 'source-text';
      textBody.textContent = text;

      div.appendChild(lineNum);
      div.appendChild(textBody);

      div.addEventListener('click', () => setActiveParagraph(idx));
      div.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') setActiveParagraph(idx);
      });

      sourceParasEl.appendChild(div);
    });
  }

  /* ─── Render Explanation Marginalia (Right ~60% Pane) ─── */
  function renderExplanationBlock(idx, expl) {
    let div = document.getElementById(`expl-p-${idx}`);
    if (!div) {
      div = document.createElement('div');
      div.className = 'explain-item';
      div.dataset.index = idx;
      div.id = `expl-p-${idx}`;
      div.tabIndex = 0;
      explainParasEl.appendChild(div);
    }

    const loc = LOCALES[currentLang];
    const isVerified = expl && expl._verified;
    const hasError = expl && expl._error;

    // Folio header with square stamp-style badge (#b45309 border)
    let stampHtml = '';
    if (isVerified) {
      stampHtml = `<button type="button" class="badge-stamp" data-index="${idx}" aria-label="Verified quote. Click to highlight in source document.">
        <span>▣</span> <span>${escapeHtml(loc.stampVerified)}</span>
      </button>`;
    } else {
      stampHtml = `<button type="button" class="badge-stamp unverified" data-index="${idx}" aria-label="Original verbatim text only">
        <span>⚠</span> <span>${escapeHtml(loc.stampUnverified)}</span>
      </button>`;
    }

    let bodyHtml = '';

    if (hasError) {
      bodyHtml = `
        <div class="explain-block" style="border-left-color: var(--alert);">
          <div class="block-header">
            <h4 class="block-title" style="color: var(--alert);">ORIGINAL TEXT // SYSTEM NOTICE</h4>
          </div>
          <p class="block-text">${annotateGloss(expl.original || paragraphs[idx])}</p>
          <div class="block-quote" style="color: var(--alert);">${escapeHtml(expl._error)}</div>
        </div>
      `;
    } else if (expl.faithful || expl.simple) {
      const faithfulBlock = expl.faithful ? `
        <div class="explain-block">
          <div class="block-header">
            <h4 class="block-title">${escapeHtml(loc.faithfulTitle)}</h4>
          </div>
          <p class="block-text">${annotateGloss(expl.faithful)}</p>
          ${expl.quote_faithful ? `<div class="block-quote" title="Click to highlight quote" data-index="${idx}" data-quote="${escapeHtml(expl.quote_faithful)}">“${escapeHtml(expl.quote_faithful)}”</div>` : ''}
        </div>
      ` : '';

      const simpleBlock = expl.simple ? `
        <div class="explain-block">
          <div class="block-header">
            <h4 class="block-title">${escapeHtml(loc.simpleTitle)}</h4>
          </div>
          <p class="block-text">${annotateGloss(expl.simple)}</p>
          ${expl.quote_simple ? `<div class="block-quote" title="Click to highlight quote" data-index="${idx}" data-quote="${escapeHtml(expl.quote_simple)}">“${escapeHtml(expl.quote_simple)}”</div>` : ''}
        </div>
      ` : '';

      let doubtsBlock = '';
      if (Array.isArray(expl.doubts) && expl.doubts.length > 0) {
        doubtsBlock = `
          <div class="doubts-container">
            <div class="block-header">
              <h4 class="block-title">${escapeHtml(loc.doubtsTitle)}</h4>
            </div>
            <ul class="doubts-list">
              ${expl.doubts.map(d => `
                <li class="doubt-item">
                  <div class="doubt-q">${annotateGloss(d.question)}</div>
                  <div class="doubt-a">${annotateGloss(d.answer)}</div>
                  ${d.quote ? `<div class="doubt-quote" title="Click to highlight quote" data-index="${idx}" data-quote="${escapeHtml(d.quote)}">“${escapeHtml(d.quote)}”</div>` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      }

      bodyHtml = faithfulBlock + simpleBlock + doubtsBlock;
    } else {
      // Still loading
      bodyHtml = `
        <div class="explain-block">
          <p class="block-text" style="color: var(--muted); font-style: italic;">Verifying and analyzing paragraph ${idx + 1} against document lines…</p>
        </div>
      `;
    }

    div.innerHTML = `
      <div class="explain-folio">
        <span class="explain-folio-tag">MARGINALIA §${idx + 1}</span>
        ${stampHtml}
      </div>
      ${bodyHtml}
    `;

    // Click handler for verified badge: flash/highlight matching quote in source pane
    const badgeBtn = div.querySelector('.badge-stamp');
    if (badgeBtn) {
      badgeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const primaryQuote = expl.quote_simple || expl.quote_faithful || (expl.doubts && expl.doubts[0] && expl.doubts[0].quote) || '';
        highlightSourceQuote(idx, primaryQuote);
      });
    }

    // Click handlers on quotes inside explanation
    div.querySelectorAll('.block-quote, .doubt-quote').forEach(qEl => {
      qEl.addEventListener('click', (e) => {
        e.stopPropagation();
        highlightSourceQuote(idx, qEl.dataset.quote);
      });
    });

    div.addEventListener('click', () => setActiveParagraph(idx));
    div.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') setActiveParagraph(idx);
    });
  }

  function setActiveParagraph(idx) {
    if (idx === activeIndex) return;
    activeIndex = idx;

    document.querySelectorAll('.source-item').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.index) === idx);
    });
    document.querySelectorAll('.explain-item').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.index) === idx);
    });
  }

  /* ─── Explaining via Backend API with Cache ─── */
  async function onSubmit() {
    const text = sourceInput.value.trim();
    if (!text) {
      showError('Please paste or type document text before requesting explanation.');
      return;
    }

    hideError();
    btnRead.disabled = true;
    btnRead.textContent = 'READING & VERIFYING…';

    try {
      const resp = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!resp.ok) {
        let errDetail = 'Failed to process document.';
        try {
          const errData = await resp.json();
          if (errData.detail) errDetail = errData.detail;
        } catch (_) {}
        throw new Error(errDetail);
      }

      const data = await resp.json();
      contentHash = data.content_hash || '';
      fullSourceDoc = text;
      explanations = data.paragraphs || [];

      // Extract raw paragraphs
      paragraphs = explanations.map(p => p.original || '');
      if (paragraphs.length === 0) {
        paragraphs = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      }

      // Cache each paragraph
      explanations.forEach((item, idx) => {
        clientCache.set(`${contentHash}:${idx}`, item);
      });

      // Update counters if present
      if (statParaCount) statParaCount.textContent = paragraphs.length;
      const verifiedCount = explanations.filter(e => e._verified).length;
      if (statVerifiedCount) statVerifiedCount.textContent = verifiedCount;

      // Check if any returned fallback due to missing key or error
      const errorItem = explanations.find(e => e._error);
      if (errorItem) {
        showError(errorItem._error);
      }

      // Render both panes
      renderSourceParagraphs();
      explainParasEl.innerHTML = '';
      explanations.forEach((item, idx) => {
        renderExplanationBlock(idx, item);
      });

      // Switch view to Reader stage
      heroStage.classList.add('hidden');
      readerStage.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Run automatic Clause Scanner in background
      runClauseScanner();
    } catch (err) {
      showError(`Document reading halted: ${err.message}. Showing original text.`);
      // Honest failure: show source verbatim regardless
      paragraphs = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      explanations = paragraphs.map(p => ({
        original: p,
        faithful: '',
        simple: '',
        doubts: [],
        _verified: false,
        _error: err.message
      }));
      if (statParaCount) statParaCount.textContent = paragraphs.length;
      if (statVerifiedCount) statVerifiedCount.textContent = '0';
      renderSourceParagraphs();
      explainParasEl.innerHTML = '';
      explanations.forEach((item, idx) => {
        renderExplanationBlock(idx, item);
      });
      heroStage.classList.add('hidden');
      readerStage.classList.remove('hidden');
    } finally {
      btnRead.disabled = false;
      btnRead.textContent = LOCALES[currentLang].btnExplain;
    }
  }

  /* ─── Whole Document Summary (Button press only) ─── */
  async function onSummary() {
    if (!contentHash) return;

    btnSummary.disabled = true;
    btnSummary.textContent = 'SYNTHESIZING…';

    try {
      const resp = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_hash: contentHash })
      });

      if (!resp.ok) {
        let errDetail = 'Failed to generate summary.';
        try {
          const errData = await resp.json();
          if (errData.detail) errDetail = errData.detail;
          else if (errData._error) errDetail = errData._error;
        } catch (_) {}
        throw new Error(errDetail);
      }

      const data = await resp.json();
      const quoteHtml = data.quote ? `<div class="summary-quote">Verbatim Anchor: “${escapeHtml(data.quote)}”</div>` : '';

      summaryContent.innerHTML = `
        <div class="summary-text">${annotateGloss(data.summary)}</div>
        ${quoteHtml}
      `;
      summaryBox.classList.remove('hidden');
      summaryBox.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      summaryContent.innerHTML = `
        <div class="summary-text" style="color: var(--alert);">
          <strong>Summary generation notice:</strong> ${escapeHtml(err.message)}
        </div>
      `;
      summaryBox.classList.remove('hidden');
      summaryBox.scrollIntoView({ behavior: 'smooth' });
    } finally {
      btnSummary.disabled = false;
      btnSummary.textContent = 'GENERATE WHOLE-DOCUMENT SUMMARY';
    }
  }

  /* ─── Deterministic Clause Scanner ─── */
  function runClauseScanner() {
    const rules = [
      { id: 'auto-renewal', name: 'Automatic Renewal', regex: /(auto(?:matic)?(?:ally)?\s+renew(?:al|ed|s)?|rollover)/i },
      { id: 'rate-change', name: 'Unilateral Rate Change', regex: /(revise|modify|alter|change|vary)\s+(?:the\s+)?(?:interest\s+rate|fee|charges|terms)\s+without\s+(?:prior\s+)?notice/i },
      { id: 'set-off', name: 'Bank Set-Off / Lien', regex: /(right\s+to\s+set[- ]?off|lien\s+on\s+all\s+(?:accounts|deposits)|general\s+lien)/i },
      { id: 'arbitration', name: 'Mandatory Arbitration', regex: /(arbitration|arbitrator|dispute\s+shall\s+be\s+referred\s+to)/i },
      { id: 'late-fee', name: 'Penalties & Late Fees', regex: /(penal(?:ty)?\s+interest|default\s+charges|late\s+(?:payment\s+)?fee)/i },
      { id: 'deferral', name: 'Payment Deferral', regex: /(defer\s+payment|postpone\s+(?:the\s+)?surrender\s+value|delay\s+disbursement)/i }
    ];

    clauseScannerResults.innerHTML = '';
    const fullText = fullSourceDoc;
    let foundCount = 0;

    const grid = document.createElement('div');
    grid.className = 'scanner-grid';

    rules.forEach(rule => {
      const match = rule.regex.exec(fullText);
      const card = document.createElement('div');
      card.className = 'scan-card' + (match ? ' flagged' : '');

      if (match) {
        foundCount++;
        // Find line around match
        const start = Math.max(0, fullText.lastIndexOf('\n', match.index));
        let end = fullText.indexOf('\n', match.index + match[0].length);
        if (end === -1) end = fullText.length;
        const line = fullText.slice(start, end).trim();

        card.innerHTML = `
          <span class="scan-tag">FLAGGED // ${escapeHtml(rule.name)}</span>
          <div style="font-size:0.85rem;font-weight:600;color:var(--alert);">High-Risk Clause Found</div>
          <div class="scan-line">“${escapeHtml(line)}”</div>
        `;
      } else {
        card.innerHTML = `
          <span class="scan-tag" style="color:var(--muted);">CLEAR // ${escapeHtml(rule.name)}</span>
          <div style="font-size:0.82rem;color:var(--muted);">No matching clause detected</div>
        `;
      }
      grid.appendChild(card);
    });

    clauseScannerResults.appendChild(grid);
  }

  btnClauseScanner.addEventListener('click', () => {
    clauseScannerPanel.classList.toggle('hidden');
    if (!clauseScannerPanel.classList.contains('hidden')) {
      clauseScannerPanel.scrollIntoView({ behavior: 'smooth' });
    }
  });
  btnCloseScanner.addEventListener('click', () => clauseScannerPanel.classList.add('hidden'));

  /* ─── Fit Check: Objective Side-by-Side Comparison ─── */
  function runFitCheck() {
    const goal = document.getElementById('fit-goal').value;
    const amount = document.getElementById('fit-amount').value;
    const horizon = document.getElementById('fit-horizon').value;
    const risk = document.getElementById('fit-risk').value;

    const fullText = fullSourceDoc;

    // Search for relevant document clauses
    const lockinMatch = fullText.match(/(lock[- ]?in|surrender|tenure|maturity|duration|term\s+of\s+\d+)/i);
    const riskMatch = fullText.match(/(risk|market\s+fluctuation|capital\s+loss|guaranteed|not\s+guaranteed)/i);
    const feeMatch = fullText.match(/(charges|expense\s+ratio|fee|penalty|deduction|commission)/i);

    const getLine = (match) => {
      if (!match) return 'No direct clause isolated.';
      const s = Math.max(0, fullText.lastIndexOf('\n', match.index));
      let e = fullText.indexOf('\n', match.index + match[0].length);
      if (e === -1) e = fullText.length;
      return fullText.slice(s, e).trim();
    };

    fitResults.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
        <thead>
          <tr style="background:#ede8df;border-bottom:1px solid var(--ink);text-align:left;">
            <th style="padding:0.4rem;font-family:var(--font-mono);">Dimension</th>
            <th style="padding:0.4rem;font-family:var(--font-mono);">Your Profile</th>
            <th style="padding:0.4rem;font-family:var(--font-mono);">Document's Verbatim Clause</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid var(--rule);">
            <td style="padding:0.5rem 0.4rem;font-weight:600;">Horizon</td>
            <td style="padding:0.5rem 0.4rem;">${escapeHtml(horizon)}</td>
            <td style="padding:0.5rem 0.4rem;font-family:var(--font-mono);font-size:0.78rem;">“${escapeHtml(getLine(lockinMatch))}”</td>
          </tr>
          <tr style="border-bottom:1px solid var(--rule);">
            <td style="padding:0.5rem 0.4rem;font-weight:600;">Risk</td>
            <td style="padding:0.5rem 0.4rem;">${escapeHtml(risk)}</td>
            <td style="padding:0.5rem 0.4rem;font-family:var(--font-mono);font-size:0.78rem;">“${escapeHtml(getLine(riskMatch))}”</td>
          </tr>
          <tr>
            <td style="padding:0.5rem 0.4rem;font-weight:600;">Fees / Cost</td>
            <td style="padding:0.5rem 0.4rem;">${escapeHtml(amount)}</td>
            <td style="padding:0.5rem 0.4rem;font-family:var(--font-mono);font-size:0.78rem;">“${escapeHtml(getLine(feeMatch))}”</td>
          </tr>
        </tbody>
      </table>
      <div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--muted);margin-top:0.6rem;">
        NOTE: Saral presents relevant clauses side-by-side and never decides for you.
      </div>
    `;
    fitResults.scrollIntoView({ behavior: 'smooth' });
  }

  btnFitCheck.addEventListener('click', () => {
    fitCheckPanel.classList.toggle('hidden');
    if (!fitCheckPanel.classList.contains('hidden')) {
      fitCheckPanel.scrollIntoView({ behavior: 'smooth' });
    }
  });
  btnCloseFit.addEventListener('click', () => fitCheckPanel.classList.add('hidden'));
  btnRunFit.addEventListener('click', runFitCheck);

  /* ─── Suspicious Message Mode (SMS / WhatsApp) ─── */
  function analyzeSms() {
    const text = smsInput.value.trim();
    if (!text) return;

    btnAnalyzeSms.disabled = true;

    try {
      const urgencyRegex = /(urgent|immediate(?:ly)?|tonight|within\s+\d+\s+hours|suspended|disconnected|blocked|expire)/i;
      const paymentRegex = /(pay|send|transfer|₹|\bRs\.?|\$|deposit|fine|bill|fee)/i;
      const linkRegex = /(https?:\/\/\S+|bit\.ly\S+|wa\.me\S+|apk\b|download|click\s+here)/i;

      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      let urgentQuote = '';
      let paymentQuote = '';
      let linkQuote = '';

      for (const line of lines) {
        if (!urgentQuote && urgencyRegex.test(line)) urgentQuote = line;
        if (!paymentQuote && paymentRegex.test(line)) paymentQuote = line;
        if (!linkQuote && linkRegex.test(line)) linkQuote = line;
      }

      if (!urgentQuote && urgencyRegex.test(text)) urgentQuote = text.match(urgencyRegex)[0];
      if (!paymentQuote && paymentRegex.test(text)) paymentQuote = text.match(paymentRegex)[0];
      if (!linkQuote && linkRegex.test(text)) linkQuote = text.match(linkRegex)[0];

      smsOutput.innerHTML = `
        <div class="sms-line-item">
          <div class="sms-line-label">1. Demanded Action</div>
          <div class="sms-line-text">${paymentQuote ? 'Demands immediate money transfer or payment under threat.' : 'Demands immediate user action.'}</div>
          <div class="sms-line-quote">Verbatim: “${escapeHtml(paymentQuote || text.slice(0, 80))}”</div>
        </div>
        <div class="sms-line-item">
          <div class="sms-line-label">2. Pressure Tactic</div>
          <div class="sms-line-text">${urgentQuote ? 'Uses artificial time pressure to prevent independent verification.' : 'Presents unsolicited notification.'}</div>
          <div class="sms-line-quote">Verbatim: “${escapeHtml(urgentQuote || 'No explicit urgency phrase detected.')}”</div>
        </div>
        <div class="sms-line-item">
          <div class="sms-line-label">3. Destination & Risk</div>
          <div class="sms-line-text">${linkQuote ? 'Directs user to an unverified external link or channel.' : 'Lacks authorized banking or government sender validation.'}</div>
          <div class="sms-line-quote">Verbatim: “${escapeHtml(linkQuote || text)}”</div>
        </div>
      `;
      smsResults.classList.remove('hidden');
      smsResults.scrollIntoView({ behavior: 'smooth' });
    } finally {
      btnAnalyzeSms.disabled = false;
    }
  }

  btnAnalyzeSms.addEventListener('click', analyzeSms);

  /* ─── Back to Paste / New Document ─── */
  function onBack() {
    sourceInput.value = '';
    fullSourceDoc = '';
    contentHash = '';
    paragraphs = [];
    explanations = [];
    activeIndex = -1;
    sourceParasEl.innerHTML = '';
    explainParasEl.innerHTML = '';
    summaryBox.classList.add('hidden');
    clauseScannerPanel.classList.add('hidden');
    fitCheckPanel.classList.add('hidden');
    if (statParaCount) statParaCount.textContent = '0';
    if (statVerifiedCount) statVerifiedCount.textContent = '0';
    readerStage.classList.add('hidden');
    heroStage.classList.remove('hidden');
    hideError();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ─── Inline Gloss Tooltip ─── */
  function showGloss(term, meaning, quote, x, y) {
    const glossBody = document.getElementById('gloss-body');
    glossBody.innerHTML = `
      <strong style="font-family:var(--font-mono);font-size:0.85rem;color:var(--ink);display:block;margin-bottom:0.25rem;">${escapeHtml(term)}</strong>
      <p style="margin:0 0 0.35rem;font-size:0.85rem;line-height:1.4;">${escapeHtml(meaning)}</p>
      <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--muted);font-style:italic;border-left:2px solid var(--accent);padding-left:0.4rem;display:block;">“${escapeHtml(quote)}”</span>
    `;
    glossTooltip.classList.remove('hidden');
    glossTooltip.setAttribute('aria-hidden', 'false');

    let top = y + window.scrollY + 10;
    let left = x + window.scrollX - 80;
    const ttWidth = 320;
    if (left + ttWidth > window.innerWidth - 16) {
      left = window.innerWidth - ttWidth - 16;
    }
    if (left < 8) left = 8;
    glossTooltip.style.top = top + 'px';
    glossTooltip.style.left = left + 'px';
  }

  function hideGloss() {
    glossTooltip.classList.add('hidden');
    glossTooltip.setAttribute('aria-hidden', 'true');
  }

  glossClose.addEventListener('click', hideGloss);

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('gloss-term')) {
      const term = e.target.dataset.term;
      const meaning = e.target.dataset.meaning;
      const quote = e.target.dataset.quote;
      showGloss(term, meaning, quote, e.clientX, e.clientY);
      e.stopPropagation();
    } else if (!glossTooltip.contains(e.target)) {
      hideGloss();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideGloss();
  });

  /* ─── Print Ledger ─── */
  btnPrint.addEventListener('click', () => {
    window.print();
  });

  /* ─── Event Bindings ─── */
  btnRead.addEventListener('click', onSubmit);
  btnBack.addEventListener('click', onBack);
  btnSummary.addEventListener('click', onSummary);

  // Ctrl+Enter to submit paste
  sourceInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      onSubmit();
    }
  });

  /* ─── Init ─── */
  setLanguage('en');
})();
