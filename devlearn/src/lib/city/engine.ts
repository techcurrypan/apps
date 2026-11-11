// 自作の WebGL2 の描画（影の地図・隅の陰り・にじみ・ミニチュアのぼけ・霧・空・水・夜の窓）。
// 試作 docs/prototype/src/engine.js を TypeScript に移した物（段 8-2a）。処理は変えていない。型を付けただけ。

export type Vec3 = [number, number, number];
export type Mat4 = Float32Array;

export const M4 = {
	mul(a: Mat4, b: Mat4): Mat4 {
		const o = new Float32Array(16);
		for (let c = 0; c < 4; c++)
			for (let r = 0; r < 4; r++) {
				let s = 0;
				for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
				o[c * 4 + r] = s;
			}
		return o;
	},
	persp(fy: number, asp: number, n: number, f: number): Mat4 {
		const t = 1 / Math.tan(fy / 2),
			o = new Float32Array(16);
		o[0] = t / asp;
		o[5] = t;
		o[10] = (f + n) / (n - f);
		o[11] = -1;
		o[14] = (2 * f * n) / (n - f);
		return o;
	},
	ortho(l: number, r: number, b: number, t: number, n: number, f: number): Mat4 {
		const o = new Float32Array(16);
		o[0] = 2 / (r - l);
		o[5] = 2 / (t - b);
		o[10] = -2 / (f - n);
		o[12] = -(r + l) / (r - l);
		o[13] = -(t + b) / (t - b);
		o[14] = -(f + n) / (f - n);
		o[15] = 1;
		return o;
	},
	look(e: readonly number[], c: readonly number[], u: readonly number[]): Mat4 {
		let zx = e[0] - c[0],
			zy = e[1] - c[1],
			zz = e[2] - c[2];
		let l = Math.hypot(zx, zy, zz);
		zx /= l;
		zy /= l;
		zz /= l;
		let xx = u[1] * zz - u[2] * zy,
			xy = u[2] * zx - u[0] * zz,
			xz = u[0] * zy - u[1] * zx;
		l = Math.hypot(xx, xy, xz);
		xx /= l;
		xy /= l;
		xz /= l;
		const yx = zy * xz - zz * xy,
			yy = zz * xx - zx * xz,
			yz = zx * xy - zy * xx;
		const o = new Float32Array(16);
		o[0] = xx;
		o[1] = yx;
		o[2] = zx;
		o[4] = xy;
		o[5] = yy;
		o[6] = zy;
		o[8] = xz;
		o[9] = yz;
		o[10] = zz;
		o[12] = -(xx * e[0] + xy * e[1] + xz * e[2]);
		o[13] = -(yx * e[0] + yy * e[1] + yz * e[2]);
		o[14] = -(zx * e[0] + zy * e[1] + zz * e[2]);
		o[15] = 1;
		return o;
	},
	inv(m: Mat4): Mat4 {
		const o = new Float32Array(16),
			a = m;
		const b00 = a[0] * a[5] - a[1] * a[4],
			b01 = a[0] * a[6] - a[2] * a[4],
			b02 = a[0] * a[7] - a[3] * a[4],
			b03 = a[1] * a[6] - a[2] * a[5],
			b04 = a[1] * a[7] - a[3] * a[5],
			b05 = a[2] * a[7] - a[3] * a[6];
		const b06 = a[8] * a[13] - a[9] * a[12],
			b07 = a[8] * a[14] - a[10] * a[12],
			b08 = a[8] * a[15] - a[11] * a[12],
			b09 = a[9] * a[14] - a[10] * a[13],
			b10 = a[9] * a[15] - a[11] * a[13],
			b11 = a[10] * a[15] - a[11] * a[14];
		const d = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
		o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * d;
		o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * d;
		o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * d;
		o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * d;
		o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * d;
		o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * d;
		o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * d;
		o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * d;
		o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * d;
		o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * d;
		o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * d;
		o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * d;
		o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * d;
		o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * d;
		o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * d;
		o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * d;
		return o;
	},
	xf(m: Mat4, x: number, y: number, z: number, w: number): [number, number, number, number] {
		return [
			m[0] * x + m[4] * y + m[8] * z + m[12] * w,
			m[1] * x + m[5] * y + m[9] * z + m[13] * w,
			m[2] * x + m[6] * y + m[10] * z + m[14] * w,
			m[3] * x + m[7] * y + m[11] * z + m[15] * w
		];
	}
};

