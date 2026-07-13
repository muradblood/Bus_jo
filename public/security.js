/**
 * SAT Security Layer — Lightweight Anti-Tamper
 * Compatible with React Router — does NOT modify prototypes or DOM
 */
(function() {
  'use strict';

  // Wait for React to fully initialize (5 seconds)
  setTimeout(function() {
    initProtection();
  }, 5000);

  function initProtection() {
    // ─── 1. Anti-DevTools via debugger timing ────────────────
    var devThreshold = 160;
    function detectDevTools() {
      var start = performance.now();
      debugger;
      var end = performance.now();
      if ((end - start) > devThreshold) {
        freezePage();
      }
    }
    setInterval(detectDevTools, 3000);

    // ─── 2. Window size change detection ─────────────────────
    function checkWindowSize() {
      var widthDiff = window.outerWidth - window.innerWidth;
      var heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > 200 || heightDiff > 200) {
        // DevTools likely open on side/bottom
        // Just show a warning, don't freeze (to avoid false positives)
        showWarning();
      }
    }
    setInterval(checkWindowSize, 2000);

    // ─── 3. Keyboard shortcuts ───────────────────────────────
    document.addEventListener('keydown', function(e) {
      var k = e.keyCode || e.which;
      // F12
      if (k === 123) { e.preventDefault(); return false; }
      // Ctrl+Shift+I/J/C/K
      if (e.ctrlKey && e.shiftKey && (k === 73 || k === 74 || k === 67 || k === 75)) {
        e.preventDefault(); return false;
      }
      // Ctrl+U (view source)
      if (e.ctrlKey && k === 85) { e.preventDefault(); return false; }
      // Cmd+Option+I/J (Mac)
      if (e.metaKey && e.altKey && (k === 73 || k === 74)) {
        e.preventDefault(); return false;
      }
    }, true);

    // ─── 4. Right-click ──────────────────────────────────────
    document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      return false;
    }, true);

    // ─── 5. Copy/Paste protection on sensitive fields ────────
    document.addEventListener('copy', function(e) {
      var target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        var type = (target.type || '').toLowerCase();
        var cls = (target.className || '').toString().toLowerCase();
        if (type === 'password' || cls.indexOf('card') !== -1 || cls.indexOf('cvv') !== -1) {
          e.preventDefault();
          return false;
        }
      }
    }, true);
  }

  // ─── Freeze page completely ────────────────────────────────
  function freezePage() {
    try {
      document.body.innerHTML = '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:#0f172a;z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:sans-serif;"><h1 style="color:#d4af37;font-size:24px;margin-bottom:10px;">&#9888; Security Alert</h1><p style="color:#888;font-size:14px;">Developer tools detected. Session terminated.</p></div>';
      document.body.style.overflow = 'hidden';
    } catch(e) {}
    // Infinite debugger loop
    setInterval(function() { debugger; }, 100);
  }

  // ─── Show warning banner (non-blocking) ────────────────────
  function showWarning() {
    if (document.getElementById('sat-sec-warning')) return;
    var div = document.createElement('div');
    div.id = 'sat-sec-warning';
    div.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:#b91c1c;color:white;text-align:center;padding:8px;font-size:13px;font-family:sans-serif;z-index:99999;cursor:pointer;';
    div.textContent = 'Developer tools detected. Please close them to continue.';
    div.onclick = function() { div.remove(); };
    document.body.appendChild(div);
  }
})();
