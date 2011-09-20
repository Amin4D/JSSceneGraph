
//
// Copyright 2010-2011 Fabric Technologies Inc. All rights reserved.
//

// NOTE: The following primitives are examples of procedural geometry generation.
// Geometry data is stored in 2 separate nodes that contain data of different
// dimensions. uniforms and attributes. Currently, we can only (legally) write to a
// single nodes data (the self node), and we cannot resize a node during the execution
// of an operator.
// We handle the resizing issue here by spliting the generation operators into 2 ops
// the first of which computes the new size and resizes the attributes nodes. The 2nd
// op then generates the data. Ideally, we will be able to resize the attributes
// node from within an operator writing to its data. This will be achievable once
// we have implimented the concept of sub-graphs.
// For all triangle primitives, we are also calculating an index array, and this
// member is stored on the unfiorms node. We currently do this by writing to 2 nodes
// from the same operator (uniforms and attributes). This solution is termporary,
// and will be resolved elegantly with the graph nesting solution mentioned above.

FABRIC.SceneGraph.registerNodeType('LineVector', {
  briefDesc: 'The LineVector node is a line between 2 points.',
  detailedDesc: 'The LineVector node is a line between 2 points.',
  parentNodeDesc: 'Lines',
  optionsDesc: {
    from: 'The start position of the line segment in local space.',
    to: 'The end position of the line segment in local space.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        from: FABRIC.RT.vec3(0, 0, 0),
        to: FABRIC.RT.vec3(1, 0, 0)
      });

    var lineSegmentNode = scene.constructNode('Lines', options);
    lineSegmentNode.pub.loadGeometryData({
        positions: [options.from, options.to],
        indices: [0, 1]
      });
    return lineSegmentNode;
  }});


FABRIC.SceneGraph.registerNodeType('Cross', {
  briefDesc: 'A Cross drawn using 3 line segments.',
  detailedDesc: 'A Cross drawn using 3 line segments, one along the X, Y and Z axis.',
  parentNodeDesc: 'Lines',
  optionsDesc: {
    size: 'The size of the cross.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      size: 1.0
    });

    var crossNode = scene.constructNode('Lines', options);
    crossNode.pub.addUniformValue('crosssize', 'Scalar', options.size);
    crossNode.getAttributesDGNode().setCount(6);
    crossNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'generateCross',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateCross.kl',
        entryFunctionName: 'generateCross',
        parameterLayout: [
          'self.positions<>',
          'uniforms.indices',
          'uniforms.crosssize'
        ]
      })
    ]);
    return crossNode;
  }});


FABRIC.SceneGraph.registerNodeType('Rectangle', {
  briefDesc: 'A Rectangle drawn using 4 line segments.',
  detailedDesc: 'A Rectangle drawn using 4 line segments, which lies on the XZ plane.',
  parentNodeDesc: 'Lines',
  optionsDesc: {
    length: 'The length of the rectangle along the X axis.',
    width: 'The length of the rectangle along the Z axis.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      length: 4.0,
      width: 2.5
    });

    var rectangleNode = scene.constructNode('Lines', options);
    rectangleNode.pub.addUniformValue('length', 'Scalar', options.length);
    rectangleNode.pub.addUniformValue('width', 'Scalar', options.width);
    rectangleNode.getAttributesDGNode().setCount(8);
    rectangleNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'generateRectangle',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateRectangle.kl',
        entryFunctionName: 'generateRectangle',
        parameterLayout: [
          'self.positions<>',
          'uniforms.indices',
          'uniforms.length',
          'uniforms.width'
        ]
      })
    ]);

    return rectangleNode;
  }});


