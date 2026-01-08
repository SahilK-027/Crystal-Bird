varying vec2 vUv;
varying vec3 vNormal;
varying float vDisplacement;
varying vec3 vVertexColor;
uniform float uTime;
uniform sampler2D uTexture;
uniform bool uHasTexture;
uniform vec3 uGlowColor;
uniform vec3 uAccentColor;

float fresnel(vec3 viewDirection, vec3 normal, float power) {
    return pow(1.0 - dot(viewDirection, normal), power);
}

float noise(vec2 coord) {
    vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
    return fract(magic.z * fract(dot(coord, magic.xy)));
}

void main() {
    vec3 viewDirection = normalize(cameraPosition - vNormal);

    vec3 baseColor;
    if(uHasTexture) {
        baseColor = texture2D(uTexture, vUv).rgb;
    } else if(length(vVertexColor) > 0.01) {
        baseColor = vVertexColor;
    } else {
        baseColor = vec3(1.0, 0.0, 0.0);
    }

    vec3 glowColor = baseColor * 1.5 + uGlowColor;
    vec3 accentColor = baseColor * 0.8 + uAccentColor;

    vec3 color = mix(baseColor, glowColor, vDisplacement * 0.1);

    float ember = sin(0.5) * 0.5 + 0.5;
    color += glowColor * ember * 0.3;

    float rim = fresnel(viewDirection, vNormal, 3.0);
    color += rim * glowColor * 1.2;

    float fire = noise(vUv * 10.0 * 0.1);
    fire = smoothstep(0.4, 0.6, fire);
    color += fire * accentColor * 0.4;

    float shimmer = noise(vUv * 20.0 * 0.2);
    color += shimmer * glowColor * 0.2;

    float featherDetail = noise(vUv * 30.0);
    color = mix(color, accentColor, featherDetail * 0.15);

    float vignette = smoothstep(0.7, 0.3, length(vUv - 0.5));
    color *= vignette * 0.7 + 0.3;

    color = pow(color, vec3(1.0));

    color *= 1.5;

    gl_FragColor = vec4(color, 1.0);
}