void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    ivec2 p = ivec2(fragCoord);
    vec4 state = texelFetch(iChannel0, p, 0);
    float u = state.x, psi = state.y, t = state.z;
    
    // Compute dv_x/dx and dv_y/dy
    float dvxdx = (VX(1, 0) - VX(-1, 0)) / (2.0 * DX);
    float dvydy = (VY(0, 1) - VY(0, -1)) / (2.0 * DX);

    vec2 s = sigma(fragCoord, iResolution);
    
    // Update u, psi, and t
    fragColor.xyz = state.xyz + DT * vec3(
        C * (dvxdx + dvydy) - u * (s.x + s.y) + psi,
        C * (s.x * dvydy + s.y * dvxdx - u * s.x * s.y),
        1
    );
    
    // Apply a forcing term at the center
    float pulseInterval = 600.0;
    float pulse = exp(-pow(abs((mod(t - pulseInterval, pulseInterval * 0.7) - pulseInterval * 0.5) / 40.0), 4.0));
    int COUNT = 5;
    for (int i = 0; i < COUNT; i++) {
        vec2 r = (float(i) - float(COUNT) * 0.5) / float(COUNT) * vec2(80, 0);
        float omega = C * PI / OSCILLATOR_WAVELENGTH;
        float oscillatorMask = smoothstep(3.0, 2.0, length(fragCoord - iResolution.xy * 0.5 + r));
        float u0 = sin(omega * t / float(i + 1));
        fragColor.x += u0 * oscillatorMask * OSCILLATOR_STRENGTH * pulse;
    }
}