FABRIC.SceneGraph.registerNodeType('BoundingBox', {
  briefDesc: 'The BoundingBox primitive draws a Cuboid according to corner positions.',
  detailedDesc: 'The BoundingBox primitive draws a Cuboid according to corner positions.' +
                'The corner positions define an axis aligned bounding box in the coordinate space it is specified in.',
  parentNodeDesc: 'Lines',
  optionsDesc: {
    bboxmin: 'The min values of the Bounding Box. e.g. -X, -Y, -Z',
    bboxmax: 'The max values of the Bounding Box. e.g. +X, +Y, +Z'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      bboxmin: FABRIC.RT.vec3(-2, -3, -4),
      bboxmax: FABRIC.RT.vec3(4, 3, 2)
    });

    var boundingBoxNode = scene.constructNode('Lines', options);
    boundingBoxNode.pub.addUniformValue('bboxmin', 'Vec3', options.bboxmin);
    boundingBoxNode.pub.addUniformValue('bboxmax', 'Vec3', options.bboxmax);
    boundingBoxNode.getAttributesDGNode().setCount(8);
    boundingBoxNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'generateBoundingBox',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateBoundingBox.kl',
        entryFunctionName: 'generateBoundingBox',
        parameterLayout: [
          'self.positions<>',
          'uniforms.indices',
          'uniforms.bboxmin',
          'uniforms.bboxmax'
        ]
      })
    ]);

    return boundingBoxNode;
  }});


FABRIC.SceneGraph.registerNodeType('Grid', {
  briefDesc: 'The Grid primitive draws a grid of lines.',
  detailedDesc: 'The Grid primitive draws a grid of lines. The sections per axis as well as the size along each axis can be specified.',
  parentNodeDesc: 'Lines',
  optionsDesc: {
    size_x: 'The size of the grid in the X axis',
    size_y: 'The size of the grid in the Y axis',
    size_z: 'The size of the grid in the Z axis',
    sections_x: 'The number of sections of the grid along the X axis',
    sections_y: 'The number of sections of the grid along the Y axis',
    sections_z: 'The number of sections of the grid along the Z axis'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
      size_x: 10.0,
      size_y: 10.0,
      size_z: 10.0,
      sections_x: 10,
      sections_y: 1,
      sections_z: 10
    });

    var gridNode = scene.constructNode('Lines', options);
    gridNode.pub.addUniformValue('size_x', 'Scalar', options.size_x);
    gridNode.pub.addUniformValue('size_y', 'Scalar', options.size_y);
    gridNode.pub.addUniformValue('size_z', 'Scalar', options.size_z);
    gridNode.pub.addUniformValue('sections_x', 'Integer', options.sections_x);
    gridNode.pub.addUniformValue('sections_y', 'Integer', options.sections_y);
    gridNode.pub.addUniformValue('sections_z', 'Integer', options.sections_z);
    gridNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'setGridVertexCount',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateGrid.kl',
        entryFunctionName: 'setGridVertexCount',
        parameterLayout: [
          'uniforms.sections_x',
          'uniforms.sections_y',
          'uniforms.sections_z',
          'self.newCount'
        ]
      }),
      scene.constructOperator({
        operatorName: 'generateGrid',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateGrid.kl',
        entryFunctionName: 'generateGrid',
        parameterLayout: [
          'self.positions<>',
          'uniforms.indices',
          'uniforms.size_x',
          'uniforms.size_y',
          'uniforms.size_z',
          'uniforms.sections_x',
          'uniforms.sections_y',
          'uniforms.sections_z'
        ]
      })
    ]);

    return gridNode;
  }});


FABRIC.SceneGraph.registerNodeType('Axes', {
  briefDesc: 'The Axis primitive draws a labled coordinate system axis.',
  detailedDesc: 'The Axis primitive draws a labled coordinate system axis.' +
                'The axes are labeled \'X\', \'Y\', and \'Z\'',
  parentNodeDesc: 'Lines',
  optionsDesc: {
    size: 'The size of the draw coordinate system axes.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        size: 1.0
      });

    var axesNode = scene.constructNode('Lines', options);
    axesNode.pub.addUniformValue('size', 'Scalar', options.size);
    axesNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'setAxesVertexCount',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateAxes.kl',
        entryFunctionName: 'setAxesVertexCount',
        parameterLayout: [
          'self.newCount'
        ]
      }),
      scene.constructOperator({
        operatorName: 'generateAxes',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateAxes.kl',
        entryFunctionName: 'generateAxes',
        parameterLayout: [
          'self.positions<>',
          'uniforms.indices',
          'uniforms.size'
        ]
      })
    ]);
    return axesNode;
  }});

