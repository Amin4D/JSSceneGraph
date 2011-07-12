uniform mat4 u_modelViewProjectionMatrix;
uniform mat4 u_modelViewMatrix;

attribute vec4 a_position;
attribute vec4 a_color;

varying vec4 color;

void main()
{
  // TODO: Change gl_Point.size to a uniform
  float pointSize = 500.0 * gl_Point.size;
  vec4 vert = a_position;
  vert.w = 1.0;
  vec3 pos_eye = vec3 (u_modelViewMatrix * vert);
  gl_PointSize = max(1.0, pointSize / (1.0 - pos_eye.z));
  gl_TexCoord[0] = gl_MultiTexCoord0;
  gl_Position = u_modelViewProjectionMatrix * a_position;
  color = a_color;
}
