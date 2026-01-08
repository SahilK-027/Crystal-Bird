uniform float uTime;
uniform float uOpacity;
uniform vec3 uTint;
varying vec2 vUv;
varying vec3 vPosition;

float hash3D(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

float noise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash3D(i);
  float n100 = hash3D(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash3D(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash3D(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash3D(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash3D(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash3D(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash3D(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);

  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);

  return mix(nxy0, nxy1, f.z);
}

float clouds3D(vec3 p) {
  float v = 0.0;
  v += noise3D(p) * 0.5;
  v += noise3D(p * 2.0) * 0.25;
  v += noise3D(p * 4.0) * 0.125;
  return v;
}

void main() {
  vec3 pos = vPosition;

  vec3 p1 = pos * 3.0 + vec3(uTime * 0.05, uTime * -0.02, uTime * 0.03);
  float c1 = clouds3D(p1);

  vec3 p2 = pos * 5.0 + vec3(uTime * 0.02, uTime * 0.01, -uTime * 0.015) + 10.0;
  float c2 = clouds3D(p2);

  float cloudVal = c1 * 0.6 + c2 * 0.4;

  cloudVal = smoothstep(0.3, 0.7, cloudVal);

  vec3 darkBlue = uTint;
  vec3 lightBlue = uTint + vec3(0.1, 0.15, 0.2);
  float heightFactor = pos.y * 0.5 + 0.5;
  vec3 color = mix(darkBlue, lightBlue, cloudVal * 0.5 + heightFactor * 0.3);

  float dist = length(pos.xz);
  float edgeMask = smoothstep(0.1, 0.5, dist);

  float alpha = cloudVal * uOpacity * edgeMask;

  gl_FragColor = vec4(color, alpha);
}
