// Test shader using native Shadertoy format
registerShadertoy('Shadertoy Test - Plasma', `
// Simple plasma effect to test Shadertoy compatibility
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized coordinates
    vec2 uv = fragCoord / iResolution.xy;
    
    // Create plasma effect
    float time = iTime * 0.5;
    
    // Multiple sine waves
    float wave1 = sin(uv.x * 10.0 + time);
    float wave2 = sin(uv.y * 10.0 + time);
    float wave3 = sin((uv.x + uv.y) * 10.0 + time);
    float wave4 = sin(length(uv - 0.5) * 20.0 - time);
    
    // Combine waves
    float plasma = (wave1 + wave2 + wave3 + wave4) * 0.25;
    
    // Create color from plasma
    vec3 col = vec3(
        sin(plasma * 3.14159 + time),
        sin(plasma * 3.14159 + time + 2.094),
        sin(plasma * 3.14159 + time + 4.188)
    ) * 0.5 + 0.5;
    
    // Output color
    fragColor = vec4(col, 1.0);
}`);