uniform vec3 uColor;
uniform vec3 uGlowColor;
uniform float uTime;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);
  float shimmer = sin(uTime * 2.0 + vViewPosition.x * 10.0) * 0.15 + 0.85;
  float sparkle = noise(vUv * 20.0 + uTime * 0.5);
  sparkle = pow(sparkle, 8.0) * 2.0;

  vec3 color = uColor * (0.5 + fresnel * 0.8) * shimmer;
  color += uGlowColor * fresnel * 0.6;
  color += vec3(1.0) * sparkle * 0.3;

  float alpha = 0.6 + fresnel * 0.4;
  gl_FragColor = vec4(color * 1.2, alpha);
}
