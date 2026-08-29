(() => {
  'use strict';

  function mineStateReady() {
    try {
      return Array.isArray(mineCells) && mineCells.length > 0;
    } catch (_) {
      return false;
    }
  }

  function mineWinState() {
    if (!mineStateReady()) return { won: false, safeCleared: false, correctlyFlagged: false };

    const safeCleared = mineCells.every((cell) => cell.mine || cell.open);
    const actualMineCount = mineCells.filter((cell) => cell.mine).length;
    const flagged = mineCells.filter((cell) => cell.flag);
    const correctlyFlagged =
      actualMineCount > 0 &&
      flagged.length === actualMineCount &&
      flagged.every((cell) => cell.mine);

    return {
      won: safeCleared || correctlyFlagged,
      safeCleared,
      correctlyFlagged
    };
  }

  function finishMineWin(state) {
    if (!state || !state.won || mineEnded) return false;

    mineEnded = true;
    clearInterval(mineTimer);
    mineTimer = 0;
    mineElapsed = mineStartedAt ? Math.floor((Date.now() - mineStartedAt) / 1000) : mineElapsed;

    // A completed board should visibly show all mines as found.
    mineCells.forEach((cell) => {
      if (cell.mine) cell.flag = true;
    });

    const best = typeof loadMineBest === 'function' ? loadMineBest() : 0;
    if (mineElapsed > 0 && (!best || mineElapsed < best)) {
      try { localStorage.setItem(OPOONG_MINE_BEST_KEY, String(mineElapsed)); } catch (_) {}
    }

    if (typeof awardOpoongPoints === 'function') awardOpoongPoints(10, '지뢰찾기 성공');

    const status = document.getElementById('mineStatus');
    if (status) {
      status.textContent = state.correctlyFlagged
        ? '지뢰를 모두 정확히 찾았어요!'
        : '모든 안전한 칸을 찾았어요!';
    }

    if (typeof renderMines === 'function') renderMines();
    if (typeof renderGameLibraryStats === 'function') renderGameLibraryStats();
    if (typeof showGameOverAd === 'function') showGameOverAd('mine');
    return true;
  }

  window.checkMineWin = function checkMineWinPatched() {
    if (!mineStateReady() || mineEnded) return false;
    return finishMineWin(mineWinState());
  };

  window.toggleMineFlag = function toggleMineFlagPatched(index) {
    if (!mineStateReady() || mineEnded) return;

    const cell = mineCells[index];
    if (!cell || cell.open) return;

    const actualMineCount = mineCells.filter((item) => item.mine).length;
    const flagCount = mineCells.filter((item) => item.flag).length;

    // Prevent the UI from reaching a misleading negative/zero remaining count
    // while extra flags are still being placed.
    if (!cell.flag && flagCount >= actualMineCount) {
      const status = document.getElementById('mineStatus');
      if (status) status.textContent = `깃발은 최대 ${actualMineCount}개까지 놓을 수 있어요.`;
      if (typeof renderMines === 'function') renderMines();
      return;
    }

    cell.flag = !cell.flag;

    // This was the missing path in the original game: flag changes now also
    // run the victory check, so correctly marking every mine ends the game.
    if (!window.checkMineWin() && typeof renderMines === 'function') renderMines();
  };
})();
