uniform sampler2D tDiffuse;
uniform float uTime;
varying vec2 vUv;

vec3 adjustContrast(vec3 color, float contrast) {
  return 0.5 + (1.0 + contrast) * (color - 0.5);
}

vec3 adjustSaturation(vec3 color, float saturation) {
  float grey = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(grey), color, 1.0 + saturation);
}

void main() {
  vec4 texel = texture2D(tDiffuse, vUv);
  vec3 color = adjustContrast(texel.rgb, 0.2);
  color = adjustSaturation(color, 0.2);

  float shift = sin(0.2) * 0.5 + 0.5;
  color = mix(color, color.gbr, shift * 0.1);

  vec2 center = vUv - 0.5;
  float vignette = 1.0 - dot(center, center) * 0.3;
  color *= vignette;

  gl_FragColor = vec4(color, texel.a);
}
