// Bakes a photo into a circular texture once, instead of a live
// GeometryMask. A live mask forces an extra render pass per masked object
// every frame -- fine for the one or two faces on screen everywhere else
// in the game, but the dragon finale can have close to twenty avatars up
// at once (see BossScene's ally squad), and that many simultaneous masks
// measurably dropped the frame rate. Baking once up front and reusing a
// plain Image after that avoids the per-frame cost entirely.
export function ensureCirclePhotoTexture(scene, { key, sourceKey, diameter, fit = 'cover' }) {
  if (!sourceKey || !scene.textures.exists(sourceKey)) return null;
  if (scene.textures.exists(key)) return key;

  const maskShape = scene.make.graphics({ x: 0, y: 0, add: false });
  maskShape.fillStyle(0xffffff);
  maskShape.fillCircle(diameter / 2, diameter / 2, diameter / 2);

  // 'cover' (default, like CSS object-fit: cover) scales to fill the
  // circle completely, cropping whichever axis overflows -- right for a
  // cropped headshot where some edge margin loss doesn't matter. 'contain'
  // scales to fit the whole image inside instead, cropping nothing (may
  // leave a little empty circle around a very non-square source) -- for
  // full illustrations like the level mini-bosses, where cropping into the
  // art itself would cut the monster off instead of just trimming margin.
  const source = scene.textures.get(sourceKey).getSourceImage();
  const natW = source.width || diameter;
  const natH = source.height || diameter;
  const scale = fit === 'contain' ? Math.min(diameter / natW, diameter / natH) : Math.max(diameter / natW, diameter / natH);

  const image = scene.make.image({ x: diameter / 2, y: diameter / 2, key: sourceKey, add: false });
  image.setDisplaySize(natW * scale, natH * scale);
  image.setMask(maskShape.createGeometryMask());

  const rt = scene.make.renderTexture({ width: diameter, height: diameter }, false);
  rt.draw(image, diameter / 2, diameter / 2);
  rt.saveTexture(key);

  image.destroy();
  maskShape.destroy();
  rt.destroy();

  return key;
}
