uniform float uTime;
uniform float uOpacity;
uniform vec3 uTint;
varying vec2 vUv;

// Simple hash for noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Smooth value noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// 3 octave fbm - lightweight
float clouds(vec2 p) {
  float v = 0.0;
  v += noise(p) * 0.5;
  v += noise(p * 2.0) * 0.25;
  v += noise(p * 4.0) * 0.125;
  return v;
}

void main() {
  vec2 uv = vUv;
  
  // Layer 1 - large slow clouds
  vec2 uv1 = uv * 10.0 + vec2(uTime * 0.15, uTime * -0.05);
  float c1 = clouds(uv1);
  
  // Layer 2 - medium clouds, different direction
  vec2 uv2 = uv * 5.0 + vec2(uTime * 0.02, -uTime * 0.008) + 10.0;
  float c2 = clouds(uv2);
  
  // Combine layers
  float cloudVal = c1 * 0.6 + c2 * 0.4;
  
  // Soft threshold for cloud shapes
  cloudVal = smoothstep(0.3, 0.7, cloudVal);
  
  // Color gradient - darker at bottom, lighter at top
  vec3 darkBlue = uTint;
  vec3 lightBlue = uTint + vec3(0.1, 0.15, 0.2);
  vec3 color = mix(darkBlue, lightBlue, cloudVal * 0.5 + uv.y * 0.3);
  
  // Inverted vignette - clouds at edges, clear center
  vec2 center = uv - 0.45;
  float dist = length(center);
  float edgeMask = smoothstep(0.1, 0.18, dist);
  
  float alpha = cloudVal * uOpacity * edgeMask;
  
  gl_FragColor = vec4(color, alpha);
}
