
// Image texture.
uniform sampler2D u_rgbaImage;
uniform float u_blurSize;

void main(void)
{
	vec4 sum = vec4(0.0);
	vec2 uv = gl_TexCoord[0].st;

	// blur in y (vertical)
	// take nine samples, with the distance u_blurSize between them
	sum += texture2D(u_rgbaImage, vec2(uv.x - 4.0*u_blurSize, uv.y)) * 0.05;
	sum += texture2D(u_rgbaImage, vec2(uv.x - 3.0*u_blurSize, uv.y)) * 0.09;
	sum += texture2D(u_rgbaImage, vec2(uv.x - 2.0*u_blurSize, uv.y)) * 0.12;
	sum += texture2D(u_rgbaImage, vec2(uv.x - u_blurSize, uv.y)) * 0.15;
	sum += texture2D(u_rgbaImage, vec2(uv.x, uv.y)) * 0.16;
	sum += texture2D(u_rgbaImage, vec2(uv.x + u_blurSize, uv.y)) * 0.15;
	sum += texture2D(u_rgbaImage, vec2(uv.x + 2.0*u_blurSize, uv.y)) * 0.12;
	sum += texture2D(u_rgbaImage, vec2(uv.x + 3.0*u_blurSize, uv.y)) * 0.09;
	sum += texture2D(u_rgbaImage, vec2(uv.x + 4.0*u_blurSize, uv.y)) * 0.05;

	gl_FragColor = sum;
}