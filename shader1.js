registerShader('Psychedelic Fractal', `
void main() {
    // Initialize output color to black
    o = vec4(0.0, 0.0, 0.0, 1.0);
    
    // Initialize variables for the fractal calculation
    float i = 0.0, e = 0.0, R = 0.0, s;  // i=iterator, e=field value, R=radius, s=scale
    vec3 q, p, d = vec3(FC.xy/r.x*0.4+vec2(-0.2, 0.8), 1.0);  // d=ray direction based on screen coords
    
    q = vec3(0.0, -1.0, -1.0);  // Initial position in 3D space
    
    // Main fractal generation loop - 129 iterations for detail
    for(int j = 0; j < 129; j++) {
        i = float(j);
        if (i > 0.0) {
            // Accumulate color using HSV: hue based on radius/iteration, fixed saturation, brightness from field
            o.rgb += hsv(-R/i, 0.4, min(R*e*s-0.07, e)/7.0);
        }
        s = 1.0;
        q += d*e*R*0.24;  // Move position along ray direction
        p = q;
        R = length(p);    // Calculate distance from origin
        if (R > 0.0) {
            // Transform coordinates: cylindrical/spherical mapping with time animation
            p = vec3(log2(R)-t*0.5, exp(-p.z/R), atan(p.y, p.x));
        }
        p.y = p.y - 1.0;  // Offset y coordinate
        e = p.y;          // Use y as initial field value
        
        // Inner fractal detail loop - adds fine detail
        s = 1.0;
        for(int k = 0; k < 9; k++) {
            // Fractal function: combines sine/cosine with increasing frequency
            e += dot(sin(p.yzx*s-t), 0.2-cos(p.yxy*s))/s*0.2;
            s = s + s;  // Double the frequency each iteration (octaves)
        }
    }
}`);