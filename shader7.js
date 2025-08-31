registerShader('Fractal Tunnel', `
#define MAXDIST 50.0

// from netgrind
vec3 hue(vec3 color, float shift) {
    const vec3 kRGBToYPrime = vec3(0.299, 0.587, 0.114);
    const vec3 kRGBToI = vec3(0.596, -0.275, -0.321);
    const vec3 kRGBToQ = vec3(0.212, -0.523, 0.311);

    const vec3 kYIQToR = vec3(1.0, 0.956, 0.621);
    const vec3 kYIQToG = vec3(1.0, -0.272, -0.647);
    const vec3 kYIQToB = vec3(1.0, -1.107, 1.704);

    // Convert to YIQ
    float YPrime = dot(color, kRGBToYPrime);
    float I = dot(color, kRGBToI);
    float Q = dot(color, kRGBToQ);

    // Calculate the hue and chroma
    float hue_angle = atan(Q, I);
    float chroma = sqrt(I * I + Q * Q);

    // Make the user's adjustments
    hue_angle += shift;

    // Convert back to YIQ
    Q = chroma * sin(hue_angle);
    I = chroma * cos(hue_angle);

    // Convert back to RGB
    vec3 yIQ = vec3(YPrime, I, Q);
    color.r = dot(yIQ, kYIQToR);
    color.g = dot(yIQ, kYIQToG);
    color.b = dot(yIQ, kYIQToB);

    return color;
}

// by iq
float opU(float d1, float d2) {
    return min(d1, d2);
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float length6(vec3 p) {
    p = p * p * p;
    p = p * p;
    return pow(p.x + p.y + p.z, 1.0 / 6.0);
}

// from hg_sdf
float fPlane(vec3 p, vec3 n, float distanceFromOrigin) {
    return dot(p, n) + distanceFromOrigin;
}

void pR(inout vec2 p, float a) {
    p = cos(a) * p + sin(a) * vec2(p.y, -p.x);
}

// Main fractal function
float fractal(vec3 p) {
    const int iterations = 20;
    
    float d = t * 5.0 - p.z;
    p = p.yxz;
    pR(p.yz, 1.570795);
    p.x += 6.5;

    p.yz = mod(abs(p.yz) - 0.0, 20.0) - 10.0;
    float scale = 1.25;
    
    p.xy /= (1.0 + d * d * 0.0005);
    
    float l = 0.0;
    
    for(int i = 0; i < iterations; i++) {
        p.xy = abs(p.xy);
        p = p * scale + vec3(-3.0 + d * 0.0095, -1.5, -0.5);
        
        pR(p.xy, 0.35 - d * 0.015);
        pR(p.yz, 0.5 + d * 0.02);
        
        l = length6(p);
    }
    return l * pow(scale, -float(iterations)) - 0.15;
}

vec2 map(vec3 pos) {
    float dist = 10.0;
    dist = opU(dist, fractal(pos));
    dist = smin(dist, fPlane(pos, vec3(0.0, 1.0, 0.0), 10.0), 4.6);
    return vec2(dist, 0.0);
}

vec3 vmarch(vec3 ro, vec3 rd, float dist) {
    vec3 p = ro;
    vec2 r = vec2(0.0);
    vec3 sum = vec3(0.0);
    vec3 c = hue(vec3(0.0, 0.0, 1.0), 2.5);  // Adjusted hue shift for green
    
    for(int i = 0; i < 20; i++) {
        r = map(p);
        if(r.x > 0.01) break;
        p += rd * 0.015;
        vec3 col = c;
        col.rgb *= smoothstep(0.0, 0.15, -r.x);
        sum += abs(col) * 0.5;
    }
    return vec3(1.0) - sum;  // Invert colors here for correct appearance
}

vec2 march(vec3 ro, vec3 rd) {
    const int steps = 50;
    const float prec = 0.001;
    vec2 res = vec2(0.0);
    
    for(int i = 0; i < steps; i++) {
        vec2 s = map(ro + rd * res.x);
        
        if(res.x > MAXDIST || s.x < prec) {
            break;
        }
        
        res.x += s.x;
        res.y = s.y;
    }
   
    return res;
}

vec3 calcNormal(vec3 pos) {
    const vec3 eps = vec3(0.005, 0.0, 0.0);
    
    return normalize(
        vec3(map(pos + eps).x - map(pos - eps).x,
             map(pos + eps.yxz).x - map(pos - eps.yxz).x,
             map(pos + eps.yzx).x - map(pos - eps.yzx).x)
    );
}

vec4 render(vec3 ro, vec3 rd) {
    vec3 col = vec3(0.0);
    vec2 res = march(ro, rd);
   
    if(res.x > MAXDIST) {
        return vec4(vec3(1.0), 1.0);  // Return white for background
    }
    
    vec3 pos = ro + res.x * rd;
    col = vmarch(pos, rd, res.x);
    
    col = mix(col, vec3(1.0), clamp(res.x / 50.0, 0.0, 1.0));  // Fade to white in distance
    return vec4(col, res.x);
}

mat3 camera(vec3 ro, vec3 rd, float rot) {
    vec3 forward = normalize(rd - ro);
    vec3 worldUp = vec3(sin(rot), cos(rot), 0.0);
    vec3 x = normalize(cross(forward, worldUp));
    vec3 y = normalize(cross(x, forward));
    return mat3(x, y, forward);
}

void main() {
    vec2 uv = FC.xy / r;
    uv = uv * 2.0 - 1.0;
    uv.x *= r.x / r.y;
    uv.y -= uv.x * uv.x * 0.15;
    
    vec3 camPos = vec3(3.0, -1.5, t * 5.0);
    vec3 camDir = camPos + vec3(-1.25, 0.1, 1.0);
    mat3 cam = camera(camPos, camDir, 0.0);
    vec3 rayDir = cam * normalize(vec3(uv, 0.8));
    
    vec4 col = render(camPos, rayDir);
    
    o = vec4(col.xyz, 1.0);
}`);