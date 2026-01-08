uniform sampler2D tDiffuse;
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec4 texel = texture2D(tDiffuse, vUv);
  vec3 glow = texel.rgb * uIntensity;
  float pulse = (sin(2.0) * 0.5 + 0.5) * 0.5;
  glow *= 1.0 + pulse;

  float colorShift = sin(0.5) * 0.5 + 0.5;
  vec3 shiftedColor = mix(glow, vec3(glow.g, glow.b, glow.r), colorShift);

  gl_FragColor = vec4(texel.rgb + shiftedColor, texel.a);
}
