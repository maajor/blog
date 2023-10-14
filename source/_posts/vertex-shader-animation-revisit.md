---
title: Vertex Shader Animation Revisit | 顶点动画再议
date: 2018-07-15 00:00:00
---


1. 概论

mesh的顶点可定义属性，比较常见的自定义通道是顶点色color和uv3 uv4及以上，因为一般uv1是贴图坐标，uv2是lightmap坐标，所以不太考虑这俩。那就这些我们就已经有 3 * 4 = 12个通道了。这里面可以存的数据一般包括：

- 运动强度 1个频率1个通道就够了
- 运动相位，防止运动sync，取决于有几层相位叠加了，1个频率1个通道
- 位置，意义上可能是运动的目标位置，或者LOD的位置，这个一般需要比较精确还不能压缩，肯定要3个通道了
- 方向，意义上可以是运动方向，法线等很多，这个一般不用太精确，如果压缩的话3个通道，不压缩的话甚至pack成一个通道都可以
- 其它gameplay相关的参数了

数据存在顶点上可能的问题是，模型一压缩，数据就坏掉了。另外毕竟顶点上支持的数据套数比较少。因此比较高精度和大数据量的数据存在贴图上可能更有效。要注意的是前一条理由对移动平台不一定有用，unity在ios/android只支持到RGBA32，可能还没顶点的精度高。数据存贴图的话用uv访问就好了，这样uv的数据一般不用很多套了。

运动的函数最常见的是三角函数，一般来讲几个频率的三角函数叠加足够满足需求了，但是有时也有一些特殊波形要求比如Gertsner尖波(海)。甚至有时可能还要把参数暴露出来，用手k的动画曲线来设置。

Animating With Math讲的便是相当基本的顶点动画操作，以下用一些实例分析

1. Houdini烘焙顶点动画的原理

烘出来模型，会发现UV2在uv空间的最上面一排，烘出来的贴图排列横向x坐标是vertex的id，竖向是帧数。所以取贴图的坐标就是

float4 texturePos = tex2Dlod(_posTex,float4(v.texcoord1.x, (timeInFrames + v.texcoord1.y), 0, 0));

这个坐标是是boundingbox内normalize出来的，shader会有boundingbox_min和boundingbox_max的参数

因此动画里的坐标就是

```
float expand = _boundingMax - _boundingMin
texturePos.xyz *= expand;
texturePos.xyz += _boundingMin;
texturePos.x *= -1;  //flipped to account for right-handedness of unity
v.vertex.xyz += texturePos.xzy;  //swizzle y and z because textures are exported with z-up
```

有一点问题是有可能烘焙的动画帧数不高，而且移动平台上只能RGBA32，如果boundingbox很大的话卡顿感会比较严重，就需要shader里自己做插帧了

1. SpeedTree的风

SpeedTree除了制作速度比较快外，就是风的效果比较好了，看unity的shader基本就能明白原理

以下是几个texcoord的定义，

```
// texcoord setup
//
//      BRANCHES                        FRONDS                      LEAVES
// 0    diffuse uv, branch wind xy      "                           "
// 1    lod xyz, 0                      lod xyz, 0                  anchor xyz, lod scalar
// 2    detail/seam uv, seam amount, 0  frond wind xyz, 0           leaf wind xyz, leaf group
```

uv1是lod的位置，用来做lod的过渡

树枝走BranchWind，

branch wind xy x记录风的大小fWeight，一个记录风的法线fOffset，这个是pack起来的法线，这么看这个通道至少12bit了，压缩可能会傻掉

```
float3 UnpackNormalFromFloat(float fValue)
{
    float3 vDecodeKey = float3(16.0, 1.0, 0.0625);
    // decode into [0,1] range
    float3 vDecodedValue = frac(fValue / vDecodeKey);
    // move back into [-1,1] range & normalize
    return (vDecodedValue * 2.0 - 1.0);
}
```

