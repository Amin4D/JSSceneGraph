uniform sampler2D u_rgbaImage;

void main()
{
#if 0
	// Simple 2.2 gamma
	vec2 texcoord = vec2(gl_TexCoord[0]);
	vec3 linear = texture2D(u_rgbaImage, vec2(gl_TexCoord[0]) ).xyz;
	gl_FragColor.x = pow( linear.x, 1.0/2.2 );
	gl_FragColor.y = pow( linear.y, 1.0/2.2 );
	gl_FragColor.z = pow( linear.z, 1.0/2.2 );
#else
	// Filmig tonemapping with a nice knee/shoulder roundoff.
	vec2 texcoord = vec2(gl_TexCoord[0]);
	vec3 linearCol = texture2D(u_rgbaImage, vec2(gl_TexCoord[0]) ).xyz;
	vec4 p;
	
	p.x = max(0.0, linearCol.x - 0.004);
	p.y = max(0.0, linearCol.y - 0.004);
	p.z = max(0.0, linearCol.z - 0.004);
	p.w = 0.0;
	
	gl_FragColor = (p*(6.2*p+0.5))/(p*(6.2*p+1.7)+0.06);
#endif
}
