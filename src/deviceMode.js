// Shared "is this a short phone screen" check. Reads window.innerHeight
// directly rather than matchMedia('(max-height: ...)') -- CSS media
// *features* have a real history of resolving height/width against the
// browser's "large" viewport (chrome hidden) on mobile, the same class
// of bug 100vh has (see #app's own height rule in style.css), so a
// matchMedia check here could disagree with what the CSS media queries
// in style.css are actually doing, and disagree with what's really
// visible. window.innerHeight doesn't have that ambiguity -- it tracks
// the real, current visible layout viewport. No orientation check
// either: portrait is blocked outright by .rotate-block, so by the time
// any of this actually runs (gameplay, the memory room) she's always in
// landscape already, and a plain height check is one less thing that can
// disagree with itself. Used to switch several things from their desktop
// behavior to a mobile-friendly one: the memory-room reveal
// (revealHtml.js) and the mini-boss fire rate (LevelScene.js -- a touch
// d-pad dodges slower than a keyboard).
export function isShortLandscapePhone() {
  return window.innerHeight <= 500;
}
