---
title: Splat with 256 Texture – Review on MegaSplat | 256套贴图混合地形-MegaSplat回顾
date: 2018-09-03 00:00:00
---

自动编译shader-组装片段

基本思路是会有一个feature类，不同的shader启用不同feature，按feature来组装写好的片段，需要的property和define写进去。当然函数主体是一样的，只是不同的define控制的分支。

一般地形shader特性——混合，雪，湿，积水，tess，parallax，macromap等

    雪量在DoSnow里，基本思路是用height和ao来生成一个snowAmount，这个snowAmount来lerp颜色法线等等

```
         float DoSnow(inout MegaSplatLayer o, float2 uv, float3 worldNormal, half snowHeightFade, float puddleHeight, half surfPorosity, float camDist)
         {
            // could force a branch and avoid texsamples
            #if _SNOW
            uv *= _SnowUVScales.xy;
            half4 snowAlb = tex2D(_SnowDiff, uv);
            half4 snowNsao = tex2D(_SnowNormal, uv);
            half3 snowNormal = half3(snowNsao.xy * 2 - 1, 1);
            snowNormal.z = sqrt(1 - saturate(dot(snowNormal.xy, snowNormal.xy)));
            float snowAmount, wetnessMask, snowNormalAmount;
            float snowFade = saturate((_SnowAmount - puddleHeight) * snowHeightFade);
            float ao = o.Occlusion;
            if (snowFade > 0)
            {
               float height = o.Height * _SnowParams.x;
               float erosion = lerp(1-ao, (height + ao) * 0.5, _SnowParams.y);
               float snowMask = saturate((snowFade - erosion) * 8);
               snowMask *= snowMask * snowMask * snowMask;
               snowAmount = snowMask * saturate(dot(worldNormal, _SnowUpVector));  // up
               wetnessMask = saturate((_SnowParams.w * (4.0 * snowFade) - (height + snowNsao.b) * 0.5));
               snowAmount = saturate(snowAmount * 8);
               snowNormalAmount = snowAmount * snowAmount;
               float porosity = saturate((((1.0 - o.Smoothness) - 0.5)) / max(surfPorosity, 0.001));
               float factor = lerp(1, 0.4, porosity);
               o.Albedo *= lerp(1.0, factor, wetnessMask);
               o.Normal = lerp(o.Normal, float3(0,0,1), wetnessMask);
               o.Smoothness = lerp(o.Smoothness, 0.8, wetnessMask);
            }
            o.Albedo = lerp(o.Albedo, snowAlb.rgb, snowAmount);
            o.Normal = lerp(o.Normal, snowNormal, snowNormalAmount);
            o.Smoothness = lerp(o.Smoothness, (snowNsao.b) * _SnowParams.z, snowAmount);
            o.Occlusion = lerp(o.Occlusion, snowNsao.w, snowAmount);
            o.Height = lerp(o.Height, snowAlb.a, snowAmount);
            o.Metallic = lerp(o.Metallic, 0.01, snowAmount);
            float crystals = saturate(0.65 - snowNsao.b);
            o.Smoothness = lerp(o.Smoothness, crystals * _SnowParams.z, snowAmount);
            return snowAmount;
            #endif
            return 0;
         }
```

![7a52c4753c394e08efa56bd4d7215b89.png](/images/7a52c4753c394e08efa56bd4d7215b89.jpg)

浅溪在DoPuddle里，会有泡沫和水波涟漪的计算，另外还会用法线重采样原有地形贴图造成折射效果

