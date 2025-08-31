registerShadertoy('Fractal Ferns', `
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord.xy - iResolution * 0.5) / min(iResolution.x, iResolution.y);
    vec3 col = vec3(0.0);
    
    // Create multiple layers of fern-like patterns
    float scale = 2.0;
    vec2 p = uv * 8.0;  // Doubled from 4.0
    
    for(int i = 0; i < 5; i++) {
        // Transform coordinates for fractal effect
        p = abs(p) / dot(p, p) - vec2(0.9, 0.6);
        
        // Rotate and scale
        float a = iTime * 0.1 + float(i) * 0.5;
        p = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
        
        // Calculate distance field
        float d = length(p);
        
        // Create fern fronds using sine waves - doubled frequencies
        for(int j = 0; j < 3; j++) {
            float f = float(j + 1);
            d = min(d, abs(sin(p.x * f * 6.0 + iTime) * 0.3 / f + p.y));  // Doubled from 3.0
            d = min(d, abs(sin(p.y * f * 4.0 - iTime * 0.7) * 0.2 / f + p.x * 0.5));  // Doubled from 2.0
        }
        
        // Accumulate color with green tones
        col += vec3(0.0, 1.0, 0.3) * (0.01 / abs(d)) * (1.0 / float(i + 1));
        
        scale *= 1.5;
        p *= 1.2;
    }
    
    // Adjust final color
    col = pow(col * 0.5, vec3(0.8, 1.0, 0.9));
    col *= vec3(0.3, 1.0, 0.4); // Green tint
    
    // Add some glow
    col += vec3(0.0, 0.1, 0.0) * (1.0 - length(uv));
    
    fragColor = vec4(col, 1.0);
}`);