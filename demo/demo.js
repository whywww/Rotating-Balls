"use strict";

var canvas;
var gl;
var program;

var texturePath = "../Images/moon.jpg";;
var numTimesToSubdivide = 4;
var index = 0;
var projection = true; // true: ortho, false: perspective
var rotate = true;

var pointsArray = [];
var normalsArray = [];
var texCoordsArray = []; // vertex texture

var near = -10;
var far = 10;
var radius = 1.5;
var theta = 0.0;
var phi = 0.0;

var left = -3.0;
var right = 3.0;
var ytop = 3.0;
var bottom = -3.0;
var dr = 5.0 * Math.PI/180.0;
var fovy = 75.0;
var aspect; 

var eye;
var eyeX, eyeY, eyeZ;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var scale = 1.0;
var tx = 0;
var ty = 0;
var tz = 0;

var HSRflag = true;
var alpha = 1;

var xAxis = 0;
var yAxis = 1;
var zAxis = 2;
var axis = xAxis;

// tetrahedron normal coordinate (sphere initial stage)
var va = vec4(0.0, 0.0, -1.0, 1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333, 1);

// texture coordinate
var texCoord = [ vec2(0, 0), vec2(0, 1), vec2(1, 1), vec2(1, 0) ];
var texCoordsArray = [];

var modelViewMatrix, modelViewMatrixLoc;
var projectionMatrix, projectionMatrixLoc;
var normalMatrix, normalMatrixLoc;
var scaleMatrix, scaleMatrixLoc;
var zoomMatrix, zoomMatrixLoc;

window.onload = function init(){
    // configure and init
    canvas = document.getElementById( "gl-canvas" );    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 ); // background color

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	
    // load shaders
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    tetrahedron(va, vb, vc, vd, numTimesToSubdivide);
    // colorSphere();

    // init attr buffers
    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );	
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );
    // associate shader vars with buffers
    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    // init attr buffers
    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );
    // associate shader vars with buffers
    var vPosition = gl.getAttribLocation( program, "vPosition" );
	gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
	gl.enableVertexAttribArray( vPosition ); 

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    scaleMatrixLoc = gl.getUniformLocation(program, "scaleMatrix");
	zoomMatrixLoc = gl.getUniformLocation(program, "zoomMatrix");
	
	
    document.getElementById("rotate").onclick = function(){ rotate = !rotate };
    document.addEventListener("keydown", function(e) {
        switch(window.event.keyCode || e.which){
            case 65: // 'A'
                // theta -= dr;
                at[0] --;
                break;
            case 68: // 'D'
                // theta += dr;
                at[0] ++;
                break;
            case 79: // 'O'
                projection = true;
                break;
            case 80: // 'P'
                projection = false;
                break;
            case 83: // 'S'
                // phi -= dr;
                at[1] --;
                break;
            case 87: // 'W'
                // phi += dr;
                at[1] ++;    
                break;
        }
    });
	document.getElementById("scaleSlider").onchange = function(event)
	{    scale = event.target.value;	};	
	document.getElementById("txSlider").onchange = function(event)
	{    tx = event.target.value;	};	
	document.getElementById("tySlider").onchange = function(event)
	{    ty = event.target.value;	};	
	document.getElementById("tzSlider").onchange = function(event)
	{    tz = event.target.value;	};	
	document.getElementById("alphaslider").onchange = function(event)
    {    alpha = event.target.value;	};	
    
    loadImage(); // init texture

    var m = document.getElementById("mymenu");
    m.addEventListener("click", function() {
        switch(m.selectedIndex) {
            case 0:
                texturePath = "../Images/moon.jpg";
                break;
            case 1:
                texturePath = "../Images/sun.jpg";
                break;
            case 2:
                texturePath = "../Images/wall.jpg";
                break;
            case 3:
                texturePath = "../Images/checkerboard.jpg";
                break;
        }
        loadImage(); // change texture
    });

    lighting();
    render();
};

function loadImage(){
    var image = new Image();
    // image.crossOrigin = "anonymous";
    image.src = texturePath;
    image.onload = function() {
        var texture = gl.createTexture();
        gl.bindTexture( gl.TEXTURE_2D, texture );
        gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, true ); 
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image ); // to memory
        
        // 自动为当前纹理设置大小为多个等级的纹素数组
        gl.generateMipmap( gl.TEXTURE_2D );
        // Mipmapped Texture
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,gl.NEAREST_MIPMAP_LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
        
        gl.uniform1i(gl.getUniformLocation(program, "textureSampler"), 0); // bind texture with Sampler
    }
}

