uniform vec3 uColor;
varying float vAlpha;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;
  
  float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
  alpha *= vAlpha;
  
  gl_FragColor = vec4(uColor * 2.0, alpha);
}