```
         float DoPuddles(inout MegaSplatLayer o, float2 uv, half3 waterNormFoam, half puddleLevel, half2 flowDir, half porosity, float3 worldNormal)
         {
            #if _PUDDLES || _PUDDLEFLOW || _PUDDLEREFRACT
            puddleLevel *= _MaxPuddles;
            float waterBlend = saturate((puddleLevel - o.Height) * _PuddleBlend);
            half3 waterNorm = half3(0,0,1);
            #if _PUDDLEFLOW || _PUDDLEREFRACT
               waterNorm = half3(waterNormFoam.x, waterNormFoam.y, sqrt(1 - saturate(dot(waterNormFoam.xy, waterNormFoam.xy))));
               #if _PUDDLEFOAM
               half pmh = puddleLevel - o.Height;
               // refactor to compute flow UVs in previous step?
               float2 foamUV0;
               float2 foamUV1;
               half foamInterp;
               Flow(uv * 1.75 + waterNormFoam.xy * waterNormFoam.b, flowDir, _PuddleFlowParams.y/3, _PuddleFlowParams.z/3, foamUV0, foamUV1, foamInterp);
               half foam0 = tex2D(_PuddleNormal, foamUV0).b;
               half foam1 = tex2D(_PuddleNormal, foamUV1).b;
               half foam = lerp(foam0, foam1, foamInterp);
               foam = foam * abs(pmh) + (foam * o.Height);
               foam *= 1.0 - (saturate(pmh * 1.5));
               foam *= foam;
               foam *= _PuddleNormalFoam.y;
               #endif // foam
            #endif // flow, refract
            half3 wetAlbedo = o.Albedo * _PuddleTint * 2;
            half wetSmoothness = o.Smoothness;
            WaterBRDF(wetAlbedo, wetSmoothness, o.Metallic, waterBlend, porosity);
            #if _RAINDROPS
               float dropStrength = _RainIntensity;
               #if _RAINDROPFLATONLY
               dropStrength = saturate(dot(float3(0,1,0), worldNormal));
               #endif
               const float4 timeMul = float4(1.0f, 0.85f, 0.93f, 1.13f);
               float4 timeAdd = float4(0.0f, 0.2f, 0.45f, 0.7f);
               float4 times = _Time.yyyy;
               times = frac((times * float4(1, 0.85, 0.93, 1.13) + float4(0, 0.2, 0.45, 0.7)) * 1.6);
               float2 ruv1 = uv * _RainUVScales.xy;
               float2 ruv2 = ruv1;
               float4 weights = _RainIntensity.xxxx - float4(0, 0.25, 0.5, 0.75);
               float3 ripple1 = ComputeRipple(ruv1 + float2( 0.25f,0.0f), times.x, weights.x);
               float3 ripple2 = ComputeRipple(ruv2 + float2(-0.55f,0.3f), times.y, weights.y);
               float3 ripple3 = ComputeRipple(ruv1 + float2(0.6f, 0.85f), times.z, weights.z);
               float3 ripple4 = ComputeRipple(ruv2 + float2(0.5f,-0.75f), times.w, weights.w);
               weights = saturate(weights * 4);
               float4 z = lerp(float4(1,1,1,1), float4(ripple1.z, ripple2.z, ripple3.z, ripple4.z), weights);
               float3 rippleNormal = float3( weights.x * ripple1.xy +
                           weights.y * ripple2.xy +
                           weights.z * ripple3.xy +
                           weights.w * ripple4.xy,
                           z.x * z.y * z.z * z.w);
               waterNorm = lerp(waterNorm, normalize(rippleNormal+waterNorm), _RainIntensity * dropStrength);                        
            #endif
            #if _PUDDLEFOAM
            wetAlbedo += foam;
            wetSmoothness -= foam;
            #endif
            o.Normal = lerp(o.Normal, waterNorm, waterBlend * _PuddleNormalFoam.x);
            o.Occlusion = lerp(o.Occlusion, 1, waterBlend);
            o.Smoothness = lerp(o.Smoothness, wetSmoothness, waterBlend);
            o.Albedo = lerp(o.Albedo, wetAlbedo, waterBlend);
            return waterBlend;
            #endif
            return 0;
         }
```

熔岩在DoLava里

```
         float DoLava(inout MegaSplatLayer o, float2 uv, half lavaLevel, half2 flowDir)
         {
            #if _LAVA
            half distortionSize = _LavaParams2.x;
            half distortionRate = _LavaParams2.y;
            half distortionScale = _LavaParams2.z;
            half darkening = _LavaParams2.w;
            half3 edgeColor = _LavaEdgeColor;
            half3 lavaColorLow = _LavaColorLow;
            half3 lavaColorHighlight = _LavaColorHighlight;
            half maxLava = _LavaParams.y;
            half lavaSpeed = _LavaParams.z;
            half lavaInterp = _LavaParams.w;
            lavaLevel *= maxLava;
            float lvh = lavaLevel - o.Height;
            float lavaBlend = saturate(lvh * _LavaParams.x);
            float2 uv1;
            float2 uv2;
            half interp;
            half drag = lerp(0.1, 1, saturate(lvh));
            Flow(uv, flowDir, lavaInterp, lavaSpeed * drag, uv1, uv2, interp);
            float2 dist_uv1;
            float2 dist_uv2;
            half dist_interp;
            Flow(uv * distortionScale, flowDir, distortionRate, distortionSize, dist_uv1, dist_uv2, dist_interp);
            half4 lavaDist = lerp(tex2D(_LavaDiffuse, dist_uv1*0.51), tex2D(_LavaDiffuse, dist_uv2), dist_interp);
            half4 dist = lavaDist * (distortionSize * 2) - distortionSize;
            half4 lavaTex = lerp(tex2D(_LavaDiffuse, uv1*1.1 + dist.xy), tex2D(_LavaDiffuse, uv2 + dist.zw), interp);
            lavaTex.xy = lavaTex.xy * 2 - 1;
            half3 lavaNorm = half3(lavaTex.xy, sqrt(1 - saturate(dot(lavaTex.xy, lavaTex.xy))));
            // base lava color, based on heights
            half3 lavaColor = lerp(lavaColorLow, lavaColorHighlight, lavaTex.b);
            // edges
            float lavaBlendWide = saturate((lavaLevel - o.Height) * _LavaParams.x * 0.5);
            float edge = saturate((1 - lavaBlendWide) * 3);
            // darkening
            darkening = saturate(lavaTex.a * darkening * saturate(lvh*2));
            lavaColor = lerp(lavaColor, lavaDist.bbb * 0.3, darkening);
            // edges
            lavaColor = lerp(lavaColor, edgeColor, edge);
            o.Albedo = lerp(o.Albedo, lavaColor, lavaBlend);
            o.Normal = lerp(o.Normal, lavaNorm, lavaBlend);
            o.Smoothness = lerp(o.Smoothness, 0.3, lavaBlend * darkening);
            half3 emis = lavaColor * lavaBlend;
            o.Emission = lerp(o.Emission, emis, lavaBlend);
            // bleed
            o.Emission += edgeColor * 0.3 * (saturate((lavaLevel*1.2 - o.Height) * _LavaParams.x) - lavaBlend);
            return lavaBlend;
            #endif
            return 0;
         }
```

