type Mat4 = Float64Array | number[];

export function invertMat4(out: Mat4, m: Mat4): boolean {
  const [m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15] = m;
  const b0=m0*m5-m1*m4, b1=m0*m6-m2*m4, b2=m0*m7-m3*m4, b3=m1*m6-m2*m5;
  const b4=m1*m7-m3*m5, b5=m2*m7-m3*m6, b6=m8*m13-m9*m12, b7=m8*m14-m10*m12;
  const b8=m8*m15-m11*m12, b9=m9*m14-m10*m13, b10=m9*m15-m11*m13, b11=m10*m15-m11*m14;
  let d = b0*b11-b1*b10+b2*b9+b3*b8-b4*b7+b5*b6;
  if (Math.abs(d) < 1e-10) return false;
  d = 1/d;
  out[0]=(m5*b11-m6*b10+m7*b9)*d;  out[1]=(-m1*b11+m2*b10-m3*b9)*d;
  out[2]=(m13*b5-m14*b4+m15*b3)*d; out[3]=(-m9*b5+m10*b4-m11*b3)*d;
  out[4]=(-m4*b11+m6*b8-m7*b7)*d;  out[5]=(m0*b11-m2*b8+m3*b7)*d;
  out[6]=(-m12*b5+m14*b2-m15*b1)*d; out[7]=(m8*b5-m10*b2+m11*b1)*d;
  out[8]=(m4*b10-m5*b8+m7*b6)*d;   out[9]=(-m0*b10+m1*b8-m3*b6)*d;
  out[10]=(m12*b4-m13*b2+m15*b0)*d; out[11]=(-m8*b4+m9*b2-m11*b0)*d;
  out[12]=(-m4*b9+m5*b7-m6*b6)*d;  out[13]=(m0*b9-m1*b7+m2*b6)*d;
  out[14]=(-m12*b3+m13*b1-m14*b0)*d; out[15]=(m8*b3-m9*b1+m10*b0)*d;
  return true;
}

export function computeFrustumCorners(invPV: Mat4): Float32Array {
  function unp(nx: number, ny: number, nz: number): [number, number, number] {
    const x=invPV[0]*nx+invPV[4]*ny+invPV[8]*nz+invPV[12];
    const y=invPV[1]*nx+invPV[5]*ny+invPV[9]*nz+invPV[13];
    const z=invPV[2]*nx+invPV[6]*ny+invPV[10]*nz+invPV[14];
    const w=invPV[3]*nx+invPV[7]*ny+invPV[11]*nz+invPV[15];
    return [x/w, y/w, z/w];
  }
  // Reversed-z infinite far: NDC z = projNear / distance, so z=1 is the near
  // plane and z→0 is infinity.  Use z=1 for near and a small z for far to
  // visualize the frustum out to ~100× camera distance.
  const zNear = 1.0, zFar = 1e-5;
  const corners = new Float32Array(24);
  const ndcXY: [number, number][] = [[-1,-1],[1,-1],[1,1],[-1,1]];
  for (let i = 0; i < 4; i++) {
    const [nx, ny] = ndcXY[i];
    const pNear = unp(nx, ny, zNear);
    const pFar = unp(nx, ny, zFar);
    corners[i*3]     = pNear[0]; corners[i*3+1]     = pNear[1]; corners[i*3+2]     = pNear[2];
    corners[(i+4)*3] = pFar[0];  corners[(i+4)*3+1] = pFar[1];  corners[(i+4)*3+2] = pFar[2];
  }
  return corners;
}
