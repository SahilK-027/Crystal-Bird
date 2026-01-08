uniform float uTriScale;
uniform float uProgress;
uniform float uMosaic;
uniform float uTime;
uniform vec2 uMousePosition;
uniform float uHover;
uniform vec2 uMouseVelocity;
attribute vec3 center;
attribute vec3 vertexColor;
varying vec2 vUv;
varying vec3 vNormal;
varying float vDisplacement;
varying vec3 vPosition;
varying vec3 vVertexColor;
#include noise.glsl;

const float PI = 3.14159265359;

float backOut(float pregress, float swing) {
    float p = pregress - 1.0;
    return (p * p * ((swing + 1.0) * p + swing) + 1.0);
}

void main() {
    vUv = uv;
    vNormal = normal;
    vPosition = position;
    vVertexColor = vertexColor;

    float scale = uTriScale + sin(uTime * 0.5) * 0.02;
    vec3 pos = (position - center) * scale + center;

    float wave = sin(pos.y * 5.0 + uTime) * 0.005;
    pos.x += wave;
    pos.z += wave;

    float noise = cnoise(vec4(pos * 2.0, uTime * 0.1)) * 0.01;
    pos += normal * noise;

    vec4 clipPos = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vec2 ndcPos = clipPos.xy / clipPos.w;

    vec2 mouseDelta2D = uMousePosition - ndcPos;
    float mouseDistance = length(mouseDelta2D);

    float mouseInfluence = smoothstep(0.15, 0.0, mouseDistance);

    mat3 normalMatrix = mat3(modelViewMatrix);
    mat3 invNormalMatrix = transpose(normalMatrix);

    vec3 viewPush = vec3(-mouseDelta2D, 0.0);
    vec3 modelPush = invNormalMatrix * viewPush;

    pos += modelPush * mouseInfluence * 0.5;

    float transformStart = -(position.z * 0.5 + 0.5) * 4.0;
    float transformProgress = backOut(clamp(uProgress * 5.0 + transformStart, 0.0, 1.0), 5.0);

    vec3 posPixelated = floor(pos * uMosaic + 0.5) / uMosaic;
    pos += mix(pos, posPixelated, transformProgress);

    vDisplacement = noise + mouseInfluence * 2.0;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}