按枝条的法线做Occilation运动，occilation是叠加了不同相位的sin

树叶走LeafWind，uv2的xyz存的是anchor，也就是一团树叶的锚点；uv3分别是fScale, fPackedGrowthDir(只对best有用), fPackedRippleDir

然后按波动方向做一个sin近似运动

之后还有一个整体的GlobleWind，按全局风方向做Occilation

代码里用了一个三角函数的近似计算，和三角函数比起来比较接近

```
float4 CubicSmooth(float4 vData)
{
    return vData * vData * (3.0 - 2.0 * vData);
}

float4 TriangleWave(float4 vData)
{
    return abs((frac(vData + 0.5) * 2.0) - 1.0);
}

float4 TrigApproximate(float4 vData)
{
    return (CubicSmooth(TriangleWave(vData)) - 0.5) * 2.0;
}
```

![05c2a5c16450ae9c74f6ea2e32d7c624.png](/images/05c2a5c16450ae9c74f6ea2e32d7c624.png)

主要读SpeedTreeWind.cginc, SpeedTreeVertex.cginc就好了

1. Fornite物体的出现动画

在vertex shader里hardcode了一条曲线，0对应物体被裁剪时候的缩放，1对应物体完全出现时候的缩放，这样物体出现时渐变的过程会是先变大到1.25倍再缩小的过程

![1f51da6903c75a64357836154e569596.png](/images/1f51da6903c75a64357836154e569596.png)

shader很简单，拟合一条曲线就好了，然后外部LOD组件传入一个状态切换的alpha值

```
float cull = phase > 0.75f ? 2.0f - phase : 1.667f * phase;
float3 localPos = v.vertex.xyz * cull;
```

1. Fornite的可破坏墙体

![196c4fd810285f650061f96ad9fcb292.png](/images/196c4fd810285f650061f96ad9fcb292.png)

Shader需要暴露一个参数驱动破坏过程，左侧时0，右侧是1.

顶点或者贴图上存储的数据包括：

![27d0e041555d85469ec7fbde9a79260f.png](/images/27d0e041555d85469ec7fbde9a79260f.png)

每一个木片都需要存储pivot的位置，三个通道（local位置用v.vertex - pivot），这样才能单块木片整体移动

一个随机数，每个木片从同一个数值就好，一个通道就可以了，甚至不用8bit，4个bit一般就够了

需要一个动画顺序，每个木片同一个数值，这样整体参数0-1时才能知道哪个木片可以动了，可以直接用存储的随机数代替

需要一个旋转轴，木片绕它旋转，如果能pack起来一个通道就够了，也可以预先存一个数组，用随机数来取

需要flight path，这个表示超前飞还是朝后飞，1bit，这个其实也不用，完全可以从随机数构造出来。

需要木块的数量，这个可能不是存顶点上的。

这么算下来只需要定点色就够了，构成是RGB时pivot的坐标，A是随机数，其他参数都用随机数构造就好了。

笔者写了个伪码示意： 

```
float animatePhase = saturate((_Phase - i.color.a) * 10.0f); // 一个magicnumber，用以缩放动画的长度
float3 localPos = v.vertex.xyz - v.color.rgb;  //木片以pivot为中心的object-space坐标
float3 rotatedLocalPos = Rotate( localPos, animatePhase, v.color.a ); //旋转一下
float3 targetPivot = lerp( _TargetPos,  v.color.rgb, animatePhase); //移动以下
float3 vertexPos  = rotatedLocalPos+ targetPivot; //最后的object-space坐标
```

参考资料

Animating With Math, GDC Vault 2016, Natalie Burk

The Inner Workings of Fortnite's Shader Based Procedural Animations， GDC 2013， Jonathan Lindquist

[http://mehm.net/blog/?p=1246](http://mehm.net/blog/?p=1246) Reimplementation of Fortnite's Shader Based Procedural Animations
