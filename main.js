import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06070f);
const canvas = document.getElementById("experience-canvas");
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};
 

 
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();
let character = {
    instance: null,
    container: new THREE.Object3D(),
    moveDistance: 3,
    jumpHeight: 1,
    isMoving: false,
    moveDuration: 0.15,
}

let collisionWall = {

}

let camera, goal, keys, follow;

let time = 0;
let newPosition = new THREE.Vector3();
let matrix = new THREE.Matrix4();

let stop = 1;
let DEGTORAD = 0.01745327;
let temp = new THREE.Vector3;
let dir = new THREE.Vector3;
let a = new THREE.Vector3;
let b = new THREE.Vector3;
let coronaSafetyDistance = 0.3;
let velocity = 0.0;
let speed = 0.0;

function init() {

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10 );
    camera.position.set( 0, .3, 0 );
    
   
    camera.lookAt( scene.position );

  
    
    goal = new THREE.Object3D;
    follow = new THREE.Object3D;
    follow.position.z = -coronaSafetyDistance;
    character.container.add( follow );
    
    goal.add( camera );
 
 

    
    let gridHelper = new THREE.GridHelper( 40, 40 );
    scene.add( gridHelper );
    
    scene.add( new THREE.AxesHelper() );

    scene.add(character.container);

keys = {
    a: false,
    s: false,
    d: false,
    w: false
  };
  
  document.body.addEventListener( 'keydown', function(e) {
    
    const key = e.code.replace('Key', '').toLowerCase();
    if ( keys[ key ] !== undefined )
      keys[ key ] = true;
    
  });
  document.body.addEventListener( 'keyup', function(e) {
    
    const key = e.code.replace('Key', '').toLowerCase();
    if ( keys[ key ] !== undefined )
      keys[ key ] = false;
    
  });

}


const collisionWalls = [];
const collisionBoxes = [];
const characterBox = new THREE.Box3();
const targetBox = new THREE.Box3();
const modalContent = {
    
    headshot: {
        title: "Project One",
        content: "this is proejct one",  
       
},
    sign: {
        title: "Project One",
        content: "this is proejct one",  
        link: "https://example.com/", 
},
};
  const modal = document.querySelector('.modal');
const modalTitle = document.querySelector('.modal-title');
const modalProjectDescription = document.querySelector('.modal-project-description');
const modalExitButton = document.querySelector('.modal-exit-button');
const modalVisitProjectButton = document.querySelector('.modal-project-visit-button');

function showModal(id) {
    const content = modalContent[id];
    if(content) {
        modalTitle.textContent = content.title;
        modalProjectDescription.textContent = content.content;
        if (content.link) {
            modalVisitProjectButton.href = content.link;
            modalVisitProjectButton.classList.remove("hidden");
        }else{
            modalVisitProjectButton.classList.remove("hidden");
        }
        modal.classList.toggle("hidden");
        
    }
}

function hideModal() {
    modal.classList.toggle("hidden");
}


 
let intersectObject = '';
const renderer = new THREE.WebGLRenderer( {canvas: canvas, antialias: true} );
renderer.setSize( sizes.width, sizes.height );
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
//document.body.appendChild( renderer.domElement );
renderer.shadowMap.enabled = true;
const loader = new GLTFLoader();
const intersectObjects = [];
const intersectObjectsNames = [
    "juan",
    "headshot",
    "sign",
];

loader.load(
    "./portfolio2.glb", 
    function (gltf) {
    const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
    if (!root) {
        console.error("GLTF load succeeded, but no scene was found.");
        return;
    }
    root.traverse((child) => {
        console.log(child);
        if (intersectObjectsNames.includes(child.name)) {
            intersectObjects.push(child);
        }

        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }

        if (child.name === "character") {
            character.instance = child;
        }
        if (child.name === "collision_wall") {
            collisionWalls.push(child);
            child.visible = false;
        }
    });
        if (character.instance) {
            character.container.add(character.instance);
            character.instance.add(characterLight);
        }
        scene.add(root);
        collisionBoxes.length = 0;
        for (const wall of collisionWalls) {
            collisionBoxes.push(new THREE.Box3().setFromObject(wall));
        }
    },
    undefined,
    function(error) {
        console.error(error);
    }
);

 
 
