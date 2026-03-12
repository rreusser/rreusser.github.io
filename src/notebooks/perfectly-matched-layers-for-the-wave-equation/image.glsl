void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = fragCoord/iResolution.xy;
    
    vec4 state = texture(iChannel0, uv);
    float u = state.x;
    
    // Note that the colors are scaled and gamma applied in order to bring out small amplitudes.
    // In reality, the reflections may be a bit more damped than they appear here.
    fragColor = vec4(abs(u) * (u > 0.0 ? vec3(1,0.3,0) : vec3(0,0.3,1)), 1);
    
    if (iMouse.z > 0.0) {
        vec2 s = sigma(fragCoord, iResolution);
        fragColor = mix(fragColor, vec4(1, 0, 0, 1), s.x);
        fragColor = mix(fragColor, vec4(0, 1, 0, 1), s.y);
    }
    
    float gamma = 0.454;
    if (iMouse.z > 0.0) {
        gamma = mix(gamma, 0.0, iMouse.x / iResolution.x);
    }
    

    fragColor.rgb = pow(abs(fragColor.rgb), vec3(gamma));
}
