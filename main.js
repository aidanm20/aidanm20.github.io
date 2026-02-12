import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";


const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06070f);

const canvas = document.getElementById("experience-canvas");

const targetQuat = new THREE.Quaternion();
const currentQuat = new THREE.Quaternion();
const yAxis = new THREE.Vector3(0, 1, 0);
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};
let charYaw = 0;

const clock = new THREE.Clock();

const actions = {};


let character = {
  instance: null,
  container: new THREE.Object3D(),
  moveDistance: 3,
  jumpHeight: 1,
  isMoving: false,
  moveDuration: 0.15,
};

const gloTextMats = [];
const gloPulse = {
  base: 0.4,   // minimum intensity
  amp: 1,    // how much it swings
  speed: 2,  // pulse speed  
};

let camera, goal, keys, follow, headFollow, mixer, fsm, action;
let temp = new THREE.Vector3;
let stop = 1;
let DEGTORAD = 0.01745327;
let newPosition = new THREE.Vector3();
let dir = new THREE.Vector3();
let cameraTarget = new THREE.Vector3();
let desiredCameraPos = new THREE.Vector3();
let desiredTargetPos = new THREE.Vector3();
let velocity = 0.0;
let speed = 0.0;
let cameraOffset = new THREE.Vector3(0, 2, -6);
let targetOffset = new THREE.Vector3(0, 1.5, 0);
let worldCameraOffset = new THREE.Vector3();
const forward = new THREE.Vector3();

let angle = 0;
let cameraSpeed = 0.03;
let cameraAngle = 0;
let desiredYaw = 0; 

let a = new THREE.Vector3;
let b = new THREE.Vector3;
let coronaSafetyDistance = 0.3;

// ------------------- Renderer -------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.autoClear = false;

const params = {
  threshold: 0,
  strength: 1,
  radius: 0.5,
  exposure: 1.5,
  Object_11: true,
  Object_12: false,
  Object_13: true,
  Object_14: true,
};

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = params.exposure;
renderer.outputColorSpace = THREE.SRGBColorSpace;
// ------------------- Init Camera / Controls -------------------
function init() {
  camera = new THREE.PerspectiveCamera(70, sizes.width / sizes.height, 0.01, 1000);
  camera.position.set(1, 14, 4);
  camera.lookAt(0, 1, 0);

  goal = new THREE.Object3D;
    follow = new THREE.Object3D;  
    follow.position.set(0, 2, -6);   // (up, back)
scene.add(goal);
goal.add(follow)
 
 
  scene.add(character.container);

  keys = { a: false, s: false, d: false, w: false };

  document.body.addEventListener("keydown", (e) => {
    const key = e.code.replace("Key", "").toLowerCase();
    if (keys[key] !== undefined) keys[key] = true;
  });

  document.body.addEventListener("keyup", (e) => {
    const key = e.code.replace("Key", "").toLowerCase();
    if (keys[key] !== undefined) keys[key] = false;
  });
}

 

// ------------------- Basic Lights -------------------
const ambientLight = new THREE.AmbientLight(0x0a0d1a, 0.5);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x0a1a3a, 0x02030a, 0.6);
scene.add(hemiLight);

const moonLight = new THREE.DirectionalLight(0xb0c6ff, 0.6);
moonLight.position.set(-6, 8, -4);
scene.add(moonLight);

const characterLight = new THREE.PointLight(0xbcd4ff, 2, 40, 2);
//characterLight.position.set(0, 2.2, 0);
characterLight.castShadow = false;
scene.add(characterLight);

// collision detection

// Bloom
renderer.outputColorSpace = THREE.SRGBColorSpace;

let bloomComposer;
let bloomPass;
let finalComposer;

function initPostprocessing() {
  const bloomRender = new RenderPass(scene, camera);
  bloomComposer = new EffectComposer(renderer);
  bloomComposer.addPass(bloomRender);

  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.02,
    0.08
  );
  bloomComposer.addPass(bloomPass);
  bloomComposer.renderToScreen = false;

  const mixPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: bloomComposer.renderTarget2.texture },
      },
      vertexShader: document.getElementById("vertexshader").textContent,
      fragmentShader: document.getElementById("fragmentshader").textContent,
    }),
    "baseTexture"
  );

  const finalRender = new RenderPass(scene, camera);
  finalComposer = new EffectComposer(renderer);
  finalComposer.addPass(finalRender);
  finalComposer.addPass(mixPass);

  const outputPass = new OutputPass();
  finalComposer.addPass(outputPass);
}

const BLOOM_SCENE = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);