function lighting() {
    var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 ); // w=0: Distant source. w=1: Point source
    var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
    var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
    var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

    var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
    var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
    var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
    var materialShininess = 20.0;

    var ambientProduct = mult(lightAmbient, materialAmbient); // Ia*Ka
    var diffuseProduct = mult(lightDiffuse, materialDiffuse); // Id*Kd
    var specularProduct = mult(lightSpecular, materialSpecular); // Is*Ks

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));//传递环境反射向量
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct) );//传递漫反射向量
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"),flatten(specularProduct) );//传递镜面反射向量
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"),flatten(lightPosition) );//传递光源位置向量	
    gl.uniform1f(gl.getUniformLocation(program, "shininess"),materialShininess);//传递镜面反射的高光系数
};

function triangle(a, b, c) {
    pointsArray.push(a);
    pointsArray.push(b);
    pointsArray.push(c);

   // normals are vectors
    normalsArray.push(a[0],a[1], a[2], 0.0);
    normalsArray.push(b[0],b[1], b[2], 0.0);
    normalsArray.push(c[0],c[1], c[2], 0.0);

    index += 3;
};

function divideTriangle(a, b, c, count) {
    if ( count > 0 ) {

        var ab = mix( a, b, 0.5);
        var ac = mix( a, c, 0.5);
        var bc = mix( b, c, 0.5);

        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

        divideTriangle( a, ab, ac, count - 1 );
        divideTriangle( ab, b, bc, count - 1 );
        divideTriangle( bc, c, ac, count - 1 );
        divideTriangle( ab, bc, ac, count - 1 );
    }
    else {
        triangle( a, b, c );
    }
};

function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
};

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // rotate
    if ( rotate ) {
        // phi += dr;
        theta += dr;
    }

    eyeX = radius * Math.sin(theta) * Math.cos(phi); // 极坐标转笛卡尔坐标
    eyeY = radius * Math.sin(theta) * Math.sin(phi);
    eyeZ = radius * Math.cos(theta);

    eye = vec3( eyeX, eyeY, eyeZ );

    if (projection) {
        projectionMatrix = ortho( left, right, bottom, ytop, near, far );
    } else {
        aspect = canvas.width/canvas.height;
        projectionMatrix = perspective( fovy, aspect, near+10, far+20 );
    }

    modelViewMatrix = lookAt(eye, at , up);
    normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];
	
    //缩放
	var zoomMatrix = new Float32Array([
                scale, 0, 0.0, 0.0,
                0, scale, 0.0, 0.0,
                0, 0, scale, 0.0,
                tx, ty, tz, 1.0
            ]);
 
    gl.uniformMatrix4fv(zoomMatrixLoc,false,flatten(zoomMatrix) );
	
    // gl.uniformMatrix4fv( gl.getUniformLocation(program, "projectionMatrix"),  false, flatten(projectionMatrix)); //传投影变换矩阵
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
    gl.uniformMatrix3fv( normalMatrixLoc, false, flatten(normalMatrix) );
	
	gl.uniform1f(gl.getUniformLocation(program, "uAlpha"),alpha);
	
    // sphere left
    scaleMatrix = new Float32Array([
                0.3, 0, 0.0, 0.0,
                0, 0.3, 0.0, 0.0,
                0, 0, 0.3, 0.0,
                -0.4, 0, 0, 1.0
            ]);
    gl.uniformMatrix4fv( scaleMatrixLoc,false,flatten(scaleMatrix) );
    for( var i=0; i<index; i+=3 )
        gl.drawArrays( gl.TRIANGLES, i, 3 );

    // sphere right
    scaleMatrix = new Float32Array([
        0.5, 0, 0.0, 0.0,
        0, 0.5, 0.0, 0.0,
        0, 0, 0.5, 0.0,
        0.3, 0, 0, 1.0
    ]);
    gl.uniformMatrix4fv( scaleMatrixLoc,false,flatten(scaleMatrix) );
    for( var i=0; i<index; i+=3)
        gl.drawArrays( gl.TRIANGLES, i, 3 );
    
    gl.flush();
    window.requestAnimFrame(render);
};