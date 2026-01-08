uniform sampler2D tDiffuse;
uniform float vignetteIntensity;

varying vec2 vUv;

void main() {
  vec4 color = texture2D(tDiffuse, vUv);

  vec2 center = vUv - 0.5;
  float vignette = 1.0 - dot(center, center) * vignetteIntensity;
  vignette = smoothstep(0.2, 1.0, vignette);

  color.rgb *= vignette;

  gl_FragColor = color;
}
