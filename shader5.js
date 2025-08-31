registerShadertoy('Compact Fractal Art', `
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Initialize output
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    
    // Ultra-compact fractal shader - adapted for WebGL
    vec3 c, p;
    float i = 0.0, z = 0.0, f = 0.0;
    
    // Main fractal loop
    for(int loop = 0; loop < 40; loop++) {
        i = float(loop) + 1.0;
        
        // Initialize ray from screen coordinates
        c = z * normalize(vec3(fragCoord.xy * 2.0 - iResolution.xy, iResolution.y));
        p = c;
        p.z -= iTime;
        c = p;
        
        // Inner detail loop
        for(int detail = 0; detail < 5; detail++) {
            f = float(detail) + 0.3;
            p += cos(p.yzx * f + i / 0.4) / f;
        }
        
        // Mix and update
        p = mix(c, p, 0.3);
        f = 0.2 * abs(dot(cos(p), sin(p.yzx / 0.6)) + abs(p.y) - 3.0);
        z += f;
        
        // Color accumulation - balanced vibrancy
        vec4 color_contrib = (cos(z + vec4(6.0, 1.0, 2.0, 0.0)) + 2.0) / max(f, 0.005) / max(z, 0.005);
        fragColor += color_contrib * 1.2;  // Moderate contribution
    }
    
    // Balanced tone mapping for vibrant but not overwhelming colors
    vec4 scaled = fragColor / 400.0;  // Middle ground divisor
    vec4 exp_pos = exp(scaled);
    vec4 exp_neg = exp(-scaled);
    fragColor = (exp_pos - exp_neg) / (exp_pos + exp_neg);
    
    // Subtle enhancement
    fragColor.rgb = pow(fragColor.rgb, vec3(0.85));  // Gentle gamma correction
    fragColor = clamp(fragColor, 0.0, 1.0);
}`);