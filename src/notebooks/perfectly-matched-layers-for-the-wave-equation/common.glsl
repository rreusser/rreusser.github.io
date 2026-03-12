const float PML_WIDTH = 12.0; // pixels
const float PML_EXPONENT = 2.0;
const float PML_STRENGTH = 1.0;
const float OSCILLATOR_STRENGTH = 4.0;
const float OSCILLATOR_WAVELENGTH = 10.0; // pixels
const float C = 1.0;
const float DT = 0.5;
const float DX = 1.0;


#define U(i ,j) (texelFetch(iChannel0, p + ivec2(i, j), 0).x)
#define VX(i, j) (texelFetch(iChannel1, p + ivec2(i, j), 0).x)
#define VY(i, j) (texelFetch(iChannel1, p + ivec2(i, j), 0).y)

const float PI = 3.14159265358979;

float linearstep (float a, float b, float x) {
    return clamp((x - a) / (b - a), 0.0, 1.0);
}

// A layer that fades from 0 to 1 near the edges of the domain
vec2 sigma (vec2 coord, vec3 res) {    
    return pow(
        abs(vec2(
            linearstep(PML_WIDTH, 0.0, coord.x) + linearstep(res.x - PML_WIDTH, res.x, coord.x),
            linearstep(PML_WIDTH, 0.0, coord.y) + linearstep(res.y - PML_WIDTH, res.y, coord.y)
        )),
        vec2(PML_EXPONENT)
    ) * PML_STRENGTH;
}
