// Nebula 3 by @XorDev
registerShadertoy('Nebula 3', `
/*
    "Nebula 3" by @XorDev
    
    Based on my tweet shader:
    https://x.com/XorDev/status/1918766627828515190
*/

// Manual tanh implementation for WebGL 1 compatibility
vec4 tanh(vec4 x) {
    vec4 e2x = exp(2.0 * x);
    return (e2x - 1.0) / (e2x + 1.0);
}

void mainImage(out vec4 O, vec2 I)
{
    float t = iTime;
    float i = 0.0;
    float z = 0.0;
    float d = 0.0;
    float s = 0.0;
    
    O *= i; // Initialize O to zero
    
    for(int j = 0; j < 100; j++)
    {
        if(i >= 100.0) break;
        i += 1.0;
        
        vec3 p = z * normalize(vec3(I+I,0) - iResolution.xyy);
        p.z -= t;
        
        d = 1.0;
        for(int k = 0; k < 6; k++) {
            p += .7 * cos(p.yzx*d) / d;
            d += d;
            if(d >= 64.0) break;
        }
            
        p.xy *= mat2(cos(z*.2 + vec4(0,11,33,0)));
        z += d = .03+.1*max(s=3.-abs(p.x), -s*.2);
        
        O += (cos(s+s-vec4(5,0,1,3))+1.4)/d/z;
    }
    O = tanh(O*O/4e5);
}
`);