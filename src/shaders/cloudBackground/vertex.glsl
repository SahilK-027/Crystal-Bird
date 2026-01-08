varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
