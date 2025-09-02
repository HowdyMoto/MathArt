registerShadertoy('Accretion', `
/*
    "Accretion" by @XorDev
    
    I discovered an interesting refraction effect
    by adding the raymarch iterator to the turbulence!
    https://x.com/XorDev/status/1936884244128661986
*/

void mainImage(out vec4 O, vec2 I)
{
    //Raymarch depth
    float z = 0.0;
    //Step distance
    float d = 0.0;
    //Raymarch iterator
    float i = 0.0;
    //Clear fragColor and raymarch 20 steps
    O = vec4(0.0);
    for(int iter = 0; iter < 20; iter++)
    {
        i = float(iter);
        //Sample point (from ray direction)
        vec3 p = z*normalize(vec3(I+I,0)-iResolution.xyx)+.1;
        
        //Polar coordinates and additional transformations
        p = vec3(atan(p.y/.2,p.x)*2., p.z/3., length(p.xy)-5.-z*.2);
        
        //Apply turbulence and refraction effect
        for(int j = 0; j < 7; j++) {
            d = float(j + 1);
            p += sin(p.yzx*d+iTime+.3*i)/d;
        }
            
        //Distance to cylinder and waves with refraction
        z += d = length(vec4(.4*cos(p)-.4, p.z));
        
        //Coloring and brightness
        O += (1.+cos(p.x+i*.4+z+vec4(6,1,2,0)))/d;
    }
    //Tanh tonemap (manually implemented for WebGL 1.0)
    vec4 t = O*O/4e2;
    O = (exp(2.0*t) - 1.0) / (exp(2.0*t) + 1.0);
}`);