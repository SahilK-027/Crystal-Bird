uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
attribute float aRandom;
varying float vAlpha;

void main() {
  vec3 pos = position;
  pos.y += sin(uTime * 0.5 + aRandom * 10.0) * 0.1;
  pos.x += cos(uTime * 0.3 + aRandom * 8.0) * 0.05;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  float twinkle = sin(uTime * 5.0 + aRandom * 50.0) * 0.5 + 0.5;
  twinkle = pow(twinkle, 3.0);

  float size = (uSize + twinkle * 4.0 * uSize) * uPixelRatio;
  size *= (2.0 / -mvPosition.z);

  gl_PointSize = size;
  gl_Position = projectionMatrix * mvPosition;
  vAlpha = twinkle * 0.6;
}
