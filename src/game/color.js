import Phaser from 'phaser';

// Blends two 0xRRGGBB colors. t=0 -> pure a, t=1 -> pure b. Used to tint
// shared decorative palettes (level sky/hills, the memory room) toward each
// friend's own color without losing the game's overall look.
export function mixColors(a, b, t) {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  const r = Math.round(ca.red + (cb.red - ca.red) * t);
  const g = Math.round(ca.green + (cb.green - ca.green) * t);
  const bl = Math.round(ca.blue + (cb.blue - ca.blue) * t);
  return Phaser.Display.Color.GetColor(r, g, bl);
}