const GLSL_COMMON = `
float hash1(float n){return fract(sin(n)*43758.5453123);}
float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vnoise(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s;}
vec3 lin(vec3 c){return pow(c,vec3(2.2));}
`;

const VS_MAIN = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec3 aCol;
layout(location=3) in float aMat; layout(location=4) in float aId; layout(location=5) in float aU;
uniform mat4 uVP; uniform mat4 uLVP; uniform float uTime; uniform sampler2D uData;
out vec3 vW; out vec3 vN; out vec3 vC; out vec4 vL; flat out float vMat; flat out float vId; out float vU; flat out float vS; out vec4 vInfo;
void main(){
  vec3 p=aPos; vec4 d=vec4(0.,0.,0.,1.);
  int id=int(aId+0.5);
  if(id>0){ d=texelFetch(uData, ivec2(id%128, id/128),0); p.y = p.y*d.a - (1.-d.a)*0.6; }
  if(aMat>1.5&&aMat<2.5){ float a=0.12+0.25*aU; p.y += a*(sin(p.x*0.09+uTime*1.1)+cos(p.z*0.13+uTime*0.8)+0.5*sin((p.x+p.z)*0.21+uTime*1.7)); }
  vW=p; vN=aNrm; vC=aCol; vMat=aMat; vId=aId; vU=aU; vS=floor(aU); vInfo=d;
  vL=uLVP*vec4(p,1.);
  gl_Position=uVP*vec4(p,1.);
}`;

const FS_MAIN = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vW; in vec3 vN; in vec3 vC; in vec4 vL; flat in float vMat; flat in float vId; in float vU; flat in float vS; in vec4 vInfo;
uniform vec3 uSunDir,uSunCol,uSkyCol,uHorCol,uGndCol,uCam; uniform float uNight,uTime,uInfo,uSel,uFogDen,uAmb,uTexel;
uniform sampler2DShadow uShadow;
out vec4 o;
${GLSL_COMMON}
float shadowF(vec3 n){
  vec3 c=vL.xyz/vL.w*0.5+0.5;
  if(c.x<0.||c.x>1.||c.y<0.||c.y>1.||c.z>1.) return 1.;
  float bias=0.0006+0.0018*(1.-abs(dot(n,uSunDir)));
  float s=0.;
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){ s+=texture(uShadow,vec3(c.xy+vec2(x,y)*uTexel*1.2,c.z-bias)); }
  return s/9.;
}
vec3 skyAt(vec3 r){ float h=clamp(r.y,0.,1.); vec3 c=mix(uHorCol,uSkyCol,pow(h,0.55)); float sd=max(dot(r,uSunDir),0.); c+=uSunCol*0.25*pow(sd,8.); return c; }
void main(){
  vec3 N=normalize(vN); vec3 V=normalize(uCam-vW);
  if(!gl_FrontFacing && vMat!=2.) N=-N;
  vec3 base=lin(vC); float m=vMat;
  if(m==5.){ float st=step(0.,sin((vW.x+vW.z)*3.1)); base*=0.82+0.18*st; }
  if(m==0.&&vId<0.5&&N.y>0.85){ float gn=vnoise(vW.xz*0.35); base*=0.86+0.22*gn+0.1*vnoise(vW.xz*2.7); if(base.g>base.r*1.15) base=mix(base,base*vec3(1.08,0.97,0.85),0.35*vnoise(vW.xz*0.06)); }
  if(m==10.){ base*=0.82+0.3*vnoise(vW.xz*2.5)+0.1*vnoise(vW.xz*0.4); }
  if(m==9.){ base*=0.86+0.14*step(0.35,fract(vU*2.2)); }
  float sh=shadowF(N);
  float cl=smoothstep(0.42,0.78,fbm(vW.xz*0.0022+vec2(uTime*0.006,uTime*0.002)));
  float shc=sh*(1.-0.5*cl);
  float ndl=max(dot(N,uSunDir),0.);
  vec3 hemi=mix(uGndCol+uSunCol*0.06,uSkyCol,N.y*0.5+0.5);
  float ao=1.;
  vec3 col=base*(uSunCol*ndl*shc+hemi*uAmb)*ao;
  if(m==1.){
    vec3 R=reflect(-V,N); float fr=0.04+0.96*pow(1.-max(dot(N,V),0.),5.);
    vec3 refl=skyAt(normalize(vec3(R.x,abs(R.y),R.z)));
    float sd=mod(vS,997.); col=col*(0.55+0.5*hash1(sd*5.3+1.7))*0.8; col=mix(col,refl*0.7,0.1+0.55*fr);
    col+=uSunCol*pow(max(dot(R,uSunDir),0.),240.)*shc*3.;
    float lit=step(0.42,hash1(sd*0.917+3.1));
    vec3 warm=mix(vec3(1.,0.68,0.36),vec3(0.75,0.85,1.),step(0.8,hash1(sd*0.77+9.)));
    col+=warm*lit*uNight*(1.6+1.4*hash1(sd*1.31+4.));
  }
  if(m==2.){
    vec2 q=vW.xz; float t=uTime;
    vec2 g=vec2(0.);
    g+=vec2(0.09,0.)*cos(q.x*0.09+t*1.1)*0.6; g+=vec2(0.,-0.13)*sin(q.y*0.13+t*0.8)*0.6;
    g+=vec2(0.21,0.21)*cos((q.x+q.y)*0.21+t*1.7)*0.3;
    g+=vec2(cos(q.x*0.7+t*2.3+q.y*0.3),sin(q.y*0.8-t*2.1+q.x*0.2))*0.06;
    vec3 wn=normalize(vec3(-g.x,1.,-g.y));
    float dep=clamp(vU,0.,1.);
    vec3 deep=lin(vec3(0.04,0.17,0.27)), shal=lin(vec3(0.13,0.42,0.46));
    vec3 wc=mix(shal,deep,smoothstep(0.,0.55,dep));
    vec3 R=reflect(-V,wn); float fr=0.02+0.98*pow(1.-max(dot(wn,V),0.),5.);
    vec3 refl=skyAt(normalize(vec3(R.x,abs(R.y),R.z)));
    col=wc*(uSunCol*0.35*shc+hemi*uAmb*0.9);
    col=mix(col,refl*0.85,clamp(fr*0.75+0.05,0.,1.));
    col+=uSunCol*pow(max(dot(R,uSunDir),0.),350.)*shc*6.;
    float fo=(1.-smoothstep(0.,0.07,dep))*(0.55+0.45*sin(t*1.6+q.x*0.15+vnoise(q*0.2)*6.));
    col=mix(col,(uSunCol*0.6+hemi*uAmb)*0.9,fo*0.55);
  }
  if(m==3.){ col=mix(col,vec3(1.,0.82,0.55)*5.,uNight); }
  if(m==7.){ col=base*1.6; }
  if(m==8.){ col=mix(col,base*3.5,uNight); }
  if(m==4.){ float ph=fract(vU*0.035-uTime*0.9); float pulse=smoothstep(0.75,1.,ph)+smoothstep(0.25,0.,ph)*0.3; col=base*(0.7+3.0*pulse); }
  if(m==6.){ col=base*(0.9+0.5*sin(uTime*4.)); }
  if(uInfo>0.&&m!=4.&&m!=6.){
    float g=dot(col,vec3(0.3,0.5,0.2));
    vec3 dim=lin(vec3(0.11,0.14,0.19))*(0.5+0.8*ndl*sh)+g*0.06;
    vec3 tint=dim;
    if(vInfo.r+vInfo.g+vInfo.b>0.01) tint=lin(vInfo.rgb)*(0.45+0.75*ndl*sh);
    col=mix(col,tint,uInfo);
  }
  if(vId>0.5&&abs(vId-uSel)<0.5){ col=col*1.3+lin(vec3(0.25,0.35,0.5))*0.4; }
  float dist=length(uCam-vW);
  float f=1.-exp(-pow(dist*uFogDen,1.35));
  vec3 fc=skyAt(normalize(vec3(-V.x,max(-V.y,0.02)*0.25,-V.z)));
  fc=mix(fc,lin(vec3(0.06,0.08,0.11)),uInfo*0.9);
  col=mix(col,fc,f);
  o=vec4(col,1.);
}`;

