registerShader('Cosmic Tunnel', `
void main() {
    // Initialize output color
    o = vec4(0.0, 0.0, 0.0, 1.0);
    
    // Initialize variables for tunnel effect
    float i = 0.0, e = 0.0, R = 0.0, s;
    // Create ray direction with animated scaling - negative y creates tunnel effect
    vec3 q, p, d = vec3((FC.xy - r.xy * 0.5) / r.y, 1.0);
    
    q = vec3(0.0, 0.0, t);  // Starting position with time-based movement
    
    // Main tunnel generation loop - use int for loop counter
    for(int loop = 0; loop < 64; loop++) {
        i = float(loop);
        
        // Move through tunnel
        q += d * 0.1;
        p = q;
        
        // Create tunnel walls using cylindrical coordinates
        float radius = length(p.xy);
        float angle = atan(p.y, p.x + 0.001);  // Add small offset to prevent discontinuity
        
        // Tunnel function - creates the tunnel walls
        float tunnel_dist = abs(radius - 0.5 - 0.2 * sin(p.z * 2.0 + t * 3.0));
        tunnel_dist = min(tunnel_dist, abs(radius - 0.8 - 0.1 * cos(p.z * 3.0 + angle * 4.0)));
        
        // Create field value based on tunnel distance
        e = 1.0 / (tunnel_dist * 20.0 + 0.1);
        
        // Add vibrant colors based on position and time
        float hue = mod(p.z * 0.1 + angle * 0.15915 + t * 0.5, 1.0);  // 0.15915 = 1/(2*PI) for smooth transitions
        vec3 tunnel_color = hsv(hue, 0.8, e * 0.3);
        
        // Add glowing effect
        if(tunnel_dist < 0.1) {
            tunnel_color += vec3(0.5, 0.3, 1.0) * (0.1 - tunnel_dist) * 10.0;
        }
        
        o.rgb += tunnel_color * 0.08;
        
        // Break if we've accumulated enough color
        if(length(o.rgb) > 2.0) break;
    }
    
    // Add some cosmic sparkle effects (reduced intensity)
    vec2 sparkle_pos = FC.xy / r.xy;
    float sparkle = sin(sparkle_pos.x * 30.0 + t * 5.0) * sin(sparkle_pos.y * 30.0 + t * 4.0);
    if(sparkle > 0.995) {
        o.rgb += vec3(1.0, 1.0, 0.8) * (sparkle - 0.995) * 5.0;
    }
}`);