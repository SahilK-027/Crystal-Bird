uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;

float random(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 texel = texture2D(tDiffuse, vUv);
  float grain = random(vUv + fract(uTime)) * 2.0 - 1.0;
  grain *= uIntensity;

  vec3 color = texel.rgb + vec3(grain);
  gl_FragColor = vec4(color, texel.a);
}