const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const materials = {};
const visibility = {};

function nonBloomed(obj) {
  if (bloomLayer.test(obj.layers)) return;

  if (obj.isMesh) {
    materials[obj.uuid] = obj.material;
    obj.material = darkMaterial;
    return;
  }

  if (obj.isPoints || obj.isLine || obj.isSprite) {
    visibility[obj.uuid] = obj.visible;
    obj.visible = false;
  }
}

function restoreMaterial(obj) {
  if (materials[obj.uuid]) {
    obj.material = materials[obj.uuid];
    delete materials[obj.uuid];
  }

  if (visibility[obj.uuid] !== undefined) {
    obj.visible = visibility[obj.uuid];
    delete visibility[obj.uuid];
  }
}



// ------------------- Starfield + Sky -------------------
const skyGroup = new THREE.Group();
scene.add(skyGroup);

function createStarField(count, radius) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizesAttr = new Float32Array(count);

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

    sizesAttr[i] = tint < 0.05 ? 3.4 : tint < 0.2 ? 2.6 : 1.8;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizesAttr, 1));

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

const stars = createStarField(4000, 360);
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
moon.position.set(-140, 100, -200);
skyGroup.add(moon);

 
 
 

// ------------------- GLTF -------------------
let collision = null;
let lanterns = [];
let trees= [];

const charLoader = new FBXLoader();
charLoader.setPath('./char/');
charLoader.load('portCharEx.fbx', (fbx) => {
 
  const model = fbx;
character.instance = model;
character.container.add(model);
//character.container.add(new THREE.AxesHelper(1));


  

// 1) Update world matrices so Box3 is accurate
model.updateMatrixWorld(true);

// 2) Scale to visible size
let box = new THREE.Box3().setFromObject(model);
let size = new THREE.Vector3();
box.getSize(size);

const maxAxis = Math.max(size.x, size.y, size.z);
if (maxAxis > 0) {
  const targetSize = 3.5;
  const scale = targetSize / maxAxis;
  model.scale.setScalar(scale);
}

// 3) Recompute box AFTER scaling
model.updateMatrixWorld(true);
box = new THREE.Box3().setFromObject(model);

// 4) Center model XZ on origin (so yaw rotates in place)
const center = new THREE.Vector3();
box.getCenter(center);
model.position.x -= center.x;
model.position.z -= center.z;

// 5) Put feet on ground (pivot at feet)
model.updateMatrixWorld(true);
box = new THREE.Box3().setFromObject(model);
model.position.y -= box.min.y;      // bottom to y=0
model.position.y += 0.25;           // your small lift (optional)
model.position.x -= 1.7
model.position.z += .3

// Recompute matrices after reposition
model.updateMatrixWorld(true);


  //Animations
  mixer = new THREE.AnimationMixer( model );

    const manager = new THREE.LoadingManager();
    manager.onLoad = () => {
        
      fsm = new stateMachine(actions);
      fsm.set('idle', 0.0);
    };

    const animLoader = new FBXLoader(manager);
    animLoader.setPath('./char/');

    const loadAnim = (name, animFbx) => {
    const clip = animFbx.animations[0];
    actions[name] = mixer.clipAction(clip);
     
    if (name === 'walk') {
      actions[name].setLoop(THREE.LoopRepeat);
      actions[name].clampWhenFinished = false;
    }
    };

  animLoader.load('portIdle.fbx', (a) => loadAnim('idle', a));
  animLoader.load('portWalk.fbx', (a) => loadAnim('walk', a));

 
})
 
//STATEMACHINE

class stateMachine {
    constructor(actions) {
        this.actions = actions;
        this.current = null;
    }

    set(name, fade = .15) {
        const next = this.actions[name];
        if (!next ) return;
        if (this.current === next) return;

        next.reset();
        next.play();

        if(this.current) {
            this.current.crossFadeTo(next,fade,false);
        }
        this.current = next;
    }

    update(input) {
        if (speed == 0) {
            this.set('idle');
            return;
        } else if (speed != 0) {
          this.set('walk');
            return;
        }

        
    }
}