const VS_DEPTH = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=3) in float aMat; layout(location=4) in float aId;
uniform mat4 uLVP; uniform sampler2D uData;
void main(){ vec3 p=aPos; int id=int(aId+0.5);
 if(id>0){ vec4 d=texelFetch(uData, ivec2(id%128,id/128),0); p.y=p.y*d.a-(1.-d.a)*0.6; }
 if(aMat>1.5&&aMat<2.5) p.y-=50.;
 gl_Position=uLVP*vec4(p,1.); }`;
const FS_DEPTH = `#version 300 es
precision highp float; void main(){}`;

const VS_FULL = `#version 300 es
precision highp float; out vec2 vUv;
void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUv=p; gl_Position=vec4(p*2.-1.,0.999,1.); }`;

const FS_SKY = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform mat4 uInvVP; uniform vec3 uSunDir,uSunCol,uSkyCol,uHorCol,uCam; uniform float uNight,uTime,uInfo;
${GLSL_COMMON}
void main(){
  vec4 a=uInvVP*vec4(vUv*2.-1.,1.,1.); vec3 d=normalize(a.xyz/a.w-uCam);
  float h=clamp(d.y,0.,1.);
  vec3 c=mix(uHorCol,uSkyCol,pow(h,0.55));
  float sd=max(dot(d,uSunDir),0.);
  c+=uSunCol*(0.25*pow(sd,8.)+0.6*pow(sd,64.)+8.*smoothstep(0.9993,0.9997,sd));
  if(d.y>0.){
    vec2 cp=d.xz/(d.y+0.08)*1.4+vec2(uTime*0.01,0.);
    float cl=smoothstep(0.5,0.85,fbm(cp*0.9));
    vec3 cc=mix(uHorCol*1.05+uSunCol*0.15,vec3(1.)*(uSunCol*0.5+uSkyCol*0.6),0.5);
    c=mix(c,cc,cl*0.75*smoothstep(0.,0.15,d.y));
    float st=step(0.9975,hash2(floor(d.xz/(d.y+0.3)*300.)))*uNight*smoothstep(0.05,0.3,d.y);
    c+=vec3(st)*1.5;
  }
  c=mix(c,lin(vec3(0.06,0.08,0.11)),uInfo*0.85);
  o=vec4(c,1.);
}`;

