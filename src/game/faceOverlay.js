// Layers a real photo, circle-masked, on top of a humanoid sprite's drawn
// head. Purely cosmetic -- follows whatever position you feed it each frame
// via setPosition(); the underlying body sprite still owns physics/collision.
export function createFaceOverlay(scene, { textureKey, radius }) {
  if (!textureKey || !scene.textures.exists(textureKey)) return null;

  const maskShape = scene.make.graphics({ x: 0, y: 0, add: false });
  const image = scene.add.image(0, 0, textureKey);
  image.setDisplaySize(radius * 2, radius * 2);
  image.setMask(maskShape.createGeometryMask());

  return {
    image,
    setPosition(x, y) {
      image.setPosition(x, y);
      maskShape.clear();
      maskShape.fillStyle(0xffffff);
      maskShape.fillCircle(x, y, radius);
    },
  };
}
