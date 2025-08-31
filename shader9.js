registerShader('Mirror Fractal', `
// Mirror-like "Happy Accident" Shader (CC0)
// A shiny reflective variation of a raymarched fractal accident

float map(vec3 p) {
    // Domain repetition
    p = abs(fract(p) - 0.5);
    // Cylinder + planes SDF
    return abs(min(length(p.xy) - 0.175, min(p.x, p.y) + 1e-3)) + 1e-3;
}

vec3 estimateNormal(vec3 p) {
    float eps = 0.001;
    return normalize(vec3(
        map(p + vec3(eps, 0.0, 0.0)) - map(p - vec3(eps, 0.0, 0.0)),
        map(p + vec3(0.0, eps, 0.0)) - map(p - vec3(0.0, eps, 0.0)),
        map(p + vec3(0.0, 0.0, eps)) - map(p - vec3(0.0, 0.0, eps))
    ));
}

void main() {
    vec2 C = FC.xy;
    vec2 uv = (C - 0.5 * r) / r.y;

    float z = fract(dot(C, sin(C))) - 0.5;
    vec4 col = vec4(0.0);
    vec4 p;

    for(int i = 0; i < 77; i++) {
        float fi = float(i);
        
        // Ray direction
        p = vec4(z * normalize(vec3(C - 0.7 * r, r.y)), 0.1 * t);
        p.z += t;

        vec4 q = p;

        // Apply "bugged" rotation matrices for glitchy fractal distortion
        float c1 = cos(2.0 + q.z);
        float s1 = sin(2.0 + q.z);
        mat2 rot1 = mat2(c1, -s1, s1, c1);
        p.xy = rot1 * p.xy;
        
        float c2 = cos(q.x);
        float s2 = sin(q.x);
        mat2 rot2 = mat2(c2, -s2, s2, c2);
        p.xy = rot2 * p.xy;

        // Distance estimation
        float d = map(p.xyz);

        // Estimate lighting
        vec3 pos = p.xyz;
        vec3 lightDir = normalize(vec3(0.3, 0.5, 1.0));
        vec3 viewDir = normalize(vec3(uv, 1.0));
        vec3 n = estimateNormal(pos);
        vec3 reflectDir = reflect(viewDir, n);

        // Fake environment reflection (sky blue + fade to white)
        vec3 envColor = mix(vec3(0.8, 0.4, 0.8), vec3(1.0), 0.5 + 0.5 * reflectDir.y);

        // Specular highlight
        float spec = pow(max(dot(reflectDir, lightDir), 0.0), 32.0);

        // Funky palette color using original method
        vec4 baseColor = (1.0 + sin(0.5 * q.z + length(p.xyz - q.xyz) + vec4(0,4,3,6)))
                       / (0.5 + 2.0 * dot(q.xy, q.xy));

        // Combine base color + environment reflection + specular highlight
        vec3 finalColor = baseColor.rgb * 0.1 + envColor * 0.9 + vec3(spec) * 1.2;

        // Brightness weighted accumulation
        col.rgb += finalColor / d;

        z += 0.6 * d;
    }

    // Compress brightness range using tanh approximation
    vec3 x = col.rgb / 2e4;
    vec3 exp_pos = exp(x);
    vec3 exp_neg = exp(-x);
    o = vec4((exp_pos - exp_neg) / (exp_pos + exp_neg), 1.0);
}`);