function handleResize() {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function onPointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick() {
    if (intersectObject !== "" ) {
        showModal(intersectObject);
    }
}
const stars = createStarField(4000, 360);
function createStarField(count, radius) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        const i3 = i * 3;
        positions[i3 + 0] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;

        const tint = Math.random();
        const base = tint < 0.2 ? [0.8, 0.9, 1.0] : tint < 0.35 ? [1.0, 0.96, 0.88] : [1.0, 1.0, 1.0];
        colors[i3 + 0] = base[0];
        colors[i3 + 1] = base[1];
        colors[i3 + 2] = base[2];

        sizes[i] = tint < 0.05 ? 3.4 : tint < 0.2 ? 2.6 : 1.8;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            uniform float uTime;
            varying vec3 vColor;
            void main() {
                vColor = color;
                float twinkle = 0.7 + 0.3 * sin(uTime + position.x * 0.02 + position.y * 0.015);
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * twinkle * (360.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                vec2 uv = gl_PointCoord - vec2(0.5);
                float d = length(uv);
                float alpha = smoothstep(0.6, 0.0, d);
                gl_FragColor = vec4(vColor * 1.1, alpha);
            }
        `,
    });

    const points = new THREE.Points(geometry, material);
    points.renderOrder = -5;
    return points;
}

const amColor = 0x0a0d1a;
const amIntensity = 0.5;
const ambientLight = new THREE.AmbientLight(amColor, amIntensity);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x0a1a3a, 0x02030a, 0.6);
scene.add(hemiLight);

const moonLight = new THREE.DirectionalLight(0xb0c6ff, 0.6);
moonLight.position.set(-6, 8, -4);
scene.add(moonLight);

const skyGroup = new THREE.Group();
scene.add(skyGroup);

const skyGeometry = new THREE.SphereGeometry(400, 48, 32);
const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
        uTopColor: { value: new THREE.Color(0x0a1022) },
        uBottomColor: { value: new THREE.Color(0x020309) },
    },
    vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vWorldPosition;
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        void main() {
            float h = normalize(vWorldPosition).y * 0.5 + 0.5;
            vec3 color = mix(uBottomColor, uTopColor, smoothstep(0.0, 1.0, h));
            gl_FragColor = vec4(color, 1.0);
        }
    `,
});
const skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
skyDome.renderOrder = -10;
skyGroup.add(skyDome);

 
skyGroup.add(stars);

const moon = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 32),
    new THREE.MeshStandardMaterial({
        color: 0xe6e9ff,
        emissive: 0x9fb2ff,
        emissiveIntensity: 0.6,
        roughness: 0.9,
    })
);
moon.position.set(-140, 70, -200);
skyGroup.add(moon);

const moonGlow = new THREE.Mesh(
    new THREE.SphereGeometry(16, 32, 32),
    new THREE.MeshBasicMaterial({
        color: 0xa8beff,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    })
);
moonGlow.position.copy(moon.position);
skyGroup.add(moonGlow);

const characterLight = new THREE.PointLight(0xbcd4ff, 1.4, 18, 2.2);
characterLight.position.set(0, 2.2, 0);
characterLight.castShadow = false;
scene.add(characterLight);

function canMoveTo(targetPosition) {
    if (collisionBoxes.length === 0 || !character.instance) return true;
    characterBox.setFromObject(character.instance);
    targetBox.copy(characterBox).translate(targetPosition.clone().sub(character.container.position));
    for (const wallBox of collisionBoxes) {
        if (targetBox.intersectsBox(wallBox)) {
            return false;
        }
    }
    return true;
}
 
/*
    if (canMoveTo(targetPosition)) {
        moveCharacter(targetPosition, targetRotation);
    }
    
*/
 
window.addEventListener("click", onClick);
window.addEventListener("resize", handleResize);
window.addEventListener("pointermove", onPointerMove);
modalExitButton.addEventListener("click", hideModal);
function animate() {
    const delta = clock.getDelta();
    stars.material.uniforms.uTime.value += delta;
    skyGroup.position.copy(camera.position);
   
    raycaster.setFromCamera( pointer, camera );
    const intersects = raycaster.intersectObjects(intersectObjects);

    if(intersects.length > 0) {
        document.body.style.cursor = 'pointer';
    } else {
        document.body.style.cursor = 'default';
        intersectObject = '';
    }

    for (let i = 0; i < intersects.length; i++) {
        intersectObject = intersects[0].object.parent.name;
    }

     requestAnimationFrame( animate );
    
  speed = 0.0;
  
  if ( keys.w )
    speed = 0.01;
  else if ( keys.s )
    speed = -0.01;

  velocity += ( speed - velocity ) * .3;
  if (character.instance) {
    const forward = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(character.container.quaternion)
      .multiplyScalar(velocity);
    const targetPosition = character.container.position.clone().add(forward);
    if (canMoveTo(targetPosition)) {
      character.container.position.copy(targetPosition);
    }
  }

  if ( keys.a )
    character.container.rotateY(0.05);
  else if ( keys.d )
    character.container.rotateY(-0.05);
    
  
  a.lerp(character.container.position, 0.4);
  b.copy(goal.position);
  
    dir.copy( a ).sub( b ).normalize();
    const dis = a.distanceTo( b ) - coronaSafetyDistance;
    goal.position.addScaledVector( dir, dis );
    goal.position.lerp(temp, 0.02);
    temp.setFromMatrixPosition(follow.matrixWorld);
    
    camera.lookAt( character.container.position );
 
  renderer.render( scene, camera );
}
renderer.setAnimationLoop( animate ); 

init();
animate();
