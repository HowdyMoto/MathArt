registerShadertoy('Plasma Flow', `
// Manual tanh implementation for WebGL 1.0
float tanh_s(float x) {
    // Very aggressive clamping to prevent any overflow
    float clamped = clamp(x, -3., 3.);
    float e2x = exp(2.0 * clamped);
    return (e2x - 1.0) / (e2x + 1.0);
}

vec2 stanh(vec2 x) {
    return vec2(tanh_s(x.x), tanh_s(x.y));
}

// Main shader - compact version by Nguyen2007
void mainImage( out vec4 o, vec2 u )
{
    vec2 v = iResolution.xy;
    u = .2*(u+u-v)/v.y;    
    
    vec4 z = vec4(1,2,3,0);
    o = z;
    
    float a = .5;
    float t = iTime;
    float i = 0.;
    
    for (int iter = 0; iter < 18; iter++) {
        i += 1.;
        t += 1.;
        
        // Safer division - clamp denominator away from zero
        float dotUU = dot(u,u);
        float divisor = .5 - dotUU;
        
        // Only compute if divisor is reasonable
        vec2 sinArg;
        if(abs(divisor) > 0.001) {
            sinArg = 1.5*u/divisor - 9.*u.yx + t;
        } else {
            sinArg = -9.*u.yx + t;
        }
        
        float denom = length((1.+i*dot(v,v)) * sin(sinArg));
        
        // Prevent division by zero
        if(denom > 0.001) {
            o += (1. + cos(z+t)) / denom;
        }
        
        a += .03;
        v = cos(t - 7.*u*pow(a, i)) - 5.*u;
        
        // Matrix multiplication
        u *= mat2(cos(i + .02*t - vec4(0,11,33,0)));
        
        // Use aggressive stanh clamping
        float dotU2 = dot(u,u);
        vec2 tanhArg = 40. * dotU2 * cos(1e2*u.yx + t);
        
        // Apply stanh with very conservative limits
        u += stanh(tanhArg) / 2e2
           + .2 * a * u
           + cos(4./exp(min(dot(o,o)/1e2, 10.)) + t) / 3e2;
    }
    
    // Final calculation with absolute safety
    o = clamp(o, 0.1, 100.);
    o = 25.6 / (min(o, 13.) + 164. / o) - dot(u, u) / 250.;
    
    // Final clamp to ensure no negative values
    o = max(o, 0.01);
}`);