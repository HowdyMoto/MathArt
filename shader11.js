registerShadertoy('Volumetric Terrain', `
// Simplified single-pass version of IQ's volumetric terrain
// Based on sphere SDF technique from https://iquilezles.org/articles/fbmsdf

// Smooth minimum for blending
float smin(float a, float b, float k) {
    float h = max(k-abs(a-b),0.0);
    return min(a, b) - h*h*0.25/k;
}

float smax(float a, float b, float k) {
    float h = max(k-abs(a-b),0.0);
    return max(a, b) + h*h*0.25/k;
}

// Simple hash for randomness
float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.11,0.17,0.13));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

// Sphere at grid vertex
float sph(vec3 i, vec3 f, vec3 c) {
    vec3 p = i + c;
    float w = hash(p);
    float r = 0.7 * w * w;
    return length(f - c) - r;
}

// Base SDF made of spheres
float sdBase(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    return min(min(min(sph(i,f,vec3(0,0,0)),
                       sph(i,f,vec3(0,0,1))),
                   min(sph(i,f,vec3(0,1,0)),
                       sph(i,f,vec3(0,1,1)))),
               min(min(sph(i,f,vec3(1,0,0)),
                       sph(i,f,vec3(1,0,1))),
                   min(sph(i,f,vec3(1,1,0)),
                       sph(i,f,vec3(1,1,1)))));
}

// Fractal terrain using fbm of spheres
vec2 sdFbm(vec3 p, float th, float d) {
    const mat3 m = mat3(0.00,  1.60,  1.20,
                       -1.60,  0.72, -0.96,
                       -1.20, -0.96,  1.28);
    vec3 q = p;
    float t = 0.0;
    float s = 1.0;
    
    for(int i = 0; i < 8; i++) {
        if(d > s*0.866) break;
        if(s < th) break;
        
        float n = s * sdBase(q);
        n = smax(n, d - 0.1*s, 0.3*s);
        d = smin(n, d, 0.3*s);
        q = m * q;
        s = 0.415 * s;
        
        t += d;
        q.z += -4.33 * t * s;
    }
    return vec2(d, t);
}

// Simplified noise function
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(vec3(i, 0.0));
    float b = hash(vec3(i + vec2(1.0, 0.0), 0.0));
    float c = hash(vec3(i + vec2(0.0, 1.0), 0.0));
    float d = hash(vec3(i + vec2(1.0, 1.0), 0.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Simple fbm for clouds/textures
float fbm(vec2 p) {
    float f = 0.0;
    float s = 0.5;
    for(int i = 0; i < 5; i++) {
        f += s * noise(p);
        p *= 2.01;
        s *= 0.55;
    }
    return f;
}

// Terrain map
vec2 map(vec3 p, float dis) {
    float d = length(p - vec3(0.0, -250.0, 0.0)) - 250.0;
    vec2 dt = sdFbm(p, dis * 0.0005, d);
    
    // Simple water plane
    float water = p.y - 0.03;
    water = max(water, length(p.xz) - 5.0);
    if(water < dt.x) {
        dt.y = -abs(water - dt.x + 0.00001);
        dt.x = water;
    }
    
    return dt;
}

// Raymarching
vec3 raycast(vec3 ro, vec3 rd) {
    float tmin = 0.0;
    float tmax = 15.0;
    
    // Bounding plane
    float tp = (0.25 - ro.y) / rd.y;
    if(tp > 0.0) {
        if(ro.y < 0.25) tmax = min(tmax, tp);
        else tmin = max(tmin, tp);
    }
    
    float t = tmin;
    vec2 h = vec2(0.0);
    
    for(int i = 0; i < 256; i++) {
        vec3 pos = ro + t * rd;
        h = map(pos, t);
        if(abs(h.x) < (0.0005 * t) || t > tmax) break;
        t += h.x * 1.5;
    }
    
    return (t < tmax) ? vec3(t, abs(h.y), (h.y < 0.0) ? 2.0 : 1.0) : vec3(-1.0);
}

// Normal calculation
vec3 calcNormal(vec3 pos, float t) {
    vec2 e = vec2(1.0, -1.0) * 0.5773 * 0.0005 * t;
    return normalize(e.xyy * map(pos + e.xyy, t).x + 
                     e.yyx * map(pos + e.yyx, t).x + 
                     e.yxy * map(pos + e.yxy, t).x + 
                     e.xxx * map(pos + e.xxx, t).x);
}

// Simple soft shadow
float calcSoftShadow(vec3 ro, vec3 rd, float tmin, float tmax) {
    float res = 1.0;
    float t = tmin;
    
    for(int i = 0; i < 64; i++) {
        float h = map(ro + t * rd, t * 50.0).x;
        res = min(res, 8.0 * h / t);
        t += clamp(h, 0.005, 0.1);
        if(res < 0.001 || t > tmax) break;
    }
    
    return clamp(res, 0.0, 1.0);
}

// Camera setup
mat3 setCamera(vec3 ro, vec3 ta, float cr) {
    vec3 cw = normalize(ta - ro);
    vec3 cp = vec3(sin(cr), cos(cr), 0.0);
    vec3 cu = normalize(cross(cw, cp));
    vec3 cv = normalize(cross(cu, cw));
    return mat3(cu, cv, cw);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = (2.0 * fragCoord.xy - iResolution.xy) / iResolution.y;
    
    // Animated camera
    float time = iTime * 0.5;
    vec3 ro = vec3(2.0 * cos(time * 0.3), 0.2, 2.0 * sin(time * 0.3));
    vec3 ta = vec3(0.0, -0.1, 0.0);
    
    mat3 ca = setCamera(ro, ta, 0.0);
    vec3 rd = ca * normalize(vec3(p.xy, 2.0));
    
    // Sky gradient
    vec3 col = vec3(0.32, 0.34, 0.4) * (1.0 - 0.3 * rd.y);
    
    // Simple clouds
    float cloudHeight = 10.0;
    float tc = (cloudHeight - ro.y) / rd.y;
    if(tc > 0.0 && rd.y > 0.0) {
        vec2 cloudPos = (ro + rd * tc).xz;
        float clouds = fbm(cloudPos * 0.05);
        clouds = smoothstep(0.4, 0.8, clouds);
        col = mix(col, vec3(0.8, 0.85, 0.95), clouds * 0.5);
    }
    
    // Terrain
    vec3 tom = raycast(ro, rd);
    float t = tom.x;
    
    if(t > 0.0) {
        vec3 pos = ro + t * rd;
        vec3 nor = calcNormal(pos, t);
        
        // Ensure normal faces camera
        if(dot(nor, rd) > 0.0) nor = -nor;
        
        vec3 lig = normalize(vec3(-0.5, 0.4, -0.7));
        float occ = 0.3 + 0.7 * smoothstep(0.0, 0.1, tom.y);
        
        vec3 mate;
        float ks;
        
        // Material based on terrain type
        if(tom.z < 1.5) {
            // Terrain
            vec3 soil = vec3(0.12, 0.08, 0.04);
            float tex = noise(pos.xz * 2.0);
            soil *= 0.8 + 0.4 * tex;
            
            // Add grass on flat areas
            float grass = smoothstep(0.85, 0.95, nor.y) * smoothstep(0.0, 0.01, pos.y - 0.03);
            mate = mix(soil, vec3(0.06, 0.08, 0.02), grass);
            ks = 0.1;
        } else {
            // Water
            mate = vec3(0.02, 0.04, 0.06);
            ks = 0.8;
            
            // Simple wave normal perturbation
            nor.xz += 0.1 * sin(pos.xz * 10.0 + iTime * 2.0) * vec2(1.0, 0.7);
            nor = normalize(nor);
        }
        
        // Lighting
        col = vec3(0.0);
        
        // Fresnel
        float fre = clamp(1.0 + dot(nor, rd), 0.0, 1.0);
        
        // Sky light - much brighter like original
        float sky = clamp(0.5 + 0.5 * nor.y, 0.0, 1.0);
        float skyShad = 0.75 + 0.25 * calcSoftShadow(pos + nor * 0.001, vec3(0, 1, 0), 0.001, 1.0);
        col += mate * vec3(0.8, 0.9, 1.0) * sky * occ * skyShad * 0.1;
        
        // Sky reflection/specular contribution
        vec3 ref = reflect(rd, nor);
        float skySpec = smoothstep(-0.15, -0.1, ref.y) * (0.04 + 0.96 * pow(fre, 5.0));
        col += vec3(0.8, 0.9, 1.0) * skySpec * ks * occ * 0.2;
        
        // Sun light - stronger like original
        float sun = clamp(dot(lig, nor), 0.0, 1.0);
        if(sun > 0.0) {
            sun *= calcSoftShadow(pos + nor * 0.001, lig, 0.001, 2.0);
        }
        col += mate * sun * vec3(1.2, 1.1, 0.7);
        
        // Sun specular/half vector
        vec3 hal = normalize(lig - rd);
        float sunSpec = pow(clamp(dot(nor, hal), 0.0, 1.0), 4.0);
        sunSpec *= sun * (0.04 + 0.96 * pow(clamp(1.0 - dot(hal, lig), 0.0, 1.0), 5.0));
        col += vec3(1.0) * sunSpec * ks;
        
        // Additional water effects
        if(tom.z > 1.5) {
            // Enhanced water specular
            float spec = pow(clamp(dot(ref, lig), 0.0, 1.0), 600.0 / sqrt(t));
            col += vec3(1.0, 0.95, 0.9) * spec;
            
            // Water depth coloring
            col += vec3(0.0, 0.1, 0.12) * exp(-1024.0 * tom.y) * 0.1;
        }
        
        // Multiply by 5 like original for proper exposure
        col *= 5.0;
        
        // Fog with proper density
        vec3 fogCol = vec3(0.32, 0.34, 0.4) * 0.5;
        float fogFac = exp(-1.1 * t * 0.08);
        col = col * fogFac + (1.0 - fogFac) * fogCol * vec3(0.8, 1.0, 1.4) * 0.11;
    }
    
    // Post processing
    col = pow(col, vec3(0.4545));
    col = col * col * (3.0 - 2.0 * col);
    
    // Vignette
    vec2 q = fragCoord.xy / iResolution.xy;
    col *= 0.5 + 0.5 * pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.1);
    
    fragColor = vec4(col, 1.0);
}`);