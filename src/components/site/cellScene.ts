import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { Theme } from '@/lib/themes';
import type { OrganelleKey } from '@/lib/types';

export interface SceneOptions { autoRotate: boolean; rotateSpeed: number; glow: number; particles: boolean; calm: boolean; mobile: boolean }
export interface Projected { x: number; y: number; r: number; visible: boolean }

const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}`;

const CR = 5, MEM_AMP = 0.2;
const POS: Record<Exclude<OrganelleKey, 'home' | 'er'>, THREE.Vector3> = {
  nucleus: new THREE.Vector3(-0.8, 0.35, -0.3),
  golgi: new THREE.Vector3(2.35, -0.75, 1.75),
  mito: new THREE.Vector3(2.6, 2.1, -0.6),
  ribosome: new THREE.Vector3(-0.2, -2.1, 2.6),
  vacuole: new THREE.Vector3(-2.7, -1.5, 2.0),
  membrane: new THREE.Vector3(-2.6, 3.4, 2.4).normalize().multiplyScalar(CR + 0.3),
  lysosome: new THREE.Vector3(3.0, -2.6, -1.2),
  peroxisome: new THREE.Vector3(-1.9, 3.0, -1.6),
  centrosome: new THREE.Vector3(1.2, 1.4, -3.0),
};
export const RADIUS: Record<OrganelleKey, number> = { home: 5.4, nucleus: 2, er: 0.8, golgi: 1.25, mito: 0.9, ribosome: 0.6, vacuole: 1, membrane: 0.8, lysosome: 0.6, peroxisome: 0.55, centrosome: 0.6 };

type Mat = THREE.Material & { userData: { base?: THREE.Color | null; op?: number; k?: number } };

export class CellScene {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
  private cell = new THREE.Group();
  private mats: THREE.ShaderMaterial[] = [];
  private groups: Record<string, Mat[]> = {};
  private cur = 'x';
  private seed = 21;
  private erPos = new THREE.Vector3();
  private mitos: THREE.Mesh[] = [];
  private vesicles: THREE.Mesh[] = [];
  private halo!: THREE.Sprite;
  private dusts: THREE.Points[] = [];
  private hits: THREE.Mesh[] = [];
  private raf = 0;
  private last = 0;
  private W = 1; H = 1; RAD = 300;
  private ro: ResizeObserver;
  private visible = true;
  private io: IntersectionObserver;
  // navigation state
  private selected: OrganelleKey = 'home';
  private active = new Set<string>();
  private drafted = new Set<string>();
  private rotY = 0.5; private spin = 0.05;
  private camPos = new THREE.Vector3(0, 6, 70); private camTgt = new THREE.Vector3();
  private qWant = new THREE.Quaternion();
  private orbit = { theta: 0, phi: 0, zoom: 1, tTheta: 0, tPhi: 0, tZoom: 1, vT: 0, vP: 0, drag: false, idle: 0 };
  private magNow = 400; private magTarget = 400;
  onFrame: ((s: CellScene) => void) | null = null;

  constructor(private host: HTMLElement, private T: Theme, private opt: SceneOptions) {
    this.renderer = new THREE.WebGLRenderer({ antialias: !opt.mobile, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, opt.mobile ? 1.5 : 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    host.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(T.bg);
    this.scene.add(this.cell);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3 + opt.glow * 0.65, 0.55, 0.42);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.build();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; });
    this.io.observe(host);
    this.resize();
    if (opt.calm || !opt.autoRotate) this.spin = 0;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  static supported(): boolean {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
  }

  /* ---------- helpers ---------- */
  private rng = () => { let s = this.seed; s |= 0; s = s + 0x6D2B79F5 | 0; this.seed = s; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  private R = (a = 0, b = 1) => a + (b - a) * this.rng();
  private dir = () => { const u = this.R(-1, 1), th = this.R(0, Math.PI * 2), s = Math.sqrt(1 - u * u); return new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th)); };
  private reg<M extends THREE.Material>(m: M): M {
    const mm = m as unknown as Mat & { color?: THREE.Color; opacity: number };
    mm.userData.base = mm.color ? mm.color.clone() : null; mm.userData.op = mm.opacity; mm.userData.k = 1;
    (this.groups[this.cur] ||= []).push(mm); return m;
  }
  private U() { return { uTime: { value: 0 }, uK: { value: 1 } }; }
  private fresnel(o: { c1: string; c2: string; alpha?: number; pow?: number; amp?: number; scale?: number; side?: THREE.Side }) {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...this.U(), uC: { value: new THREE.Color(o.c1) }, uC2: { value: new THREE.Color(o.c2) }, uA: { value: o.alpha ?? 1 }, uP: { value: o.pow ?? 2.2 }, uAmp: { value: o.amp ?? 0 }, uS: { value: o.scale ?? 0.32 } },
      vertexShader: NOISE + `uniform float uTime,uAmp,uS;varying vec3 vN;varying vec3 vV;void main(){vec3 p=position;float n=snoise(p*uS+vec3(0.,uTime*.12,uTime*.05));p+=normal*n*uAmp;vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `uniform vec3 uC,uC2;uniform float uA,uP,uK;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(vN,vV)),uP);vec3 c=mix(uC2,uC,f);gl_FragColor=vec4(c*(.18+1.25*f)*uK,(.02+f*.75)*uA*uK);}`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: o.side ?? THREE.FrontSide,
    });
    this.mats.push(m); (this.groups[this.cur] ||= []).push(m as unknown as Mat); return m;
  }
  private organic(o: { c: [string, string, string]; tex?: number; disp?: number; ds?: number; stripe?: number; emis?: number; rp?: number }) {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...this.U(), uA: { value: new THREE.Color(o.c[0]) }, uB: { value: new THREE.Color(o.c[1]) }, uRim: { value: new THREE.Color(o.c[2]) }, uTex: { value: o.tex ?? 1.4 }, uDisp: { value: o.disp ?? 0.05 }, uDS: { value: o.ds ?? 1.4 }, uStripe: { value: o.stripe ?? 0 }, uE: { value: o.emis ?? 0.2 }, uRP: { value: o.rp ?? 2.4 } },
      vertexShader: NOISE + `uniform float uTime,uDisp,uDS;varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){vec3 p=position;float n=snoise(p*uDS+uTime*.15);p+=normal*n*uDisp;vP=position;vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
      fragmentShader: NOISE + `uniform vec3 uA,uB,uRim;uniform float uTime,uTex,uStripe,uE,uRP,uK;varying vec3 vN;varying vec3 vV;varying vec3 vP;
        void main(){float n=snoise(vP*uTex+uTime*.07)*.5+.5;float n2=snoise(vP*uTex*3.1-uTime*.05)*.5+.5;float t=smoothstep(.3,.8,n*.65+n2*.35);
        if(uStripe>0.){float s=sin(vP.y*uStripe+n*4.)*.5+.5;t=mix(t,smoothstep(.3,.7,s),.75);}
        vec3 base=mix(uA,uB,t);vec3 L=normalize(vec3(.45,.7,.6));float d=max(dot(vN,L),0.)*.7+.3;float rim=pow(1.-abs(dot(vN,vV)),uRP);gl_FragColor=vec4((base*d+uRim*rim*1.6+base*uE)*uK,1.);}`,
    });
    this.mats.push(m); (this.groups[this.cur] ||= []).push(m as unknown as Mat); return m;
  }
  private sprite = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  private dust(n: number, rMin: number, rMax: number, color: string, size: number, opacity: number) {
    const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const d = this.dir().multiplyScalar(this.R(rMin, rMax)); p.set([d.x, d.y, d.z], i * 3); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ size, map: this.sprite, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  }

  /* ---------- build the cell ---------- */
  private build() {
    const T = this.T, cell = this.cell, R = this.R;
    // membrane
    this.cur = 'membrane';
    cell.add(new THREE.Mesh(new THREE.SphereGeometry(CR, 160, 160), this.fresnel({ c1: T.mem, c2: T.memD, pow: 2.4, amp: MEM_AMP })));
    cell.add(new THREE.Mesh(new THREE.SphereGeometry(CR * 0.985, 120, 120), this.fresnel({ c1: T.back, c2: T.bg, alpha: 0.3, pow: 1.8, amp: MEM_AMP, side: THREE.BackSide })));
    {
      const N = this.opt.mobile ? 6000 : 11000, g = new THREE.BufferGeometry(), p = new Float32Array(N * 3), r = new Float32Array(N), ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = ga * i; p.set([Math.cos(th) * rad * CR, y * CR, Math.sin(th) * rad * CR], i * 3); r[i] = this.rng(); }
      g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aR', new THREE.BufferAttribute(r, 1));
      const m = new THREE.ShaderMaterial({
        uniforms: { ...this.U(), uAmp: { value: MEM_AMP }, uPR: { value: this.renderer.getPixelRatio() }, uC: { value: new THREE.Color(T.lipid) } },
        vertexShader: NOISE + `uniform float uTime,uAmp,uPR;attribute float aR;varying float vA;void main(){vec3 nr=normalize(position);vec3 p=position;float n=snoise(p*.32+vec3(0.,uTime*.12,uTime*.05));p+=nr*(n*uAmp+.03);vec4 mv=modelViewMatrix*vec4(p,1.);vec3 vn=normalize(normalMatrix*nr);float f=1.-abs(dot(vn,normalize(-mv.xyz)));vA=.06+.94*pow(f,2.2);gl_PointSize=(1.2+aR*1.6)*uPR*(9./-mv.z);gl_Position=projectionMatrix*mv;}`,
        fragmentShader: `uniform vec3 uC;uniform float uK;varying float vA;void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(uC,smoothstep(.5,0.,r)*vA*.55*uK);}`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      this.mats.push(m); (this.groups[this.cur] ||= []).push(m as unknown as Mat); cell.add(new THREE.Points(g, m));
    }
    {
      const n = 120, head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 10), this.reg(new THREE.MeshBasicMaterial({ color: T.rec })), n);
      const stalk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 5), this.reg(new THREE.MeshBasicMaterial({ color: T.rec, transparent: true, opacity: 0.45 })), n);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
      for (let i = 0; i < n; i++) { const d = this.dir(); q.setFromUnitVectors(up, d); m.compose(d.clone().multiplyScalar(CR + 0.38), q, one); head.setMatrixAt(i, m); m.compose(d.clone().multiplyScalar(CR + 0.2), q, one); stalk.setMatrixAt(i, m); }
      cell.add(head, stalk);
    }
    // nucleus
    this.cur = 'nucleus';
    {
      const g = new THREE.Group(); g.position.copy(POS.nucleus); cell.add(g);
      g.add(new THREE.Mesh(new THREE.SphereGeometry(1.75, 128, 128), this.organic({ c: T.nuc, tex: 1.5, disp: 0.09, ds: 1.1, emis: 0.14 })));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(1.95, 96, 96), this.fresnel({ c1: T.nucS, c2: T.nuc[0], alpha: 0.7, pow: 2.8, amp: 0.06, scale: 1.2 })));
      const N = 520, pg = new THREE.BufferGeometry(), p = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const d = this.dir().multiplyScalar(1.9); p.set([d.x, d.y, d.z], i * 3); }
      pg.setAttribute('position', new THREE.BufferAttribute(p, 3));
      g.add(new THREE.Points(pg, this.reg(new THREE.PointsMaterial({ size: 0.07, map: this.sprite, color: T.nuc[2], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))));
    }
    // endoplasmic reticulum + bound ribosomes
    this.cur = 'er';
    const erMat = this.organic({ c: T.er, tex: 2.2, disp: 0, emis: 0.12, rp: 2.6 });
    const ribo: THREE.Vector3[] = [];
    for (let k = 0; k < 7; k++) {
      const tilt = new THREE.Euler(R(-0.5, 0.5), R(0, 6.28), R(-0.5, 0.5)), pts: THREE.Vector3[] = [];
      for (let j = 0; j < 16; j++) { const a = j / 16 * Math.PI * 2, r = 2.35 + k * 0.1 + 0.35 * Math.sin(a * 3 + k) + R(-0.15, 0.15); pts.push(new THREE.Vector3(Math.cos(a) * r, R(-0.55, 0.55) + Math.sin(a * 2 + k) * 0.3, Math.sin(a) * r).applyEuler(tilt).add(POS.nucleus)); }
      const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
      cell.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 260, 0.06, 8, true), erMat));
      for (let s = 0; s < 70; s++) ribo.push(curve.getPoint(this.rng()).add(this.dir().multiplyScalar(0.1)));
      if (k === 3) this.erPos = curve.getPoint(0.15);
    }
    // golgi
    this.cur = 'golgi';
    {
      const g = new THREE.Group(); g.position.copy(POS.golgi); g.rotation.set(0.35, -0.7, 0.5); cell.add(g);
      const gm = this.organic({ c: T.gol, tex: 2.6, disp: 0.02, ds: 3, emis: 0.12, rp: 2.4 });
      for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(1.05 - i * 0.07, 0.11 - i * 0.006, 14, 90, 2.25 - i * 0.08), gm); t.position.set(0, -i * 0.05, i * 0.23); t.rotation.z = 0.45 + i * 0.04; t.scale.y = 0.85; g.add(t); }
      for (let i = 0; i < 12; i++) { const a = R() < 0.5 ? R(0.2, 0.6) : R(2.1, 2.6), rr = R(0.9, 1.35); const v = new THREE.Mesh(new THREE.SphereGeometry(R(0.06, 0.13), 16, 16), gm); v.position.set(Math.cos(a) * rr, Math.sin(a) * rr * 0.85, R(0, 1.2)); g.add(v); }
    }
    // mitochondria
    this.cur = 'mito';
    const mitoMat = this.organic({ c: T.mito, tex: 1.4, disp: 0.035, ds: 2, stripe: 10, emis: 0.3, rp: 2.2 });
    [[2.6, 2.1, -0.6], [-3.1, -1.6, 1.2], [3.4, 0.2, -1.9], [-1.2, -3.2, -1.4], [0.6, 3.2, 1.3], [-3.3, 1.9, -1.5], [1.4, -2.8, 2.4]].forEach(p => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.05, 12, 32), mitoMat); m.position.set(p[0], p[1], p[2]); m.rotation.set(R(0, 3), R(0, 3), R(0, 3)); m.userData.spin = R(-0.15, 0.15); cell.add(m); this.mitos.push(m);
    });
    // ribosomes
    this.cur = 'ribosome';
    for (let i = 0; i < 520; i++) { let v; do { v = this.dir().multiplyScalar(R(0.5, 4.6)); } while (v.distanceTo(POS.nucleus) < 2.2); ribo.push(v); }
    {
      const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.038, 8, 8), this.reg(new THREE.MeshBasicMaterial({ color: T.ribo })), ribo.length), m = new THREE.Matrix4();
      ribo.forEach((p, i) => { m.makeTranslation(p.x, p.y, p.z); inst.setMatrixAt(i, m); }); cell.add(inst);
      const g = new THREE.Group(); g.position.copy(POS.ribosome); const mm = this.reg(new THREE.MeshBasicMaterial({ color: T.riboHi }));
      for (let i = 0; i < 26; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(R(0.05, 0.085), 10, 10), mm); s.position.copy(this.dir().multiplyScalar(R(0, 0.45))); g.add(s); }
      cell.add(g);
    }
    // vacuole + vesicles
    this.cur = 'vacuole';
    { const v = new THREE.Mesh(new THREE.SphereGeometry(0.85, 64, 64), this.fresnel({ c1: T.acc2, c2: T.memD, pow: 2, amp: 0.05, scale: 1.5 })); v.position.copy(POS.vacuole); cell.add(v); }
    for (let i = 0; i < 16; i++) {
      const v = new THREE.Mesh(new THREE.SphereGeometry(R(0.14, 0.32), 32, 32), this.fresnel({ c1: T.ves[i % 3 ? 0 : 1], c2: T.bg, alpha: 0.55, pow: 2.4 }));
      let p; do { p = this.dir().multiplyScalar(R(2.2, 4.4)); } while (p.distanceTo(POS.golgi) < 1.5 || p.distanceTo(POS.nucleus) < 2.4 || p.distanceTo(POS.centrosome) < 1 || p.distanceTo(POS.lysosome) < 1 || p.distanceTo(POS.peroxisome) < 1);
      v.position.copy(p); v.userData.base = p.clone(); v.userData.ph = R(0, 6.28); cell.add(v); this.vesicles.push(v);
    }
    // lysosomes (main one + small siblings)
    this.cur = 'lysosome';
    {
      const core = this.organic({ c: T.lyso, tex: 3, disp: 0.03, ds: 3, emis: 0.25, rp: 2 }), shell = this.fresnel({ c1: T.lyso[2], c2: T.lyso[0], alpha: 0.8, pow: 2.2 });
      ([[POS.lysosome, 0.42], [new THREE.Vector3(-3.4, -0.4, -2.0), 0.26], [new THREE.Vector3(0.4, -3.6, 0.6), 0.22]] as [THREE.Vector3, number][]).forEach(([p, r]) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 48), core); m.position.copy(p); cell.add(m);
        const s = new THREE.Mesh(new THREE.SphereGeometry(r * 1.18, 48, 48), shell); s.position.copy(p); cell.add(s);
      });
    }
    // peroxisome: membrane + crystalline core
    this.cur = 'peroxisome';
    {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 48), this.fresnel({ c1: T.perox[2], c2: T.perox[0], pow: 2 })); s.position.copy(POS.peroxisome); cell.add(s);
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), this.organic({ c: T.perox, tex: 4, disp: 0, emis: 0.4, rp: 1.6 })); c.position.copy(POS.peroxisome); c.rotation.set(0.6, 0.3, 0.2); cell.add(c);
    }
    // centrosome: two perpendicular centrioles + aster
    this.cur = 'centrosome';
    {
      const g = new THREE.Group(); g.position.copy(POS.centrosome); cell.add(g);
      const cm = this.organic({ c: T.centro, tex: 2, disp: 0, stripe: 26, emis: 0.3, rp: 2 });
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.62, 18, 1, true), cm); a.rotation.z = Math.PI / 2; g.add(a);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.62, 18, 1, true), cm); b.position.set(0.18, 0.2, 0); g.add(b);
      const pos: number[] = []; for (let i = 0; i < 40; i++) { const d = this.dir(), l = R(0.7, 1.6); pos.push(0, 0, 0, d.x * l, d.y * l, d.z * l); }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.add(new THREE.LineSegments(lg, this.reg(new THREE.LineBasicMaterial({ color: T.centro[1], transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }))));
    }
    // cytoskeleton, halo, dust
    this.cur = 'x';
    {
      const pos: number[] = [];
      for (let i = 0; i < 70; i++) { const a = this.dir().multiplyScalar(2).add(POS.nucleus), b = this.dir().multiplyScalar(CR * 0.97), c = a.clone().lerp(b, 0.5).add(this.dir().multiplyScalar(0.8)); const pts = new THREE.QuadraticBezierCurve3(a, c, b).getPoints(24); for (let j = 0; j < pts.length - 1; j++) pos.push(pts[j].x, pts[j].y, pts[j].z, pts[j + 1].x, pts[j + 1].y, pts[j + 1].z); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      cell.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: T.acc2, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false })));
    }
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.sprite, color: T.halo, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.halo.scale.set(22, 22, 1); cell.add(this.halo);
    if (this.opt.particles) { this.dusts = [this.dust(this.opt.mobile ? 1000 : 2200, 9, 60, T.dust[0], 0.14, 0.45), this.dust(this.opt.mobile ? 300 : 600, 9, 50, T.dust[1], 0.12, 0.4)]; this.scene.add(...this.dusts); }
    // click targets
    (Object.keys(RADIUS) as OrganelleKey[]).filter(k => k !== 'home').forEach(k => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(RADIUS[k], 12, 12), new THREE.MeshBasicMaterial({ visible: false }));
      m.position.copy(this.local(k)); m.userData.key = k; cell.add(m); this.hits.push(m);
    });
  }

  private local(k: OrganelleKey): THREE.Vector3 {
    if (k === 'home') return new THREE.Vector3();
    if (k === 'er') return this.erPos;
    return POS[k];
  }

  /* ---------- public API ---------- */
  setSections(active: string[], drafted: string[]) { this.active = new Set(active); this.drafted = new Set(drafted); }
  select(key: OrganelleKey, magnification: number) {
    this.selected = key; this.magTarget = magnification;
    this.orbit.tTheta = 0; this.orbit.tPhi = 0; this.orbit.tZoom = 1;
  }
  get magnification() { return this.magNow; }
  get target() { return this.camTgt; }
  get radius() { return this.RAD; }
  get size() { return { w: this.W, h: this.H }; }

  /** Organelle under a canvas-relative point (only active sections are clickable). */
  pick(x: number, y: number): OrganelleKey | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x / this.W) * 2 - 1, -(y / this.H) * 2 + 1), this.camera);
    const hit = ray.intersectObjects(this.hits.filter(h => this.active.has(h.userData.key)))[0];
    return hit ? hit.object.userData.key : null;
  }

  project(k: OrganelleKey): Projected {
    const wp = this.local(k).clone().applyMatrix4(this.cell.matrixWorld), p = wp.clone().project(this.camera);
    const x = (p.x * 0.5 + 0.5) * this.W, y = (-p.y * 0.5 + 0.5) * this.H;
    const top = wp.clone().add(this.camera.up.clone().multiplyScalar(RADIUS[k])).project(this.camera);
    const r = Math.abs((-top.y * 0.5 + 0.5) * this.H - y);
    return { x, y, r, visible: p.z < 1 && Math.hypot(x - this.W / 2, y - this.H / 2) < this.RAD - 20 };
  }

  dragBy(dx: number, dy: number) {
    const o = this.orbit; o.vT = -dx * 0.006; o.vP = -dy * 0.006; o.tTheta += o.vT; o.tPhi = Math.max(-1.35, Math.min(1.35, o.tPhi + o.vP)); o.idle = 0;
  }
  setDragging(d: boolean) { this.orbit.drag = d; }
  zoomBy(f: number) { this.orbit.tZoom = Math.min(1.8, Math.max(0.5, this.orbit.tZoom * f)); }
  resetView() { this.orbit.tTheta = 0; this.orbit.tPhi = 0; this.orbit.tZoom = 1; }

  private resize() {
    const r = this.host.getBoundingClientRect(); this.W = Math.max(1, r.width); this.H = Math.max(1, r.height);
    this.renderer.setSize(this.W, this.H); this.composer.setSize(this.W, this.H);
    this.camera.aspect = this.W / this.H; this.camera.updateProjectionMatrix();
    this.RAD = Math.min(this.W, this.H) * 0.46;
  }

  private tmp = new THREE.Vector3();
  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (!this.visible || document.hidden) return;
    const t = now / 1000, o = this.orbit, sel = this.selected, calm = this.opt.calm;
    this.mats.forEach(m => { m.uniforms.uTime.value = t; });
    if (!o.drag) { o.tTheta += o.vT; o.tPhi = Math.max(-1.35, Math.min(1.35, o.tPhi + o.vP)); o.vT *= 0.93; o.vP *= 0.93; o.idle += dt; }
    o.theta += (o.tTheta - o.theta) * 0.12; o.phi += (o.tPhi - o.phi) * 0.12; o.zoom += (o.tZoom - o.zoom) * 0.12;
    const AY = new THREE.Vector3(0, 1, 0), AX = new THREE.Vector3(1, 0, 0);
    if (sel === 'home') {
      const auto = this.opt.autoRotate && !calm && !o.drag && o.idle > 2.5 ? 0.02 + this.opt.rotateSpeed * 0.12 : 0;
      this.spin += (auto - this.spin) * 0.03; this.rotY += this.spin * dt; this.qWant.setFromAxisAngle(AY, this.rotY);
    } else this.qWant.setFromUnitVectors(this.local(sel).clone().normalize(), new THREE.Vector3(0.22, 0.1, 1).normalize());
    this.cell.quaternion.slerp(this.qWant, 0.045);
    this.cell.updateMatrixWorld();
    const hm = this.halo.material as THREE.SpriteMaterial; hm.opacity += ((sel === 'home' ? 0.08 : 0) - hm.opacity) * 0.05;
    for (const key in this.groups) {
      const want = key !== 'x' && (!this.active.has(key) || this.drafted.has(key)) ? 0.22 : (sel === 'home' || sel === key ? 1 : 0.2);
      this.groups[key].forEach(m => {
        const sm = m as unknown as THREE.ShaderMaterial;
        if (sm.uniforms?.uK) sm.uniforms.uK.value += (want - sm.uniforms.uK.value) * 0.06;
        else { const bm = m as unknown as THREE.MeshBasicMaterial; m.userData.k! += (want - m.userData.k!) * 0.06; if (m.userData.base) bm.color.copy(m.userData.base).multiplyScalar(m.userData.k!); if (bm.transparent) bm.opacity = m.userData.op! * m.userData.k!; }
      });
    }
    this.mitos.forEach(m => { m.rotation.y += (m.userData.spin as number) * dt; });
    if (!calm) this.vesicles.forEach(v => { const k = (v.userData.ph as number) + t * 0.4; v.position.copy(v.userData.base as THREE.Vector3).add(this.tmp.set(Math.sin(k) * 0.12, Math.cos(k * 0.8) * 0.12, Math.sin(k * 1.3) * 0.1)); });
    this.dusts.forEach((d, i) => { d.rotation.y = (i ? -1 : 1) * t * 0.01; });
    const fit = Math.max(1, 1.0 / this.camera.aspect);
    const want = sel === 'home' ? new THREE.Vector3() : this.local(sel).clone().applyMatrix4(this.cell.matrixWorld);
    const dist = (sel === 'home' ? 23 : Math.min(15, Math.max(6.5, RADIUS[sel] * 7))) * fit * o.zoom;
    const dir = new THREE.Vector3(0, 0.1, 1).normalize().applyAxisAngle(AX, o.phi).applyAxisAngle(AY, o.theta);
    this.camTgt.lerp(want, 0.07);
    this.camPos.lerp(this.camTgt.clone().addScaledVector(dir, dist), o.drag ? 0.35 : calm ? 0.12 : 0.06);
    this.camera.position.copy(this.camPos); this.camera.lookAt(this.camTgt);
    this.composer.render();
    this.magNow += (this.magTarget / o.zoom - this.magNow) * 0.08;
    this.onFrame?.(this);
  };

  dispose() {
    cancelAnimationFrame(this.raf); this.ro.disconnect(); this.io.disconnect();
    this.scene.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach(x => x.dispose()); });
    this.composer.dispose(); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
