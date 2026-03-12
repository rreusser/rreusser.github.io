void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    ivec2 p = ivec2(fragCoord);
    vec4 state = texelFetch(iChannel1, p, 0);
    vec2 v = state.xy;
    
    // Compute ∇u = (du/dx, du_dy)
    vec2 ugrad = vec2(U(1, 0) - U(-1, 0), U(0, 1) - U(0, -1)) / (2.0 * DX);

    vec2 s = sigma(fragCoord, iResolution);
    
    // Update (v_x, v_y)
    fragColor.xy = state.xy + DT * (C * ugrad - s * v);
}
