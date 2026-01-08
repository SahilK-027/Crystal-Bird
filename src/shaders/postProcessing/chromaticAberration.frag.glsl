uniform sampler2D tDiffuse;
uniform float uAberration;
uniform vec2 uMouseInfluence;
varying vec2 vUv;

void main() {
  vec2 direction = vUv - 0.5;
  float dist = length(direction);
  direction = normalize(direction);
  float aberration = uAberration * (1.0 + length(uMouseInfluence) * 2.0);
  vec2 rOffset = direction * aberration * dist;
  vec2 gOffset = direction * aberration * dist * 0.5;
  vec2 bOffset = direction * aberration * dist * -1.0;
  float r = texture2D(tDiffuse, vUv + rOffset).r;
  float g = texture2D(tDiffuse, vUv + gOffset).g;
  float b = texture2D(tDiffuse, vUv + bOffset).b;
  gl_FragColor = vec4(r, g, b, 1.0);
}
