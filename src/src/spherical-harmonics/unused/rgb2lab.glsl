vec3 rgb2lab( vec3 c ) {
	vec3 lab = xyz2lab( rgb2xyz( c ) );
	return vec3( lab.x / 100.0, 0.5 + 0.5 * ( lab.y / 127.0 ), 0.5 + 0.5 * ( lab.z / 127.0 ));
}

#pragma glslify: export(rgb2lab)
