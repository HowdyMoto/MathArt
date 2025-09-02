// Global variables to manage our WebGL shader gallery
const shaders = [];                // Array to store all shader objects
let currentShaderIndex = 0;        // Index of currently displayed shader
let gl, canvas;                    // WebGL context and canvas element
let currentProgram = null;         // Currently active shader program
let animationId = null;            // For requestAnimationFrame loop management
let startTime = Date.now();        // Track when current shader started for timing

// Function called by each shader file to register itself with the gallery
function registerShader(name, fragmentSource) {
    shaders.push({ name, fragmentSource });
}

// New function to register Shadertoy shaders directly
function registerShadertoy(name, fragmentSource) {
    // Shadertoy shaders are registered as-is, detection happens in loadShader
    shaders.push({ name, fragmentSource });
}

// Simple vertex shader that creates a full-screen quad
// This is the same for all our fragment shaders - it just positions vertices
const vertexShaderSource = `
attribute vec2 a_position;  // Vertex position attribute
void main() {
    // Transform 2D position to 4D clip space coordinates
    // The fragment shader will do all the interesting work
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

// Creates and compiles a shader (vertex or fragment)
function createShader(gl, type, source) {
    const shader = gl.createShader(type);   // Create shader object
    gl.shaderSource(shader, source);        // Set the source code
    gl.compileShader(shader);               // Compile the shader
    
    // Check for compilation errors
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        console.error('Shader compilation error:', error);
        
        // Display error on screen
        const errorDiv = document.getElementById('shaderError');
        if (errorDiv) {
            errorDiv.textContent = 'Shader Error: ' + error;
            errorDiv.style.display = 'block';
        }
        
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// Links vertex and fragment shaders into a complete GPU program
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();        // Create program object
    gl.attachShader(program, vertexShader);    // Attach vertex shader
    gl.attachShader(program, fragmentShader);  // Attach fragment shader
    gl.linkProgram(program);                   // Link them together
    
    // Check for linking errors
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

// Global variables for UI visibility management
let uiTimeout = null;
let lastMouseMove = Date.now();

// Function to show UI elements
function showUI() {
    const controls = document.getElementById('controls');
    const instructions = document.getElementById('instructions');
    
    if (controls) {
        controls.style.opacity = '1';
    }
    
    if (instructions) {
        instructions.style.opacity = '1';
    }
    
    // Clear existing timeout
    if (uiTimeout) {
        clearTimeout(uiTimeout);
    }
    
    // Hide after 3 seconds
    uiTimeout = setTimeout(() => {
        if (controls) {
            controls.style.opacity = '0';
        }
        if (instructions) {
            instructions.style.opacity = '0';
        }
    }, 3000);
}

// Loads and compiles a shader by index from our shaders array
function loadShader(index) {
    if (index < 0 || index >= shaders.length) return;
    
    const shader = shaders[index];
    // Update the UI with shader info
    document.getElementById('shaderName').textContent = shader.name;
    document.getElementById('shaderInfo').textContent = `${index + 1} / ${shaders.length}`;
    
    // Show UI when loading a new shader
    showUI();
    
    // Check if this is a Shadertoy-format shader
    const isShadertoy = shader.fragmentSource.includes('mainImage');
    
    let fragmentShaderSource;
    
    if (isShadertoy) {
        // Wrap Shadertoy code with compatibility layer
        fragmentShaderSource = `
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform vec4 iMouse;
uniform int iFrame;

// Compatibility mappings for our old format
uniform float t;
uniform vec2 r;
#define FC gl_FragCoord
#define o fragColor

${shader.fragmentSource}

void main() {
    vec4 fragColor;
    mainImage(fragColor, gl_FragCoord.xy);
    gl_FragColor = fragColor;
}`;
    } else {
        // Use old format for backward compatibility
        fragmentShaderSource = `
precision highp float;           // Use high precision for better quality
uniform float t;                 // Time uniform (passed from JavaScript)
uniform vec2 r;                  // Resolution uniform (screen width/height)
#define FC gl_FragCoord          // Shorthand for fragment coordinates
#define o gl_FragColor           // Shorthand for output color

// HSV to RGB color conversion function
// h = hue (0-1), s = saturation (0-1), v = value/brightness (0-1)
vec3 hsv(float h, float s, float v) {
    vec3 c = vec3(h, s, v);
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return v * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), s);
}

