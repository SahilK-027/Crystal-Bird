varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = normalize(position); // Normalized direction for seamless 3D noise
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
