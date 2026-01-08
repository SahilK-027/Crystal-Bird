uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
varying float vLife;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;
  
  float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
  alpha *= smoothstep(0.0, 0.15, vLife) * smoothstep(1.0, 0.7, vLife) * 0.6;
  
  vec3 color = mix(uColor3, uColor2, vLife);
  color = mix(color, uColor1, vLife * vLife);
  
  gl_FragColor = vec4(color * 1.8, alpha);
}
