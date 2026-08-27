// A small wand the player visibly holds out, so the shoot ability reads as
// "she has a weapon" rather than an invisible keypress. Purely cosmetic --
// tracked onto the player each frame in LevelScene's update().
export function ensureWandTexture(scene, key = 'wand') {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.fillStyle(0x5a4a7a, 1);
  g.fillRoundedRect(0, 4, 18, 5, 2.5);
  g.fillStyle(0xffd166, 1);
  g.fillCircle(21, 6.5, 5.5);
  g.fillStyle(0xffffff, 0.85);
  g.fillCircle(21, 6.5, 2.2);
  g.generateTexture(key, 28, 13);
  g.destroy();
}
