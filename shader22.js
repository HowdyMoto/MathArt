registerShadertoy('Random Subdivision Traversal', `
/*
    Random Subdivision Traversal
    ----------------------------    
    
    Random 2D subdivision with subsurface scattering and BRDF lighting.
    Based on various techniques from IQ, Poisson, Tater, and others.
*/

#define FAR 15.
#define PI 3.14159265358979
#define TAU 6.2831853

// Subsurface scattering calculation preferences.
// Faux light based: 0, Normal scattering: 1, Direction ray scattering: 2.
#define SUB 0

// Bore out holes in the blocks, or not.
#define DISPLAY_HOLES

// Soft reflections involve an extra pass, so can slow things down.
#define SOFT_RELECTIONS

// ===== COMMON BRDF FUNCTIONS =====

// Surface geometry function.
float GGX_Schlick(float nv, float rough) {
    float r = .5 + .5*rough; // Disney remapping.
    float k = (r*r)/2.;
    float denom = nv*(1. - k) + k;
    return max(nv, .001)/denom;
}

float G_Smith(float nr, float nl, float rough) {
    float g1_l = GGX_Schlick(nl, rough);
    float g1_v = GGX_Schlick(nr, rough);
    return g1_l*g1_v;
}

// Specular calculation.
vec3 getSpec(vec3 FS, float nh, float nr, float nl, float rough){
    // Microfacet distribution
    float alpha = pow(rough, 4.);
    float b = (nh*nh*(alpha - 1.) + 1.);
    float D = alpha/(3.14159265*b*b);    
    
    // Geometry self shadowing term.
    float G = G_Smith(nr, nl, rough);
    
    // Combining the terms above.
    return FS*D*G/(4.*max(nr, .001))*3.14159265;
}

vec3 getDiff(vec3 FS, float nl, float rough, float type){
    // Diffuse calculations.
    vec3 diff = nl*(1. - FS); // If not specular, use as diffuse
    return diff*(1. - type); // No diffuse for metals.
}

// ===== MAIN SHADER CODE =====

// Standard 2D rotation formula.
mat2 r2(in float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
 
float hash21(vec2 p) {
    p = fract(p*vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x*p.y);
}

// Hash without Sine -- Dave Hoskins
vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx)*vec3(.3031, .4030, .5973));
    p3 += dot(p3, p3.yzx + 42.1237);
    return fract((p3.xx+p3.yz)*p3.zy);
}

// Simple hash31 function for WebGL 1.0 compatibility
float hash31(vec3 p){
    p = fract(p * vec3(.1031, .11369, .13787));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
}

// Hash without Sine -- Dave Hoskins
vec3 hash33(vec3 p){
    p = fract(p*vec3(.5031, .6030, .4973));
    p += dot(p, p.yxz + 142.5453);
    return fract((p.xxy + p.yxx)*p.zyx);
}

// Commutative smooth maximum function.
float smax(float a, float b, float k){
    float f = max(0., 1. - abs(b - a)/k);
    return max(a, b) + k*.25*f*f;
}

// The path is a 2D sinusoid that varies over time.
vec2 path(in float z){ 
    // Straight line.
    return vec2(0); 
}

// Very basic transcental height function.
float hf(vec2 p){
    float x = 1.; // Simplified since path returns zero
    float h = dot(sin(p*2. - cos(p.yx*3.)*1.5), vec2(.25)) + .5;
    return clamp(h*x, 0., 1.);
}

// The SDF to a box.
float sBox(vec2 p, vec2 b, in float rf){
    vec2 d = abs(p) - b + rf;
    return min(max(d.x, d.y), 0.) + length(max(d, 0.))  - rf;
}

// IQ's extrusion formula.
float opExtrusion(in float sdf, in float pz, in float h, in float sf){
    vec2 w = vec2(sdf, abs(pz) - h) + sf;
    return min(max(w.x, w.y), 0.) + length(max(w, 0.)) - sf;
}

// Ray origin, ray direction, point on the line, normal. 
float rayLine(vec2 ro, vec2 rd, vec2 p, vec2 n){
    float dn = dot(rd, n);
    return dn>0.? dot(p - ro, n)/dn : 1e8;   
} 

// Object distance container.
vec4 vObj;

vec3 gRd; // Global ray direction.
vec3 gDir; // Global step direction.
float gCD; // Global cell wall distance.

// Storage for values used outside the raymarching function.
vec4 gVal;
vec3 gP;
vec3 gDim;

// The SDF for the bricks.
float map(vec3 p){

    float fl = p.y + 1.;
    
    // The brick size.
    vec2 sc = vec2(3)/1.;
    
    // XZ plane coordinates.
    vec2 offs = vec2(0);
    vec2 q = p.xz;
    // Cell ID.
    vec2 iq = floor(q/sc) + .5;
    // Shifing rows across by half.
    if(mod(iq.y - .5, 2.)==1.){ 
        q.x -= sc.x/2.;
        iq = floor(q/sc) + .5;
        offs.x += .5;
    }
    // Local cell coordinates.
    q -= iq*sc;
    iq += offs;
    
    // Subdividing each cell with a standard 2D random subdision routine.
    
    // Initial dimensions.
    vec2 dim = sc;
    
    // Set the minimum and maxium coordinates to the far left and right
    // sides of the square cell.
    vec2 left = -dim/2.;
    vec2 right = dim/2.;
    
    float mgn = .35; // Margin width.
    
    // Static ID.
    vec2 idd = vec2(0);
    // Each larger square cell is subdivided, so well use its random ID
    // to offset at a different place to give it a unique partitioning.
    vec2 rndOffs = hash22(iq + .07); 
   
    // Iteration number. Three for performance.
    const int iter = 3;
    for(int i = 0; i<iter; i++){
        
        // Random split.
        vec2 rndSplit = idd + (rndOffs + vec2(3, 5)/float(i + 1)*117.3);
        vec2 rnd2Ani = sin(TAU*rndSplit + iTime)*.5*(1. - mgn*2.) + .5;
  
        // The split line.
        vec2 split = mix(left, right, rnd2Ani);
        
        // Line step.
        vec2 ln2 = q - split;
        // Step left or right.
        vec2 stepLn = step(0., ln2);
       
        // If we step right, update the ID. Otherwise stay put.
        idd += mix(vec2(0), vec2(1), stepLn)/pow(2., float(i)); 
        
        // Update the left and right coordinates.
        left = mix(left, split, stepLn);
        right = mix(split, right, stepLn);
    }

    // The new dimensions.
    dim = right - left;
    
    // Split the difference for the center coordinates
    vec2 cntr = mix(left, right, .5);
    // Center the local coordinates.
    q -= cntr;
    
    // Update the position-based ID.
    iq += cntr/sc;
    
    // Random height for the block.
    float h = hf(iq*sc);
    h = h*1.4 + .1;
    
    // Edge width, or gap, in this case.
    float ew = .005;
    
    // Global 3D coordinates and dimension.
    gP = vec3(q.x, p.y - h/2. + .5, q.y);
    gDim = vec3(dim.x/2. - ew, h/2. + .5, dim.y/2. - ew);
    
    // The 2D base and extruded box.
    float d2 = sBox(gP.xz, gDim.xz, .03);
    float d =  opExtrusion(d2, gP.y, gDim.y + .025, .03);
    
    // Rounded tops to accentuate the lighting algorithm a bit.
    d = smax(d, length(gP - vec3(0, gDim.y - sc.x/2. + .025, 0)) - sc.x/2., .03);
    
    #ifdef DISPLAY_HOLES
    // Random box holes.
    vec3 bxRnd = hash33(vec3(idd.x, 13, idd.y) + .43);
    if(bxRnd.x<.5) d = smax(d, -sBox(gP.yz, gDim.yz - .12, .003), .03);
    if(bxRnd.y<.5){ 
        float dXZ = sBox(gP.xz, gDim.xz - .12, .003);
        d = smax(d, -dXZ, .03); 
        d2 = smax(d2, -dXZ, .03);
    }
    if(bxRnd.z<.5) d = smax(d, -sBox(gP.xy, gDim.xy - .12, .003), .03);
    #endif  
    
    // Saving the distance, ID and height for later use.
    gVal = vec4(d, idd, h);
    
    // Distance from the current point to the cell wall.
    vec2 rC = abs((gDir.xz*dim - q)/gRd.xz); // Ray to cube walls.
    gCD = min(rC.x, rC.y) + .0001;    
    
    // Store the object distances.
    vObj = vec4(d, fl, 0, 0);
    
    // Return the distance.
    return min(d, fl);
}

// Raymarch function.
float trace(vec3 ro, vec3 rd){

    gRd = rd; // Global ray direction.
    gDir = step(0., gRd) - .5; // Step direction.

    float t = 0.;
    
    const int maxSteps = 96;

    for(int i = 0; i < maxSteps; i++) {
        
        // Scene distance.
        float d = map(ro + rd*t);
        
        // Surface check.
        if(abs(d)<.001 || t>FAR) break;        
        
        // Limit the ray jump distance.
        t += min(d, gCD);
    }
    
    // Return the distance.
    return min(t, FAR);
}

// Cheap shadows.
float softShadow(vec3 ro, vec3 rd, vec3 n, float lDist, float k){

    // Initialize the shade and ray distance.
    float shade = 1.;
    float t = 0.; 
 
    // Coincides with the hit condition in the "trace" function.
    ro += n*.0015 + rd*hash31(ro + rd + n)*.005;

    gRd = rd; // Global ray direction.
    gDir = step(0., gRd) - .5; // Step direction.

    // Max shadow iterations
    for (int i = 0; i<48; i++){

        float d = map(ro + rd*t);
        shade = min(shade, k*d/t);
        
        // Early exit, if necessary.
        if (d<0. || t>lDist) break;       

        t += clamp(min(d, gCD), .005, .25); 
    }

    // Shadow.
    return max(shade, 0.); 
}

// Standard normal function.
vec3 nr(in vec3 p){
    
    // This mess is an attempt to speed up compiler time.
    float sgn = 1.;
    vec3 e = vec3(.001, 0, 0), mp = e.zzz;
    for(int i = 0; i<6; i++){
        mp.x += map(p + sgn*e)*sgn;
        sgn = -sgn;
        if(mod(float(i), 2.0)==1.0){ mp = mp.yzx; e = e.zxy; }
    }
    
    return normalize(mp);
}

// Ambient occlusion.
float cao(in vec3 p, in vec3 n){

    float sca = 2., occ = 0.;
    for( int i = 0; i<6; i++ ){
    
        float hr = .01 + float(i)*.25/6.;        
        float d = map(p + n*hr);
        occ += (hr - d)*sca;
        sca *= .7;
    }
    
    return clamp(1. - occ, 0., 1.);      
} 

// Subsurface scattering calculation.
#if SUB == 0
float subsurface(vec3 ro, vec3 rd, float ra) {
    
    const int sN = 10; // Sample number.
    float sss = 0.;
    
    // Randomly march out from the surface.
    for (int i = 0; i<sN; i++){
    
        // Random, but increasing, sample distance.
        float rnd = hash31(ro + float(i))*.1;
        float d = float(i)*ra*(1. + rnd); 
        // Accumulate weighted samples.
        sss += clamp(map(ro + rd*d)/d, 0., 1.);
    }
    
    sss /= float(sN); // Average the scattering value.
    
    // Giving the results more of a bell curve distribution.
    return smoothstep(0., 1., sss); 
}
#else
float subsurface(in vec3 p, in vec3 rd, float ra){
    
    float occ = 0.;
    float i0 = hash31(p + rd)*ra;
    for( int i = 0; i<16; i++){
    
        float h = i0 + float(i)*ra;
        vec3 dir = normalize(hash33(p + h + vec3(i)) - .5);
        dir *= sign(dot(dir, rd));
        occ += (h - map(p - h*dir));
    }
    
    return smoothstep(0., 1., 1. - occ/4.);     
}
#endif

// Hacky sky routine.
vec3 sky(vec3 rd, vec3 ld){ 
    
    // Sky color.
    vec3 col = mix(vec3(.45,.65, 1), vec3(0,.15, .5), clamp(rd.y*2., 0., 1.));
    
    // Horizon.
    vec3 hor = vec3(.65, .8, 1);
    col = mix(col, hor, 1. - smoothstep(0., .15, rd.y + .1));
     
    return col;    
}
 
void mainImage(out vec4 fr, vec2 fc) {

    // Screen coordinates.
    vec2 u = (fc - iResolution.xy/2.)/iResolution.y;
    
    // Screen warp.
    u /= max(.9 - dot(u, u)*.7, 1e-5);
     
    // Look, ray origin and light position.
    vec3 lk = vec3(0, .5, iTime);
    vec3 ro = lk + vec3(0, 1, -1.5); // Camera position
    vec3 lp = lk + vec3(1, 1, 1)*8.;

    // Using the Z-value to perturb the XY-plane.
    lk.xy += path(lk.z);
    ro.xy += path(ro.z);
    
    // More accurate field of view.
    float FOV = tan(radians(30.)/2.)*4.;
   
    // Camera.
    vec3 camDir = normalize(lk - ro); 
    vec3 worldUp = vec3(0, 1, 0);
    vec3 camRight = normalize(cross(worldUp, camDir));
    vec3 camUp = cross(camDir, camRight);
    vec3 rd = normalize(camRight*u.x + camUp*u.y + camDir/FOV);
     
    // Swiveling the camera about the XY-plane.
    rd.xy = r2(-path(lk.z).x/16.)*rd.xy; 
    
    // Rotating more for an interesting perspective.
    rd.xz *= r2(-TAU/8.);
    
    // Raymarch.
    float t = trace(ro, rd);
 
    // Distance, ID and object height.
    vec4 svVal = gVal;
    
    // Local object position and ID.
    vec3 svP = gP;
    vec3 svDim = gDim;
    
    // Object ID.
    int objID = vObj.x<vObj.y? 0 : 1;
    
    // Hit position.
    vec3 sp = ro + rd*t;
    
    // Light.
    vec3 ld = normalize(vec3(1, 1, 1));
    float lDist = FAR;
    
    // Sky.
    vec3 sky = sky(rd, ld);
    vec3 col = sky;
    
    vec3 sunCol = vec3(1, .8, .6)*2.;
    
    if(t<FAR) {
      
        // Surface normal.
        vec3 sn = nr(sp);
        
        // Shadow, soft reflective pass, and ambient occlusion.
        float sh = softShadow(sp, ld, sn, lDist, 8.);
        #ifdef SOFT_RELECTIONS
        float shR = softShadow(sp, reflect(rd, sn), sn, lDist, 16.);
        #endif
        float ao = cao(sp, sn)*(.5 + .5*sn.y);
        
        // Very rough, but cheap subsurface scattering.
        #if SUB == 0
        vec3 sRay = ld;
        #elif SUB == 1
        vec3 sRay = -sn;
        #else
        vec3 sRay = rd;
        #endif
        float sss = subsurface(sp - sn*.005, sRay, .05);
       
        // COLORING.
        // Object color.
        float rnd = hash21(svVal.yz + .23);
        // The orange side of the color wheel.
        vec3 oCol = .52 + .43*cos(TAU*(rnd)/4. + rnd*.1 + vec3(0, 1, 2)*1. + .7);
        
        if(objID==1) oCol = vec3(.05);
        
        // LIGHTING.
        float bou = .5 - .5*sn.y; // Bounce light.

        float bac = clamp(dot(sn, -normalize(vec3(ld.x, 0, ld.z))), 0., 1.);
        bac = (bac*.5 + .5)*bou; // Apply the back scatter.
   
        // Material properties.
        float fresRef = .7;  // Reflectivity.
        float type = 0.;     // Dielectric or metallic.
        float rough = .35;   // Roughness.

        // Standard BRDF dot product calculations.
        vec3 h = normalize(ld - rd); // Half vector.
        float ndl = dot(sn, ld);
        float nr = clamp(dot(sn, -rd), 0., 1.);
        float nl = clamp(ndl, 0., 1.);
        float nh = clamp(dot(sn, h), 0., 1.);
        float vh = clamp(dot(-rd, h), 0., 1.);  
 
        // Specular microfacet (Cook-Torrance) BRDF.
        vec3 f0 = vec3(.16*(fresRef*fresRef)); 
        // For metals, the base color is used for F0.
        f0 = mix(f0, oCol, type);
        vec3 FS = f0 + (1. - f0)*pow(1. - vh, 5.); // Fresnel-Schlick
        
        // BRDF style specular and diffuse calculations.
        vec3 spec = getSpec(FS, nh, nr, nl, rough);
        vec3 diff = getDiff(FS, nl, rough, type);
        
        // Applying lighting to the materials.
        vec3 lin = sunCol*diff*sh; // Sun diffuse.
        lin += sunCol*oCol*ao*bac; // Sun illumination.
      
        // Subsurface scattering.
        vec3 sssCol = vec3(.8, .25, .1);
        vec3 sss3 = sssCol*sss*(1. - diff*sh);
        lin += sunCol*sss3; // Sun SSS.
        
        lin += .35*sky*ao; // Sky diffuse.
             
        col = oCol*lin; // Scene color so far.
        
        #ifdef SOFT_RELECTIONS
        // Soft reflective lighting.
        if(objID==0){
            col += .2*sunCol*spec*shR; // Sun reflection.
            col += sky*shR*FS; // Sky reflection.       
        } 
        #endif
    }
     
    // Horizon fog.
    col = mix(col, sky, smoothstep(.4, 1., t/FAR));   
    
    // Extra sun scatter.
    col += sunCol*pow(clamp(dot(rd, ld),0.,1.), 8.)*.7;
  
    // Sigmoid tone mapping with exposure rolled in.
    col = atan(col*2.);
    
    // Rough gamma correction and screen presentation.
    fr = vec4(pow(max(col, 0.), vec3(1)/2.2), 1);
}
`);