function cloneTree(baseTree, {
  positions = [],
  lightCol = [],               
  leafCol = [],                  
  leafMatNames = ["lightPinkTree"],  
   
  randomYaw = true,
  addBloom = true,
  lightIntensity = 8,
  lightDistance = 100,
  lightDecay = 2,
  bloomIntensity = [],

} = {}) {
  const clones = [];

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const t = baseTree.clone(true);

    // remove any lights cloned from baseTree
    const lights = [];
    t.traverse((o) => { if (o.isLight) lights.push(o); });
    lights.forEach((l) => l.parent?.remove(l));

    // random rotation
    if (randomYaw) t.rotation.y = Math.random() * Math.PI * 2;

    // position
    t.position.copy(p);

    // bloom layers (not inherited)
     
    if (addBloom) {
      t.layers.enable(BLOOM_SCENE);
      t.traverse((d) => d.layers.enable(BLOOM_SCENE));
    }
    
    // recolor leaves (clone only those materials)
    const leafColor = leafCol[i];
    if (leafColor) {
      t.traverse((child) => {
        if (!child.isMesh || !child.material) return;

        const mats = Array.isArray(child.material) ? child.material : [child.material];

        for (let mi = 0; mi < mats.length; mi++) {
          const m = mats[mi];
          if (!m || !leafMatNames.includes(m.name)) continue;

          const nm = m.clone();
          if (nm.color) nm.color.set(leafColor);
          
          if (!nm.emissive) nm.emissive = new THREE.Color(0x000000);
          nm.emissive.set(leafColor);
          nm.emissiveIntensity = bloomIntensity[i] ?? (m.emissiveIntensity ?? 0.3);
          nm.needsUpdate = true;

          if (Array.isArray(child.material)) child.material[mi] = nm;
          else child.material = nm;
        }
      });
    }

    // add per-clone light
    const lc = lightCol[i];
    if (lc) {
      const light = new THREE.PointLight(lc, lightIntensity, lightDistance, lightDecay);
      light.position.set(0, -1, 0);
      t.add(light);
    }

    scene.add(t);
    clones.push(t);
  }

  return clones;
}


const loader = new GLTFLoader();
const dLoader = new DRACOLoader();
dLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
dLoader.setDecoderConfig({type: 'js'});
loader.setDRACOLoader(dLoader);

 
loader.load(
  "./portfolio2comp2.glb",
  (gltf) => {
    const root = gltf.scene;
    if (!root) {
      console.error("GLTF load succeeded, but no scene was found.");
      return;
    }
    console.log(root)
    collision = root.getObjectByName('collision_wall');
     
    console.log(collision)
    collision.visible = false;

    root.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((m) => {
          if (m?.name === "yellowCol") {
            // Ensure emissive is non-black so intensity has visible effect.
            if (!m.emissive) m.emissive = new THREE.Color(0x000000);
            if (m.emissive.getHex() === 0x000000) m.emissive.setHex(0xffd38a);
            m.emissiveIntensity = .2;
            m.needsUpdate = true;
          }

          if (m?.name === "lightPinkTree") {
            // Ensure emissive is non-black so intensity has visible effect.
            if (!m.emissive) m.emissive = new THREE.Color(0x000000);
            if (m.emissive.getHex() === 0x000000) m.emissive.setHex('#E77B77');
            m.emissiveIntensity = 0.33;
            m.needsUpdate = true;
          }
        });
      }
      if (child.name.startsWith('lantern')) {
        lanterns.push(child);
 
        child.layers.enable(BLOOM_SCENE);
        const light = new THREE.PointLight(0xffc46a, .5, 10, 1);  
        light.position.set(0, -1, 0);
        child.add(light);
        child.traverse((desc) => desc.layers.enable(BLOOM_SCENE));
      }

      if (child.name === 'gloText') {
          child.castShadow = false;
          child.receiveShadow = false;

          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];

          mats.forEach((m) => {
            if (!m) return;

            if (!m.emissive) m.emissive = new THREE.Color();

            
            m.emissive.set('#56fc98');   
            m.emissiveIntensity = .7;   

            m.toneMapped = false;       
            m.needsUpdate = true;
            gloTextMats.push(m);
          });

          /*
          child.layers.enable(BLOOM_SCENE);
          child.traverse((d) => d.layers.enable(BLOOM_SCENE));*/
      }

      if (child.name === 'fishingImg' || child.name === 'belongingImg') {
  child.castShadow = false;
  child.receiveShadow = false;

  const mats = Array.isArray(child.material) ? child.material : [child.material];

  mats.forEach((m) => {
    if (!m) return;
 
    if (m.map) m.emissiveMap = m.map;

    if (!m.emissive) m.emissive = new THREE.Color(0xffffff);
    m.emissive.set(0xffffff);
    m.emissiveIntensity = .7;    

 
    m.toneMapped = false;

    m.needsUpdate = true;
  }); 
}

      if (child.name.startsWith('pinkTree')) {
        trees.push(child);
  
        child.layers.enable(BLOOM_SCENE);
        const light = new THREE.PointLight('#E77B77FF', 8, 100, 2); 
        light.position.set(0, -1, 0);
        child.add(light);
        child.traverse((desc) => desc.layers.enable(BLOOM_SCENE));

         cloneTree(child, {
          positions: [
            new THREE.Vector3(-16, -0.7, 14),
            new THREE.Vector3(15, -0.7, 46),
            new THREE.Vector3(-15, -0.7, 46),
          ],

     
          leafCol:  ['#10E780', '#51D3E7', '#E7B553'],
          lightCol: ['#10E780', '#51D3E7', '#E7B553'],

          leafMatNames: ["lightPinkTree"], 
          randomYaw: true,
          bloomIntensity: [0.15, 0.12, .13], //green, blue, yellow
        });
      }


      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }

       if (child.name === "collision_wall") {
        console.log('ih')
      }

    });

    scene.add(root);
  },
  undefined,
  (error) => console.error(error)
);

 

