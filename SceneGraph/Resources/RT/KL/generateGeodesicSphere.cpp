FABRIC void generateSphere(
	Vec3_Array &vertices,
	Vec3_Array &normals,
	Integer_Array &indices,
	Scalar &radius, 
  Integer &slices,
  Integer &loops
  )
{
  const Scalar  Pi = 3.141592653589793238462643f;

  if( slices < 3 )
    slices = 3;
  if( loops < 1 )
    loops = 1;
  if( radius < 0.0f )
    radius = 0.0f;

  Integer   nb_vtx = 2 + slices * loops;
  Integer   nb_tri = 2 * slices + 2 * slices * (loops - 1);

  vertices.resize( nb_vtx );
  normals.resize( nb_vtx );
  indices.resize( nb_tri * 3 );

  vertices[0] = Vec3( 0.0f, radius, 0.0f );
  vertices[nb_vtx - 1] = Vec3( 0.0f, -radius, 0.0f );

  for( int i = 0; i < loops; i++ )
  {
    Scalar    theta = ( (i+1)/Scalar(loops+1) ) * Pi;
    for( int j = 0; j < slices; j++ )
    {
      Scalar    phi = (j / Scalar(slices) ) * 2.0f * Pi;

      vertices[ j + i * slices ] = normals[ j + i * slices ] = Vec3( 
          sinf( theta ) * cosf( phi ),
          sinf( theta ) * sinf( phi ),
          cosf( theta ) );
      vertices[ j + i * slices ] *= radius;
    }
  }

  // Top
  Integer   tid = 0;
  for( Integer i = 0; i < slices; i++ )
  {
    indices[ tid++ ] = 0;
    indices[ tid++ ] = 1 + i;
    indices[ tid++ ] = 1 + ( (i + 1)%slices );
  }

  // Middle
  for( Integer i = 1; i < loops; i++ )
  {
    for( Integer j = 0; j < slices; j++ )
    {
      Integer   v0, v1, v2, v3;
      v0 = 1 + slices * i + j;
      v1 = 1 + slices * i + ((j+1)%slices);
      v2 = 1 + slices * (i + 1) + ((j+1)%slices);
      v3 = 1 + slices * (i + 1) + j;

      indices[ tid++ ] = v0;
      indices[ tid++ ] = v3;
      indices[ tid++ ] = v1;

      indices[ tid++ ] = v1;
      indices[ tid++ ] = v3;
      indices[ tid++ ] = v2;
    }
  }

  // Bottom
  for( Integer i = 0; i < slices; i++ )
  {
    Integer off = slices * (loops - 1) + 1;
    indices[ tid++ ] = nb_vtx - 1;
    indices[ tid++ ] = off + (i + 1)%slices;
    indices[ tid++ ] = off + i;
  }
}
