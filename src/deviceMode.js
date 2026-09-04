// Shared "is this a short landscape phone" check -- the same breakpoint
// style.css's short-viewport media queries use (max-height: 500px in
// landscape; portrait is blocked outright by .rotate-block, so landscape
// is the only orientation the game ever actually runs in). Used to switch
// several things from their desktop behavior to a mobile-friendly one:
// the memory-room reveal (revealHtml.js), and the mini-boss fire rate
// (LevelScene.js -- a touch d-pad dodges slower than a keyboard).
export function isShortLandscapePhone() {
  return window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
}
