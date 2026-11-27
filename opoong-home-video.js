(() => {
  const recipient = "유진";
  const videoPath = "./assets/home-video.mp4";
  const button = document.getElementById("homeVideoButton");
  const dialog = document.getElementById("homeVideoDialog");
  const player = dialog.querySelector("video");
  const status = dialog.querySelector('[role="status"]');

  window.updateHomeVideoButton = name => {
    button.hidden = name !== recipient;
    if (button.hidden && dialog.open) dialog.close();
  };

  button.addEventListener("click", () => {
    if (button.hidden || dialog.open) return;
    status.textContent = "";
    dialog.showModal();
    player.src = videoPath;
    player.play().catch(() => {});
  });

  player.addEventListener("error", () => {
    if (player.hasAttribute("src")) status.textContent = "영상을 재생하지 못했어요.";
  });

  dialog.addEventListener("close", () => {
    player.pause();
    player.removeAttribute("src");
    player.load();
  });

  window.addEventListener("storage", event => {
    if (event.key === USER_NAME_KEY || event.key === null) updateUserBadge();
  });
})();
