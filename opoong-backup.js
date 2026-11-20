(() => {
  const format = "opoong-backup";
  const maxBytes = 4 * 1024 * 1024;
  const keys = new Set([
    "opoong_theme", "opoong_home_widgets", "opoong_user_name_v1", "opoong_tt_v2",
    "opoong_allergy_numbers_v1", "opoong_favorite_foods_v1", "opoong_go_home_count",
    "opoong_ddays_v1", "opoong_dday_auto_v1", "opoong_dday_expire_v1",
    "opoong_focus_log_v1", "opoong_focus_selected_subject_v1", "opoong_focus_subjects_v1",
    "opoong_rewards_v2", "opoong_point_shop_v1", "opoong_avatar_gacha_v1", "opoong_pet_v1",
    "opoong_jump_best_v1", "opoong_maze_best_v1", "opoong_mine_best_v1",
    "opoong_snake_best_v1", "opoong_stack_best_v1", "opoong_ttt_wins_v1", "opoong_water_best_v1",
    ...Array.from({ length: 6 }, (_, i) => "opoong_first_setup_done_v" + (i + 1))
  ]);
  const eligible = key => keys.has(key) ||
    /^opoong_full_notice_dismissed_[a-zA-Z0-9._-]{1,60}$/.test(key) ||
    key === "opoong_ads_removed_2026_11_05";

  function capture() {
    const data = Object.create(null);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null && eligible(key)) data[key] = localStorage.getItem(key);
    }
    return data;
  }

  function saveFile() {
    const data = capture();
    if (!Object.keys(data).length) throw new Error("이 브라우저에 저장된 오풍 데이터가 없어요.");
    const content = new Blob([JSON.stringify({ format, version: 1, savedAt: new Date().toISOString(), data })],
      { type: "application/json" });
    if (content.size > maxBytes) throw new Error("오풍 데이터가 4MB를 넘어 백업할 수 없어요.");
    const url = URL.createObjectURL(content);
    const download = document.createElement("a");
    download.href = url;
    download.download = "OPoong-Backup-" + new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }) + ".json";
    document.body.appendChild(download);
    download.click();
    download.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function validate(file) {
    if (file.size > maxBytes) throw new Error("백업 파일은 최대 4MB예요.");
    let payload;
    try { payload = JSON.parse(await file.text()); }
    catch { throw new Error("읽을 수 없는 파일이에요. 오풍에서 받은 JSON 백업을 선택해 주세요."); }
    if (payload?.format !== format || payload.version !== 1 || !payload.data ||
        typeof payload.data !== "object" || Array.isArray(payload.data)) {
      throw new Error("이 파일은 오풍 백업 형식이 아니에요.");
    }
    const entries = Object.entries(payload.data);
    if (!entries.length || entries.length > 120 ||
        entries.some(([key, value]) => !eligible(key) || typeof value !== "string")) {
      throw new Error("백업 파일에 지원하지 않는 항목이 있어요.");
    }
    return entries;
  }

  function apply(entries) {
    const previous = capture();
    const keysToClear = new Set([...Object.keys(previous), ...entries.map(([key]) => key)]);
    try {
      for (const key of keysToClear) localStorage.removeItem(key);
      for (const [key, value] of entries) localStorage.setItem(key, value);
      localStorage.removeItem("opoong_dday_auto_cache_v1");
    } catch {
      for (const key of keysToClear) localStorage.removeItem(key);
      for (const [key, value] of Object.entries(previous)) localStorage.setItem(key, value);
      throw new Error("저장 공간을 확인해 주세요. 이전 오풍 설정을 유지했어요.");
    }
  }

  const dialog = document.getElementById("opoongBackup");
  const status = document.getElementById("opoongBackupStatus");
  const input = document.getElementById("opoongBackupFile");
  const exportButton = document.getElementById("opoongBackupExport");
  window.openOpoongBackup = (importOnly = false) => {
    status.textContent = "";
    exportButton.style.display = importOnly ? "none" : "";
    if (!dialog.open) dialog.showModal();
  };

  exportButton.addEventListener("click", () => {
    try { saveFile(); status.textContent = "백업 파일을 저장했어요."; }
    catch (error) { status.textContent = error.message; }
  });

  input.addEventListener("change", async () => {
    const file = input.files[0];
    input.value = "";
    if (!file) return;
    try {
      const entries = await validate(file);
      if (!confirm("이 기기의 오풍 설정을 백업 파일의 내용으로 교체할까요?")) {
        status.textContent = "복원을 취소했어요.";
        return;
      }
      apply(entries);
      alert("오풍 데이터를 복원했어요. 화면을 다시 불러올게요.");
      location.reload();
    } catch (error) { status.textContent = error.message; }
  });
})();