// ------------------- Interaction -------------------
// ------------------- Resize -------------------
function handleResize() {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  if (!camera) return;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  if (bloomComposer) bloomComposer.setSize(sizes.width, sizes.height);
  if (finalComposer) finalComposer.setSize(sizes.width, sizes.height);
  if (bloomPass) bloomPass.setSize(sizes.width, sizes.height);
}

window.addEventListener("resize", handleResize);
let keyPressed, moveDir;



// ------------------- Animate -------------------
function animate() {
  const delta = clock.getDelta();
  stars.material.uniforms.uTime.value += delta;
  //requestAnimationFrame(animate);
  skyGroup.position.copy(camera.position);

  const t = clock.getElapsedTime();
  const pulse = gloPulse.base + gloPulse.amp * (0.5 + 0.5 * Math.sin(t * gloPulse.speed));

  for (const m of gloTextMats) {
    m.emissiveIntensity = pulse;
  }

  characterLight.position.copy(character.container.position);
  characterLight.position.y += 1.8;

  // movement + smooth facing
  speed = 0.0;
  moveDir = 0;
  keyPressed = null;
    
  if ( keys.w ) { 
    //speed += 0.02;
    speed += .05;
    moveDir = 1;
    keyPressed = 'w'
  }
   if ( keys.s ){
    speed += -0.05 ;
    moveDir = -1;
    keyPressed = 's'
  }
  if (character.container) {
    // --- rotate first ---
const turnSpeed = 2.5;
if (keys.a) charYaw += turnSpeed * delta;
if (keys.d) charYaw -= turnSpeed * delta;

character.container.rotation.set(0, charYaw, 0);

// --- smooth velocity ---
velocity += (speed - velocity) * 0.1;
if (Math.abs(velocity) < 0.0001) velocity = 0;

// --- move using world forward direction ---
forward.set(0, 0, 1).applyQuaternion(character.container.quaternion);
character.container.position.addScaledVector(forward, velocity);



    // --- smooth rig position to character ---
    goal.position.lerp(character.container.position, 0.12);

    // --- smooth rig yaw to character yaw ---
    //const charYaw = character.container.rotation.y;
    targetQuat.setFromAxisAngle(yAxis, charYaw);
    goal.quaternion.slerp(targetQuat, 1 - Math.pow(0.001, delta));

    // --- camera goes to follow point (rotated offset behind player) ---
    follow.getWorldPosition(desiredCameraPos);
    camera.position.lerp(desiredCameraPos, 0.12);

    // --- look at player (slightly above center) ---
    desiredTargetPos.copy(character.container.position).add(targetOffset);
    camera.lookAt(desiredTargetPos);
  }
 

  // animation mixer
   
  if (mixer) mixer.update(delta);
  if (fsm) fsm.update();
  
  const walk = actions.walk;

  if (walk && speed !== 0) {
    const newScale = moveDir === -1 ? -1 : 1;

    if (walk.timeScale !== newScale) {
      walk.timeScale = newScale;

      // Start at end if reversing, start at 0 if forward
      const dur = walk.getClip().duration;
      walk.time = (newScale < 0) ? dur : 0;
    }
  }


     
  

  if (bloomComposer && finalComposer) {
    renderer.clear();
    scene.traverse(nonBloomed); // black out non bloom objects
    bloomComposer.render(); // Render bloom scene
    scene.traverse(restoreMaterial); // restore materials from black

    finalComposer.render(); // render combined scene
  }

}

// ------------------- Start -------------------
if (!canvas) {
  console.error('Canvas with id="experience-canvas" not found.');
} else {
  init();
  initPostprocessing();
  renderer.setAnimationLoop(animate);
}
