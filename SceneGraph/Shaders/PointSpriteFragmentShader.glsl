uniform sampler2D u_splatSampler;
varying vec4 color;

void main()
{
    gl_FragColor = color * texture2D(u_splatSampler, gl_TexCoord[0].st);
}
