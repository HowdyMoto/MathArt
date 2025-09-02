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
        
        // Accumulate color with rainbow spectrum based on iteration
        vec3 fernColor;
        if(i == 0) fernColor = vec3(1.0, 0.2, 0.5);      // Magenta
        else if(i == 1) fernColor = vec3(0.2, 0.5, 1.0); // Cyan
        else if(i == 2) fernColor = vec3(1.0, 0.5, 0.2); // Orange
        else if(i == 3) fernColor = vec3(0.5, 1.0, 0.2); // Lime
        else fernColor = vec3(0.8, 0.2, 1.0);             // Purple
        
        // Add animated color shift
        fernColor = mix(fernColor, 
                       vec3(sin(iTime + float(i)), 
                            cos(iTime * 0.7 + float(i) * 2.0), 
                            sin(iTime * 0.5 - float(i))) * 0.5 + 0.5, 
                       0.3);
        
        col += fernColor * (0.015 / abs(d)) * (1.0 / float(i + 1));
        
        scale *= 1.5;
        p *= 1.2;
    }
    
    // Adjust final color with vibrant spectrum
    col = pow(col * 0.6, vec3(0.85));
    
    // Add iridescent shimmer
    float shimmer = sin(uv.x * 10.0 + iTime) * sin(uv.y * 10.0 - iTime * 0.7);
    col += vec3(0.1, 0.05, 0.15) * shimmer * 0.2;
    
    // Add colorful glow based on position
    vec3 glow = vec3(0.5 + 0.5 * sin(iTime), 
                     0.5 + 0.5 * cos(iTime * 1.3), 
                     0.5 + 0.5 * sin(iTime * 0.7));
    col += glow * 0.1 * (1.0 - length(uv));
    
    fragColor = vec4(col, 1.0);
}`);