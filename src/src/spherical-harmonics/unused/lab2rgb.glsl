float3 lab2rgb( float3 c ) {
	return xyz2rgb( lab2xyz( float3(100.0 * c.x, 2.0 * 127.0 * (c.y - 0.5), 2.0 * 127.0 * (c.z - 0.5)) ) );
}

#pragma glslify: export(lab2rgb)
