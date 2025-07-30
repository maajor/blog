---
title: Mixed Lighting Lightmap & Shader in Unity | Unity中混合光照Lightmap研究
date: 2017-09-02 00:00:00
tags:
  - Unity
  - Graphics
  - Rendering
  - Technical
  - Game Development
---

在MixedLight模式，Lightmap有三个模式：Shadowmask，Bake Indirect和Subtractive

## Bake Indirect

不烘焙直接阴影，只烘焙间接光，在Shadow Distance(Project Settings>Quality>Shadows里面设置)之内的阴影都是实时计算的（Shadow Map）。

|              |Dynamic Receiver  |                 |Static Receiver   |                 |
|--------------|------------------|-----------------|------------------|-----------------|
|              |Shadow Distance内 |Shadow Distance外|Shadow Distance内 |Shadow Distance外|
|Dynamic Caster|Shadow Map实时阴影|                 |Shadow Map实时阴影|                 |
|Static Caster |Shadow Map实时阴影|                 |Shadow Map实时阴影|                 |

优点是有实时阴影，并且有间接光照

缺点就是比较费了，并且在Shadow Distance之外没有阴影

对shader来说，阴影就直接用TRANSFER_SHADOW啊，SHADOW_ATTENUATION出来的就行了。采样Lightmap就多了点间接光。

## Subtractive

这个模式呢是唯一一种把阴影烘焙进贴图的模式，

|              |Dynamic Receiver  |                 |Static Receiver  |                 |
|--------------|------------------|-----------------|-----------------|-----------------|
|              |Shadow Distance内 |Shadow Distance外|Shadow Distance内|Shadow Distance外|
|Dynamic Caster|Shadow Map实时阴影|                 |主光ShadowMap    |                 |
|Static Caster |Light Probes      |Light Probes     |Lightmap         |Lightmap         |

以上是接受者和投影者生成阴影的方式区别。他还有一个特殊的地方是实时阴影的颜色可以调的2333

优点是静态物体的效果很好

缺点是不支持实时直接光，所以静态物体没有高光；light prob阴影比较差；动态静态阴影混合会有问题。

## Shadowmask

这个把阴影信息存到一张贴图里了，这个贴图里可以存四个灯光阴影（RGBA四个通道）

|              |Dynamic Receiver  |                 |Static Receiver  |                 |
|--------------|------------------|-----------------|-----------------|-----------------|
|              |Shadow Distance内 |Shadow Distance外|Shadow Distance内|Shadow Distance外|
|Dynamic Caster|Shadow Map实时阴影|                 |主光ShadowMap    |                 |
|Static Caster |Light Probes      |Light Probes     |Shadow Mask      |Shadow Mask      |

优点：动态物体的阴影永远是实时的；混合动态和静态阴影比较容易，静态物体也有实时高光的哦

缺点：只有四个光咯，LightProbs精度低，多内存

Bake Indirect模式不必多说，像实时一样采样阴影就可以了。

Subtractive模式是传统的模式，阴影就在贴图里，直接采样一下lightmap就可以了。

一般这样：

```
half4 bakedTex = UNITY_SAMPLE_TEX2D(unity_Lightmap, lightmapUV.xy);
half3 decodeColor = DecodeLightmap( bakedTex  );
col *= decodeColor;
return col;
```

就可以了，注意其中DecodeLightmap时，对于LDR（一般的）的LightMap，实际上就是乘了2。对于HDR的复杂一点。这个函数在UnityCG.cginc里面

问题比较大的是Shadowmask这个模式。

首先烘焙阴影不在unity_Lightmap这个图里，在unity_ShadowMask里。UnityShaderVariables里是这么定义的：

```
// Main lightmap
UNITY_DECLARE_TEX2D_HALF(unity_Lightmap);
// Directional lightmap (always used with unity_Lightmap, so can share sampler)
UNITY_DECLARE_TEX2D_NOSAMPLER_HALF(unity_LightmapInd);
// Combined light masks
#if defined (SHADOWS_SHADOWMASK)
    #if defined(LIGHTMAP_ON)
        //Can share sampler if lightmap are used.
        UNITY_DECLARE_TEX2D_NOSAMPLER(unity_ShadowMask);
    #else
        UNITY_DECLARE_TEX2D(unity_ShadowMask);
    #endif
#endif
```

从上面看出，要用这张图要先定义SHADOWS_SHADOWMASK这个关键词，如下：

```
#pragma multi_compile SHADOWS_SHADOWMASK
```

另外unity_LightmapInd是一张光照方向的图，采样以后可以给静态物体算高光：

```
half4 getLightDirPerPixel(float2 lightmapUV) {
    #ifdef LIGHTMAP_ON
        half4 bakedDirTex = UNITY_SAMPLE_TEX2D_SAMPLER(unity_LightmapInd, unity_Lightmap, lightmapUV.xy);
        return half4(bakedDirTex.xyz-0.5h, bakedDirTex.w);
    #else
        return half4(normalize(_WorldSpaceLightPos0.xyz),1);
    #endif
}
```

要采样这个shadowmask可以直接用一个函数UnitySampleBakedOcclusion，定义在UnityShadowLibrary.cginc里面

