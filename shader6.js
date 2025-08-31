registerShader('Wave Tunnel', `
void main() {
    vec2 uv = (FC.xy - r * 0.5) / r.y;
    vec3 col = vec3(0.0);
    
    // Create tunnel perspective
    float z = t * 2.0;
    vec2 p = uv;
    float tunnel = 1.0 / (length(p) + 0.1);
    
    // Create flowing waves
    for(int i = 0; i < 5; i++) {
        float fi = float(i);
        
        // Wave parameters
        float wave1 = sin(p.x * 10.0 + z + fi) * 0.1;
        float wave2 = cos(p.y * 8.0 - z * 1.5 + fi * 0.5) * 0.1;
        float wave3 = sin(length(p) * 15.0 - z * 2.0) * 0.05;
        
        // Combine waves
        float waves = wave1 + wave2 + wave3;
        
        // Create ring patterns
        float rings = sin(tunnel * 20.0 - z * 3.0 + waves * 10.0);
        rings = pow(abs(rings), 0.3);
        
        // Add to color with purple/pink gradient
        vec3 color1 = vec3(0.6, 0.2, 0.8); // Purple
        vec3 color2 = vec3(1.0, 0.4, 0.6); // Pink
        vec3 color3 = vec3(0.8, 0.6, 1.0); // Light purple
        
        vec3 waveColor = mix(color1, color2, sin(waves * 5.0 + z) * 0.5 + 0.5);
        waveColor = mix(waveColor, color3, rings);
        
        col += waveColor * rings * tunnel * 0.2 / (fi + 1.0);
        
        // Transform for next iteration
        p = p * 1.2 + vec2(sin(z * 0.2), cos(z * 0.3)) * 0.1;
    }
    
    // Add glow effect
    col += vec3(0.2, 0.1, 0.3) * tunnel * 0.5;
    
    // Fade edges
    col *= 1.0 - length(uv) * 0.3;
    
    // Brightness and contrast
    col = pow(col * 1.5, vec3(0.8));
    
    o = vec4(col, 1.0);
}`);