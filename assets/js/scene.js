(function(){
  'use strict';
  var page = document.body.dataset.page || 'home';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  var mobile = window.innerWidth < 760;
  var userPaused = !!(window.__siteMotion && window.__siteMotion.paused);
  var motionPaused = reduceMotion || userPaused;
  var rafId = 0;
  var lastFrame = performance.now();

    var canvas = document.getElementById('hero-canvas');
    var motionButton = document.getElementById('motion-toggle');
    var renderer, scene, camera, world, engine, portraitRig, membrane, shards, particles, rimLight, pointLight;
    var pointer = { x:0, y:0, targetX:0, targetY:0 };
    var clockTime = 0;
    var canWebGL = !!(canvas && window.THREE);

    function disableWebGL(){
      canWebGL = false;
      document.body.classList.add('no-webgl');
      if (canvas) canvas.hidden = true;
    }

    function makeMaterial(color, emissive, options){
      options = options || {};
      return new THREE.MeshPhysicalMaterial({
        color:color,
        emissive:emissive || 0x000000,
        emissiveIntensity:options.emissiveIntensity || 0,
        metalness:options.metalness === undefined ? .45 : options.metalness,
        roughness:options.roughness === undefined ? .28 : options.roughness,
        transmission:options.transmission || 0,
        transparent:!!options.transparent,
        opacity:options.opacity === undefined ? 1 : options.opacity,
        side:options.side || THREE.FrontSide,
        clearcoat:options.clearcoat || 0,
        clearcoatRoughness:.22,
        depthWrite:options.depthWrite === undefined ? true : options.depthWrite
      });
    }

    function createEngine(){
      world = new THREE.Group();
      engine = new THREE.Group();
      world.add(engine);
      scene.add(world);

      var metal = makeMaterial(0x16232a, 0x061014, { metalness:.9, roughness:.2, clearcoat:.55 });
      var cyanGlass = makeMaterial(0x17434b, 0x19a6bf, { emissiveIntensity:.38, metalness:.25, roughness:.12, transmission:.18, transparent:true, opacity:.78, clearcoat:.9 });
      var orangeMetal = makeMaterial(0x6c2119, 0xff4f32, { emissiveIntensity:.4, metalness:.68, roughness:.24, clearcoat:.4 });
      var acidGlass = makeMaterial(0x5f7520, 0xb8f032, { emissiveIntensity:.8, metalness:.2, roughness:.1, transmission:.14, transparent:true, opacity:.9, clearcoat:.9 });

      var backShell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.16, 3), metal);
      backShell.scale.set(1,1,.7);
      engine.add(backShell);

      var core = new THREE.Mesh(new THREE.OctahedronGeometry(.55, 2), acidGlass);
      core.rotation.set(.34,.5,.1);
      engine.add(core);

      var wire = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.29, 2),
        new THREE.MeshBasicMaterial({ color:0x78e8ff, wireframe:true, transparent:true, opacity:.24, blending:THREE.AdditiveBlending })
      );
      wire.scale.z = .75;
      engine.add(wire);
      engine.userData.wire = wire;
      engine.userData.core = core;

      var ringGeometry = new THREE.TorusGeometry(2.12,.035,12,mobile ? 96 : 180);
      var ringMaterials = [cyanGlass,metal,orangeMetal,cyanGlass];
      var ringRotations = [[0,0,0],[Math.PI/2,.28,.16],[.42,Math.PI/2,.12],[-.7,.35,.9]];
      engine.userData.rings = [];
      ringRotations.forEach(function(rotation,index){
        var ring = new THREE.Mesh(ringGeometry,ringMaterials[index]);
        ring.rotation.set(rotation[0],rotation[1],rotation[2]);
        ring.scale.setScalar(1 + index * .12);
        engine.add(ring);
        engine.userData.rings.push(ring);
      });

      var knot = new THREE.Mesh(
        new THREE.TorusKnotGeometry(1.63,.023,mobile ? 100 : 220,8,3,5),
        new THREE.MeshStandardMaterial({ color:0xff775c,emissive:0xff3d22,emissiveIntensity:.65,metalness:.7,roughness:.18 })
      );
      knot.rotation.x = .8;
      engine.add(knot);
      engine.userData.knot = knot;

      membrane = new THREE.Mesh(
        new THREE.SphereGeometry(1.46,mobile ? 28 : 48,mobile ? 18 : 32),
        new THREE.ShaderMaterial({
          uniforms:{ uTime:{ value:0 },uCyan:{ value:new THREE.Color(0x78e8ff) },uOrange:{ value:new THREE.Color(0xff775c) } },
          vertexShader:[
            'uniform float uTime;',
            'varying vec3 vNormal;',
            'varying vec3 vView;',
            'void main(){',
            '  float wave=sin(position.y*5.0+uTime*1.6)*0.025+sin(position.x*7.0-uTime)*0.016;',
            '  vec3 p=position+normal*wave;',
            '  vec4 mv=modelViewMatrix*vec4(p,1.0);',
            '  vNormal=normalize(normalMatrix*normal);',
            '  vView=normalize(-mv.xyz);',
            '  gl_Position=projectionMatrix*mv;',
            '}'
          ].join('\n'),
          fragmentShader:[
            'uniform float uTime;',
            'uniform vec3 uCyan;',
            'uniform vec3 uOrange;',
            'varying vec3 vNormal;',
            'varying vec3 vView;',
            'void main(){',
            '  float fresnel=pow(1.0-max(dot(vNormal,vView),0.0),2.4);',
            '  float pulse=0.5+0.5*sin(uTime*1.4+vNormal.y*8.0);',
            '  vec3 color=mix(uCyan,uOrange,pulse*.32);',
            '  gl_FragColor=vec4(color,fresnel*.36+pulse*.025);',
            '}'
          ].join('\n'),
          transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending
        })
      );
      engine.add(membrane);

      var shardCount = mobile ? 70 : 150;
      var shardGeometry = new THREE.TetrahedronGeometry(.055,0);
      shards = new THREE.InstancedMesh(shardGeometry,cyanGlass,shardCount);
      var dummy = new THREE.Object3D();
      for (var i=0;i<shardCount;i++){
        var phi = Math.acos(1-2*(i+.5)/shardCount);
        var theta = Math.PI*(1+Math.sqrt(5))*i;
        var radius = 2.75 + .75*Math.sin(i*4.37);
        dummy.position.set(Math.sin(phi)*Math.cos(theta)*radius,Math.cos(phi)*radius*.82,Math.sin(phi)*Math.sin(theta)*radius);
        dummy.rotation.set(theta,phi,i*.43);
        dummy.scale.setScalar(.55+(i%9)*.07);
        dummy.updateMatrix();
        shards.setMatrixAt(i,dummy.matrix);
      }
      shards.instanceMatrix.needsUpdate = true;
      engine.add(shards);

      var slabGeometry = new THREE.BoxGeometry(.67,.92,.055);
      var edgeGeometry = new THREE.EdgesGeometry(slabGeometry);
      var slabMaterial = makeMaterial(0x0b2029,0x0c6070,{ emissiveIntensity:.24,metalness:.35,roughness:.12,transmission:.18,transparent:true,opacity:.58,clearcoat:.8 });
      var edgeMaterial = new THREE.LineBasicMaterial({color:0x78e8ff,transparent:true,opacity:.28});
      engine.userData.slabs = [];
      for (var s=0;s<7;s++){
        var slabRig = new THREE.Group();
        var angle = s/7*Math.PI*2;
        slabRig.position.set(Math.cos(angle)*3.22,Math.sin(angle*2)*.82,Math.sin(angle)*3.22);
        slabRig.lookAt(0,0,0);
        var slab = new THREE.Mesh(slabGeometry,slabMaterial);
        var edges = new THREE.LineSegments(edgeGeometry,edgeMaterial);
        slabRig.add(slab,edges);
        engine.add(slabRig);
        engine.userData.slabs.push(slabRig);
      }

      var particleCount = mobile ? 380 : 920;
      var particlePositions = new Float32Array(particleCount*3);
      for (var p=0;p<particleCount;p++){
        var pr = 4.5+Math.random()*13;
        var pa = Math.random()*Math.PI*2;
        var py = (Math.random()-.5)*10;
        particlePositions[p*3]=Math.cos(pa)*pr;
        particlePositions[p*3+1]=py;
        particlePositions[p*3+2]=Math.sin(pa)*pr;
      }
      var particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));
      particles = new THREE.Points(particleGeometry,new THREE.PointsMaterial({color:0x78e8ff,size:mobile?.018:.026,transparent:true,opacity:.42,depthWrite:false,blending:THREE.AdditiveBlending}));
      scene.add(particles);

      var grid = new THREE.GridHelper(34,34,0x16404a,0x0a1c21);
      grid.position.y=-4.4;
      grid.material.transparent=true;
      grid.material.opacity=.28;
      scene.add(grid);
      engine.userData.grid=grid;

      createPortraitRig(metal,cyanGlass,orangeMetal);
    }

    function createPortraitRig(metal,cyanGlass,orangeMetal){
      portraitRig = new THREE.Group();
      portraitRig.position.z=.42;
      engine.add(portraitRig);

      var backing = new THREE.Mesh(new THREE.BoxGeometry(1.74,1.74,.18),metal);
      backing.position.z=-.06;
      portraitRig.add(backing);

      var railGeometryHorizontal = new THREE.BoxGeometry(1.96,.055,.09);
      var railGeometryVertical = new THREE.BoxGeometry(.055,1.96,.09);
      [[railGeometryHorizontal,0,.94],[railGeometryHorizontal,0,-.94],[railGeometryVertical,.94,0],[railGeometryVertical,-.94,0]].forEach(function(item,index){
        var rail = new THREE.Mesh(item[0],index===1?orangeMetal:cyanGlass);
        rail.position.set(item[1],item[2],.06);
        portraitRig.add(rail);
      });
      var placeholder = new THREE.Mesh(new THREE.PlaneGeometry(1.64,1.64),new THREE.MeshStandardMaterial({color:0x132026,emissive:0x0a2b35,emissiveIntensity:.35,roughness:.34,metalness:.32}));
      placeholder.position.z=.06;
      portraitRig.add(placeholder);
      portraitRig.userData.portrait=placeholder;

      var plateGeometry = new THREE.BoxGeometry(.36,.035,.04);
      for(var i=0;i<6;i++){
        var tick=new THREE.Mesh(plateGeometry,i===0?orangeMetal:cyanGlass);
        tick.position.set(-1.15+i*.46,-1.16,.1);
        tick.scale.x=i===0?1.8:.6;
        portraitRig.add(tick);
      }
      buildPortraitTexture(placeholder);
    }

    function buildPortraitTexture(portraitMesh){
      var loader = new THREE.TextureLoader();
      loader.load('assets/images/portrait-primitive.svg', function(texture){
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        portraitMesh.material.dispose();
        portraitMesh.material = new THREE.MeshPhysicalMaterial({
          map:texture, emissive:0x071016, emissiveMap:texture, emissiveIntensity:.16,
          roughness:.37, metalness:.15, clearcoat:.55, clearcoatRoughness:.3
        });
        document.body.classList.add('portrait-textured');
        renderStatic();
      }, undefined, function(){ /* Accessible DOM image remains visible. */ });
    }

    function applyPageComposition(){
      if (!engine) return;
      if (page !== 'home' && portraitRig) portraitRig.visible = false;
      if (page === 'projects'){
        engine.userData.slabs.forEach(function(slab,index){
          var angle = index / engine.userData.slabs.length * Math.PI * 2;
          slab.position.set(Math.cos(angle) * 2.85, (index - 3) * .34, Math.sin(angle) * 2.85);
          slab.scale.set(1.18, 1.18, 1.18);
        });
        engine.rotation.set(.15,.55,.08);
      } else if (page === 'experience'){
        engine.userData.slabs.forEach(function(slab,index){
          var angle = index * .82;
          slab.position.set(Math.cos(angle) * 2.35, (index - 3) * .72, Math.sin(angle) * 2.35);
          slab.rotation.z = index * .22;
        });
        engine.userData.rings.forEach(function(ring,index){ ring.scale.setScalar(.76 + index * .2); });
        engine.rotation.set(.25,-.7,-.2);
      } else if (page === 'contact'){
        engine.userData.slabs.forEach(function(slab){ slab.visible = false; });
        if (shards) shards.scale.setScalar(.58);
        engine.userData.rings.forEach(function(ring,index){
          ring.rotation.set(index % 2 ? Math.PI / 2 : 0, index % 2 ? 0 : Math.PI / 2, 0);
          ring.scale.setScalar(.72 + index * .18);
        });
        engine.rotation.set(.02,0,0);
      }
    }

    function initScene(){
      if(!canWebGL){ disableWebGL(); return; }
      try{
        renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:!mobile,alpha:false,powerPreference:'high-performance'});
      }catch(error){ disableWebGL(); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobile?1.25:1.5));
      renderer.setSize(window.innerWidth,window.innerHeight,false);
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.18;

      scene=new THREE.Scene();
      scene.background=new THREE.Color(0x030609);
      scene.fog=new THREE.FogExp2(0x030609,mobile?.047:.038);
      camera=new THREE.PerspectiveCamera(mobile?48:42,window.innerWidth/window.innerHeight,.1,70);
      camera.position.set(0,0,mobile?10.6:10.2);

      scene.add(new THREE.HemisphereLight(0x8bddeb,0x030609,.62));
      var keyLight=new THREE.DirectionalLight(0xf0f0e8,2.4);
      keyLight.position.set(-4,6,5);scene.add(keyLight);
      rimLight=new THREE.DirectionalLight(0xff684f,3.4);
      rimLight.position.set(5,-2,-1);scene.add(rimLight);
      pointLight=new THREE.PointLight(0x78e8ff,18,14,2);
      pointLight.position.set(2.8,1.2,3.5);scene.add(pointLight);

      createEngine();
      applyPageComposition();
      var startX = mobile ? 0 : (page === 'contact' ? 2.8 : page === 'experience' ? 3.1 : page === 'projects' ? 2.7 : 2.55);
      var startY = mobile ? -.95 : (page === 'contact' ? 0 : .1);
      world.position.set(startX,startY,0);
      world.scale.setScalar(mobile?.72:1);
      world.rotation.set(.12,-.42,.03);
      if(reduceMotion) world.rotation.set(.18,.56,-.08);
      document.body.classList.add('webgl-ready');
      resizeScene();
      renderStatic();
      if(!motionPaused) startLoop();
      window.__spatialState={renderer:renderer,scene:scene,camera:camera,engine:engine,get paused(){return motionPaused;}};
    }

    function resizeScene(){
      if(!renderer||!camera)return;
      mobile=window.innerWidth<760;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobile?1.25:1.5));
      renderer.setSize(window.innerWidth,window.innerHeight,false);
      camera.aspect=window.innerWidth/window.innerHeight;
      camera.fov=mobile?48:42;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize',resizeScene,{passive:true});

    function renderStatic(){ if(renderer&&scene&&camera)renderer.render(scene,camera); }
    function startLoop(){
      if(rafId||motionPaused||document.hidden||!renderer)return;
      lastFrame=performance.now();
      rafId=requestAnimationFrame(animate);
    }
    function stopLoop(){ if(rafId){cancelAnimationFrame(rafId);rafId=0;} }
    function animate(now){
      rafId=0;
      if(motionPaused||document.hidden||!renderer)return;
      var delta=Math.min(.035,(now-lastFrame)/1000);lastFrame=now;clockTime+=delta;
      pointer.x+=(pointer.targetX-pointer.x)*.045;
      pointer.y+=(pointer.targetY-pointer.y)*.045;
      engine.rotation.y+=delta*.075;
      engine.rotation.x+=(pointer.y*.12-engine.rotation.x)*.022;
      engine.userData.wire.rotation.x-=delta*.12;
      engine.userData.wire.rotation.y+=delta*.18;
      engine.userData.core.rotation.x+=delta*.22;
      engine.userData.core.rotation.y-=delta*.3;
      engine.userData.knot.rotation.y-=delta*.12;
      engine.userData.rings.forEach(function(ring,index){ring.rotation.z+=delta*(index%2?-.07:.09);ring.rotation.y+=delta*.025*(index+1);});
      engine.userData.slabs.forEach(function(slab,index){slab.rotation.z+=delta*(index%2?-.025:.018);});
      shards.rotation.y-=delta*.035;shards.rotation.x=Math.sin(clockTime*.22)*.08;
      particles.rotation.y+=delta*.006;
      portraitRig.rotation.y=Math.sin(clockTime*.42)*.035+pointer.x*.08;
      portraitRig.position.y=Math.sin(clockTime*.75)*.025;
      membrane.material.uniforms.uTime.value=clockTime;
      pointLight.position.x=2.4+Math.sin(clockTime*.7)*1.2;
      pointLight.position.y=1.1+Math.cos(clockTime*.52)*.8;
      camera.rotation.y+=(pointer.x*.012-camera.rotation.y)*.025;
      camera.rotation.x+=(-pointer.y*.008-camera.rotation.x)*.025;
      renderer.render(scene,camera);
      rafId=requestAnimationFrame(animate);
    }

    if(!reduceMotion&&window.matchMedia('(pointer:fine)').matches){
      window.addEventListener('pointermove',function(event){
        pointer.targetX=(event.clientX/window.innerWidth-.5)*2;
        pointer.targetY=(event.clientY/window.innerHeight-.5)*2;
      },{passive:true});
    }

    function setupGSAP(){
      if(reduceMotion||!window.gsap||!window.ScrollTrigger)return;
      gsap.registerPlugin(ScrollTrigger);
      var intro=gsap.timeline({defaults:{ease:'power3.out'}});
      intro.fromTo(world.scale,{x:.12,y:.12,z:.12},{x:mobile?.72:1,y:mobile?.72:1,z:mobile?.72:1,duration:1.65},0)
        .fromTo(world.rotation,{x:1.4,y:-2.3,z:.7},{x:.12,y:-.42,z:.03,duration:1.9},0)
        .fromTo('.identity-copy',{opacity:0,rotationY:-14,rotationX:7,z:-280},{opacity:1,rotationY:0,rotationX:0,z:0,duration:1.35},.18)
        .fromTo('.portrait-stage',{opacity:0,rotationY:24,rotationX:-8,z:-360},{opacity:document.body.classList.contains('portrait-textured')?.12:1,rotationY:0,rotationX:0,z:0,duration:1.45},.28)
        .fromTo('.hud-shell',{opacity:0,y:-30,rotationX:-30},{opacity:1,y:0,rotationX:0,duration:.8},.58);

      var stationStates=[
        {cam:[0,0,10.2],pos:[2.55,.1,0],rot:[.12,-.42,.03],fog:.038},
        {cam:[-.5,.2,9],pos:[2.2,-.25,-.4],rot:[.35,.3,.18],fog:.043},
        {cam:[.4,-.15,8.4],pos:[-2.25,.25,-.8],rot:[-.22,1.15,-.12],fog:.047},
        {cam:[0,.2,7.7],pos:[0,-.15,-1.15],rot:[.5,2.15,.22],fog:.035},
        {cam:[-.35,.35,8.5],pos:[2.1,.1,-.4],rot:[-.28,3.1,-.2],fog:.049},
        {cam:[.4,-.2,8.1],pos:[-2.0,.3,-.65],rot:[.2,4.05,.25],fog:.042},
        {cam:[-.25,.25,8.8],pos:[1.8,-.2,-.6],rot:[-.18,4.8,-.14],fog:.046},
        {cam:[0,0,7.2],pos:[0,.15,-.4],rot:[.05,6.25,0],fog:.03}
      ];
      if(mobile){stationStates.forEach(function(state,index){state.pos[0]=index%2?-.7:.7;state.pos[1]=-.75;state.cam[2]+=1.5;});}
      document.querySelectorAll('.sheet').forEach(function(section,index){
        var previous=stationStates[index],next=stationStates[index+1];
        var origin=index%2===0?'-12vw':'12vw';
        gsap.fromTo(section,{opacity:.1,x:origin,z:-420,rotationY:index%2===0?11:-11,rotationX:4,scale:.92},{
          opacity:1,x:0,z:0,rotationY:0,rotationX:0,scale:1,ease:'power2.out',
          scrollTrigger:{trigger:section,start:'top 92%',end:'top 58%',scrub:.85}
        });
        gsap.timeline({scrollTrigger:{trigger:section,start:'top bottom',end:'top 24%',scrub:1.25}})
          .fromTo(camera.position,{x:previous.cam[0],y:previous.cam[1],z:previous.cam[2]},{x:next.cam[0],y:next.cam[1],z:next.cam[2],ease:'none',immediateRender:false},0)
          .fromTo(world.position,{x:previous.pos[0],y:previous.pos[1],z:previous.pos[2]},{x:next.pos[0],y:next.pos[1],z:next.pos[2],ease:'none',immediateRender:false},0)
          .fromTo(world.rotation,{x:previous.rot[0],y:previous.rot[1],z:previous.rot[2]},{x:next.rot[0],y:next.rot[1],z:next.rot[2],ease:'none',immediateRender:false},0)
          .fromTo(scene.fog,{density:previous.fog},{density:next.fog,ease:'none',immediateRender:false},0);
      });

      gsap.fromTo('.class-item',{opacity:.08,z:-210,rotationY:-10},{opacity:1,z:0,rotationY:0,stagger:.09,ease:'power2.out',scrollTrigger:{trigger:'#sheet-02',start:'top 62%',end:'center 58%',scrub:.7}});
      gsap.fromTo('.fig-card',{opacity:.04,z:-460,rotationX:13,rotationY:function(index){return index%2?-16:16;}},{opacity:1,z:0,rotationX:0,rotationY:0,stagger:.1,ease:'power3.out',scrollTrigger:{trigger:'.fig-grid',start:'top 88%',end:'center 55%',scrub:1}});
      gsap.fromTo('.tl-item',{opacity:.12,z:-180,rotationX:8},{opacity:1,z:0,rotationX:0,stagger:.08,ease:'power2.out',scrollTrigger:{trigger:'.timeline',start:'top 85%',end:'center 60%',scrub:.8}});
      gsap.fromTo('.repo-register',{clipPath:'inset(0 0 100% 0)',z:-120,rotationX:6},{clipPath:'inset(0 0 0% 0)',z:0,rotationX:0,ease:'power2.inOut',scrollTrigger:{trigger:'.repo-register',start:'top 88%',end:'top 52%',scrub:.8}});
    }

    function setPaused(paused){
      motionPaused=paused||reduceMotion;
      document.body.classList.toggle('motion-paused',motionPaused);
      if(motionButton){
        motionButton.setAttribute('aria-pressed',userPaused?'true':'false');
        motionButton.textContent=reduceMotion?'Motion reduced':(userPaused?'Resume motion':'Pause motion');
      }
      if(window.gsap){
        if(motionPaused)gsap.globalTimeline.pause();else gsap.globalTimeline.resume();
      }
      if(window.ScrollTrigger){
        ScrollTrigger.getAll().forEach(function(trigger){if(motionPaused)trigger.disable(false,true);else trigger.enable(false);});
      }
      if(motionPaused){stopLoop();renderStatic();}else{startLoop();}
    }
    document.addEventListener('visibilitychange',function(){
      if(document.hidden)stopLoop();else if(!motionPaused)startLoop();
    });

    window.addEventListener('site:motionchange', function(event){
      userPaused = !!event.detail.paused;
      setPaused(userPaused);
    });
    initScene();
    setupGSAP();
    setPaused(motionPaused);
  })();