const FS_POST = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D uTex; uniform sampler2D uBloom; uniform sampler2D uAO; uniform vec2 uPx; uniform float uTilt,uBloomK,uAOK;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.); }
void main(){
  vec2 uv=vUv;
  float b=smoothstep(0.18,0.5,abs(uv.y-0.52))*uTilt;
  vec3 c=texture(uTex,uv).rgb;
  float ao=0.; float aw=0.;
  for(int x=-2;x<2;x++)for(int y=-2;y<2;y++){ ao+=texture(uAO,uv+(vec2(x,y)+0.5)*uPx*2.).r; aw+=1.; }
  ao/=aw;
  if(b>0.01){
    vec3 s=c; float w=1.;
    for(int i=0;i<12;i++){ float a=float(i)*2.39996; float r=sqrt(float(i)+0.5)/3.5; vec2 off=vec2(cos(a),sin(a))*r*b*9.*uPx;
      s+=texture(uTex,uv+off).rgb; w+=1.; }
    c=s/w;
  }
  c*=mix(1.,ao,uAOK);
  c+=texture(uBloom,uv).rgb*uBloomK;
  c*=1.05;
  c=aces(c);
  float l=dot(c,vec3(0.299,0.587,0.114)); c=mix(vec3(l),c,0.98); c=mix(c,c*vec3(1.02,1.0,0.96),0.5);
  vec2 q=uv-0.5; c*=1.-0.35*dot(q,q)*1.6;
  c=pow(c,vec3(1./2.2));
  o=vec4(c,1.);
}`;

const FS_BRIGHT = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uTex; uniform vec2 uPx; uniform vec2 uDir; uniform float uPass;
void main(){
  if(uPass<0.5){ vec3 c=vec3(0.); for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++) c+=texture(uTex,vUv+vec2(x,y)*uPx).rgb; c/=9.;
    float l=max(max(c.r,c.g),c.b); o=vec4(c*smoothstep(2.0,4.0,l),1.); return; }
  vec3 s=vec3(0.); float w=0.;
  for(int i=-6;i<=6;i++){ float k=exp(-float(i*i)/14.); s+=texture(uTex,vUv+uDir*float(i)*uPx*1.6).rgb*k; w+=k; }
  o=vec4(s/w,1.);
}`;

