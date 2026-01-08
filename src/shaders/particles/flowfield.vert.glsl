uniform sampler2D uPositions;
uniform float uPixelRatio;
uniform float uSize;
varying float vLife;

void main() {
  vec4 posData = texture2D(uPositions, uv);
  vLife = posData.a;
  
  vec4 mvPosition = modelViewMatrix * vec4(posData.xyz, 1.0);
  float sizeFade = smoothstep(0.0, 0.1, vLife) * smoothstep(1.0, 0.7, vLife);
  float size = uSize * uPixelRatio * sizeFade * (1.0 / -mvPosition.z);
  
  gl_PointSize = size;
  gl_Position = projectionMatrix * mvPosition;
}