![57376b8167ee26c971c99e53b03fbadf.png](/images/57376b8167ee26c971c99e53b03fbadf.jpg)

支持一个pass 256张贴图，使用TextureArray，在顶点上存Id。但是per pixel怎么读取id呢，一差值就傻了啊

巧妙用了一个mask的方式

![3bb98f29ccc39c18b8b20c80aaae86e6.png](/images/3bb98f29ccc39c18b8b20c80aaae86e6.jpg)

每个顶点上存两个index，分别是这里混合的两层贴图的id，然后还会存一个顶点色。对于某一个三角形，三个vertex存的颜色分别是(1,0,0), (0,1,0), (0,0,1).

之后vertex shader里来做插值。这里假设顶点色存的是上图的颜色，UV3的x是第一层id，UV3的y是第二层id，UV3的z是两层的混合强度

```
struct Input{
    half3 vertexWeights;
    half3 index0;
    half3 index1;
    half blendWeight;
}

void vert(inout appdata v, out Input o){
    o.vertexWeights= v.color;
    o.index0 = v.color * v.texcoord2.x;
    o.index1 = v.color * v.texcoord2.y;
    o.blendWeight = v.texcoord2.z;
}
```

之后再surf/frag里面这样就可以了，用Input的index0除以vertexWeights，就得到了这个pixel所在的三角形，三个顶点处的ID，就可以来用它采样texturearray

```
void surf(Input IN, inout SurfaceOutoutStandard o){
    half3 index0f = IN.index0 / IN.vertexWeights;
    half3 index1f = IN.index1 / IN.vertexWeights;
    int3 index0 =  round(index0f * 255);
    int3 index1 = round(index1f * 255);

    half3 diffuse0 =UNITY_SAMPLE_TEX2DARRAY(_Albedo, float3(uv, index0.x)) * IN.vertexWeights.x + 
                            UNITY_SAMPLE_TEX2DARRAY(_Albedo, float3(uv, index0.y)) * IN.vertexWeights.y + 
                            UNITY_SAMPLE_TEX2DARRAY(_Albedo, float3(uv, index0.z)) * IN.vertexWeights.z + 

    half3 diffuse1 =UNITY_SAMPLE_TEX2DARRAY(_Albedo, float3(uv, index1.x)) * IN.vertexWeights.x + 
                            UNITY_SAMPLE_TEX2DARRAY(_Albedo, float3(uv, index1.y)) * IN.vertexWeights.y + 
                            UNITY_SAMPLE_TEX2DARRAY(_Albedo, float3(uv, index1.z)) * IN.vertexWeights.z + 

    half3 diffuse = lerp(diffuse1, diffuse0, IN.blendWeight);
}
```

神奇的事情发生在顶点插值计算的时候，vertexWeights的通道特性决定了index0的xyz分别是该pixel所在的三角面上三个vertex的id，于是用这个id正好和vertexWeights进行混合

![f264c491d0b6b123479195c8fe076001.png](/images/f264c491d0b6b123479195c8fe076001.jpg)

![2d2f5d67f0450cf0a5a0d15bdf2eb288.png](/images/2d2f5d67f0450cf0a5a0d15bdf2eb288.jpg)

![5a76b3ce70027c10b836b647e1c53271.png](/images/5a76b3ce70027c10b836b647e1c53271.jpg)