const FS_SSAO = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D uDepth; uniform mat4 uInvP, uP; uniform vec2 uPx; uniform float uR;
vec3 vpos(vec2 uv){ float d=texture(uDepth,uv).r; vec4 p=uInvP*vec4(uv*2.-1.,d*2.-1.,1.); return p.xyz/p.w; }
float h1(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  float d=texture(uDepth,vUv).r; if(d>=0.99999){o=vec4(1.);return;}
  vec3 P=vpos(vUv);
  vec3 Px=vpos(vUv+vec2(uPx.x,0.)), Py=vpos(vUv+vec2(0.,uPx.y));
  vec3 Nx=vpos(vUv-vec2(uPx.x,0.)), Ny=vpos(vUv-vec2(0.,uPx.y));
  vec3 dx=abs(Px.z-P.z)<abs(Nx.z-P.z)?Px-P:P-Nx; vec3 dy=abs(Py.z-P.z)<abs(Ny.z-P.z)?Py-P:P-Ny;
  vec3 N=normalize(cross(dx,dy)); if(dot(N,P)>0.) N=-N;
  vec2 ip=mod(floor(gl_FragCoord.xy),4.); float rnd=((ip.x*4.+ip.y)/16.+h1(floor(gl_FragCoord.xy/4.))*0.0)*6.2831;
  vec3 T=normalize(cross(N,abs(N.y)<0.9?vec3(0.,1.,0.):vec3(1.,0.,0.))); vec3 Bt=cross(N,T);
  float R=uR*(1.+(-P.z)*0.006);
  float occ=0.;
  for(int i=0;i<14;i++){
    float fi=float(i); float t=(fi+0.5)/14.; float rr=mix(0.12,1.,t*t);
    float a=fi*2.39996+rnd; float ct=fract(fi*0.618+0.31); float sn=sqrt(1.-ct*ct);
    vec3 dir=(T*cos(a)+Bt*sin(a))*sn+N*ct;
    vec3 sp=P+dir*R*rr;
    vec4 c=uP*vec4(sp,1.); vec2 suv=c.xy/c.w*0.5+0.5;
    if(suv.x<0.||suv.x>1.||suv.y<0.||suv.y>1.) continue;
    float sz=vpos(suv).z;
    float range=smoothstep(0.,1.,R/max(abs(P.z-sz),1e-3));
    occ+=step(sp.z+0.02*R,sz)*range;
  }
  float ao=clamp(1.-occ/14.*1.25,0.,1.);
  o=vec4(vec3(ao),1.);
}`;

const VS_GLOW = `#version 300 es
precision highp float; layout(location=0) in vec3 aPos; layout(location=2) in vec3 aCol;
uniform mat4 uVP; out vec2 vUv; out float vK;
void main(){ vUv=aCol.xy; vK=aCol.z; gl_Position=uVP*vec4(aPos,1.); }`;
const FS_GLOW = `#version 300 es
precision highp float; in vec2 vUv; in float vK; uniform float uNight; out vec4 o;
void main(){ float r=length(vUv*2.-1.); float k=pow(max(1.-r,0.),2.2); o=vec4(vec3(1.,0.72,0.42)*k*uNight*vK,1.); }`;

export type Light = {
	sun: number[];
	sky: number[];
	hor: number[];
	gnd: number[];
	amb: number;
	night: number;
	sd: number[];
};

export type RenderParams = {
	w: number;
	h: number;
	fov: number;
	near: number;
	far: number;
	eye: number[];
	target: number[];
	sunDir: number[];
	shadowR: number;
	light: Light;
	time: number;
	info: number;
	sel: number;
	fog: number;
	tilt: number;
	bloom: number;
	aoK?: number;
	aoR?: number;
	opaque: string[];
	casters: string[];
	glow?: string[];
};

export type Mesh = {
	vao: WebGLVertexArrayObject;
	buf: WebGLBuffer;
	count: number;
	visible: boolean;
	cap: number;
};

type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };

export type Engine = ReturnType<typeof createEngine>;

export function createEngine(canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext('webgl2', {
		antialias: false,
		alpha: false,
		powerPreference: 'high-performance'
	});
	if (!ctx) throw new Error('WebGL2 not available');
	const gl: WebGL2RenderingContext = ctx;
	const hasF =
		!!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
	gl.getExtension('OES_texture_float_linear');

	const must = <T>(v: T | null, what: string): T => {
		if (v === null) throw new Error(what);
		return v;
	};

	function prog(vs: string, fs: string): Prog {
		const p = must(gl.createProgram(), 'program');
		for (const [t, s] of [
			[gl.VERTEX_SHADER, vs],
			[gl.FRAGMENT_SHADER, fs]
		] as const) {
			const sh = must(gl.createShader(t), 'shader');
			gl.shaderSource(sh, s);
			gl.compileShader(sh);
			if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
				throw new Error(gl.getShaderInfoLog(sh) ?? '');
			gl.attachShader(p, sh);
		}
		gl.linkProgram(p);
		if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? '');
		const u: Record<string, WebGLUniformLocation | null> = {};
		const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
		for (let i = 0; i < n; i++) {
			const inf = must(gl.getActiveUniform(p, i), 'uniform');
			u[inf.name] = gl.getUniformLocation(p, inf.name);
		}
		return { p, u };
	}
	const P = {
		main: prog(VS_MAIN, FS_MAIN),
		depth: prog(VS_DEPTH, FS_DEPTH),
		sky: prog(VS_FULL, FS_SKY),
		post: prog(VS_FULL, FS_POST),
		ssao: prog(VS_FULL, FS_SSAO),
		bright: prog(VS_FULL, FS_BRIGHT),
		glow: prog(VS_GLOW, FS_GLOW)
	};

	const meshes: Record<string, Mesh | undefined> = {};
	function setMesh(name: string, arr: Float32Array, dynamic?: boolean): Mesh {
		let m = meshes[name];
		if (!m) {
			m = meshes[name] = {
				vao: must(gl.createVertexArray(), 'vao'),
				buf: must(gl.createBuffer(), 'buffer'),
				count: 0,
				visible: true,
				cap: 0
			};
			gl.bindVertexArray(m.vao);
			gl.bindBuffer(gl.ARRAY_BUFFER, m.buf);
			const S = 48;
			gl.enableVertexAttribArray(0);
			gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
			gl.enableVertexAttribArray(1);
			gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 12);
			gl.enableVertexAttribArray(2);
			gl.vertexAttribPointer(2, 3, gl.FLOAT, false, S, 24);
			gl.enableVertexAttribArray(3);
			gl.vertexAttribPointer(3, 1, gl.FLOAT, false, S, 36);
			gl.enableVertexAttribArray(4);
			gl.vertexAttribPointer(4, 1, gl.FLOAT, false, S, 40);
			gl.enableVertexAttribArray(5);
			gl.vertexAttribPointer(5, 1, gl.FLOAT, false, S, 44);
			gl.bindVertexArray(null);
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, m.buf);
		if (dynamic && arr.byteLength <= m.cap) gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr);
		else {
			gl.bufferData(
				gl.ARRAY_BUFFER,
				dynamic ? (Math.max(arr.byteLength, 1 << 16) * 1.5) | 0 : arr.byteLength,
				dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW
			);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr);
			m.cap = dynamic ? (Math.max(arr.byteLength, 1 << 16) * 1.5) | 0 : arr.byteLength;
		}
		m.count = arr.length / 12;
		return m;
	}

	// data texture: per-building info rgb + rise a
	const DATA = new Uint8Array(128 * 128 * 4);
	for (let i = 0; i < 128 * 128; i++) DATA[i * 4 + 3] = 255;
	const dataTex = must(gl.createTexture(), 'texture');
	gl.bindTexture(gl.TEXTURE_2D, dataTex);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 128, 128, 0, gl.RGBA, gl.UNSIGNED_BYTE, DATA);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	let dataDirty = false;

	// shadow map
	const SM = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE) as number);
	const smTex = must(gl.createTexture(), 'texture');
	gl.bindTexture(gl.TEXTURE_2D, smTex);
	gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SM, SM);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	const smFbo = must(gl.createFramebuffer(), 'framebuffer');
	gl.bindFramebuffer(gl.FRAMEBUFFER, smFbo);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, smTex, 0);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	// render targets
	let W = 0,
		H = 0,
		msFbo: WebGLFramebuffer | null = null,
		msColor: WebGLRenderbuffer | null = null,
		msDepth: WebGLRenderbuffer | null = null,
		rTex: WebGLTexture | null = null,
		rFbo: WebGLFramebuffer | null = null,
		dTex: WebGLTexture | null = null,
		aoTex: WebGLTexture | null = null,
		aoFbo: WebGLFramebuffer | null = null,
		bTex: WebGLTexture[] = [],
		bFbo: WebGLFramebuffer[] = [];
	const fmt = hasF ? gl.RGBA16F : gl.RGBA8;
	const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) as number);
	function mkTex(w: number, h: number): [WebGLTexture, WebGLFramebuffer] {
		const t = must(gl.createTexture(), 'texture');
		gl.bindTexture(gl.TEXTURE_2D, t);
		gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		const f = must(gl.createFramebuffer(), 'framebuffer');
		gl.bindFramebuffer(gl.FRAMEBUFFER, f);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
		return [t, f];
	}
	function resize(w: number, h: number) {
		if (w === W && h === H) return;
		W = w;
		H = h;
		canvas.width = w;
		canvas.height = h;
		[msColor, msDepth].forEach((r) => r && gl.deleteRenderbuffer(r));
		msFbo = msFbo || gl.createFramebuffer();
		msColor = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, msColor);
		gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, fmt, w, h);
		msDepth = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, msDepth);
		gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
		gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msColor);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, msDepth);
		[rTex, rFbo] = mkTex(w, h);
		dTex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, dTex);
		gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, w, h);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindFramebuffer(gl.FRAMEBUFFER, rFbo);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, dTex, 0);
		aoTex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, aoTex);
		gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, Math.max(1, w >> 1), Math.max(1, h >> 1));
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		aoFbo = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, aoFbo);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, aoTex, 0);
		const bw = Math.max(1, w >> 2),
			bh = Math.max(1, h >> 2);
		bTex = [];
		bFbo = [];
		for (let i = 0; i < 2; i++) {
			const [t, f] = mkTex(bw, bh);
			bTex.push(t);
			bFbo.push(f);
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	function drawMeshes(list: readonly string[]) {
		for (const k of list) {
			const m = meshes[k];
			if (!m || !m.visible || !m.count) continue;
			gl.bindVertexArray(m.vao);
			gl.drawArrays(gl.TRIANGLES, 0, m.count);
		}
	}

	function render(S: RenderParams): { VP: Mat4; LVP: Mat4 } {
		resize(S.w, S.h);
		if (dataDirty) {
			gl.bindTexture(gl.TEXTURE_2D, dataTex);
			gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 128, 128, gl.RGBA, gl.UNSIGNED_BYTE, DATA);
			dataDirty = false;
		}
		const asp = S.w / S.h;
		const proj = M4.persp(S.fov, asp, S.near, S.far);
		const view = M4.look(S.eye, S.target, [0, 1, 0]);
		const VP = M4.mul(proj, view);
		// light matrix fitted to view target
		const sd = S.sunDir;
		const R = S.shadowR;
		const tc = [S.target[0], 0, S.target[2]];
		const le = [tc[0] + sd[0] * 600, tc[1] + sd[1] * 600, tc[2] + sd[2] * 600];
		const LV = M4.look(le, tc, [0, 1, 0]);
		// snap
		const tx = (2 * R) / SM;
		LV[12] = Math.round(LV[12] / tx) * tx;
		LV[13] = Math.round(LV[13] / tx) * tx;
		const LVP = M4.mul(M4.ortho(-R, R, -R, R, 1, 1400), LV);
		const staticList = S.opaque;

		// shadow pass
		gl.bindFramebuffer(gl.FRAMEBUFFER, smFbo);
		gl.viewport(0, 0, SM, SM);
		gl.clear(gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.disable(gl.BLEND);
		gl.useProgram(P.depth.p);
		gl.uniformMatrix4fv(P.depth.u.uLVP, false, LVP);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, dataTex);
		gl.uniform1i(P.depth.u.uData, 1);
		gl.enable(gl.POLYGON_OFFSET_FILL);
		gl.polygonOffset(1.5, 3);
		if (S.sunDir[1] > 0.02) drawMeshes(S.casters);
		gl.disable(gl.POLYGON_OFFSET_FILL);

		// main pass
		gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
		gl.viewport(0, 0, S.w, S.h);
		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		const L = S.light;
		// sky
		gl.depthMask(false);
		gl.disable(gl.DEPTH_TEST);
		gl.useProgram(P.sky.p);
		const su = P.sky.u;
		gl.uniformMatrix4fv(su.uInvVP, false, M4.inv(VP));
		gl.uniform3fv(su.uSunDir, sd);
		gl.uniform3fv(su.uSunCol, L.sun);
		gl.uniform3fv(su.uSkyCol, L.sky);
		gl.uniform3fv(su.uHorCol, L.hor);
		gl.uniform3fv(su.uCam, S.eye);
		gl.uniform1f(su.uNight, L.night);
		gl.uniform1f(su.uTime, S.time);
		gl.uniform1f(su.uInfo, S.info);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		gl.depthMask(true);
		gl.enable(gl.DEPTH_TEST);

		gl.useProgram(P.main.p);
		const u = P.main.u;
		gl.uniformMatrix4fv(u.uVP, false, VP);
		gl.uniformMatrix4fv(u.uLVP, false, LVP);
		gl.uniform3fv(u.uSunDir, sd);
		gl.uniform3fv(u.uSunCol, L.sun);
		gl.uniform3fv(u.uSkyCol, L.sky);
		gl.uniform3fv(u.uHorCol, L.hor);
		gl.uniform3fv(u.uGndCol, L.gnd);
		gl.uniform3fv(u.uCam, S.eye);
		gl.uniform1f(u.uNight, L.night);
		gl.uniform1f(u.uTime, S.time);
		gl.uniform1f(u.uInfo, S.info);
		gl.uniform1f(u.uSel, S.sel || -1);
		gl.uniform1f(u.uFogDen, S.fog);
		gl.uniform1f(u.uAmb, L.amb);
		gl.uniform1f(u.uTexel, 1 / SM);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, smTex);
		gl.uniform1i(u.uShadow, 0);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, dataTex);
		gl.uniform1i(u.uData, 1);
		drawMeshes(staticList);

		// glow pools (additive)
		if (L.night > 0.02 && S.glow) {
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.ONE, gl.ONE);
			gl.depthMask(false);
			gl.useProgram(P.glow.p);
			gl.uniformMatrix4fv(P.glow.u.uVP, false, VP);
			gl.uniform1f(P.glow.u.uNight, L.night * (1 - S.info));
			drawMeshes(S.glow);
			gl.depthMask(true);
			gl.disable(gl.BLEND);
		}

		// resolve
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFbo);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, rFbo);
		gl.blitFramebuffer(
			0,
			0,
			S.w,
			S.h,
			0,
			0,
			S.w,
			S.h,
			gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT,
			gl.NEAREST
		);
		// ssao
		gl.disable(gl.DEPTH_TEST);
		gl.bindFramebuffer(gl.FRAMEBUFFER, aoFbo);
		gl.viewport(0, 0, Math.max(1, S.w >> 1), Math.max(1, S.h >> 1));
		gl.useProgram(P.ssao.p);
		const au = P.ssao.u;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, dTex);
		gl.uniform1i(au.uDepth, 0);
		gl.uniformMatrix4fv(au.uP, false, proj);
		gl.uniformMatrix4fv(au.uInvP, false, M4.inv(proj));
		gl.uniform2f(au.uPx, 1 / S.w, 1 / S.h);
		gl.uniform1f(au.uR, S.aoR || 3);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		// bloom
		gl.disable(gl.DEPTH_TEST);
		const bw = Math.max(1, S.w >> 2),
			bh = Math.max(1, S.h >> 2);
		gl.useProgram(P.bright.p);
		const bu = P.bright.u;
		gl.viewport(0, 0, bw, bh);
		gl.bindFramebuffer(gl.FRAMEBUFFER, bFbo[0]);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, rTex);
		gl.uniform1i(bu.uTex, 0);
		gl.uniform2f(bu.uPx, 1 / S.w, 1 / S.h);
		gl.uniform1f(bu.uPass, 0);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		gl.bindFramebuffer(gl.FRAMEBUFFER, bFbo[1]);
		gl.bindTexture(gl.TEXTURE_2D, bTex[0]);
		gl.uniform2f(bu.uPx, 1 / bw, 1 / bh);
		gl.uniform2f(bu.uDir, 1, 0);
		gl.uniform1f(bu.uPass, 1);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		gl.bindFramebuffer(gl.FRAMEBUFFER, bFbo[0]);
		gl.bindTexture(gl.TEXTURE_2D, bTex[1]);
		gl.uniform2f(bu.uDir, 0, 1);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		// post
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, S.w, S.h);
		gl.useProgram(P.post.p);
		const pu = P.post.u;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, rTex);
		gl.uniform1i(pu.uTex, 0);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, bTex[0]);
		gl.uniform1i(pu.uBloom, 1);
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, aoTex);
		gl.uniform1i(pu.uAO, 2);
		gl.uniform1f(pu.uAOK, S.aoK === undefined ? 0.85 : S.aoK);
		gl.uniform2f(pu.uPx, 1 / S.w, 1 / S.h);
		gl.uniform1f(pu.uTilt, S.tilt);
		gl.uniform1f(pu.uBloomK, S.bloom);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		gl.enable(gl.DEPTH_TEST);
		return { VP, LVP };
	}

	return {
		gl,
		setMesh,
		meshes,
		render,
		M4,
		setData(id: number, r: number, g: number, b: number, a?: number) {
			const k = id * 4;
			DATA[k] = r;
			DATA[k + 1] = g;
			DATA[k + 2] = b;
			if (a !== undefined) DATA[k + 3] = a;
			dataDirty = true;
		},
		getRise(id: number) {
			return DATA[id * 4 + 3] / 255;
		},
		info: { hasF, SM, samples }
	};
}