FABRIC.SceneGraph.registerNodeType('CameraPrimitive', {
  briefDesc: 'The camera primitive draws a box with a cone up front.',
  detailedDesc: 'The camera primitive draws a box with a cone up front. This can be used to visualize cameras when working with ' +
                'multiple cameras.',
  parentNodeDesc: 'Lines',
  optionsDesc: {
    size: 'The size of the camera primitive draw.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        size: 2.0
    });

    var cameraPrimNode = scene.constructNode('Lines', options);
    cameraPrimNode.pub.addUniformValue('size', 'Scalar', options.size);
    cameraPrimNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'setCameraPrimVertexCount',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateCameraPrim.kl',
        entryFunctionName: 'setCameraPrimVertexCount',
        parameterLayout: [
          'self.newCount'
        ]
      }),
      scene.constructOperator({
        operatorName: 'generateCameraPrim',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateCameraPrim.kl',
        entryFunctionName: 'generateCameraPrim',
        parameterLayout: [
          'self.positions<>',
          'uniforms.indices',
          'uniforms.size'
        ]
      })
    ]);
    return cameraPrimNode;
  }});

FABRIC.SceneGraph.registerNodeType('Circle', {
  briefDesc: 'The Circle primitive draws a circle or arc using line segments.',
  detailedDesc: 'The Circle primitive draws a circle or arc using line segments. The number of segments can be specified, as well as the radius.',
  parentNodeDesc: 'Lines',
  optionsDesc: {
    radius: 'The radius of the draw circle',
    arcAngle: 'The arc of the drawn circle in radians. By default, it specifies a full cicle, but can be used to draw arcs of any angle.',
    numSegments: 'The number of line segments to use when drawing the circle or arc.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        radius: 10,
        arcAngle: 6.28318,
        numSegments: 24
      });

    var circleNode = scene.constructNode('Lines', options);
    circleNode.pub.addUniformValue('radius', 'Scalar', options.radius);
    circleNode.pub.addUniformValue('arcAngle', 'Scalar', options.arcAngle);
    circleNode.pub.addUniformValue('numSegments', 'Integer', options.numSegments);

    // getters and setters
    var uniforms = circleNode.getUniformsDGNode();
    circleNode.addMemberInterface(uniforms, 'radius', true);
    circleNode.addMemberInterface(uniforms, 'arcAngle', true);
    circleNode.addMemberInterface(uniforms, 'numSegments', true);

    circleNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'setCircleVertexCount',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateCircle.kl',
        entryFunctionName: 'setCircleVertexCount',
        parameterLayout: [
          'uniforms.numSegments',
          'self.newCount'
        ]
      }),
      scene.constructOperator({
        operatorName: 'generateCircle',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateCircle.kl',
        entryFunctionName: 'generateCircle',
        parameterLayout: [
          'self.positions<>',
          'uniforms.indices',
          'uniforms.radius',
          'uniforms.arcAngle',
          'uniforms.numSegments'
        ]
      })
    ]);
    return circleNode;
  }});