${shader.fragmentSource}`;       // Insert the actual shader code here
    }

    // Create vertex and fragment shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    // Check if shader creation was successful
    if (!vertexShader || !fragmentShader) {
        console.error('Failed to create shaders for:', shader.name);
        return;
    }
    
    // Create the complete shader program
    const newProgram = createProgram(gl, vertexShader, fragmentShader);
    
    if (!newProgram) {
        console.error('Failed to create program for:', shader.name);
        return;
    }
    
    // Clean up the old program to prevent memory leaks
    if (currentProgram) {
        gl.deleteProgram(currentProgram);
    }
    
    currentProgram = newProgram;
    startTime = Date.now();  // Reset timer for this shader
    
    // Hide any error messages on successful load
    const errorDiv = document.getElementById('shaderError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Main render loop - called every frame to draw the shader
function render() {
    // Safety check - don't render if no shader program is loaded
    if (!currentProgram) {
        requestAnimationFrame(render);
        return;
    }
    
    // Calculate elapsed time since shader started
    const currentTime = Date.now();
    const elapsedTime = (currentTime - startTime) / 1000;
    
    // Set canvas size to match window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);  // Set WebGL viewport
    
    // Clear the canvas to black
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Use our shader program for rendering
    gl.useProgram(currentProgram);
    
    // Pass both old-style and Shadertoy uniforms for compatibility
    // Old style uniforms
    const timeUniformLocation = gl.getUniformLocation(currentProgram, 't');
    const resolutionUniformLocation = gl.getUniformLocation(currentProgram, 'r');
    if (timeUniformLocation) gl.uniform1f(timeUniformLocation, elapsedTime);
    if (resolutionUniformLocation) gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
    
    // Shadertoy uniforms
    const iTimeLocation = gl.getUniformLocation(currentProgram, 'iTime');
    const iResolutionLocation = gl.getUniformLocation(currentProgram, 'iResolution');
    const iMouseLocation = gl.getUniformLocation(currentProgram, 'iMouse');
    const iFrameLocation = gl.getUniformLocation(currentProgram, 'iFrame');
    
    if (iTimeLocation) gl.uniform1f(iTimeLocation, elapsedTime);
    if (iResolutionLocation) gl.uniform2f(iResolutionLocation, canvas.width, canvas.height);
    if (iMouseLocation) gl.uniform4f(iMouseLocation, 0, 0, 0, 0); // Mouse not implemented yet
    if (iFrameLocation) gl.uniform1i(iFrameLocation, Math.floor(elapsedTime * 60));
    
    // Set up vertex data for a full-screen quad
    const positionAttributeLocation = gl.getAttribLocation(currentProgram, 'a_position');
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    // Define a quad that covers the entire screen (-1 to 1 in both x and y)
    const positions = [
        -1, -1,  // Bottom-left
         1, -1,  // Bottom-right
        -1,  1,  // Top-left
         1,  1,  // Top-right
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    // Tell WebGL how to read the position data
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Draw the quad as a triangle strip (4 vertices forming 2 triangles)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // Schedule the next frame
    animationId = requestAnimationFrame(render);
}

// Navigation functions for switching between shaders
function nextShader() {
    currentShaderIndex = (currentShaderIndex + 1) % shaders.length;
    loadShader(currentShaderIndex);
}

function previousShader() {
    currentShaderIndex = (currentShaderIndex - 1 + shaders.length) % shaders.length;
    loadShader(currentShaderIndex);
}

// Initialize the WebGL application
function init() {
    canvas = document.getElementById('glCanvas');
    // Try to get WebGL context (with fallback for older browsers)
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
        alert('WebGL not supported');
        return;
    }
    
    // Detect if device is mobile/touch-enabled and update instructions
    const isTouchDevice = ('ontouchstart' in window) || 
                         (navigator.maxTouchPoints > 0) || 
                         (navigator.msMaxTouchPoints > 0);
    
    const instructionText = document.getElementById('instructionText');
    if (instructionText) {
        if (isTouchDevice) {
            instructionText.textContent = 'Swipe ← → to navigate shaders';
        } else {
            instructionText.textContent = 'Use ← → arrow keys to navigate shaders';
        }
    }
    
    // Set up keyboard controls for navigation
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            nextShader();
        } else if (e.key === 'ArrowLeft') {
            previousShader();
        }
    });
    
    // Set up mouse movement detection to show UI
    window.addEventListener('mousemove', (e) => {
        const now = Date.now();
        // Only show UI if mouse actually moved (not just tiny movements)
        if (now - lastMouseMove > 100) {  // Throttle to avoid too frequent updates
            showUI();
            lastMouseMove = now;
        }
    });
    
    // Set up touch/swipe controls for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50; // Minimum distance for a swipe to register
    
    canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });
    
    canvas.addEventListener('touchmove', (e) => {
        touchEndX = e.touches[0].clientX;
    }, { passive: true });
    
    canvas.addEventListener('touchend', () => {
        const swipeDistance = touchEndX - touchStartX;
        
        if (Math.abs(swipeDistance) > minSwipeDistance) {
            if (swipeDistance > 0) {
                // Swiped right - go to previous shader
                previousShader();
            } else {
                // Swiped left - go to next shader
                nextShader();
            }
        }
        
        // Reset touch positions
        touchStartX = 0;
        touchEndX = 0;
    });
    
    // Handle window resizing
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
    
    // Start with the first shader if any are registered
    if (shaders.length > 0) {
        loadShader(0);
        render();  // Start the render loop
    }
}

// Wait for page to load, then initialize with a small delay
// (to ensure all shader files have been loaded and registered)
window.addEventListener('load', () => {
    setTimeout(init, 200);
});