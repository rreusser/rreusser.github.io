vec3 linear_to_srgb(vec3 color) {
    return pow(color, vec3(1.0 / 2.2));
}

vec3 srgb_to_linear(vec3 color) {
    return pow(color, vec3(2.2));
}

vec3 tonemap(vec3 color) {
    // Use an exponential smoothmin between y=x and y=1 for tone-mapping
    // See: https://www.desmos.com/calculator/h8odggcnd0
    const float k = 8.0;
    return max(vec3(0), log2(exp2(-k * color) + exp2(-k)) * (-1.0 / k));
}

vec3 fog (vec3 color, float dist) {
	vec3 lcol = srgb_to_linear(color);
	lcol = tonemap(lcol + 0.7 * vec3(1, 1.1, 1.2) * pow(max(0.0, 1.0 - exp(-(dist + 0.5) * 1.5)), 2.0));
	return linear_to_srgb(lcol);
}

#pragma glslify: export(fog)