FABRIC.SceneGraph.registerNodeType('Plane', {
  briefDesc: 'The Plane primitive draws a plane or arc using triangles.',
  detailedDesc: 'The Plane primitive draws a plane or arc using triangles.',
  parentNodeDesc: 'Triangles',
  optionsDesc: {
    length: 'The length of the plane in the X axis',
    width: 'The width of the plane in the Z axis',
    lengthSections: 'The number of length sections to use when building the plane.',
    widthSections: 'The number of width sections to use when building the plane.',
    doubleSided: 'If set to true, triangles are constructed with normals facing in both directions'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        length: 10,
        width: 10,
        lengthSections: 2,
        widthSections: 2
      });

    options.uvSets = 1;

    var planeNode = scene.constructNode('Triangles', options);
    planeNode.pub.addUniformValue('length', 'Scalar', options.length);
    planeNode.pub.addUniformValue('width', 'Scalar', options.width);
    planeNode.pub.addUniformValue('lengthSections', 'Integer', options.lengthSections);
    planeNode.pub.addUniformValue('widthSections', 'Integer', options.widthSections);

    // getters and setters
    var uniforms = planeNode.getUniformsDGNode();
    planeNode.addMemberInterface(uniforms, 'length', true);
    planeNode.addMemberInterface(uniforms, 'width', true);
    planeNode.addMemberInterface(uniforms, 'lengthSections', true);
    planeNode.addMemberInterface(uniforms, 'widthSections', true);

    planeNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'setPlaneVertexCount',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generatePlane.kl',
        entryFunctionName: 'setPlaneVertexCount',
        parameterLayout: [
          'uniforms.lengthSections',
          'uniforms.widthSections',
          'self.newCount'
        ]
      }),
      scene.constructOperator({
        operatorName: 'generatePlane',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generatePlane.kl',
        entryFunctionName: 'generatePlane',
        parameterLayout: [
          'uniforms.indices',
          'uniforms.length',
          'uniforms.width',
          'uniforms.lengthSections',
          'uniforms.widthSections',

          'self.positions<>',
          'self.normals<>',
          'self.uvs0<>'
        ]
      })
    ]);
    return planeNode;
  }});


FABRIC.SceneGraph.registerNodeType('Cuboid', {
  briefDesc: 'The Cuboid primitive draws a cuboid or arc using triangles.',
  detailedDesc: 'The Cuboid primitive draws a cuboid or arc using triangles.' +
                ' A cuboid is an irregualr cube.',
  parentNodeDesc: 'Triangles',
  optionsDesc: {
    length: 'The length of the Cuboid in the X axis.',
    width: 'The width of the cuboid in the Z axis.',
    height: 'The height of the cuboid in the Y axis.',
    size: 'If specified, set the length, width and height.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        length: 10,
        width: 10,
        height: 10,
        size: undefined
      });

    if (typeof options.size === 'number') {
      options.length = options.height = options.width = options.size;
    }

    var cubeNode = scene.constructNode('Triangles', options);
    cubeNode.pub.addUniformValue('length', 'Scalar', options.length);
    cubeNode.pub.addUniformValue('width', 'Scalar', options.width);
    cubeNode.pub.addUniformValue('height', 'Scalar', options.height);
    cubeNode.getAttributesDGNode().setCount(24);

    // getters and setters
    var uniforms = cubeNode.getUniformsDGNode();
    cubeNode.addMemberInterface(uniforms, 'length', true);
    cubeNode.addMemberInterface(uniforms, 'width', true);
    cubeNode.addMemberInterface(uniforms, 'height', true);

    cubeNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'generateCuboid',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateCuboid.kl',
        entryFunctionName: 'generateCuboid',
        parameterLayout: [
          'self.positions<>',
          'self.normals<>',
          'uniforms.indices',
          'uniforms.length',
          'uniforms.height',
          'uniforms.width'
        ]
      })
    ]);
    return cubeNode;
  }});


FABRIC.SceneGraph.registerNodeType('Sphere', {
  briefDesc: 'The Sphere primitive draws a sphere using triangles.',
  detailedDesc: 'The Sphere primitive draws a sphere using triangles.',
  parentNodeDesc: 'Triangles',
  optionsDesc: {
    radius: 'The radius of the Spehre.',
    detail: 'The detail parameter controls the number of triangles used to construct the sphere.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        radius: 5.0,
        detail: 5
      });

    options.uvSets = 1;

    var sphereNode = scene.constructNode('Triangles', options);
    sphereNode.pub.addUniformValue('radius', 'Scalar', options.radius);
    sphereNode.pub.addUniformValue('detail', 'Integer', options.detail);

    // getters and setters
    var uniforms = sphereNode.getUniformsDGNode();
    sphereNode.addMemberInterface(uniforms, 'radius', true);
    sphereNode.addMemberInterface(uniforms, 'detail', true);

    sphereNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'setSphereVertexCount',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateSphere.kl',
        entryFunctionName: 'setSphereVertexCount',
        parameterLayout: [
          'uniforms.detail',
          'self.newCount'
        ]
      }),
      scene.constructOperator({
        operatorName: 'generateSphere',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateSphere.kl',
        entryFunctionName: 'generateSphere',
        parameterLayout: [
          'uniforms.radius',
          'uniforms.detail',

          'uniforms.indices',
          'self.positions<>',
          'self.normals<>',
          'self.uvs0<>'
        ]
      })
    ]);
    return sphereNode;
  }});