```
struct Input
      {
          // avoid naming UV because unity magic..
          float2 coords;               // uv, or triplanar UV
          float4 valuesMain;           //index rgb, triplanar W
          #if _TWOLAYER || _ALPHALAYER
          float4 valuesSecond;         //index rgb + alpha
          #endif
          fixed3 weights : COLOR0;     // Causes unity to automagically map this from vertex color, erasing your values.. grr..
          float2 camDist;              // distance from camera (for fades) and fog
          float4 extraData;            // flowdir + fade, or if triplanar triplanarView, .w contains puddle height
          float3 viewDir;              // auto unity view dir, which gets compiled out in some cases, grrr..
          // everything after this requires > 3.5 shader model :(
          #if _SECONDUV
          float2 macroUV;              // special macro UV only used in alphalayer mode
          #endif
          #if _SNOW || _SNOWGLITTER || _PUDDLEGLITTER || _PERTEXGLITTER
          float3 wsNormal;
          #endif
          #if _SNOW
          half snowHeightFade;
          float4 wsTangent;
          #endif
          #if _SNOWGLITTER || _PUDDLEGLITTER || _PERTEXGLITTER
          float3 wsView;
          #endif
          #if _WETNESS
          half wetness;
          #endif
          #if _GEOMAP
          float3 worldPos;
          #endif
      };
```

```
o.weights = i.color.rgb;
o.valuesMain.xyz = i.color.rgb * i.color.a * 255;
#if _TWOLAYER || _ALPHALAYER
o.valuesSecond.xyz = i.color.rgb * i.texcoord3.a * 255;
o.valuesSecond.a = i.texcoord3.x;
#endif
```

weights是在一个三角面的三个顶点分别是红绿蓝，三个顶点处id不一样，valuesSecond和valuesMain获取的是这个pixel上三角面的三个id

同一个pixel是两个贴图混合的，混合度是valueSecond.a = i.texcoord3.x

InitLayerParams里面i0为应该是走非terrain，下面的，要除以si.weight

```
LayerParams InitLayerParams(SplatInput si, float3 values, half2 texScale)
         {
            LayerParams data = NewLayerParams();
            #if _TERRAIN
            int i0 = round(values.x * 255);
            int i1 = round(values.y * 255);
            int i2 = round(values.z * 255);
            #else
            int i0 = round(values.x / max(si.weights.x, 0.00001));
            int i1 = round(values.y / max(si.weights.y, 0.00001));
            int i2 = round(values.z / max(si.weights.z, 0.00001));
            #endif
            #if _TRIPLANAR
            float3 coords = si.triplanarUVW * texScale.x;
            data.tpuv0_x = float3(coords.zy, i0);
            data.tpuv0_y = float3(coords.xz, i0);
            data.tpuv0_z = float3(coords.xy, i0);
            data.tpuv1_x = float3(coords.zy, i1);
            data.tpuv1_y = float3(coords.xz, i1);
            data.tpuv1_z = float3(coords.xy, i1);
            data.tpuv2_x = float3(coords.zy, i2);
            data.tpuv2_y = float3(coords.xz, i2);
            data.tpuv2_z = float3(coords.xy, i2);
            data.mipUV = coords.xz;
            float2 splatUV = si.splatUV * texScale.xy;
            data.uv0 = float3(splatUV, i0);
            data.uv1 = float3(splatUV, i1);
            data.uv2 = float3(splatUV, i2);
            #else
            float2 splatUV = si.splatUV.xy * texScale.xy;
            data.uv0 = float3(splatUV, i0);
            data.uv1 = float3(splatUV, i1);
            data.uv2 = float3(splatUV, i2);
            data.mipUV = splatUV.xy;
            #endif
            #if _FLOW || _FLOWREFRACTION
            data.flowOn = 0;
            #endif
            #if _DISTANCERESAMPLE
            InitDistanceResample(data, si.camDist.y);
            #endif
            return data;
         }
```

Input.weight还要compute一下，最后是SAMPLETEXARRAY出来的颜色，uv参数用的是params.uv0 uv1 uv2，所以上面i0 i1 i2就是id了

```
 MegaSplatLayer SampleLayer(inout LayerParams params, SplatInput si)
         {
            half3 biWeights = si.weights;
            float3 viewDir = si.viewDir;
            half3 tpw = si.triplanarBlend;
            MegaSplatLayer o = (MegaSplatLayer)0;
            half4 tex0, tex1, tex2;
            half4 norm0, norm1, norm2;
            float mipLevel = MipLevel(params.mipUV, _Diffuse_TexelSize.zw);
            SAMPLETEXARRAY(tex0, tex1, tex2, _Diffuse, params, mipLevel);
            half3 weights = ComputeWeights(biWeights, tex0, tex1, tex2, params.contrast);
            params.weights = weights;
            fixed4 albedo = tex0 * weights.x + tex1 * weights.y + tex2 * weights.z;
```
