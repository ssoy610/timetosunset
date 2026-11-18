/* =====================================================
   MOBILE / TOUCH 동작  (index.html 맨 아래, 기존 <script> 뒤에 불러오세요)
   - 인트로: 손가락으로 위아래로 끌면 사진이 움직임
   - 사진 팝업: 두 손가락 벌리기(확대), 확대 중 한 손가락 이동,
                확대 안 했을 때 좌우로 쓸어넘기기(이전/다음), 더블탭(확대/원래대로)
===================================================== */
(function () {
  const isTouch = window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;
  if (!isTouch) return;                         // PC에서는 아무 것도 하지 않음

  /* ── 인트로 사진: 손가락 드래그 ── */
  const intro    = document.getElementById('page-intro');
  const introImg = intro && intro.querySelector('.intro-img');
  if (intro && introImg) {
    let y = 0, last = null;
    intro.addEventListener('touchstart', e => { last = e.touches[0].clientY; }, { passive: true });
    intro.addEventListener('touchmove', e => {
      if (last === null) return;
      const cy = e.touches[0].clientY;
      y = Math.max(-120, Math.min(120, y + (cy - last) * 0.6));
      last = cy;
      introImg.style.transform = `translateY(${y}px)`;
    }, { passive: true });
    intro.addEventListener('touchend', () => { last = null; }, { passive: true });
  }

  /* ── 사진 팝업: 핀치 / 이동 / 스와이프 / 더블탭 ── */
  const box = document.getElementById('lightbox');
  if (!box) return;
  if (typeof zoomAt !== 'function' || typeof applyZoom !== 'function' || typeof lbNav !== 'function') return;

  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const mid  = t => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });
  const ignore = e => e.target.closest && e.target.closest('.lb-arrow, .lb-close');
  const isOpen = () => box.classList.contains('open');

  let mode = null;          // 'swipe' | 'pan' | 'pinch'
  let st = null;            // 한 손가락 시작 정보
  let pinch = null;         // 두 손가락 시작 정보
  let lastTap = 0, lastTapPos = null;

  box.addEventListener('touchstart', e => {
    if (!isOpen() || ignore(e)) return;
    if (e.touches.length === 2) {
      mode = 'pinch';
      pinch = { d: dist(e.touches), s: zoom.s };
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      st = { x: t.clientX, y: t.clientY, zx: zoom.x, zy: zoom.y, moved: false };
      mode = zoom.s > 1 ? 'pan' : 'swipe';
    }
  }, { passive: false });

  box.addEventListener('touchmove', e => {
    if (!isOpen() || ignore(e) || !mode) return;
    e.preventDefault();
    if (mode === 'pinch' && e.touches.length === 2) {
      const m = mid(e.touches);
      zoomAt(m.x, m.y, pinch.s * dist(e.touches) / pinch.d, false);
    } else if (e.touches.length === 1 && st) {
      const t = e.touches[0];
      const dx = t.clientX - st.x, dy = t.clientY - st.y;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) st.moved = true;
      if (mode === 'pan') { zoom.x = st.zx + dx; zoom.y = st.zy + dy; applyZoom(false); }
    }
  }, { passive: false });

  box.addEventListener('touchend', e => {
    if (!isOpen() || ignore(e)) return;
    if (e.cancelable) e.preventDefault();        // 더블탭 때 브라우저가 따로 확대/클릭하는 것 방지

    if (mode === 'pinch') {
      if (e.touches.length === 1) {              // 한 손가락만 남으면 이동 모드로
        const t = e.touches[0];
        st = { x: t.clientX, y: t.clientY, zx: zoom.x, zy: zoom.y, moved: true };
        mode = zoom.s > 1 ? 'pan' : null;
      } else {
        mode = null;
      }
      if (zoom.s < 1.05) { zoom = { s: 1, x: 0, y: 0 }; applyZoom(true); }
      return;
    }
    if (e.touches.length > 0 || !st) return;

    const t  = e.changedTouches[0];
    const dx = t.clientX - st.x, dy = t.clientY - st.y;

    if (mode === 'swipe' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      lbNav(dx < 0 ? 1 : -1);                    // 왼쪽으로 밀면 다음, 오른쪽으로 밀면 이전
    } else if (!st.moved) {                      // 가볍게 탭: 연속 두 번이면 확대/축소
      const now = Date.now();
      if (now - lastTap < 300 && lastTapPos &&
          Math.hypot(t.clientX - lastTapPos.x, t.clientY - lastTapPos.y) < 30) {
        if (zoom.s > 1) { zoom = { s: 1, x: 0, y: 0 }; applyZoom(true); }
        else zoomAt(t.clientX, t.clientY, 2.5);
        lastTap = 0;
      } else {
        lastTap = now; lastTapPos = { x: t.clientX, y: t.clientY };
      }
    }
    mode = null; st = null;
  }, { passive: false });

  box.addEventListener('touchcancel', () => { mode = null; st = null; });
})();