FABRIC.SceneGraph.registerNodeType('Torus', {
  briefDesc: 'The Torus primitive draws a torus using triangles.',
  detailedDesc: 'The Torus primitive draws a torus using triangles.',
  parentNodeDesc: 'Triangles',
  optionsDesc: {
    inner_radius: 'The inner radius of the torus. The inner radius is the size of the hole in the middle of the torus.',
    outer_radius: 'The outer radius of the torus.',
    detail: 'The detail parameter controls the number of triangles used to construct the torus.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        inner_radius: 2.0,
        outer_radius: 5.0,
        detail: 5
      });

    var torusNode = scene.constructNode('Triangles', options);
    torusNode.pub.addUniformValue('outer_radius', 'Scalar', options.inner_radius);
    torusNode.pub.addUniformValue('inner_radius', 'Scalar', options.outer_radius);
    torusNode.pub.addUniformValue('detail', 'Integer', options.detail);

    // getters and setters
    var uniforms = torusNode.getUniformsDGNode();
    torusNode.addMemberInterface(uniforms, 'outer_radius', true);
    torusNode.addMemberInterface(uniforms, 'inner_radius', true);
    torusNode.addMemberInterface(uniforms, 'detail', true);

    torusNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'setTorusVertexCount',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateTorus.kl',
        entryFunctionName: 'setTorusVertexCount',
        parameterLayout: [
          'uniforms.inner_radius',
          'uniforms.outer_radius',
          'uniforms.detail',
          'self.newCount'
        ]
      }),
      scene.constructOperator({
        operatorName: 'generateTorus',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateTorus.kl',
        entryFunctionName: 'generateTorus',
        parameterLayout: [
          'uniforms.inner_radius',
          'uniforms.outer_radius',
          'uniforms.detail',

          'uniforms.indices',
          'self.positions<>',
          'self.normals<>'
        ]
      })
    ]);
    return torusNode;
  }});


FABRIC.SceneGraph.registerNodeType('Cone', {
  briefDesc: 'The Cone primitive draws a cone using triangles.',
  detailedDesc: 'The Cone primitive draws a cone using triangles.',
  parentNodeDesc: 'Triangles',
  optionsDesc: {
    radius: 'The radius of the cone.',
    height: 'The height of the cone.',
    cap: 'If true, the base of the cone is filled with a disc.',
    detail: 'The detail parameter controls the number of triangles used to construct the cone.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        radius: 2.0,
        height: 5.0,
        cap: true,
        detail: 5
      });

    var coneNode = scene.constructNode('Triangles', options);
    coneNode.pub.addUniformValue('radius', 'Scalar', options.radius);
    coneNode.pub.addUniformValue('height', 'Scalar', options.height);
    coneNode.pub.addUniformValue('cap', 'Boolean', options.cap);
    coneNode.pub.addUniformValue('detail', 'Integer', options.detail);

    // getters and setters
    var uniforms = coneNode.getUniformsDGNode();
    coneNode.addMemberInterface(uniforms, 'radius', true);
    coneNode.addMemberInterface(uniforms, 'height', true);
    coneNode.addMemberInterface(uniforms, 'cap', true);
    coneNode.addMemberInterface(uniforms, 'detail', true);

    coneNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'setConeVertexCount',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateCone.kl',
        entryFunctionName: 'setConeVertexCount',
        parameterLayout: [
          'uniforms.cap',
          'uniforms.detail',
          'self.newCount'
        ]
      }),
      scene.constructOperator({
        operatorName: 'generateCone',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateCone.kl',
        entryFunctionName: 'generateCone',
        parameterLayout: [
          'uniforms.radius',
          'uniforms.height',
          'uniforms.cap',
          'uniforms.detail',

          'uniforms.indices',
          'self.positions<>',
          'self.normals<>'
        ]
      })
    ]);
    return coneNode;
  }});