```
inline fixed UnitySampleBakedOcclusion (float2 lightmapUV, float3 worldPos)
{
    #if defined (SHADOWS_SHADOWMASK)
        #if defined(LIGHTMAP_ON)
            fixed4 rawOcclusionMask = UNITY_SAMPLE_TEX2D_SAMPLER(unity_ShadowMask, unity_Lightmap, lightmapUV.xy);
        #else
            fixed4 rawOcclusionMask = fixed4(1.0, 1.0, 1.0, 1.0);
            #if UNITY_LIGHT_PROBE_PROXY_VOLUME
                if (unity_ProbeVolumeParams.x == 1.0)
                    rawOcclusionMask = LPPV_SampleProbeOcclusion(worldPos);
                else
                    rawOcclusionMask = UNITY_SAMPLE_TEX2D(unity_ShadowMask, lightmapUV.xy);
            #else
                rawOcclusionMask = UNITY_SAMPLE_TEX2D(unity_ShadowMask, lightmapUV.xy);
            #endif
        #endif
        return saturate(dot(rawOcclusionMask, unity_OcclusionMaskSelector));
    #else
        //Handle LPPV baked occlusion for subtractive mode
        #if UNITY_LIGHT_PROBE_PROXY_VOLUME && !defined(LIGHTMAP_ON) && !UNITY_STANDARD_SIMPLE
            fixed4 rawOcclusionMask = fixed4(1.0, 1.0, 1.0, 1.0);
            if (unity_ProbeVolumeParams.x == 1.0)
                rawOcclusionMask = LPPV_SampleProbeOcclusion(worldPos);
            return saturate(dot(rawOcclusionMask, unity_OcclusionMaskSelector));
        #endif
        return 1.0;
    #endif
}
```

这里用了UNITY_SAMPLE_TEX2D_SAMPLER，是直接用了unity_Lightmap的sampler。不过需要注意的是事先要定义并使用unity_Lightmap，要不然编译会去掉这个sampler然后就报错了。

上面返回的是一个attenuation值，类似于shadowmap计算得到的那个，直接乘进颜色就行，或者用它来lerp颜色也行。于是呢这就有了烘焙的阴影。

但还有一个问题，shadowmask模式下的lightmap跟Subtractive模式相比非常暗。

因为它和Baked Indirect比较像，lightmap里只是间接光，所以不是乘进本色而是加进实时计算的光照。

所以对于Substactive来说：

```
half4 lightmapTex = UNITY_SAMPLE_TEX2D(unity_Lightmap, lightmapUV.xy);
half atten = SHADOW_ATTENUATION(i);
half3 directDiffuse = dot(worldNormal, lightDir) * _LightColor0.rgb;
half3 diffuse = directDiffuse * lightmapTex.xyz * atten;
return half4(diffuse + specular, 1);
```

也就是说直接把lightmap乘进diffuse就行了

对于ShadowMask和Bake Indirect来说：

```
half4 indirectColor= UNITY_SAMPLE_TEX2D(unity_Lightmap, lightmapUV.xy);//lightmap is indirect light
half bakedAtten = UnitySampleBakedOcclusion(lightmapUV.xy, worldPos);
half directAtten = SHADOW_ATTENUATION(i);
half3 directDiffuse = dot(worldNormal, lightDir) * _LightColor0.rgb;
half3 diffuse = (indirectColor.xyz * 4.4 + directDiffuse * directAtten * bakedAtten);
return hal4(diffuse + specular, 1);
```

这时lightmap是加进diffuse而不是乘进的，至于那个4.4的系数，是试验出来的，我也感到很诧异。 按理来说DecodeLightmap乘以2就可以了。这个不太清楚原理。

![colo.png](/images/colo.jpg)

ShadowMask烘焙，左为自己写的shader，右为Mobile/Diffuse

```
Shader "lightmaptest"
{
       Properties
       {
              _myColor ("MainColor", color) = (1,1,1,1)
       }
       SubShader
       {
              Tags { "RenderType"="Opaque" }
              LOD 100
              Pass
              {
                     CGPROGRAM
                     #pragma vertex vert
                     #pragma fragment frag
                     #pragma multi_compile LIGHTMAP_ON
                     #pragma multi_compile SHADOWS_DEPTH SHADOWS_SCREEN
                     #pragma multi_compile SHADOWS_SHADOWMASK
                     
                     #include "UnityCG.cginc"
                     #include "AutoLight.cginc"
                     #include "UnityStandardCore.cginc"
                     struct appdata
                     {
                           float4 vertex : POSITION;
                           float2 uv : TEXCOORD0;
                           float4 texcoord1:TEXCOORD1;//lightmap uv
                           float3 normal:NORMAL;
                     };
                     struct v2f
                     {
                           float4 uv : TEXCOORD0;
                           float4 pos : SV_POSITION;
                           SHADOW_COORDS(1)
                           float4 worldPos : TEXCOORD2;
                           float3 worldNormal : TEXCOORD3;
                     };
                     fixed4 _myColor;
                     
                     v2f vert (appdata v)
                     {
                           v2f o;
                           o.pos = UnityObjectToClipPos(v.vertex);
                           o.worldPos = mul(unity_ObjectToWorld, v.vertex);
                           o.uv.xy = TRANSFORM_TEX(v.uv, _MainTex);
                           o.uv.zw = v.texcoord1.xy * unity_LightmapST.xy + unity_LightmapST.zw;
                           o.worldNormal = UnityObjectToWorldNormal( v.normal);
                           TRANSFER_SHADOW(o);
                           return o;
                     }
                     
                     fixed4 frag (v2f i) : SV_Target
                     {
                           half directAtten = SHADOW_ATTENUATION(i);
                           half3 lightDir = normalize(_WorldSpaceLightPos0.xyz);
                           half3 directColor = dot(lightDir, i.worldNormal) * _LightColor0;
                           half4 indirectColor = UNITY_SAMPLE_TEX2D(unity_Lightmap, i.uv.zw);
                           fixed bakedAtten = UnitySampleBakedOcclusion(i.uv.zw, i.worldPos);
                           half3 diffuse = (indirectColor.xyz*4.4 + (directColor)  * bakedAtten * directAtten);
                           return fixed4(diffuse , 1);
                     }
                     ENDCG
              }
       }
}

http://catlikecoding.com/unity/tutorials/rendering/part-17/

```
