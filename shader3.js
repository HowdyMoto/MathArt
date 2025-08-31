registerShader('Morphing Julia Sets', `
void main() {
    // Convert fragment coordinates to normalized coordinates centered at origin
    vec2 uv = (FC.xy - r.xy * 0.5) / min(r.x, r.y);
    
    // Create gentle zooming effect
    float zoom = 1.5 + 0.5 * sin(t * 0.2);
    // z starts at screen coordinates (Julia set - initial condition varies)
    vec2 z = uv * zoom;
    
    // Morphing Julia set parameters - smoothly animate between different sets
    float morph_speed = 0.3;
    
    // Create multiple Julia set parameters to morph between
    vec2 julia1 = vec2(-0.7269, 0.1889);   // Classic spiral Julia
    vec2 julia2 = vec2(-0.8, 0.156);       // Dendrite Julia
    vec2 julia3 = vec2(0.285, 0.01);       // Lightning Julia
    vec2 julia4 = vec2(-0.4, 0.6);         // Douady rabbit
    vec2 julia5 = vec2(-0.194, 0.6557);    // Airplane Julia
    vec2 julia6 = vec2(0.3, 0.5);          // Spiral arms
    
    // Smooth morphing between Julia sets using time
    float cycle = t * morph_speed;
    float phase = mod(cycle, 6.0);
    
    vec2 c;
    if(phase < 1.0) {
        c = mix(julia1, julia2, smoothstep(0.0, 1.0, phase));
    } else if(phase < 2.0) {
        c = mix(julia2, julia3, smoothstep(1.0, 2.0, phase));
    } else if(phase < 3.0) {
        c = mix(julia3, julia4, smoothstep(2.0, 3.0, phase));
    } else if(phase < 4.0) {
        c = mix(julia4, julia5, smoothstep(3.0, 4.0, phase));
    } else if(phase < 5.0) {
        c = mix(julia5, julia6, smoothstep(4.0, 5.0, phase));
    } else {
        c = mix(julia6, julia1, smoothstep(5.0, 6.0, phase));
    }
    
    // Add subtle parameter wobble for more organic morphing
    c += vec2(sin(t * 0.7) * 0.02, cos(t * 0.9) * 0.02);
    
    float iter = 0.0;    // Iteration counter
    
    // Julia set iteration: z = z² + c (c is constant, z varies)
    for(int i = 0; i < 128; i++) {
        if(dot(z, z) > 4.0) break;  // If |z| > 2, point escapes
        
        // Complex multiplication: (a+bi)² = (a²-b²) + (2ab)i
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        iter++;
    }
    
    // Smooth iteration count for better coloring
    float smooth_iter = iter - log2(log2(dot(z, z))) + 4.0;
    
    // Dynamic rainbow coloring that changes with the morphing
    vec3 color = vec3(0.0);
    if(iter < 128.0) {
        // Base hue cycles through the spectrum as sets morph
        float hue_base = cycle * 0.15 + smooth_iter / 25.0;
        
        // Add multiple color layers for rich, shifting colors
        float hue1 = mod(hue_base + t * 0.1, 1.0);
        float hue2 = mod(hue_base + t * 0.05 + 0.3, 1.0);
        
        // Create color mixing based on iteration patterns
        vec3 color1 = hsv(hue1, 0.8, 1.0);
        vec3 color2 = hsv(hue2, 0.6, 0.8);
        
        // Mix colors based on iteration speed and position
        float mix_factor = sin(smooth_iter * 0.3 + t) * 0.5 + 0.5;
        color = mix(color1, color2, mix_factor);
        
        // Add brightness modulation for more dynamic appearance
        float brightness_mod = 0.8 + 0.2 * sin(t * 2.0 + smooth_iter * 0.1);
        color *= brightness_mod;
    }
    // Points in the set stay black
    
    o = vec4(color, 1.0);
}`);