FABRIC.SceneGraph.registerNodeType('Cylinder', {
  briefDesc: 'The Cylinder primitive draws a cylinder using triangles.',
  detailedDesc: 'The Cylinder primitive draws a cylinder using triangles.',
  parentNodeDesc: 'Triangles',
  optionsDesc: {
    radius: 'The radius of the cylinder.',
    height: 'The height of the cylinder.',
    caps: 'If true, the ends of the cylinder are capped',
    detail: 'The detail parameter controls the number of triangles used to construct the Cylinder.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        radius: 2.0,
        height: 5.0,
        caps: true,
        sides: 12,
        loops: 0
      });

    options.uvSets = 1;
    var cylinderNode = scene.constructNode('Triangles', options);
    cylinderNode.pub.addUniformValue('radius', 'Scalar', options.radius);
    cylinderNode.pub.addUniformValue('height', 'Scalar', options.height);
    cylinderNode.pub.addUniformValue('caps', 'Boolean', options.caps);
    cylinderNode.pub.addUniformValue('sides', 'Integer', options.sides);
    cylinderNode.pub.addUniformValue('loops', 'Integer', options.loops);

    // getters and setters
    var uniforms = cylinderNode.getUniformsDGNode();
    cylinderNode.addMemberInterface(uniforms, 'radius', true);
    cylinderNode.addMemberInterface(uniforms, 'height', true);
    cylinderNode.addMemberInterface(uniforms, 'cap', true);
    cylinderNode.addMemberInterface(uniforms, 'sides', true);
    cylinderNode.addMemberInterface(uniforms, 'loops', true);

    cylinderNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'setCylinderVertexCount',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateCylinder.kl',
        entryFunctionName: 'setCylinderVertexCount',
        parameterLayout: [
          'uniforms.caps',
          'uniforms.sides',
          'uniforms.loops',
          'self.newCount'
        ]
      }),
      scene.constructOperator({
        operatorName: 'generateCylinder',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateCylinder.kl',
        entryFunctionName: 'generateCylinder',
        parameterLayout: [
          'uniforms.radius',
          'uniforms.height',
          'uniforms.caps',
          'uniforms.sides',
          'uniforms.loops',

          'uniforms.indices',
          'self.positions<>',
          'self.normals<>',
          'self.uvs0<>'
        ]
      })
    ]);

    return cylinderNode;
  }});


FABRIC.SceneGraph.registerNodeType('Teapot', {
  briefDesc: 'The Teapot primitive draws a classic teapot using triangles.',
  detailedDesc: 'The Teapot primitive draws a classic teapot using triangles.',
  parentNodeDesc: 'Triangles',
  optionsDesc: {
    size: 'The size of the teapot',
    detail: 'The detail parameter controls the number of triangles used to construct the Teapot.'
  },
  factoryFn: function(options, scene) {
    scene.assignDefaults(options, {
        size: 5.0,
        detail: 5
      });
    options.uvSets = 1;
    var teapotNode = scene.constructNode('Triangles', options);
    teapotNode.pub.addUniformValue('size', 'Scalar', options.size);
    teapotNode.pub.addUniformValue('detail', 'Integer', options.detail);

    // getters and setters
    var uniforms = teapotNode.getUniformsDGNode();
    teapotNode.addMemberInterface(uniforms, 'size', true);
    teapotNode.addMemberInterface(uniforms, 'detail', true);

    teapotNode.setGeneratorOps([
      scene.constructOperator({
        operatorName: 'setTeapotVertexCount',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateTeapot.kl',
        entryFunctionName: 'setTeapotVertexCount',
        parameterLayout: [
          'uniforms.detail',
          'self.newCount'
        ]
      }),
      scene.constructOperator({
        operatorName: 'generateTeapot',
        srcFile: 'FABRIC_ROOT/SceneGraph/KL/generateTeapot.kl',
        entryFunctionName: 'generateTeapot',
        parameterLayout: [
          'uniforms.size',
          'uniforms.detail',

          'uniforms.indices',
          'self.positions<>',
          'self.normals<>',
          'self.uvs0<>'
        ]
      })
    ]);
    return teapotNode;
  }});




