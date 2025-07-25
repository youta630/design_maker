// 3D有機体オブジェクト用シェーダー
export const vertexShader = `
  // Perlin noise function
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
  }

  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  vec3 fade(vec3 t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }

  float cnoise(vec3 P) {
    vec3 Pi0 = floor(P);
    vec3 Pi1 = Pi0 + vec3(1.0);
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }

  // Fractal noise
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 4; i++) {
      value += amplitude * cnoise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    
    return value;
  }

  uniform float uTime;
  uniform float uDistortion;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vNoise;

  void main() {
    vUv = uv;
    
    // 複数の周波数でノイズを適用
    vec3 pos = position;
    float noise1 = fbm(pos * 2.0 + uTime * 0.5);
    float noise2 = fbm(pos * 4.0 + uTime * 0.3);
    float noise3 = fbm(pos * 8.0 + uTime * 0.1);
    
    // フラクタルノイズで有機的な形状
    float displacement = (noise1 * 0.6 + noise2 * 0.3 + noise3 * 0.1) * uDistortion;
    
    // 法線方向にオフセット
    vec3 newPosition = pos + normal * displacement;
    
    // 新しい法線を計算
    vec3 tangent1 = normalize(cross(normal, vec3(1.0, 0.0, 0.0)));
    vec3 tangent2 = normalize(cross(normal, tangent1));
    
    float delta = 0.01;
    vec3 p1 = pos + tangent1 * delta;
    vec3 p2 = pos + tangent2 * delta;
    
    float disp1 = (fbm(p1 * 2.0 + uTime * 0.5) * 0.6 + fbm(p1 * 4.0 + uTime * 0.3) * 0.3 + fbm(p1 * 8.0 + uTime * 0.1) * 0.1) * uDistortion;
    float disp2 = (fbm(p2 * 2.0 + uTime * 0.5) * 0.6 + fbm(p2 * 4.0 + uTime * 0.3) * 0.3 + fbm(p2 * 8.0 + uTime * 0.1) * 0.1) * uDistortion;
    
    vec3 newP1 = p1 + normal * disp1;
    vec3 newP2 = p2 + normal * disp2;
    
    vec3 newNormal = normalize(cross(newP1 - newPosition, newP2 - newPosition));
    
    vNormal = normalize(normalMatrix * newNormal);
    vPosition = (modelViewMatrix * vec4(newPosition, 1.0)).xyz;
    vNoise = displacement;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

export const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  uniform sampler2D uEnvMap;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vNoise;

  // HSL color space conversion
  vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);
    
    // 法線角度でHSLグラデーション
    float normalAngle = dot(normal, viewDir);
    float hue = (normalAngle + 1.0) * 0.5;
    
    // 2色間のHSLブレンド
    vec3 colorA_hsl = vec3(0.0, 0.8, 0.6); // Red in HSL
    vec3 colorB_hsl = vec3(0.33, 0.8, 0.6); // Green in HSL
    
    if (uColorA == vec3(1.0, 0.188, 0.188)) { // Monthly red
      colorA_hsl = vec3(0.0, 0.9, 0.7);
    } else { // Yearly green
      colorA_hsl = vec3(0.33, 0.9, 0.7);
    }
    
    vec3 mixedHSL = mix(colorA_hsl, colorB_hsl, hue);
    vec3 baseColor = hsl2rgb(mixedHSL);
    
    // 環境反射のシミュレーション
    vec3 reflectDir = reflect(-viewDir, normal);
    float envSample = (reflectDir.y + 1.0) * 0.5; // Simple environment mapping
    
    // フレネル効果
    float fresnel = pow(1.0 - normalAngle, 2.0);
    
    // ノイズベースの模様
    float pattern = sin(vNoise * 10.0 + uTime) * 0.1 + 0.9;
    
    // 最終色の合成
    vec3 finalColor = baseColor * pattern;
    finalColor += vec3(1.0) * fresnel * 0.3; // フレネルハイライト
    finalColor += vec3(1.0) * envSample * 0.2; // 環境反射
    
    // トーンマッピング
    finalColor = finalColor / (finalColor + vec3(1.0));
    finalColor = pow(finalColor, vec3(1.0 / 2.2)); // ガンマ補正
    
    gl_FragColor = vec4(finalColor, uOpacity);
  }
`;